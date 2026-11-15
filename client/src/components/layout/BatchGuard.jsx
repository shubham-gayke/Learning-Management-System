import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard: If student has no batch assigned, redirect to /select-batch.
 * Otherwise, render children (or Outlet for nested routes).
 */
export default function BatchGuard({ children }) {
  const { user } = useAuth();

  if (user?.role === 'student' && !user?.batch) {
    return <Navigate to="/select-batch" replace />;
  }

  return children || <Outlet />;
}
