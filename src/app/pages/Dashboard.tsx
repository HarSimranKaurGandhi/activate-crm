import { useNavigate } from 'react-router';
import { AlertTriangle, Clock, FileText, ListChecks, PhoneCall } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { useAuth } from '../auth/AuthContext';

const emptySummary = {
  total_quotations: 0,
  pending_for_approval: 0,
  tasks_due_today_count: 0,
  tasks_due_today: [] as any[],
  overdue_tasks_count: 0,
  overdue_tasks: [] as any[],
  follow_ups_due_today_count: 0,
  follow_ups_due_today: [] as any[],
  overdue_follow_ups_count: 0,
  overdue_follow_ups: [] as any[],
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const isAdmin = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase() === 'admin';
  const [viewScope, setViewScope] = useState<'all' | 'mine'>('mine');
  const isAdminView = isAdmin && viewScope === 'all';

  useEffect(() => {
    setSummaryLoading(true);
    dashboardService
      .quotationSummary(isAdmin ? { scope: viewScope } : {})
      .then(setSummary)
      .catch(() => setSummary(emptySummary))
      .finally(() => setSummaryLoading(false));
  }, [isAdmin, viewScope]);

  const isLoading = summaryLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              {isAdminView ? 'Admin Dashboard' : 'My Dashboard'}
            </h2>
            <p className="text-gray-600 mt-1">
              {isAdminView
                ? 'Here is the organization-wide view of approvals, tasks, and follow ups.'
                : 'Here is what needs your attention in your own work today.'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { value: 'all' as const, label: 'Admin Dashboard' },
                { value: 'mine' as const, label: 'My Dashboard' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewScope(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    viewScope === option.value
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${isAdmin ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
          {isAdminView ? (
            <button
              type="button"
              onClick={() => navigate('/approvals')}
              className="w-full bg-white rounded-2xl border border-gray-200 p-6 text-left hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending for Approval</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{isLoading ? '...' : summary.pending_for_approval}</p>
                  <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
                </div>
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
              </div>
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">My Quotations</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{isLoading ? '...' : summary.total_quotations}</p>
                  <p className="text-sm text-gray-500 mt-2">Quotations created by me</p>
                </div>
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-sky-600" />
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{isAdminView ? `Everyone's Tasks Due Today` : 'My Tasks Due Today'}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{isLoading ? '...' : summary.tasks_due_today_count}</p>
                <p className="text-sm text-gray-500 mt-2">{isAdminView ? 'Assigned tasks across all users' : 'Assigned tasks for today'}</p>
              </div>
              <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center">
                <ListChecks className="w-7 h-7 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-rose-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-rose-700 text-sm font-medium">{isAdminView ? `Everyone's Past Due Tasks` : 'My Past Due Tasks'}</p>
                <p className="text-4xl font-bold text-rose-700 mt-2">{isLoading ? '...' : summary.overdue_tasks_count}</p>
                <p className="text-sm text-rose-500 mt-2">{isAdminView ? 'Incomplete overdue tasks across all users' : 'My incomplete overdue tasks'}</p>
              </div>
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{isAdminView ? `Everyone's Follow Ups Today` : 'My Follow Ups Today'}</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{isLoading ? '...' : summary.follow_ups_due_today_count}</p>
                <p className="text-sm text-gray-500 mt-2">{isAdminView ? 'Leads needing follow-up across all users' : 'Leads needing my follow-up today'}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <PhoneCall className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-rose-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-rose-700 text-sm font-medium">{isAdminView ? `Everyone's Past Due Follow Ups` : 'My Past Due Follow Ups'}</p>
                <p className="text-4xl font-bold text-rose-700 mt-2">{isLoading ? '...' : summary.overdue_follow_ups_count}</p>
                <p className="text-sm text-rose-500 mt-2">{isAdminView ? 'Overdue leads across all users' : 'My overdue leads needing attention'}</p>
              </div>
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {!isLoading && (
          <div className="bg-white rounded-2xl border border-rose-200 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-rose-700">{isAdminView ? `Everyone's Past Due Tasks` : 'My Past Due Tasks'}</h3>
              <button
                onClick={() => navigate('/tasks')}
                className="text-left text-sm font-medium text-rose-600 hover:text-rose-700 sm:text-right"
              >
                View all tasks
              </button>
            </div>

            {summary.overdue_tasks.length === 0 ? (
              <EmptyState label="No overdue tasks." />
            ) : (
              <div className="space-y-3">
                {summary.overdue_tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex cursor-pointer flex-col gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 transition-all hover:bg-rose-100 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{task.name}</p>
                        <p className="text-sm text-rose-700">
                          {task.assigned_user?.name ? `Assigned to ${task.assigned_user.name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-rose-700">{task.due_date || '-'}</p>
                        <p className="text-sm text-rose-600 line-clamp-1">{task.description || 'No description'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{isAdminView ? `Everyone's Follow Ups Due Today` : 'My Follow Ups Due Today'}</h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-left text-sm font-medium text-blue-600 hover:text-blue-700 sm:text-right"
              >
                View all leads
              </button>
            </div>

            {summary.follow_ups_due_today.length === 0 ? (
              <EmptyState label="No follow ups due today." />
            ) : (
              <div className="space-y-3">
                {summary.follow_ups_due_today.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="flex cursor-pointer flex-col gap-3 rounded-xl p-4 transition-all hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <PhoneCall className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.name || lead.phone || 'Unnamed lead'}</p>
                        <p className="text-sm text-gray-500">
                          {lead.assigned_user?.name ? `Assigned to ${lead.assigned_user.name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-gray-900">{lead.follow_up_date || '-'}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{lead.requirement || 'No requirement added'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="bg-white rounded-2xl border border-rose-200 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-rose-700">{isAdminView ? `Everyone's Past Due Follow Ups` : 'My Past Due Follow Ups'}</h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-left text-sm font-medium text-rose-600 hover:text-rose-700 sm:text-right"
              >
                View all leads
              </button>
            </div>

            {summary.overdue_follow_ups.length === 0 ? (
              <EmptyState label="No overdue follow ups." />
            ) : (
              <div className="space-y-3">
                {summary.overdue_follow_ups.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="flex cursor-pointer flex-col gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 transition-all hover:bg-rose-100 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.name || lead.phone || 'Unnamed lead'}</p>
                        <p className="text-sm text-rose-700">
                          {lead.assigned_user?.name ? `Assigned to ${lead.assigned_user.name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-rose-700">{lead.follow_up_date || '-'}</p>
                        <p className="text-sm text-rose-600 line-clamp-1">{lead.requirement || 'No requirement added'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{isAdminView ? `Everyone's Tasks Due Today` : 'My Tasks Due Today'}</h3>
              <button
                onClick={() => navigate('/tasks')}
                className="text-left text-sm font-medium text-blue-600 hover:text-blue-700 sm:text-right"
              >
                View all tasks
              </button>
            </div>

            {summary.tasks_due_today.length === 0 ? (
              <EmptyState label="No assigned tasks due today." />
            ) : (
              <div className="space-y-3">
                {summary.tasks_due_today.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex cursor-pointer flex-col gap-3 rounded-xl p-4 transition-all hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                        <ListChecks className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{task.name}</p>
                        <p className="text-sm text-gray-500">
                          {task.assigned_user?.name ? `Assigned to ${task.assigned_user.name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : task.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-700'
                            : task.status === 'on_hold'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-sky-50 text-sky-700'
                      }`}>
                        {task.status === 'in_progress'
                          ? 'In Progress'
                          : task.status === 'on_hold'
                            ? 'On Hold'
                            : task.status === 'completed'
                              ? 'Completed'
                              : 'New'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
