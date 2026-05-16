import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <BrandLogo
          className="mb-8"
          imageClassName="h-11"
          textClassName="text-lg"
          subtitleClassName="mt-1"
          showSubtitle
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
            />
            {errors.email?.[0] && <p className="text-sm text-red-600 mt-1">{errors.email[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
            />
            {errors.password?.[0] && <p className="text-sm text-red-600 mt-1">{errors.password[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
