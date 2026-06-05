import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Edit, Eye, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls, usePagination } from '../components/common/Pagination';
import { userService } from '../../services/userService';
import { taskService } from '../../services/taskService';
import { mapTask, taskPayload } from '../../services/mappers';

const TASK_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const statusBadgeClass: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  on_hold: 'bg-slate-100 text-slate-700',
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'on_hold':
      return 'On Hold';
    default:
      return 'New';
  }
};

export const TaskList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('new');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    assignedTo: 'all',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [taskResult, userResult] = await Promise.all([
          taskService.list(),
          userService.dropdown(),
        ]);

        setTasks((taskResult.data || []).map(mapTask));
        setUsers(Array.isArray(userResult) ? userResult : []);
      } catch (error) {
        toast.error('Unable to load tasks');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = filters.search.trim().toLowerCase();
      const searchMatch =
        !search ||
        task.name.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        (task.assignedUser?.name || '').toLowerCase().includes(search);

      const statusMatch = filters.status === 'all' || task.status === filters.status;
      const assignedMatch = filters.assignedTo === 'all' || task.assignedTo === filters.assignedTo;

      return searchMatch && statusMatch && assignedMatch;
    });
  }, [filters, tasks]);

  const pagination = usePagination(filteredTasks, 10);
  const allPageTaskIds = pagination.pageItems.map((task) => task.id);
  const allPageSelected = allPageTaskIds.length > 0 && allPageTaskIds.every((id) => selectedTaskIds.includes(id));

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  const toggleSelectAllOnPage = () => {
    setSelectedTaskIds((current) => {
      if (allPageSelected) {
        return current.filter((id) => !allPageTaskIds.includes(id));
      }

      return Array.from(new Set([...current, ...allPageTaskIds]));
    });
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedTaskIds.length === 0) {
      toast.error('Select at least one task');
      return;
    }

    setBulkUpdating(true);
    try {
      const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(task.id));
      const updatedTasks = await Promise.all(
        selectedTasks.map((task) =>
          taskService.update(
            task.id,
            taskPayload({
              ...task,
              status: bulkStatus,
            }),
          ),
        ),
      );

      const mappedTasks = updatedTasks.map(mapTask);
      setTasks((current) =>
        current.map((task) => mappedTasks.find((updatedTask) => updatedTask.id === task.id) || task),
      );
      setSelectedTaskIds([]);
      toast.success(`Updated ${mappedTasks.length} task${mappedTasks.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error('Unable to update selected tasks');
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Task Management</h2>
          <button
            onClick={() => navigate('/tasks/new')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Create Task
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search task, description, assignee"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filters.assignedTo}
              onChange={(event) => setFilters((current) => ({ ...current, assignedTo: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assignees</option>
              {users.map((user) => (
                <option key={user.id} value={String(user.id)}>{user.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} task(s) selected` : 'Select tasks to update status in bulk'}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                disabled={selectedTaskIds.length === 0 || bulkUpdating}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bulkUpdating ? 'Updating...' : 'Update Selected'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[860px] w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Task Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagination.pageItems.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-gray-500">{task.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {task.assignedUser?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {task.dueDate || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[task.status] || statusBadgeClass.new}`}>
                        {statusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
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

          {loading && <LoadingState label="Loading tasks..." />}
          {!loading && filteredTasks.length === 0 && (
            <EmptyState label="No tasks found. Create your first task to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
