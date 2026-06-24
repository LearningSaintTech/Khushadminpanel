/**
 * Panel route → backend module key mapping (aligned with KhushBackend moduleAccess.config.js).
 * Paths are relative to /admin/ or /subadmin/ (no leading slash).
 */

export const EXEMPT_PANEL_PATHS = ["profile"];

/** Full admin only — subadmin/super_subadmin never via module grant */
export const ADMIN_ONLY_ROUTE_PATTERNS = [
  /^subadmin(?:\/|$)/,
  /^audit-logs(?:\/|$)/,
  /^users\/fake(?:\/|$)/,
  /^inventory\/central(?:\/|$)/,
  /^inventory\/stock-management(?:\/|$)/,
  /^stocks(?:\/|$)/,
  /^order-agents(?:\/|$)/,
];

/**
 * First matching rule wins (order matters — more specific patterns first).
 */
export const ROUTE_MODULE_RULES = [
  { pattern: /^dashboard(?:\/|$)/, modules: ["dashboard"] },
  { pattern: /^users(?:\/|$)/, modules: ["user"] },
  { pattern: /^active-users(?:\/|$)/, modules: ["user"] },
  { pattern: /^inventory\/categories(?:\/|$)/, modules: ["categories"] },
  { pattern: /^inventory\/subcategories(?:\/|$)/, modules: ["subcategories"] },
  { pattern: /^subcategoriess(?:\/|$)/, modules: ["subcategories"] },
  { pattern: /^inventory\/items(?:\/|$)/, modules: ["items"] },
  { pattern: /^items(?:\/|$)/, modules: ["items"] },
  { pattern: /^inventory-codes(?:\/|$)/, modules: ["inventory-codes"] },
  { pattern: /^banners(?:\/|$)/, modules: ["banner"] },
  { pattern: /^splash(?:\/|$)/, modules: ["banner"] },
  { pattern: /^banner-form(?:\/|$)/, modules: ["banner"] },
  { pattern: /^app-popup(?:\/|$)/, modules: ["app-popup"] },
  { pattern: /^brands(?:\/|$)/, modules: ["brands"] },
  { pattern: /^sections(?:\/|$)/, modules: ["sections"] },
  { pattern: /^section(?:\/|$)/, modules: ["sections"] },
  { pattern: /^features(?:\/|$)/, modules: ["features"] },
  { pattern: /^filters(?:\/|$)/, modules: ["filters"] },
  { pattern: /^feedback(?:\/|$)/, modules: ["suggestions"] },
  { pattern: /^gift(?:\/|$)/, modules: ["gift-card"] },
  { pattern: /^money-features\/gift-card(?:\/|$)/, modules: ["gift-card"] },
  { pattern: /^money-features\/giftcard(?:\/|$)/, modules: ["gift-card"] },
  { pattern: /^coupons(?:\/|$)/, modules: ["coupons"] },
  { pattern: /^analytics(?:\/|$)/, modules: ["analytics"] },
  { pattern: /^coupon-analytics(?:\/|$)/, modules: ["analytics", "coupons"] },
  { pattern: /^cart-charges(?:\/|$)/, modules: ["cart-charges"] },
  { pattern: /^pincode(?:\/|$)/, modules: ["servicablePincode"] },
  { pattern: /^rewards(?:\/|$)/, modules: ["reward-rules", "reward-wallet"] },
  { pattern: /^wallet(?:\/|$)/, modules: ["reward-wallet", "reward-rules", "admin-wallet"] },
  { pattern: /^money-features\/cash-wallet(?:\/|$)/, modules: ["admin-wallet", "wallet"] },
  { pattern: /^money-features\/wallet(?:\/|$)/, modules: ["admin-wallet", "wallet"] },
  { pattern: /^money-features\/points-wallet(?:\/|$)/, modules: ["reward-wallet", "reward-rules"] },
  { pattern: /^money-features\/redeem-coins(?:\/|$)/, modules: ["reward-wallet", "reward-rules"] },
  { pattern: /^money-features\/refer(?:\/|$)/, modules: ["referral"] },
  { pattern: /^money-features\/refer-earn(?:\/|$)/, modules: ["referral"] },
  { pattern: /^money-features(?:\/|$)/, modules: ["referral", "gift-card", "admin-wallet", "reward-wallet", "reward-rules"] },
  { pattern: /^referral(?:\/|$)/, modules: ["referral"] },
  { pattern: /^delivery(?:\/|$)/, modules: ["delivery"] },
  { pattern: /^orders(?:\/|$)/, modules: ["order"] },
  { pattern: /^exchange-orders(?:\/|$)/, modules: ["order", "exchangeUser"] },
  { pattern: /^return-orders(?:\/|$)/, modules: ["order"] },
  { pattern: /^status(?:\/|$)/, modules: ["policies"] },
  { pattern: /^influencer(?:\/|$)/, modules: ["influencer", "coupons"] },
  { pattern: /^driver(?:\/|$)/, modules: ["delivery-agent"] },
  { pattern: /^designer(?:\/|$)/, modules: ["designer"] },
  { pattern: /^exchange(?:\/|$)/, modules: ["exchange"] },
  { pattern: /^cancellation(?:\/|$)/, modules: ["cancel-order"] },
  { pattern: /^usp(?:\/|$)/, modules: ["policies"] },
  { pattern: /^warehouse(?:\/|$)/, modules: ["warehouse"] },
  { pattern: /^reviews(?:\/|$)/, modules: ["reviews"] },
  { pattern: /^contact-us(?:\/|$)/, modules: ["contact-us"] },
  { pattern: /^support-tickets(?:\/|$)/, modules: ["support-tickets"] },
  { pattern: /^support-agents(?:\/|$)/, modules: ["support-agents"] },
  { pattern: /^notifications(?:\/|$)/, modules: ["notification"] },
  { pattern: /^faq(?:\/|$)/, modules: ["faq"] },
  { pattern: /^marque(?:\/|$)/, modules: ["marque-headings"] },
];

export function getRelativePanelPath(pathname, basePath = "/admin") {
  const normalized = String(pathname || "").replace(/\/+/g, "/");
  const base = String(basePath || "/admin").replace(/\/+$/, "");
  if (!normalized.startsWith(base)) return "";
  const rest = normalized.slice(base.length).replace(/^\/+/, "");
  return rest.split("?")[0];
}

export function getRequiredModulesForPanelPath(pathname, basePath = "/admin") {
  const rel = getRelativePanelPath(pathname, basePath);

  if (!rel) {
    return { modules: [], adminOnly: false, exempt: true };
  }

  if (EXEMPT_PANEL_PATHS.some((p) => rel === p || rel.startsWith(`${p}/`))) {
    return { modules: [], adminOnly: false, exempt: true };
  }

  if (ADMIN_ONLY_ROUTE_PATTERNS.some((re) => re.test(rel))) {
    return { modules: [], adminOnly: true, exempt: false };
  }

  for (const rule of ROUTE_MODULE_RULES) {
    if (rule.pattern.test(rel)) {
      return { modules: rule.modules, adminOnly: false, exempt: false };
    }
  }

  return { modules: ["admin"], adminOnly: false, exempt: false };
}

export function canAccessPanelPath({
  pathname,
  basePath = "/admin",
  allowedModules,
  isFullAdmin,
  canUse,
}) {
  if (isFullAdmin) return true;

  const { modules, adminOnly, exempt } = getRequiredModulesForPanelPath(
    pathname,
    basePath,
  );

  if (exempt) return true;
  if (adminOnly) return false;
  if (!modules?.length) return true;

  if (typeof canUse === "function") {
    return canUse(modules);
  }

  const set = allowedModules instanceof Set ? allowedModules : new Set(allowedModules || []);
  return modules.some((m) => set.has(m));
}
