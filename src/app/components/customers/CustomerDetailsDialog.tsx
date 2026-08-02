import { useEffect, useState } from 'react';
import { FileText, MessageSquareText, Package, Plus, ShoppingCart, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { productService } from '../../../services/productService';
import { LoadingState } from '../common/AsyncState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface Props {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDetailsDialog = ({ customerId, open, onOpenChange }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productId, setProductId] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [productPopupOpen, setProductPopupOpen] = useState(false);

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const result = await customerService.overview(customerId);
      setData(result);
    } catch {
      toast.error('Unable to load customer information');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !customerId) {
      setData(null);
      return;
    }
    void load();
  }, [customerId, open]);

  useEffect(() => {
    if (!productPopupOpen || productsLoaded || productsLoading) return;

    setProductsLoading(true);
    productService.selectable({ per_page: 50 })
      .then((result) => {
        setProducts(result.data || []);
        setProductsLoaded(true);
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [productPopupOpen, productsLoaded, productsLoading]);

  const addProduct = async () => {
    if (!customerId || (!productId && !productDescription.trim()) || Number(quantity) <= 0) {
      toast.error('Select a CRM product or enter a product description, and provide a valid quantity');
      return;
    }
    setSaving(true);
    try {
      await customerService.addOwnedProduct(customerId, productId, productDescription, Number(quantity));
      setProductId('');
      setProductDescription('');
      setQuantity('1');
      setProductPopupOpen(false);
      await load();
      toast.success('Product added to customer');
    } catch {
      toast.error('Unable to add product');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value?: string) => value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined })
    : '-';

  const timelineIcon = (type: string) => {
    if (type === 'purchase') return <ShoppingCart className="h-4 w-4" />;
    if (type === 'quotation') return <FileText className="h-4 w-4" />;
    if (type === 'enquiry') return <MessageSquareText className="h-4 w-4" />;
    return <UserRound className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-[96vw] gap-0 overflow-hidden p-0 xl:max-w-6xl">
        <DialogHeader className="border-b border-gray-200 px-6 py-5">
          <DialogTitle>{data?.customer?.company_name || data?.customer?.primary_name || 'Customer Information'}</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="p-10"><LoadingState label="Loading customer information..." /></div>
        ) : (
          <div className="max-h-[calc(94vh-74px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">Customer Information</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ['Contact', data.customer.primary_name],
                    ['Company', data.customer.company_name],
                    ['Phone', data.customer.phone],
                    ['Email', data.customer.email],
                    ['Location', [data.customer.city, data.customer.state, data.customer.country].filter(Boolean).join(', ')],
                    ['Rating', data.customer.rating ? `${data.customer.rating}/5` : null],
                    ['Notes', data.customer.notes],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                      <dd className="mt-1 break-words text-gray-800">{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Products Owned</h3>
                  </div>
                  <button type="button" onClick={() => setProductPopupOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Add Product
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase text-gray-500">
                      <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Last Purchase</th><th className="px-4 py-3" /></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.owned_products.length ? data.owned_products.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm"><div className="font-medium text-gray-900">{item.product_name}</div><div className="text-xs text-gray-500">{[item.brand, item.model_number].filter(Boolean).join(' · ')}</div></td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.quantity} {item.measurement_unit || ''}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.last_purchased_at)}{item.dispatch_number ? <div className="text-xs text-gray-500">{item.dispatch_number}</div> : null}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={async () => {
                              if (!confirm('Remove this product from the customer?')) return;
                              await customerService.removeOwnedProduct(customerId!, String(item.id));
                              await load();
                              toast.success('Product removed');
                            }} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No products recorded for this customer.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-gray-900">Activity Timeline</h3>
              <div className="mt-5 space-y-0">
                {data.timeline.length ? data.timeline.map((item: any, index: number) => (
                  <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < data.timeline.length - 1 && <div className="absolute left-4 top-8 h-full w-px bg-gray-200" />}
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' :
                        item.type === 'quotation' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'enquiry' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>{timelineIcon(item.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <time className="text-xs text-gray-500">{formatDate(item.occurred_at)}</time>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                      {item.amount != null && <p className="mt-1 text-sm font-semibold text-gray-800">₹{Number(item.amount).toLocaleString('en-IN')}</p>}
                    </div>
                  </div>
                )) : <p className="py-8 text-center text-sm text-gray-500">No customer activity recorded yet.</p>}
              </div>
            </section>
          </div>
        )}
      </DialogContent>

      <Dialog open={productPopupOpen} onOpenChange={setProductPopupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product Owned by Customer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Select a Product Master item or describe a product that is not in the CRM.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">CRM Product (optional)</label>
              <select value={productId} onChange={(event) => setProductId(event.target.value)}
                disabled={productsLoading}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                <option value="">{productsLoading ? 'Loading products...' : 'Not from Product Master'}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}{product.model_number ? ` — ${product.model_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Product Description {!productId && <span className="text-red-600">*</span>}
              </label>
              <textarea value={productDescription} onChange={(event) => setProductDescription(event.target.value)}
                rows={3} placeholder="Describe the product, model, brand, or other details"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quantity <span className="text-red-600">*</span>
              </label>
              <input type="number" min="0.001" step="0.001" required value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setProductPopupOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={addProduct} disabled={saving || (!productId && !productDescription.trim()) || Number(quantity) <= 0}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
