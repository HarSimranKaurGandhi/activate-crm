import { useData } from '../context/DataContext';
import { Save, Building, CreditCard, Copy, KeyRound, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FieldError } from '../components/common/AsyncState';
import { settingsService } from '../../services/settingsService';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { apiBaseUrl } from '../../services/apiClient';

export const Settings = () => {
  const { settings, updateSettings } = useData();
  const { user }=useAuth();const role=String(user?.role?.code||user?.role?.name||'').toLowerCase();const isAdmin=role==='admin';
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [apiTokens,setApiTokens]=useState<any[]>([]);const[tokenName,setTokenName]=useState('Lead Integration');const[newToken,setNewToken]=useState('');const[tokenSaving,setTokenSaving]=useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);
  useEffect(()=>{settingsService.leadApiTokens().then(setApiTokens).catch(()=>setApiTokens([]));},[]);
  const generateToken=async()=>{if(!tokenName.trim())return;setTokenSaving(true);try{const result=await settingsService.createLeadApiToken(tokenName.trim());setNewToken(result.token);setApiTokens(current=>[{id:result.id,name:result.name,created_at:result.created_at},...current]);toast.success('Lead API token generated');}finally{setTokenSaving(false);}};
  const revokeToken=async(id:string|number)=>{await settingsService.revokeLeadApiToken(id);setApiTokens(current=>current.filter(token=>String(token.id)!==String(id)));toast.success('Token revoked');};

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
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>

        {isAdmin&&<form onSubmit={handleSubmit} className="space-y-6">
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
        </form>}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50"><KeyRound className="h-5 w-5 text-violet-600"/></div><div><h3 className="text-lg font-semibold text-gray-900">Lead API Tokens</h3><p className="text-sm text-gray-500">Generate and manage tokens used by external lead sources.</p></div></div>
          <div className="flex flex-col gap-3 sm:flex-row"><input value={tokenName} onChange={event=>setTokenName(event.target.value)} placeholder="Token name" className="flex-1 rounded-xl border px-4 py-2.5"/><button type="button" disabled={tokenSaving||!tokenName.trim()} onClick={()=>void generateToken()} className="rounded-xl bg-violet-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">{tokenSaving?'Generating...':'Generate Token'}</button></div>
          {newToken&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-sm font-medium text-amber-900">Copy this token now. It will not be shown again.</div><div className="mt-2 flex gap-2"><input readOnly value={newToken} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 font-mono text-xs"/><button type="button" onClick={()=>void navigator.clipboard.writeText(newToken).then(()=>toast.success('Token copied'))} className="rounded-lg border bg-white p-2 text-violet-700"><Copy className="h-4 w-4"/></button></div></div>}
          <div className="mt-5 divide-y rounded-xl border">{apiTokens.map(token=><div key={token.id} className="flex items-center justify-between gap-4 p-4"><div><div className="font-medium">{token.name}</div><div className="text-xs text-gray-500">Created {new Date(token.created_at).toLocaleString('en-IN')}{token.last_used_at?` · Last used ${new Date(token.last_used_at).toLocaleString('en-IN')}`:''}</div></div><button type="button" onClick={()=>void revokeToken(token.id)} className="rounded-lg p-2 text-red-600" title="Revoke token"><Trash2 className="h-4 w-4"/></button></div>)}{!apiTokens.length&&<div className="p-5 text-center text-sm text-gray-500">No lead API tokens generated.</div>}</div>
          <div className="mt-6 space-y-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700"><div><h4 className="font-semibold text-slate-900">How to use the Lead API</h4><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Enter a descriptive token name and click Generate Token.</li><li>Copy the token immediately and store it securely.</li><li>Send a POST request using the endpoint and headers below.</li><li>Revoke the token here when the integration is no longer used.</li></ol></div>
            <div><div className="mb-1 font-semibold text-slate-900">Endpoint</div><div className="flex items-center gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-white p-3 text-xs">POST {apiBaseUrl}/integrations/leads/batch</code><button type="button" onClick={()=>void navigator.clipboard.writeText(`${apiBaseUrl}/integrations/leads/batch`).then(()=>toast.success('Endpoint copied'))} className="rounded-lg border bg-white p-2 text-violet-700"><Copy className="h-4 w-4"/></button></div></div>
            <div><div className="mb-1 font-semibold text-slate-900">Required headers</div><pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{`Authorization: Bearer YOUR_TOKEN\nContent-Type: application/json\nAccept: application/json`}</pre></div>
            <div><div className="mb-1 font-semibold text-slate-900">JSON request example</div><pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{`[\n  {\n    "name": "Customer Name",\n    "phone": "9876543210",\n    "email": "customer@example.com",\n    "requirement": "Treadmill and cross trainer",\n    "lead_source": "website"\n  }\n]`}</pre><p className="mt-2 text-xs">You may send a direct JSON array or an object containing a <code>leads</code> array. A maximum of 100 leads is allowed per request.</p></div>
            <div><div className="mb-1 font-semibold text-slate-900">cURL example</div><pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{`curl -X POST '${apiBaseUrl}/integrations/leads/batch' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -H 'Content-Type: application/json' \\\n  -d '[{"name":"Customer Name","phone":"9876543210","requirement":"Treadmill","lead_source":"website"}]'`}</pre></div>
            <div className="grid gap-4 md:grid-cols-2"><div><div className="font-semibold text-slate-900">Minimum fields</div><p className="mt-1 text-xs">Provide either phone or email, plus requirement. Phone must contain exactly 10 digits.</p></div><div><div className="font-semibold text-slate-900">Optional fields</div><p className="mt-1 text-xs">name, lead_source, email, address fields, city, state, pincode, country, expected_order_value, expected_closure, status, tags, follow_up_date, assigned_to and assigned_user initials.</p></div><div><div className="font-semibold text-slate-900">Defaults for new leads</div><p className="mt-1 text-xs">Source: Website; Status: New; Follow-up date: two days later. Blank assigned-user initials are randomly assigned to an active Sales User or Sales Manager.</p></div><div><div className="font-semibold text-slate-900">Duplicate handling</div><p className="mt-1 text-xs">Phone or email identifies an existing lead. Existing values are preserved, empty fields are filled, tags are merged, and a new requirement is appended on a new line.</p></div></div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-900"><strong>Security:</strong> Lead API tokens can only access this batch endpoint. Never place a token in browser-side code or share it publicly. Revoke compromised tokens immediately.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
