import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { billingService, type InvoicePayload, type TaxMode } from '../../services/billingService';
import { LoadingState } from '../components/common/AsyncState';
import { TaxInvoiceDocument, invoiceMoney } from '../components/billing/TaxInvoiceDocument';

const localToday = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const TaxInvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(localToday);
  const [dueDate, setDueDate] = useState('');
  const [taxMode, setTaxMode] = useState<TaxMode | ''>('');
  const [place, setPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [hsnCodes, setHsnCodes] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [reviewedPayload, setReviewedPayload] = useState<InvoicePayload | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    billingService.source(id!).then(result => {
      if (!active) return;
      setSource(result); setTaxMode(result.suggested_tax_mode || ''); setPlace(result.customer.state || '');
    }).catch((err: any) => {
      if (active) setLoadError(Object.values(err?.errors || {}).flat().join(' ') || 'Unable to load this dispatch for billing.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const review = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!source || !taxMode) return;
    const payload: InvoicePayload = {
      dispatch_id: source.dispatch_id, source_token: source.source_token,
      invoice_date: invoiceDate, due_date: dueDate || null, tax_mode: taxMode,
      place_of_supply: place.trim(), notes: notes.trim(),
      hsn_codes: source.items.filter((item: any) => !item.hsn_code).map((item: any) => ({ dispatch_item_id: item.dispatch_item_id, hsn_code: (hsnCodes[item.dispatch_item_id] || '').trim() })),
    };
    setSaving(true); setError('');
    try { setPreview(await billingService.preview(payload)); setReviewedPayload(payload); }
    catch (err: any) { setError(Object.values(err?.errors || {}).flat().join(' ') || 'Unable to prepare the invoice preview.'); }
    finally { setSaving(false); }
  };

  const issue = async () => {
    if (!reviewedPayload || saving) return;
    setSaving(true); setError('');
    try {
      const invoice = await billingService.create(reviewedPayload);
      toast.success(`Tax invoice ${invoice.invoice_number} created`);
      navigate(`/billing/invoices/${invoice.id}`, { replace: true });
    } catch (err: any) { setError(Object.values(err?.errors || {}).flat().join(' ') || 'Unable to create the tax invoice.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8"><LoadingState label="Loading dispatch billing details..."/></div>;
  const inputClass = 'mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm';
  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><button aria-label="Back to billing" onClick={() => navigate('/billing')} className="rounded-lg border bg-white p-2"><ArrowLeft className="h-5 w-5"/></button><div><h1 className="text-2xl font-semibold">Convert to Tax Invoice</h1><p className="text-sm text-slate-500">{source?.dispatch_number} {preview ? '• Review invoice' : '• Invoice details'}</p></div></div>{preview && <div className="flex gap-2"><button disabled={saving} onClick={() => { setPreview(null); setReviewedPayload(null); }} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium">Edit Details</button><button disabled={saving} onClick={() => void issue()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Check className="h-4 w-4"/>{saving ? 'Creating...' : 'Create Tax Invoice'}</button></div>}</header>
    {(loadError || error) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError || error}</div>}
    {preview ? <><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Review the invoice below. Creating it assigns an invoice number and marks the dispatch as invoiced.</p><TaxInvoiceDocument invoice={preview}/></> : source && <form onSubmit={review} className="space-y-5">
      <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold">{source.customer.company_name || source.customer.primary_name}</h2><p className="mt-1 text-sm text-slate-500">GSTIN: {source.customer.gst_number || 'Unregistered'}</p></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Invoice Date *<input required type="date" min={source.dispatch_date} max={localToday()} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputClass}/></label>
        <label className="text-sm font-medium">Due Date<input type="date" min={invoiceDate} value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass}/></label>
        <label className="text-sm font-medium">Place of Supply (State) *<input required maxLength={100} value={place} onChange={e => setPlace(e.target.value)} placeholder="State name / code" className={inputClass}/></label>
        <label className="text-sm font-medium">GST Type *<select required disabled={!!source.suggested_tax_mode} value={taxMode} onChange={e => setTaxMode(e.target.value as TaxMode)} className={inputClass}><option value="">Select GST type</option><option value="igst">IGST</option><option value="cgst_sgst">CGST + SGST</option><option value="cgst_utgst">CGST + UTGST</option></select></label>
      </div><p className="mt-3 text-xs text-slate-500">GST type follows the customer state. If the state is missing, select the GST type manually.</p></section>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Items from Dispatch Slip</h2><p className="mt-1 text-sm text-slate-500">Quantities, prices and GST rates come from the dispatch slip. Enter HSN/SAC wherever it is missing.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Product / Requirement', 'HSN/SAC', 'Quantity', 'Net Unit Price', 'GST'].map(label => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{source.items.map((item: any) => <tr key={item.dispatch_item_id}><td className="max-w-sm px-5 py-4"><p className="font-medium">{item.description}</p><p className="text-xs text-slate-500">{item.model_number}</p></td><td className="px-5 py-4">{item.hsn_code || <input required aria-label={`HSN/SAC for ${item.description}`} inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} value={hsnCodes[item.dispatch_item_id] || ''} onChange={e => setHsnCodes(current => ({ ...current, [item.dispatch_item_id]: e.target.value }))} className="w-32 rounded-lg border px-3 py-2" placeholder="HSN/SAC"/>}</td><td className="px-5 py-4">{item.quantity} {item.unit}</td><td className="px-5 py-4">₹{invoiceMoney(item.discounted_price)}</td><td className="px-5 py-4">{item.gst_percent}%</td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border bg-white p-5"><label className="text-sm font-medium">Invoice Notes<textarea rows={3} maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Payment terms or additional information (optional)"/></label></section>
      <div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"><Eye className="h-4 w-4"/>{saving ? 'Preparing...' : 'Preview Tax Invoice'}</button></div>
    </form>}
  </div></div>;
};
