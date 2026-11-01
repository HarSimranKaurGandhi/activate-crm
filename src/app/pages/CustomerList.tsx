import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, Filter, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';
import { SortableHeader, type SortDirection } from '../components/common/SortableHeader';
import { customerService } from '../../services/customerService';
import { mapCustomer } from '../../services/mappers';
import { CustomerDetailsDialog } from '../components/customers/CustomerDetailsDialog';

export const CustomerList = () => {
  const navigate = useNavigate();
  const { deleteCustomer } = useData();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [reload, setReload] = useState(0);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    rating: 'all',
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: 'name' | 'phone' | 'location' | 'rating'; direction: SortDirection }>({
    key: 'name',
    direction: 'asc',
  });

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      customerService.list({
        name: filters.name.trim(), email: filters.email.trim(), phone: filters.phone.trim(), city: filters.city.trim(),
        ...(filters.rating !== 'all' ? { rating: filters.rating } : {}),
        sort_by: sort.key, sort_direction: sort.direction, page, per_page: pageSize,
      }).then(result => {
        if (!active) return;
        const pagination = result.meta?.pagination || { total: 0, last_page: 1 };
        if (page > Math.max(1, pagination.last_page)) { setPage(Math.max(1, pagination.last_page)); return; }
        setCustomers(result.data.map(mapCustomer)); setMeta(pagination);
      }).catch(() => { if (active) setError('Unable to load customers. Please try again.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [filters, sort, page, pageSize, reload]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      name: '',
      email: '',
      phone: '',
      city: '',
      rating: 'all',
    });
  };

  const activeFilterCount = [
    filters.name.trim() ? 1 : 0,
    filters.email.trim() ? 1 : 0,
    filters.phone.trim() ? 1 : 0,
    filters.city.trim() ? 1 : 0,
    filters.rating !== 'all' ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const toggleSort = (key: typeof sort.key) => {
    setPage(1);
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Customers</h2>
          <button
            onClick={() => navigate('/customers/new')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
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

          <div className={`${showMobileFilters ? 'grid' : 'hidden'} mb-4 grid-cols-1 gap-3 xl:hidden`}>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Customer name" value={filters.name} onChange={(event) => updateFilter('name', event.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
            <input
              type="text"
              placeholder="Email"
              value={filters.email}
              onChange={(event) => updateFilter('email', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Phone"
              value={filters.phone}
              onChange={(event) => updateFilter('phone', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="City"
              value={filters.city}
              onChange={(event) => updateFilter('city', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2">
              <select
                value={filters.rating}
                onChange={(event) => updateFilter('rating', event.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Ratings</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} Star</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4 hidden grid-cols-1 gap-3 md:grid-cols-3 xl:grid xl:grid-cols-7">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Customer name"
                value={filters.name}
                onChange={(event) => updateFilter('name', event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Email"
              value={filters.email}
              onChange={(event) => updateFilter('email', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Phone"
              value={filters.phone}
              onChange={(event) => updateFilter('phone', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="City"
              value={filters.city}
              onChange={(event) => updateFilter('city', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 md:col-span-3 xl:col-span-1">
              <select
                value={filters.rating}
                onChange={(event) => updateFilter('rating', event.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Ratings</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} Star</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[960px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Customer" sortKey="name" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Phone" sortKey="phone" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Location" sortKey="location" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Rating" sortKey="rating" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Importance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(!loading && !error ? customers : []).map((customer) => (
                  <tr key={customer.id} onClick={() => setSelectedCustomerId(customer.id)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{customer.name || '-'}</div><div className="text-sm text-gray-500">{customer.email || '-'}</div></td>
                    <td className="px-6 py-4 text-gray-700">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{[customer.city, customer.state].filter(Boolean).join(', ') || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{customer.rating ? `${customer.rating}/5` : '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{customer.customerImportance || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{customer.customerCategory || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(event) => { event.stopPropagation(); navigate(`/customers/${customer.id}/edit`); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async (event) => {
                            event.stopPropagation();
                            if (confirm('Delete this customer permanently?')) {
                              try { await deleteCustomer(customer.id); setReload(value => value + 1); toast.success('Customer deleted'); }
                              catch (failure: any) { toast.error(failure.message || 'Unable to delete customer'); }
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={meta.total}
              totalPages={meta.last_page}
              onPageChange={setPage}
              onPageSizeChange={size => { setPageSize(size); setPage(1); }}
            />
          </div>

          {error && <p role="alert" className="py-4 text-red-600">{error} <button onClick={() => setReload(value => value + 1)} className="underline">Retry</button></p>}
          {loading && <LoadingState label="Loading customers..." />}
          {!loading && !error && customers.length === 0 && (
            <EmptyState label="No customers match the current filters." />
          )}
        </div>
      </div>
      <CustomerDetailsDialog
        customerId={selectedCustomerId}
        open={Boolean(selectedCustomerId)}
        onOpenChange={(open) => { if (!open) setSelectedCustomerId(null); }}
      />
    </div>
  );
};
