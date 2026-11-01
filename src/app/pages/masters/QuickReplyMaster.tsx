import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { quickReplyService } from '../../../services/masterService';

export function QuickReplyMaster() {
  const [types, setTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setTypes((await quickReplyService.list()).data); }
    catch { setError('Unable to load quick replies.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <div className="p-4 sm:p-8"><div className="mx-auto max-w-4xl space-y-6">
    <h2 className="text-2xl font-semibold">Quick Replies</h2>
    <p className="text-sm text-gray-600">Manage suggested comments for connected lead calls. Existing saved comments stay unchanged.</p>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5" onSubmit={async event => {
      event.preventDefault();
      if (busy || !name.trim()) return;
      setBusy(true);
      try { if (editingId) await quickReplyService.update(String(editingId), { name: name.trim() }); else await quickReplyService.create({ name: name.trim() }); setEditingId(null); setName(''); toast.success('Quick reply saved'); await load(); }
      catch (failure: any) { toast.error(failure.errors?.name?.[0] || failure.message || 'Unable to add type'); }
      finally { setBusy(false); }
    }}>
      <label className="min-w-52 flex-1 text-sm font-medium">Reply text<input required maxLength={255} disabled={busy} value={name} onChange={event => setName(event.target.value)} className="mt-2 block w-full rounded-xl border px-3 py-2.5" /></label>
      <button disabled={busy || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-50">{editingId ? 'Save Reply' : 'Add Reply'}</button>
      {editingId && <button type="button" disabled={busy} onClick={() => { setEditingId(null); setName(''); }} className="rounded-xl border px-4 py-2.5">Cancel</button>}
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-gray-50"><tr><th className="p-4">Quick Reply</th><th className="p-4 text-right">Actions</th></tr></thead>
      <tbody className="divide-y">{loading ? <tr><td colSpan={2} className="p-6">Loading…</td></tr> : error ? <tr><td colSpan={2} className="p-6">{error} <button onClick={() => void load()} className="text-blue-600 underline">Retry</button></td></tr> : types.length ? types.map(type => <tr key={type.id}>
        <td className="p-4">{type.name}</td><td className="p-4 text-right"><button disabled={busy} onClick={() => { setEditingId(type.id); setName(type.name); }} className="mr-4 text-blue-600">Edit</button><button disabled={busy} className="text-red-600 disabled:opacity-50" onClick={async () => {
          if (!confirm(`Remove "${type.name}" from available quick replies? Existing saved comments will stay unchanged.`)) return;
          setBusy(true);
          try { await quickReplyService.remove(String(type.id)); if (editingId === type.id) { setEditingId(null); setName(''); } toast.success('Quick reply removed'); await load(); }
          catch (failure: any) { toast.error(failure.message || 'Unable to remove type'); }
          finally { setBusy(false); }
        }}>Remove</button></td>
      </tr>) : <tr><td colSpan={2} className="p-6 text-gray-500">No quick replies. Add one above.</td></tr>}</tbody>
    </table></div>
  </div></div>;
}
