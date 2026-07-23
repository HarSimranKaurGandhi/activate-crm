import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Edit, FileDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { dispatchService } from '../../services/dispatchService';
import { LoadingState } from '../components/common/AsyncState';
import { toast } from 'sonner';

const money = (value: any) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DispatchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) void dispatchService.get(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  const download = async () => {
    if (!slipRef.current || !data) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2, backgroundColor: '#fff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = 190;
    const height = canvas.height * width / canvas.width;
    const pageHeight = 277;
    const image = canvas.toDataURL('image/png');
    let position = 0;
    pdf.addImage(image, 'PNG', 10, 10, width, height);
    while (height - position > pageHeight) {
      position += pageHeight;
      pdf.addPage();
      pdf.addImage(image, 'PNG', 10, 10 - position, width, height);
    }
    pdf.save(`${data.dispatch_number}.pdf`);
  };

  const statusChanged = async (status: string) => {
    if (!id || status !== 'new' || data.status !== 'invoiced') return;
    if (!confirm('Change this dispatch back to NEW? The uploaded invoice will be removed.')) return;
    try {
      setData(await dispatchService.reopen(id));
      toast.success('Dispatch changed back to NEW');
    } catch {}
  };

  if (loading) return <LoadingState label="Loading dispatch..." />;
  if (!data) return null;

  const customer = data.customer || {};
  const taxableTotal = data.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.discounted_price || 0), 0);
  const totalGst = data.items.reduce(
    (sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.discounted_price || 0) * Number(item.gst_percent || 0) / 100,
    0,
  );
  const gstBreakup: any[] = Object.values(data.items.reduce((groups: any, item: any) => {
    const hsn = item.hsn_code || 'Unspecified';
    const gstPercent = Number(item.gst_percent || 0);
    const key = `${hsn}-${gstPercent}`;
    if (!groups[key]) groups[key] = { hsn, gstPercent, taxableValue: 0, gstAmount: 0 };
    groups[key].taxableValue += Number(item.quantity || 0) * Number(item.discounted_price || 0);
    groups[key].gstAmount += Number(item.quantity || 0) * Number(item.discounted_price || 0) * gstPercent / 100;
    return groups;
  }, {}));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dispatches')} className="p-2"><ArrowLeft /></button>
            <div><h2 className="text-2xl font-semibold">{data.dispatch_number}</h2><p className="text-sm text-gray-500">Dispatch Slip</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.status === 'invoiced' ? (
              <select value={data.status} onChange={(event) => void statusChanged(event.target.value)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
                <option value="invoiced">INVOICED</option>
                <option value="new">NEW</option>
              </select>
            ) : (
              <span className={`inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold ${data.status === 'new' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{data.status.toUpperCase()}</span>
            )}
            {data.status === 'new' && <button onClick={() => navigate(`/dispatches/${id}/edit`)} className="flex items-center gap-2 rounded-xl border px-4 py-2.5"><Edit className="h-4 w-4" />Edit</button>}
            {data.invoice_url && <a href={data.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border px-4 py-2.5"><FileDown className="h-4 w-4" />Download Invoice</a>}
            <button onClick={() => void download()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white"><Download className="h-4 w-4" />Download Slip</button>
          </div>
        </div>

        <div ref={slipRef} className="rounded-2xl border bg-white p-8">
          <div className="border-b pb-5 text-center"><h1 className="text-3xl font-bold">DISPATCH SLIP</h1><div className="mt-2 text-gray-600">{data.dispatch_number}</div><div className="mt-1 text-sm text-gray-500">Voucher Date: {data.dispatch_date} • Planned Dispatch Date: {data.planned_dispatch_date}</div></div>
          <div className="grid gap-6 border-b py-6 md:grid-cols-2">
            <div><div className="text-xs font-semibold uppercase text-gray-500">Customer</div><div className="mt-2 text-lg font-semibold">{customer.company_name || customer.primary_name}</div><div>{customer.primary_name}</div><div>{customer.phone}</div><div>{customer.email}</div></div>
            <div><div className="text-xs font-semibold uppercase text-gray-500">Shipping Address</div><div className="mt-2">{[customer.address_line_1, customer.address_line_2, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ') || '-'}</div><div className="mt-4"><span className="font-medium">Stage:</span> {data.status.toUpperCase()}</div></div>
          </div>

          <table className="mt-6 w-full">
            <thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">#</th><th className="p-3 text-left">Requirement</th><th className="p-3 text-left">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Discount</th><th className="p-3 text-right">Final Price</th><th className="p-3 text-right">Amount</th></tr></thead>
            <tbody>{data.items.map((item: any, index: number) => <tr key={item.id} className="border-b"><td className="p-3">{index + 1}</td><td className="p-3">{item.requirement}</td><td className="p-3"><div className="font-medium">{item.product || 'Custom requirement'}</div><div className="text-xs text-gray-500">{item.product && <>{item.model_number} • {item.brand}<br /></>}HSN: {item.hsn_code || '-'} • GST: {item.gst_percent}%</div></td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{money(item.price)}</td><td className="p-3 text-right">{item.discount_percent}%</td><td className="p-3 text-right">{money(item.discounted_price)}</td><td className="p-3 text-right font-semibold">{money(Number(item.quantity) * Number(item.discounted_price))}</td></tr>)}</tbody>
            <tfoot>
              <tr><td colSpan={7} className="p-3 text-right font-semibold">Taxable Total</td><td className="p-3 text-right font-semibold">{money(taxableTotal)}</td></tr>
              <tr><td colSpan={7} className="p-3 text-right font-semibold">Total GST Applicable</td><td className="p-3 text-right font-semibold">{money(totalGst)}</td></tr>
              <tr><td colSpan={7} className="p-3 text-right text-lg font-bold">Grand Total</td><td className="p-3 text-right text-lg font-bold">{money(taxableTotal + totalGst)}</td></tr>
            </tfoot>
          </table>

          <div className="mt-8">
            <h3 className="mb-3 text-lg font-semibold">GST Breakup by HSN</h3>
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">HSN</th><th className="p-3 text-right">GST %</th><th className="p-3 text-right">Taxable Value</th><th className="p-3 text-right">GST Amount</th></tr></thead>
              <tbody>{gstBreakup.map((row) => <tr key={`${row.hsn}-${row.gstPercent}`} className="border-b"><td className="p-3">{row.hsn}</td><td className="p-3 text-right">{row.gstPercent}%</td><td className="p-3 text-right">{money(row.taxableValue)}</td><td className="p-3 text-right">{money(row.gstAmount)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={3} className="p-3 text-right font-semibold">Total GST</td><td className="p-3 text-right font-bold">{money(totalGst)}</td></tr></tfoot>
            </table>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm"><div className="border-t pt-2">Prepared By: {data.created_by?.name || '-'}</div><div className="border-t pt-2">Authorised Signature</div></div>
        </div>
      </div>
    </div>
  );
};
