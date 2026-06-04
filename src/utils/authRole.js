import { jwtDecode } from "jwt-decode";

const ROLE_ALIASES = {
  SUPER_SUBADMIN: "SUBADMIN",
};

export function normalizeRole(role) {
  const raw = String(role || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";
  return ROLE_ALIASES[raw] || raw;
}

export function decodeTokenRole(token) {
  if (!token) return "";
  try {
    const decoded = jwtDecode(token);
    return normalizeRole(decoded.role || decoded.userRole || "");
  } catch {
    return "";
  }
}

export function getLoginPathForRole(role) {
  switch (normalizeRole(role)) {
    case "ADMIN":
      return "/admin";
    case "SUBADMIN":
      return "/subadmin/login";
    case "DRIVER":
      return "/driver/login";
    case "DESIGNER":
      return "/designer/login";
    case "INFLUENCER":
      return "/influencer/login";
    default:
      return "/admin";
  }
}

export function getHomePathForRole(role) {
  switch (normalizeRole(role)) {
    case "ADMIN":
      return "/admin/dashboard";
    case "SUBADMIN":
      return "/subadmin/dashboard";
    case "DRIVER":
      return "/driver/dashboard";
    case "DESIGNER":
      return "/designer/dashboard";
    case "INFLUENCER":
      return "/influencer/dashboard";
    default:
      return "/admin";
  }
}

/** Default login when protecting a panel (first allowed role). */
export function getLoginPathForAllowedRoles(allowedRoles = []) {
  if (allowedRoles.includes("DESIGNER")) return "/designer/login";
  if (allowedRoles.includes("INFLUENCER")) return "/influencer/login";
  if (allowedRoles.includes("DRIVER")) return "/driver/login";
  if (allowedRoles.includes("SUBADMIN")) return "/subadmin/login";
  if (allowedRoles.includes("ADMIN")) return "/admin";
  return "/admin";
}

export function roleAllowed(userRole, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const normalized = normalizeRole(userRole);
  return allowedRoles.some((r) => normalized === normalizeRole(r));
}

export function clearDesignerSessionStorage() {
  try {
    sessionStorage.removeItem("designerUserId");
    sessionStorage.removeItem("designerPhone");
  } catch {
    /* ignore */
  }
}

export function clearAdminOtpSessionStorage() {
  try {
    sessionStorage.removeItem("admin_userId");
    sessionStorage.removeItem("admin_phone");
    sessionStorage.removeItem("userId");
  } catch {
    /* ignore */
  }
}

/** Drop tokens from other panels so refresh does not cross-login. */
export function clearOtherPanelSessions(activeRole) {
  const role = normalizeRole(activeRole);
  if (role !== "DESIGNER") clearDesignerSessionStorage();
  if (role !== "ADMIN" && role !== "SUBADMIN") clearAdminOtpSessionStorage();
}

/** Login path from current URL prefix (for 401 redirects). */
export function getLoginPathForPathname(pathname = "") {
  const p = String(pathname || "");
  if (p.startsWith("/designer")) return "/designer/login";
  if (p.startsWith("/subadmin")) return "/subadmin/login";
  if (p.startsWith("/influencer")) return "/influencer/login";
  if (p.startsWith("/driver")) return "/driver/login";
  if (p.startsWith("/admin")) return "/admin";
  return "/admin";
}
