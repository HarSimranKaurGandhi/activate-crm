import { useState } from 'react';
import { Eye, LoaderCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../../services/leadService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface LeadPhoneActionProps {
  leadId: string;
  phone?: string;
  onActivitySaved?: (activity: any) => void;
}

export const LeadPhoneAction = ({ leadId, phone, onActivitySaved }: LeadPhoneActionProps) => {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activityId, setActivityId] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!phone) return <span className="text-gray-500">-</span>;

  const revealPhone = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (revealed) return;
    setLoading(true);
    try {
      const activity = await leadService.startCall(leadId);
      setActivityId(String(activity.id));
      setRevealed(true);
      setOpen(true);
      onActivitySaved?.(activity);
    } catch {
      toast.error('Unable to log the call attempt');
    } finally {
      setLoading(false);
    }
  };

  const saveOutcome = async () => {
    if (connected === null) {
      toast.error('Please select Connected or Not Connected');
      return;
    }
    if (connected && !notes.trim()) {
      toast.error('Discussion notes are required');
      return;
    }
    setSaving(true);
    try {
      const activity = await leadService.resolveCall(leadId, activityId, connected, notes.trim());
      onActivitySaved?.(activity);
      setOpen(false);
      toast.success('Call outcome saved');
    } catch {
      toast.error('Unable to save the call outcome');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {revealed ? (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
          <Phone className="h-3.5 w-3.5" />{phone}
        </a>
      ) : (
        <button type="button" onClick={revealPhone} disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline disabled:opacity-60">
          {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Show Phone Number
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()} className="sm:max-w-md">
          <DialogHeader><DialogTitle>Was the call connected?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConnected(true)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${connected === true ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                Connected
              </button>
              <button type="button" onClick={() => setConnected(false)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${connected === false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
                Not Connected
              </button>
            </div>
            {connected === true && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Discussion Notes *</label>
                <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={saveOutcome} disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
