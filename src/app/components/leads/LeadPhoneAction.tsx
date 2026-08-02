import { useState } from 'react';
import { Eye, LoaderCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../../services/leadService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const whatsappHref = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const internationalNumber = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${internationalNumber}`;
};

const WhatsAppIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
    <path d="M16.04 3A12.86 12.86 0 0 0 5.08 22.62L3 29l6.58-2.03A12.93 12.93 0 1 0 16.04 3Zm0 23.65c-2.12 0-4.2-.57-6-1.65l-.43-.26-3.9 1.2 1.24-3.78-.28-.44a10.57 10.57 0 1 1 9.37 4.93Zm5.8-7.92c-.32-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.58a9.55 9.55 0 0 1-1.77-2.2c-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.31.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.4-.29.32-1.11 1.08-1.11 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.2 1.99.12.61-.09 1.87-.77 2.14-1.5.26-.74.26-1.37.18-1.5-.08-.14-.29-.22-.61-.38Z" />
  </svg>
);

interface LeadPhoneActionProps {
  leadId: string;
  phone?: string;
  followUpDate?: string;
  onActivitySaved?: (activity: any) => void;
  onFollowUpDateChanged?: (date: string) => void;
}

export const LeadPhoneAction = ({ leadId, phone, followUpDate, onActivitySaved, onFollowUpDateChanged }: LeadPhoneActionProps) => {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activityId, setActivityId] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(followUpDate || '');
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
      setConnected(null);
      setNotes('');
      setNextFollowUpDate(followUpDate || '');
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
      const activity = await leadService.resolveCall(leadId, activityId, connected, notes.trim(), nextFollowUpDate);
      onActivitySaved?.(activity);
      if (activity.follow_up_date) {
        onFollowUpDateChanged?.(activity.follow_up_date);
      }
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
        <a href={phoneHref(phone)} onClick={(event) => event.stopPropagation()}
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
          <a
            href={whatsappHref(phone)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="absolute right-12 top-4 inline-flex h-6 w-6 items-center justify-center text-emerald-600 transition-colors hover:text-emerald-700"
            title={`Message ${phone} on WhatsApp`}
            aria-label={`Message ${phone} on WhatsApp`}
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <DialogHeader>
            <DialogTitle className="space-y-2">
              <a
                href={phoneHref(phone)}
                onClick={(event) => event.stopPropagation()}
                className="flex w-fit items-center gap-2 text-lg font-semibold text-blue-600 hover:underline"
                title={`Call ${phone}`}
              >
                <Phone className="h-5 w-5" /> {phone}
              </a>
              <span className="block text-lg font-semibold text-gray-900">Was the call connected?</span>
            </DialogTitle>
          </DialogHeader>
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
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Follow Up Date</label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(event) => setNextFollowUpDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
