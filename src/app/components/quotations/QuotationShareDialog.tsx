import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { quotationService } from '../../../services/quotationService';
import { userService } from '../../../services/userService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

export function QuotationShareDialog({ quotation, onClose }: {
  quotation: { id: string; number: string; createdBy: string };
  onClose: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([userService.dropdown(), quotationService.shares(quotation.id)])
      .then(([allUsers, shares]) => {
        if (cancelled) return;
        const eligible = allUsers.filter((user) => String(user.id) !== quotation.createdBy);
        setUsers(eligible);
        setSelected(shares.user_ids.map(Number));
      })
      .catch(() => { if (!cancelled) setError('Unable to load sharing settings. Close this dialog and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [quotation.id, quotation.createdBy]);

  const save = async () => {
    setSaving(true);
    try {
      await quotationService.share(quotation.id, selected);
      toast.success('Quotation sharing updated');
      onClose();
    } catch {
      toast.error('Unable to save sharing settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((user) =>
    (user.is_active || selected.includes(Number(user.id))) &&
    `${user.name} ${user.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share {quotation.number}</DialogTitle>
          <DialogDescription>Selected users can preview and edit this quotation from their quotation list. Uncheck a user to remove shared access.</DialogDescription>
        </DialogHeader>
        {loading ? <p className="py-6 text-sm text-gray-500">Loading users...</p> : error ? (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <input aria-label="Search users" placeholder="Search by name or email" value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {filtered.map((user) => (
                <label key={user.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <input type="checkbox" checked={selected.includes(Number(user.id))} disabled={saving}
                    onChange={(event) => setSelected((current) => event.target.checked
                      ? [...current, Number(user.id)] : current.filter((id) => id !== Number(user.id)))} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{user.name}{!user.is_active ? ' (Inactive)' : ''}</span>
                    <span className="block truncate text-xs text-gray-500">{user.email}</span>
                  </span>
                </label>
              ))}
              {filtered.length === 0 && <p className="py-4 text-sm text-gray-500">No users found.</p>}
            </div>
            <p className="text-xs text-gray-500">{selected.length} user{selected.length === 1 ? '' : 's'} selected. Existing owner and administrator access is unchanged.</p>
          </>
        )}
        <DialogFooter>
          <button disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Cancel</button>
          <button disabled={loading || saving || Boolean(error)} onClick={() => void save()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Save sharing'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
