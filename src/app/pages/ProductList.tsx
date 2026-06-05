import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, Power, ImageIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { toast } from 'sonner';
import { productService } from '../../services/productService';
import { PaginationControls, usePagination } from '../components/common/Pagination';

export const ProductList = () => {
  const navigate = useNavigate();
  const { products, categories, brands, deleteProduct, loading, refreshAll } = useData();
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    brand: 'all',
    status: 'all',
    gst: 'all',
  });
  const [bulkUploading, setBulkUploading] = useState(false);

  const filteredProducts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch = !search || [
        product.name,
        product.modelNumber,
        product.category,
        product.brand,
        product.hsnCode,
      ].some((value) => String(value || '').toLowerCase().includes(search));
      const matchesCategory = filters.category === 'all' || product.category === filters.category;
      const matchesBrand = filters.brand === 'all' || product.brand === filters.brand;
      const matchesStatus = filters.status === 'all' || product.status === filters.status;
      const matchesGst = filters.gst === 'all' || Number(product.gstPercent) === Number(filters.gst);

      return matchesSearch && matchesCategory && matchesBrand && matchesStatus && matchesGst;
    });
  }, [filters, products]);

  const pagination = usePagination(filteredProducts, 10);

  const gstOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => Number(product.gstPercent)).filter((value) => !Number.isNaN(value))))
      .sort((a, b) => a - b);
  }, [products]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      brand: 'all',
      status: 'all',
      gst: 'all',
    });
  };

  const handleBulkUpload = async (file: File | null) => {
    if (!file) return;

    setBulkUploading(true);
    try {
      const result = await productService.bulkUpload(file);
      await refreshAll();
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
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            <select
              value={filters.brand}
              onChange={(event) => updateFilter('brand', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.name}>{brand.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Brand</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">MRP</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Selling</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Least</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">GST / HSN</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagination.pageItems.map((product) => (
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
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <Power className="h-3 w-3" />
                        {product.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
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
                            if (confirm('Deactivate this product?')) {
                              await deleteProduct(product.id);
                              toast.success('Product deactivated');
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
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
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>

          {loading && <LoadingState label="Loading products..." />}
          {!loading && filteredProducts.length === 0 && (
            <EmptyState label="No products found. Add your first product to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
