import { useState } from 'react';
import { toast } from 'sonner';

export function BulkStockActions({ count, total, busy, onSelectAll, onSave }: {
  count: number; total: number; busy: boolean; onSelectAll: (selected: boolean) => void;
  onSave: (data: { stock_status?: string | null; stock_comment?: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState('');
  const [applyComment, setApplyComment] = useState(false);
  const [comment, setComment] = useState('');
  return <div className="mt-4 space-y-3 border-t border-blue-200 pt-3">
    <label className="flex items-center gap-2 font-medium">
      <input type="checkbox" checked={total > 0 && count === total} ref={input => { if (input) input.indeterminate = count > 0 && count < total; }} disabled={busy || !total} onChange={event => onSelectAll(event.target.checked)} />
      Select All <span className="font-normal">({count} of {total} selected)</span>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">Bulk status
        <select value={status} disabled={busy} onChange={event => setStatus(event.target.value)} className="block w-full rounded-lg border border-blue-200 bg-white p-2">
          <option value="">Keep current statuses</option>
          <option value="stock_ready">Stock Ready</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
        </select>
      </label>
      <div className="space-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={applyComment} disabled={busy} onChange={event => setApplyComment(event.target.checked)} />Apply common comment</label>
        {applyComment && <><textarea aria-label="Common stock comment" value={comment} maxLength={2000} disabled={busy} onChange={event => setComment(event.target.value)} rows={2} className="w-full rounded-lg border border-blue-200 bg-white p-2" /><p className="text-xs">Replaces comments on selected items. Leave blank to clear them.</p></>}
      </div>
    </div>
    <button type="button" disabled={busy || !count || (!status && !applyComment)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50" onClick={async () => {
      try {
        await onSave({ ...(status ? { stock_status: status } : {}), ...(applyComment ? { stock_comment: comment } : {}) });
        setStatus(''); setApplyComment(false); setComment('');
        toast.success('Selected items updated');
      } catch (error: any) { toast.error(error?.message || 'Unable to update selected items. Please try again.'); }
    }}>{busy ? 'Saving…' : 'Apply to Selected'}</button>
  </div>;
}
