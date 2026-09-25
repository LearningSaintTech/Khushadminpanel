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

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
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

/** Role from JWT only when the token is still valid. */
export function getValidTokenRole(token) {
  if (!token || isTokenExpired(token)) return "";
  return decodeTokenRole(token);
}

/** Raw JWT role (not normalized) — for display labels e.g. super_subadmin */
export function getRawRoleFromToken(token) {
  if (!token) return "";
  try {
    const decoded = jwtDecode(token);
    return String(decoded.role || decoded.userRole || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function getRoleDisplayLabel(role) {
  const raw = String(role || "").toLowerCase();
  if (raw === "super_subadmin") return "Super subadmin";
  if (raw === "subadmin") return "Subadmin";
  if (raw === "admin") return "Admin";
  return raw ? raw.replace(/_/g, " ") : "User";
}

/** Infer panel role from URL prefix (used when JWT is absent on boot). */
export function getRoleFromPathname(pathname = "") {
  const p = String(pathname || "");
  if (p.startsWith("/subadmin")) return "SUBADMIN";
  if (p.startsWith("/designer")) return "DESIGNER";
  if (p.startsWith("/driver")) return "DRIVER";
  if (p.startsWith("/influencer")) return "INFLUENCER";
  if (p.startsWith("/support-agent")) return "AGENT";
  if (p.startsWith("/order-agent")) return "ORDER_AGENT";
  if (p.startsWith("/admin")) return "ADMIN";
  return "";
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
    case "DESIGNER_OPS":
      return "/designer/login";
    case "INFLUENCER":
      return "/influencer/login";
    case "AGENT":
      return "/support-agent/login";
    case "ORDER_AGENT":
      return "/order-agent/login";
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
    case "DESIGNER_OPS":
      return "/designer/select-panel";
    case "INFLUENCER":
      return "/influencer/dashboard";
    case "AGENT":
      return "/support-agent/tickets";
    case "ORDER_AGENT":
      return "/order-agent/orders";
    default:
      return "/admin";
  }
}

/** Default login when protecting a panel (first allowed role). */
export function getLoginPathForAllowedRoles(allowedRoles = []) {
  if (allowedRoles.includes("DESIGNER")) return "/designer/login";
  if (allowedRoles.includes("INFLUENCER")) return "/influencer/login";
  if (allowedRoles.includes("DRIVER")) return "/driver/login";
  if (allowedRoles.includes("AGENT")) return "/support-agent/login";
  if (allowedRoles.includes("ORDER_AGENT")) return "/order-agent/login";
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
    sessionStorage.removeItem("designerOtpSentTo");
    clearDesignerPanelSwitchStorage();
  } catch {
    /* ignore */
  }
}

/** Ops → work-as-designer: stash ops token so sidebar can return to the panel list. */
export const DESIGNER_OPS_TOKEN_KEY = "designerOpsAccessToken";
export const DESIGNER_CAN_SWITCH_KEY = "designerCanSwitchPanels";

export function stashDesignerOpsToken(token) {
  if (!token || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DESIGNER_OPS_TOKEN_KEY, String(token));
    sessionStorage.setItem(DESIGNER_CAN_SWITCH_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Mark this browser session as allowed to switch designer panels (ops → Anisha → Sakshi). */
export function markDesignerPanelSwitchable() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DESIGNER_CAN_SWITCH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function canSwitchDesignerPanels() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DESIGNER_CAN_SWITCH_KEY) === "1";
  } catch {
    return false;
  }
}

export function getStashedDesignerOpsToken() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(DESIGNER_OPS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function clearDesignerPanelSwitchStorage() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DESIGNER_OPS_TOKEN_KEY);
    sessionStorage.removeItem(DESIGNER_CAN_SWITCH_KEY);
    sessionStorage.removeItem("designerPanelOptions");
    sessionStorage.removeItem("designerPanelName");
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

export const STAFF_PANEL_ROLES = ["SUBADMIN", "SUPER_SUBADMIN"];

export function clearSupportAgentSessionStorage() {
  try {
    sessionStorage.removeItem("supportAgent_agentId");
    sessionStorage.removeItem("supportAgent_phone");
    localStorage.removeItem("supportAgent_agentId");
    localStorage.removeItem("supportAgent_phone");
  } catch {
    /* ignore */
  }
}

export function clearOrderAgentSessionStorage() {
  try {
    sessionStorage.removeItem("orderAgent_agentId");
    sessionStorage.removeItem("orderAgent_phone");
    localStorage.removeItem("orderAgent_agentId");
    localStorage.removeItem("orderAgent_phone");
  } catch {
    /* ignore */
  }
}

/** Drop tokens from other panels so refresh does not cross-login. */
export function clearOtherPanelSessions(activeRole) {
  const role = normalizeRole(activeRole);
  if (role !== "DESIGNER" && role !== "DESIGNER_OPS") clearDesignerSessionStorage();
  if (role !== "AGENT") clearSupportAgentSessionStorage();
  if (role !== "ORDER_AGENT") clearOrderAgentSessionStorage();
  if (role !== "ADMIN" && role !== "SUBADMIN") clearAdminOtpSessionStorage();
}

/** Login path from current URL prefix (for 401 redirects). */
export function getLoginPathForPathname(pathname = "") {
  const p = String(pathname || "");
  if (p.startsWith("/designer")) return "/designer/login";
  if (p.startsWith("/subadmin")) return "/subadmin/login";
  if (p.startsWith("/influencer")) return "/influencer/login";
  if (p.startsWith("/driver")) return "/driver/login";
  if (p.startsWith("/support-agent")) return "/support-agent/login";
  if (p.startsWith("/order-agent")) return "/order-agent/login";
  if (p.startsWith("/admin")) return "/admin";
  return "/admin";
}
