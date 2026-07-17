import { useNavigate } from 'react-router';
import { AlertTriangle, Clock, FileText, ListChecks, PhoneCall, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { PaginationControls, usePagination } from '../components/common/Pagination';

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
  const [filters, setFilters] = useState({
    overdueTasks: '',
    todayFollowUps: '',
    overdueFollowUps: '',
    todayTasks: '',
  });
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
  const formatDate = (value?: string | null) => {
    if (!value) return '-';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  const formatTaskStatus = (status?: string | null) => {
    if (!status) return 'New';
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };
  const tableHeaderClassName = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600';
  const tableCellClassName = 'px-4 py-3 text-sm text-gray-700';
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const filteredOverdueTasks = useMemo(() => {
    const search = filters.overdueTasks.trim().toLowerCase();
    if (!search) return summary.overdue_tasks;

    return summary.overdue_tasks.filter((task) =>
      [task.name, task.description, task.assigned_user?.name, task.due_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [filters.overdueTasks, summary.overdue_tasks]);
  const filteredTodayFollowUps = useMemo(() => {
    const search = filters.todayFollowUps.trim().toLowerCase();
    if (!search) return summary.follow_ups_due_today;

    return summary.follow_ups_due_today.filter((lead) =>
      [lead.name, lead.phone, lead.requirement, lead.assigned_user?.name, lead.follow_up_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [filters.todayFollowUps, summary.follow_ups_due_today]);
  const filteredOverdueFollowUps = useMemo(() => {
    const search = filters.overdueFollowUps.trim().toLowerCase();
    if (!search) return summary.overdue_follow_ups;

    return summary.overdue_follow_ups.filter((lead) =>
      [lead.name, lead.phone, lead.requirement, lead.assigned_user?.name, lead.follow_up_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [filters.overdueFollowUps, summary.overdue_follow_ups]);
  const filteredTodayTasks = useMemo(() => {
    const search = filters.todayTasks.trim().toLowerCase();
    if (!search) return summary.tasks_due_today;

    return summary.tasks_due_today.filter((task) =>
      [task.name, task.description, task.assigned_user?.name, task.status, task.due_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [filters.todayTasks, summary.tasks_due_today]);
  const overdueTasksPagination = usePagination(filteredOverdueTasks, 10);
  const todayFollowUpsPagination = usePagination(filteredTodayFollowUps, 10);
  const overdueFollowUpsPagination = usePagination(filteredOverdueFollowUps, 10);
  const todayTasksPagination = usePagination(filteredTodayTasks, 10);
  const overdueTasksResolved = !isLoading && summary.overdue_tasks_count === 0;
  const overdueFollowUpsResolved = !isLoading && summary.overdue_follow_ups_count === 0;

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

        <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${isAdmin ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
          {isAdminView ? (
            <button
              type="button"
              onClick={() => navigate('/quotations/approvals')}
              className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending for Approval</p>
                  <p className="mt-2 text-4xl font-bold text-gray-900">{isLoading ? '...' : summary.pending_for_approval}</p>
                  <p className="mt-2 text-sm text-gray-500">Awaiting review</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                  <Clock className="h-7 w-7 text-amber-600" />
                </div>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">My Quotations Awaiting Approval</p>
                  <p className="mt-2 text-4xl font-bold text-gray-900">{isLoading ? '...' : summary.pending_for_approval}</p>
                  <p className="mt-2 text-sm text-gray-500">Pending on review</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">
                  <FileText className="h-7 w-7 text-sky-600" />
                </div>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{isAdminView ? `Everyone's Tasks Due Today` : 'My Tasks Due Today'}</p>
                <p className="mt-2 text-4xl font-bold text-gray-900">{isLoading ? '...' : summary.tasks_due_today_count}</p>
                <p className="mt-2 text-sm text-gray-500">{isAdminView ? 'Assigned tasks across all users' : 'Assigned tasks for today'}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                <ListChecks className="h-7 w-7 text-violet-600" />
              </div>
            </div>
          </div>
          <div className={`rounded-2xl bg-white p-6 transition-all hover:shadow-lg ${overdueTasksResolved ? 'border border-emerald-200' : 'border border-rose-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${overdueTasksResolved ? 'text-emerald-700' : 'text-rose-700'}`}>{isAdminView ? `Everyone's Past Due Tasks` : 'My Past Due Tasks'}</p>
                <p className={`mt-2 text-4xl font-bold ${overdueTasksResolved ? 'text-emerald-700' : 'text-rose-700'}`}>{isLoading ? '...' : summary.overdue_tasks_count}</p>
                <p className={`mt-2 text-sm ${overdueTasksResolved ? 'text-emerald-600' : 'text-rose-500'}`}>{isAdminView ? 'Incomplete overdue tasks across all users' : 'My incomplete overdue tasks'}</p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${overdueTasksResolved ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <AlertTriangle className={`h-7 w-7 ${overdueTasksResolved ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{isAdminView ? `Everyone's Follow Ups Today` : 'My Follow Ups Today'}</p>
                <p className="mt-2 text-4xl font-bold text-gray-900">{isLoading ? '...' : summary.follow_ups_due_today_count}</p>
                <p className="mt-2 text-sm text-gray-500">{isAdminView ? 'Leads needing follow-up across all users' : 'Leads needing my follow-up today'}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <PhoneCall className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </div>
          <div className={`rounded-2xl bg-white p-6 transition-all hover:shadow-lg ${overdueFollowUpsResolved ? 'border border-emerald-200' : 'border border-rose-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${overdueFollowUpsResolved ? 'text-emerald-700' : 'text-rose-700'}`}>{isAdminView ? `Everyone's Past Due Follow Ups` : 'My Past Due Follow Ups'}</p>
                <p className={`mt-2 text-4xl font-bold ${overdueFollowUpsResolved ? 'text-emerald-700' : 'text-rose-700'}`}>{isLoading ? '...' : summary.overdue_follow_ups_count}</p>
                <p className={`mt-2 text-sm ${overdueFollowUpsResolved ? 'text-emerald-600' : 'text-rose-500'}`}>{isAdminView ? 'Overdue leads across all users' : 'My overdue leads needing attention'}</p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${overdueFollowUpsResolved ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <AlertTriangle className={`h-7 w-7 ${overdueFollowUpsResolved ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {!isLoading && (
          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="px-4 pt-4 text-lg font-semibold text-rose-700 sm:px-6 sm:pt-6">{isAdminView ? `Everyone's Past Due Tasks` : 'My Past Due Tasks'}</h3>
              <button
                onClick={() => navigate('/tasks')}
                className="px-4 text-left text-sm font-medium text-rose-600 hover:text-rose-700 sm:px-6 sm:text-right"
              >
                View all tasks
              </button>
            </div>

            {summary.overdue_tasks.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState label="No overdue tasks." />
              </div>
            ) : (
              <>
                <div className="px-4 pb-4 sm:px-6">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.overdueTasks}
                      onChange={(event) => updateFilter('overdueTasks', event.target.value)}
                      placeholder="Filter by task, assignee, due date, or description"
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                  <thead className="bg-rose-50">
                    <tr className="border-y border-rose-100">
                      <th className={tableHeaderClassName}>Task</th>
                      <th className={tableHeaderClassName}>Assigned To</th>
                      <th className={tableHeaderClassName}>Due Date</th>
                      <th className={tableHeaderClassName}>Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 bg-white">
                    {overdueTasksPagination.pageItems.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="cursor-pointer hover:bg-rose-50"
                      >
                        <td className={`${tableCellClassName} font-medium text-gray-900`}>{task.name}</td>
                        <td className={tableCellClassName}>{task.assigned_user?.name || 'Unassigned'}</td>
                        <td className={`${tableCellClassName} font-medium text-rose-700`}>{formatDate(task.due_date)}</td>
                        <td className={tableCellClassName}>{task.description || 'No description'}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={overdueTasksPagination.page}
                  pageSize={overdueTasksPagination.pageSize}
                  totalItems={overdueTasksPagination.totalItems}
                  totalPages={overdueTasksPagination.totalPages}
                  onPageChange={overdueTasksPagination.setPage}
                  onPageSizeChange={overdueTasksPagination.setPageSize}
                />
              </>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="px-4 pt-4 text-lg font-semibold text-gray-900 sm:px-6 sm:pt-6">{isAdminView ? `Everyone's Follow Ups Due Today` : 'My Follow Ups Due Today'}</h3>
              <button
                onClick={() => navigate('/leads')}
                className="px-4 text-left text-sm font-medium text-blue-600 hover:text-blue-700 sm:px-6 sm:text-right"
              >
                View all leads
              </button>
            </div>

            {summary.follow_ups_due_today.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState label="No follow ups due today." />
              </div>
            ) : (
              <>
                <div className="px-4 pb-4 sm:px-6">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.todayFollowUps}
                      onChange={(event) => updateFilter('todayFollowUps', event.target.value)}
                      placeholder="Filter by lead, assignee, date, or requirement"
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-y border-gray-200">
                      <th className={tableHeaderClassName}>Lead</th>
                      <th className={tableHeaderClassName}>Assigned To</th>
                      <th className={tableHeaderClassName}>Follow Up Date</th>
                      <th className={tableHeaderClassName}>Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {todayFollowUpsPagination.pageItems.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className={`${tableCellClassName} font-medium text-gray-900`}>{lead.name || lead.phone || 'Unnamed lead'}</td>
                        <td className={tableCellClassName}>{lead.assigned_user?.name || 'Unassigned'}</td>
                        <td className={`${tableCellClassName} font-medium text-gray-900`}>{formatDate(lead.follow_up_date)}</td>
                        <td className={tableCellClassName}>{lead.requirement || 'No requirement added'}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={todayFollowUpsPagination.page}
                  pageSize={todayFollowUpsPagination.pageSize}
                  totalItems={todayFollowUpsPagination.totalItems}
                  totalPages={todayFollowUpsPagination.totalPages}
                  onPageChange={todayFollowUpsPagination.setPage}
                  onPageSizeChange={todayFollowUpsPagination.setPageSize}
                />
              </>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="px-4 pt-4 text-lg font-semibold text-rose-700 sm:px-6 sm:pt-6">{isAdminView ? `Everyone's Past Due Follow Ups` : 'My Past Due Follow Ups'}</h3>
              <button
                onClick={() => navigate('/leads')}
                className="px-4 text-left text-sm font-medium text-rose-600 hover:text-rose-700 sm:px-6 sm:text-right"
              >
                View all leads
              </button>
            </div>

            {summary.overdue_follow_ups.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState label="No overdue follow ups." />
              </div>
            ) : (
              <>
                <div className="px-4 pb-4 sm:px-6">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.overdueFollowUps}
                      onChange={(event) => updateFilter('overdueFollowUps', event.target.value)}
                      placeholder="Filter by lead, assignee, date, or requirement"
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                  <thead className="bg-rose-50">
                    <tr className="border-y border-rose-100">
                      <th className={tableHeaderClassName}>Lead</th>
                      <th className={tableHeaderClassName}>Assigned To</th>
                      <th className={tableHeaderClassName}>Follow Up Date</th>
                      <th className={tableHeaderClassName}>Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 bg-white">
                    {overdueFollowUpsPagination.pageItems.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="cursor-pointer hover:bg-rose-50"
                      >
                        <td className={`${tableCellClassName} font-medium text-gray-900`}>{lead.name || lead.phone || 'Unnamed lead'}</td>
                        <td className={tableCellClassName}>{lead.assigned_user?.name || 'Unassigned'}</td>
                        <td className={`${tableCellClassName} font-medium text-rose-700`}>{formatDate(lead.follow_up_date)}</td>
                        <td className={tableCellClassName}>{lead.requirement || 'No requirement added'}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={overdueFollowUpsPagination.page}
                  pageSize={overdueFollowUpsPagination.pageSize}
                  totalItems={overdueFollowUpsPagination.totalItems}
                  totalPages={overdueFollowUpsPagination.totalPages}
                  onPageChange={overdueFollowUpsPagination.setPage}
                  onPageSizeChange={overdueFollowUpsPagination.setPageSize}
                />
              </>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="px-4 pt-4 text-lg font-semibold text-gray-900 sm:px-6 sm:pt-6">{isAdminView ? `Everyone's Tasks Due Today` : 'My Tasks Due Today'}</h3>
              <button
                onClick={() => navigate('/tasks')}
                className="px-4 text-left text-sm font-medium text-blue-600 hover:text-blue-700 sm:px-6 sm:text-right"
              >
                View all tasks
              </button>
            </div>

            {summary.tasks_due_today.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState label="No assigned tasks due today." />
              </div>
            ) : (
              <>
                <div className="px-4 pb-4 sm:px-6">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.todayTasks}
                      onChange={(event) => updateFilter('todayTasks', event.target.value)}
                      placeholder="Filter by task, assignee, due date, or status"
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-y border-gray-200">
                      <th className={tableHeaderClassName}>Task</th>
                      <th className={tableHeaderClassName}>Assigned To</th>
                      <th className={tableHeaderClassName}>Due Date</th>
                      <th className={tableHeaderClassName}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {todayTasksPagination.pageItems.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className={`${tableCellClassName} font-medium text-gray-900`}>{task.name}</td>
                        <td className={tableCellClassName}>{task.assigned_user?.name || 'Unassigned'}</td>
                        <td className={tableCellClassName}>{formatDate(task.due_date)}</td>
                        <td className={tableCellClassName}>{formatTaskStatus(task.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={todayTasksPagination.page}
                  pageSize={todayTasksPagination.pageSize}
                  totalItems={todayTasksPagination.totalItems}
                  totalPages={todayTasksPagination.totalPages}
                  onPageChange={todayTasksPagination.setPage}
                  onPageSizeChange={todayTasksPagination.setPageSize}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
