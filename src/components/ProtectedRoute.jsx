import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ redirectTo = '/login' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="protected-route-loading">
        <p>Loading your workspace…</p>
      </div>
    );
  }

  if (!user) {
    const attemptedPath = [location.pathname, location.search, location.hash]
      .filter(Boolean)
      .join('');

    return <Navigate to={redirectTo} replace state={{ from: attemptedPath }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
