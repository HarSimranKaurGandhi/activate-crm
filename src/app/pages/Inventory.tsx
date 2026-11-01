import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Filter,
  History,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { inventoryService } from '../../services/inventoryService';
import { brandService, categoryService } from '../../services/masterService';
import { PaginationControls } from '../components/common/Pagination';
import { LoadingState } from '../components/common/AsyncState';
import { dispatchService } from '../../services/dispatchService';

type FilterOption = {
  id: string | number;
  name: string;
};

type InventoryData = {
  godowns: FilterOption[];
  products: any[];
};

const emptyMeta = { total: 0, last_page: 1 };

export const Inventory = () => {
  const navigate = useNavigate();
  const [editingStyle, setEditingStyle] = useState<any>(null);
  const [style, setStyle] = useState('');
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleError, setStyleError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [godownId, setGodownId] = useState('all');
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [data, setData] = useState<InventoryData>({ godowns: [], products: [] });
  const [plannedDispatches, setPlannedDispatches] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<any>(emptyMeta);

  const load = useCallback(async (nextPage: number, nextSize: number) => {
    setLoading(true);

    try {
      const params: Record<string, unknown> = {
        page: nextPage,
        per_page: nextSize,
      };

      if (search.trim()) params.search = search.trim();
      if (categoryId !== 'all') params.category_id = categoryId;
      if (brandId !== 'all') params.brand_id = brandId;
      if (godownId !== 'all') params.godown_id = godownId;

      const result = await inventoryService.overview(params);
      setData({
        godowns: Array.isArray(result.data?.godowns) ? result.data.godowns : [],
        products: Array.isArray(result.data?.products) ? result.data.products : [],
      });
      setMeta({ ...emptyMeta, ...(result.meta?.pagination || {}) });
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [brandId, categoryId, godownId, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1, pageSize), 250);
    return () => window.clearTimeout(timer);
  }, [load, pageSize]);

  useEffect(() => {
    void Promise.all([
      categoryService.dropdown(),
      brandService.dropdown(),
    ]).then(([categoryOptions, brandOptions]) => {
      setCategories(Array.isArray(categoryOptions) ? categoryOptions : []);
      setBrands(Array.isArray(brandOptions) ? brandOptions : []);
    });

    void dispatchService.list({ status: 'invoiced', per_page: 100 })
      .then((result) => setPlannedDispatches(result.data || []));
  }, []);

  const saveStyle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStyle || styleSaving) return;
    setStyleSaving(true);
    setStyleError('');
    try {
      await inventoryService.updateStyle(String(editingStyle.id), editingStyle.style || '', style.trim());
      setEditingStyle(null);
      toast.success('Inventory style updated');
      await load(page, pageSize);
    } catch (error: any) {
      setStyleError(error?.errors?.style?.[0] || error?.errors?.current_style?.[0] || 'Unable to update inventory style. Please try again.');
    } finally {
      setStyleSaving(false);
    }
  };

  const activeFilterCount = [
    categoryId !== 'all',
    brandId !== 'all',
    godownId !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryId('all');
    setBrandId('all');
    setGodownId('all');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Inventory</h2>
            <p className="text-sm text-gray-500">Stock across all godowns</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/inventory/thresholds')} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-gray-700">Threshold Quantities</button>
            <button
              onClick={() => navigate('/inventory/log')}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-gray-700"
            >
              <History className="h-4 w-4" />
              Inventory Log
            </button>
            <button
              onClick={() => navigate('/inventory/movement/in')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-white"
            >
              <ArrowDownToLine className="h-4 w-4" />
              IN ITEMS
            </button>
            <button
              onClick={() => navigate('/inventory/movement/out')}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-white"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              OUT ITEMS
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center gap-2 border-b p-5">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold">Planned Dispatches</h3>
              <p className="text-sm text-gray-500">Invoiced dispatch slips waiting for stock out</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left">Dispatch Slip</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Planned Date</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plannedDispatches.map((dispatch) => (
                  <tr key={dispatch.id}>
                    <td className="px-5 py-4 font-medium">{dispatch.dispatch_number}</td>
                    <td className="px-5 py-4">{dispatch.customer?.company_name || dispatch.customer?.primary_name}</td>
                    <td className="px-5 py-4">{dispatch.planned_dispatch_date || '-'}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">INVOICED</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/inventory/movement/out?dispatch_id=${dispatch.id}`)}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        Stock Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!plannedDispatches.length && (
              <div className="p-8 text-center text-sm text-gray-500">No planned dispatches.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Inventory List</h3>
                <p className="text-sm text-gray-500">Search and filter available stock across godowns</p>
              </div>
              {(search.trim() || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); clearFilters(); }}
                  className="flex items-center gap-1 self-start text-sm font-medium text-gray-500 hover:text-gray-800 sm:self-auto"
                >
                  <X className="h-4 w-4" />
                  Clear search & filters
                </button>
              )}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search inventory by product, model number, or style"
                aria-label="Search inventory list"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4 text-blue-600" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium text-gray-600">
                <span>Product Category</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Product Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-600">
                <span>Brand</span>
                <select
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-600">
                <span>Godown</span>
                <select
                  value={godownId}
                  onChange={(event) => setGodownId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Godowns</option>
                  {data.godowns.map((godown) => (
                    <option key={godown.id} value={godown.id}>{godown.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <LoadingState label="Loading inventory..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs uppercase">Product</th>
                    <th className="px-5 py-4 text-left text-xs uppercase">Style</th>
                    <th className="px-5 py-4 text-left text-xs uppercase">Category</th>
                    <th className="px-5 py-4 text-left text-xs uppercase">Brand</th>
                    <th className="px-5 py-4 text-left text-xs uppercase">Measurement Unit</th>
                    <th className="px-5 py-4 text-left text-xs uppercase">Details</th>
                    <th className="px-5 py-4 text-right text-xs uppercase">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.products.map((product) => (
                    <tr key={product.stock_key || `${product.id}-${product.style || ''}`}>
                      <td className="px-5 py-4">
                        <div className="font-medium">{product.product_name}</div>
                        <div className="text-xs text-gray-500">{product.model_number || '-'}</div>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-700">
                        <div className="flex items-center gap-2">
                          <span>{product.style || '-'}</span>
                          <button type="button" title="Edit style" aria-label={`Edit style for ${product.product_name}`}
                            onClick={() => { setEditingStyle(product); setStyle(product.style || ''); setStyleError(''); }}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">{product.category || '-'}</td>
                      <td className="px-5 py-4">{product.brand || '-'}</td>
                      <td className="whitespace-nowrap px-5 py-4">{product.measurement_unit || '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {data.godowns
                            .filter((godown) => Number(product.quantities[String(godown.id)] || 0) > 0)
                            .map((godown) => (
                              <span key={godown.id} className="whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-700">
                                {godown.name} - {Number(product.quantities[String(godown.id)] || 0).toLocaleString('en-IN')}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {Number(product.total_quantity || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {!data.products.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                        No inventory matches the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalItems={meta.total || 0}
            totalPages={meta.last_page || 1}
            onPageChange={(nextPage) => void load(nextPage, pageSize)}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
      <Dialog open={Boolean(editingStyle)} onOpenChange={(open) => { if (!open && !styleSaving) setEditingStyle(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Style</DialogTitle>
            <DialogDescription>Update the style for {editingStyle?.product_name} across all godowns. Stock quantities stay the same. Previous inventory logs retain their original style.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStyle} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>Style</span>
              <input autoFocus value={style} maxLength={100} disabled={styleSaving}
                onChange={(event) => setStyle(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="Enter style" />
            </label>
            {styleError && <p role="alert" className="text-sm text-red-600">{styleError}</p>}
            <DialogFooter>
              <button type="button" disabled={styleSaving} onClick={() => setEditingStyle(null)} className="rounded-xl border px-4 py-2">Cancel</button>
              <button type="submit" disabled={styleSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{styleSaving ? 'Saving...' : 'Save Style'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
