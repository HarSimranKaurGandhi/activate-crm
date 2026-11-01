import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export function InfluencerLoginDialog({ influencer, onClose, onSaved }: { influencer: any; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(influencer.login_email || influencer.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await apiClient.post(`/influencers/${influencer.id}/login-account`, { email, password });
      toast.success('Login saved. The influencer can sign in using this email and password.');
      onSaved(); onClose();
    } catch (failure: any) { setError(Object.values(failure?.errors || {}).flat().join(' ') || 'Unable to save influencer login.'); }
    finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{influencer.has_login ? 'Reset Influencer Login' : 'Create Influencer Login'}</DialogTitle><DialogDescription>Set credentials for {influencer.name}. They will use the existing CRM login page. Share these credentials with them separately.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><label className="block text-sm">Login email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-2" autoComplete="off" /></label><label className="block text-sm">New password (at least 12 characters)<input type="password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2" autoComplete="new-password" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white">{saving ? 'Saving...' : 'Save Login'}</button></form></DialogContent></Dialog>;
}
