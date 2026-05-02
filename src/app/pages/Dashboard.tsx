import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, FileText, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { quotations } = useData();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filterQuotations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return quotations.filter(q => {
      const qDate = new Date(q.date);
      switch (dateFilter) {
        case 'today':
          return qDate >= today;
        case 'week':
          return qDate >= weekAgo;
        case 'month':
          return qDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const filteredQuotations = filterQuotations();
  const pendingApproval = quotations.filter(q => q.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Welcome back!</h2>
            <p className="text-gray-600 mt-1">Here's what's happening with your quotations today.</p>
          </div>
          <button
            onClick={() => navigate('/quotations/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-5 h-5" />
            Create Quotation
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {[
              { label: 'All Time', value: 'all' },
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'week' },
              { label: 'This Month', value: 'month' },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setDateFilter(filter.value as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  dateFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6">
          {/* Total Quotations */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Quotations</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{filteredQuotations.length}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {dateFilter === 'all' ? 'All time' : `Last ${dateFilter === 'today' ? 'day' : dateFilter}`}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending for Approval</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{pendingApproval}</p>
                <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
              </div>
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Quotations */}
        {filteredQuotations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotations</h3>
            <div className="space-y-3">
              {filteredQuotations.slice(0, 5).map(quotation => (
                <div
                  key={quotation.id}
                  onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{quotation.number}</p>
                      <p className="text-sm text-gray-500">{quotation.customer.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{quotation.grandTotal.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-500">{new Date(quotation.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quotation.status === 'approved' ? 'bg-green-50 text-green-700' :
                      quotation.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      quotation.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
