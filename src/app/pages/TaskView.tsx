import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { taskService } from '../../services/taskService';
import { mapTask } from '../../services/mappers';

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

export const TaskView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const result = await taskService.show(id);
        setTask(mapTask(result));
      } catch (error) {
        toast.error('Unable to load task');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/tasks')} className="rounded-lg p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900">View Task</h2>
          </div>
          {id && (
            <button
              onClick={() => navigate(`/tasks/${id}/edit`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white transition-all hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <LoadingState label="Loading task..." />
          </div>
        ) : task ? (
          <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-gray-500">Name</div>
                <div className="text-lg font-semibold text-gray-900">{task.name}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Status</div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[task.status] || statusBadgeClass.new}`}>
                  {statusLabel(task.status)}
                </span>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Due Date</div>
                <div className="text-gray-900">{task.dueDate || '-'}</div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-gray-500">Assigned To</div>
                <div className="text-gray-900">{task.assignedUser?.name || '-'}</div>
                {task.assignedUser?.email && <div className="mt-1 text-sm text-gray-500">{task.assignedUser.email}</div>}
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-gray-500">Description</div>
                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {task.description || 'No description added.'}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
