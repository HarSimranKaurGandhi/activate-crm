import { useData } from '../../context/DataContext';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/AsyncState';
import { PaginationControls, usePagination } from '../../components/common/Pagination';

export const AdjustmentMaster = () => {
  const { adjustments, addAdjustment, updateAdjustment, deleteAdjustment, loading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed' as 'fixed' | 'percentage',
    defaultValue: 0,
    status: 'active' as 'active' | 'inactive'
  });
  const pagination = usePagination(adjustments, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateAdjustment(editingId, formData);
      toast.success('Adjustment updated successfully');
    } else {
      await addAdjustment(formData);
      toast.success('Adjustment added successfully');
    }
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', type: 'fixed', defaultValue: 0, status: 'active' });
  };

  const handleEdit = (adjustment: any) => {
    setEditingId(adjustment.id);
    setFormData({
      name: adjustment.name,
      type: adjustment.type,
      defaultValue: adjustment.defaultValue,
      status: adjustment.status
    });
    setShowModal(true);
  };

  const toggleStatus = async (adjustment: any) => {
    await updateAdjustment(adjustment.id, { ...adjustment, status: adjustment.status === 'active' ? 'inactive' : 'active' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Adjustment Master</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', type: 'fixed', defaultValue: 0, status: 'active' });
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto sm:px-6"
          >
            <Plus className="w-5 h-5" />
            Add Adjustment
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {pagination.pageItems.map((adjustment) => (
              <div key={adjustment.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-base font-semibold text-gray-900">{adjustment.name}</div>
                    <div className="mt-1">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {adjustment.type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleStatus(adjustment)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      adjustment.status === 'active'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {adjustment.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Default Value</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {adjustment.type === 'percentage' ? `${adjustment.defaultValue}%` : `₹${adjustment.defaultValue}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</div>
                    <div className="mt-1 font-medium text-slate-900">{adjustment.status === 'active' ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(adjustment)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Deactivate this adjustment?')) {
                        await deleteAdjustment(adjustment.id);
                        toast.success('Adjustment deactivated');
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
          <table className="min-w-[760px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Default Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagination.pageItems.map(adjustment => (
                <tr key={adjustment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{adjustment.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {adjustment.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {adjustment.type === 'percentage' ? `${adjustment.defaultValue}%` : `₹${adjustment.defaultValue}`}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(adjustment)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        adjustment.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {adjustment.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(adjustment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Deactivate this adjustment?')) {
                            await deleteAdjustment(adjustment.id);
                            toast.success('Adjustment deactivated');
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
          {loading && <LoadingState label="Loading adjustments..." />}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Adjustment' : 'Add Adjustment'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'fixed' | 'percentage' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Value {formData.type === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  required
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
