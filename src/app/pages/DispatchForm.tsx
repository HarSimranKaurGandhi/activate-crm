import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { customerService } from '../../services/customerService';
import { dispatchService } from '../../services/dispatchService';
import { productService } from '../../services/productService';

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};
const today = localDate(new Date());
const tomorrow = (() => { const date = new Date(); date.setDate(date.getDate() + 1); return localDate(date); })();
const emptyItem = () => ({ requirement: '', product_id: '', product: '', model_number: '', brand: '', quantity: '1', price: '0', discount_percent: '0', discounted_price: '0' });

export const DispatchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [plannedDate, setPlannedDate] = useState(tomorrow);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [items, setItems] = useState<any[]>([emptyItem()]);
  const [selectingProduct, setSelectingProduct] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productMeta, setProductMeta] = useState<any>({ last_page: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    void dispatchService.get(id).then((dispatch) => {
      setCustomerId(String(dispatch.customer?.id || ''));
      setSelectedCustomer(dispatch.customer || null);
      setPlannedDate(dispatch.planned_dispatch_date || tomorrow);
      setItems(dispatch.items.map((item: any) => ({
        ...item,
        product_id: item.product_id ? String(item.product_id) : '',
        quantity: String(item.quantity || 1),
        price: String(item.price),
        discount_percent: String(item.discount_percent),
        discounted_price: String(item.discounted_price),
      })));
    });
  }, [id]);

  useEffect(() => {
    if (!customerOpen) return;
    const timer = setTimeout(() => {
      void customerService.list({ search: customerSearch, page: 1, per_page: 50 })
        .then((result) => setCustomers(result.data || []));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerOpen, customerSearch]);

  const loadProducts = async (page = 1) => {
    const result = await productService.selectable({ search: productSearch, page, per_page: 50 });
    setProducts(result.data || []);
    setProductMeta(result.meta?.pagination || {});
    setProductPage(page);
  };
  useEffect(() => {
    if (selectingProduct === null) return;
    const timer = setTimeout(() => void loadProducts(1), 300);
    return () => clearTimeout(timer);
  }, [selectingProduct, productSearch]);

  const update = (index: number, key: string, value: any) =>
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));

  const selectProduct = (product: any) => {
    if (selectingProduct === null) return;
    const price = Number(product.usual_selling_price ?? product.mrp ?? 0);
    setItems((current) => current.map((item, index) => index === selectingProduct ? {
      ...item,
      product_id: String(product.id),
      product: product.product_name,
      model_number: product.model_number,
      brand: product.brand?.name || '',
      price: String(price),
      discount_percent: '0',
      discounted_price: String(price),
    } : item));
    setSelectingProduct(null);
    setProductSearch('');
  };

  const clearProduct = (index: number) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, product_id: '', product: '', model_number: '', brand: '', price: '0', discount_percent: '0', discounted_price: '0' }
      : item));
  };

  const discountChanged = (index: number, value: string) => {
    const price = Number(items[index].price || 0);
    const discount = Math.min(100, Math.max(0, Number(value || 0)));
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, discount_percent: value, discounted_price: (price * (1 - discount / 100)).toFixed(2) }
      : item));
  };
  const discountedChanged = (index: number, value: string) => {
    const price = Number(items[index].price || 0);
    const discounted = Number(value || 0);
    const discount = price > 0 ? Math.max(0, Math.min(100, (1 - discounted / price) * 100)) : 0;
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, discounted_price: value, discount_percent: discount.toFixed(3) }
      : item));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        customer_id: Number(customerId),
        dispatch_date: today,
        planned_dispatch_date: plannedDate,
        items: items.map(({ requirement, product_id, quantity, price, discount_percent, discounted_price }) => ({
          requirement,
          product_id: product_id ? Number(product_id) : null,
          quantity: Number(quantity),
          price: Number(price),
          discount_percent: Number(discount_percent),
          discounted_price: Number(discounted_price),
        })),
      };
      let dispatch = id ? await dispatchService.update(id, payload) : await dispatchService.create(payload);
      if (invoiceFile) dispatch = await dispatchService.uploadInvoice(String(dispatch.id), invoiceFile);
      toast.success(invoiceFile ? 'Dispatch saved and marked as invoiced' : id ? 'Dispatch updated' : 'Dispatch created');
      navigate(`/dispatches/${dispatch.id}`);
    } catch (error: any) {
      toast.error(Object.values(error?.errors || {}).flat()[0] as string || 'Unable to save dispatch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <form onSubmit={submit} className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3"><button type="button" onClick={() => navigate('/dispatches')} className="p-2"><ArrowLeft /></button><h2 className="text-2xl font-semibold">{id ? 'Edit' : 'New'} Dispatch</h2></div>
        <div className="grid gap-5 rounded-2xl border bg-white p-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Customer *</label>
            <button type="button" onClick={() => setCustomerOpen(true)} className="w-full rounded-xl border px-4 py-3 text-left">
              {selectedCustomer ? <><div className="font-medium">{selectedCustomer.company_name || selectedCustomer.primary_name}</div><div className="text-xs text-gray-500">{selectedCustomer.primary_name} • {selectedCustomer.phone}</div></> : <span className="text-gray-400">Select customer</span>}
            </button>
            <input required value={customerId} onChange={() => {}} className="sr-only" />
          </div>
          <div><label className="mb-2 block text-sm font-medium">Voucher Date</label><input readOnly value={today} className="w-full rounded-xl border bg-gray-50 px-4 py-3 text-gray-600" /></div>
          <div><label className="mb-2 block text-sm font-medium">Planned Dispatch Date *</label><input required type="date" min={tomorrow} value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="w-full rounded-xl border px-4 py-3" /></div>
          <div><label className="mb-2 block text-sm font-medium">Invoice PDF (Optional)</label><input type="file" accept=".pdf,application/pdf" onChange={(event) => setInvoiceFile(event.target.files?.[0] || null)} className="w-full rounded-xl border px-3 py-2.5" /><p className="mt-1 text-xs text-gray-500">Uploading the invoice PDF changes the stage to INVOICED.</p></div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex justify-between border-b p-5"><div><h3 className="font-semibold">Products</h3><p className="text-xs text-gray-500">Product selection is optional.</p></div><button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white"><Plus className="h-4 w-4" />Add Row</button></div>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Requirement</th><th className="px-3 py-3 text-left">Product (Optional)</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">Discount %</th><th className="px-3 py-3 text-right">Discounted Price</th><th /></tr></thead>
              <tbody className="divide-y">{items.map((item, index) => <tr key={index}>
                <td className="p-3"><input required value={item.requirement} onChange={(event) => update(index, 'requirement', event.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="Requirement" /></td>
                <td className="p-3"><div className="flex min-w-72 gap-2"><button type="button" onClick={() => setSelectingProduct(index)} className="flex-1 rounded-lg border px-3 py-2 text-left">{item.product ? <><div className="font-medium">{item.product}</div><div className="text-xs text-gray-500">{item.model_number} • {item.brand}</div></> : <span className="text-gray-400">Select product (optional)</span>}</button>{item.product_id && <button type="button" onClick={() => clearProduct(index)} className="rounded-lg border px-3 text-gray-500">Clear</button>}</div></td>
                <td className="p-3"><input required min="0.001" step="0.001" type="number" value={item.quantity} onChange={(event) => update(index, 'quantity', event.target.value)} className="w-28 rounded-lg border px-3 py-2 text-right" /></td>
                <td className="p-3"><input required min="0" step="0.01" type="number" value={item.price} onChange={(event) => update(index, 'price', event.target.value)} className="w-32 rounded-lg border px-3 py-2 text-right" /></td>
                <td className="p-3"><input required min="0" max="100" step="0.001" type="number" value={item.discount_percent} onChange={(event) => discountChanged(index, event.target.value)} className="w-28 rounded-lg border px-3 py-2 text-right" /></td>
                <td className="p-3"><input required min="0" step="0.01" type="number" value={item.discounted_price} onChange={(event) => discountedChanged(index, event.target.value)} className="w-36 rounded-lg border px-3 py-2 text-right" /></td>
                <td><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate('/dispatches')} className="rounded-xl border px-6 py-3">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 text-white">{saving ? 'Saving...' : 'Save Dispatch'}</button></div>

        {customerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6"><div className="mb-4 flex justify-between"><h3 className="text-xl font-semibold">Select Customer</h3><button type="button" onClick={() => setCustomerOpen(false)}>✕</button></div><div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input autoFocus value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search name, company, phone or email" className="w-full rounded-xl border py-3 pl-10 pr-4" /></div><div className="space-y-2">{customers.map((customer) => <button type="button" key={customer.id} onClick={() => { setCustomerId(String(customer.id)); setSelectedCustomer(customer); setCustomerOpen(false); }} className="w-full rounded-xl border p-4 text-left hover:border-blue-500 hover:bg-blue-50"><div className="font-medium">{customer.company_name || customer.primary_name}</div><div className="text-sm text-gray-500">{customer.primary_name} • {customer.phone} • {customer.email}</div></button>)}</div></div></div>}
        {selectingProduct !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6"><div className="mb-4 flex justify-between"><h3 className="text-xl font-semibold">Select Product</h3><button type="button" onClick={() => setSelectingProduct(null)}>✕</button></div><div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input autoFocus value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search product, model or brand" className="w-full rounded-xl border py-3 pl-10 pr-4" /></div><div className="grid gap-3 md:grid-cols-2">{products.map((product) => <button type="button" key={product.id} onClick={() => selectProduct(product)} className="rounded-xl border p-4 text-left hover:border-blue-500"><div className="font-medium">{product.product_name}</div><div className="text-sm text-gray-500">{product.model_number || '-'} • {product.brand?.name || 'No brand'}</div><div className="mt-2 font-semibold text-blue-600">₹{Number(product.usual_selling_price || product.mrp || 0).toLocaleString('en-IN')}</div></button>)}</div><div className="mt-4 flex justify-end gap-3"><button type="button" disabled={productPage <= 1} onClick={() => void loadProducts(productPage - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><span className="py-2 text-sm">{productPage} / {productMeta.last_page || 1}</span><button type="button" disabled={productPage >= (productMeta.last_page || 1)} onClick={() => void loadProducts(productPage + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div></div>}
      </form>
    </div>
  );
};
