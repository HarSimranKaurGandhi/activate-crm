import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

export function QuotePayments() {
  const { user } = useAuth();
  const canEdit = user?.role?.code === 'admin' || user?.module_permissions?.some((permission: any) => permission.module === 'billing' && permission.can_view && permission.can_edit);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      billingService.payments({ search, ...(status ? { payment_status: status } : {}), page, per_page: pageSize })
        .then(result => { if (active) { setRows(result.data); setMeta(result.meta?.pagination || { total: 0, last_page: 1 }); } })
        .catch(() => { if (active) setError('Unable to load payments.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, status, page, pageSize, reload]);
  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <Link to="/billing" className="text-sm font-medium text-blue-600">← Billing and Payments</Link>
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Payments</h1><p className="mt-1 text-sm text-slate-500">Track payments for executed quotations and uploaded custom quotations.</p></div>{canEdit && <button onClick={() => { setNumber(''); setAmount(''); setPaymentStatus('pending'); setFile(null); setUploadError(''); setOpen(true); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">Upload Custom Quote</button>}</header>
    <div className="flex flex-wrap gap-4"><label className="text-sm">Quote Number<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search quote number" className="mt-1 block rounded-xl border px-3 py-2.5" /></label><label className="text-sm">Payment Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="mt-1 block rounded-xl border bg-white px-3 py-2.5"><option value="">All Payments</option><option value="pending">Pending</option><option value="received">Received</option></select></label></div>
    <section className="overflow-hidden rounded-2xl border bg-white">{loading ? <div className="p-10"><LoadingState label="Loading payments..." /></div> : error ? <div role="alert" className="p-10">{error} <button onClick={() => setReload(value => value + 1)} className="text-blue-600 underline">Retry</button></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Quote No.', 'Source', 'Amount', 'Payment Status', 'Quote'].map(label => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead><tbody className="divide-y">{rows.map(row => {
      const key = `${row.source}-${row.id}`;
      return <tr key={key}><td className="px-5 py-4 font-medium">{row.quote_number}</td><td className="px-5 py-4 text-slate-500">{row.source === 'custom' ? 'Custom PDF' : 'Executed Quotation'}</td><td className="whitespace-nowrap px-5 py-4 font-semibold">₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td className="px-5 py-4">{canEdit ? <select aria-label={`Payment status for ${row.quote_number}`} disabled={Boolean(busy)} value={row.payment_status} onChange={async event => {
        const next = event.target.value; setBusy(key);
        try { await billingService.paymentStatus(row.source, String(row.id), next); toast.success('Payment status updated'); setPage(1); setReload(value => value + 1); }
        catch (err: any) { toast.error(err.message || 'Unable to update payment status'); }
        finally { setBusy(''); }
      }} className={`rounded-lg border px-3 py-2 disabled:opacity-50 ${row.payment_status === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}><option value="pending">Pending</option><option value="received">Received</option></select> : <span className={row.payment_status === 'received' ? 'text-emerald-700' : 'text-amber-700'}>{row.payment_status === 'received' ? 'Received' : 'Pending'}</span>}</td><td className="px-5 py-4">{row.source === 'quotation' ? <Link to={`/quotations/${row.id}/preview`} className="font-medium text-blue-600">View Quote</Link> : <button className="font-medium text-blue-600" onClick={async () => {
        try { const blob = await billingService.customQuotePdf(String(row.id)); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${row.quote_number.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
        catch { toast.error('Unable to download quote PDF'); }
      }}>Download PDF</button>}</td></tr>;
    })}{!rows.length && <tr><td colSpan={5} className="p-12 text-center text-slate-500">No payments match these filters.</td></tr>}</tbody></table></div>}
      <PaginationControls page={page} pageSize={pageSize} totalItems={meta.total} totalPages={meta.last_page} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
    </section>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Upload Custom Quote</DialogTitle><DialogDescription>Add a quotation PDF and track its payment.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (saving || !file) return;
        if (file.size > 10 * 1024 * 1024) { setUploadError('PDF must be 10 MB or smaller.'); return; }
        setSaving(true); setUploadError('');
        const data = new FormData(); data.append('quote_number', number.trim()); data.append('amount', amount); data.append('payment_status', paymentStatus); data.append('pdf', file);
        try { await billingService.uploadQuote(data); setOpen(false); setPage(1); setReload(value => value + 1); toast.success('Custom quote uploaded'); }
        catch (err: any) { setUploadError(Object.values(err.errors || {}).flat().join(' ') || err.message || 'Unable to upload quote'); }
        finally { setSaving(false); }
      }}>
        <label className="block text-sm font-medium">Quote Number *<input required maxLength={100} value={number} disabled={saving} onChange={event => setNumber(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <label className="block text-sm font-medium">Amount (₹) *<input type="number" required min="0" max="999999999999.99" step="0.01" value={amount} disabled={saving} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <label className="block text-sm font-medium">Payment Status *<select value={paymentStatus} disabled={saving} onChange={event => setPaymentStatus(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5"><option value="pending">Pending</option><option value="received">Received</option></select></label>
        <label className="block text-sm font-medium">Quotation PDF *<input type="file" accept="application/pdf,.pdf" required disabled={saving} onChange={event => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /><span className="mt-1 block text-xs font-normal text-slate-500">PDF only, up to 10 MB.</span></label>
        {uploadError && <p role="alert" className="text-sm text-red-600">{uploadError}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving || !file || !number.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Uploading...' : 'Upload Quote'}</button></div>
      </form>
    </DialogContent></Dialog>
  </div>;
}
