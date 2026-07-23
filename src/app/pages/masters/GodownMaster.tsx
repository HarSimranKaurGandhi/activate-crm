import { useEffect, useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { godownService } from '../../../services/inventoryService';

export const GodownMaster = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', is_active: true });
  const load = async () => setItems(await godownService.list());
  useEffect(() => { void load(); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) await godownService.update(String(editing.id), form); else await godownService.create(form);
      toast.success(editing ? 'Godown updated' : 'Godown added');
      setOpen(false); setEditing(null); setForm({ name: '', address: '', is_active: true }); await load();
    } catch (error: any) { toast.error(error?.errors?.name?.[0] || 'Unable to save godown'); }
  };
  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Godown Master</h2>
      <button onClick={() => { setEditing(null); setForm({ name: '', address: '', is_active: true }); setOpen(true); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white"><Plus className="h-4 w-4"/>Add Godown</button></div>
    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Address</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
      <tbody className="divide-y">{items.map(item => <tr key={item.id}><td className="px-6 py-4 font-medium">{item.name}</td><td className="px-6 py-4 text-gray-600">{item.address || '-'}</td><td className="px-6 py-4">{item.is_active ? 'Active' : 'Inactive'}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => { setEditing(item); setForm({ name:item.name,address:item.address||'',is_active:item.is_active });setOpen(true); }} className="p-2 text-blue-600"><Edit className="h-4 w-4"/></button><button onClick={async()=>{if(confirm('Delete/deactivate this godown?')){await godownService.remove(String(item.id));await load();}}} className="p-2 text-red-600"><Trash2 className="h-4 w-4"/></button></div></td></tr>)}</tbody></table></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6"><h3 className="text-xl font-semibold">{editing?'Edit':'Add'} Godown</h3><div><label className="mb-2 block text-sm font-medium">Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border px-4 py-3"/></div><div><label className="mb-2 block text-sm font-medium">Address</label><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full rounded-xl border px-4 py-3"/></div><label className="flex gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>Active</label><div className="flex justify-end gap-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border px-5 py-2.5">Cancel</button><button className="rounded-xl bg-blue-600 px-5 py-2.5 text-white">Save</button></div></form></div>}
  </div></div>;
};
