import { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { billingService } from '../../services/billingService';
import { LoadingState } from '../components/common/AsyncState';
import { TaxInvoiceDocument } from '../components/billing/TaxInvoiceDocument';

export const TaxInvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    let active = true;
    billingService.get(id!).then(result => { if (active) setInvoice(result); })
      .catch(() => { if (active) setError('Unable to load the tax invoice.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const download = async () => {
    setDownloading(true);
    try { await billingService.download(id!, invoice.invoice_number); }
    catch { toast.error('Unable to download the tax invoice.'); }
    finally { setDownloading(false); }
  };
  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><button aria-label="Back to billing" onClick={() => navigate('/billing')} className="rounded-lg border bg-white p-2"><ArrowLeft className="h-5 w-5"/></button><div><h1 className="text-2xl font-semibold">{invoice?.invoice_number || 'Tax Invoice'}</h1><p className="text-sm text-slate-500">Billing and Payments</p></div></div>{invoice && <button disabled={downloading} onClick={() => void download()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"><Download className="h-4 w-4"/>{downloading ? 'Preparing...' : 'Download Tax Invoice'}</button>}</header>{loading ? <LoadingState label="Loading tax invoice..."/> : error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p> : invoice && <TaxInvoiceDocument invoice={invoice}/>}</div></div>;
};
