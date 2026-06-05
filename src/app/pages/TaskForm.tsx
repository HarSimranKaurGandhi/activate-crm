import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';
import { mapTask, taskPayload } from '../../services/mappers';

const TASK_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const today = new Date().toISOString().split('T')[0];

export const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'new',
    dueDate: '',
    assignedTo: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [userResult, taskResult] = await Promise.all([
          userService.dropdown(),
          id ? taskService.show(id) : Promise.resolve(null),
        ]);

        setUsers(Array.isArray(userResult) ? userResult : []);

        if (taskResult) {
          const mapped = mapTask(taskResult);
          setFormData({
            name: mapped.name,
            description: mapped.description,
            status: mapped.status,
            dueDate: mapped.dueDate,
            assignedTo: mapped.assignedTo,
          });
        }
      } catch (error) {
        toast.error(id ? 'Unable to load task' : 'Unable to load users');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!formData.name.trim()) {
      toast.error('Task name is required');
      return;
    }

    if (!formData.dueDate) {
      toast.error('Due date is required');
      return;
    }

    setSubmitting(true);
    try {
      if (id) {
        await taskService.update(id, taskPayload(formData));
        toast.success('Task updated successfully');
      } else {
        await taskService.create(taskPayload(formData));
        toast.success('Task created successfully');
      }

      navigate('/tasks');
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate('/tasks')} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900">
            {id ? 'Edit Task' : 'Create Task'}
          </h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <LoadingState label="Loading task..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name?.[0] && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.description?.[0] && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.status?.[0] && <p className="mt-1 text-sm text-red-600">{errors.status[0]}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  value={formData.dueDate}
                  onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.due_date?.[0] && <p className="mt-1 text-sm text-red-600">{errors.due_date[0]}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assigned To
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(event) => setFormData((current) => ({ ...current, assignedTo: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {[user.name, user.designation].filter(Boolean).join(' - ')}
                    </option>
                  ))}
                </select>
                {errors.assigned_to?.[0] && <p className="mt-1 text-sm text-red-600">{errors.assigned_to[0]}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-white transition-all hover:bg-blue-700"
              >
                <Save className="h-5 w-5" />
                {submitting ? 'Saving...' : id ? 'Update Task' : 'Save Task'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
