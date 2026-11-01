import { useState } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export function ExecutedQuotationActions({ quotation, onUpdated, disabled }: { quotation: any; onUpdated: (quote: any) => void; disabled: boolean }) {
  const { completeQuotationCrm } = useData();
  const [open, setOpen] = useState(false);
  const [closeLead, setCloseLead] = useState(false);
  const [addProducts, setAddProducts] = useState(false);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const canClose = Boolean(quotation.leadId) && quotation.linkedLeadStatus !== 'closed_success';
  const canAdd = !quotation.crmPurchaseDate;
  const show = (action: 'close' | 'products') => {
    setCloseLead(action === 'close'); setAddProducts(action === 'products'); setDate(today); setError(''); setOpen(true);
  };
  return <>
    {quotation.leadId && <button disabled={disabled || saving || !canClose} onClick={() => show('close')} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-white disabled:opacity-50">{canClose ? 'Mark Lead Closed Success' : 'Lead Closed Success'}</button>}
    <button disabled={disabled || saving || !canAdd} onClick={() => show('products')} className="rounded-xl bg-blue-600 px-5 py-2.5 text-white disabled:opacity-50">{canAdd ? 'Add Products to CRM' : `Products Added · ${quotation.crmPurchaseDate}`}</button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Update CRM for Executed Order</DialogTitle><DialogDescription>Choose the actions to perform for this quotation.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); if (saving || (!closeLead && !addProducts)) return;
          setSaving(true); setError('');
          try {
            const result = await completeQuotationCrm(quotation.id, { close_lead: closeLead, add_products: addProducts, ...(addProducts ? { purchase_date: date } : {}) });
            onUpdated(result); setOpen(false); toast.success('CRM updated successfully');
          } catch (err: any) { setError(Object.values(err.errors || {}).flat().join(' ') || err.message || 'Unable to update CRM'); }
          finally { setSaving(false); }
        }}>
          {canClose && <label className="flex items-center gap-2"><input type="checkbox" checked={closeLead} disabled={saving} onChange={event => setCloseLead(event.target.checked)} />Mark linked lead as Closed Success</label>}
          {!quotation.leadId && <p className="text-sm text-gray-500">This quotation has no linked lead.</p>}
          {canAdd && <label className="flex items-center gap-2"><input type="checkbox" checked={addProducts} disabled={saving} onChange={event => setAddProducts(event.target.checked)} />Add all order products to customer's Products Owned</label>}
          {addProducts && <div><label htmlFor="order-purchase-date" className="block text-sm font-medium">Purchase Date *</label><input id="order-purchase-date" type="date" required max={today} value={date} disabled={saving} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /><p className="mt-2 text-sm text-gray-500">The order quantities will be added using this purchase date. A customer record will be created from the lead if needed.</p></div>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" disabled={saving || (!closeLead && !addProducts)} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
