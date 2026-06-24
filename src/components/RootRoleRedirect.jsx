import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import { useAuthSession } from "../context/AuthSessionContext";
import { getValidTokenRole, getHomePathForRole, getLoginPathForRole } from "../utils/authRole";

/** Sends `/` to the correct panel home or login from JWT role. */
export default function RootRoleRedirect() {
  const { sessionReady } = useAuthSession();
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const token = useSelector(selectToken);

  if (rehydrated !== true || !sessionReady) return null;

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  const role = getValidTokenRole(token);
  if (!role) {
    return <Navigate to="/admin" replace />;
  }

  const home = getHomePathForRole(role);
  const login = getLoginPathForRole(role);
  if (home && home !== login) {
    return <Navigate to={home} replace />;
  }
  return <Navigate to={login} replace />;
}
