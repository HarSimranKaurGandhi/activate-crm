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
import { useReactToPrint } from 'react-to-print';

export const QuotationPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    quotations,
    submitQuotationForApproval,
    approveQuotation,
    rejectQuotation,
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

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      await approveQuotation(quotation.id);
      setPreviewQuotation({ ...quotation, status: 'approved' });
      toast.success('Quotation approved');
      return;
    }

    const remarks = prompt('Reject reason');
    if (!remarks) return;
    await rejectQuotation(quotation.id, remarks);
    setPreviewQuotation({ ...quotation, status: 'rejected' });
    toast.success('Quotation rejected');
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
  const handleDownloadPdf = useReactToPrint({
    contentRef: quotationDocumentRef,
  
    documentTitle: quotation.number || 'quotation',
  
    pageStyle: `
      @page {
        size: A4;
        margin: 8mm;
      }
  
      html, body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
  
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
  
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box;
      }
  
      .quotation-print-root {
        width: 100% !important;
        overflow: visible !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        transform: scale(1) !important;
      }
  
      img {
        max-width: 100%;
        object-fit: contain;
      }
  
      table {
        page-break-inside: auto;
      }
  
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
  
      .print-hidden {
        display: none !important;
      }
    `,
  
    onBeforePrint: async () => {
      toast.loading('Preparing PDF...', {
        id: 'pdf-download',
      });
  
      // wait for images/fonts
      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );
    },
  
    onAfterPrint: () => {
      toast.success('PDF ready', {
        id: 'pdf-download',
      });
    },
  });
  const beforeTaxTotal = quotation.subtotal + totalAdjustments;

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1180px] space-y-5">
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
                  onClick={() => handleApproval('rejected')}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-white shadow-sm hover:bg-red-700"
                >
                  <X className="h-5 w-5" />
                  Reject
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
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-5 w-5" />
              Print
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
            <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
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
            <div className="relative flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-10 py-5 text-white print:px-8 print:py-4">
              <div className="text-5xl font-black uppercase tracking-[0.28em] text-white print:text-4xl">
                Matrix
              </div>
              <div className="absolute left-[62%] top-0 h-full w-px rotate-[28deg] bg-red-600" />
              <div className="text-2xl font-semibold uppercase tracking-[0.45em] text-white print:text-xl">Quotation</div>
            </div>

            <div className="px-10 py-8 print:px-8 print:py-6">
              {/* Customer + Quotation Meta */}
              <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_360px]">
                <div>
                  <div className="border-l-4 border-red-600 pl-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">To</p>
                    <p className="mt-2 text-xl font-black text-slate-950">{quotation.customer.company || quotation.customer.name}</p>
                    {quotation.customer.company && <p className="text-sm font-semibold text-slate-700">{quotation.customer.name}</p>}
                    <p className="mt-1 text-sm font-medium text-slate-600">{quotation.customer.address}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
                      {quotation.customer.phone && <span>Phone: {quotation.customer.phone}</span>}
                      {quotation.customer.email && <span>Email: {quotation.customer.email}</span>}
                      {quotation.customer.gstNumber && <span>GSTIN: {quotation.customer.gstNumber}</span>}
                    </div>
                  </div>

                  <div className="mt-8 max-w-2xl text-sm leading-6 text-slate-700">
                    <p className="font-bold text-slate-950">Dear Sir,</p>
                    <p>We are indeed thankful to you for showing interest in our products.</p>
                    <p>As per the discussion, please find here our most technically viable offer for your consideration.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <div className="grid grid-cols-[46px_1fr_1fr] items-center border-b border-slate-200 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">Quote No.</p>
                    <p className="text-right text-sm font-black text-slate-950">{quotation.number}</p>
                  </div>
                  <div className="grid grid-cols-[46px_1fr_1fr] items-center border-b border-slate-200 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">Date</p>
                    <p className="text-right text-sm font-black text-slate-950">{formatDate(quotation.date)}</p>
                  </div>
                  <div className="grid grid-cols-[46px_1fr_1fr] items-center pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                      <BadgeIndianRupee className="h-5 w-5" />
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
              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-950 to-slate-900 text-white">
                      <th className="w-14 px-3 py-3 text-center text-xs font-black uppercase tracking-wide">No.</th>
                      <th className="w-56 px-4 py-3 text-center text-xs font-black uppercase tracking-wide">Product / Picture</th>
                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide">Specifications</th>
                      <th className="w-28 px-4 py-3 text-right text-xs font-black uppercase tracking-wide">Price</th>
                      <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-wide">Qty</th>
                      {quotation.showDiscount && <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-wide">Disc%</th>}
                      <th className="w-28 px-4 py-3 text-right text-xs font-black uppercase tracking-wide">GST</th>
                      <th className="w-32 px-4 py-3 text-right text-xs font-black uppercase tracking-wide">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item: any, index: number) => {
                      const { gstAmount, total } = calculateItemAmounts(item);
                      const productImage = item.product.image || item.product.imageUrl || item.product.photo || item.product.picture;

                      return (
                        <tr key={item.id} className="border-b border-slate-200 align-middle last:border-b-0">
                          <td className="border-r border-slate-200 px-3 py-6 text-center font-black text-slate-950">{index + 1}</td>
                          <td className="border-r border-slate-200 px-4 py-6 text-center">
                            <div className="mx-auto flex max-w-[190px] flex-col items-center">
                              {productImage ? (
                                <img src={productImage} alt={item.product.name} className="mb-4 h-32 w-full object-contain" />
                              ) : (
                                <div className="mb-4 flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-400">
                                  Product Image
                                </div>
                              )}
                              <p className="text-base font-black leading-tight text-slate-950">{item.product.name}</p>
                              {item.product.modelNumber && (
                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">{item.product.modelNumber}</p>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-5 py-6 align-top text-xs leading-5 text-slate-700">
                            <div className="font-medium [&_b]:font-black [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li::marker]:text-red-600">
                              <div dangerouslySetInnerHTML={renderHtml(item.specifications || item.product.description || '')} />
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-4 py-6 text-right font-black text-slate-950">{formatMoney(item.price)}</td>
                          <td className="border-r border-slate-200 px-4 py-6 text-center font-black text-slate-950">{item.quantity}</td>
                          {quotation.showDiscount && (
                            <td className="border-r border-slate-200 px-4 py-6 text-center font-bold text-slate-700">
                              {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                            </td>
                          )}
                          <td className="border-r border-slate-200 px-4 py-6 text-right font-bold text-slate-700">
                            <div>{item.product.gstPercent}%</div>
                            <div className="mt-1 text-xs text-slate-500">{formatMoney(gstAmount)}</div>
                          </td>
                          <td className="px-4 py-6 text-right text-base font-black text-slate-950">{formatMoney(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mb-8 flex justify-end">
                <div className="w-full max-w-[390px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700">
                    <span>Sub Total</span>
                    <span>{formatMoney(quotation.subtotal)}</span>
                  </div>

                  {Object.entries(quotation.adjustments || {}).map(([adjId, adj]: [string, any]) => {
                    if (!adj.enabled) return null;
                    const adjustment = masterAdjustments.find((a) => a.id === adjId);
                    if (!adjustment) return null;

                    const amount = adjustment.type === 'percentage' ? quotation.subtotal * (adj.amount / 100) : adj.amount;

                    return (
                      <div key={adjId} className="flex justify-between border-b border-slate-200 px-6 py-3 text-sm font-bold text-slate-700">
                        <span>{adjustment.name}</span>
                        <span>{formatMoney(amount)}</span>
                      </div>
                    );
                  })}

                  {!quotation.gstInclusive && quotation.taxAmount > 0 && (
                    <>
                      <div className="flex justify-between border-b border-slate-200 px-6 py-3 text-sm font-bold text-slate-700">
                        <span>Total Before Tax</span>
                        <span>{formatMoney(beforeTaxTotal)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 px-6 py-3 text-sm font-bold text-slate-700">
                        <span>GST</span>
                        <span>{formatMoney(quotation.taxAmount)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between bg-red-600 px-6 py-4 text-white">
                    <span className="text-sm font-black uppercase tracking-wide">Grand Total</span>
                    <span className="text-2xl font-black">{formatMoney(quotation.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Terms + Company Details */}
              <div className="mb-8 grid grid-cols-1 gap-7 md:grid-cols-2">
                {quotation.terms.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="inline-flex -translate-y-px items-center gap-3 rounded-br-xl rounded-tl-2xl bg-slate-950 px-5 py-3 text-white">
                      <FileText className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-black uppercase tracking-wide">Terms and Conditions</h3>
                    </div>
                    <div className="space-y-3 px-6 pb-6 pt-3 text-sm text-slate-700">
                      {quotation.terms.map((termId: string, index: number) => (
                        <div key={termId} className="flex gap-3 border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-500 text-[10px] font-black text-red-600">
                            {index + 1}
                          </span>
                          <span className="font-medium leading-5">{getTermContent(termId)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="inline-flex -translate-y-px items-center gap-3 rounded-br-xl rounded-tl-2xl bg-slate-950 px-5 py-3 text-white">
                    <Building2 className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wide">Company Details</h3>
                  </div>
                  <div className="grid gap-2 px-6 pb-6 pt-3 text-sm">
                    <DetailRow label="Company Name" value={settings.name} />
                    <DetailRow label="Account No." value={settings.bankDetails.accountNumber} />
                    <DetailRow label="IFSC Code" value={settings.bankDetails.ifsc} />
                    <DetailRow label="Branch" value={settings.bankDetails.branch} />
                    <DetailRow label="Bank Name" value={settings.bankDetails.bankName} />
                    <DetailRow label="Email" value={settings.email} />
                    <DetailRow label="Mobile" value={settings.phone} />
                    <DetailRow label="GST" value={settings.gstNumber} />
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 pt-6">
                <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-[1fr_320px]">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <UserRound className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="max-w-xl text-sm leading-6 text-slate-700">
                        Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.
                        <br />
                        Assuring you the best quality and services all the times.
                      </p>
                      <p className="mt-3 text-base font-black uppercase text-slate-950">{quotation.salesperson.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-slate-600">
                        {quotation.salesperson.phone && <span>Phone: {quotation.salesperson.phone}</span>}
                        {quotation.salesperson.email && <span>Email: {quotation.salesperson.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mt-14 w-64 border-t-2 border-slate-950 pt-3">
                      <p className="text-sm font-black uppercase tracking-wide text-slate-950">Authorized Signature</p>
                    </div>
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
