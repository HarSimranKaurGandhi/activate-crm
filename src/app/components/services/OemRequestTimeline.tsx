import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sparePartRequestService } from '../../../services/sparePartRequestService';

export function OemRequestTimeline({ requestId, onCommentAdded }: { requestId: number; onCommentAdded?: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    sparePartRequestService.activity(requestId).then(result => { if (active) setEntries(result); })
      .catch(() => { if (active) setError('Unable to load timeline.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId, reload]);
  const display = (value: any) => value == null || value === '' ? '—' : String(value).replace(/_/g, ' ');
  return <section className="space-y-4 rounded-xl border bg-slate-50 p-4">
    <h3 className="font-semibold">Timeline & Comments</h3>
    <form className="space-y-2" onSubmit={async event => {
      event.preventDefault(); if (saving || !comment.trim()) return;
      setSaving(true);
      try { await sparePartRequestService.comment(requestId, comment.trim()); setComment(''); setReload(value => value + 1); onCommentAdded?.(); toast.success('Comment added'); }
      catch (err: any) { toast.error(err.errors?.comment?.[0] || err.message || 'Unable to add comment'); }
      finally { setSaving(false); }
    }}>
      <label className="block text-sm font-medium" htmlFor={`oem-comment-${requestId}`}>Add Comment</label>
      <textarea id={`oem-comment-${requestId}`} required maxLength={5000} rows={3} value={comment} disabled={saving} onChange={event => setComment(event.target.value)} className="w-full rounded-lg border bg-white p-3 text-sm" placeholder="Add an update to this OEM request…" />
      <button disabled={saving || !comment.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add Comment'}</button>
    </form>
    {loading ? <p className="text-sm text-slate-500">Loading timeline…</p> : error ? <p role="alert" className="text-sm text-red-600">{error} <button onClick={() => setReload(value => value + 1)} className="underline">Retry</button></p> : <ol className="space-y-4 border-l-2 border-blue-100 pl-4">{entries.map(entry => <li key={entry.id} className="rounded-lg border bg-white p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-1 text-xs text-slate-500"><span>{entry.actor?.name || 'System'} · {display(entry.action)}</span><time>{entry.occurred_at ? new Date(entry.occurred_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</time></div>
      <p className="mt-2 whitespace-pre-wrap break-words">{entry.description}</p>
      {entry.action === 'updated' && <dl className="mt-2 space-y-1 text-xs text-slate-500">{Object.entries(entry.new_values || {}).map(([key, value]) => <div key={key}><dt className="inline font-medium capitalize">{key.replace(/_/g, ' ')}: </dt><dd className="inline whitespace-pre-wrap break-words">{['image','video'].includes(key) ? `${key === 'image' ? 'Images' : 'Video'} updated` : `${display(entry.old_values?.[key])} → ${display(value)}`}</dd></div>)}</dl>}
    </li>)}</ol>}
  </section>;
}
