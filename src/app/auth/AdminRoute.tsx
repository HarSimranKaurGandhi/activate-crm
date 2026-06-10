import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

export const AdminRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
