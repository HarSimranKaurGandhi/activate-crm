import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

export const PrivateRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role?.code === 'influencer' && !(/^\/influencer\/leads$/.test(location.pathname) || /^\/quotations(?:\/new|\/\d+\/preview)?$/.test(location.pathname))) {
    return <Navigate to="/influencer/leads" replace />;
  }
  return <Outlet />;
};

