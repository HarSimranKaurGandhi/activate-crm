import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryService } from '../../services/inventoryService';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';

type ThresholdRow = {
  product_id: number; product_name: string; model_number: string | null;
  style: string; unit: string; stock_quantity: string | number; threshold_quantity: string | null;
};

function ThresholdEntry({ row }: { row: ThresholdRow }) {
  const [quantity, setQuantity] = useState(row.threshold_quantity ?? '');
  const [saved, setSaved] = useState(row.threshold_quantity ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await inventoryService.saveThreshold(String(row.product_id), row.style, quantity === '' ? null : quantity);
      setSaved(quantity);
      toast.success(quantity === '' ? 'Threshold cleared' : 'Threshold saved');
    } catch (failure: any) {
      setError(failure?.errors?.quantity?.[0] || failure?.errors?.style?.[0] || 'Unable to save threshold. Please try again.');
    } finally { setSaving(false); }
  };
  return (
    <tr className="border-t">
      <td className="px-5 py-4"><div className="font-medium">{row.product_name}</div><div className="text-xs text-gray-500">{row.model_number || '-'}</div></td>
      <td className="px-5 py-4">{row.style || 'No style'}</td>
      <td className="px-5 py-4 text-right">{Number(row.stock_quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })} <span className="text-xs text-gray-500">{row.unit}</span></td>
      <td className="px-5 py-4">
        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="flex items-center gap-2">
          <input type="number" min="0" max="99999999999.999" step="0.001" value={quantity} disabled={saving}
            onChange={(event) => setQuantity(event.target.value)} placeholder="Not set"
            aria-label={`Threshold for ${row.product_name}${row.style ? `, ${row.style}` : ''}`}
            className="w-36 rounded-lg border border-gray-200 px-3 py-2" />
          <button type="submit" disabled={saving || quantity === saved} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </form>
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export function InventoryThresholds() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<ThresholdRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      inventoryService.thresholds({ search: search.trim(), page, per_page: pageSize })
        .then((result) => { if (!cancelled) { setRows(result.data || []); setMeta(result.meta?.pagination || { total: 0, last_page: 1 }); } })
        .catch(() => { if (!cancelled) setError('Unable to load inventory thresholds.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, page, pageSize, reload]);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link to="/inventory" className="inline-flex items-center gap-2 text-sm text-blue-600"><ArrowLeft className="h-4 w-4" />Back to Inventory</Link>
        <div><h2 className="text-2xl font-semibold">Inventory Thresholds</h2><p className="mt-1 text-sm text-gray-500">Set a threshold for each item and style across all godowns. Leave the quantity blank and save to clear a threshold.</p></div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="relative border-b p-5"><Search className="absolute left-8 top-8 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search product, model number, or style" aria-label="Search inventory thresholds" className="w-full rounded-xl border py-2 pl-10 pr-3" /></div>
          {loading ? <LoadingState label="Loading thresholds..." /> : error ? <div role="alert" className="p-6 text-red-600">{error} <button onClick={() => setReload((value) => value + 1)} className="underline">Retry</button></div> : <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50"><tr><th className="px-5 py-3 text-left">Item</th><th className="px-5 py-3 text-left">Style</th><th className="px-5 py-3 text-right">Current Stock</th><th className="px-5 py-3 text-left">Threshold Quantity</th></tr></thead>
              <tbody>{rows.map((row) => <ThresholdEntry key={`${row.product_id}:${row.style}`} row={row} />)}{!rows.length && <tr><td colSpan={4} className="p-10 text-center text-gray-500">No inventory items found.</td></tr>}</tbody>
            </table>
          </div>}
          <PaginationControls page={page} pageSize={pageSize} totalItems={meta.total} totalPages={meta.last_page} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      </div>
    </div>
  );
}
