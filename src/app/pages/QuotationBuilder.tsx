import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Search, GripVertical, Trash2, ChevronDown, Save, Lock, LockOpen } from 'lucide-react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { toast } from 'sonner';
import { productService } from '../../services/productService';
import { tagService } from '../../services/masterService';
import type { PaginationMeta } from '../../services/productService';
import { userService } from '../../services/userService';
import { leadService } from '../../services/leadService';
import { quotationService } from '../../services/quotationService';
import { mapProduct, mapQuotation } from '../../services/mappers';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls, usePagination } from '../components/common/Pagination';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const maskPhone = (value?: string) => {
  const phone = String(value || '').trim();
  if (!phone) return '-';
  if (phone.length <= 1) return `${phone}****`;
  return `${phone.slice(0, 1)}****`;
};

const getQuotationBasePrice = (product: any) => Number(product?.mrp ?? product?.sellingPrice ?? product?.usualSellingPrice ?? 0);
const normalizeDiscount = (value: number) => Math.min(100, Math.max(0, Number(value.toFixed(3))));
const normalizeAmount = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const limitWords = (value: string, maximum: number) => {
  const words = Array.from(value.matchAll(/\S+/g));
  if (words.length <= maximum) return value;

  const lastAllowedWord = words[maximum - 1];
  return value.slice(0, (lastAllowedWord.index || 0) + lastAllowedWord[0].length);
};
const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const getDiscountedUnitPrice = (item: Pick<QuotationItem, 'price' | 'discount' | 'discountedPrice'>) => {
  if (Number.isFinite(item.discountedPrice)) {
    return normalizeAmount(item.discountedPrice);
  }

  return Math.max(item.price - (item.price * item.discount) / 100, 0);
};
const emptyProductPagination: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};
const emptyLeadPagination: PaginationMeta = {
  current_page: 1,
  per_page: 8,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

const calculateItemAmounts = (item: QuotationItem, gstInclusive: boolean) => {
  const afterDiscount = getDiscountedUnitPrice(item) * item.quantity;
  const gstAmount = gstInclusive ? 0 : afterDiscount * (item.product.gstPercent / 100);

  return {
    gstAmount,
    lineTotal: gstInclusive ? afterDiscount : afterDiscount + gstAmount,
  };
};

const getItemUnitLabel = (item: { product?: any }) =>
  String(item?.product?.unitName || item?.product?.unit || '').trim();

interface QuotationItem {
  id: string;
  product: any;
  quantity: number;
  price: number;
  discount: number;
  discountedPrice: number;
  specifications: string;
  additionalInfo: string;
}

interface CustomAdjustment {
  id: string;
  name: string;
  amount: number;
}

const DiscountInput = ({ value, onChange, className }: { value: number; onChange: (value: number) => void; className: string }) => {
  const [inputValue, setInputValue] = useState(() => String(normalizeDiscount(value)));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setInputValue(String(normalizeDiscount(value)));
  }, [editing, value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onFocus={() => setEditing(true)}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (nextValue !== '' && !/^\d*\.?\d{0,3}$/.test(nextValue)) return;

        setInputValue(nextValue);
        if (nextValue === '' || nextValue.endsWith('.')) {
          if (nextValue === '') onChange(0);
          return;
        }

        onChange(normalizeDiscount(Number.parseFloat(nextValue) || 0));
      }}
      onBlur={() => {
        const normalized = normalizeDiscount(Number.parseFloat(inputValue) || 0);
        setEditing(false);
        setInputValue(String(normalized));
        onChange(normalized);
      }}
      className={className}
    />
  );
};

const DraggableRow = ({ item, index, moveRow, onUpdate, onDelete, gstInclusive }: any) => {
  const [, drag] = useDrag({
    type: 'row',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'row',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveRow(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const productMrp = getQuotationBasePrice(item.product);
  const discountedUnitPrice = getDiscountedUnitPrice(item);
  const { gstAmount, lineTotal } = calculateItemAmounts(item, gstInclusive);
  const [discountedPriceInput, setDiscountedPriceInput] = useState(() => String(discountedUnitPrice || ''));
  const [editingDiscountedPrice, setEditingDiscountedPrice] = useState(false);
  const calculatedDiscount = item.price > 0
    ? normalizeDiscount(((item.price - discountedUnitPrice) / item.price) * 100)
    : 0;

  useEffect(() => {
    if (!editingDiscountedPrice) {
      setDiscountedPriceInput(String(Number(discountedUnitPrice.toFixed(2))));
    }
  }, [discountedUnitPrice, editingDiscountedPrice]);

  return (
    <tr ref={(node) => { drag(drop(node)); }} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
      <td className="w-8 px-2 py-3 align-middle">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <img src={item.product.image} alt="" className="w-12 h-12 shrink-0 object-cover rounded-md border border-gray-100" />
          <div className="min-w-0">
            <div className="font-medium text-sm text-gray-900 leading-tight truncate">{item.product.name}</div>
            <div className="text-xs text-gray-500 truncate">{item.product.modelNumber}</div>
            {item.specifications && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{stripHtml(item.specifications)}</div>}
          </div>
        </div>
        <div className="mt-2">
          <textarea
            value={item.additionalInfo || ''}
            onChange={(event) => onUpdate(item.id, { additionalInfo: limitWords(event.target.value, 20) })}
            placeholder="Additional information (maximum 20 words)"
            rows={2}
            className="w-full resize-none rounded-md border border-gray-200 px-2.5 py-2 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="mt-0.5 text-right text-[10px] text-gray-400">{wordCount(item.additionalInfo || '')}/20 words</div>
        </div>
      </td>
      <td className="px-2 py-3 align-middle">
        <div className="flex flex-col items-center gap-1">
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-center text-sm"
            min="1"
          />
          {getItemUnitLabel(item) && (
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {getItemUnitLabel(item)}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-3 align-middle text-right">
        <div className="font-medium text-sm text-gray-900 whitespace-nowrap">
          ₹{productMrp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
      </td>
      <td className="px-2 py-3 align-middle text-right">
        <div className="flex justify-end">
          <input
            type="text"
            inputMode="decimal"
            value={discountedPriceInput}
            onFocus={() => setEditingDiscountedPrice(true)}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue !== '' && !/^\d*\.?\d{0,2}$/.test(nextValue)) {
                return;
              }
              setDiscountedPriceInput(nextValue);
              if (nextValue === '') {
                onUpdate(item.id, { discountedPrice: 0 });
                return;
              }

              onUpdate(item.id, { discountedPrice: normalizeAmount(parseFloat(nextValue)) });
            }}
            onBlur={() => {
              const enteredPrice = normalizeAmount(parseFloat(discountedPriceInput));
              setEditingDiscountedPrice(false);
              onUpdate(item.id, { discountedPrice: enteredPrice });
              setDiscountedPriceInput(String(Number(enteredPrice.toFixed(2))));
            }}
            className="w-28 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right"
          />
        </div>
      </td>
      <td className="px-2 py-3 align-middle text-center text-sm text-gray-600 whitespace-nowrap">
        {item.product.gstPercent}%
      </td>
      <td className="px-2 py-3 align-middle text-right text-sm text-gray-600 whitespace-nowrap">
        ₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-2 py-3 align-middle text-center">
        <DiscountInput
          value={calculatedDiscount}
          onChange={(newDiscount) => {
            const normalizedDiscount = normalizeDiscount(newDiscount);
            onUpdate(item.id, {
              discountedPrice: Math.max(item.price - (item.price * normalizedDiscount) / 100, 0),
            });
          }}
          className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-center text-sm"
        />
      </td>
      <td className="px-2 py-3 align-middle text-right font-semibold text-sm text-gray-900 whitespace-nowrap">
        ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td className="w-9 px-2 py-3 align-middle text-center">
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export const QuotationBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { brands, categories, addQuotation, updateQuotation, terms: masterTerms, settings, loading } = useData();
  const { user } = useAuth();
  const isInfluencer = user?.role?.code === 'influencer';
  const [searchParams] = useSearchParams();
  const initialLeadId = searchParams.get('lead_id');

  const [selectedLead, setSelectedLead] = useState<any>(null);
  useEffect(() => {
    if (id || !initialLeadId) return;
    let cancelled = false;
    leadService.show(initialLeadId).then(lead => { if (!cancelled) setSelectedLead({ ...lead, id: String(lead.id), sourceType: 'lead', company: '', address: [lead.address_line_1, lead.city].filter(Boolean).join(', ') }); }).catch(() => toast.error('Unable to load this lead'));
    return () => { cancelled = true; };
  }, [id, initialLeadId]);
  const [salesperson, setSalesperson] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [selectedSalespersonId, setSelectedSalespersonId] = useState('');
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [customAdjustments, setCustomAdjustments] = useState<CustomAdjustment[]>([]);
  const [gstInclusive, setGstInclusive] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showMrp, setShowMrp] = useState(false);
  const [showItemWiseGst, setShowItemWiseGst] = useState(false);
  const [roundOffNetAmount, setRoundOffNetAmount] = useState(false);
  const [showUom, setShowUom] = useState(true);
  const [showBrandBanner, setShowBrandBanner] = useState(false);
  const [brandBannerId, setBrandBannerId] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [customTermEnabled, setCustomTermEnabled] = useState(false);
  const [customTermText, setCustomTermText] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [brandFilterSearch, setBrandFilterSearch] = useState('');
  const [selectedProductBrandIds, setSelectedProductBrandIds] = useState<string[]>([]);
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState('');
  const [selectedProductTagId, setSelectedProductTagId] = useState('');
  const [productTags, setProductTags] = useState<Array<{ id: string; name: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [tagLoadAttempt, setTagLoadAttempt] = useState(0);
  const productRequestRef = useRef(0);
  const [brandFilterLocked, setBrandFilterLocked] = useState(false);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectableProducts, setSelectableProducts] = useState<any[]>([]);
  const [productPagination, setProductPagination] = useState(emptyProductPagination);
  const [productsLoading, setProductsLoading] = useState(false);
  const [inProgressLeads, setInProgressLeads] = useState<any[]>([]);
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState<string | null>('');
  const [leadPagination, setLeadPagination] = useState(emptyLeadPagination);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const leadRequestRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [quotationLoading, setQuotationLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!showProductModal) return;
    let cancelled = false;
    setTagsLoading(true);
    setTagsError(false);
    tagService.list().then(result => {
      if (!cancelled) setProductTags(result.data.map(tag => ({ id: String(tag.id), name: tag.name })));
    }).catch(() => {
      if (!cancelled) setTagsError(true);
    }).finally(() => {
      if (!cancelled) setTagsLoading(false);
    });
    return () => { cancelled = true; };
  }, [showProductModal, tagLoadAttempt]);

  const brandBannerOptions = brands.filter(
    (brand) => brand.status === 'active' && String(brand.logoPath || '').trim() !== '',
  );
  const activeProductBrands = brands.filter((brand) => brand.status === 'active');
  const filteredProductBrands = activeProductBrands.filter((brand) =>
    brand.name.toLowerCase().includes(brandFilterSearch.trim().toLowerCase()),
  );
  const selectedProductBrandNames = activeProductBrands
    .filter((brand) => selectedProductBrandIds.includes(String(brand.id)))
    .map((brand) => brand.name);
  const productBrandFilterLabel = selectedProductBrandNames.length === 0
    ? 'All Brands'
    : selectedProductBrandNames.length <= 2
      ? selectedProductBrandNames.join(', ')
      : `${selectedProductBrandNames.length} brands selected`;

  useEffect(() => {
    setSelectedProductBrandIds([]);
    setBrandFilterLocked(false);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setEditingQuotation(null);
      setQuotationLoading(false);
      return;
    }

    let cancelled = false;
    setQuotationLoading(true);
    quotationService.get(id)
      .then((quotation) => {
        if (cancelled) return;
        if (['locked', 'executed'].includes(quotation.status)) {
          toast.error('Locked or executed quotations cannot be edited.');
          navigate(`/quotations/${id}/preview`, { replace: true });
          return;
        }
        setEditingQuotation(mapQuotation(quotation));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Unable to load quotation');
          navigate('/quotations');
        }
      })
      .finally(() => {
        if (!cancelled) setQuotationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    userService
      .dropdown()
      .then((users) => setSalesUsers(Array.isArray(users) ? users : []))
      .catch(() => setSalesUsers([]));
  }, []);

  useEffect(() => {
    const quotation = id ? editingQuotation : null;
    if (id) {
      if (quotation) {
        setSelectedLead(quotation.lead || null);
        setSalesperson(quotation.salesperson);
        setItems(quotation.items);
        setGlobalDiscount(quotation.globalDiscount);
        setCustomAdjustments(quotation.customAdjustments || []);
        setGstInclusive(quotation.gstInclusive);
        setShowDiscount(quotation.showDiscount);
        setShowMrp(quotation.showMrp ?? true);
        setShowItemWiseGst(quotation.showItemWiseGst ?? false);
        setRoundOffNetAmount(quotation.roundOffNetAmount ?? false);
        setShowUom(quotation.showUom ?? true);
        setShowBrandBanner(quotation.showBrandBanner ?? false);
        setBrandBannerId(quotation.brandBannerId || '');
        setSelectedTerms(quotation.terms);
        setCustomTermEnabled(quotation.customTermEnabled ?? false);
        setCustomTermText(quotation.customTermText || '');
      }
    } else {
      setShowDiscount(false);
      setShowMrp(false);
      setShowItemWiseGst(false);
      setRoundOffNetAmount(false);
      setShowUom(true);
      setShowBrandBanner(false);
      setBrandBannerId('');
      setCustomTermEnabled(false);
      setCustomTermText('');
      setCustomAdjustments([]);

      if (user) {
        setSelectedSalespersonId(String(user.id || ''));
        setSalesperson({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
        });
      } else if (settings.defaultSalespersonName || settings.defaultSalespersonEmail || settings.defaultSalespersonPhone) {
        setSalesperson({
          name: settings.defaultSalespersonName || '',
          phone: settings.defaultSalespersonPhone || '',
          email: settings.defaultSalespersonEmail || '',
        });
      }
    }

  }, [editingQuotation, id, settings, masterTerms, user]);

  useEffect(() => {
    if (id || !user || selectedSalespersonId) {
      return;
    }

    setSelectedSalespersonId(String(user.id || ''));
    setSalesperson({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  }, [id, user, selectedSalespersonId]);

  useEffect(() => {
    if (selectedSalespersonId || salesUsers.length === 0 || (!salesperson.email && !salesperson.name)) {
      return;
    }

    const matchedUser = salesUsers.find((user) => {
      return (
        (salesperson.email && user.email === salesperson.email) ||
        (salesperson.name && user.name === salesperson.name)
      );
    });

    if (matchedUser) {
      setSelectedSalespersonId(String(matchedUser.id));
    }
  }, [salesUsers, salesperson.email, salesperson.name, selectedSalespersonId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [productSearch]);

  const fetchSelectableProducts = useCallback(async (page: number, perPage: number) => {
    if (!showProductModal) return;

    const requestId = ++productRequestRef.current;
    setProductsLoading(true);
    try {
      const result = await productService.selectable({
        is_active: true,
        page,
        per_page: perPage,
        ...(debouncedProductSearch ? { search: debouncedProductSearch } : {}),
        ...(selectedProductBrandIds.length > 0 ? { brand_ids: selectedProductBrandIds.map(Number) } : {}),
        ...(selectedProductCategoryId ? { category_id: Number(selectedProductCategoryId) } : {}),
        ...(selectedProductTagId ? { tag_id: Number(selectedProductTagId) } : {}),
      });
      if (requestId !== productRequestRef.current) return;
      const data = Array.isArray(result.data) ? result.data : [];
      setSelectableProducts(data.map(mapProduct));
      setProductPagination({
        ...emptyProductPagination,
        ...(result.meta?.pagination || {}),
      });
    } catch {
      if (requestId !== productRequestRef.current) return;
      setSelectableProducts([]);
      setProductPagination(emptyProductPagination);
    } finally {
      if (requestId === productRequestRef.current) setProductsLoading(false);
    }
  }, [debouncedProductSearch, selectedProductBrandIds, selectedProductCategoryId, selectedProductTagId, showProductModal]);

  useEffect(() => {
    if (!showProductModal) {
      return;
    }

    fetchSelectableProducts(1, productPagination.per_page);
  }, [debouncedProductSearch, fetchSelectableProducts, productPagination.per_page, showProductModal]);

  useEffect(() => {
    const search = leadSearch.trim();

    if (search.length > 0 && search.length < 3) {
      leadRequestRef.current += 1;
      setDebouncedLeadSearch(null);
      setInProgressLeads([]);
      setLeadPagination(emptyLeadPagination);
      setLeadsLoading(false);
      return;
    }

    if (search.length === 0) {
      setDebouncedLeadSearch('');
      return;
    }

    const timeout = window.setTimeout(() => setDebouncedLeadSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [leadSearch]);

  const fetchSelectableLeads = useCallback(async (page: number, perPage: number) => {
    if (!showLeadModal || debouncedLeadSearch === null) return;

    const requestId = ++leadRequestRef.current;
    setLeadsLoading(true);
    try {
      const result = await leadService.list({
        ...(isInfluencer ? {} : { status: ['in_progress'] }),
        page,
        per_page: perPage,
        ...(debouncedLeadSearch ? { search: debouncedLeadSearch } : {}),
      });

      if (requestId !== leadRequestRef.current) return;
      setInProgressLeads(Array.isArray(result.data) ? result.data : []);
      setLeadPagination({
        ...emptyLeadPagination,
        ...(result.meta?.pagination || {}),
      });
    } catch {
      if (requestId !== leadRequestRef.current) return;
      setInProgressLeads([]);
      setLeadPagination(emptyLeadPagination);
    } finally {
      if (requestId === leadRequestRef.current) setLeadsLoading(false);
    }
  }, [debouncedLeadSearch, showLeadModal, isInfluencer]);

  useEffect(() => {
    if (!showLeadModal || debouncedLeadSearch === null) return;
    void fetchSelectableLeads(1, leadPagination.per_page);
  }, [debouncedLeadSearch, fetchSelectableLeads, leadPagination.per_page, showLeadModal]);

  const moveRow = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  const addProducts = (products: any[]) => {
    if (products.length === 0) return;
    const newItems: QuotationItem[] = products.map((product) => ({
      id: crypto.randomUUID(),
      product,
      quantity: 1,
      price: getQuotationBasePrice(product),
      discount: 0,
      discountedPrice: getQuotationBasePrice(product),
      specifications: product.specifications,
      additionalInfo: '',
    }));
    setItems((current) => [...current, ...newItems]);
    closeProductModal();
  };

  const toggleProductSelection = (product: any) => {
    setSelectedProducts((current) => current.some((item) => String(item.id) === String(product.id))
      ? current.filter((item) => String(item.id) !== String(product.id))
      : [...current, product]);
  };

  const closeProductModal = () => {
    productRequestRef.current++;
    setProductsLoading(false);
    setSelectedProducts([]);
    setSelectedProductCategoryId('');
    setSelectedProductTagId('');
    setProductSearch('');
    setSelectableProducts([]);
    setProductPagination(emptyProductPagination);
    if (!brandFilterLocked) {
      setSelectedProductBrandIds([]);
    }
    setShowProductModal(false);
  };

  const toggleProductBrand = (brandId: string) => {
    if (brandFilterLocked) return;
    setSelectedProductBrandIds((current) => current.includes(brandId)
      ? current.filter((id) => id !== brandId)
      : [...current, brandId]);
  };

  const updateItem = (itemId: string, updates: Partial<QuotationItem>) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    );
  };

  const deleteItem = (itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  };

  const handleSalespersonSelect = (userId: string) => {
    setSelectedSalespersonId(userId);
    const user = salesUsers.find((salesUser) => String(salesUser.id) === userId);

    if (!user) {
      setSalesperson({
        name: '',
        phone: '',
        email: '',
      });
      return;
    }

    setSalesperson({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  };

  const handleGlobalDiscountChange = (value: number) => {
    const normalizedValue = normalizeDiscount(value);
    setGlobalDiscount(normalizedValue);
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        discountedPrice: Math.max(item.price - (item.price * normalizedValue) / 100, 0),
      })),
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.discountedPrice * item.quantity;
    });

    let taxBeforeAdjustments = 0;
    if (!gstInclusive) {
      items.forEach(item => {
        taxBeforeAdjustments += (item.discountedPrice * item.quantity) * (item.product.gstPercent / 100);
      });
    }

    const adjustmentTotal = customAdjustments.reduce((sum, adjustment) => sum + (Number(adjustment.amount) || 0), 0);
    const total = subtotal + adjustmentTotal;
    const taxableTotal = Math.max(total, 0);
    const taxAmount = subtotal > 0
      ? taxBeforeAdjustments * (taxableTotal / subtotal)
      : 0;
    const grandTotal = total + taxAmount;

    return { subtotal, total, taxAmount, adjustmentTotal, grandTotal };
  };

  const totals = calculateTotals();
  const itemPagination = usePagination(items, 10);

  if ((loading || quotationLoading) && id) {
    return (
      <div className="p-4">
        <LoadingState label="Loading quotation..." />
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedLead) {
      toast.error('Please select a lead');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    if (showBrandBanner && !brandBannerId) {
      toast.error('Please select a brand for the brand banner');
      return;
    }
    if (customAdjustments.some((adjustment) => !adjustment.name.trim())) {
      toast.error('Please enter a description for every custom summary field');
      return;
    }

    const quotationData = {
      date: new Date().toISOString(),
      lead: selectedLead,
      salesperson,
      items,
      globalDiscount,
      customAdjustments,
      gstInclusive,
      showDiscount,
      showMrp,
      showItemWiseGst,
      roundOffNetAmount,
      showUom,
      showBrandBanner,
      brandBannerId,
      terms: selectedTerms,
      customTermEnabled,
      customTermText,
      status: 'draft' as const,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
    };

    setSaving(true);
    try {
      if (id) {
        await updateQuotation(id, quotationData);
        toast.success('Quotation updated successfully');
        navigate(`/quotations/${id}/preview`);
      } else {
        const created = await addQuotation(quotationData);
        toast.success('Quotation created successfully');
        navigate(`/quotations/${created.id}/preview`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="w-full max-w-none space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/quotations')} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                {id ? 'Edit Quotation' : 'Create New Quotation'}
              </h2>
              <p className="text-sm text-gray-600">Build your quotation with products and pricing</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>

        {/* Lead & Salesperson */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,0.85fr)_minmax(520px,1.15fr)] gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Lead Details</h3>
            {selectedLead ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 leading-tight truncate">{selectedLead.company || selectedLead.name}</p>
                  <div className="mt-1 grid gap-x-4 gap-y-0.5 text-sm text-gray-600 sm:grid-cols-2">
                    <span className="truncate">{selectedLead.name}</span>
                    <span className="truncate">{maskPhone(selectedLead.phone)}</span>
                    <span className="truncate sm:col-span-2">{selectedLead.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeadModal(true)}
                  className="shrink-0 text-sm text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLeadModal(true)}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Select Lead
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Salesperson Details</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={selectedSalespersonId}
                onChange={(e) => handleSalespersonSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Select salesperson</option>
                {salesUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.name, user.designation].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={salesperson.name}
                onChange={(e) => setSalesperson({ ...salesperson, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <input
                type="text"
                value={salesperson.phone}
                onChange={(e) => setSalesperson({ ...salesperson, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <input
                type="email"
                value={salesperson.email}
                onChange={(e) => setSalesperson({ ...salesperson, email: e.target.value })}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
          {/* Products Table */}
          <div className="min-w-0 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Products</h3>
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-[28%]" />
                  <col className="w-20" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-20" />
                  <col className="w-32" />
                  <col className="w-20" />
                  <col className="w-36" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase"></th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-600 uppercase">MRP</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-600 uppercase">Discounted Price</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">GST%</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-600 uppercase">GST Amt</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Disc%</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemPagination.pageItems.map((item, index) => (
                    <DraggableRow
                      key={item.id}
                      item={item}
                      index={(itemPagination.page - 1) * itemPagination.pageSize + index}
                      moveRow={moveRow}
                      onUpdate={updateItem}
                      onDelete={deleteItem}
                      gstInclusive={gstInclusive}
                    />
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No products added yet. Click "Add Product" to get started.
                </div>
              )}
              {items.length > 0 && (
                <PaginationControls
                  page={itemPagination.page}
                  pageSize={itemPagination.pageSize}
                  totalItems={itemPagination.totalItems}
                  totalPages={itemPagination.totalPages}
                  onPageChange={itemPagination.setPage}
                  onPageSizeChange={itemPagination.setPageSize}
                />
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="min-w-0 space-y-4">
            {/* Global Discount */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Global Discount</h3>
              <div className="flex items-center gap-2">
                <DiscountInput
                  value={globalDiscount}
                  onChange={handleGlobalDiscountChange}
                  className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
                <span className="text-gray-600">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Overrides individual product discounts</p>
            </div>

            {/* Brand Logo */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Brand Logo</h3>
              <select
                value={showBrandBanner ? brandBannerId : ''}
                onChange={(event) => {
                  const selectedBrandId = event.target.value;
                  setBrandBannerId(selectedBrandId);
                  setShowBrandBanner(Boolean(selectedBrandId));
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">No brand logo</option>
                {brandBannerOptions.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">The selected logo will appear below the quotation letterhead.</p>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">GST Inclusive Pricing</span>
                <input
                  type="checkbox"
                  checked={gstInclusive}
                  onChange={(e) => setGstInclusive(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show Discount to Customer</span>
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show MRP in Quotation</span>
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show Item-wise GST in Quotation</span>
                <input
                  type="checkbox"
                  checked={showItemWiseGst}
                  onChange={(e) => setShowItemWiseGst(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show UOM in Quotation</span>
                <input
                  type="checkbox"
                  checked={showUom}
                  onChange={(e) => setShowUom(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Round Off Net Amount in Quotation</span>
                <input
                  type="checkbox"
                  checked={roundOffNetAmount}
                  onChange={(e) => setRoundOffNetAmount(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
              <div className="space-y-2">
                {masterTerms.filter(t => t.status === 'active').map(term => (
                  <label key={term.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTerms.includes(term.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTerms([...selectedTerms, term.id]);
                        } else {
                          setSelectedTerms(selectedTerms.filter(t => t !== term.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <span className="text-sm text-gray-700">{term.content}</span>
                  </label>
                ))}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customTermEnabled}
                    onChange={(e) => {
                      setCustomTermEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setCustomTermText('');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <span className="text-sm text-gray-700">Add additional custom term</span>
                </label>
                {customTermEnabled && (
                  <textarea
                    value={customTermText}
                    onChange={(e) => setCustomTermText(e.target.value)}
                    placeholder="Enter additional terms and conditions"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="space-y-2 border-t border-blue-100 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">Custom fields</span>
                    <button
                      type="button"
                      onClick={() => setCustomAdjustments((current) => [...current, { id: `custom-${Date.now()}`, name: '', amount: 0 }])}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add field
                    </button>
                  </div>
                  {customAdjustments.map((adjustment) => (
                    <div key={adjustment.id} className="grid grid-cols-[minmax(0,1fr)_120px_32px] gap-2">
                      <input
                        type="text"
                        value={adjustment.name}
                        onChange={(event) => setCustomAdjustments((current) => current.map((row) => row.id === adjustment.id ? { ...row, name: event.target.value } : row))}
                        placeholder="Discount, service, expense..."
                        className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={adjustment.amount}
                        onChange={(event) => setCustomAdjustments((current) => current.map((row) => row.id === adjustment.id ? { ...row, amount: Number(event.target.value) || 0 } : row))}
                        placeholder="+ / - amount"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomAdjustments((current) => current.filter((row) => row.id !== adjustment.id))}
                        className="rounded-lg text-red-600 hover:bg-red-50"
                        title="Remove custom field"
                      >
                        <Trash2 className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {customAdjustments.length > 0 && (
                    <div className="flex items-center justify-between border-t border-blue-100 pt-3 text-sm">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-semibold text-gray-900">
                        ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
                {!gstInclusive && totals.taxAmount > 0 && (
                  <div className="flex items-center justify-between border-t border-blue-100 pt-3 text-sm">
                    <span className="text-gray-600">GST</span>
                    <span className="font-medium text-gray-900">₹{totals.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Grand Total</span>
                    <span className="text-xl font-bold text-blue-600">₹{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Select Product</h3>
              <button
                onClick={closeProductModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0">
              <div className="mb-2 flex h-7 items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Brand Filter</p>
                </div>
                <button
                  type="button"
                  disabled={!brandFilterLocked && selectedProductBrandIds.length === 0}
                  onClick={() => setBrandFilterLocked((current) => !current)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${brandFilterLocked ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-600'}`}
                  title={brandFilterLocked ? 'Unlock brand filter' : 'Lock brand filter for repeated product additions'}
                >
                  {brandFilterLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                  {brandFilterLocked ? 'Locked' : 'Unlocked'}
                </button>
              </div>
              <DropdownMenu onOpenChange={(open) => {
                if (!open) setBrandFilterSearch('');
              }}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={brandFilterLocked}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <span className="truncate">{productBrandFilterLabel}</span>
                    <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="max-h-[60vh] w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden"
                  align="start"
                >
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <DropdownMenuLabel className="p-0">Select Brands</DropdownMenuLabel>
                    {selectedProductBrandIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductBrandIds([])}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="relative m-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={brandFilterSearch}
                      onChange={(event) => setBrandFilterSearch(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="Search brands"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="grid max-h-[45vh] grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-1 overflow-y-auto p-1">
                    {filteredProductBrands.map((brand) => (
                      <DropdownMenuCheckboxItem
                        key={brand.id}
                        checked={selectedProductBrandIds.includes(String(brand.id))}
                        onCheckedChange={() => toggleProductBrand(String(brand.id))}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {brand.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {filteredProductBrands.length === 0 && (
                      <p className="col-span-full px-2 py-6 text-center text-sm text-gray-500">
                        {activeProductBrands.length === 0 ? 'No active brands available.' : 'No matching brands found.'}
                      </p>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
              <label className="min-w-0 text-sm font-medium text-gray-700"><span className="flex h-7 items-center">Category Filter</span>
                <select value={selectedProductCategoryId} onChange={event => setSelectedProductCategoryId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                  <option value="">All Categories</option>
                  {categories.filter(category => category.status === 'active').map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <div className="min-w-0">
                <label className="text-sm font-medium text-gray-700"><span className="flex h-7 items-center">Tag Filter</span>
                  <select value={selectedProductTagId} disabled={tagsLoading || tagsError} onChange={event => setSelectedProductTagId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 disabled:bg-gray-100">
                    <option value="">{tagsLoading ? 'Loading tags…' : 'All Tags'}</option>
                    {productTags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                </label>
                {tagsError && <p className="mt-1 text-xs text-red-600">Unable to load tags. <button type="button" className="underline" onClick={() => setTagLoadAttempt(current => current + 1)}>Retry</button></p>}
              </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">Select multiple brands. Lock the brand filter to reuse it during this quotation.</p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name or model number"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectableProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => {
                    if (selectedProducts.length > 0) toggleProductSelection(product);
                    else addProducts([product]);
                  }}
                  className={`relative flex gap-4 p-4 pr-10 border rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all ${selectedProducts.some((item) => String(item.id) === String(product.id)) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.name} (${product.modelNumber || product.id})`}
                    checked={selectedProducts.some((item) => String(item.id) === String(product.id))}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleProductSelection(product)}
                    className="absolute right-3 top-3 h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  <img src={product.image} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.modelNumber}</p>
                    <p className="text-sm text-gray-500">{product.brand || 'No brand'}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">MRP: ₹{product.mrp.toLocaleString('en-IN')}</span>
                      <span className="text-sm font-semibold text-blue-600">₹{getQuotationBasePrice(product).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {productsLoading && <LoadingState label="Loading products..." />}
            {!productsLoading && selectableProducts.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                No products matched your search.
              </div>
            )}
            {productPagination.total > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <PaginationControls
                  page={productPagination.current_page}
                  pageSize={productPagination.per_page}
                  totalItems={productPagination.total}
                  totalPages={productPagination.last_page}
                  onPageChange={(nextPage) => fetchSelectableProducts(nextPage, productPagination.per_page)}
                  onPageSizeChange={(nextPageSize) => fetchSelectableProducts(1, nextPageSize)}
                />
              </div>
            )}
            <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-gray-200 bg-white py-3">
              <span className="text-sm text-gray-600" aria-live="polite">{selectedProducts.length} products selected</span>
              <div className="flex items-center gap-3">
                {selectedProducts.length > 0 && <button type="button" onClick={() => setSelectedProducts([])} className="text-sm text-gray-600 hover:underline">Clear selection</button>}
                <button
                  type="button"
                  disabled={selectedProducts.length === 0}
                  onClick={() => addProducts(selectedProducts)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Selected ({selectedProducts.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Selection Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Select Lead</h3>
              <button
                onClick={() => setShowLeadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search by name, phone, email, city, or requirement"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {leadSearch.trim().length > 0 && leadSearch.trim().length < 3 && (
                <p className="mt-2 text-xs text-gray-500">Enter at least 3 characters to search.</p>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="max-h-[52vh] overflow-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Lead</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Phone</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">City</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {inProgressLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead({
                            id: String(lead.id),
                            sourceType: 'lead',
                            name: lead.name || '',
                            phone: lead.phone || '',
                            email: lead.email || '',
                            company: '',
                            address: [lead.address_line_1, lead.address_line_2, lead.city, lead.state, lead.pincode, lead.country].filter(Boolean).join(', '),
                          });
                          setLeadSearch('');
                          setShowLeadModal(false);
                        }}
                        className="cursor-pointer transition-colors hover:bg-blue-50"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900">{lead.name || 'Untitled Lead'}</div>
                          <div className="mt-0.5 text-xs text-gray-500">{lead.lead_source?.replaceAll('_', ' ') || 'Lead'}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700 whitespace-nowrap">{maskPhone(lead.phone)}</td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700 max-w-[220px] truncate">{lead.email || '-'}</td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700 whitespace-nowrap">{lead.city || '-'}</td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700 max-w-[320px] truncate">{lead.requirement || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leadsLoading && <LoadingState label="Searching leads..." />}
                {!leadsLoading && debouncedLeadSearch !== null && inProgressLeads.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">
                    No in-progress leads matched your search.
                  </div>
                )}
                {!leadsLoading && debouncedLeadSearch === null && (
                  <div className="py-10 text-center text-sm text-gray-500">
                    Enter at least 3 characters to search for a lead.
                  </div>
                )}
              </div>
            </div>
            {!leadsLoading && leadPagination.total > 0 && (
              <div className="mt-4">
                <PaginationControls
                  page={leadPagination.current_page}
                  pageSize={leadPagination.per_page}
                  totalItems={leadPagination.total}
                  totalPages={leadPagination.last_page}
                  onPageChange={(nextPage) => fetchSelectableLeads(nextPage, leadPagination.per_page)}
                  onPageSizeChange={(nextPageSize) => fetchSelectableLeads(1, nextPageSize)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
