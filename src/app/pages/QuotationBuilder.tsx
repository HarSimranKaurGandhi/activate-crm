import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Search, GripVertical, Trash2, ChevronDown, Save } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { toast } from 'sonner';
import { productService } from '../../services/productService';
import type { PaginationMeta } from '../../services/productService';
import { userService } from '../../services/userService';
import { leadService } from '../../services/leadService';
import { mapProduct } from '../../services/mappers';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls, usePagination } from '../components/common/Pagination';

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const maskPhone = (value?: string) => {
  const phone = String(value || '').trim();
  if (!phone) return '-';
  if (phone.length <= 1) return `${phone}****`;
  return `${phone.slice(0, 1)}****`;
};

const getQuotationBasePrice = (product: any) => Number(product?.mrp ?? product?.sellingPrice ?? product?.usualSellingPrice ?? 0);
const normalizeDiscount = (value: number) => Math.min(100, Math.max(0, Number(value.toFixed(2))));
const normalizeAmount = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
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
}

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

  useEffect(() => {
    setDiscountedPriceInput(String(Number(discountedUnitPrice.toFixed(2))));
  }, [discountedUnitPrice]);

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
              const calculatedDiscount = item.price > 0
                ? ((item.price - enteredPrice) / item.price) * 100
                : 0;

              onUpdate(item.id, {
                discount: normalizeDiscount(calculatedDiscount),
                discountedPrice: enteredPrice,
              });
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
        <input
          type="text"
          inputMode="decimal"
          value={item.discount}
          onChange={(e) => {
            const nextValue = e.target.value;
            if (nextValue !== '' && !/^\d*\.?\d{0,2}$/.test(nextValue)) {
              return;
            }

            const newDiscount = parseFloat(nextValue) || 0;
            onUpdate(item.id, {
              discount: normalizeDiscount(newDiscount),
              discountedPrice: Math.max(item.price - (item.price * normalizeDiscount(newDiscount)) / 100, 0),
            });
          }}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center"
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
  const { quotations, brands, addQuotation, updateQuotation, terms: masterTerms, settings, loading } = useData();
  const { user } = useAuth();

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [salesperson, setSalesperson] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [selectedSalespersonId, setSelectedSalespersonId] = useState('');
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [gstInclusive, setGstInclusive] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showMrp, setShowMrp] = useState(false);
  const [showItemWiseGst, setShowItemWiseGst] = useState(false);
  const [roundOffNetAmount, setRoundOffNetAmount] = useState(false);
  const [showUom, setShowUom] = useState(false);
  const [showBrandBanner, setShowBrandBanner] = useState(false);
  const [brandBannerId, setBrandBannerId] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [customTermEnabled, setCustomTermEnabled] = useState(false);
  const [customTermText, setCustomTermText] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectableProducts, setSelectableProducts] = useState<any[]>([]);
  const [productPagination, setProductPagination] = useState(emptyProductPagination);
  const [productsLoading, setProductsLoading] = useState(false);
  const [inProgressLeads, setInProgressLeads] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userService
      .dropdown()
      .then((users) => setSalesUsers(Array.isArray(users) ? users : []))
      .catch(() => setSalesUsers([]));
  }, []);

  useEffect(() => {
    const quotation = id ? quotations.find(q => q.id === id) : null;
    if (id) {
      if (quotation) {
        setSelectedLead(quotation.customer ? {
          id: quotation.customer.id,
          sourceType: 'customer',
          customerId: quotation.customer.id,
          name: quotation.customer.name,
          phone: quotation.customer.phone,
          email: quotation.customer.email,
          company: quotation.customer.company,
          address: quotation.customer.address,
        } : null);
        setSalesperson(quotation.salesperson);
        setItems(quotation.items);
        setGlobalDiscount(quotation.globalDiscount);
        setGstInclusive(quotation.gstInclusive);
        setShowDiscount(quotation.showDiscount);
        setShowMrp(quotation.showMrp ?? true);
        setShowItemWiseGst(quotation.showItemWiseGst ?? false);
        setRoundOffNetAmount(quotation.roundOffNetAmount ?? false);
        setShowUom(quotation.showUom ?? false);
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
      setShowUom(false);
      setShowBrandBanner(false);
      setBrandBannerId('');
      setCustomTermEnabled(false);
      setCustomTermText('');

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

  }, [id, quotations, settings, masterTerms, user]);

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

    setProductsLoading(true);
    try {
      const result = await productService.selectable({
        is_active: true,
        page,
        per_page: perPage,
        ...(debouncedProductSearch ? { search: debouncedProductSearch } : {}),
      });
      const data = Array.isArray(result.data) ? result.data : [];
      setSelectableProducts(data.map(mapProduct));
      setProductPagination({
        ...emptyProductPagination,
        ...(result.meta?.pagination || {}),
      });
    } catch {
      setSelectableProducts([]);
      setProductPagination(emptyProductPagination);
    } finally {
      setProductsLoading(false);
    }
  }, [debouncedProductSearch, showProductModal]);

  useEffect(() => {
    if (!showProductModal) {
      return;
    }

    fetchSelectableProducts(1, productPagination.per_page);
  }, [debouncedProductSearch, fetchSelectableProducts, productPagination.per_page, showProductModal]);

  useEffect(() => {
    if (!showLeadModal) return;

    leadService
      .list({ status: 'in_progress' })
      .then((result) => {
        setInProgressLeads(Array.isArray(result.data) ? result.data : []);
      })
      .catch(() => setInProgressLeads([]));
  }, [showLeadModal]);

  const moveRow = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  const addProduct = (product: any) => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      product,
      quantity: 1,
      price: getQuotationBasePrice(product),
      discount: 0,
      discountedPrice: getQuotationBasePrice(product),
      specifications: product.specifications,
    };
    setItems([...items, newItem]);
    setShowProductModal(false);
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
        discount: normalizedValue,
        discountedPrice: Math.max(item.price - (item.price * normalizedValue) / 100, 0),
      })),
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.discountedPrice * item.quantity;
    });

    let taxAmount = 0;
    if (!gstInclusive) {
      items.forEach(item => {
        taxAmount += (item.discountedPrice * item.quantity) * (item.product.gstPercent / 100);
      });
    }

    const grandTotal = subtotal + taxAmount;

    return { subtotal, taxAmount, grandTotal };
  };

  const totals = calculateTotals();
  const itemPagination = usePagination(items, 10);
  const filteredLeads = inProgressLeads.filter((lead) => {
    const search = leadSearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return (
      String(lead.name || '').toLowerCase().includes(search) ||
      String(lead.phone || '').toLowerCase().includes(search) ||
      String(lead.email || '').toLowerCase().includes(search) ||
      String(lead.city || '').toLowerCase().includes(search) ||
      String(lead.requirement || '').toLowerCase().includes(search)
    );
  });
  const leadPagination = usePagination(filteredLeads, 8);

  if (loading && id) {
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

    const quotationData = {
      date: new Date().toISOString(),
      lead: selectedLead,
      salesperson,
      items,
      globalDiscount,
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
      } else {
        await addQuotation(quotationData);
        toast.success('Quotation created successfully');
      }
      navigate('/quotations');
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
                <input
                  type="text"
                  inputMode="decimal"
                  value={globalDiscount}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (nextValue !== '' && !/^\d*\.?\d{0,2}$/.test(nextValue)) {
                      return;
                    }

                    handleGlobalDiscountChange(parseFloat(nextValue) || 0);
                  }}
                  className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="0"
                />
                <span className="text-gray-600">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Overrides individual product discounts</p>
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
                <span className="text-sm font-medium text-gray-700">Show Brand Logo Banner</span>
                <input
                  type="checkbox"
                  checked={showBrandBanner}
                  onChange={(e) => {
                    setShowBrandBanner(e.target.checked);
                    if (!e.target.checked) {
                      setBrandBannerId('');
                    }
                  }}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              {showBrandBanner && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Banner Brand</label>
                  <select
                    value={brandBannerId}
                    onChange={(e) => setBrandBannerId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <option value="">Select brand</option>
                    {brands
                      .filter((brand) => brand.status === 'active')
                      .map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                  </select>
                </div>
              )}

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
                {!gstInclusive && totals.taxAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
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
                onClick={() => {
                  setProductSearch('');
                  setSelectableProducts([]);
                  setProductPagination(emptyProductPagination);
                  setShowProductModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name, model number, or brand"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectableProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => {
                    addProduct(product);
                    setProductSearch('');
                    setSelectableProducts([]);
                    setProductPagination(emptyProductPagination);
                  }}
                  className="flex gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
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
                    {leadPagination.pageItems.map((lead) => (
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
                {filteredLeads.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">
                    No in-progress leads matched your search.
                  </div>
                )}
              </div>
            </div>
            {filteredLeads.length > 0 && (
              <div className="mt-4">
                <PaginationControls
                  page={leadPagination.page}
                  pageSize={leadPagination.pageSize}
                  totalItems={leadPagination.totalItems}
                  totalPages={leadPagination.totalPages}
                  onPageChange={leadPagination.setPage}
                  onPageSizeChange={leadPagination.setPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
