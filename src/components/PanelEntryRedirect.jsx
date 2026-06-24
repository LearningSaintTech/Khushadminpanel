import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import { useAuthSession } from "../context/AuthSessionContext";
import {
  getValidTokenRole,
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
  const { sessionReady } = useAuthSession();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const token = useSelector(selectToken);

  if (rehydrated !== true || !sessionReady) return null;

  if (!token) {
    return <Navigate to={loginPath} replace />;
  }

  const role = getValidTokenRole(token);
  if (role && roleAllowed(role, allowedRoles)) {
    return <Navigate to={homePath || getHomePathForRole(role)} replace />;
  }

  return <Navigate to={loginPath} replace />;
}
