import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { leadService } from '../../services/leadService';
import { mapLead } from '../../services/mappers';
import { LeadPhoneAction } from '../components/leads/LeadPhoneAction';

const statusBadgeClass: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  enquiry: 'bg-indigo-50 text-indigo-700',
  in_progress: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-slate-100 text-slate-700',
  closed_success: 'bg-emerald-50 text-emerald-700',
  closed_fail: 'bg-rose-50 text-rose-700',
};

const tagBadgeClass: Record<string, string> = {
  hot: 'bg-orange-50 text-orange-700',
  premium: 'bg-violet-50 text-violet-700',
};

const sourceLabel = (source: string) => {
  switch (source) {
    case 'reference':
      return 'Reference';
    case 'india_mart':
      return 'India Mart';
    case 'website':
      return 'Website';
    default:
      return 'Walk In';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'enquiry':
      return 'Enquiry';
    case 'in_progress':
      return 'In Progress';
    case 'on_hold':
      return 'On Hold';
    case 'closed_success':
      return 'Closed - Success';
    case 'closed_fail':
      return 'Closed - Fail';
    default:
      return 'New (Requirement Confirmed)';
  }
};

const expectedOrderValueLabel = (value?: string) => value || '-';
const expectedClosureLabel = (value?: string) => value || '-';

const formatAddress = (lead: any) =>
  [lead.addressLine1, lead.addressLine2, lead.city, lead.state, lead.pincode, lead.country]
    .filter(Boolean)
    .join(', ');

const formatDisplayDate = (date?: string) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDisplayDateTime = (date?: string) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const TODAY = new Date('2026-07-18T00:00:00');
const isPastDate = (date?: string) => {
  if (!date) return false;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  parsed.setHours(0, 0, 0, 0);
  return parsed < TODAY;
};

export const LeadView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const result = await leadService.show(id);
        setLead(mapLead(result));
      } catch (error) {
        toast.error('Unable to load lead');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/leads')} className="rounded-lg p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900">View Lead</h2>
          </div>
          {id && (
            <button
              onClick={() => navigate(`/leads/${id}/edit`)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white transition-all hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Edit Lead
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <LoadingState label="Loading lead..." />
          </div>
        ) : lead ? (
          <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Lead Source</div>
                <div className="text-gray-900">{sourceLabel(lead.leadSource)}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Status</div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[lead.status] || statusBadgeClass.new}`}>
                  {statusLabel(lead.status)}
                </span>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Name</div>
                <div className="text-lg font-semibold text-gray-900">{lead.name}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Phone No.</div>
                <LeadPhoneAction leadId={String(lead.id)} phone={lead.phone} />
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Email</div>
                <div className="break-words text-gray-900">{lead.email || '-'}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Follow Up Date</div>
                <div className={isPastDate(lead.followUpDate) ? 'text-rose-600' : 'text-gray-900'}>{formatDisplayDate(lead.followUpDate)}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Lead Expected Order Value</div>
                <div className="text-gray-900">{expectedOrderValueLabel(lead.expectedOrderValue)}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Expected Closure</div>
                <div className="text-gray-900">{expectedClosureLabel(lead.expectedClosure)}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Assigned To</div>
                <div className="text-gray-900">{lead.assignedUser?.name || '-'}</div>
                {lead.assignedUser?.email && <div className="mt-1 text-sm text-gray-500">{lead.assignedUser.email}</div>}
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Created On</div>
                <div className="text-gray-900">{formatDisplayDateTime(lead.createdAt)}</div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Last Updated On</div>
                <div className="text-gray-900">{formatDisplayDateTime(lead.updatedAt)}</div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-gray-500">Address</div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {formatAddress(lead) || 'No address added.'}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-gray-500">Requirement</div>
                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {lead.requirement || 'No requirement added.'}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-medium text-gray-500">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.length > 0 ? lead.tags.map((tag: string) => (
                    <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${tagBadgeClass[tag] || 'bg-gray-100 text-gray-700'}`}>
                      {tag === 'hot' ? 'Hot' : 'Premium'}
                    </span>
                  )) : <span className="text-gray-500">No tags added.</span>}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
