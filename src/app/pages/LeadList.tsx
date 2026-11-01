import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpDown, ChevronDown, Filter, LoaderCircle, PencilLine, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '../components/common/AsyncState';
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
import { LeadBulkUploadDialog } from '../components/leads/LeadBulkUploadDialog';
import { LeadBulkEditDialog, type LeadBulkUpdates } from '../components/leads/LeadBulkEditDialog';
import { leadService } from '../../services/leadService';
import { mapLead } from '../../services/mappers';
import { userService } from '../../services/userService';
import { useAuth } from '../auth/AuthContext';

const LEAD_SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk In' },
  { value: 'reference', label: 'Reference' },
  { value: 'india_mart', label: 'India Mart' },
  { value: 'website', label: 'Website' },
  { value: 'johnson', label: 'Johnson' },
  { value: 'hercules', label: 'Hercules' },
  { value: 'affiliate', label: 'Affiliate' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'new', label: 'New (Requirement Confirmed)' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];
const CLOSED_LEAD_STATUS_OPTIONS = ['closed_success', 'closed_fail'];

type FollowUpPeriod = 'all' | 'today' | 'last_3_days' | 'last_7_days' | 'last_30_days';
type FilterOperator = 'is' | 'is_not';

const FOLLOW_UP_PERIOD_OPTIONS: Array<{ value: FollowUpPeriod; label: string; days?: number }> = [
  { value: 'all', label: 'All Follow Up Dates' },
  { value: 'today', label: 'Today', days: 1 },
  { value: 'last_3_days', label: 'Last 3 Days', days: 3 },
  { value: 'last_7_days', label: 'Last 7 Days', days: 7 },
  { value: 'last_30_days', label: 'Last 30 Days', days: 30 },
];

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const followUpDateRange = (period: FollowUpPeriod) => {
  const option = FOLLOW_UP_PERIOD_OPTIONS.find((item) => item.value === period);
  if (!option?.days) return null;

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (option.days - 1));

  return {
    from: formatDateForApi(start),
    to: formatDateForApi(end),
  };
};

const statusBadgeClass: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  enquiry: 'bg-indigo-50 text-indigo-700',
  in_progress: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-slate-100 text-slate-700',
  order_confirmed: 'bg-indigo-50 text-indigo-700',
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
    timeZone: 'Asia/Kolkata',
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
const filterTriggerLabel = (
  label: string,
  selected: string[],
  options: Array<{ value: string; label: string }>,
  operator: FilterOperator = 'is',
) => {
  if (selected.length === 0) return label;

  const selectedLabel = selected.length === 1
    ? options.find((option) => option.value === selected[0])?.label || label
    : `${label} (${selected.length})`;

  return operator === 'is_not' ? `${label} is not ${selected.length === 1 ? selectedLabel : `(${selected.length})`}` : selectedLabel;
};

const MultiSelectFilter = ({
  label,
  menuLabel,
  selected,
  options,
  operator,
  onToggle,
  onOperatorChange,
}: {
  label: string;
  menuLabel: string;
  selected: string[];
  options: Array<{ value: string; label: string }>;
  operator: FilterOperator;
  onToggle: (value: string) => void;
  onOperatorChange: (operator: FilterOperator) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
          selected.length > 0 && operator === 'is_not'
            ? 'border-rose-200 text-rose-700'
            : 'border-gray-200 text-gray-700'
        }`}
      >
        <span className="truncate">{filterTriggerLabel(label, selected, options, operator)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64">
      <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
      <div className="mb-1 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
        {([
          { value: 'is', label: 'Is' },
          { value: 'is_not', label: 'Is not' },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onOperatorChange(option.value)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              operator === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <DropdownMenuSeparator />
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={selected.includes(option.value)}
          onCheckedChange={() => onToggle(option.value)}
          onSelect={(event) => event.preventDefault()}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const LeadList = () => {
  const { user } = useAuth();
  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();
  const isAdmin = role === 'admin';
  const canViewAllLeads = ['admin', 'sales_manager'].includes(role);
  const isSalesDepartmentUser = Array.isArray(user?.departments)
    && user.departments.some((department: unknown) => String(department).trim().toLowerCase() === 'sales');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [favouriteUsers, setFavouriteUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedPage, setLoadedPage] = useState(0);
  const [pendingDialogPage, setPendingDialogPage] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [favouriteUpdating, setFavouriteUpdating] = useState<string[]>([]);
  const [filters, setFilters] = useState(() => ({
    search: '',
    leadSources: [] as string[],
    leadSourceOperator: 'is' as FilterOperator,
    statuses: [] as string[],
    statusOperator: 'is' as FilterOperator,
    assignedTo: canViewAllLeads && isSalesDepartmentUser && user?.id ? [String(user.id)] : [] as string[],
    assignedToOperator: 'is' as FilterOperator,
    followUpPeriod: 'all' as FollowUpPeriod,
    showClosed: false,
    favouritesOnly: false,
    favouriteUserId: user?.id ? String(user.id) : '',
  }));
  const [sort, setSort] = useState<{ key: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'createdAt' | 'status'; direction: 'asc' | 'desc' }>({
    key: 'followUpDate',
    direction: 'asc',
  });

  useEffect(() => {
    if (!user?.id) return;

    setFilters((current) => current.favouriteUserId
      ? current
      : {
          ...current,
          favouriteUserId: String(user.id),
          assignedTo: canViewAllLeads && isSalesDepartmentUser ? [String(user.id)] : current.assignedTo,
        });
  }, [canViewAllLeads, isSalesDepartmentUser, user?.id]);

  const openLeadDialog = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsLeadDialogOpen(true);
  };

  const updateLeadInList = (updatedLead: any) => {
    const remainsVisible = canViewAllLeads || String(updatedLead.assignedTo || '') === String(user?.id || '');

    setLeads((current) => remainsVisible
      ? current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
      : current.filter((lead) => lead.id !== updatedLead.id));

    if (!remainsVisible) {
      setTotalItems((current) => Math.max(0, current - 1));
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      await leadService.remove(leadId);
      setLeads((current) => current.filter((lead) => lead.id !== leadId));
      setSelectedLeadIds((current) => current.filter((id) => id !== leadId));
      setTotalItems((current) => Math.max(0, current - 1));
      toast.success('Lead deleted');
    } catch {
      toast.error('Unable to delete lead');
    }
  };

  const handleFavourite = async (lead: any) => {
    const nextFavourite = !lead.isFavourite;
    setFavouriteUpdating((current) => [...current, lead.id]);

    try {
      await leadService.favourite(lead.id, nextFavourite, isAdmin ? filters.favouriteUserId : undefined);
      setReloadKey(value => value + 1);
      toast.success(nextFavourite ? 'Lead added to favourites' : 'Lead removed from favourites');
    } catch {
      toast.error('Unable to update favourite lead');
    } finally {
      setFavouriteUpdating((current) => current.filter((id) => id !== lead.id));
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const [salesUserResult, favouriteUserResult] = await Promise.all([
          userService.salesDepartmentDropdown(),
          isAdmin ? userService.dropdown() : Promise.resolve([]),
        ]);
        setUsers(Array.isArray(salesUserResult) ? salesUserResult : []);
        setFavouriteUsers(Array.isArray(favouriteUserResult) ? favouriteUserResult : []);
      } catch {
        toast.error('Unable to load lead users');
      }
    };

    void loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true);
      try {
        const followUpRange = followUpDateRange(filters.followUpPeriod);
        const result = await leadService.list({
          page,
          per_page: pageSize,
          include_closed: filters.showClosed ? 1 : 0,
          favourites_only: filters.favouritesOnly ? 1 : 0,
          ...(isAdmin && filters.favouriteUserId
            ? { favourite_user_id: filters.favouriteUserId }
            : {}),
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.leadSources.length > 0 ? {
            lead_source: filters.leadSources,
            lead_source_operator: filters.leadSourceOperator,
          } : {}),
          ...(filters.statuses.length > 0 ? {
            status: filters.statuses,
            status_operator: filters.statusOperator,
          } : {}),
          ...(filters.assignedTo.length > 0 ? {
            assigned_to: filters.assignedTo,
            assigned_to_operator: filters.assignedToOperator,
          } : {}),
          ...(followUpRange ? {
            follow_up_from: followUpRange.from,
            follow_up_to: followUpRange.to,
          } : {}),
          sort_by: {
            leadSource: 'lead_source',
            assignedTo: 'assigned_to',
            followUpDate: 'follow_up_date',
            createdAt: 'created_at',
          }[sort.key] || sort.key,
          sort_direction: sort.direction,
        });

        const pagination = result.meta?.pagination;
        setLeads((result.data || []).map(mapLead));
        setTotalItems(pagination?.total || 0);
        setTotalPages(pagination?.last_page || 1);
        setLoadedPage(page);
      } catch {
        setPendingDialogPage((current) => current === page ? null : current);
        toast.error('Unable to load leads');
      } finally {
        setLoading(false);
      }
    };

    void loadLeads();
  }, [filters, page, pageSize, sort, reloadKey]);

  useEffect(() => {
    if (pendingDialogPage === null || loadedPage !== pendingDialogPage) {
      return;
    }

    const firstLead = leads[0];
    setPendingDialogPage(null);

    if (firstLead) {
      setSelectedLeadId(firstLead.id);
    } else {
      setIsLeadDialogOpen(false);
      setSelectedLeadId(null);
      toast.info('No more leads found');
    }
  }, [leads, loadedPage, pendingDialogPage]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.leadSources, filters.leadSourceOperator, filters.statuses, filters.statusOperator, filters.assignedTo, filters.assignedToOperator, filters.followUpPeriod, filters.showClosed, filters.favouritesOnly, filters.favouriteUserId, sort.key, sort.direction]);

  useEffect(() => {
    setSelectedLeadIds([]);
  }, [filters.search, filters.leadSources, filters.leadSourceOperator, filters.statuses, filters.statusOperator, filters.assignedTo, filters.assignedToOperator, filters.followUpPeriod, filters.showClosed, filters.favouritesOnly, filters.favouriteUserId, sort.key, sort.direction, pageSize]);

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

  const sortedLeads = leads;
  const currentPageLeadIds = sortedLeads.map((lead) => String(lead.id));
  const allPageSelected = currentPageLeadIds.length > 0
    && currentPageLeadIds.every((leadId) => selectedLeadIds.includes(leadId));
  const somePageSelected = currentPageLeadIds.some((leadId) => selectedLeadIds.includes(leadId));
  const selectedLeadIndex = sortedLeads.findIndex((lead) => lead.id === selectedLeadId);
  const nextLeadId = selectedLeadIndex >= 0 ? sortedLeads[selectedLeadIndex + 1]?.id : null;
  const hasNextPage = page < totalPages;

  const showNextLead = () => {
    if (nextLeadId) {
      setSelectedLeadId(nextLeadId);
      return;
    }

    if (hasNextPage && pendingDialogPage === null) {
      const nextPage = page + 1;
      setPendingDialogPage(nextPage);
      setPage(nextPage);
    }
  };

  const toggleSort = (key: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'createdAt' | 'status') => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((current) => current.includes(leadId)
      ? current.filter((id) => id !== leadId)
      : [...current, leadId]);
  };

  const toggleSelectCurrentPage = () => {
    setSelectedLeadIds((current) => allPageSelected
      ? current.filter((id) => !currentPageLeadIds.includes(id))
      : Array.from(new Set([...current, ...currentPageLeadIds])));
  };

  const handleBulkUpdate = async (updates: LeadBulkUpdates) => {
    if (selectedLeadIds.length === 0) {
      toast.error('Select at least one lead');
      return;
    }

    setBulkUpdating(true);
    try {
      await leadService.bulkUpdate(selectedLeadIds, updates);
      const updatedCount = selectedLeadIds.length;
      setSelectedLeadIds([]);
      setIsBulkEditOpen(false);
      setReloadKey((current) => current + 1);
      toast.success(`Updated ${updatedCount} lead${updatedCount === 1 ? '' : 's'}`);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update selected leads');
    } finally {
      setBulkUpdating(false);
    }
  };

  const SortableHeader = ({
    label,
    sortKey,
    align = 'left',
  }: {
    label: string;
    sortKey: 'name' | 'leadSource' | 'assignedTo' | 'followUpDate' | 'createdAt' | 'status';
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
    filters.followUpPeriod !== 'all' ? 1 : 0,
    filters.favouritesOnly ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);
  const assigneeOptions = users.map((user) => ({ value: String(user.id), label: user.name }));
  const favouriteOwnerOptions = [
    ...(user?.id ? [{ value: String(user.id), label: 'My favourites' }] : []),
    ...favouriteUsers
      .filter((favouriteUser) => String(favouriteUser.id) !== String(user?.id || ''))
      .map((favouriteUser) => ({
        value: String(favouriteUser.id),
        label: `${favouriteUser.name}${favouriteUser.email ? ` (${favouriteUser.email})` : ''}`,
      })),
  ];
  const visibleStatusOptions = filters.showClosed
    ? LEAD_STATUS_OPTIONS
    : LEAD_STATUS_OPTIONS.filter((option) => !CLOSED_LEAD_STATUS_OPTIONS.includes(option.value));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Leads</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-stretch">
              <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                filters.favouritesOnly
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-gray-200 bg-white text-gray-700'
              } ${isAdmin ? 'rounded-r-none' : ''}`}>
                <input
                  type="checkbox"
                  checked={filters.favouritesOnly}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      favouritesOnly: event.target.checked,
                    }))
                  }
                  className="sr-only"
                />
                <Star className={`h-4 w-4 ${filters.favouritesOnly ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
                My Favourite Leads
              </label>
              {isAdmin && (
                <select
                  aria-label="Favourite lead owner"
                  value={filters.favouriteUserId}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    favouriteUserId: event.target.value,
                    favouritesOnly: true,
                    assignedTo: [],
                  }))}
                  className="min-w-40 max-w-56 rounded-r-xl border border-l-0 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {favouriteOwnerOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
            </div>
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
              type="button"
              onClick={() => setIsBulkUploadOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 font-medium text-blue-700 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              <Upload className="h-5 w-5" />
              Bulk Upload
            </button>
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
                    leadSourceOperator: 'is',
                    statuses: [],
                    statusOperator: 'is',
                    assignedTo: [],
                    assignedToOperator: 'is',
                    followUpPeriod: 'all',
                    showClosed: filters.showClosed,
                    favouritesOnly: filters.favouritesOnly,
                    favouriteUserId: filters.favouriteUserId,
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
            <MultiSelectFilter
              label="Source"
              menuLabel="Lead Sources"
              selected={filters.leadSources}
              options={LEAD_SOURCE_OPTIONS}
              operator={filters.leadSourceOperator}
              onToggle={(value) => setFilters((current) => ({
                ...current,
                leadSources: toggleFilterValue(current.leadSources, value),
              }))}
              onOperatorChange={(leadSourceOperator) => setFilters((current) => ({ ...current, leadSourceOperator }))}
            />
            <MultiSelectFilter
              label="Status"
              menuLabel="Lead Status"
              selected={filters.statuses}
              options={visibleStatusOptions}
              operator={filters.statusOperator}
              onToggle={(value) => setFilters((current) => ({
                ...current,
                statuses: toggleFilterValue(current.statuses, value),
              }))}
              onOperatorChange={(statusOperator) => setFilters((current) => ({ ...current, statusOperator }))}
            />
            <MultiSelectFilter
              label="Assignee"
              menuLabel="Assigned To"
              selected={filters.assignedTo}
              options={assigneeOptions}
              operator={filters.assignedToOperator}
              onToggle={(value) => setFilters((current) => ({
                ...current,
                assignedTo: toggleFilterValue(current.assignedTo, value),
              }))}
              onOperatorChange={(assignedToOperator) => setFilters((current) => ({ ...current, assignedToOperator }))}
            />
            <select
              aria-label="Follow up date"
              value={filters.followUpPeriod}
              onChange={(event) => setFilters((current) => ({
                ...current,
                followUpPeriod: event.target.value as FollowUpPeriod,
              }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FOLLOW_UP_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 hidden grid-cols-1 gap-3 lg:grid lg:grid-cols-5">
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
            <select
              aria-label="Follow up date"
              value={filters.followUpPeriod}
              onChange={(event) => setFilters((current) => ({
                ...current,
                followUpPeriod: event.target.value as FollowUpPeriod,
              }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FOLLOW_UP_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {selectedLeadIds.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-blue-900">
                {selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? '' : 's'} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <PencilLine className="h-4 w-4" />
                  Bulk Edit
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200">
            {loading && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center justify-center gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-medium text-blue-700"
              >
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading leads...
              </div>
            )}
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
                  className={`space-y-4 border-l-4 p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                    Number(lead.closureHotLevel) > 8
                      ? 'border-l-red-500 bg-red-50/70 hover:bg-red-100/70'
                      : `border-l-transparent ${selectedLeadIds.includes(String(lead.id)) ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${lead.name || 'lead'}`}
                      checked={selectedLeadIds.includes(String(lead.id))}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={() => toggleLeadSelection(String(lead.id))}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-gray-900">{lead.name}</div>
                      <div className="mt-1">
                        <LeadPhoneAction
                          leadId={String(lead.id)}
                          phone={lead.phone}
                          influencer={lead.influencer}
                          followUpDate={lead.followUpDate}
                          followUpDateLocked={CLOSED_LEAD_STATUS_OPTIONS.includes(lead.status)}
                          onFollowUpDateChanged={(date) => setLeads((current) => current.map((item) =>
                            item.id === lead.id ? { ...item, followUpDate: date } : item
                          ))}
                        />
                      </div>
                      {lead.email && <div className="break-words text-sm text-gray-500">{lead.email}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleFavourite(lead);
                        }}
                        disabled={favouriteUpdating.includes(lead.id)}
                        className="rounded-lg p-1.5 hover:bg-amber-50 disabled:opacity-50"
                        title={lead.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <Star className={`h-5 w-5 ${lead.isFavourite ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`} />
                      </button>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[lead.status] || statusBadgeClass.new}`}>
                        {statusLabel(lead.status)}
                      </span>
                      {Number(lead.closureHotLevel) > 8 && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">Hot {lead.closureHotLevel}</span>}
                    </div>
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
              <table className="min-w-[1240px] w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        aria-label="Select all leads on this page"
                        checked={allPageSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = somePageSelected && !allPageSelected;
                        }}
                        onChange={toggleSelectCurrentPage}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Lead" sortKey="name" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Source" sortKey="leadSource" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Assigned To" sortKey="assignedTo" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600">Requirement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Follow Up" sortKey="followUpDate" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-gray-600"><SortableHeader label="Created On" sortKey="createdAt" /></th>
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
                      className={`cursor-pointer ${Number(lead.closureHotLevel) > 8 ? 'bg-red-50/70 hover:bg-red-100/70' : selectedLeadIds.includes(String(lead.id)) ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`border-l-4 px-4 py-4 align-top ${Number(lead.closureHotLevel) > 8 ? 'border-l-red-500' : 'border-l-transparent'}`}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name || 'lead'}`}
                          checked={selectedLeadIds.includes(String(lead.id))}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleLeadSelection(String(lead.id))}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="mt-1">
                          <LeadPhoneAction
                            leadId={String(lead.id)}
                            phone={lead.phone}
                            influencer={lead.influencer}
                            followUpDate={lead.followUpDate}
                            followUpDateLocked={CLOSED_LEAD_STATUS_OPTIONS.includes(lead.status)}
                            onFollowUpDateChanged={(date) => setLeads((current) => current.map((item) =>
                              item.id === lead.id ? { ...item, followUpDate: date } : item
                            ))}
                          />
                        </div>
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
                        {Number(lead.closureHotLevel) > 8 && <div className="mt-1 text-xs font-bold text-red-700">Hot Level {lead.closureHotLevel}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleFavourite(lead);
                            }}
                            disabled={favouriteUpdating.includes(lead.id)}
                            className="rounded-lg p-2 transition-colors hover:bg-amber-50 disabled:opacity-50"
                            title={lead.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                          >
                            <Star className={`h-4 w-4 ${lead.isFavourite ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`} />
                          </button>
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
        onNext={(nextLeadId || hasNextPage) && pendingDialogPage === null ? showNextLead : undefined}
      />
      <LeadBulkUploadDialog
        open={isBulkUploadOpen}
        users={users}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploaded={() => {
          setPage(1);
          setReloadKey((current) => current + 1);
        }}
      />
      <LeadBulkEditDialog
        open={isBulkEditOpen}
        selectedCount={selectedLeadIds.length}
        users={users}
        saving={bulkUpdating}
        onOpenChange={setIsBulkEditOpen}
        onSubmit={handleBulkUpdate}
      />
    </div>
  );
};
