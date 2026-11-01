import { Eye, Phone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { serviceRequestService } from '../../../services/serviceRequestService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface Props {
  serviceId: string;
  phone?: string;
}

const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const ServicePhoneAction = ({ serviceId, phone }: Props) => {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!phone) return <span className="text-slate-500">-</span>;

  const showNumber = (event: React.MouseEvent) => {
    event.stopPropagation();
    setRevealed(true);
    setOpen(true);
  };

  const save = async () => {
    const value = comment.trim();
    if (!value) { setOpen(false); return; }
    setSaving(true);
    try {
      await serviceRequestService.addComment(serviceId, value);
      setComment('');
      setOpen(false);
      toast.success('Comment added');
    } catch {
      toast.error('Unable to save comment');
    } finally {
      setSaving(false);
    }
  };

  return <>
    {revealed ? <button type="button" onClick={showNumber} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Phone className="h-3.5 w-3.5"/>{phone}</button> : <button type="button" onClick={showNumber} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"><Eye className="h-3.5 w-3.5"/>Show No.</button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent onClick={event=>event.stopPropagation()} className="sm:max-w-md"><DialogHeader><DialogTitle>Customer Phone Number</DialogTitle></DialogHeader><a href={phoneHref(phone)} onClick={event=>event.stopPropagation()} className="inline-flex w-fit items-center gap-2 text-lg font-semibold text-blue-600 hover:underline"><Phone className="h-5 w-5"/>{phone}</a><div><label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label><textarea rows={4} value={comment} onChange={event=>setComment(event.target.value)} placeholder="Add any notes about the call or customer..." className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div className="flex justify-end gap-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button type="button" onClick={()=>void save()} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving?'Saving...':comment.trim()?'Save Comment':'Done'}</button></div></DialogContent></Dialog>
  </>;
};
