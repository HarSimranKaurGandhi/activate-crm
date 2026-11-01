import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export function CustomerInvoices({ customerId, onUploaded }: { customerId: string; onUploaded: () => Promise<void> }) {
  const [data, setData] = useState<{ invoices: any[]; products: any[] }>({ invoices: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true); setError('');
    try {
      const result = await customerService.invoices(customerId);
      if (current === requestId.current) {
        setData(result);
        setSelected(ids => ids.filter(id => result.products.some(product => product.id === id && !product.invoice_id)));
      }
    } catch { if (current === requestId.current) setError('Unable to load customer invoices.'); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [customerId]);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  const start = () => {
    setFile(null); setNumber(''); setDate(''); setSearch(''); setSelected([]); setErrors({}); setOpen(true);
    void load();
  };
  const download = async (invoice: any) => {
    setDownloading(invoice.id);
    try {
      const blob = await customerService.downloadInvoice(customerId, invoice.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = invoice.file_name;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Unable to download invoice. Please try again.'); }
    finally { setDownloading(null); }
  };
  const filteredProducts = data.products.filter(product => `${product.name} ${product.model_number || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const field = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2';
  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-gray-900">Invoices</h3><button type="button" onClick={start} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">Upload Invoice</button></div>
    {loading ? <p className="py-6 text-sm text-gray-500">Loading invoices…</p> : error ? <p role="alert" className="py-4 text-sm text-red-600">{error} <button type="button" onClick={() => void load()} className="underline">Retry</button></p> : data.invoices.length ? <div className="mt-4 divide-y">
      {data.invoices.map(invoice => <div key={invoice.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row">
        <div className="min-w-0">
          <p className="break-words font-medium">{invoice.invoice_number || invoice.file_name}</p>
          {invoice.invoice_number && <p className="break-words text-sm text-gray-500">{invoice.file_name}</p>}
          <p className="mt-1 text-xs text-gray-500">{invoice.invoice_date ? `Invoice date: ${invoice.invoice_date.split('-').reverse().join('/')} · ` : ''}Uploaded {new Date(invoice.created_at).toLocaleDateString('en-IN')}</p>
          <div className="mt-2 flex flex-wrap gap-2">{invoice.products.length ? invoice.products.map((product: any) => <span key={product.id} className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-800">{product.name}{product.model_number ? ` (${product.model_number})` : ''} · Qty {Number(product.quantity)}</span>) : <span className="text-xs text-gray-500">No products linked</span>}</div>
        </div>
        <div className="flex items-start gap-2"><button type="button" disabled={deleting !== null} onClick={async () => {
          if (!confirm('Delete this invoice and its file? Linked products will remain and can be linked to another invoice.')) return;
          setDeleting(invoice.id);
          try { await customerService.deleteInvoice(customerId, invoice.id); toast.success('Invoice deleted'); await load(); await onUploaded(); }
          catch (err: any) { toast.error(err.message || 'Unable to delete invoice'); }
          finally { setDeleting(null); }
        }} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50">{deleting === invoice.id ? 'Deleting…' : 'Delete'}</button>
        <button type="button" disabled={downloading !== null} onClick={() => void download(invoice)} className="self-start rounded-lg border px-3 py-2 text-sm text-blue-600 disabled:opacity-50">{downloading === invoice.id ? 'Downloading…' : 'Download'}</button></div>
      </div>)}
    </div> : <p className="py-6 text-sm text-gray-500">No invoices uploaded for this customer.</p>}

    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Upload Customer Invoice</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (!file || saving || loading || error) return;
        if (file.size > 10 * 1024 * 1024) { setErrors({ invoice: ['Invoice must be no larger than 10 MB.'] }); return; }
        setSaving(true); setErrors({});
        const payload = new FormData();
        payload.append('invoice', file); payload.append('invoice_number', number); payload.append('invoice_date', date);
        selected.forEach(id => payload.append('product_ids[]', String(id)));
        try {
          await customerService.uploadInvoice(customerId, payload);
          toast.success('Invoice uploaded'); setOpen(false);
          await onUploaded();
        } catch (failure: any) {
          setErrors(failure.errors || { invoice: [failure.message || 'Unable to upload invoice.'] });
          if (failure.errors?.product_ids) await load();
        } finally { setSaving(false); }
      }}>
        <fieldset disabled={saving} className="space-y-4">
          <label className="block text-sm font-medium">Invoice file *<input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={event => setFile(event.target.files?.[0] || null)} className={field} /><span className="mt-1 block text-xs font-normal text-gray-500">PDF, JPG, PNG or WebP, up to 10 MB.</span></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Invoice number (optional)<input maxLength={100} value={number} onChange={event => setNumber(event.target.value)} className={field} /></label>
            <label className="block text-sm font-medium">Invoice date (optional)<input type="date" value={date} onChange={event => setDate(event.target.value)} className={field} /></label>
          </div>
          <div><p className="text-sm font-medium">Link products (optional)</p><p className="mt-1 text-xs text-gray-500">Choose from this customer’s Products Owned. Each record can be linked to only one invoice.</p>
            <input aria-label="Search owned products" placeholder="Search product or model" value={search} onChange={event => setSearch(event.target.value)} className={field} />
            {loading ? <p className="py-3 text-sm">Loading products…</p> : error ? <p role="alert" className="py-3 text-sm text-red-600">{error} <button type="button" onClick={() => void load()} className="underline">Retry</button></p> : <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border divide-y">
              {filteredProducts.length ? filteredProducts.map(product => <label key={product.id} className={`flex items-start gap-3 p-3 text-sm ${product.invoice_id ? 'bg-gray-50 text-gray-400' : 'cursor-pointer'}`}>
                <input type="checkbox" disabled={!!product.invoice_id} checked={selected.includes(product.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, product.id] : ids.filter(id => id !== product.id))} className="mt-1" />
                <span>{product.name}{product.model_number && <span className="block text-xs">{product.model_number}</span>}<span className="block text-xs">Qty {Number(product.quantity)}{product.invoice_id ? ' · Already linked to an invoice' : ''}</span></span>
              </label>) : <p className="p-4 text-sm text-gray-500">{data.products.length ? 'No matching products.' : 'No products owned yet. You can upload without linking products.'}</p>}
            </div>}
            <p className="mt-1 text-xs text-gray-500">{selected.length} selected</p>
          </div>
        </fieldset>
        {Object.entries(errors).map(([key, messages]) => <p key={key} role="alert" className="text-sm text-red-600">{messages.join(' ')}</p>)}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setOpen(false)}>Cancel</button><button disabled={saving || loading || !!error || !file} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Uploading…' : 'Upload Invoice'}</button></div>
      </form>
    </DialogContent></Dialog>
  </section>;
}
