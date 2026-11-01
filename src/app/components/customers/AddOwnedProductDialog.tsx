import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { productService, type PaginationMeta } from '../../../services/productService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface Props { customerId: string; open: boolean; onOpenChange: (open: boolean) => void; onAdded: () => void | Promise<void>; }
const emptyPagination: PaginationMeta = { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null };
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const AddOwnedProductDialog = ({ customerId, open, onOpenChange, onAdded }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  useEffect(() => {
    if (!referenceImage) { setImagePreview(''); return; }
    const url = URL.createObjectURL(referenceImage); setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);
  const [quantity, setQuantity] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(localToday());
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      productService.selectable({ search: search.trim(), page, per_page: 10 })
        .then((result) => {
          if (currentRequest !== requestId.current) return;
          setProducts(result.data || []);
          setPagination({ ...emptyPagination, ...(result.meta?.pagination || {}) });
        })
        .catch(() => {
          if (currentRequest === requestId.current) setProducts([]);
        })
        .finally(() => {
          if (currentRequest === requestId.current) setLoading(false);
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, page, search]);

  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const chooseProduct = (product: any) => {
    if (productId === String(product.id)) { setProductId(''); setSelectedProduct(null); return; }
    setProductId(String(product.id)); setSelectedProduct(product);
  };
  const submit = async () => {
    if ((!productId && !description.trim()) || Number(quantity) <= 0) return;
    setSaving(true);
    try {
      await customerService.addOwnedProduct(customerId, productId, description, Number(quantity), purchaseDate, serialNumber, referenceImage);
      setSerialNumber(''); setReferenceImage(null); setProductId(''); setSelectedProduct(null); setDescription(''); setQuantity('1'); setPurchaseDate(localToday()); setSearch(''); setPage(1); onOpenChange(false);
      await onAdded();
      toast.success('Product added to customer');
    } catch (error: any) { toast.error(Object.values(error.errors || {}).flat().join(' ') || error.message || 'Unable to add product'); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add Product Owned by Customer</DialogTitle></DialogHeader>
    <p className="text-sm text-gray-500">Search Product Master on the server, or describe a product that is not in the CRM.</p>
    <div className="space-y-4"><div><label className="mb-2 block text-sm font-medium">CRM Product (optional)</label>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input autoFocus value={search} onChange={event=>updateSearch(event.target.value)} placeholder="Search product name, model number or brand" className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm"/></div>
      {selectedProduct&&<div className="mt-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm"><span className="font-medium text-blue-900">Selected: {selectedProduct.product_name}</span>{selectedProduct.model_number&&<span className="text-blue-700"> — {selectedProduct.model_number}</span>}</div>}
      <div className="mt-2 overflow-hidden rounded-xl border"><div className="max-h-56 divide-y overflow-y-auto">{loading?<div className="p-6 text-center text-sm text-slate-500">Searching products...</div>:products.map(product=><button type="button" key={product.id} onClick={()=>chooseProduct(product)} className={`block w-full px-4 py-3 text-left hover:bg-blue-50 ${productId===String(product.id)?'bg-blue-50':''}`}><span className="block text-sm font-medium">{product.product_name}</span><span className="text-xs text-slate-500">{[product.model_number,product.brand?.name].filter(Boolean).join(' · ')||'No model or brand'}</span></button>)}{!loading&&!products.length&&<div className="p-6 text-center text-sm text-slate-500">No products found.</div>}</div>
        <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2"><span className="text-xs text-slate-500">{pagination.total} products</span><div className="flex items-center gap-2"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)} className="rounded-lg border bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><span className="text-xs">{pagination.current_page} / {pagination.last_page}</span><button type="button" disabled={page>=pagination.last_page||loading} onClick={()=>setPage(value=>value+1)} className="rounded-lg border bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div></div>
      </div></div>
    <div><label className="mb-2 block text-sm font-medium">Product Description {!productId&&<span className="text-red-600">*</span>}</label><textarea rows={3} value={description} onChange={event=>setDescription(event.target.value)} placeholder={productId?'Optional notes about this machine':'Describe the product, model, brand, or other details'} className="w-full rounded-xl border px-3 py-2.5 text-sm"/></div>
    <div><label className="mb-2 block text-sm font-medium">Serial Number (optional)</label><input maxLength={100} value={serialNumber} onChange={event => setSerialNumber(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
    <div><label className="mb-2 block text-sm font-medium">Serial Number Image (optional)</label><input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast.error('Choose a JPG, PNG or WebP image.'); return; }
      if (file.size > 5 * 1024 * 1024) { toast.error('Image must be 5 MB or smaller.'); return; }
      setReferenceImage(file);
    }} className="w-full text-sm" /><p className="mt-1 text-xs text-gray-500">Upload a photo of the serial number or serial label. JPG, PNG or WebP, up to 5 MB.</p>
    {referenceImage && <div className="mt-2 flex items-center gap-3"><img src={imagePreview} alt="Serial number image preview" className="h-[50px] w-[50px] rounded object-contain" /><span className="text-xs">{referenceImage.name}</span><button type="button" disabled={saving} onClick={() => setReferenceImage(null)} className="text-sm text-red-600">Remove</button></div>}</div>
    <div><label className="mb-2 block text-sm font-medium">Quantity <span className="text-red-600">*</span></label><input type="number" min="0.001" step="0.001" value={quantity} onChange={event=>setQuantity(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm"/></div>
    <div><label className="mb-2 block text-sm font-medium">Purchase Date <span className="text-red-600">*</span></label><input required type="date" max={localToday()} value={purchaseDate} onChange={event=>setPurchaseDate(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm"/></div></div>
    <div className="flex justify-end gap-3"><button type="button" onClick={()=>onOpenChange(false)} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button type="button" onClick={submit} disabled={saving||(!productId&&!description.trim())||Number(quantity)<=0} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white disabled:opacity-50">{saving?'Adding...':'Add Product'}</button></div>
  </DialogContent></Dialog>;
};
