import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { serviceRequestService } from '../../services/serviceRequestService';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function ServicePayments() {
  const [month, setMonth] = useState('');
  const [submission, setSubmission] = useState('all');
  const [scope, setScope] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState({ revenue: 0, collection: 0, entries: [] as any[] });
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    serviceRequestService.payments({ ...(month ? { month } : {}), submission, scope, page, per_page: pageSize })
      .then(result => { if (!cancelled) { setData(result.data); setMeta(result.meta?.pagination || { total: 0, last_page: 1 }); } })
      .catch(() => { if (!cancelled) setError('Unable to load service payments.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, submission, scope, page, pageSize, reload]);
  const submit = async (id: string) => {
    setSubmitting(id);
    try {
      await serviceRequestService.submitPayment(id);
      setPage(1);
      setReload(value => value + 1);
      toast.success('Payment marked as submitted');
    } catch (failure: any) { toast.error(failure?.errors?.payment?.[0] || 'Unable to submit payment. Please try again.'); }
    finally { setSubmitting(null); }
  };
  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <Link to="/services" className="text-sm font-medium text-blue-600">← Back to Service</Link>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-2xl font-semibold">Service Payments</h2><p className="mt-1 text-sm text-gray-500">All collected payments, with unsubmitted payments first. Filter by request month if needed.</p></div>
      <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Month (optional)<input type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border px-3 py-2" /></label>
        {month && <button type="button" onClick={() => { setMonth(''); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm">All months</button>}
        <label className="text-sm">Payments<select value={submission} onChange={event => { setSubmission(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border px-3 py-2"><option value="all">All payments</option><option value="pending">Pending payments (not submitted)</option></select></label>
        <label className="text-sm">Requests<select value={scope} onChange={event => { setScope(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border px-3 py-2"><option value="all">All requests</option><option value="mine">My requests</option></select></label></div>
    </div>
    {loading ? <LoadingState label="Loading service payments..." /> : error ? <p role="alert" className="text-red-600">{error} <button onClick={() => setReload(value => value + 1)} className="underline">Retry</button></p> : <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6"><p className="text-sm text-gray-500">Total Revenue{month ? ' for the Month' : ' — All Time'}</p><p className="mt-2 text-3xl font-semibold">{money(data.revenue)}</p><p className="mt-2 text-xs text-gray-500">Closed Success (Completed) requests</p></div>
        <div className="rounded-2xl border bg-white p-6"><p className="text-sm text-gray-500">Total Collection{month ? ' for the Month' : ' — All Time'}</p><p className="mt-2 text-3xl font-semibold text-emerald-700">{money(data.collection)}</p><p className="mt-2 text-xs text-gray-500">Collected (Received) payments</p></div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b p-5"><h3 className="font-semibold">Closed Success & Collected</h3><p className="mt-1 text-sm text-gray-500">Mark each payment as submitted once it has been handed over. Pending means collected but not yet submitted.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-gray-50"><tr>{['Service No.', 'Customer', 'Request Date', 'Assigned User', 'Amount', 'Payment Submission'].map(label => <th key={label} className="px-5 py-3 text-left">{label}</th>)}</tr></thead>
          <tbody>{data.entries.map(row => <tr key={row.id} className="border-t"><td className="px-5 py-4 font-medium">{row.service_number}</td><td className="px-5 py-4">{row.customer?.name || '-'}</td><td className="px-5 py-4">{row.request_date}</td><td className="px-5 py-4">{row.scheduled_user?.name || 'Unassigned'}</td><td className="px-5 py-4">{money(row.total_charges)}</td><td className="px-5 py-4">{row.payment_submitted_at ? <div><span className="font-medium text-emerald-700">Submitted</span><p className="text-xs text-gray-500">{new Date(row.payment_submitted_at).toLocaleString('en-IN')}</p></div> : <button disabled={Boolean(submitting)} onClick={() => void submit(String(row.id))} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitting === String(row.id) ? 'Submitting...' : 'Payment Submitted'}</button>}</td></tr>)}{!data.entries.length && <tr><td colSpan={6} className="p-10 text-center text-gray-500">No payments match the selected filters.</td></tr>}</tbody>
        </table></div>
        <PaginationControls page={page} pageSize={pageSize} totalItems={meta.total} totalPages={meta.last_page} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      </div>
    </>}
  </div></div>;
}
