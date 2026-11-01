import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import { leadService } from '../../services/leadService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { PaginationControls } from '../components/common/Pagination';
import { LoadingState } from '../components/common/AsyncState';

const empty = { name: '', phone: '', email: '', city: '', address_line_1: '', requirement: '' };
export function InfluencerPortal() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      leadService.list({ include_closed: 1, search, page, per_page: pageSize })
        .then(result => { if (!cancelled) { setRows(result.data || []); setMeta(result.meta?.pagination || { total: 0, last_page: 1 }); } })
        .catch(() => { if (!cancelled) setError('Unable to load your leads.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, page, pageSize, reload]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false; setUpdates([]); setComment(''); setUpdatesLoading(true); setUpdatesError('');
    leadService.activity(String(selected.id)).then(result => { if (!cancelled) setUpdates(result); })
      .catch(() => { if (!cancelled) setUpdatesError('Unable to load lead updates.'); })
      .finally(() => { if (!cancelled) setUpdatesLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.id]);
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await apiClient.post('/influencer/leads', form); setAdding(false); setForm(empty); setPage(1); setReload(value => value + 1); toast.success('Lead added'); }
    catch (failure: any) { toast.error(Object.values(failure?.errors || {}).flat().join(' ') || 'Unable to add lead'); }
    finally { setSaving(false); }
  };
  const addUpdate = async (event: React.FormEvent) => {
    event.preventDefault(); if (!comment.trim()) return; setSaving(true);
    try { const update = await leadService.addComment(String(selected.id), comment.trim()); setUpdates(current => [update, ...current]); setComment(''); toast.success('Update added'); }
    catch { toast.error('Unable to add update'); } finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold">My Leads</h2><p className="text-sm text-gray-500">Add leads, share updates, and generate quotations.</p></div><button onClick={() => { setForm(empty); setAdding(true); }} className="rounded-xl bg-blue-600 px-5 py-3 text-white">Add Lead</button></div>
    <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search your leads" aria-label="Search your leads" className="w-full rounded-xl border px-4 py-3" />
    {loading ? <LoadingState label="Loading your leads..." /> : error ? <p role="alert">{error} <button className="text-blue-600" onClick={() => setReload(value => value + 1)}>Retry</button></p> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Lead', 'Requirement', 'Status', 'Actions'].map(label => <th key={label} className="p-4 text-left">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-4"><div className="font-medium">{row.name || 'Unnamed lead'}</div><div>{row.phone || row.email || '-'}</div></td><td className="max-w-sm p-4">{row.requirement}</td><td className="p-4 capitalize">{row.status.replaceAll('_', ' ')}</td><td className="p-4"><div className="flex gap-3"><button className="text-blue-600" onClick={() => setSelected(row)}>View / Add Update</button><button className="text-emerald-700" onClick={() => navigate(`/quotations/new?lead_id=${row.id}`)}>Generate Quotation</button></div></td></tr>)}{!rows.length && <tr><td colSpan={4} className="p-10 text-center text-gray-500">No leads found.</td></tr>}</tbody></table></div>}
    <PaginationControls page={page} pageSize={pageSize} totalItems={meta.total} totalPages={meta.last_page} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
    <Dialog open={adding} onOpenChange={open => { if (!saving) setAdding(open); }}><DialogContent><DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader><form onSubmit={add} className="space-y-3">{(['name','phone','email','city','address_line_1'] as const).map(field => <label key={field} className="block text-sm capitalize">{field === 'address_line_1' ? 'Address' : field}<input required={field === 'name'} type={field === 'email' ? 'email' : 'text'} maxLength={field === 'phone' ? 10 : 255} value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: field === 'phone' ? event.target.value.replace(/\D/g, '') : event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>)}<label className="block text-sm">Requirement<textarea required maxLength={5000} value={form.requirement} onChange={event => setForm(current => ({ ...current, requirement: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white">{saving ? 'Saving...' : 'Add Lead'}</button></form></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.name || 'Lead Details'}</DialogTitle></DialogHeader><p>{[selected?.phone, selected?.email, selected?.city].filter(Boolean).join(' · ')}</p><p className="whitespace-pre-wrap">{selected?.requirement}</p><form onSubmit={addUpdate} className="space-y-2"><label className="block text-sm font-medium">Add an update<textarea required maxLength={5000} value={comment} onChange={event => setComment(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={saving || !comment.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Add Update'}</button></form><h3 className="font-medium">Updates</h3>{updatesLoading ? <p>Loading updates...</p> : updatesError ? <p role="alert">{updatesError}</p> : updates.map((update, index) => <div key={update.id || index} className="border-t pt-3"><p className="whitespace-pre-wrap text-sm">{update.description}</p><p className="text-xs text-gray-500">{update.actor?.name} {update.occurred_at ? new Date(update.occurred_at).toLocaleString() : ''}</p></div>)}</DialogContent></Dialog>
  </div>;
}
