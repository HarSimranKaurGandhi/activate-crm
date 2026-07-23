import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpDown, ChevronDown, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';
import { LeadDetailsDialog } from '../components/leads/LeadDetailsDialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { LeadPhoneAction } from '../components/leads/LeadPhoneAction';
import { leadService } from '../../services/leadService';
import { mapLead } from '../../services/mappers';
import { userService } from '../../services/userService';

const LEAD_SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk In' },
  { value: 'reference', label: 'Reference' },
  { value: 'india_mart', label: 'India Mart' },
  { value: 'website', label: 'Website' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'new', label: 'New (Requirement Confirmed)' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];
const CLOSED_LEAD_STATUS_OPTIONS = ['closed_success', 'closed_fail'];

const statusBadgeClass: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  enquiry: 'bg-indigo-50 text-indigo-700',
  in_progress: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-slate-100 text-slate-700',
  closed_success: 'bg-emerald-50 text-emerald-700',
  closed_fail: 'bg-rose-50 text-rose-700',
};

const sourceLabel = (source: string) =>
  LEAD_SOURCE_OPTIONS.find((option) => option.value === source)?.label || 'Walk In';

const statusLabel = (status: string) =>
  LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'New (Requirement Confirmed)';

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
const formatDisplayDateTime = (date?: string) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const isPastDate = (date?: string) => {
  if (!date) return false;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  parsed.setHours(0, 0, 0, 0);
  return parsed < TODAY;
};

const phoneHref = (phone?: string) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
const toggleFilterValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
const filterTriggerLabel = (label: string, selected: string[], options: Array<{ value: string; label: string }>) => {
  if (selected.length === 0) return label;
  if (selected.length === 1) {
    return options.find((option) => option.value === selected[0])?.label || label;
  }

  return `${label} (${selected.length})`;
};

export const LeadList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    leadSources: [] as string[],
    statuses: [] as string[],
    assignedTo: [] as string[],
    showClosed: false,
  });
  const [sort, setSort] = useState<{ key: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'status'; direction: 'asc' | 'desc' }>({
    key: 'followUpDate',
    direction: 'asc',
  });

  const openLeadDialog = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsLeadDialogOpen(true);
  };

  const updateLeadInList = (updatedLead: any) => {
    setLeads((current) => current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      await leadService.remove(leadId);
      setLeads((current) => current.filter((lead) => lead.id !== leadId));
      setTotalItems((current) => Math.max(0, current - 1));
      toast.success('Lead deleted');
    } catch {
      toast.error('Unable to delete lead');
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userResult = await userService.dropdown();
        setUsers(Array.isArray(userResult) ? userResult : []);
      } catch {
        toast.error('Unable to load lead users');
      }
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true);
      try {
        const result = await leadService.list({
          page,
          per_page: pageSize,
          include_closed: filters.showClosed ? 1 : 0,
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.leadSources.length > 0 ? { lead_source: filters.leadSources } : {}),
          ...(filters.statuses.length > 0 ? { status: filters.statuses } : {}),
          ...(filters.assignedTo.length > 0 ? { assigned_to: filters.assignedTo } : {}),
        });

        const pagination = result.meta?.pagination;
        setLeads((result.data || []).map(mapLead));
        setTotalItems(pagination?.total || 0);
        setTotalPages(pagination?.last_page || 1);
      } catch {
        toast.error('Unable to load leads');
      } finally {
        setLoading(false);
      }
    };

    void loadLeads();
  }, [filters, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.leadSources, filters.statuses, filters.assignedTo, filters.showClosed]);

  useEffect(() => {
    if (filters.showClosed) {
      return;
    }

    setFilters((current) => {
      const nextStatuses = current.statuses.filter((status) => !CLOSED_LEAD_STATUS_OPTIONS.includes(status));
      if (nextStatuses.length === current.statuses.length) {
        return current;
      }

      return {
        ...current,
        statuses: nextStatuses,
      };
    });
  }, [filters.showClosed]);

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

    return [...leads].sort((a, b) => {
      const aValue = valueForSort(a);
      const bValue = valueForSort(b);

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, sort]);

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

  const activeFilterCount = [
    filters.search.trim() ? 1 : 0,
    filters.leadSources.length > 0 ? 1 : 0,
    filters.statuses.length > 0 ? 1 : 0,
    filters.assignedTo.length > 0 ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);
  const assigneeOptions = users.map((user) => ({ value: String(user.id), label: user.name }));
  const visibleStatusOptions = filters.showClosed
    ? LEAD_STATUS_OPTIONS
    : LEAD_STATUS_OPTIONS.filter((option) => !CLOSED_LEAD_STATUS_OPTIONS.includes(option.value));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Leads</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={filters.showClosed}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    showClosed: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show Closed leads
            </label>
            <button
              onClick={() => navigate('/leads/new')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              Create Lead
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileFilters((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: '',
                    leadSources: [],
                    statuses: [],
                    assignedTo: [],
                    showClosed: filters.showClosed,
                  })
                }
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className={`${showMobileFilters ? 'grid' : 'hidden'} mb-4 grid-cols-1 gap-3 lg:hidden`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Source', filters.leadSources, LEAD_SOURCE_OPTIONS)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Lead Sources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.leadSources.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      leadSources: toggleFilterValue(current.leadSources, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Status', filters.statuses, LEAD_STATUS_OPTIONS)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Lead Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleStatusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.statuses.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      statuses: toggleFilterValue(current.statuses, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Assignee', filters.assignedTo, assigneeOptions)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Assigned To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {assigneeOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.assignedTo.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      assignedTo: toggleFilterValue(current.assignedTo, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mb-4 hidden grid-cols-1 gap-3 lg:grid lg:grid-cols-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Source', filters.leadSources, LEAD_SOURCE_OPTIONS)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Lead Sources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.leadSources.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      leadSources: toggleFilterValue(current.leadSources, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Status', filters.statuses, LEAD_STATUS_OPTIONS)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Lead Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleStatusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.statuses.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      statuses: toggleFilterValue(current.statuses, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                >
                  <span>{filterTriggerLabel('Assignee', filters.assignedTo, assigneeOptions)}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Assigned To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {assigneeOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={filters.assignedTo.includes(option.value)}
                    onCheckedChange={() => setFilters((current) => ({
                      ...current,
                      assignedTo: toggleFilterValue(current.assignedTo, option.value),
                    }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="divide-y divide-gray-200 md:hidden">
              {sortedLeads.map((lead) => (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLeadDialog(lead.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openLeadDialog(lead.id);
                    }
                  }}
                  className="space-y-4 p-4 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-gray-900">{lead.name}</div>
                      <div className="mt-1"><LeadPhoneAction leadId={String(lead.id)} phone={lead.phone} /></div>
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
                      <div className={`mt-1 font-medium ${isPastDate(lead.followUpDate) ? 'text-rose-600' : 'text-slate-900'}`}>{formatDisplayDate(lead.followUpDate)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assigned To</div>
                      <div className="mt-1 font-medium text-slate-900">{lead.assignedUser?.name || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement</div>
                      <div className="mt-1 break-words text-slate-900">{lead.requirement || 'No requirement added'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created On</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDisplayDateTime(lead.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last Updated</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDisplayDateTime(lead.updatedAt)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(lead.id);
                      }}
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
              <table className="min-w-[1200px] w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Lead" sortKey="name" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Source" sortKey="leadSource" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Assigned To" sortKey="assignedTo" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Requirement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Follow Up" sortKey="followUpDate" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Created On</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Last Updated On</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Status" sortKey="status" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => openLeadDialog(lead.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="mt-1"><LeadPhoneAction leadId={String(lead.id)} phone={lead.phone} /></div>
                        {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{sourceLabel(lead.leadSource)}</td>
                      <td className="px-6 py-4 text-gray-700">{lead.assignedUser?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-2 text-sm text-gray-700">{lead.requirement || 'No requirement added'}</div>
                      </td>
                      <td className={`px-6 py-4 ${isPastDate(lead.followUpDate) ? 'text-rose-600' : 'text-gray-700'}`}>{formatDisplayDate(lead.followUpDate)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDisplayDateTime(lead.createdAt)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDisplayDateTime(lead.updatedAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[lead.status] || statusBadgeClass.new}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDelete(lead.id);
                            }}
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
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </div>

          {loading && <LoadingState label="Loading leads..." />}
          {!loading && leads.length === 0 && (
            <EmptyState label="No leads found. Create your first lead to get started." />
          )}
        </div>
      </div>

      <LeadDetailsDialog
        leadId={selectedLeadId}
        open={isLeadDialogOpen}
        users={users}
        onOpenChange={(open) => {
          setIsLeadDialogOpen(open);
          if (!open) {
            setSelectedLeadId(null);
          }
        }}
        onSaved={updateLeadInList}
      />
    </div>
  );
};
