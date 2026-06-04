import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import {
  decodeTokenRole,
  getHomePathForRole,
  roleAllowed,
} from "../utils/authRole";

/**
 * Panel index route: logged-in users with the right role go to dashboard, else login.
 */
export default function PanelEntryRedirect({
  allowedRoles,
  loginPath,
  homePath,
}) {
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const reduxToken = useSelector(selectToken);
  const token =
    reduxToken ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (rehydrated !== true) return null;

  if (!token) {
    return <Navigate to={loginPath} replace />;
  }

  const role = decodeTokenRole(token);
  if (role && roleAllowed(role, allowedRoles)) {
    return <Navigate to={homePath || getHomePathForRole(role)} replace />;
  }

  return <Navigate to={loginPath} replace />;
}
