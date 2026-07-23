import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { leadService } from '../../services/leadService';
import { leadPayload, mapLead } from '../../services/mappers';
import { userService } from '../../services/userService';
import { useAuth } from '../auth/AuthContext';

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

const formatDateInput = (date: Date) => date.toISOString().split('T')[0];
const today = formatDateInput(new Date());
const defaultFollowUpDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return formatDateInput(date);
})();

export const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
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
    status: 'new',
    tags: [] as string[],
    followUpDate: defaultFollowUpDate,
    assignedTo: user?.id ? String(user.id) : '',
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
          status: mapped.status,
          tags: mapped.tags,
          followUpDate: mapped.followUpDate,
          assignedTo: mapped.assignedTo,
        });
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Lead Expected Order Value {formData.status === 'in_progress' ? '*' : ''}
                </label>
                <select
                  value={formData.expectedOrderValue}
                  required={formData.status === 'in_progress'}
                  onChange={(event) => setFormData((current) => ({ ...current, expectedOrderValue: event.target.value }))}
                  className={fieldClassName(Boolean(errors.expected_order_value?.[0]))}
                >
                  <option value="">Select order value</option>
                  {LEAD_EXPECTED_ORDER_VALUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Mandatory when the lead status is In Progress.</p>
                {errors.expected_order_value?.[0] && <p className="mt-1 text-sm text-red-600">{errors.expected_order_value[0]}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expected Closure {formData.status === 'in_progress' ? '*' : ''}
                </label>
                <select
                  value={formData.expectedClosure}
                  required={formData.status === 'in_progress'}
                  onChange={(event) => setFormData((current) => ({ ...current, expectedClosure: event.target.value }))}
                  className={fieldClassName(Boolean(errors.expected_closure?.[0]))}
                >
                  <option value="">Select expected closure</option>
                  {LEAD_EXPECTED_CLOSURE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
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
    </div>
  );
};
