import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function StockFields({ item, onSave, disabled = false }: { item: any; onSave: (itemId: string, data: { stock_status: string | null; stock_comment: string }) => Promise<void>; disabled?: boolean }) {
  const [status, setStatus] = useState(item.fulfillment?.stock_status || '');
  const [comment, setComment] = useState(item.fulfillment?.stock_comment || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setStatus(item.fulfillment?.stock_status || '');
    setComment(item.fulfillment?.stock_comment || '');
  }, [item.fulfillment?.stock_status, item.fulfillment?.stock_comment]);
  const dirty = status !== (item.fulfillment?.stock_status || '') || comment !== (item.fulfillment?.stock_comment || '');

  return <div className="min-w-44 space-y-2 text-left text-xs font-normal text-slate-700 print:hidden">
    <label className="block">Stock status
      <select aria-label={`Stock status for ${item.product.name}`} value={status} disabled={saving || disabled} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2">
        <option value="">Select status</option>
        <option value="stock_ready">Stock Ready</option>
        <option value="ordered">Ordered</option>
        <option value="received">Received</option>
        <option value="packed">Packed</option>
        <option value="dispatched">Dispatched</option>
      </select>
    </label>
    <label className="block">Stock comment
      <textarea aria-label={`Stock comment for ${item.product.name}`} value={comment} maxLength={2000} disabled={saving || disabled} onChange={(event) => setComment(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" />
    </label>
    <button type="button" disabled={saving || disabled || !dirty} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white disabled:opacity-50" onClick={async () => {
      setSaving(true);
      try {
        await onSave(item.id, { stock_status: status || null, stock_comment: comment });
        toast.success('Stock details saved');
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to save stock details. Please try again.');
      } finally {
        setSaving(false);
      }
    }}>{saving ? 'Saving…' : 'Save'}</button>
  </div>;
}
