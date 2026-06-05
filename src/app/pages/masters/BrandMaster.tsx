import { useData } from '../../context/DataContext';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/AsyncState';
import { PaginationControls, usePagination } from '../../components/common/Pagination';

export const BrandMaster = () => {
  const { brands, addBrand, updateBrand, deleteBrand, loading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    supplierName: '',
    description: '',
    logoPath: '',
    catalogPath: '',
    logoFile: null as File | null,
    catalogFile: null as File | null,
    status: 'active' as 'active' | 'inactive',
  });
  const pagination = usePagination(brands, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (editingId) {
        await updateBrand(editingId, formData);
        toast.success('Brand updated successfully');
      } else {
        await addBrand(formData);
        toast.success('Brand added successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        name: '',
        supplierName: '',
        description: '',
        logoPath: '',
        catalogPath: '',
        logoFile: null,
        catalogFile: null,
        status: 'active',
      });
    } catch (error: any) {
      setErrors(error.errors || {});
    }
  };

  const handleEdit = (brand: any) => {
    setErrors({});
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      supplierName: brand.supplierName || '',
      description: brand.description || '',
      logoPath: brand.logoPath || '',
      catalogPath: brand.catalogPath || '',
      logoFile: null,
      catalogFile: null,
      status: brand.status,
    });
    setShowModal(true);
  };

  const toggleStatus = async (brand: any) => {
    await updateBrand(brand.id, { ...brand, status: brand.status === 'active' ? 'inactive' : 'active' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Brand Master</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setErrors({});
              setFormData({
                name: '',
                supplierName: '',
                description: '',
                logoPath: '',
                catalogPath: '',
                logoFile: null,
                catalogFile: null,
                status: 'active',
              });
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto sm:px-6"
          >
            <Plus className="w-5 h-5" />
            Add Brand
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {pagination.pageItems.map((brand) => (
              <div key={brand.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    {brand.logoPath ? (
                      <img src={brand.logoPath} alt={brand.name} className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-gray-300 bg-gray-50" />
                    )}
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-gray-900">{brand.name}</div>
                      <div className="mt-1 break-words text-sm text-gray-500">{brand.supplierName || 'No supplier set'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleStatus(brand)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      brand.status === 'active'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {brand.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supplier</div>
                    <div className="mt-1 break-words font-medium text-slate-900">{brand.supplierName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Catalog</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {brand.catalogPath ? (
                        <a href={brand.catalogPath} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                          View Catalog
                        </a>
                      ) : (
                        'No catalog'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(brand)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Deactivate this brand?')) {
                        await deleteBrand(brand.id);
                        toast.success('Brand deactivated');
                      }
                    }}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[860px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Logo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Brand Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Catalog</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagination.pageItems.map(brand => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {brand.logoPath ? (
                      <img src={brand.logoPath} alt={brand.name} className="h-12 w-12 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-dashed border-gray-300 bg-gray-50" />
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{brand.name}</td>
                  <td className="px-6 py-4 text-gray-700">{brand.supplierName || '-'}</td>
                  <td className="px-6 py-4">
                    {brand.catalogPath ? (
                      <a href={brand.catalogPath} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        View Catalog
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">No catalog</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(brand)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        brand.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {brand.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Deactivate this brand?')) {
                            await deleteBrand(brand.id);
                            toast.success('Brand deactivated');
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <PaginationControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
          {loading && <LoadingState label="Loading brands..." />}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Brand' : 'Add Brand'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name?.[0] && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.supplier_name?.[0] && <p className="mt-1 text-sm text-red-600">{errors.supplier_name[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.description?.[0] && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, logoFile: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.brand_logo?.[0] && <p className="mt-1 text-sm text-red-600">{errors.brand_logo[0]}</p>}
                  {(formData.logoFile || formData.logoPath) && (
                    <img
                      src={formData.logoFile ? URL.createObjectURL(formData.logoFile) : formData.logoPath}
                      alt="Brand logo preview"
                      className="mt-3 h-24 w-24 rounded-xl object-cover border border-gray-200"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Catalog</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setFormData({ ...formData, catalogFile: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.brand_catalog?.[0] && <p className="mt-1 text-sm text-red-600">{errors.brand_catalog[0]}</p>}
                  <div className="mt-3 text-sm text-gray-600">
                    {formData.catalogFile?.name || (formData.catalogPath ? 'Existing catalog available' : 'No catalog selected')}
                  </div>
                  {formData.catalogPath && !formData.catalogFile && (
                    <a href={formData.catalogPath} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
                      Open current catalog
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
