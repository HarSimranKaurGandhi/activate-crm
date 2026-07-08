import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, Filter, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { PaginationControls, usePagination } from '../components/common/Pagination';
import { SortableHeader, type SortDirection } from '../components/common/SortableHeader';
import { sortItems } from '../utils/sort';

export const CustomerList = () => {
  const navigate = useNavigate();
  const { customers, deleteCustomer, loading } = useData();
  const [filters, setFilters] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    rating: 'all',
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sort, setSort] = useState<{ key: 'company' | 'name' | 'phone' | 'location' | 'rating'; direction: SortDirection }>({
    key: 'company',
    direction: 'asc',
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const companyMatch = customer.company.toLowerCase().includes(filters.company.trim().toLowerCase());
      const nameMatch = customer.name.toLowerCase().includes(filters.name.trim().toLowerCase());
      const emailMatch = customer.email.toLowerCase().includes(filters.email.trim().toLowerCase());
      const phoneMatch = customer.phone.toLowerCase().includes(filters.phone.trim().toLowerCase());
      const cityMatch = (customer.city || '').toLowerCase().includes(filters.city.trim().toLowerCase());
      const ratingMatch = filters.rating === 'all' || Number(customer.rating || 0) === Number(filters.rating);

      return companyMatch && nameMatch && emailMatch && phoneMatch && cityMatch && ratingMatch;
    });
  }, [customers, filters]);

  const sortedCustomers = useMemo(
    () =>
      sortItems(
        filteredCustomers,
        (customer) =>
          sort.key === 'location'
            ? [customer.city, customer.state].filter(Boolean).join(', ')
            : customer[sort.key],
        sort.direction,
      ),
    [filteredCustomers, sort],
  );

  const pagination = usePagination(sortedCustomers, 10);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      company: '',
      name: '',
      email: '',
      phone: '',
      city: '',
      rating: 'all',
    });
  };

  const activeFilterCount = [
    filters.company.trim() ? 1 : 0,
    filters.name.trim() ? 1 : 0,
    filters.email.trim() ? 1 : 0,
    filters.phone.trim() ? 1 : 0,
    filters.city.trim() ? 1 : 0,
    filters.rating !== 'all' ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const toggleSort = (key: typeof sort.key) => {
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Company"
                value={filters.company}
                onChange={(event) => updateFilter('company', event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Contact name"
              value={filters.name}
              onChange={(event) => updateFilter('name', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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

          <div className="mb-4 hidden grid-cols-1 gap-3 md:grid-cols-3 xl:grid xl:grid-cols-8">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Company"
                value={filters.company}
                onChange={(event) => updateFilter('company', event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Contact name"
              value={filters.name}
              onChange={(event) => updateFilter('name', event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
            <table className="min-w-[920px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Company" sortKey="company" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Contact" sortKey="name" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Phone" sortKey="phone" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Location" sortKey="location" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase"><SortableHeader label="Rating" sortKey="rating" currentKey={sort.key} direction={sort.direction} onToggle={toggleSort} /></th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagination.pageItems.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{customer.company || '-'}</div>
                      <div className="text-sm text-gray-500">{customer.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{customer.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{[customer.city, customer.state].filter(Boolean).join(', ') || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{customer.rating ? `${customer.rating}/5` : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this customer permanently?')) {
                              await deleteCustomer(customer.id);
                              toast.success('Customer deleted');
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
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>

          {loading && <LoadingState label="Loading customers..." />}
          {!loading && sortedCustomers.length === 0 && (
            <EmptyState label="No customers found. Add your first customer to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
