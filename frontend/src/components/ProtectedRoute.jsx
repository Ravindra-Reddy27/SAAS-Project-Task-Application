import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show a loading spinner while checking the token
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not logged in, redirect to login page
  // 'state' saves the current location so we can send them back there after login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If logged in, render the child routes (Dashboard, Projects, etc.)
  return <Outlet />;
}