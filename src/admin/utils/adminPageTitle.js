const ROUTE_TITLES = {
  dashboard: "Dashboard",
  items: "All items",
  subcategoriess: "Subcategories",
  orders: "Order management",
  "stale-orders": "Stale orders",
  "exchange-orders": "Exchange orders",
  section: "Homepage sections",
  coupons: "Coupons",
  "cart-charges": "Cart charges",
  pincodes: "Pincodes",
  splash: "Splash screens",
  delivery: "Delivery",
  subadmin: "Sub-admins",
  "subadmin/create": "Create sub-admin",
  "subadmin/module-access": "Module access control",
  influencer: "Influencers",
  "influencer/create": "Create influencer",
  "influencer/coupons": "Influencer coupons",
  "delivery-agent": "Delivery agents",
  warehouse: "Warehouse",
  stocks: "Stock management",
  reviews: "Reviews",
  profile: "Profile",
  "contact-us": "Contact us",
  notifications: "Notifications",
  "audit-logs": "Audit logs",
  usp: "USP policies",
  "usp/create": "Create USP policy",
  "exchange/create": "Create exchange policy",
  "cancellation/create": "Create cancellation policy",
  faq: "FAQ",
  marquee: "Marquee text",
  feedback: "Feedback",
  banner: "Banners",
  brands: "Brands",
  features: "Features",
  filters: "Filters",
  status: "Status",
  rewards: "Rewards",
  wallet: "Reward rules",
  "rewards/create": "Create reward rule",
  "app-popup": "App popup",
  gift: "Gift cards",
  "gift/create": "Create gift card",
  analytics: "Analytics",
  "inventory/categories": "Categories",
  "inventory/stock-management": "Stock management",
  "inventory/central": "Central stock",
  "inventory/codes": "Inventory codes",
  "inventory/sku-formula": "SKU formula",
  "money-features": "Money features",
  "money-features/cash-wallet": "Cash wallet",
  "money-features/gift-card": "Gift card",
  "money-features/points-wallet": "Points wallet",
  "money-features/refer-earn": "Refer & earn",
  "money-features/refer-earn/config": "Referral configuration",
  "users/real": "Users",
  "users/fake": "Fake users",
  "designer/list": "Designers",
  "designer/create": "Create designer",
  "designer/edit": "Edit designer",
  "designer/inventory": "Designer inventory",
  "influencer/coupons": "Influencer coupons",
  "notifications/sent": "Notification history",
  "notifications/history": "Notification history",
  "notifications/templates": "Notification templates",
  "notifications/email-templates": "Email templates",
  "notifications/broadcast": "Broadcast",
  "notifications/test": "Notification test",
  exchange: "Exchange policies",
  cancellation: "Cancellation policies",
};

function humanize(segment) {
  if (!segment) return "";
  return String(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

/** Page title for the admin shell header from the current pathname. */
export function getAdminPageTitle(pathname, basePath = "/admin") {
  let path = String(pathname || "");
  const base = String(basePath || "/admin").replace(/\/+$/, "");
  if (path.startsWith(base)) {
    path = path.slice(base.length);
  }
  path = path.replace(/^\/+/, "").replace(/\/+$/, "");

  if (!path) return "Dashboard";

  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  const parent = segments[segments.length - 2] || "";

  if (last === "create") {
    const subject = ROUTE_TITLES[parent] || ROUTE_TITLES[segments.slice(0, -1).join("/")] || humanize(parent);
    return subject ? `Create ${subject.replace(/^Create\s/i, "")}` : "Create";
  }

  if (last === "edit" || isMongoId(last)) {
    const subject =
      ROUTE_TITLES[parent] ||
      ROUTE_TITLES[segments.slice(0, -1).join("/")] ||
      humanize(parent);
    return subject ? `Edit ${subject.replace(/^Edit\s/i, "")}` : "Edit";
  }

  const full = segments.join("/");
  if (ROUTE_TITLES[full]) return ROUTE_TITLES[full];
  if (ROUTE_TITLES[last]) return ROUTE_TITLES[last];
  if (ROUTE_TITLES[segments[0]]) return ROUTE_TITLES[segments[0]];

  return humanize(last) || "Dashboard";
}
