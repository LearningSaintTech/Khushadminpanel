// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { selectToken } from "../redux/GlobalSelector";
import { logout } from "../redux/GlobalSlice";

const ProtectedRoute = ({ allowedRoles = [], redirectTo = null, children }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const reduxToken = useSelector(selectToken);
  const token = reduxToken ?? (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (!token) {
    const defaultRedirect = redirectTo || getDefaultLoginPath(allowedRoles);
    return <Navigate to={defaultRedirect} state={{ from: location }} replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    dispatch(logout());
    return <Navigate to={getDefaultLoginPath(allowedRoles)} replace />;
  }

  const rawUserRole = (decoded.role || decoded.userRole || "UNKNOWN").toUpperCase();
  // Treat SUPER_SUBADMIN same as SUBADMIN for frontend routing/permissions.
  const userRole = rawUserRole === "SUPER_SUBADMIN" ? "SUBADMIN" : rawUserRole;

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
  if (allowedRoles.includes('DESIGNER')) return '/designer/login';
  if (allowedRoles.includes('INFLUENCER')) return '/influencer/login';
  return '/admin/login'; // fallback
};

const getDashboardPath = (userRole) => {
  switch (userRole) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'SUBADMIN':
      return '/subadmin/dashboard';
    case 'DRIVER':
      return '/driver/dashboard';
    case 'DESIGNER':
      return '/designer/dashboard';
    case 'INFLUENCER':
      return '/influencer/dashboard';
    default:
      return '/admin/login';
  }
};

export default ProtectedRoute;