import { defaultOemRequestTemplate, oemTemplateFields } from '../../utils/oemRequestTemplate';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { oemService, Oem } from '../../../services/oemService';

export function OemSettings() {
  const [rows, setRows] = useState<Oem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const blankDetails = { dealer_code: '', dealer_name: '', dealer_city: '', request_template: defaultOemRequestTemplate };
  const [details, setDetails] = useState(blankDetails);
  const [saving, setSaving] = useState(false);
  const load = () => {
    setLoading(true); setError('');
    oemService.list().then(setRows).catch(() => setError('Unable to load OEMs.')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const reset = () => { setEditing(undefined); setName(''); setEmail(''); setDetails(blankDetails); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const saved = await oemService.save({ name: name.trim(), email: email.trim(), ...details }, editing);
      setRows(current => [...current.filter(row => row.id !== saved.id), saved].sort((a,b) => a.name.localeCompare(b.name)));
      reset(); toast.success('OEM saved');
    } catch (error: any) { toast.error(error.message || 'Unable to save OEM'); }
    finally { setSaving(false); }
  };
  return <section className="rounded-2xl border bg-white p-6 space-y-4">
    <div><h3 className="text-lg font-semibold">OEMs</h3><p className="text-sm text-gray-500">Manage OEM contact details, dealer information and the format used when copying requests.</p></div>
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <label className="flex-1 text-sm">Name<input required maxLength={255} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      <label className="flex-1 text-sm">Email<input required type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      {(['dealer_code', 'dealer_name', 'dealer_city'] as const).map(key => <label key={key} className="min-w-48 flex-1 text-sm">{{dealer_code: 'Dealer code', dealer_name: 'Dealer name', dealer_city: 'Dealer city'}[key]}<input maxLength={255} value={details[key]} onChange={e => setDetails({...details, [key]: e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>)}
      <label className="w-full text-sm">OEM request format<textarea rows={18} maxLength={20000} value={details.request_template} onChange={e => setDetails({...details, request_template: e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2 font-mono" /></label>
      <p className="w-full text-xs text-gray-500">Use placeholders: {oemTemplateFields.map(key => '{{' + key + '}}').join(', ')}. Blank formats use the default.</p>
      <button type="button" onClick={() => setDetails({...details, request_template: defaultOemRequestTemplate})} className="text-sm text-blue-600">Reset to default format</button>
      <button disabled={saving || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save OEM' : 'Add OEM'}</button>
      {editing && <button type="button" disabled={saving} onClick={reset}>Cancel</button>}
    </form>
    {loading ? <p>Loading OEMs...</p> : error ? <p role="alert">{error} <button onClick={load}>Retry</button></p> : <div className="divide-y">{rows.map(row=><div key={row.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{row.name}</p><p className="text-sm text-gray-500">{row.email}</p></div><button disabled={saving} onClick={()=>{setEditing(row.id);setName(row.name);setEmail(row.email);setDetails({dealer_code: row.dealer_code || '', dealer_name: row.dealer_name || '', dealer_city: row.dealer_city || '', request_template: row.request_template || defaultOemRequestTemplate});}} className="text-blue-600">Edit</button></div>)}{!rows.length && <p>No OEMs added yet.</p>}</div>}
  </section>;
}
