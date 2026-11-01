import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { dispatchService } from '../../../services/dispatchService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface HelpBookEntry {
  id: number;
  name: string;
  value: string;
}

interface DispatchHelpBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = { name: '', value: '' };

export const DispatchHelpBookDialog = ({ open, onOpenChange }: DispatchHelpBookDialogProps) => {
  const [entries, setEntries] = useState<HelpBookEntry[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    dispatchService.helpBook()
      .then((data) => {
        if (active) setEntries(data);
      })
      .catch(() => toast.error('Unable to load the Dispatch Help Book.'))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      entry.name.toLocaleLowerCase().includes(query)
      || entry.value.toLocaleLowerCase().includes(query));
  }, [entries, search]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const entry = await dispatchService.createHelpBookEntry({
        name: form.name.trim(),
        value: form.value.trim(),
      });
      setEntries((current) => [...current, entry].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setAdding(false);
      toast.success('Help Book entry added.');
    } catch (error: any) {
      toast.error(error?.errors?.name?.[0] || error?.errors?.value?.[0] || 'Unable to add the Help Book entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch('');
      setAdding(false);
      setForm(emptyForm);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Dispatch Help Book
          </DialogTitle>
          <DialogDescription>
            Store and quickly find useful dispatch information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 px-6 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search Help Book</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or value..."
                className="w-full rounded-xl border py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="button"
              onClick={() => setAdding((current) => !current)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>

          {adding && (
            <form onSubmit={submit} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Name *</span>
                  <input
                    required
                    maxLength={255}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="e.g. Preferred Transporter"
                    className="w-full rounded-lg border bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Value *</span>
                  <textarea
                    required
                    maxLength={5000}
                    rows={3}
                    value={form.value}
                    onChange={(event) => setForm({ ...form, value: event.target.value })}
                    placeholder="Enter the information to remember"
                    className="w-full resize-y rounded-lg border bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setAdding(false); setForm(emptyForm); }}
                  className="rounded-lg border bg-white px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Entry
                </button>
              </div>
            </form>
          )}

          <div className="min-h-0 overflow-auto rounded-xl border">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading Help Book...
              </div>
            ) : filteredEntries.length ? (
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="w-2/5 px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="align-top hover:bg-gray-50/70">
                      <td className="break-words px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                      <td className="whitespace-pre-wrap break-words px-4 py-3 text-gray-600">{entry.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-sm text-gray-500">
                {search ? 'No Help Book entries match your search.' : 'No Help Book entries yet. Add the first one.'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
