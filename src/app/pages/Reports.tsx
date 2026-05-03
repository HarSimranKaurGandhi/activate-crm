import { useData } from '../context/DataContext';
import { FileText, Users, Package, TrendingUp } from 'lucide-react';
import { LoadingState } from '../components/common/AsyncState';

export const Reports = () => {
  const { quotations, customers, products, loading } = useData();

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
