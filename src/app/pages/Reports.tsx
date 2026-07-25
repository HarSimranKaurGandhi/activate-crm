import { useData } from '../context/DataContext';
import { FileText, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingState } from '../components/common/AsyncState';
import { reportService } from '../../services/reportService';

export const Reports = () => {
  const { quotations, customers, products, loading } = useData();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [leaderboardDate, setLeaderboardDate] = useState(today);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [leaderboardReport, setLeaderboardReport] = useState<any>({ rows: [] });
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const formatSnapshotTimeIst = (value?: string | null) => {
    if (!value) return `Snapshot date: ${leaderboardDate}`;

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(new Date(value));
  };

  useEffect(() => {
    setLeaderboardLoading(true);
    reportService
      .leaderboard(leaderboardDate, leaderboardPeriod)
      .then(setLeaderboardReport)
      .catch(() => setLeaderboardReport({ rows: [] }))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardDate, leaderboardPeriod]);

  const totalQuotations = quotations.length;
  const approvedQuotations = quotations.filter(q => q.status === 'approved').length;
  const pendingQuotations = quotations.filter(q => q.status === 'pending').length;
  const rejectedQuotations = quotations.filter(q => q.status === 'rejected').length;

  const totalRevenue = quotations
    .filter(q => q.status === 'approved')
    .reduce((sum, q) => sum + q.grandTotal, 0);

  const avgQuotationValue = totalQuotations > 0
    ? quotations.reduce((sum, q) => sum + q.grandTotal, 0) / totalQuotations
    : 0;

  const topCustomers = customers
    .map(customer => {
      const customerQuotations = quotations.filter(q => q.customer.id === customer.id);
      const totalValue = customerQuotations.reduce((sum, q) => sum + q.grandTotal, 0);
      return { ...customer, quotationCount: customerQuotations.length, totalValue };
    })
    .filter(c => c.quotationCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  const topProducts = products
    .map(product => {
      let totalQty = 0;
      let totalRevenue = 0;
      quotations.forEach(q => {
        q.items.forEach((item: any) => {
          if (item.product.id === product.id) {
            totalQty += item.quantity;
            totalRevenue += item.price * item.quantity;
          }
        });
      });
      return { ...product, totalQty, totalRevenue };
    })
    .filter(p => p.totalQty > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h2 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h2>
        {loading && <LoadingState label="Loading reports..." />}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-6">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Trophy className="h-6 w-6 fill-amber-400 text-amber-500" />
                Leaderboard History
              </h3>
              <p className="mt-1 text-sm text-gray-500">View the leaderboard snapshot recorded for a specific day.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Snapshot Date
                </label>
                <input
                  type="date"
                  max={today}
                  value={leaderboardDate}
                  onChange={(event) => setLeaderboardDate(event.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex rounded-xl bg-gray-100 p-1">
                {[
                  { value: 'today' as const, label: 'TODAY' },
                  { value: 'week' as const, label: 'THIS WEEK' },
                  { value: 'month' as const, label: 'THIS MONTH' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLeaderboardPeriod(option.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      leaderboardPeriod === option.value
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="p-6"><LoadingState label="Loading leaderboard history..." /></div>
          ) : leaderboardReport.rows?.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      {[
                        'User',
                        leaderboardPeriod === 'today'
                          ? 'Follow Ups Due Today'
                          : leaderboardPeriod === 'week'
                            ? 'Follow Ups Due This Week'
                            : 'Follow Ups Due This Month',
                        'Past Due Follow Ups',
                        'Follow Ups Done',
                        'Success',
                        'Failed',
                        'Score',
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaderboardReport.rows.map((row: any, index: number) => (
                      <tr key={row.user_id} className={index === 0 ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <span className="mr-2 text-xs font-semibold text-gray-400">#{index + 1}</span>
                          {row.user_name}
                          {row.designation && <span className="ml-2 text-xs font-normal text-gray-500">{row.designation}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.total_due_follow_ups}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.pending_follow_ups}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.follow_ups_done}</td>
                        <td className="px-4 py-3 text-sm text-emerald-700">{row.success}</td>
                        <td className="px-4 py-3 text-sm text-rose-700">{row.failed}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-700">{Number(row.score).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-1 border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Snapshot recorded: {formatSnapshotTimeIst(leaderboardReport.calculated_at)}</span>
                <span className="font-medium text-gray-600">Timezone: IST (Asia/Kolkata)</span>
              </div>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <Trophy className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 font-medium text-gray-700">No leaderboard snapshot found</p>
              <p className="mt-1 text-sm text-gray-500">No {leaderboardPeriod} snapshot was recorded for this date.</p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Quotations</p>
            <p className="text-3xl font-bold text-gray-900">{totalQuotations}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Approved</p>
            <p className="text-3xl font-bold text-gray-900">{approvedQuotations}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-gray-900">{pendingQuotations}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-gray-900">{rejectedQuotations}</p>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8">
            <p className="text-sm font-medium text-blue-600 mb-2">Total Revenue (Approved)</p>
            <p className="text-4xl font-bold text-blue-900">
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-8">
            <p className="text-sm font-medium text-green-600 mb-2">Average Quotation Value</p>
            <p className="text-4xl font-bold text-green-900">
              ₹{avgQuotationValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{customer.company}</p>
                      <p className="text-sm text-gray-600">{customer.quotationCount} quotations</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    ₹{customer.totalValue.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No customer data available</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                    <img src={product.image} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.totalQty} units sold</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    ₹{product.totalRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No product data available</p>
          )}
        </div>
      </div>
    </div>
  );
};
