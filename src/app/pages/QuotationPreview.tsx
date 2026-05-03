import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, Edit, Check, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { quotationService } from '../../services/quotationService';
import { mapQuotation } from '../../services/mappers';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/AsyncState';
import { quotationStatusClass, quotationStatusLabel } from '../components/common/status';

export const QuotationPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { quotations, submitQuotationForApproval, approveQuotation, rejectQuotation, settings, adjustments: masterAdjustments, terms: masterTerms } = useData();
  const { user } = useAuth();
  const [previewQuotation, setPreviewQuotation] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;

    setPreviewLoading(true);
    quotationService.preview(id).then((preview) => {
      setPreviewQuotation(mapQuotation(preview.quotation));
    }).catch(() => undefined).finally(() => setPreviewLoading(false));
  }, [id]);

  const quotation = previewQuotation || quotations.find(q => q.id === id);

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
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
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

  const handlePrint = () => {
    window.print();
  };

  const getTermContent = (termId: string) => {
    const term = masterTerms.find(t => t.id === termId);
    return term?.content || termId;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Action Bar - Hidden in print */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-white rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Quotations
          </button>
          <div className="flex items-center gap-3">
            {quotation.status === 'draft' && (
              <button
                onClick={handleSubmitForApproval}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <Send className="w-5 h-5" />
                Submit for Approval
              </button>
            )}
            {quotation.status === 'pending' && canApprove && (
              <>
                <button
                  onClick={() => handleApproval('approved')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => handleApproval('rejected')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-5 h-5" />
              Print / Download
            </button>
          </div>
        </div>

        {/* Quotation Document */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none relative">
          {/* Watermark for non-approved quotations */}
          {quotation.status !== 'approved' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-[120px] font-bold text-gray-200 opacity-30 rotate-[-45deg] select-none">
                PENDING FOR APPROVAL
              </div>
            </div>
          )}

          <div className="p-12 relative z-20">
            {/* Header */}
            <div className="border-b-4 border-blue-600 pb-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{settings.name}</h1>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{settings.address}</p>
                    <p>Phone: {settings.phone} | Email: {settings.email}</p>
                    <p>GSTIN: {settings.gstNumber}</p>
                  </div>
                </div>
                {settings.logo && (
                  <img src={settings.logo} alt="Logo" className="h-20" />
                )}
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
                <div className="text-gray-900">
                  <p className="font-semibold text-lg">{quotation.customer.company}</p>
                  <p>{quotation.customer.name}</p>
                  <p className="text-sm text-gray-600 mt-2">{quotation.customer.address}</p>
                  <p className="text-sm text-gray-600">Phone: {quotation.customer.phone}</p>
                  <p className="text-sm text-gray-600">Email: {quotation.customer.email}</p>
                  {quotation.customer.gstNumber && (
                    <p className="text-sm text-gray-600">GSTIN: {quotation.customer.gstNumber}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gray-50 rounded-xl p-6 inline-block">
                  <h2 className="text-3xl font-bold text-blue-600 mb-4">QUOTATION</h2>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between gap-8">
                      <span className="text-gray-600 font-medium">Quotation No:</span>
                      <span className="font-semibold text-gray-900">{quotation.number}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-gray-600 font-medium">Date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(quotation.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-gray-600 font-medium">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${quotationStatusClass(quotation.status)}`}>
                        {quotationStatusLabel(quotation.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-8">
              <table className="w-full border border-gray-200">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Product Description</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Unit Price</th>
                    {quotation.showDiscount && (
                      <th className="px-4 py-3 text-center text-sm font-semibold">Disc%</th>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-semibold">GST%</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item: any, index: number) => {
                    const basePrice = item.price * item.quantity;
                    const discountAmount = basePrice * (item.discount / 100);
                    const afterDiscount = basePrice - discountAmount;
                    const gstAmount = quotation.gstInclusive ? 0 : afterDiscount * (item.product.gstPercent / 100);
                    const total = afterDiscount + gstAmount;

                    return (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="px-4 py-4 text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{item.product.name}</p>
                            <p className="text-sm text-gray-600">Model: {item.product.modelNumber}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.specifications}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-4 text-right text-gray-900">
                          ₹{item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        {quotation.showDiscount && (
                          <td className="px-4 py-4 text-center text-gray-900">
                            {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                          </td>
                        )}
                        <td className="px-4 py-4 text-center text-gray-900">{item.product.gstPercent}%</td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900">
                          ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-96">
                <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{quotation.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* Show adjustments */}
                  {Object.entries(quotation.adjustments).map(([adjId, adj]: [string, any]) => {
                    if (!adj.enabled) return null;
                    const adjustment = masterAdjustments.find(a => a.id === adjId);
                    if (!adjustment) return null;

                    const amount = adjustment.type === 'percentage'
                      ? quotation.subtotal * (adj.amount / 100)
                      : adj.amount;

                    return (
                      <div key={adjId} className="flex justify-between text-gray-700">
                        <span>{adjustment.name}:</span>
                        <span className="font-semibold">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    );
                  })}

                  {!quotation.gstInclusive && quotation.taxAmount > 0 && (
                    <>
                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between text-gray-700">
                          <span>Total (Before Tax):</span>
                          <span className="font-semibold">
                            ₹{(quotation.subtotal + Object.entries(quotation.adjustments).reduce((sum, [adjId, adj]: [string, any]) => {
                              if (!adj.enabled) return sum;
                              const adjustment = masterAdjustments.find(a => a.id === adjId);
                              if (!adjustment) return sum;
                              return sum + (adjustment.type === 'percentage' ? quotation.subtotal * (adj.amount / 100) : adj.amount);
                            }, 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>GST:</span>
                        <span className="font-semibold">₹{quotation.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  <div className="border-t-2 border-gray-300 pt-3">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-gray-900">Grand Total:</span>
                      <span className="font-bold text-blue-600 text-2xl">
                        ₹{quotation.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            {quotation.terms.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-3">Terms & Conditions:</h3>
                <div className="space-y-2">
                  {quotation.terms.map((termId: string, index: number) => (
                    <div key={termId} className="flex gap-2">
                      <span className="text-gray-600">{index + 1}.</span>
                      <span className="text-gray-700">{getTermContent(termId)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank Details */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-3">Bank Details:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Bank Name:</p>
                  <p className="font-semibold text-gray-900">{settings.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Account Number:</p>
                  <p className="font-semibold text-gray-900">{settings.bankDetails.accountNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">IFSC Code:</p>
                  <p className="font-semibold text-gray-900">{settings.bankDetails.ifsc}</p>
                </div>
                <div>
                  <p className="text-gray-600">Branch:</p>
                  <p className="font-semibold text-gray-900">{settings.bankDetails.branch}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-600">Prepared by:</p>
                  <p className="font-semibold text-gray-900">{quotation.salesperson.name}</p>
                  <p className="text-sm text-gray-600">{quotation.salesperson.phone}</p>
                  <p className="text-sm text-gray-600">{quotation.salesperson.email}</p>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-900 pt-2 mt-16 min-w-[200px]">
                    <p className="text-sm font-semibold text-gray-900">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};
