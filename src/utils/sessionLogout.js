import axios from "axios";
import appStore from "../redux/Appstore";
import { logout } from "../redux/GlobalSlice";
import { decodeTokenRole, getRoleFromPathname, normalizeRole } from "./authRole";
import { getApiBaseUrl, getOrCreateDeviceId } from "./apiConfig";

const LOGOUT_BY_ROLE = {
  ADMIN: "/admin/logout",
  SUBADMIN: "/subadmin/logout",
  DRIVER: "/delivery-agent/logout",
  INFLUENCER: "/influencer/logout",
  DESIGNER: "/designer/auth/logout",
  AGENT: "/agent/auth/logout",
};

const logoutClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true,
});

/** Best-effort role for logout / refresh routing. */
export function resolveActiveRole() {
  const state = appStore.getState().global;
  const token = state?.token;
  const fromToken = token ? decodeTokenRole(token) : "";
  const fromPath =
    typeof window !== "undefined" ? getRoleFromPathname(window.location.pathname) : "";
  return normalizeRole(fromToken || fromPath || state?.role);
}

/** Invalidate httpOnly refresh cookie on the server (best effort). */
export async function clearServerSession(roleHint) {
  const role = normalizeRole(roleHint || resolveActiveRole());
  const path = LOGOUT_BY_ROLE[role];
  if (!path) return;

  try {
    const token = appStore.getState().global?.token;
    const headers = { "x-device-id": getOrCreateDeviceId() };
    if (token) headers.Authorization = `Bearer ${token}`;
    await logoutClient.post(path, {}, { headers });
  } catch {
    /* still clear client state */
  }
}

/** Server logout + Redux memory clear. */
export async function performLogout({ server = true } = {}) {
  if (server) {
    await clearServerSession(resolveActiveRole());
  }
  appStore.dispatch(logout());
}
