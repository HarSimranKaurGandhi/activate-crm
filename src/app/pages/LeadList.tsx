import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpDown, Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls, usePagination } from '../components/common/Pagination';
import { leadService } from '../../services/leadService';
import { mapLead } from '../../services/mappers';
import { userService } from '../../services/userService';

const LEAD_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'walk_in', label: 'Walk In' },
  { value: 'reference', label: 'Reference' },
  { value: 'india_mart', label: 'India Mart' },
  { value: 'website', label: 'Website' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];

const LEAD_TAG_OPTIONS = [
  { value: 'all', label: 'All Tags' },
  { value: 'hot', label: 'Hot' },
  { value: 'premium', label: 'Premium' },
];

const statusBadgeClass: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-slate-100 text-slate-700',
  closed_success: 'bg-emerald-50 text-emerald-700',
  closed_fail: 'bg-rose-50 text-rose-700',
};

const tagBadgeClass: Record<string, string> = {
  hot: 'bg-orange-50 text-orange-700',
  premium: 'bg-violet-50 text-violet-700',
};

const sourceLabel = (source: string) =>
  LEAD_SOURCE_OPTIONS.find((option) => option.value === source)?.label || 'Walk In';

const statusLabel = (status: string) =>
  LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'New';

const formatAddress = (lead: any) =>
  [lead.addressLine1, lead.addressLine2, lead.city, lead.state, lead.pincode, lead.country]
    .filter(Boolean)
    .join(', ');

const formatDisplayDate = (date?: string) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const LeadList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    leadSource: 'all',
    status: 'all',
    tag: 'all',
    assignedTo: 'all',
  });
  const [sort, setSort] = useState<{ key: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'status'; direction: 'asc' | 'desc' }>({
    key: 'followUpDate',
    direction: 'asc',
  });

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      await leadService.remove(leadId);
      setLeads((current) => current.filter((lead) => lead.id !== leadId));
      toast.success('Lead deleted');
    } catch {
      toast.error('Unable to delete lead');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [leadResult, userResult] = await Promise.all([
          leadService.list(),
          userService.dropdown(),
        ]);
        setLeads((leadResult.data || []).map(mapLead));
        setUsers(Array.isArray(userResult) ? userResult : []);
      } catch (error) {
        toast.error('Unable to load leads');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const search = filters.search.trim().toLowerCase();
      const searchMatch =
        !search ||
        lead.name.toLowerCase().includes(search) ||
        lead.phone.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        lead.requirement.toLowerCase().includes(search) ||
        formatAddress(lead).toLowerCase().includes(search);

      const sourceMatch = filters.leadSource === 'all' || lead.leadSource === filters.leadSource;
      const statusMatch = filters.status === 'all' || lead.status === filters.status;
      const tagMatch = filters.tag === 'all' || lead.tags.includes(filters.tag);
      const assignedMatch = filters.assignedTo === 'all' || lead.assignedTo === filters.assignedTo;

      return searchMatch && sourceMatch && statusMatch && tagMatch && assignedMatch;
    });
  }, [filters, leads]);

  const sortedLeads = useMemo(() => {
    const valueForSort = (lead: any) => {
      switch (sort.key) {
        case 'name':
          return (lead.name || '').toLowerCase();
        case 'leadSource':
          return sourceLabel(lead.leadSource).toLowerCase();
        case 'assignedTo':
          return (lead.assignedUser?.name || '').toLowerCase();
        case 'followUpDate':
          return lead.followUpDate ? new Date(lead.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
        case 'status':
          return statusLabel(lead.status).toLowerCase();
        default:
          return '';
      }
    };

    return [...filteredLeads].sort((a, b) => {
      const aValue = valueForSort(a);
      const bValue = valueForSort(b);

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sort]);

  const toggleSort = (key: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'status') => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortableHeader = ({
    label,
    sortKey,
    align = 'left',
  }: {
    label: string;
    sortKey: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'status';
    align?: 'left' | 'right';
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className={`inline-flex items-center gap-1 ${align === 'right' ? 'ml-auto' : ''}`}
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-3.5 w-3.5 ${sort.key === sortKey ? 'text-slate-800' : 'text-gray-400'}`} />
    </button>
  );

  const pagination = usePagination(sortedLeads, 10);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Leads</h2>
          <button
            onClick={() => navigate('/leads/new')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Create Lead
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filters.leadSource}
              onChange={(event) => setFilters((current) => ({ ...current, leadSource: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filters.tag}
              onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEAD_TAG_OPTIONS.map((option) => (
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

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="divide-y divide-gray-200 md:hidden">
              {pagination.pageItems.map((lead) => (
                <div key={lead.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-gray-900">{lead.name}</div>
                      <div className="mt-1 text-sm text-gray-500">{lead.phone}</div>
                      {lead.email && <div className="break-words text-sm text-gray-500">{lead.email}</div>}
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[lead.status] || statusBadgeClass.new}`}>
                      {statusLabel(lead.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source</div>
                      <div className="mt-1 font-medium text-slate-900">{sourceLabel(lead.leadSource)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Follow Up</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDisplayDate(lead.followUpDate)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assigned To</div>
                      <div className="mt-1 font-medium text-slate-900">{lead.assignedUser?.name || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement</div>
                      <div className="mt-1 break-words text-slate-900">{lead.requirement || 'No requirement added'}</div>
                    </div>
                  </div>

                  {lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag: string) => (
                        <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${tagBadgeClass[tag] || 'bg-gray-100 text-gray-700'}`}>
                          {tag === 'hot' ? 'Hot' : 'Premium'}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/leads/${lead.id}/edit`)}
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(lead.id)}
                      className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[1080px] w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Lead" sortKey="name" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Source" sortKey="leadSource" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Assigned To" sortKey="assignedTo" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Requirement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Tags</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Follow Up" sortKey="followUpDate" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Status" sortKey="status" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagination.pageItems.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="mt-1 text-sm text-gray-500">{lead.phone}</div>
                        {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{sourceLabel(lead.leadSource)}</td>
                      <td className="px-6 py-4 text-gray-700">{lead.assignedUser?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-2 text-sm text-gray-700">{lead.requirement || 'No requirement added'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {lead.tags.length > 0 ? lead.tags.map((tag: string) => (
                            <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${tagBadgeClass[tag] || 'bg-gray-100 text-gray-700'}`}>
                              {tag === 'hot' ? 'Hot' : 'Premium'}
                            </span>
                          )) : <span className="text-sm text-gray-500">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDisplayDate(lead.followUpDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[lead.status] || statusBadgeClass.new}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(lead.id)}
                            className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
          </div>

          {loading && <LoadingState label="Loading leads..." />}
          {!loading && filteredLeads.length === 0 && (
            <EmptyState label="No leads found. Create your first lead to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
