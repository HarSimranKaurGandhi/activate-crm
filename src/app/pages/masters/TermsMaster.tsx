import { useData } from '../../context/DataContext';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/AsyncState';
import { PaginationControls, usePagination } from '../../components/common/Pagination';

export const TermsMaster = () => {
  const { terms, addTerm, updateTerm, deleteTerm, loading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', status: 'active' as 'active' | 'inactive' });
  const pagination = usePagination(terms, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateTerm(editingId, formData);
      toast.success('Term updated successfully');
    } else {
      await addTerm(formData);
      toast.success('Term added successfully');
    }
    setShowModal(false);
    setEditingId(null);
    setFormData({ title: '', content: '', status: 'active' });
  };

  const handleEdit = (term: any) => {
    setEditingId(term.id);
    setFormData({ title: term.title, content: term.content, status: term.status });
    setShowModal(true);
  };

  const toggleStatus = async (term: any) => {
    await updateTerm(term.id, { ...term, status: term.status === 'active' ? 'inactive' : 'active' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Terms & Conditions Master</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', content: '', status: 'active' });
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto sm:px-6"
          >
            <Plus className="w-5 h-5" />
            Add Term
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {pagination.pageItems.map((term) => (
              <div key={term.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-base font-semibold text-gray-900">{term.title || 'Untitled term'}</div>
                    <div className="mt-1 text-sm text-gray-600 line-clamp-4 break-words">{term.content}</div>
                  </div>
                  <button
                    onClick={() => toggleStatus(term)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      term.status === 'active'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {term.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Content</div>
                  <div className="mt-2 break-words text-slate-900">{term.content}</div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(term)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Deactivate this term?')) {
                        await deleteTerm(term.id);
                        toast.success('Term deactivated');
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Term Content</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagination.pageItems.map(term => (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{term.content}</td>
                  <td className="px-6 py-4 text-gray-600">{term.title}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(term)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        term.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {term.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(term)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Deactivate this term?')) {
                            await deleteTerm(term.id);
                            toast.success('Term deactivated');
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
          {loading && <LoadingState label="Loading terms..." />}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Term' : 'Add Term'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term Content</label>
                <textarea
                  required
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
