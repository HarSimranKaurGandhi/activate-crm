import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!email || !password) {
      setErrors({
        email: !email ? ['Email is required.'] : [],
        password: !password ? ['Password is required.'] : [],
      });
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate((location.state as any)?.from || '/', { replace: true });
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f8_100%)] flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm bg-white/95 border border-slate-200 rounded-xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
        <BrandLogo
          className="mb-6 justify-center"
          imageClassName="h-10"
          textClassName="text-lg"
          subtitleClassName="mt-1"
          showSubtitle
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                autoComplete="email"
              />
            </div>
            {errors.email?.[0] && <p className="text-sm text-red-600 mt-1">{errors.email[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                autoComplete="current-password"
              />
            </div>
            {errors.password?.[0] && <p className="text-sm text-red-600 mt-1">{errors.password[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
