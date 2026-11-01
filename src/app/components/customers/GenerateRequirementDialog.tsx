import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { userService } from '../../../services/userService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export function GenerateRequirementDialog({ customerId, open, onOpenChange, onGenerated }: {
  customerId: string; open: boolean; onOpenChange: (open: boolean) => void; onGenerated: () => void;
}) {
  const [requirement, setRequirement] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setRequirement(''); setAssignedTo(''); setError(''); setLoading(true); setUsers([]);
    userService.dropdown().then(result => { if (active) setUsers(result); })
      .catch(() => { if (active) setError('Unable to load users. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, customerId, retry]);

  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Generate Requirement</DialogTitle>
        <DialogDescription>Create a lead or reopen the customer's existing lead with New status.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (saving || loading || !requirement.trim() || !assignedTo) return;
        setSaving(true); setError('');
        try {
          await customerService.generateRequirement(customerId, requirement.trim(), assignedTo);
          toast.success('Requirement generated. Lead status is New.');
          onOpenChange(false); onGenerated();
        } catch (err: any) {
          setError(Object.values(err.errors || {}).flat().join(' ') || err.message || 'Unable to generate requirement');
        } finally { setSaving(false); }
      }}>
        <div><label htmlFor="customer-requirement" className="block text-sm font-medium">Requirement *</label>
          <textarea id="customer-requirement" required maxLength={10000} rows={4} value={requirement} disabled={saving}
            onChange={event => setRequirement(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></div>
        <div><label htmlFor="requirement-assignee" className="block text-sm font-medium">Assign To *</label>
          <select id="requirement-assignee" required value={assignedTo} disabled={loading || saving}
            onChange={event => setAssignedTo(event.target.value)} className="mt-1 w-full rounded-lg border p-3">
            <option value="">{loading ? 'Loading users...' : 'Select a user'}</option>
            {users.map(user => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
          </select></div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {!loading && !users.length && <button type="button" onClick={() => setRetry(value => value + 1)} className="text-sm text-blue-600">Reload users</button>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="rounded-lg border px-4 py-2">Cancel</button>
          <button type="submit" disabled={saving || loading || !assignedTo || !requirement.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Generating...' : 'Generate Lead'}</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
