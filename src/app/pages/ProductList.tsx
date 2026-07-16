import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, ImageIcon, Filter, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { toast } from 'sonner';
import { productService, type PaginationMeta } from '../../services/productService';
import { PaginationControls } from '../components/common/Pagination';
import { SortableHeader, type SortDirection } from '../components/common/SortableHeader';
import { mapProduct } from '../../services/mappers';

const emptyPagination: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

const sortMap = {
  name: 'product_name',
  category: 'category',
  brand: 'brand',
  mrp: 'mrp',
  usualSellingPrice: 'usual_selling_price',
  leastSellingPrice: 'least_selling_price',
  gstPercent: 'gst_percent',
} as const;

export const ProductList = () => {
  const navigate = useNavigate();
  const { categories, brands, deleteProduct, loading, refreshAll } = useData();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [productLoading, setProductLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    brand: 'all',
    gst: 'all',
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<{ key: keyof typeof sortMap; direction: SortDirection }>({
    key: 'name',
    direction: 'asc',
  });
  const [bulkUploading, setBulkUploading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  const fetchProducts = useCallback(async (page: number, perPage: number) => {
    setProductLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        per_page: perPage,
        sort_by: sortMap[sort.key],
        sort_direction: sort.direction,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.category !== 'all') params.category_id = filters.category;
      if (filters.brand !== 'all') params.brand_id = filters.brand;
      if (filters.gst !== 'all') params.gst_percent = filters.gst;

      const result = await productService.list(params);
      setProducts((Array.isArray(result.data) ? result.data : []).map(mapProduct));
      setPagination({
        ...emptyPagination,
        ...(result.meta?.pagination || {}),
      });
    } finally {
      setProductLoading(false);
    }
  }, [debouncedSearch, filters.brand, filters.category, filters.gst, sort.direction, sort.key]);

  useEffect(() => {
    fetchProducts(1, pagination.per_page);
  }, [debouncedSearch, filters.category, filters.brand, filters.gst, sort, fetchProducts, pagination.per_page]);

  const gstOptions = useMemo(() => {
    return Array.from(new Set(categories.map((category) => Number(category.gstPercent)).filter((value) => !Number.isNaN(value))))
      .sort((a, b) => a - b);
  }, [categories]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      brand: 'all',
      gst: 'all',
    });
  };

  const activeFilterCount = [
    filters.search.trim() ? 1 : 0,
    filters.category !== 'all' ? 1 : 0,
    filters.brand !== 'all' ? 1 : 0,
    filters.gst !== 'all' ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const toggleSort = (key: typeof sort.key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleBulkUpload = async (file: File | null) => {
    if (!file) return;

    setBulkUploading(true);
    try {
      const result = await productService.bulkUpload(file);
      await Promise.all([refreshAll(), fetchProducts(1, pagination.per_page)]);
      toast.success(`Bulk upload complete: ${result.created} created, ${result.updated} updated`);
    } catch (error: any) {
      toast.error(error.message || 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleSampleDownload = async () => {
    try {
      const blob = await productService.downloadSample();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product_bulk_upload_sample.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || 'Sample download failed');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    toast.success('Product deleted');
    await fetchProducts(products.length === 1 ? Math.max(1, pagination.current_page - 1) : pagination.current_page, pagination.per_page);
  };

  const isLoading = loading || productLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Products</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handleSampleDownload}
              className="px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              Download Sample
            </button>
            <label className="px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all cursor-pointer">
              {bulkUploading ? 'Uploading...' : 'Bulk Upload / Update'}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleBulkUpload(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <button
              onClick={() => navigate('/products/new')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
            <button
              type="button"
              onClick={() => setShowMobileFilters((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className={`${showMobileFilters ? 'grid' : 'hidden'} mb-4 grid-cols-1 gap-3 xl:hidden`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, model, HSN..."
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={filters.brand}
              onChange={(event) => updateFilter('brand', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={filters.gst}
                onChange={(event) => updateFilter('gst', event.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All GST</option>
                {gstOptions.map((gst) => (
                  <option key={gst} value={gst}>{gst}%</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4 hidden grid-cols-1 gap-3 md:grid-cols-3 xl:grid xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, model, HSN..."
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={filters.brand}
              onChange={(event) => updateFilter('brand', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={filters.gst}
                onChange={(event) => updateFilter('gst', event.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All GST</option>
                {gstOptions.map((gst) => (
                  <option key={gst} value={gst}>{gst}%</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[1040px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Product" sortKey="name" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Category" sortKey="category" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Brand" sortKey="brand" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="MRP" sortKey="mrp" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} align="right" /></th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Selling" sortKey="usualSellingPrice" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} align="right" /></th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Least" sortKey="leastSellingPrice" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} align="right" /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="GST / HSN" sortKey="gstPercent" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt="" className="h-12 w-12 rounded-lg border border-gray-200 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.modelNumber || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{product.category || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{product.brand || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">₹{product.mrp.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">₹{product.usualSellingPrice.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-medium text-amber-600">₹{product.leastSellingPrice.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.gstPercent}%</div>
                      <div className="text-sm text-gray-500">{product.hsnCode || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this product permanently?')) {
                              await handleDelete(product.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={pagination.current_page}
              pageSize={pagination.per_page}
              totalItems={pagination.total}
              totalPages={pagination.last_page}
              onPageChange={(nextPage) => fetchProducts(nextPage, pagination.per_page)}
              onPageSizeChange={(nextPageSize) => fetchProducts(1, nextPageSize)}
            />
          </div>

          {isLoading && <LoadingState label="Loading products..." />}
          {!isLoading && products.length === 0 && (
            <EmptyState label="No products found. Add your first product to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
