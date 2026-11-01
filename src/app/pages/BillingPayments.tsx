import { useEffect, useState } from 'react';
import { Plus, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { billingService } from '../../services/billingService';
import { PaginationControls } from '../components/common/Pagination';
import { LoadingState } from '../components/common/AsyncState';
import { invoiceMoney } from '../components/billing/TaxInvoiceDocument';
import { useAuth } from '../auth/AuthContext';

export const BillingPayments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role?.code === 'admin' || user?.module_permissions?.some((p: any) => p.module === 'billing' && p.can_view && p.can_edit);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      billingService.list({ search, page, per_page: size }).then(result => {
        if (active) { setRows(result.data || []); setMeta(result.meta?.pagination || {}); }
      }).catch(() => { if (active) setError('Unable to load billing records. Please try again.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, page, size, retry]);

  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header><h1 className="text-2xl font-semibold">Billing and Payments</h1><p className="mt-1 text-sm text-slate-500">Create and view tax invoices with HSN-wise GST details.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">Tax Invoices</h2><button onClick={() => navigate('/billing/payments')} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">Payments</button>{canEdit && <button onClick={()=>navigate('/billing/invoices/new')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4"/>Create Tax Invoice</button>}<label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="Search billing records" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search number or customer" className="rounded-xl border bg-white py-2.5 pl-9 pr-4 text-sm"/></label></div>
    <section className="overflow-hidden rounded-2xl border bg-white">{loading ? <div className="p-8"><LoadingState label="Loading billing records..."/></div> : error ? <div className="p-8 text-center"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-3 text-blue-600">Try Again</button></div> : <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-5 py-4">Invoice No.</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Customer</th><><th className="px-5 py-4">Dispatch Slip</th><th className="px-5 py-4 text-right">GST</th><th className="px-5 py-4 text-right">Invoice Total</th></><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold">{row.invoice_number}</td><td className="px-5 py-4">{String(row.invoice_date).slice(0, 10)}</td><td className="px-5 py-4">{row.customer_name}</td><><td className="px-5 py-4">{row.dispatch_number}</td><td className="px-5 py-4 text-right">₹{invoiceMoney(row.tax_total)}</td><td className="px-5 py-4 text-right font-semibold">₹{invoiceMoney(row.grand_total)}</td></><td className="px-5 py-4 text-right"><button onClick={() => navigate(`/billing/invoices/${row.id}`)} className="inline-flex items-center gap-2 font-medium text-blue-600"><FileText className="h-4 w-4"/>View Invoice</button></td></tr>)}</tbody></table>{!rows.length && <div className="p-12 text-center text-slate-500">{search ? 'No matching records.' : 'No tax invoices yet.'}</div>}</div>}
    <PaginationControls page={page} pageSize={size} totalItems={meta.total || 0} totalPages={meta.last_page || 1} onPageChange={setPage} onPageSizeChange={value => { setSize(value); setPage(1); }}/></section>
  </div></div>;
};
