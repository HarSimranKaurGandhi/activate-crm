import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { influencerTypeService } from '../../../services/masterService';

export function InfluencerTypeMaster() {
  const [types, setTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setTypes((await influencerTypeService.list()).data); }
    catch { setError('Unable to load influencer types.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <div className="p-4 sm:p-8"><div className="mx-auto max-w-4xl space-y-6">
    <h2 className="text-2xl font-semibold">Influencer Types</h2>
    <p className="text-sm text-gray-600">Manage the types available when adding influencers. Removed types remain on existing influencer records.</p>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5" onSubmit={async event => {
      event.preventDefault();
      if (busy || !name.trim()) return;
      setBusy(true);
      try { await influencerTypeService.create({ name: name.trim() }); setName(''); toast.success('Influencer type added'); await load(); }
      catch (failure: any) { toast.error(failure.errors?.name?.[0] || failure.message || 'Unable to add type'); }
      finally { setBusy(false); }
    }}>
      <label className="min-w-52 flex-1 text-sm font-medium">Type name<input required maxLength={100} disabled={busy} value={name} onChange={event => setName(event.target.value)} className="mt-2 block w-full rounded-xl border px-3 py-2.5" /></label>
      <button disabled={busy || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-50">Add Type</button>
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-gray-50"><tr><th className="p-4">Influencer Type</th><th className="p-4 text-right">Actions</th></tr></thead>
      <tbody className="divide-y">{loading ? <tr><td colSpan={2} className="p-6">Loading…</td></tr> : error ? <tr><td colSpan={2} className="p-6">{error} <button onClick={() => void load()} className="text-blue-600 underline">Retry</button></td></tr> : types.length ? types.map(type => <tr key={type.id}>
        <td className="p-4">{type.name}</td><td className="p-4 text-right"><button disabled={busy} className="text-red-600 disabled:opacity-50" onClick={async () => {
          if (!confirm(`Remove "${type.name}" from available influencer types? Existing records will keep their type.`)) return;
          setBusy(true);
          try { await influencerTypeService.remove(String(type.id)); toast.success('Influencer type removed'); await load(); }
          catch (failure: any) { toast.error(failure.message || 'Unable to remove type'); }
          finally { setBusy(false); }
        }}>Remove</button></td>
      </tr>) : <tr><td colSpan={2} className="p-6 text-gray-500">No influencer types. Add one above.</td></tr>}</tbody>
    </table></div>
  </div></div>;
}
