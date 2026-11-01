import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tagService } from '../../../services/masterService';

export function TagMaster() {
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const result = await tagService.list();
      setTags(result.data.map(tag => ({ id: String(tag.id), name: tag.name })));
      setLoadError(false);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <div className="p-4 sm:p-8">
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Tags</h2>
      <p className="text-sm text-gray-600">Configure reusable product tags. Each product can have multiple tags.</p>
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5" onSubmit={async event => {
        event.preventDefault();
        if (busy || !name.trim()) return;
        setBusy(true);
        try {
          if (editingId) await tagService.update(editingId, { name: name.trim() });
          else await tagService.create({ name: name.trim() });
          setName(''); setEditingId(null);
          toast.success('Tag saved');
          await load();
        } catch (error: any) { toast.error(error?.errors?.name?.[0] || error?.message || 'Unable to save tag'); }
        finally { setBusy(false); }
      }}>
        <label className="min-w-52 flex-1 text-sm font-medium text-gray-700">Tag name
          <input required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)} className="mt-2 block w-full rounded-xl border px-3 py-2.5" />
        </label>
        <button disabled={busy || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-50">{busy ? 'Saving…' : editingId ? 'Save Tag' : 'Add Tag'}</button>
        {editingId && <button type="button" disabled={busy} onClick={() => { setEditingId(null); setName(''); }} className="rounded-xl border px-4 py-2.5">Cancel</button>}
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr><th className="p-4">Tag</th><th className="p-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={2} className="p-6">Loading tags…</td></tr> : loadError ? <tr><td colSpan={2} className="p-6">Unable to load tags. <button onClick={load} className="text-blue-600 underline">Retry</button></td></tr> : tags.length === 0 ? <tr><td colSpan={2} className="p-6 text-gray-500">No tags yet. Add your first tag above.</td></tr> : tags.map(tag => <tr key={tag.id}>
              <td className="p-4">{tag.name}</td>
              <td className="space-x-4 p-4 text-right">
                <button disabled={busy} className="text-blue-600" onClick={() => { setEditingId(tag.id); setName(tag.name); }}>Edit</button>
                <button disabled={busy} className="text-red-600" onClick={async () => {
                  if (!confirm(`Delete "${tag.name}"? This will also remove it from all products.`)) return;
                  setBusy(true);
                  try {
                    await tagService.remove(tag.id);
                    if (editingId === tag.id) { setEditingId(null); setName(''); }
                    toast.success('Tag deleted');
                    await load();
                  } catch { toast.error('Unable to delete tag'); }
                  finally { setBusy(false); }
                }}>Delete</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
