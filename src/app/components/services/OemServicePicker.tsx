import { useEffect, useState } from 'react';
import { serviceRequestService } from '../../../services/serviceRequestService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { OemCustomerDetails } from './OemCustomerDetails';

export function OemServicePicker({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (service: any) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      serviceRequestService.list({ search, page, per_page: 10, date_filter: 'all', open_only: 1, scope: 'all' })
        .then(result => { if (!cancelled) { setRows(result.data); setLastPage(result.meta?.pagination?.last_page || 1); } })
        .catch(() => { if (!cancelled) setError('Unable to load service requests.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, search, page, retry]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>Select Service Request</DialogTitle><DialogDescription>Search by service number or customer. Only open service requests are listed.</DialogDescription></DialogHeader>
    <input aria-label="Search service requests" placeholder="Search service number or customer" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full rounded-xl border px-3 py-2" />
    {loading ? <p>Loading service requests...</p> : error ? <p role="alert">{error} <button type="button" onClick={()=>setRetry(v=>v+1)} className="text-blue-600">Retry</button></p> : <div className="space-y-3">{rows.map(row=><div key={row.id} className="rounded-xl border p-3 space-y-2"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{row.service_number}</p><p className="text-xs text-gray-500">Scheduled: {row.scheduled_date || 'Not scheduled'}</p></div><button type="button" onClick={()=>{onSelect(row);onOpenChange(false);}} className="rounded-lg bg-blue-600 px-3 py-2 text-white" aria-label={`Select ${row.service_number}`}>Select</button></div><OemCustomerDetails customer={row.customer} />{row.items?.length > 0 && <p className="text-sm">{row.items.map((item:any)=>item.machine_name).filter(Boolean).join(', ')}</p>}</div>)}{!rows.length && <p>No service requests found.</p>}</div>}
    <div className="flex justify-between text-sm"><button type="button" disabled={loading || page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {lastPage}</span><button type="button" disabled={loading || page>=lastPage} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  </DialogContent></Dialog>;
}
