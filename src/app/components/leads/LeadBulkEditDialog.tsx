import { useEffect, useState } from 'react';
import { LoaderCircle, UsersRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'new', label: 'New (Requirement Confirmed)' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];
const CLOSED_LEAD_STATUSES = ['closed_success', 'closed_fail'];

const localToday = () => {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

export interface LeadBulkUpdates {
  status?: string;
  assigned_to?: number;
  follow_up_date?: string;
}

interface LeadBulkEditDialogProps {
  open: boolean;
  selectedCount: number;
  users: any[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (updates: LeadBulkUpdates) => void | Promise<void>;
}

export const LeadBulkEditDialog = ({
  open,
  selectedCount,
  users,
  saving,
  onOpenChange,
  onSubmit,
}: LeadBulkEditDialogProps) => {
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus('');
    setAssignedTo('');
    setFollowUpDate('');
  }, [open]);

  const hasChanges = Boolean(status || assignedTo || followUpDate);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges || saving) return;

    const updates: LeadBulkUpdates = {};
    if (status) updates.status = status;
    if (assignedTo) updates.assigned_to = Number(assignedTo);
    if (followUpDate) updates.follow_up_date = followUpDate;
    void onSubmit(updates);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Bulk Edit Leads</DialogTitle>
              <DialogDescription className="mt-1">
                Update {selectedCount} selected lead{selectedCount === 1 ? '' : 's'}. Blank fields will remain unchanged.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(event) => {
                const nextStatus = event.target.value;
                setStatus(nextStatus);
                if (CLOSED_LEAD_STATUSES.includes(nextStatus)) {
                  setFollowUpDate(localToday());
                }
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Leave unchanged</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Assigned User</label>
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Leave unchanged</option>
              {users.map((user) => (
                <option key={user.id} value={String(user.id)}>{user.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {CLOSED_LEAD_STATUSES.includes(status) ? 'Closure Date' : 'Follow-Up Date'}
            </label>
            <input
              type="date"
              min={localToday()}
              disabled={CLOSED_LEAD_STATUSES.includes(status)}
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
            />
            {CLOSED_LEAD_STATUSES.includes(status) && (
              <p className="mt-1 text-xs text-gray-500">Automatically set to today for the selected leads.</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Updating...' : 'Update Selected Leads'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
