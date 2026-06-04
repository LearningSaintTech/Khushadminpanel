import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/GlobalSelector";
import { decodeTokenRole, getHomePathForRole, getLoginPathForRole } from "../utils/authRole";

/** Sends `/` to the correct panel home or login from persisted JWT role. */
export default function RootRoleRedirect() {
  const rehydrated = useSelector((state) => state._persist?.rehydrated);
  const reduxToken = useSelector(selectToken);
  const token =
    reduxToken ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (rehydrated !== true) return null;

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  const role = decodeTokenRole(token);
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
