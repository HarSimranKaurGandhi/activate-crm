import { useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../../services/leadService';

type ImportResult = {
  row: number;
  name: string;
  phone: string;
  status: 'success' | 'failed';
  message: string;
  lead_id: number | null;
};

type ImportReport = {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
};

type LeadBulkUploadDialogProps = {
  open: boolean;
  users: any[];
  onClose: () => void;
  onUploaded: () => void;
};

export const LeadBulkUploadDialog = ({
  open,
  users,
  onClose,
  onUploaded,
}: LeadBulkUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  if (!open) return null;

  const close = () => {
    if (uploading) return;
    setFile(null);
    setReport(null);
    onClose();
  };

  const downloadTemplate = async () => {
    try {
      const blob = await leadService.downloadBulkTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lead_bulk_upload_template.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || 'Unable to download the CSV template');
    }
  };

  const upload = async () => {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    setReport(null);
    try {
      const result = await leadService.bulkUpload(file) as ImportReport;
      setReport(result);
      if (result.successful > 0) onUploaded();
      toast.success(`Upload processed: ${result.successful} successful, ${result.failed} failed`);
    } catch (error: any) {
      toast.error(error.message || error.errors?.file?.[0] || 'Unable to process the CSV file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Bulk Upload Leads</h3>
            <p className="mt-1 text-sm text-gray-500">Upload a CSV and review the result for every row.</p>
          </div>
          <button type="button" onClick={close} disabled={uploading} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {!report ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h4 className="font-semibold text-blue-950">CSV instructions</h4>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-blue-900">
                    <li>Mandatory columns: <b>name, phone_no, requirement, assignee_user_id, source</b>.</li>
                    <li>Phone formatting is removed and the last 10 digits are retained. Any preceding country-code digits are checked and discarded; values with fewer than 10 digits fail.</li>
                    <li>Full-precision scientific notation is supported. Rounded values such as <b>9.19888E+11</b> are rejected because Excel has removed digits. Format the phone column as <b>Text</b> before saving the CSV.</li>
                    <li>Source values: <b>walk_in, reference, india_mart, website</b>.</li>
                    <li>Optional fields may be left blank. Status defaults to <b>new</b> and follow-up date defaults to two days from upload.</li>
                    <li>
                      Optional column names: <b>email, address_line_1, address_line_2, city, state, pincode,
                      country, expected_order_value, expected_closure, status, failure_reason,
                      failure_reason_details, tags, follow_up_date</b>.
                    </li>
                    <li>
                      Expected order values: <b>5L-10L, 10L-30L, 30L+</b>. Expected closure values:
                      <b> 10 days, 20 days, 30 days, 90 days</b>.
                    </li>
                    <li>
                      Status values: <b>new, enquiry, in_progress, on_hold, closed_success, closed_fail</b>.
                      For <b>closed_fail</b>, include a valid <b>failure_reason</b>; when the reason is
                      <b> other</b>, also provide <b>failure_reason_details</b>.
                    </li>
                    <li>Use date format <b>YYYY-MM-DD</b>. Tags may be <b>hot</b>, <b>premium</b>, or both separated by a comma or pipe.</li>
                    <li>Existing open leads with the same phone number will be reported as failed and will not be duplicated.</li>
                  </ul>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Assignee user IDs</h4>
                    <span className="text-xs text-gray-500">Use the ID in your CSV</span>
                  </div>
                  <div className="max-h-48 overflow-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-2">User ID</th><th className="px-4 py-2">User</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                          <tr key={user.id}><td className="px-4 py-2 font-mono">{user.id}</td><td className="px-4 py-2">{user.name}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-5 w-5" />
                  Download CSV Template
                </button>

                <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-blue-400 hover:bg-blue-50">
                  <FileSpreadsheet className="h-10 w-10 text-blue-600" />
                  <span className="mt-3 font-medium text-gray-900">{file?.name || 'Select CSV file'}</span>
                  <span className="mt-1 text-sm text-gray-500">CSV only, maximum 10 MB</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>

                <button
                  type="button"
                  onClick={upload}
                  disabled={!file || uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-5 w-5" />
                  {uploading ? 'Processing CSV...' : 'Upload Leads'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-100 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Total</div><div className="mt-1 text-2xl font-bold text-slate-900">{report.total}</div></div>
                <div className="rounded-xl bg-emerald-50 p-4"><div className="text-xs font-semibold uppercase text-emerald-700">Successful</div><div className="mt-1 text-2xl font-bold text-emerald-700">{report.successful}</div></div>
                <div className="rounded-xl bg-rose-50 p-4"><div className="text-xs font-semibold uppercase text-rose-700">Failed</div><div className="mt-1 text-2xl font-bold text-rose-700">{report.failed}</div></div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="max-h-[48vh] overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3">CSV Row</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Status</th><th className="px-4 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.results.map((result) => (
                        <tr key={`${result.row}-${result.phone}`} className={result.status === 'success' ? 'bg-emerald-50/30' : 'bg-rose-50/30'}>
                          <td className="px-4 py-3">{result.row}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{result.name || '-'}</td>
                          <td className="px-4 py-3">{result.phone || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              result.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {result.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              {result.status === 'success' ? 'Uploaded' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{result.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setReport(null); setFile(null); }} className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
                  Upload Another File
                </button>
                <button type="button" onClick={close} className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
