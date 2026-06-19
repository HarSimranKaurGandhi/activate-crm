import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Edit, Check, X, Send, Mail, Phone, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { quotationService } from '../../services/quotationService';
import { mapQuotation } from '../../services/mappers';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';

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

  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();
  const canApprove = ['admin', 'sales_manager'].includes(role);

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
    const netAmount = basePrice - discountAmount;
    const gstAmount = quotation.gstInclusive ? 0 : netAmount * (item.product.gstPercent / 100);
    const discountedUnitPrice = item.quantity > 0 ? netAmount / item.quantity : 0;

    return {
      discountedUnitPrice,
      netAmount,
      gstAmount,
      total: netAmount + gstAmount,
    };
  };

  const displayRoundedAmount = (amount: number) => (
    quotation.roundOffNetAmount ? Math.round(amount || 0) : amount
  );

  const maskPhone = (value?: string) => {
    const phone = String(value || '').trim();
    if (!phone) return '';
    if (phone.length <= 1) return `${phone}****`;
    return `${phone.slice(0, 1)}****`;
  };

  const formatMoney = (amount: number, options?: { whole?: boolean }) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: options?.whole ? 0 : 0,
      maximumFractionDigits: options?.whole ? 0 : 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const validityLabel = quotation.validUntil
    ? formatDate(quotation.validUntil)
    : `${settings.defaultValidityDays || 30} Days from Date of Issue`;

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
  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-3 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1160px] space-y-3">
        {/* Action Bar - Hidden in print */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition-all hover:bg-white sm:px-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Quotations
          </button>

          <div className="flex flex-wrap items-stretch justify-start gap-2 sm:justify-end sm:gap-3">
            {quotation.status === 'draft' && (
              <button
                onClick={handleSubmitForApproval}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-white shadow-sm hover:bg-amber-700"
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
                <div className="bg-gradient-to-b from-slate-50 to-white print:px-0 print:py-0">
                  <img
                    src={settings.letterhead}
                    alt="Company letterhead"
                    className="block w-full object-cover object-top"
                  />
                </div>
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

            {!hasLetterhead && (
              <div className="mx-3 mt-3 grid grid-cols-1 border-y border-slate-200 sm:mx-5 sm:mt-5 md:grid-cols-[140px_1fr_320px] md:items-center print:mx-7">
                <div className="flex items-center justify-center py-5 md:py-5">
                  {settings.logo ? (
                    <img src={settings.logo} alt={settings.name} className="max-h-24 max-w-[108px] object-contain" />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center border border-red-500 text-5xl font-black tracking-tight text-slate-950">
                      {(settings.name || 'R3').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 px-4 py-5 text-center md:border-l md:border-t-0 md:px-6 md:text-left">
                  <h1 className="text-[1.45rem] font-black uppercase tracking-tight text-slate-950 sm:text-[1.8rem] md:text-[2.1rem]">{settings.name}</h1>
                  <div className="mt-3 max-w-xl space-y-1 text-sm leading-6 text-slate-700 md:leading-7">
                    {settings.address.split(', ').filter(Boolean).map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-200 px-4 py-5 text-sm text-slate-800 md:border-l md:border-t-0 md:px-6">
                  {settings.email && (
                    <div className="mb-4 flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-700" />
                      <span>Email: {settings.email}</span>
                    </div>
                  )}
                  {settings.phone && (
                    <div className="mb-4 flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-700" />
                      <span>Mobile: {settings.phone}</span>
                    </div>
                  )}
                  {settings.gstNumber && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <span>GST: {settings.gstNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mx-3 mt-3 grid grid-cols-1 border-t-[3px] border-red-600 sm:mx-5 md:grid-cols-[1.45fr_0.55fr] print:mx-7">
              <div className="bg-black px-4 py-3 text-center text-[1rem] font-black uppercase tracking-[0.18em] text-white sm:px-8 sm:text-[1.35rem] md:text-left md:text-[2.05rem] md:tracking-[0.24em]">
                {settings.name}
              </div>
              <div className="bg-red-600 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.24em] text-white sm:px-8 sm:text-base md:text-xl md:tracking-[0.32em]">
                Quotation
              </div>
            </div>

            <div className="px-3 py-4 sm:px-5 sm:py-6 print:px-7 print:py-5">
              {/* Customer + Quotation Meta */}
              <div className="mb-6 grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-[1fr_390px]">
                <div>
                  <div>
                    <div className="mb-4">
                      <p className="text-[1.05rem] font-black uppercase tracking-wide text-slate-950">Client Details</p>
                      <div className="mt-2 h-px w-full max-w-[390px] bg-slate-200" />
                      <div className="mt-[-1px] h-px w-24 bg-red-500" />
                    </div>
                    <p className="text-xl font-black text-slate-950 sm:text-2xl">{quotation.customer.company || quotation.customer.name}</p>
                    {quotation.customer.company && <p className="text-sm font-semibold text-slate-700">{quotation.customer.name}</p>}
                    <p className="mt-3 text-sm font-medium leading-6 sm:leading-7 text-slate-700">{quotation.customer.address}</p>
                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                      {quotation.customer.phone && <span>Phone: {maskPhone(quotation.customer.phone)}</span>}
                      {(quotation.customer.phone && quotation.customer.email) && <span className="text-slate-400">|</span>}
                      {quotation.customer.email && <span>Email: {quotation.customer.email}</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <p className="text-[1.05rem] font-black uppercase tracking-wide text-slate-950">Quotation Details</p>
                    <div className="mt-2 h-px w-full bg-slate-200" />
                    <div className="mt-[-1px] h-px w-28 bg-red-500" />
                  </div>
                  <div className="overflow-hidden border border-slate-300 bg-white">
                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-300 sm:grid-cols-[130px_1fr]">
                      <div className="border-r border-slate-300 px-4 py-3 text-sm font-black text-slate-950 sm:px-6 sm:py-4">Quote No</div>
                      <div className="px-4 py-3 text-sm text-slate-800 sm:px-6 sm:py-4">{quotation.number}</div>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-300 sm:grid-cols-[130px_1fr]">
                      <div className="border-r border-slate-300 px-4 py-3 text-sm font-black text-slate-950 sm:px-6 sm:py-4">Date</div>
                      <div className="px-4 py-3 text-sm text-slate-800 sm:px-6 sm:py-4">{formatDate(quotation.date)}</div>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr]">
                      <div className="border-r border-slate-300 px-4 py-3 text-sm font-black text-slate-950 sm:px-6 sm:py-4">Validity</div>
                      <div className="px-4 py-3 text-sm text-slate-800 sm:px-6 sm:py-4">{validityLabel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 border-t border-slate-300 pt-4 text-sm leading-7 text-slate-800 sm:mb-7 sm:pt-5 sm:text-[15px] sm:leading-8">
                <p className="font-bold text-slate-950">Dear Sir,</p>
                <p>We are indeed thankful to you for showing interest in our products.</p>
                <p>As per the discussion, please find here our most technically viable offer for your consideration.</p>
              </div>

              {/* Product Table */}
              <div className="mb-5 hidden overflow-x-auto border border-slate-300 md:block">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    {quotation.showDiscount && quotation.showItemWiseGst ? (
                      <>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '21%' }} />
                        <col style={{ width: '38%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                      </>
                    ) : quotation.showDiscount ? (
                      <>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '42%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '5%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '11%' }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '23%' }} />
                        <col style={{ width: '44%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '4%' }} />
                        {quotation.showItemWiseGst ? (
                          <>
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '9%' }} />
                          </>
                        ) : (
                          <col style={{ width: '16%' }} />
                        )}
                      </>
                    )}
                  </colgroup>
                  <thead>
                    <tr className="border-t-2 border-red-600 bg-black text-white">
                      <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">No.</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Product / Picture</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wide">Specifications</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">Price</th>
                      <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Qty</th>
                      {quotation.showDiscount && <th className="px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wide">Disc%</th>}
                      {quotation.showItemWiseGst && <th className="px-2 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">GST</th>}
                      <th className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wide">
                        {quotation.gstInclusive ? 'Amount' : 'Net Amount'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item: any, index: number) => {
                      const { gstAmount, netAmount, discountedUnitPrice } = calculateItemAmounts(item);
                      const productImage = item.product.image || item.product.imageUrl || item.product.photo || item.product.picture;
                      const displayPrice = displayRoundedAmount(quotation.showMrp ? item.price : discountedUnitPrice);
                      const displayAmount = displayRoundedAmount(quotation.gstInclusive ? item.lineTotal : netAmount);

                      return (
                        <tr key={item.id} className="border-b border-slate-200 align-middle last:border-b-0">
                          <td className="border-r border-slate-200 px-2 py-4 text-center font-black text-slate-950">{index + 1}</td>
                          <td className="border-r border-slate-200 px-3 py-4 text-center">
                            <div className="mx-auto flex max-w-[250px] flex-col items-center">
                              {productImage ? (
                                <img src={productImage} alt={item.product.name} className="mb-3 h-36 w-full object-contain" />
                              ) : (
                                <div className="mb-3 flex h-36 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-400">
                                  Product Image
                                </div>
                              )}
                              <p className="text-base font-black leading-tight text-slate-950">{item.product.name}</p>
                              {item.product.modelNumber && (
                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">{item.product.modelNumber}</p>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-4 align-top text-[8.5px] leading-[1.24] text-slate-700">
                            <div className="quotation-specs font-medium [&_b]:font-black [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li::marker]:text-red-600">
                              <div dangerouslySetInnerHTML={renderHtml(item.specifications || item.product.description || '')} />
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3 py-4 text-right font-black text-slate-950">
                            {formatMoney(displayPrice, { whole: quotation.roundOffNetAmount })}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-4 text-center font-black text-slate-950">{item.quantity}</td>
                          {quotation.showDiscount && (
                            <td className="border-r border-slate-200 px-2 py-4 text-center font-bold text-slate-700">
                              {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                            </td>
                          )}
                          {quotation.showItemWiseGst && (
                            <td className="border-r border-slate-200 px-2 py-4 text-right font-bold text-slate-700">
                              <div>{item.product.gstPercent}%</div>
                              <div className="mt-1 text-xs text-slate-500">{formatMoney(gstAmount, { whole: quotation.roundOffNetAmount })}</div>
                            </td>
                          )}
                          <td className="px-3 py-4 text-right text-base font-black text-slate-950">
                            {formatMoney(displayAmount, { whole: quotation.roundOffNetAmount })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mb-5 space-y-4 md:hidden">
                {quotation.items.map((item: any, index: number) => {
                  const { gstAmount, netAmount, discountedUnitPrice } = calculateItemAmounts(item);
                  const productImage = item.product.image || item.product.imageUrl || item.product.photo || item.product.picture;
                  const displayPrice = displayRoundedAmount(quotation.showMrp ? item.price : discountedUnitPrice);
                  const displayAmount = displayRoundedAmount(quotation.gstInclusive ? item.lineTotal : netAmount);

                  return (
                    <div key={item.id} className="overflow-hidden border border-slate-300 bg-white">
                      <div className="border-t-2 border-red-600 bg-black px-4 py-2 text-sm font-black uppercase tracking-wide text-white">
                        Item {index + 1}
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex gap-3">
                          {productImage ? (
                            <img src={productImage} alt={item.product.name} className="h-20 w-20 shrink-0 object-contain" />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-slate-100 text-[11px] font-semibold text-slate-400">
                              No Image
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-base font-black leading-tight text-slate-950">{item.product.name}</p>
                            {item.product.modelNumber && (
                              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">{item.product.modelNumber}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-[8.5px] leading-[1.24] text-slate-700">
                          <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-950">Specifications</div>
                          <div className="quotation-specs [&_b]:font-black [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5">
                            <div dangerouslySetInnerHTML={renderHtml(item.specifications || item.product.description || '')} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <MobileMetric label="Price" value={formatMoney(displayPrice, { whole: quotation.roundOffNetAmount })} />
                          <MobileMetric label="Qty" value={String(item.quantity)} />
                          {quotation.showDiscount && <MobileMetric label="Disc%" value={item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'} />}
                          {quotation.showItemWiseGst && <MobileMetric label="GST" value={`${item.product.gstPercent}% (${formatMoney(gstAmount, { whole: quotation.roundOffNetAmount })})`} />}
                          <MobileMetric
                            label={quotation.gstInclusive ? 'Amount' : 'Net Amount'}
                            value={formatMoney(displayAmount, { whole: quotation.roundOffNetAmount })}
                            strong
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="mb-5 flex justify-end">
                <div className="w-full max-w-[520px] overflow-hidden border border-slate-300">
                  <div className="grid grid-cols-[1.1fr_0.9fr] border-b border-slate-300 sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="px-4 py-3 text-sm text-slate-800 sm:px-6">Sub Total</div>
                    <div className="border-l border-slate-300 px-4 py-3 text-right text-sm text-slate-800 sm:px-6">{formatMoney(quotation.subtotal)}</div>
                  </div>

                  {Object.entries(quotation.adjustments || {}).map(([adjId, adj]: [string, any]) => {
                    if (!adj.enabled) return null;
                    const adjustment = masterAdjustments.find((a) => a.id === adjId);
                    if (!adjustment) return null;

                    const amount = adjustment.type === 'percentage' ? quotation.subtotal * (adj.amount / 100) : adj.amount;

                    return (
                      <div key={adjId} className="grid grid-cols-[1.1fr_0.9fr] border-b border-slate-300 sm:grid-cols-[1.2fr_0.8fr]">
                        <div className="px-4 py-3 text-sm text-slate-800 sm:px-6">{adjustment.name}</div>
                        <div className="border-l border-slate-300 px-4 py-3 text-right text-sm text-slate-800 sm:px-6">{formatMoney(amount)}</div>
                      </div>
                    );
                  })}

                  {!quotation.gstInclusive && quotation.taxAmount > 0 && (
                    <>
                      <div className="grid grid-cols-[1.1fr_0.9fr] border-b border-slate-300 sm:grid-cols-[1.2fr_0.8fr]">
                        <div className="px-4 py-3 text-sm text-slate-800 sm:px-6">GST</div>
                        <div className="border-l border-slate-300 px-4 py-3 text-right text-sm text-slate-800 sm:px-6">{formatMoney(quotation.taxAmount, { whole: quotation.roundOffNetAmount })}</div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-[1.1fr_0.9fr] bg-black text-white sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="px-4 py-3 text-lg font-black uppercase tracking-wide sm:px-6 sm:text-2xl">Grand Total</div>
                    <div className="border-l border-white/20 px-4 py-3 text-right text-lg font-black sm:px-6 sm:text-2xl">{formatMoney(quotation.grandTotal)}</div>
                  </div>
                </div>
              </div>

              {/* Terms + Company Details */}
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                {quotation.terms.length > 0 && (
                  <section className="border border-slate-300 bg-white px-4 py-4 sm:px-5">
                    <div className="mb-5">
                      <h3 className="text-[1.05rem] font-black uppercase tracking-wide text-slate-950">Terms and Conditions</h3>
                      <div className="mt-3 h-px w-full bg-slate-200" />
                      <div className="mt-[-1px] h-px w-28 bg-red-500" />
                    </div>
                    <div className="space-y-3 text-sm text-slate-800">
                      {quotation.terms.map((termId: string, index: number) => (
                        <div key={termId} className="flex items-start gap-3">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-red-500" />
                          <span className="leading-6">{getTermContent(termId)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="border border-slate-300 bg-white px-4 py-4 sm:px-5">
                  <div className="mb-5">
                    <h3 className="text-[1.05rem] font-black uppercase tracking-wide text-slate-950">Company Details</h3>
                    <div className="mt-3 h-px w-full bg-slate-200" />
                    <div className="mt-[-1px] h-px w-28 bg-red-500" />
                  </div>
                  <div className="grid gap-3 text-sm">
                    <DetailRow label="Company Name" value={settings.name} />
                    <DetailRow label="Account No." value={settings.bankDetails.accountNumber} />
                    <DetailRow label="IFSC Code" value={settings.bankDetails.ifsc} />
                    <DetailRow label="Branch" value={settings.bankDetails.branch} />
                    <DetailRow label="Bank Name" value={settings.bankDetails.bankName} />
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="pt-5">
                <div className="text-[15px] leading-8 text-slate-800">
                  <p>Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.</p>
                  <p className="mt-2">Assuring you the best quality and services all the times.</p>
                </div>

                <div className="mt-10 grid grid-cols-1 items-end gap-10 md:mt-12 md:grid-cols-[1fr_320px]">
                  <div>
                    <div className="mb-3 h-px w-36 bg-red-500" />
                    <p className="text-[1.45rem] font-black uppercase tracking-tight text-red-600 sm:text-[2rem]">{quotation.salesperson.name}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                      {quotation.salesperson.phone && <span>Phone: {quotation.salesperson.phone}</span>}
                      {(quotation.salesperson.phone && quotation.salesperson.email) && <span className="text-slate-400">|</span>}
                      {quotation.salesperson.email && <span>Email: {quotation.salesperson.email}</span>}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mb-3 h-px w-56 bg-red-500" />
                    <p className="text-[1.1rem] font-black uppercase tracking-[0.18em] text-slate-950">Authorized Signature</p>
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

.quotation-specs {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.quotation-specs,
.quotation-specs * {
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
  color: inherit !important;
}

.quotation-specs img,
.quotation-specs svg,
.quotation-specs video,
.quotation-specs canvas,
.quotation-specs iframe,
.quotation-specs embed,
.quotation-specs object {
  display: block !important;
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
}

.quotation-specs table {
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
}

.quotation-specs th,
.quotation-specs td,
.quotation-specs pre,
.quotation-specs code {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[140px_1fr] gap-5 border-t border-slate-200 pt-3 text-slate-800 first:border-t-0 first:pt-0">
      <span className="font-black uppercase tracking-wide text-slate-700">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
};

const MobileMetric = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div>
    <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
    <div className={strong ? 'mt-1 text-sm font-black text-slate-950' : 'mt-1 text-sm font-medium text-slate-800'}>
      {value}
    </div>
  </div>
);

const renderHtml = (value: string) => ({ __html: sanitizeQuotationHtml(value) });

const sanitizeQuotationHtml = (value: string) => {
  if (!value) {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return value;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(value, 'text/html');

  document.body.querySelectorAll('*').forEach((element) => {
    element.removeAttribute('face');
    element.removeAttribute('size');

    const style = element.getAttribute('style');
    if (!style) {
      return;
    }

    const sanitizedRules = style
      .split(';')
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => {
        const property = rule.split(':')[0]?.trim().toLowerCase();

        return !['font', 'font-family', 'font-size', 'line-height', 'width', 'min-width', 'max-width'].includes(property);
      });

    if (sanitizedRules.length > 0) {
      element.setAttribute('style', sanitizedRules.join('; '));
    } else {
      element.removeAttribute('style');
    }
  });

  return document.body.innerHTML;
};
