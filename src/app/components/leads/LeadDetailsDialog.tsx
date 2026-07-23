import { useEffect, useState } from 'react';
import { LoaderCircle, MessageSquareText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { leadPayload, mapLead } from '../../../services/mappers';
import { leadService } from '../../../services/leadService';
import { LoadingState } from '../common/AsyncState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LeadPhoneAction } from './LeadPhoneAction';

const LEAD_SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk In' },
  { value: 'reference', label: 'Reference' },
  { value: 'india_mart', label: 'India Mart' },
  { value: 'website', label: 'Website' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'new', label: 'New (Requirement Confirmed)' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];

const LEAD_TAG_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'premium', label: 'Premium' },
];

const LEAD_EXPECTED_ORDER_VALUE_OPTIONS = [
  { value: '5L-10L', label: '5L-10L' },
  { value: '10L-30L', label: '10L-30L' },
  { value: '30L+', label: '30L+' },
];

const LEAD_EXPECTED_CLOSURE_OPTIONS = [
  { value: '10 days', label: '10 days' },
  { value: '20 days', label: '20 days' },
  { value: '30 days', label: '30 days' },
  { value: '90 days', label: '90 days' },
];

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

const sourceLabel = (source: string) =>
  LEAD_SOURCE_OPTIONS.find((option) => option.value === source)?.label || 'Walk In';

const statusLabel = (status: string) =>
  LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'New (Requirement Confirmed)';

const formatDateInput = (date: Date) => date.toISOString().split('T')[0];
const today = formatDateInput(new Date());

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

const leadActivityActionLabel = (action?: string) => {
  switch (action) {
    case 'created':
      return 'Lead created';
    case 'updated':
      return 'Lead updated';
    case 'commented':
      return 'Comment added';
    case 'called':
      return 'Lead called';
    default:
      return 'Lead activity';
  }
};

const leadTimelineFieldLabel = (field: string) => {
  switch (field) {
    case 'lead_source':
      return 'Lead Source';
    case 'name':
      return 'Name';
    case 'phone':
      return 'Phone No.';
    case 'email':
      return 'Email';
    case 'address_line_1':
      return 'Address Line 1';
    case 'address_line_2':
      return 'Address Line 2';
    case 'city':
      return 'City';
    case 'state':
      return 'State';
    case 'pincode':
      return 'Pincode';
    case 'country':
      return 'Country';
    case 'requirement':
      return 'Requirement';
    case 'expected_order_value':
      return 'Lead Expected Order Value';
    case 'expected_closure':
      return 'Expected Closure';
    case 'status':
      return 'Status';
    case 'tags':
      return 'Tags';
    case 'follow_up_date':
      return 'Follow Up Date';
    case 'assigned_to':
      return 'Assigned To';
    default:
      return field;
  }
};

const leadTimelineDescription = (item: any) => {
  if (item?.action === 'commented') {
    return item?.description || item?.new_values?.comment || '-';
  }

  if (item?.action === 'called') {
    if (item?.new_values?.connected === true) {
      return `Called the lead — connected.${item?.new_values?.notes ? ` Discussion: ${item.new_values.notes}` : ''}`;
    }
    if (item?.new_values?.connected === false) {
      return 'Called the lead — not connected.';
    }
    return 'Called the lead. Outcome pending.';
  }

  return item?.description || '-';
};

const createEmptyFormData = () => ({
  leadSource: 'walk_in',
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  requirement: '',
  expectedOrderValue: '',
  expectedClosure: '',
  status: 'new',
  tags: [] as string[],
  followUpDate: '',
  assignedTo: '',
});

interface LeadDetailsDialogProps {
  leadId: string | null;
  open: boolean;
  users: any[];
  onOpenChange: (open: boolean) => void;
  onSaved: (lead: any) => void;
}

export const LeadDetailsDialog = ({
  leadId,
  open,
  users,
  onOpenChange,
  onSaved,
}: LeadDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<any | null>(null);
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [formData, setFormData] = useState(createEmptyFormData);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const mergeActivity = (activity: any) => {
    setActivityItems((current) => [activity, ...current.filter((item) => String(item.id) !== String(activity.id))]);
  };

  useEffect(() => {
    if (!open || !leadId) {
      setLead(null);
      setActivityItems([]);
      setErrors({});
      setCommentText('');
      setFormData(createEmptyFormData());
      setActiveTab('preview');
      return;
    }

    const load = async () => {
      setLoading(true);
      setActivityLoading(true);
      try {
        const [result, activity] = await Promise.all([
          leadService.show(leadId),
          leadService.activity(leadId),
        ]);
        const mapped = mapLead(result);
        setLead(mapped);
        setActivityItems(Array.isArray(activity) ? activity : []);
        setFormData({
          leadSource: mapped.leadSource,
          name: mapped.name,
          phone: mapped.phone,
          email: mapped.email,
          addressLine1: mapped.addressLine1,
          addressLine2: mapped.addressLine2,
          city: mapped.city,
          state: mapped.state,
          pincode: mapped.pincode,
          country: mapped.country || 'India',
          requirement: mapped.requirement,
          expectedOrderValue: mapped.expectedOrderValue,
          expectedClosure: mapped.expectedClosure,
          status: mapped.status,
          tags: mapped.tags,
          followUpDate: mapped.followUpDate,
          assignedTo: mapped.assignedTo,
        });
      } catch {
        toast.error('Unable to load lead');
        onOpenChange(false);
      } finally {
        setLoading(false);
        setActivityLoading(false);
      }
    };

    void load();
  }, [leadId, onOpenChange, open]);

  const toggleTag = (tag: string) => {
    setFormData((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  };

  const fieldClassName = (hasError = false) =>
    `w-full rounded-xl border px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-200 focus:ring-blue-500'
    }`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!leadId) return;

    const validationErrors: Record<string, string[]> = {};

    if (!formData.phone.trim() && !formData.email.trim()) {
      validationErrors.phone = ['Either phone number or email is required.'];
      validationErrors.email = ['Either phone number or email is required.'];
    }

    if (!formData.requirement.trim()) {
      validationErrors.requirement = ['Requirement is required.'];
    }

    if (formData.status === 'in_progress' && !formData.expectedOrderValue) {
      validationErrors.expected_order_value = ['Lead expected order value is required for in-progress leads.'];
    }

    if (formData.status === 'in_progress' && !formData.expectedClosure) {
      validationErrors.expected_closure = ['Expected closure is required for in-progress leads.'];
    }

    if (!formData.followUpDate) {
      validationErrors.follow_up_date = ['Follow up date is required.'];
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setErrors({});

    setSaving(true);
    try {
      const result = await leadService.update(leadId, leadPayload(formData));
      const activity = await leadService.activity(leadId);
      const mapped = mapLead(result);
      setLead(mapped);
      setActivityItems(Array.isArray(activity) ? activity : []);
      setFormData({
        leadSource: mapped.leadSource,
        name: mapped.name,
        phone: mapped.phone,
        email: mapped.email,
        addressLine1: mapped.addressLine1,
        addressLine2: mapped.addressLine2,
        city: mapped.city,
        state: mapped.state,
        pincode: mapped.pincode,
        country: mapped.country || 'India',
        requirement: mapped.requirement,
        expectedOrderValue: mapped.expectedOrderValue,
        expectedClosure: mapped.expectedClosure,
        status: mapped.status,
        tags: mapped.tags,
        followUpDate: mapped.followUpDate,
        assignedTo: mapped.assignedTo,
      });
      onSaved(mapped);
      setActiveTab('preview');
      toast.success('Lead updated successfully');
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!leadId) return;

    const comment = commentText.trim();

    if (!comment) {
      toast.error('Please enter a comment');
      return;
    }

    setCommentSaving(true);
    try {
      const activity = await leadService.addComment(leadId, comment);
      setActivityItems((current) => [activity, ...current]);
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Unable to add comment');
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-[96vw] gap-0 overflow-hidden border-gray-200 p-0 xl:max-w-6xl 2xl:max-w-7xl">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <DialogTitle>{lead?.name ? `Lead: ${lead.name}` : 'Lead Details'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6">
            <LoadingState label="Loading lead..." />
          </div>
        ) : lead ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-2.5">
              <TabsList className="w-full max-w-sm">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[calc(95vh-8rem)] overflow-y-auto px-6 py-4">
              <TabsContent value="preview">
                <div className="space-y-8">
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
                    <div className="text-lg font-semibold text-gray-900">{lead.name || '-'}</div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-500">Phone No.</div>
                    <LeadPhoneAction leadId={String(lead.id)} phone={lead.phone} onActivitySaved={mergeActivity} />
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-500">Email</div>
                    <div className="break-words text-gray-900">{lead.email || '-'}</div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-500">Follow Up Date</div>
                    <div className="text-gray-900">{formatDisplayDate(lead.followUpDate)}</div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-500">Lead Expected Order Value</div>
                    <div className="text-gray-900">{lead.expectedOrderValue || '-'}</div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-500">Expected Closure</div>
                    <div className="text-gray-900">{lead.expectedClosure || '-'}</div>
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

                  <section className="rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-5 w-5 text-blue-600" />
                        <h3 className="text-base font-semibold text-gray-900">Lead Timeline</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Latest changes and comments appear at the top.</p>
                    </div>

                    <div className="space-y-4 px-5 py-4">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Add Comment</label>
                        <textarea
                          rows={3}
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          placeholder="Add a note about this lead..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={commentSaving}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {commentSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                            {commentSaving ? 'Posting...' : 'Post Comment'}
                          </button>
                        </div>
                      </div>

                      {activityLoading ? (
                        <LoadingState label="Loading timeline..." />
                      ) : activityItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                          No timeline entries yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activityItems.map((item) => (
                            <div key={String(item.id)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {leadActivityActionLabel(item.action)}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                    {leadTimelineDescription(item)}
                                  </div>
                                </div>
                                <div className="text-left text-xs text-gray-500 sm:text-right">
                                  <div>{item.actor?.name || item.actor?.email || 'System'}</div>
                                  <div className="mt-1">{formatDisplayDateTime(item.occurred_at)}</div>
                                </div>
                              </div>

                              {item.action === 'updated' && Object.keys(item.new_values || {}).length > 0 ? (
                                <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3">
                                  {Object.entries(item.new_values || {}).map(([field, value]) => (
                                    <div key={field} className="grid grid-cols-1 gap-1 text-sm md:grid-cols-[180px_1fr]">
                                      <div className="font-medium text-gray-700">{leadTimelineFieldLabel(field)}</div>
                                      <div className="text-gray-600">
                                        <span className="text-gray-400">{String(item.old_values?.[field] || '-')}</span>
                                        <span className="mx-2 text-gray-400">→</span>
                                        <span className="font-medium text-gray-900">{String(value || '-')}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="edit">
                <form noValidate onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[40%_25%_25%] md:justify-between md:gap-0">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                      <input type="text" value={formData.name}
                        onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                        className={fieldClassName(Boolean(errors.name?.[0]))} />
                      {errors.name?.[0] && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Lead Source *</label>
                      <select
                        value={formData.leadSource}
                        onChange={(event) => setFormData((current) => ({ ...current, leadSource: event.target.value }))}
                        className={fieldClassName(Boolean(errors.lead_source?.[0]))}
                      >
                        {LEAD_SOURCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {errors.lead_source?.[0] && <p className="mt-1 text-sm text-red-600">{errors.lead_source[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                        className={fieldClassName(Boolean(errors.status?.[0]))}
                      >
                        {LEAD_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {errors.status?.[0] && <p className="mt-1 text-sm text-red-600">{errors.status[0]}</p>}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Phone No.</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                        className={fieldClassName(Boolean(errors.phone?.[0]))}
                      />
                      {errors.phone?.[0] && <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                        className={fieldClassName(Boolean(errors.email?.[0]))}
                      />
                      <p className="mt-1 text-xs text-gray-500">Either email or phone number is required.</p>
                      {errors.email?.[0] && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Assigned To</label>
                      <select value={formData.assignedTo}
                        onChange={(event) => setFormData((current) => ({ ...current, assignedTo: event.target.value }))}
                        className={fieldClassName(Boolean(errors.assigned_to?.[0]))}>
                        <option value="">Select user</option>
                        {users.map((user) => <option key={user.id} value={String(user.id)}>
                          {[user.name, user.designation].filter(Boolean).join(' - ')}
                        </option>)}
                      </select>
                      {errors.assigned_to?.[0] && <p className="mt-1 text-sm text-red-600">{errors.assigned_to[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Lead Expected Order Value {formData.status === 'in_progress' ? '*' : ''}
                      </label>
                      <select value={formData.expectedOrderValue} required={formData.status === 'in_progress'}
                        onChange={(event) => setFormData((current) => ({ ...current, expectedOrderValue: event.target.value }))}
                        className={fieldClassName(Boolean(errors.expected_order_value?.[0]))}>
                        <option value="">Select order value</option>
                        {LEAD_EXPECTED_ORDER_VALUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Mandatory when the lead status is In Progress.</p>
                      {errors.expected_order_value?.[0] && <p className="mt-1 text-sm text-red-600">{errors.expected_order_value[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Expected Closure {formData.status === 'in_progress' ? '*' : ''}
                      </label>
                      <select value={formData.expectedClosure} required={formData.status === 'in_progress'}
                        onChange={(event) => setFormData((current) => ({ ...current, expectedClosure: event.target.value }))}
                        className={fieldClassName(Boolean(errors.expected_closure?.[0]))}>
                        <option value="">Select expected closure</option>
                        {LEAD_EXPECTED_CLOSURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Mandatory when the lead status is In Progress.</p>
                      {errors.expected_closure?.[0] && <p className="mt-1 text-sm text-red-600">{errors.expected_closure[0]}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.addressLine1}
                        onChange={(event) => setFormData((current) => ({ ...current, addressLine1: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.address_line_1?.[0] && <p className="mt-1 text-sm text-red-600">{errors.address_line_1[0]}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(event) => setFormData((current) => ({ ...current, addressLine2: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.address_line_2?.[0] && <p className="mt-1 text-sm text-red-600">{errors.address_line_2[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.city?.[0] && <p className="mt-1 text-sm text-red-600">{errors.city[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(event) => setFormData((current) => ({ ...current, state: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.state?.[0] && <p className="mt-1 text-sm text-red-600">{errors.state[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Pincode</label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(event) => setFormData((current) => ({ ...current, pincode: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.pincode?.[0] && <p className="mt-1 text-sm text-red-600">{errors.pincode[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.country?.[0] && <p className="mt-1 text-sm text-red-600">{errors.country[0]}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">Requirement *</label>
                      <textarea
                        required
                        rows={5}
                        value={formData.requirement}
                        onChange={(event) => setFormData((current) => ({ ...current, requirement: event.target.value }))}
                        className={fieldClassName(Boolean(errors.requirement?.[0]))}
                      />
                      {errors.requirement?.[0] && <p className="mt-1 text-sm text-red-600">{errors.requirement[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Follow Up Date *</label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={formData.followUpDate}
                        onChange={(event) => setFormData((current) => ({ ...current, followUpDate: event.target.value }))}
                        className={fieldClassName(Boolean(errors.follow_up_date?.[0]))}
                      />
                      {errors.follow_up_date?.[0] && <p className="mt-1 text-sm text-red-600">{errors.follow_up_date[0]}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
                      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 p-3">
                        {LEAD_TAG_OPTIONS.map((tag) => (
                          <label key={tag.value} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={formData.tags.includes(tag.value)}
                              onChange={() => toggleTag(tag.value)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <span>{tag.label}</span>
                          </label>
                        ))}
                      </div>
                      {errors.tags?.[0] && <p className="mt-1 text-sm text-red-600">{errors.tags[0]}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-gray-200 pt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? 'Saving...' : 'Update Lead'}
                    </button>
                  </div>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-6 text-sm text-gray-500">Lead not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
