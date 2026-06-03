import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Edit, Check, X, Send, Mail, Phone, MapPin, CalendarDays, FileText, Building2, BadgeIndianRupee, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { quotationService } from '../../services/quotationService';
import { mapQuotation } from '../../services/mappers';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { quotationStatusClass, quotationStatusLabel } from '../components/common/status';

export const QuotationPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    quotations,
    submitQuotationForApproval,
    approveQuotation,
    reviseQuotation,
    settings,
    adjustments: masterAdjustments,
    terms: masterTerms,
  } = useData();
  const { user } = useAuth();
  const [previewQuotation, setPreviewQuotation] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(id));
  const quotationDocumentRef = useRef<HTMLDivElement | null>(null);

  
  useEffect(() => {
    if (!id) return;

    setPreviewLoading(true);
    quotationService
      .preview(id)
      .then((preview) => {
        setPreviewQuotation(mapQuotation(preview.quotation));
      })
      .catch(() => undefined)
      .finally(() => setPreviewLoading(false));
  }, [id]);

  const quotation = previewQuotation || quotations.find((q) => q.id === id);

  if (previewLoading && !quotation) {
    return (
      <div className="p-8">
        <LoadingState label="Loading quotation preview..." />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Quotation not found</p>
          <button
            onClick={() => navigate('/quotations')}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  const canApprove = ['admin', 'operations'].includes(user?.role?.name);

  const handleSubmitForApproval = async () => {
    await submitQuotationForApproval(quotation.id);
    setPreviewQuotation({ ...quotation, status: 'pending' });
    toast.success('Quotation submitted for approval');
  };

  const handleApproval = async (status: 'approved' | 'revised') => {
    if (status === 'approved') {
      await approveQuotation(quotation.id);
      setPreviewQuotation({ ...quotation, status: 'approved' });
      toast.success('Quotation approved');
      return;
    }

    const remarks = prompt('What changes should be requested?');
    if (!remarks) return;
    await reviseQuotation(quotation.id, remarks);
    setPreviewQuotation({ ...quotation, status: 'revised' });
    toast.success('Changes requested');
  };

  const handlePrint = () => window.print();

  // const handleDownloadPdf = () => {
  //   if (!quotationDocumentRef.current) {
  //     toast.error('Quotation preview is not ready yet.');
  //     return;
  //   }

  //   const previousTitle = document.title;
  //   document.title = quotation.number || 'quotation';

  //   const restoreTitle = () => {
  //     document.title = previousTitle;
  //     window.removeEventListener('afterprint', restoreTitle);
  //   };

  //   window.addEventListener('afterprint', restoreTitle);
  //   window.print();
  // };

  const getTermContent = (termId: string) => {
    const term = masterTerms.find((t) => t.id === termId);
    return term?.content || termId;
  };

  const hasLetterhead = Boolean(settings.letterhead);
  const isPdfLetterhead = hasLetterhead && settings.letterhead.toLowerCase().includes('.pdf');

  const calculateItemAmounts = (item: any) => {
    const basePrice = item.price * item.quantity;
    const discountAmount = basePrice * (item.discount / 100);
    const afterDiscount = basePrice - discountAmount;
    const gstAmount = quotation.gstInclusive ? 0 : afterDiscount * (item.product.gstPercent / 100);

    return {
      gstAmount,
      total: afterDiscount + gstAmount,
    };
  };

  const formatMoney = (amount: number) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const totalAdjustments = Object.entries(quotation.adjustments || {}).reduce(
    (sum, [adjId, adj]: [string, any]) => {
      if (!adj.enabled) return sum;
      const adjustment = masterAdjustments.find((a) => a.id === adjId);
      if (!adjustment) return sum;
      return sum + (adjustment.type === 'percentage' ? quotation.subtotal * (adj.amount / 100) : adj.amount);
    },
    0,
  );
  const handleDownloadPdf = async () => {
    toast.loading('Preparing PDF...', {
      id: 'pdf-download',
    });

    try {
      const blob = await quotationService.downloadPdf(quotation.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${quotation.number || 'quotation'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF ready', {
        id: 'pdf-download',
      });
    } catch {
      toast.error('Unable to generate PDF', {
        id: 'pdf-download',
      });
    }
  };
  const beforeTaxTotal = quotation.subtotal + totalAdjustments;

  return (
    <div className="min-h-screen bg-slate-100 p-3 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1160px] space-y-3">
        {/* Action Bar - Hidden in print */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-slate-700 transition-all hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Quotations
          </button>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {quotation.status === 'draft' && (
              <button
                onClick={handleSubmitForApproval}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-white shadow-sm hover:bg-amber-700"
              >
                <Send className="h-5 w-5" />
                Submit for Approval
              </button>
            )}

            {quotation.status === 'pending' && canApprove && (
              <>
                <button
                  onClick={() => handleApproval('approved')}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-white shadow-sm hover:bg-green-700"
                >
                  <Check className="h-5 w-5" />
                  Approve
                </button>
                <button
                  onClick={() => handleApproval('revised')}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-white shadow-sm hover:bg-amber-700"
                >
                  <X className="h-5 w-5" />
                  Request Changes
                </button>
              </>
            )}

            <button
              onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-2.5 text-white shadow-sm hover:bg-slate-800"
            >
              <Edit className="h-5 w-5" />
              Edit
            </button>
            <button
              onClick={() => handleDownloadPdf()}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-white shadow-sm hover:bg-red-700"
            >
              <Download className="h-5 w-5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Quotation Document */}
        <div
  ref={quotationDocumentRef}
  className="quotation-print-root relative overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0"
>
          {quotation.status !== 'approved' && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              <div className="rotate-[-35deg] select-none whitespace-nowrap text-[96px] font-black tracking-[0.15em] text-slate-200/50 print:text-slate-200/35">
                PENDING APPROVAL
              </div>
            </div>
          )}

          {hasLetterhead && (
            <div className="bg-gradient-to-b from-slate-50 to-white pb-2">
              {isPdfLetterhead ? (
                <div className="space-y-3 p-4">
                  <iframe
                    src={settings.letterhead}
                    title="Company letterhead"
                    className="h-64 w-full rounded-xl border border-slate-200 print:h-52 print:rounded-none"
                  />
                  <div className="text-center text-xs text-slate-500 print:hidden">
                    If your browser blocks PDF previews,{' '}
                    <a
                      href={settings.letterhead}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      open the letterhead
                    </a>
                    .
                  </div>
                </div>
              ) : (
                <img
                  src={settings.letterhead}
                  alt="Company letterhead"
                  className="block h-36 w-full object-cover object-top print:h-40"
                />
              )}
            </div>
          )}

          <div className="relative z-20">
            {/* Premium Company Header */}
            {/* <div className="grid grid-cols-[160px_1fr_310px] items-center gap-8 px-10 py-8 print:grid-cols-[120px_1fr_260px] print:px-8 print:py-6">
              <div className="flex items-center justify-center border-r border-slate-200 pr-8">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="max-h-24 max-w-full object-contain print:max-h-20" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 text-3xl font-black text-white">
                    {settings.name?.slice(0, 2)?.toUpperCase() || 'CO'}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 print:text-xl">{settings.name}</h1>
                <div className="mt-3 space-y-1.5 text-sm font-medium text-slate-600">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span>{settings.address}</span>
                  </p>
                  {settings.gstNumber && (
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-red-600" />
                      <span>GST: {settings.gstNumber}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-8 text-sm font-semibold text-slate-700">
                {settings.email && (
                  <p className="mb-3 flex items-center gap-3">
                    <Mail className="h-4 w-4 text-red-600" />
                    {settings.email}
                  </p>
                )}
                {settings.phone && (
                  <p className="mb-3 flex items-center gap-3">
                    <Phone className="h-4 w-4 text-red-600" />
                    {settings.phone}
                  </p>
                )}
                {settings.gstNumber && (
                  <p className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-red-600" />
                    {settings.gstNumber}
                  </p>
                )}
              </div>
            </div> */}

            {/* Brand Ribbon */}
            <div className="relative mx-3 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-2 text-white print:mx-0 print:px-6 print:py-3">
              <div className="text-[2.35rem] font-black uppercase tracking-[0.22em] text-white print:text-[2rem]">
                Matrix
              </div>
              <div className="absolute left-[62%] top-0 h-full w-px rotate-[28deg] bg-red-600" />
              <div className="text-xl font-semibold uppercase tracking-[0.35em] text-white print:text-lg">Quotation</div>
            </div>

            <div className="px-5 py-3 print:px-7 print:py-5">
              {/* Customer + Quotation Meta */}
              <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
                <div>
                  <div className="border-l-4 border-red-600 pl-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">To</p>
                    <p className="mt-1.5 text-lg font-black text-slate-950">{quotation.customer.company || quotation.customer.name}</p>
                    {quotation.customer.company && <p className="text-sm font-semibold text-slate-700">{quotation.customer.name}</p>}
                    <p className="mt-1 text-sm font-medium text-slate-600">{quotation.customer.address}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                      {quotation.customer.phone && <span>Phone: {quotation.customer.phone}</span>}
                      {quotation.customer.email && <span>Email: {quotation.customer.email}</span>}
                      {quotation.customer.gstNumber && <span>GSTIN: {quotation.customer.gstNumber}</span>}
                    </div>
                  </div>

                  <div className="mt-4 max-w-2xl text-sm leading-5 text-slate-700">
                    <p className="font-bold text-slate-950">Dear Sir,</p>
                    <p>We are indeed thankful to you for showing interest in our products.</p>
                    <p>As per the discussion, please find here our most technically viable offer for your consideration.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                  <div className="grid grid-cols-[38px_1fr_1fr] items-center border-b border-slate-200 pb-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">Quote No.</p>
                    <p className="text-right text-sm font-black text-slate-950">{quotation.number}</p>
                  </div>
                  <div className="grid grid-cols-[38px_1fr_1fr] items-center border-b border-slate-200 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                      <CalendarDays className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">Date</p>
                    <p className="text-right text-sm font-black text-slate-950">{formatDate(quotation.date)}</p>
                  </div>
                  <div className="grid grid-cols-[38px_1fr_1fr] items-center pt-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                      <BadgeIndianRupee className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">Status</p>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${quotationStatusClass(quotation.status)}`}>
                        {quotationStatusLabel(quotation.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Table */}
              <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    {quotation.showDiscount ? (
                      <>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '16%' }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '27%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '15%' }} />
                      </>
                    )}
                  </colgroup>
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-950 to-slate-900 text-white">
                      <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">No.</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Product / Picture</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wide">Specifications</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">Price</th>
                      <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Qty</th>
                      {quotation.showDiscount && <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Disc%</th>}
                      <th className="px-2 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">GST</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item: any, index: number) => {
                      const { gstAmount, total } = calculateItemAmounts(item);
                      const productImage = item.product.image || item.product.imageUrl || item.product.photo || item.product.picture;

                      return (
                        <tr key={item.id} className="border-b border-slate-200 align-middle last:border-b-0">
                          <td className="border-r border-slate-200 px-2 py-4 text-center font-black text-slate-950">{index + 1}</td>
                          <td className="border-r border-slate-200 px-3 py-4 text-center">
                            <div className="mx-auto flex max-w-[220px] flex-col items-center">
                              {productImage ? (
                                <img src={productImage} alt={item.product.name} className="mb-3 h-24 w-full object-contain" />
                              ) : (
                                <div className="mb-3 flex h-24 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-400">
                                  Product Image
                                </div>
                              )}
                              <p className="text-base font-black leading-tight text-slate-950">{item.product.name}</p>
                              {item.product.modelNumber && (
                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">{item.product.modelNumber}</p>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-4 align-top text-xs leading-5 text-slate-700">
                            <div className="font-medium [&_b]:font-black [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li::marker]:text-red-600">
                              <div dangerouslySetInnerHTML={renderHtml(item.specifications || item.product.description || '')} />
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-4 text-right font-black text-slate-950">{formatMoney(item.price)}</td>
                          <td className="border-r border-slate-200 px-2 py-4 text-center font-black text-slate-950">{item.quantity}</td>
                          {quotation.showDiscount && (
                            <td className="border-r border-slate-200 px-2 py-4 text-center font-bold text-slate-700">
                              {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                            </td>
                          )}
                          <td className="border-r border-slate-200 px-2 py-4 text-right font-bold text-slate-700">
                            <div>{item.product.gstPercent}%</div>
                            <div className="mt-1 text-xs text-slate-500">{formatMoney(gstAmount)}</div>
                          </td>
                          <td className="px-3 py-4 text-right text-base font-black text-slate-950">{formatMoney(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mb-5 flex justify-end">
                <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700">
                    <span>Sub Total</span>
                    <span>{formatMoney(quotation.subtotal)}</span>
                  </div>

                  {Object.entries(quotation.adjustments || {}).map(([adjId, adj]: [string, any]) => {
                    if (!adj.enabled) return null;
                    const adjustment = masterAdjustments.find((a) => a.id === adjId);
                    if (!adjustment) return null;

                    const amount = adjustment.type === 'percentage' ? quotation.subtotal * (adj.amount / 100) : adj.amount;

                    return (
                      <div key={adjId} className="flex justify-between border-b border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">
                        <span>{adjustment.name}</span>
                        <span>{formatMoney(amount)}</span>
                      </div>
                    );
                  })}

                  {!quotation.gstInclusive && quotation.taxAmount > 0 && (
                    <>
                      <div className="flex justify-between border-b border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">
                        <span>Total Before Tax</span>
                        <span>{formatMoney(beforeTaxTotal)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">
                        <span>GST</span>
                        <span>{formatMoney(quotation.taxAmount)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between bg-red-600 px-5 py-3.5 text-white">
                    <span className="text-sm font-black uppercase tracking-wide">Grand Total</span>
                    <span className="text-2xl font-black">{formatMoney(quotation.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Terms + Company Details */}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {quotation.terms.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="inline-flex -translate-y-px items-center gap-2 rounded-br-xl rounded-tl-2xl bg-slate-950 px-3.5 py-2 text-white">
                      <FileText className="h-4 w-4 text-red-500" />
                      <h3 className="text-xs font-black uppercase tracking-wide">Terms and Conditions</h3>
                    </div>
                    <div className="space-y-1 px-3.5 pb-2.5 pt-1.5 text-xs text-slate-700">
                      {quotation.terms.map((termId: string, index: number) => (
                        <div key={termId} className="flex gap-1.5 border-b border-dashed border-slate-200 pb-1 last:border-b-0 last:pb-0">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-red-500 text-[9px] font-black text-red-600">
                            {index + 1}
                          </span>
                          <span className="font-medium leading-4.5">{getTermContent(termId)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="inline-flex -translate-y-px items-center gap-2 rounded-br-xl rounded-tl-2xl bg-slate-950 px-3.5 py-2 text-white">
                    <Building2 className="h-4 w-4 text-red-500" />
                    <h3 className="text-xs font-black uppercase tracking-wide">Company Details</h3>
                  </div>
                  <div className="grid gap-1 px-3.5 pb-3.5 pt-2 text-sm">
                    <DetailRow label="Company Name" value={settings.name} />
                    <DetailRow label="Account No." value={settings.bankDetails.accountNumber} />
                    <DetailRow label="IFSC Code" value={settings.bankDetails.ifsc} />
                    <DetailRow label="Branch" value={settings.bankDetails.branch} />
                    <DetailRow label="Bank Name" value={settings.bankDetails.bankName} />
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 pt-3.5">
                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_300px]">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <UserRound className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="max-w-xl text-sm leading-5 text-slate-700">
                        Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.
                        <br />
                        Assuring you the best quality and services all the times.
                      </p>
                      
                    </div>
                  </div>

                  <div className="text-center">
                  <p className="mt-3 text-base font-black uppercase text-slate-950">{quotation.salesperson.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-slate-600">
                        {quotation.salesperson.phone && <span>Phone: {quotation.salesperson.phone}</span>}
                        {quotation.salesperson.email && <span>Email: {quotation.salesperson.email}</span>}
                      </div>
                    {/* <div className="mx-auto mt-14 w-64 border-t-2 border-slate-950 pt-3">
                      <p className="text-sm font-black uppercase tracking-wide text-slate-950">Authorized Signature</p>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            margin: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          .quotation-print-root,
          .quotation-print-root * {
            visibility: visible;
          }

          .quotation-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            overflow: visible !important;
            margin: 0 !important;
          }

          @page { size: A4; margin: 8mm; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:ring-0 { box-shadow: none !important; }
          .print\\:h-52 { height: 13rem !important; }
          .print\\:h-40 { height: 10rem !important; }
          .print\\:text-slate-200\\/35 { color: rgba(226, 232, 240, 0.35) !important; }
          .quotation-print-root {
  background: #ffffff;
}

.quotation-print-root img {
  max-width: 100%;
}

@media print {
  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
        }
.pdf-safe,
.pdf-safe * {
  box-shadow: none !important;
}

.pdf-safe {
  background: #ffffff !important;
  color: #020617 !important;
}

.pdf-safe .bg-gradient-to-r,
.pdf-safe .from-slate-950,
.pdf-safe .via-slate-900,
.pdf-safe .to-slate-950 {
  background: #020617 !important;
  background-image: none !important;
}

.pdf-safe .bg-white { background: #ffffff !important; }
.pdf-safe .bg-slate-50,
.pdf-safe .bg-slate-50\/70 { background: #f8fafc !important; }
.pdf-safe .bg-slate-100 { background: #f1f5f9 !important; }
.pdf-safe .bg-slate-950 { background: #020617 !important; }
.pdf-safe .bg-slate-900 { background: #0f172a !important; }
.pdf-safe .bg-red-600 { background: #dc2626 !important; }

.pdf-safe .text-white { color: #ffffff !important; }
.pdf-safe .text-slate-950 { color: #020617 !important; }
.pdf-safe .text-slate-800 { color: #1e293b !important; }
.pdf-safe .text-slate-700 { color: #334155 !important; }
.pdf-safe .text-slate-600 { color: #475569 !important; }
.pdf-safe .text-slate-500 { color: #64748b !important; }
.pdf-safe .text-slate-400 { color: #94a3b8 !important; }
.pdf-safe .text-red-600,
.pdf-safe .text-red-500 { color: #dc2626 !important; }

.pdf-safe .border-slate-200 { border-color: #e2e8f0 !important; }
.pdf-safe .border-slate-300 { border-color: #cbd5e1 !important; }
.pdf-safe .border-slate-950 { border-color: #020617 !important; }
.pdf-safe .border-red-600,
.pdf-safe .border-red-500 { border-color: #dc2626 !important; }

.pdf-safe .ring-slate-200 {
  box-shadow: 0 0 0 1px #e2e8f0 !important;
}
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[140px_12px_1fr] gap-2 text-slate-800">
      <span className="font-black uppercase tracking-wide text-slate-700">{label}</span>
      <span className="font-bold text-slate-400">:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
};

const renderHtml = (value: string) => ({ __html: value });
