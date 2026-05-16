import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const COUNTRIES = ['India', 'United Arab Emirates', 'United States', 'United Kingdom', 'Australia', 'Canada', 'Singapore'];

export const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customers, addCustomer, updateCustomer, customFields, loading } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    rating: 0,
    notes: '',
    customFields: {} as Record<string, any>,
  });

  useEffect(() => {
    if (id) {
      const customer = customers.find(c => c.id === id);
      if (customer) {
        setFormData(customer);
      }
    }
  }, [id, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.name || !formData.phone || !formData.addressLine1 || !formData.state || !formData.country) {
      toast.error('Please complete the required customer fields');
      return;
    }

    setSubmitting(true);
    try {
      if (id) {
        await updateCustomer(id, formData);
        toast.success('Customer updated successfully');
      } else {
        await addCustomer(formData);
        toast.success('Customer added successfully');
      }
      navigate('/customers');
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomField = (field: any) => {
    const value = formData.customFields[field.id] ?? '';
    const updateValue = (nextValue: any) => setFormData({
      ...formData,
      customFields: { ...formData.customFields, [field.id]: nextValue },
    });

    if (field.type === 'select' || field.apiType === 'dropdown') {
      return (
        <select
          required={field.required}
          value={value}
          onChange={(e) => updateValue(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select...</option>
          {field.options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.apiType === 'textarea') {
      return (
        <textarea
          required={field.required}
          rows={3}
          value={value}
          onChange={(e) => updateValue(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );
    }

    if (field.apiType === 'checkbox') {
      return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateValue(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          Enabled
        </label>
      );
    }

    const inputType = field.apiType === 'phone' ? 'tel' : field.type;
    return (
      <input
        type={inputType}
        required={field.required}
        value={value}
        onChange={(e) => updateValue(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900">
            {id ? 'Edit Customer' : 'Add New Customer'}
          </h2>
        </div>

        {loading && id ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <LoadingState label="Loading customer..." />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.primary_name?.[0] && <p className="text-sm text-red-600 mt-1">{errors.primary_name[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.company_name?.[0] && <p className="text-sm text-red-600 mt-1">{errors.company_name[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.email?.[0] && <p className="text-sm text-red-600 mt-1">{errors.email[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.phone?.[0] && <p className="text-sm text-red-600 mt-1">{errors.phone[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.address_line_1?.[0] && <p className="text-sm text-red-600 mt-1">{errors.address_line_1[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.address_line_2?.[0] && <p className="text-sm text-red-600 mt-1">{errors.address_line_2[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.city?.[0] && <p className="text-sm text-red-600 mt-1">{errors.city[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state?.[0] && <p className="text-sm text-red-600 mt-1">{errors.state[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.pincode?.[0] && <p className="text-sm text-red-600 mt-1">{errors.pincode[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {errors.country?.[0] && <p className="text-sm text-red-600 mt-1">{errors.country[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Rating
              </label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Not rated</option>
                <option value={1}>1 / 5</option>
                <option value={2}>2 / 5</option>
                <option value={3}>3 / 5</option>
                <option value={4}>4 / 5</option>
                <option value={5}>5 / 5</option>
              </select>
              {errors.rating?.[0] && <p className="text-sm text-red-600 mt-1">{errors.rating[0]}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.notes?.[0] && <p className="text-sm text-red-600 mt-1">{errors.notes[0]}</p>}
            </div>
          </div>

          {customFields.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.name} {field.required && '*'}
                    </label>
                    {renderCustomField(field)}
                    {errors[`custom_fields.${field.key}`]?.[0] && (
                      <p className="text-sm text-red-600 mt-1">{errors[`custom_fields.${field.key}`][0]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <Save className="w-5 h-5" />
              {submitting ? 'Saving...' : `${id ? 'Update' : 'Save'} Customer`}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
