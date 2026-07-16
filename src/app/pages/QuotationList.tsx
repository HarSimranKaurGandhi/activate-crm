import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Calendar, Eye, Edit, Trash2, Filter, ChevronDown, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LoadingState } from '../components/common/AsyncState';
import { quotationStatusClass, quotationStatusLabel } from '../components/common/status';
import { PaginationControls, usePagination } from '../components/common/Pagination';
import { toast } from 'sonner';
import { SortableHeader, type SortDirection } from '../components/common/SortableHeader';
import { sortItems } from '../utils/sort';

export const QuotationList = () => {
  const navigate = useNavigate();
  const { quotations, loading, deleteQuotation, duplicateQuotation } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sort, setSort] = useState<{ key: 'number' | 'date' | 'customer' | 'items' | 'grandTotal' | 'status'; direction: SortDirection }>({
    key: 'date',
    direction: 'desc',
  });

  const filteredQuotations = useMemo(() => quotations.filter(q => {
    const matchesSearch = q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.customer.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const qDate = new Date(q.date);
      const startsAfter = dateRange.start ? qDate >= new Date(dateRange.start) : true;
      const endsBefore = dateRange.end ? qDate <= new Date(dateRange.end) : true;
      matchesDate = startsAfter && endsBefore;
    }

    return matchesSearch && matchesStatus && matchesDate;
  }), [quotations, searchTerm, statusFilter, dateRange]);

  const sortedQuotations = useMemo(
    () =>
      sortItems(
        filteredQuotations,
        (quotation) => {
          switch (sort.key) {
            case 'customer':
              return quotation.customer.company || quotation.customer.name || '';
            case 'items':
              return quotation.items.length;
            default:
              return quotation[sort.key];
          }
        },
        sort.direction,
      ),
    [filteredQuotations, sort],
  );
  const pagination = usePagination(sortedQuotations, 10);

  const handleDelete = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteQuotation(quotationId);
      toast.success('Quotation deleted');
    } catch {
      toast.error('Unable to delete quotation');
    }
  };

  const handleDuplicate = async (quotationId: string) => {
    try {
      const duplicated = await duplicateQuotation(quotationId);
      toast.success('Quotation duplicated');
      navigate(`/quotations/${duplicated.id}/edit`);
    } catch {
      toast.error('Unable to duplicate quotation');
    }
  };

  const toggleSort = (key: typeof sort.key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const activeFilterCount = [
    searchTerm.trim() ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
    dateRange.start ? 1 : 0,
    dateRange.end ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Quotations</h2>
          <button
            onClick={() => navigate('/quotations/new')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Create Quotation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 md:hidden">
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
                onClick={clearFilters}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className={`${showMobileFilters ? 'grid' : 'hidden'} grid-cols-1 gap-4 md:hidden`}>
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date Range - Start */}
            <div>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">End Date</span>
              </div>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="hidden md:flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Date Range:</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Quotation #" sortKey="number" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Date" sortKey="date" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Customer" sortKey="customer" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Items" sortKey="items" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Amount" sortKey="grandTotal" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <SortableHeader label="Status" sortKey="status" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} />
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagination.pageItems.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{quotation.number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(quotation.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{quotation.customer.company}</div>
                        <div className="text-sm text-gray-500">{quotation.customer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {quotation.items.length} items
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ₹{quotation.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${quotationStatusClass(quotation.status)}`}>
                        {quotationStatusLabel(quotation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDuplicate(quotation.id)}
                          className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(quotation.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={7}>
                      <LoadingState label="Loading quotations..." />
                    </td>
                  </tr>
                )}
                {!loading && sortedQuotations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No quotations found. Create your first quotation to get started.
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
        </div>
      </div>
    </div>
  );
};
