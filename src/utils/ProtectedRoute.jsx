import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import { setRole } from "../redux/GlobalSlice";
import { useAuthSession } from "../context/AuthSessionContext";
import { performLogout } from "./sessionLogout";
import {
  getValidTokenRole,
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
  const { sessionReady } = useAuthSession();
  const reduxToken = useSelector(selectToken);
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const token = reduxToken;

  const resolvedLoginPath =
    loginPath || redirectTo || getLoginPathForAllowedRoles(allowedRoles);
  const userRole = token ? getValidTokenRole(token) : "";
  const roleMismatch =
    Boolean(userRole) &&
    allowedRoles.length > 0 &&
    !roleAllowed(userRole, allowedRoles);

  useEffect(() => {
    if (rehydrated !== true || !sessionReady) return;

    if (token && !userRole) {
      performLogout({ server: false });
      return;
    }

    if (!userRole) return;

    dispatch(setRole(userRole));
    clearOtherPanelSessions(userRole);
  }, [rehydrated, sessionReady, token, userRole, dispatch]);

  useEffect(() => {
    if (!roleMismatch || wrongRolePolicy !== "login") return;
    performLogout({ server: true });
  }, [roleMismatch, wrongRolePolicy]);

  if (rehydrated !== true || !sessionReady) {
    return null;
  }

  if (!token) {
    return (
      <Navigate to={resolvedLoginPath} state={{ from: location }} replace />
    );
  }

  if (!userRole) {
    return <Navigate to={resolvedLoginPath} replace />;
  }

  if (roleMismatch) {
    if (wrongRolePolicy === "login") {
      return <Navigate to={resolvedLoginPath} replace />;
    }
    return <Navigate to={getHomePathForRole(userRole)} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
