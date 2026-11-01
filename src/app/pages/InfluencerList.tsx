import { influencerTypeService } from '../../services/masterService';
import { InfluencerLoginDialog } from '../components/leads/InfluencerLoginDialog';
import { Edit, Plus, Power, Search, UserRoundSearch, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { influencerService } from '../../services/influencerService';
import { userService } from '../../services/userService';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const emptyForm = {
  name: '',
  influencerType: '',
  phone: '',
  email: '',
  companyName: '',
  city: '',
  notes: '',
  assignedTo: '',
  isActive: true,
};

export const InfluencerList = () => {
  const { user } = useAuth();
  const [loginInfluencer, setLoginInfluencer] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState(emptyForm);
  const [types, setTypes] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState(false);
  const [typeAttempt, setTypeAttempt] = useState(0);
  const [existingType, setExistingType] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    setTypesLoading(true); setTypesError(false);
    influencerTypeService.list().then(result => { if (!cancelled) setTypes(result.data); })
      .catch(() => { if (!cancelled) setTypesError(true); })
      .finally(() => { if (!cancelled) setTypesLoading(false); });
    return () => { cancelled = true; };
  }, [dialogOpen, typeAttempt]);

  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();
  const permission = Array.isArray(user?.module_permissions)
    ? user.module_permissions.find((item: any) => typeof item === 'string' ? item === 'influencers' : item?.module === 'influencers')
    : null;
  const canEdit = role === 'admin' || !Array.isArray(user?.module_permissions)
    || (typeof permission === 'string' ? true : Boolean(permission?.can_edit));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await influencerService.list({
        page,
        per_page: pageSize,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(assignedTo ? { assigned_to: Number(assignedTo) } : {}),
      });
      setRows(result.data || []);
      const pagination = result.meta?.pagination;
      setTotalItems(Number(pagination?.total || 0));
      setTotalPages(Math.max(1, Number(pagination?.last_page || 1)));
    } finally {
      setLoading(false);
    }
  }, [assignedTo, page, pageSize, search]);

  useEffect(() => {
    userService.salesDepartmentDropdown()
      .then((result) => setSalesUsers(Array.isArray(result) ? result : []))
      .catch(() => setSalesUsers([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setExistingType(null);
    setErrors({});
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (influencer: any) => {
    setEditingId(String(influencer.id));
    setExistingType(influencer.influencer_type ? { code: influencer.influencer_type, name: influencer.influencer_type_name || influencer.influencer_type } : null);
    setErrors({});
    setFormData({
      name: influencer.name || '',
      influencerType: influencer.influencer_type || '',
      phone: influencer.phone || '',
      email: influencer.email || '',
      companyName: influencer.company_name || '',
      city: influencer.city || '',
      notes: influencer.notes || '',
      assignedTo: influencer.assigned_to ? String(influencer.assigned_to) : '',
      isActive: Boolean(influencer.is_active),
    });
    setDialogOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (typesLoading || typesError) { toast.error('Please load influencer types before saving.'); return; }
    setSaving(true);
    setErrors({});
    const payload = {
      name: formData.name,
      influencer_type: formData.influencerType,
      phone: formData.phone || null,
      email: formData.email || null,
      company_name: formData.companyName || null,
      city: formData.city || null,
      notes: formData.notes || null,
      assigned_to: formData.assignedTo ? Number(formData.assignedTo) : null,
      is_active: formData.isActive,
    };

    try {
      if (editingId) {
        await influencerService.update(editingId, payload);
        toast.success('Influencer updated successfully');
      } else {
        await influencerService.create(payload);
        toast.success('Influencer added successfully');
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      setErrors(error?.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (influencer: any) => {
    try {
      await influencerService.status(String(influencer.id), !influencer.is_active);
      toast.success(`Influencer ${influencer.is_active ? 'deactivated' : 'activated'} successfully`);
      await load();
    } catch {
      // The API client displays the error.
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Influencers</h2>
            <p className="mt-1 text-sm text-gray-500">Manage influencers and their assigned sales users.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700">
              <Plus className="h-5 w-5" />
              Add Influencer
            </button>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid gap-3 border-b border-gray-200 p-4 sm:grid-cols-[1fr_280px] sm:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search name, phone, email, company or city"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && <button type="button" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}
            </div>
            <select value={assignedTo} onChange={(event) => { setAssignedTo(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All sales users</option>
              {salesUsers.map((salesUser) => <option key={salesUser.id} value={salesUser.id}>{salesUser.name}</option>)}
            </select>
          </div>

          {loading ? <LoadingState label="Loading influencers..." /> : rows.length === 0 ? <EmptyState label="No influencers found." /> : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {rows.map((influencer) => (
                  <article key={influencer.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{influencer.name}</div>
                        <div className="text-sm text-gray-500">{influencer.company_name || influencer.city || 'No company or city'}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${influencer.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{influencer.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">{influencer.phone || influencer.email || 'No contact details'}</div>
                    <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">Sales Department User: <strong>{influencer.assigned_user?.name || '-'}</strong></div>
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500"><span>{influencer.leads_count || 0} linked leads</span>{role === 'admin' && <button className="mr-2 text-blue-600" onClick={() => setLoginInfluencer(influencer)}>Login</button>}{canEdit&&<div className="flex gap-1"><button type="button" onClick={() => openEdit(influencer)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit className="h-4 w-4" /></button><button type="button" onClick={() => void toggleStatus(influencer)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><Power className="h-4 w-4" /></button></div>}</div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600"><tr><th className="px-5 py-3">Influencer</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Assigned User (Sales Department)</th><th className="px-5 py-3 text-center">Linked Leads</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map((influencer) => <tr key={influencer.id} className="hover:bg-gray-50"><td className="px-5 py-4"><div className="font-medium text-gray-900">{influencer.name}</div><div className="text-sm text-gray-500">{influencer.company_name || '-'}</div></td><td className="px-5 py-4 text-sm text-gray-700"><div>{influencer.phone || '-'}</div><div className="text-gray-500">{influencer.email || ''}</div></td><td className="px-5 py-4 text-gray-700">{influencer.city || '-'}</td><td className="px-5 py-4"><div className="font-medium text-gray-900">{influencer.assigned_user?.name || '-'}</div><div className="text-sm text-gray-500">{influencer.assigned_user?.designation || ''}</div></td><td className="px-5 py-4 text-center text-gray-700">{influencer.leads_count || 0}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${influencer.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{influencer.is_active ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1">{role === 'admin' && <button className="rounded-lg px-2 text-blue-600" onClick={() => setLoginInfluencer(influencer)}>Login</button>}{canEdit&&<><button type="button" onClick={() => openEdit(influencer)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit influencer"><Edit className="h-4 w-4" /></button><button type="button" onClick={() => void toggleStatus(influencer)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" title={influencer.is_active?'Deactivate influencer':'Activate influencer'}><Power className="h-4 w-4" /></button></>}</div></td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <PaginationControls page={page} pageSize={pageSize} totalItems={totalItems} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </section>
      </div>

      {loginInfluencer && <InfluencerLoginDialog key={loginInfluencer.id} influencer={loginInfluencer} onClose={() => setLoginInfluencer(null)} onSaved={() => void load()} />}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserRoundSearch className="h-5 w-5 text-blue-600" />{editingId ? 'Edit Influencer' : 'Add Influencer'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4 pt-2">
            <div><label className="mb-2 block text-sm font-medium">Name <span className="text-red-600">*</span></label><input required value={formData.name} onChange={(event)=>setFormData({...formData,name:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />{errors.name?.[0]&&<p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}</div>
            <div><label className="mb-2 block text-sm font-medium">Influencer Type <span className="text-red-600">*</span></label><select required disabled={typesLoading || typesError} value={formData.influencerType} onChange={(event)=>setFormData({...formData,influencerType:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">{typesLoading ? 'Loading types…' : 'Select influencer type'}</option>{existingType && !types.some(type => type.code === existingType.code) && <option value={existingType.code}>{existingType.name} (removed)</option>}{types.map(type => <option key={type.id} value={type.code}>{type.name}</option>)}</select>{typesError && <p className="mt-1 text-sm text-red-600">Unable to load types. <button type="button" onClick={() => setTypeAttempt(value => value + 1)} className="underline">Retry</button></p>}{!typesLoading && !typesError && types.length === 0 && <p className="mt-1 text-xs text-gray-500">Add types under Masters → Influencer Types.</p>}{errors.influencer_type?.[0]&&<p className="mt-1 text-sm text-red-600">{errors.influencer_type[0]}</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium">Phone</label><input value={formData.phone} onChange={(event)=>setFormData({...formData,phone:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />{errors.phone?.[0]&&<p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}</div><div><label className="mb-2 block text-sm font-medium">Email</label><input type="email" value={formData.email} onChange={(event)=>setFormData({...formData,email:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />{errors.email?.[0]&&<p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}</div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium">Company / Organisation</label><input value={formData.companyName} onChange={(event)=>setFormData({...formData,companyName:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="mb-2 block text-sm font-medium">City</label><input value={formData.city} onChange={(event)=>setFormData({...formData,city:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
            <div><label className="mb-2 block text-sm font-medium">Assigned User (Sales Department) <span className="text-red-600">*</span></label><select required value={formData.assignedTo} onChange={(event)=>setFormData({...formData,assignedTo:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Sales department user</option>{salesUsers.map((salesUser)=><option key={salesUser.id} value={salesUser.id}>{[salesUser.name,salesUser.designation].filter(Boolean).join(' - ')}</option>)}</select>{errors.assigned_to?.[0]&&<p className="mt-1 text-sm text-red-600">{errors.assigned_to[0]}</p>}</div>
            <div><label className="mb-2 block text-sm font-medium">Notes</label><textarea rows={4} value={formData.notes} onChange={(event)=>setFormData({...formData,notes:event.target.value})} className="w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={formData.isActive} onChange={(event)=>setFormData({...formData,isActive:event.target.checked})} className="h-4 w-4 rounded" />Active influencer</label>
            <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={()=>setDialogOpen(false)} className="rounded-xl border px-5 py-2.5">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">{saving?'Saving...':editingId?'Update Influencer':'Add Influencer'}</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
