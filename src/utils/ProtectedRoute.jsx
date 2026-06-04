import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import { logout, setRole } from "../redux/GlobalSlice";
import {
  decodeTokenRole,
  getHomePathForRole,
  getLoginPathForAllowedRoles,
  roleAllowed,
  clearOtherPanelSessions,
} from "./authRole";

/**
 * @param {string[]} allowedRoles - empty = any authenticated role
 * @param {string} [loginPath] - where to send unauthenticated users
 * @param {'login'|'home'} [wrongRolePolicy] - login: panel login + clear token; home: user's own dashboard
 */
const ProtectedRoute = ({
  allowedRoles = [],
  redirectTo = null,
  loginPath = null,
  wrongRolePolicy = "home",
  children,
}) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const reduxToken = useSelector(selectToken);
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const token =
    reduxToken ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  const resolvedLoginPath =
    loginPath || redirectTo || getLoginPathForAllowedRoles(allowedRoles);

  if (rehydrated !== true) {
    return null;
  }

  if (!token) {
    return (
      <Navigate to={resolvedLoginPath} state={{ from: location }} replace />
    );
  }

  const userRole = decodeTokenRole(token);
  if (!userRole) {
    dispatch(logout());
    return <Navigate to={resolvedLoginPath} replace />;
  }

  dispatch(setRole(userRole));
  clearOtherPanelSessions(userRole);

  if (allowedRoles.length > 0 && !roleAllowed(userRole, allowedRoles)) {
    if (wrongRolePolicy === "login") {
      dispatch(logout());
      return <Navigate to={resolvedLoginPath} replace />;
    }
    return <Navigate to={getHomePathForRole(userRole)} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
