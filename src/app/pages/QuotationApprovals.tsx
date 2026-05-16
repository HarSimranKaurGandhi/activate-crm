import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Eye, FilePenLine, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { quotationStatusClass, quotationStatusLabel } from '../components/common/status';

const normalizeRole = (user: any) =>
  String(user?.role?.code || user?.role?.name || '')
    .trim()
    .toLowerCase();

export const QuotationApprovals = () => {
  const navigate = useNavigate();
  const { quotations, loading, approveQuotation, reviseQuotation } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const canManageApprovals = ['admin', 'operations'].includes(normalizeRole(user));

  const pendingQuotations = useMemo(
    () =>
      quotations
        .filter((quotation) => quotation.status === 'pending')
        .filter((quotation) => {
          const search = searchTerm.trim().toLowerCase();

          if (!search) {
            return true;
          }

          return (
            quotation.number.toLowerCase().includes(search) ||
            quotation.customer.company.toLowerCase().includes(search) ||
            quotation.customer.name.toLowerCase().includes(search)
          );
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [quotations, searchTerm],
  );

  const recentDecisions = useMemo(
    () =>
      quotations
        .filter((quotation) => ['approved', 'revised'].includes(quotation.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [quotations],
  );

  const handleApprove = async (quotationId: string) => {
    setSubmittingId(quotationId);
    try {
      await approveQuotation(quotationId);
      toast.success('Quotation approved');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRequestChanges = async (quotationId: string) => {
    const remarks = prompt('What changes should be requested?');

    if (!remarks?.trim()) {
      return;
    }

    setSubmittingId(quotationId);
    try {
      await reviseQuotation(quotationId, remarks.trim());
      toast.success('Changes requested from quotation owner');
    } finally {
      setSubmittingId(null);
    }
  };

  if (!canManageApprovals) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Only admin users can access quotation approvals.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Quotation Approvals</h2>
            <p className="mt-1 text-sm text-gray-600">
              Review quotations submitted for admin approval and send them back if updates are needed.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quotation, customer, or company"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">Pending Approval</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{pendingQuotations.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">Approved Recently</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {recentDecisions.filter((quotation) => quotation.status === 'approved').length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">Sent For Changes</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {recentDecisions.filter((quotation) => quotation.status === 'revised').length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Quotations</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Quotation</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{quotation.number}</div>
                      <div className="text-sm text-gray-500">{quotation.items.length} items</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{quotation.customer.company}</div>
                      <div className="text-sm text-gray-500">{quotation.customer.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(quotation.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ₹{quotation.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${quotationStatusClass(quotation.status)}`}>
                        {quotationStatusLabel(quotation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRequestChanges(quotation.id)}
                          disabled={submittingId === quotation.id}
                          className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
                          title="Request changes"
                        >
                          <FilePenLine className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(quotation.id)}
                          disabled={submittingId === quotation.id}
                          className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10">
                      <LoadingState label="Loading approval queue..." />
                    </td>
                  </tr>
                )}

                {!loading && pendingQuotations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No quotations are waiting for approval right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Decisions</h3>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {recentDecisions.map((quotation) => (
              <button
                key={quotation.id}
                onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
                className="rounded-2xl border border-gray-200 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{quotation.number}</p>
                    <p className="mt-1 text-sm text-gray-600">{quotation.customer.company}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${quotationStatusClass(quotation.status)}`}>
                    {quotationStatusLabel(quotation.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  {new Date(quotation.date).toLocaleDateString('en-IN')} • ₹{quotation.grandTotal.toLocaleString('en-IN')}
                </p>
              </button>
            ))}
            {recentDecisions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No approval actions yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
