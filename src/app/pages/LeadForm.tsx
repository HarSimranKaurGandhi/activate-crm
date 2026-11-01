import { normalizeIndianPhone } from '../../utils/phone';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Search, UserRoundSearch, X } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { leadService } from '../../services/leadService';
import { leadPayload, mapLead } from '../../services/mappers';
import { userService } from '../../services/userService';
import { influencerService } from '../../services/influencerService';
import { useAuth } from '../auth/AuthContext';
import { LeadFailureReasonDialog, leadFailureReasonLabel } from '../components/leads/LeadFailureReasonDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const LEAD_SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk In' },
  { value: 'reference', label: 'Reference' },
  { value: 'india_mart', label: 'India Mart' },
  { value: 'website', label: 'Website' },
  { value: 'johnson', label: 'Johnson' },
  { value: 'hercules', label: 'Hercules' },
  { value: 'affiliate', label: 'Affiliate' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'new', label: 'New (Requirement Confirmed)' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'closed_success', label: 'Closed - Success' },
  { value: 'closed_fail', label: 'Closed - Fail' },
];
const CLOSED_LEAD_STATUSES = ['closed_success', 'closed_fail'];

const LEAD_TAG_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'premium', label: 'Premium' },
];

const CUSTOMER_IMPORTANCE_OPTIONS = ['UVIP', 'VIP', 'IMP'];
const CUSTOMER_CATEGORY_OPTIONS = ['GYM OWNER', 'GOVT OFFICIAL', 'BUILDER', 'CORPORATE', 'DEALER'];

const LEAD_EXPECTED_ORDER_VALUE_OPTIONS = [
  { value: 'Less Than 1L', label: 'Less Than 1L' },
  { value: '1L-5L', label: '1L-5L' },
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

const formatDateInput = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');
const today = formatDateInput(new Date());
const defaultFollowUpDate = today;

export const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [influencerDialogOpen, setInfluencerDialogOpen] = useState(false);
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [influencersLoading, setInfluencersLoading] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<any | null>(null);
  const [formData, setFormData] = useState({
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
    closureHotLevel: 1,
    status: 'new',
    failureReason: '',
    failureReasonDetails: '',
    tags: [] as string[],
    customerImportance: '',
    customerCategory: '',
    followUpDate: defaultFollowUpDate,
    assignedTo: user?.id ? String(user.id) : '',
    influencerId: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [userResult, leadResult] = await Promise.all([
          userService.dropdown(),
          leadService.show(id),
        ]);
        setUsers(Array.isArray(userResult) ? userResult : []);
        const mapped = mapLead(leadResult);
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
          closureHotLevel: mapped.closureHotLevel,
          status: mapped.status,
          failureReason: mapped.failureReason,
          failureReasonDetails: mapped.failureReasonDetails,
          tags: mapped.tags,
          customerImportance: mapped.customerImportance,
          customerCategory: mapped.customerCategory,
          followUpDate: mapped.followUpDate,
          assignedTo: mapped.assignedTo,
          influencerId: mapped.influencerId,
        });
        setSelectedInfluencer(mapped.influencer);
      } catch (error) {
        toast.error('Unable to load lead');
      } finally {
        setLoading(false);
      }
    };

    const loadCreateMeta = async () => {
      if (id) return;

      try {
        const userResult = await userService.dropdown();
        setUsers(Array.isArray(userResult) ? userResult : []);
      } catch (error) {
        toast.error('Unable to load users');
      }
    };

    if (id) {
      load();
      return;
    }

    loadCreateMeta();
  }, [id]);

  useEffect(() => {
    if (!influencerDialogOpen) return;
    const timer = window.setTimeout(() => {
      setInfluencersLoading(true);
      influencerService.dropdown(influencerSearch.trim())
        .then((result) => setInfluencers(Array.isArray(result) ? result : []))
        .catch(() => setInfluencers([]))
        .finally(() => setInfluencersLoading(false));
    }, 200);

    return () => window.clearTimeout(timer);
  }, [influencerDialogOpen, influencerSearch]);

  useEffect(() => {
    if (id) return;

    if (user?.id) {
      setFormData((current) => ({
        ...current,
        assignedTo: current.assignedTo || String(user.id),
      }));
    }
  }, [id, user?.id]);

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
    const validationErrors: Record<string, string[]> = {};

    if (!formData.phone.trim() && !formData.email.trim() && !formData.influencerId) {
      validationErrors.phone = ['At least one of phone number, email, or influencer is required.'];
      validationErrors.email = ['At least one of phone number, email, or influencer is required.'];
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

    if (formData.status === 'closed_fail' && !formData.failureReason) {
      validationErrors.failure_reason = ['Select a failure reason.'];
    }

    if (formData.status === 'closed_fail' && formData.failureReason === 'other' && !formData.failureReasonDetails.trim()) {
      validationErrors.failure_reason_details = ['Enter the custom failure reason.'];
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

    setSubmitting(true);
    try {
      if (id) {
        await leadService.update(id, leadPayload(formData));
        toast.success('Lead updated successfully');
      } else {
        await leadService.create(leadPayload(formData));
        toast.success('Lead created successfully');
      }

      navigate('/leads');
    } catch (error: any) {
      setErrors(error.errors || {});
      const duplicatePhoneMessage = error?.errors?.phone?.[0];
      if (duplicatePhoneMessage) {
        toast.error(duplicatePhoneMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate('/leads')} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900">
            {id ? 'Edit Lead' : 'Create Lead'}
          </h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <LoadingState label="Loading lead..." />
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[40%_25%_25%] md:justify-between md:gap-0">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className={fieldClassName(Boolean(errors.name?.[0]))}
                />
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
                  onChange={(event) => {
                    const status = event.target.value;
                    if (status === 'closed_fail') {
                      setFailureDialogOpen(true);
                      return;
                    }
                    setFormData((current) => ({
                      ...current,
                      status,
                      followUpDate: CLOSED_LEAD_STATUSES.includes(status) && !CLOSED_LEAD_STATUSES.includes(current.status)
                        ? today
                        : current.followUpDate,
                      failureReason: '',
                      failureReasonDetails: '',
                    }));
                  }}
                  className={fieldClassName(Boolean(errors.status?.[0]))}
                >
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.status?.[0] && <p className="mt-1 text-sm text-red-600">{errors.status[0]}</p>}
                {formData.status === 'closed_fail' && formData.failureReason && (
                  <button type="button" onClick={() => setFailureDialogOpen(true)}
                    className="mt-2 block text-left text-sm font-medium text-rose-600 hover:underline">
                    Failure reason: {leadFailureReasonLabel(formData.failureReason, formData.failureReasonDetails)} — Change
                  </button>
                )}
                {errors.failure_reason?.[0] && <p className="mt-1 text-sm text-red-600">{errors.failure_reason[0]}</p>}
                {errors.failure_reason_details?.[0] && <p className="mt-1 text-sm text-red-600">{errors.failure_reason_details[0]}</p>}
              </div>

            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Phone No.</label>
                <div className="flex">
                  <span className={`inline-flex items-center rounded-l-xl border border-r-0 px-4 text-gray-700 ${
                    errors.phone?.[0] ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={30}
                    value={formData.phone}
                    onChange={(event) => setFormData((current) => ({
                      ...current,
                      phone: normalizeIndianPhone(event.target.value),
                    }))}
                    className={`${fieldClassName(Boolean(errors.phone?.[0]))} rounded-l-none`}
                  />
                </div>
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
                <p className="mt-1 text-xs text-gray-500">At least one of phone number, email, or influencer is required.</p>
                {errors.email?.[0] && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Customer Importance</label>
                <select
                  value={formData.customerImportance}
                  onChange={(event) => setFormData((current) => ({ ...current, customerImportance: event.target.value }))}
                  className={fieldClassName(Boolean(errors.customer_importance?.[0]))}
                >
                  <option value="">None</option>
                  {CUSTOMER_IMPORTANCE_OPTIONS.map((importance) => (
                    <option key={importance} value={importance}>{importance}</option>
                  ))}
                </select>
                {errors.customer_importance?.[0] && <p className="mt-1 text-sm text-red-600">{errors.customer_importance[0]}</p>}
              </div>
            </div>

            <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/60 p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900">Lead Quality Details</h3>
                <p className="mt-1 text-sm text-gray-500">Rate closure readiness and record the lead's expected value and timeline.</p>
              </div>

              <div className="mb-6 rounded-xl border border-orange-100 bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <label htmlFor="closure-hot-level" className="text-sm font-semibold text-gray-800">Closure Hot Level</label>
                  <span className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${formData.closureHotLevel > 8 ? 'bg-red-100 text-red-700' : formData.closureHotLevel > 5 ? 'bg-orange-100 text-orange-700' : 'bg-lime-100 text-lime-700'}`}>{formData.closureHotLevel}</span>
                </div>
                <input
                  id="closure-hot-level"
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={formData.closureHotLevel}
                  onChange={(event) => setFormData((current) => ({ ...current, closureHotLevel: Number(event.target.value) }))}
                  className="closure-hot-range block w-full"
                  aria-valuetext={`${formData.closureHotLevel} out of 10`}
                />
                <div className="mt-2 flex justify-between text-[11px] font-medium text-gray-500"><span>1 · Low</span><span>5 · Warm</span><span>10 · Very Hot</span></div>
                {errors.closure_hot_level?.[0] && <p className="mt-2 text-sm text-red-600">{errors.closure_hot_level[0]}</p>}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Lead Expected Order Value {formData.status === 'in_progress' ? '*' : ''}</label>
                  <select value={formData.expectedOrderValue} required={formData.status === 'in_progress'} onChange={(event) => setFormData((current) => ({ ...current, expectedOrderValue: event.target.value }))} className={fieldClassName(Boolean(errors.expected_order_value?.[0]))}>
                    <option value="">Select order value</option>
                    {LEAD_EXPECTED_ORDER_VALUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.expected_order_value?.[0] && <p className="mt-1 text-sm text-red-600">{errors.expected_order_value[0]}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Expected Closure {formData.status === 'in_progress' ? '*' : ''}</label>
                  <select value={formData.expectedClosure} required={formData.status === 'in_progress'} onChange={(event) => setFormData((current) => ({ ...current, expectedClosure: event.target.value }))} className={fieldClassName(Boolean(errors.expected_closure?.[0]))}>
                    <option value="">Select expected closure</option>
                    {LEAD_EXPECTED_CLOSURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.expected_closure?.[0] && <p className="mt-1 text-sm text-red-600">{errors.expected_closure[0]}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Customer Category</label>
                  <select value={formData.customerCategory} onChange={(event) => setFormData((current) => ({ ...current, customerCategory: event.target.value }))} className={fieldClassName(Boolean(errors.customer_category?.[0]))}>
                    <option value="">None</option>
                    {CUSTOMER_CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  {errors.customer_category?.[0] && <p className="mt-1 text-sm text-red-600">{errors.customer_category[0]}</p>}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Assigned To</label>
                <select
                  value={formData.assignedTo}
                  onChange={(event) => setFormData((current) => ({ ...current, assignedTo: event.target.value }))}
                  className={fieldClassName(Boolean(errors.assigned_to?.[0]))}
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {[user.name, user.designation].filter(Boolean).join(' - ')}
                    </option>
                  ))}
                </select>
                {errors.assigned_to?.[0] && <p className="mt-1 text-sm text-red-600">{errors.assigned_to[0]}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Influencer <span className="font-normal text-gray-400">(Optional)</span></label>
                <div className={`flex min-h-[46px] items-center rounded-xl border bg-white ${errors.influencer_id?.[0] ? 'border-red-500' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => { setInfluencerSearch(''); setInfluencerDialogOpen(true); }}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <UserRoundSearch className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`truncate ${selectedInfluencer ? 'text-gray-900' : 'text-gray-500'}`}>
                      {selectedInfluencer ? [selectedInfluencer.name, selectedInfluencer.companyName || selectedInfluencer.company_name].filter(Boolean).join(' — ') : 'Search and select influencer'}
                    </span>
                  </button>
                  {selectedInfluencer && (
                    <button
                      type="button"
                      onClick={() => { setSelectedInfluencer(null); setFormData((current) => ({ ...current, influencerId: '' })); }}
                      className="mr-2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Clear influencer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {errors.influencer_id?.[0] && <p className="mt-1 text-sm text-red-600">{errors.influencer_id[0]}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(event) => setFormData((current) => ({ ...current, addressLine1: event.target.value }))}
                  className={fieldClassName(Boolean(errors.address_line_1?.[0]))}
                />
                {errors.address_line_1?.[0] && <p className="mt-1 text-sm text-red-600">{errors.address_line_1[0]}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(event) => setFormData((current) => ({ ...current, addressLine2: event.target.value }))}
                  className={fieldClassName(Boolean(errors.address_line_2?.[0]))}
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {CLOSED_LEAD_STATUSES.includes(formData.status) ? 'Closure Date *' : 'Follow Up Date *'}
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  disabled={CLOSED_LEAD_STATUSES.includes(formData.status)}
                  value={formData.followUpDate}
                  onChange={(event) => setFormData((current) => ({ ...current, followUpDate: event.target.value }))}
                  className={`${fieldClassName(Boolean(errors.follow_up_date?.[0]))} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600`}
                />
                {CLOSED_LEAD_STATUSES.includes(formData.status) && (
                  <p className="mt-1 text-xs text-gray-500">Automatically set when the lead is closed.</p>
                )}
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

            <div className="flex flex-col justify-end gap-3 border-t border-gray-200 pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/leads')}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-white transition-all hover:bg-blue-700"
              >
                <Save className="h-5 w-5" />
                {submitting ? 'Saving...' : id ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>
          </form>
        )}
      </div>
      <Dialog open={influencerDialogOpen} onOpenChange={setInfluencerDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Influencer</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={influencerSearch}
              onChange={(event) => setInfluencerSearch(event.target.value)}
              placeholder="Search influencer by name, phone, email, company or city"
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {influencersLoading ? <LoadingState label="Searching influencers..." /> : influencers.map((influencer) => (
              <button
                key={influencer.id}
                type="button"
                onClick={() => {
                  setSelectedInfluencer(influencer);
                  setFormData((current) => ({ ...current, influencerId: String(influencer.id) }));
                  setInfluencerDialogOpen(false);
                  setErrors((current) => { const next = { ...current }; delete next.influencer_id; return next; });
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 ${String(influencer.id) === formData.influencerId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <span className="rounded-full bg-blue-100 p-2.5 text-blue-700"><UserRoundSearch className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{influencer.name}</span>
                  <span className="block truncate text-sm text-gray-500">{[influencer.company_name, influencer.city, influencer.phone].filter(Boolean).join(' · ') || 'No additional details'}</span>
                </span>
                {String(influencer.id) === formData.influencerId && <span className="text-xs font-semibold text-blue-700">Selected</span>}
              </button>
            ))}
            {!influencersLoading && influencers.length === 0 && <div className="py-10 text-center text-sm text-gray-500">No active influencers found.</div>}
          </div>
        </DialogContent>
      </Dialog>
      <LeadFailureReasonDialog
        open={failureDialogOpen}
        initialReason={formData.failureReason}
        initialDetails={formData.failureReasonDetails}
        onCancel={() => setFailureDialogOpen(false)}
        onConfirm={(reason, details) => {
          setFormData((current) => ({
            ...current,
            status: 'closed_fail',
            followUpDate: CLOSED_LEAD_STATUSES.includes(current.status) ? current.followUpDate : today,
            failureReason: reason,
            failureReasonDetails: details,
          }));
          setFailureDialogOpen(false);
          setErrors((current) => {
            const next = { ...current };
            delete next.failure_reason;
            delete next.failure_reason_details;
            return next;
          });
        }}
      />
    </div>
  );
};
