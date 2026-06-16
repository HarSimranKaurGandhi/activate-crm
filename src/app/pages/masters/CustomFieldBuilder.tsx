import { useData } from '../../context/DataContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/AsyncState';
import { PaginationControls, usePagination } from '../../components/common/Pagination';
import { SortableHeader, type SortDirection } from '../../components/common/SortableHeader';
import { sortItems } from '../../utils/sort';

export const CustomFieldBuilder = () => {
  const { customFields, addCustomField, updateCustomField, deleteCustomField, loading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox',
    options: [] as string[],
    required: false,
  });
  const [optionInput, setOptionInput] = useState('');
  const [sort, setSort] = useState<{ key: 'name' | 'type' | 'required' | 'options'; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const sortedFields = useMemo(
    () =>
      sortItems(
        customFields,
        (field) => (sort.key === 'options' ? (field.options || []).join(', ') : field[sort.key]),
        sort.direction,
      ),
    [customFields, sort],
  );
  const pagination = usePagination(sortedFields, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.type === 'select' && formData.options.length === 0) {
      toast.error('Add at least one dropdown option');
      return;
    }
    if (editingId) {
      await updateCustomField(editingId, formData);
      toast.success('Custom field updated successfully');
    } else {
      await addCustomField(formData);
      toast.success('Custom field added successfully');
    }
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', type: 'text', options: [], required: false });
  };

  const handleEdit = (field: any) => {
    setEditingId(field.id);
    setFormData({
      name: field.name,
      type: field.type,
      options: field.options || [],
      required: field.required,
    });
    setShowModal(true);
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setFormData({ ...formData, options: [...formData.options, optionInput.trim()] });
      setOptionInput('');
    }
  };

  const removeOption = (index: number) => {
    setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
  };

  const toggleSort = (key: typeof sort.key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Custom Field Builder</h2>
            <p className="text-gray-600 mt-1">Create custom fields for customer forms</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', type: 'text', options: [], required: false });
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto sm:px-6"
          >
            <Plus className="w-5 h-5" />
            Add Custom Field
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {pagination.pageItems.map((field) => (
              <div key={field.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-base font-semibold text-gray-900">{field.name}</div>
                    <div className="mt-1">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {field.type}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    field.required ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                  }`}>
                    {field.required ? 'Required' : 'Optional'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Options</div>
                  <div className="mt-2 break-words text-slate-900">
                    {field.type === 'select' && field.options ? field.options.join(', ') : '-'}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(field)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this custom field?')) {
                        await deleteCustomField(field.id);
                        toast.success('Custom field deleted');
                      }
                    }}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {customFields.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                No custom fields created yet. Add your first custom field to get started.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[820px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Field Name" sortKey="name" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Type" sortKey="type" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Required" sortKey="required" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Options" sortKey="options" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagination.pageItems.map(field => (
                <tr key={field.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{field.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {field.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      field.required ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                    }`}>
                      {field.required ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {field.type === 'select' && field.options ? field.options.join(', ') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(field)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this custom field?')) {
                            await deleteCustomField(field.id);
                            toast.success('Custom field deleted');
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
              {customFields.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No custom fields created yet. Add your first custom field to get started.
                  </td>
                </tr>
              )}
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
          {loading && <LoadingState label="Loading custom fields..." />}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Custom Field' : 'Add Custom Field'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Business Type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown (Select)</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>

              {formData.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dropdown Options</label>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter option"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{option}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Required Field</span>
                </label>
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
