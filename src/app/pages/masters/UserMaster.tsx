import { useEffect, useState } from 'react';
import { Edit, Plus, Power, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../../components/common/AsyncState';
import { PaginationControls, usePagination } from '../../components/common/Pagination';
import { userService } from '../../../services/userService';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  designation: '',
  password: '',
  roleId: '',
  status: 'active' as 'active' | 'inactive',
};

const mapUser = (user: any) => ({
  id: String(user.id),
  name: user.name || '',
  email: user.email || '',
  phone: user.phone || '',
  designation: user.designation || '',
  roleId: user.role_id ? String(user.role_id) : '',
  roleName: user.role?.display_name || user.role?.name || '',
  status: user.is_active ? 'active' : 'inactive',
});

export const UserMaster = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState(emptyForm);
  const pagination = usePagination(users, 10);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        userService.list(),
        userService.roles(),
      ]);

      const userList = Array.isArray(usersResponse?.data) ? usersResponse.data : Array.isArray(usersResponse) ? usersResponse : [];
      setUsers(userList.map(mapUser));
      setRoles(rolesResponse);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setErrors({});
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload: Record<string, unknown> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      designation: formData.designation || null,
      role_id: formData.roleId ? Number(formData.roleId) : null,
      is_active: formData.status === 'active',
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (editingId) {
        await userService.update(editingId, payload);
        toast.success('User updated successfully');
      } else {
        await userService.create({ ...payload, password: formData.password });
        toast.success('User created successfully');
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      setErrors(error.errors || {});
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setErrors({});
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      designation: user.designation,
      password: '',
      roleId: user.roleId,
      status: user.status,
    });
    setShowModal(true);
  };

  const toggleStatus = async (user: any) => {
    await userService.status(user.id, user.status !== 'active');
    toast.success(`User ${user.status === 'active' ? 'deactivated' : 'activated'} successfully`);
    await loadData();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Users Master</h2>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto sm:px-6"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {pagination.pageItems.map((user) => (
              <div key={user.id} className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <UserCog className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-base font-semibold text-gray-900">{user.name}</div>
                    <div className="break-words text-sm text-gray-500">{user.email}</div>
                  </div>
                  <button
                    onClick={() => toggleStatus(user)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      user.status === 'active'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</div>
                    <div className="mt-1 font-medium text-slate-900">{user.roleName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Designation</div>
                    <div className="mt-1 font-medium text-slate-900">{user.designation || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone</div>
                    <div className="mt-1 font-medium text-slate-900">{user.phone || '-'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(user)}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Toggle status"
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Designation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagination.pageItems.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <UserCog className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{user.roleName || '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{user.designation || '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{user.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        user.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user)}
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
          {loading && <LoadingState label="Loading users..." />}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit User' : 'Add User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.email?.[0] && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.phone?.[0] && <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.designation?.[0] && <p className="mt-1 text-sm text-red-600">{errors.designation[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingId ? '(leave blank to keep current)' : ''}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.password?.[0] && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                  ))}
                </select>
                {errors.role_id?.[0] && <p className="mt-1 text-sm text-red-600">{errors.role_id[0]}</p>}
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
