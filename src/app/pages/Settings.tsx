import { useData } from '../context/DataContext';
import { Save, Building, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FieldError } from '../components/common/AsyncState';

export const Settings = () => {
  const { settings, updateSettings } = useData();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await updateSettings(formData);
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Company Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.company_name?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData({
                      ...formData,
                      logoFile: file,
                      logo: file ? URL.createObjectURL(file) : formData.logo,
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.logo && <img src={formData.logo} alt="Logo preview" className="mt-3 h-14 object-contain" />}
                <FieldError message={errors.logo_file?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.gst_number?.[0]} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.email?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Letterhead
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData({
                      ...formData,
                      letterheadFile: file,
                      letterhead: file ? URL.createObjectURL(file) : formData.letterhead,
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.letterhead && (
                  formData.letterheadFile?.type === 'application/pdf' || formData.letterhead.toLowerCase().endsWith('.pdf')
                    ? <a href={formData.letterhead} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-blue-600 hover:underline">View current letterhead</a>
                    : <img src={formData.letterhead} alt="Letterhead preview" className="mt-3 h-16 w-full object-cover rounded-lg border border-gray-200" />
                )}
                <FieldError message={errors.letterhead_file?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quotation Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={formData.quotationPrefix}
                  onChange={(e) => setFormData({ ...formData, quotationPrefix: e.target.value })}
                  placeholder="e.g., FEQ"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.quotation_prefix?.[0]} />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.bank_name?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.account_number?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.ifsc}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, ifsc: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError message={errors.ifsc_code?.[0]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.branch}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, branch: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
