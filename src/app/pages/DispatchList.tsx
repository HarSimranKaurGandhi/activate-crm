import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { dispatchService } from '../../services/dispatchService';
import { PaginationControls } from '../components/common/Pagination';
import { LoadingState } from '../components/common/AsyncState';
import { DispatchHelpBookDialog } from '../components/dispatches/DispatchHelpBookDialog';

const badge: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  invoiced: 'bg-amber-50 text-amber-700',
  dispatched: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

export const DispatchList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [meta, setMeta] = useState<any>({ total: 0, last_page: 1 });
  const [helpBookOpen, setHelpBookOpen] = useState(false);

  const load = useCallback(async (requestedPage = page, requestedSize = size) => {
    setLoading(true);
    try {
      const response = await dispatchService.list({ status, page: requestedPage, per_page: requestedSize });
      setRows(response.data || []);
      setMeta(response.meta?.pagination || {});
      setPage(requestedPage);
      setSize(requestedSize);
    } finally {
      setLoading(false);
    }
  }, [page, size, status]);

  useEffect(() => { void load(1, size); }, [status]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Dispatches</h2>
            <p className="text-sm text-gray-500">Active dispatch slips for accounts and shipping</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHelpBookOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2.5 font-medium text-blue-700 hover:bg-blue-50"
            >
              <BookOpen className="h-4 w-4" />
              Help Book
            </button>
            <button
              onClick={() => navigate('/dispatches/new')}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Dispatch
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['active', 'new', 'invoiced', 'dispatched', 'cancelled'].map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-lg px-4 py-2 text-sm ${status === value ? 'bg-blue-600 text-white' : 'border bg-white'}`}
            >
              {value === 'active' ? 'Active Dispatches' : value.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          {loading ? (
            <LoadingState label="Loading dispatches..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left">Dispatch No.</th>
                    <th className="px-5 py-4 text-left">Date</th>
                    <th className="px-5 py-4 text-left">Customer</th>
                    <th className="px-5 py-4 text-left">Status</th>
                    <th className="px-5 py-4 text-left">Created By</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4 font-medium">{row.dispatch_number}</td>
                      <td className="px-5 py-4">{row.dispatch_date}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{row.customer?.company_name || row.customer?.primary_name}</div>
                        <div className="text-xs text-gray-500">{row.customer?.primary_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge[row.status]}`}>
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">{row.created_by?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => navigate(`/dispatches/${row.id}`)} className="p-2 text-blue-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="p-10 text-center text-gray-500">No dispatches found.</div>}
            </div>
          )}
          <PaginationControls
            page={page}
            pageSize={size}
            totalItems={meta.total || 0}
            totalPages={meta.last_page || 1}
            onPageChange={(nextPage) => void load(nextPage, size)}
            onPageSizeChange={(nextSize) => void load(1, nextSize)}
          />
        </div>
      </div>

      <DispatchHelpBookDialog open={helpBookOpen} onOpenChange={setHelpBookOpen} />
    </div>
  );
};
