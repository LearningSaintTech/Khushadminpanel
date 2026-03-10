// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode'; // npm install jwt-decode

const ProtectedRoute = ({ allowedRoles = [], redirectTo = null, children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!token) {
    const defaultRedirect = redirectTo || getDefaultLoginPath(allowedRoles);
    return <Navigate to={defaultRedirect} state={{ from: location }} replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    localStorage.clear();
    return <Navigate to={getDefaultLoginPath(allowedRoles)} replace />;
  }

  const userRole = (decoded.role || decoded.userRole || 'UNKNOWN').toUpperCase();

  if (allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(
      (allowed) => userRole === allowed.toUpperCase()
    );

    if (!hasAccess) {
      return <Navigate to={getDashboardPath(userRole)} replace />;
    }
  }

   return children ? children : <Outlet />;
};

// ────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────
const getDefaultLoginPath = (allowedRoles) => {
  if (allowedRoles.includes('ADMIN')) return '/admin/login';
  if (allowedRoles.includes('SUBADMIN')) return '/subadmin/login';
  if (allowedRoles.includes('DRIVER')) return '/driver/login';
  if (allowedRoles.includes('INFLUENCER')) return '/influencer/login';
  return '/admin/login'; // fallback
};

const getDashboardPath = (userRole) => {
  switch (userRole) {
    case 'ADMIN':
    case 'SUBADMIN':
      return '/admin/dashboard';
    case 'DRIVER':
      return '/driver/dashboard';
    case 'INFLUENCER':
      return '/influencer/dashboard';
    default:
      return '/admin/login';
  }
};

export default ProtectedRoute;