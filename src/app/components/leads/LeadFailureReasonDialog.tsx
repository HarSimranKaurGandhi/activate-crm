import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export const LEAD_FAILURE_REASONS = [
  { value: 'lost_to_competitor', label: 'Lost to Competitor' },
  { value: 'no_enquiry_made', label: 'No Enquiry Made' },
  { value: 'lost_interest', label: 'Lost Interest' },
  { value: 'no_response', label: 'No Response' },
  { value: 'didnt_like_product', label: "Didn't Like the Product" },
  { value: 'product_not_available', label: 'Product Not Available' },
  { value: 'other', label: 'Other' },
];

export const leadFailureReasonLabel = (reason?: string, details?: string) =>
  reason === 'other'
    ? details || 'Other'
    : LEAD_FAILURE_REASONS.find((option) => option.value === reason)?.label || '';

interface Props {
  open: boolean;
  initialReason?: string;
  initialDetails?: string;
  onCancel: () => void;
  onConfirm: (reason: string, details: string) => void;
}

export const LeadFailureReasonDialog = ({ open, initialReason, initialDetails, onCancel, onConfirm }: Props) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (open) {
      setReason(initialReason || '');
      setDetails(initialDetails || '');
    }
  }, [initialDetails, initialReason, open]);

  const valid = Boolean(reason) && (reason !== 'other' || Boolean(details.trim()));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Why was this lead unsuccessful?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">Select the most appropriate reason before marking the lead as failed.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEAD_FAILURE_REASONS.map((option) => (
            <button key={option.value} type="button" onClick={() => setReason(option.value)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                reason === option.value
                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              {option.label}
            </button>
          ))}
        </div>
        {reason === 'other' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Custom Reason *</label>
            <textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)}
              placeholder="Enter the reason for failure"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" />
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" disabled={!valid} onClick={() => onConfirm(reason, details.trim())}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
            Confirm Failure
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
