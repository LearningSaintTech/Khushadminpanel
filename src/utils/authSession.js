import axios from "axios";
import { getApiBaseUrl, getOrCreateDeviceId } from "./apiConfig";
import { decodeTokenRole, normalizeRole, getRoleFromPathname } from "./authRole";

const refreshClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
  withCredentials: true,
});

/** Map JWT role → backend refresh endpoint (cookie-based). */
export function getRefreshEndpointForRole(role) {
  switch (normalizeRole(role)) {
    case "ADMIN":
      return "/admin/newAccessToken";
    case "SUBADMIN":
      return "/subadmin/newAccessToken";
    case "DRIVER":
      return "/delivery-agent/newAccessToken";
    case "INFLUENCER":
      return "/influencer/newAccessToken";
    case "DESIGNER":
      return "/designer/auth/newAccessToken";
    case "AGENT":
      return "/agent/auth/newAccessToken";
    case "ORDER_AGENT":
      return "/order-agent/auth/newAccessToken";
    default:
      return null;
  }
}

function extractAccessToken(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.accessToken ??
    payload.access_token ??
    payload.data?.accessToken ??
    payload.data?.access_token ??
    null
  );
}

/**
 * Exchange httpOnly refresh cookie for a new access token.
 * @param {string} [roleHint] - persisted or decoded role when access token is missing/expired
 */
export async function refreshAccessToken(roleHint) {
  const role = normalizeRole(roleHint || "");
  const path = getRefreshEndpointForRole(role);
  if (!path) return null;

  const deviceId = getOrCreateDeviceId();
  const response = await refreshClient.post(
    path,
    {},
    { headers: { "x-device-id": deviceId } }
  );
  const body = response?.data;
  const token = extractAccessToken(body?.data ?? body);
  return token || null;
}

/** Pick refresh role: JWT (even if expired) → current URL panel → persisted Redux role. */
export function resolveRefreshRole({ token, role, pathname }) {
  if (token) {
    const fromJwt = decodeTokenRole(token);
    if (fromJwt) return fromJwt;
  }
  if (pathname) {
    const fromPath = getRoleFromPathname(pathname);
    if (fromPath) return fromPath;
  }
  if (typeof window !== "undefined" && !pathname) {
    const fromPath = getRoleFromPathname(window.location.pathname);
    if (fromPath) return fromPath;
  }
  if (role) return normalizeRole(role);
  return "";
}

/**
 * Try refresh for primary role, then fall back to URL panel role if cookies were
 * issued for a different panel than the persisted Redux role.
 */
export async function refreshAccessTokenWithFallback(roleHint, pathname) {
  const primary = resolveRefreshRole({
    token: null,
    role: roleHint,
    pathname,
  });
  if (!primary) return null;

  let token = await refreshAccessToken(primary);
  if (token) return token;

  const pathRole = getRoleFromPathname(pathname || "");
  if (pathRole && normalizeRole(pathRole) !== normalizeRole(primary)) {
    token = await refreshAccessToken(pathRole);
  }
  return token || null;
}
