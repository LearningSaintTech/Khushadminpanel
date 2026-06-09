import { useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import SidebarTooltip from "./SidebarTooltip";
import {
  Activity,
  LayoutDashboard,
  Bell,
  FileText,
  Mail,
  Headphones,
  Megaphone,
  Package,
  Tags,
  ShoppingCart,
  Receipt,
  ChevronDown,
  ChevronRight,
  Gift,
  Building2,
  Users,
  HandCoins,
  Wallet,
  Coins,
} from "lucide-react";
import { GrDeliver } from "react-icons/gr";

const ICON = 16;

function matchesQuery(label, keywords, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (label.toLowerCase().includes(q)) return true;
  return (keywords || []).some((k) => k.toLowerCase().includes(q));
}

export default function SidebarMainNav({
  ap,
  location,
  canUse,
  isActive,
  searchQuery,
  isNotificationSectionActive,
  isAnalyticsSectionActive,
  isAnalyticsOpen,
  setIsAnalyticsOpen,
  isCouponOpen,
  setIsCouponOpen,
  isInventoryOpen,
  setIsInventoryOpen,
  isNotificationOpen,
  setIsNotificationOpen,
  isTemplatesOpen,
  setIsTemplatesOpen,
  isPolicyOpen,
  setIsPolicyOpen,
  isUsersOpen,
  setIsUsersOpen,
  isUsersSectionActive,
  isMoneyFeaturesOpen,
  setIsMoneyFeaturesOpen,
  isMoneyFeaturesSectionActive,
  isOrdersOpen,
  setIsOrdersOpen,
  isOrdersSectionActive,
  showMoneyFeatures,
  isFullAdminUser,
  compact = false,
  lightMode = false,
}) {
  const showChildren = !compact;
  const linkClass = (active) => {
    if (lightMode) {
      return `flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors duration-150 group ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-stone-600 hover:bg-canvas-muted hover:text-stone-900"
      } ${compact ? "justify-center" : "gap-2"}`;
    }
    return `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors duration-150 group ${
      active
        ? "bg-white/10 text-white"
        : "text-stone-300 hover:bg-white/10 hover:text-white"
    } ${compact ? "justify-center" : "gap-2"}`;
  };

  const groupBtnClass = (active) => {
    if (lightMode) {
      return `w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors duration-150 group ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-stone-600 hover:bg-canvas-muted hover:text-stone-900"
      } ${compact ? "justify-center" : "justify-between"}`;
    }
    return `w-full flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors duration-150 group ${
      active
        ? "bg-white/10 text-white"
        : "text-stone-300 hover:bg-white/10 hover:text-white"
    } ${compact ? "justify-center" : "justify-between"}`;
  };

  const subLinkClass = (active) => {
    if (lightMode) {
      return `block px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-stone-500 hover:bg-canvas-muted hover:text-stone-900"
      }`;
    }
    return `block px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
      active
        ? "bg-white/10 text-white"
        : "text-stone-400 hover:bg-white/10 hover:text-white"
    }`;
  };

  const iconClass = lightMode
    ? "text-stone-400 group-hover:text-stone-700 shrink-0"
    : "text-stone-400 group-hover:text-white shrink-0";

  const chevronClass = lightMode ? "text-stone-400 shrink-0" : "text-stone-400 shrink-0";

  const entries = useMemo(() => {
    const list = [];

    const push = (label, keywords, visible, node) => {
      if (visible) list.push({ label, keywords: keywords || [], node });
    };

    push(
      "Faq",
      ["faq", "question", "help"],
      canUse(["faq"]),
      <Link
        key="faq"
        to={ap("faq")}
        className={linkClass(isActive(ap("faq")))}
      >
        <FileText size={ICON} className={iconClass} />
        <span className="truncate">Faq</span>
      </Link>,
    );

    push(
      "Gift cards",
      ["gift", "card", "cards"],
      canUse(["gift"]),
      <Link
        key="gift"
        to={ap("gift")}
        className={linkClass(location.pathname.startsWith(ap("gift")))}
      >
        <Gift size={ICON} className={iconClass} />
        <span className="truncate">Gift cards</span>
      </Link>,
    );

    push(
      "Marque Text",
      ["marque", "text", "ticker"],
      canUse(["marque"]),
      <Link
        key="marque"
        to={ap("marque")}
        className={linkClass(location.pathname.startsWith(ap("marque")))}
      >
        <Megaphone size={ICON} className={iconClass} />
        <span className="truncate">Marque Text</span>
      </Link>,
    );

    push(
      "Analytics",
      ["analytics", "workspace", "events", "coupon"],
      canUse(["admin"]) || canUse(["coupons"]),
      <div key="analytics">
        <button
          type="button"
          onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
          className={groupBtnClass(isAnalyticsSectionActive())}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <Activity size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Analytics"}</span>
          </div>
          {!compact && (isAnalyticsOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isAnalyticsOpen ? "max-h-32 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            <Link
              to={ap("analytics/events")}
              className={subLinkClass(
                isActive(ap("analytics/events")) ||
                  isActive(ap("coupon-analytics")),
              )}
            >
              Analytics Workspace
            </Link>
          </div>
        </div>
      </div>,
    );

    push(
      "App Popups",
      ["popup", "app"],
      canUse(["banner"]),
      <Link
        key="app-popup"
        to={ap("app-popup")}
        className={linkClass(isActive(ap("app-popup")))}
      >
        <Megaphone size={ICON} className={iconClass} />
        <span className="truncate">App Popups</span>
      </Link>,
    );

    push(
      "Banner",
      ["banner", "splash"],
      canUse(["banner"]),
      <Link
        key="banners"
        to={ap("banners")}
        className={linkClass(isActive(ap("banners")))}
      >
        <FileText size={ICON} className={iconClass} />
        <span className="truncate">Banner</span>
      </Link>,
    );

    push(
      "Brands",
      ["brand"],
      canUse(["brands"]),
      <Link
        key="brands"
        to={ap("brands")}
        className={linkClass(isActive(ap("brands")))}
      >
        <FileText size={ICON} className={iconClass} />
        <span className="truncate">Brands</span>
      </Link>,
    );

    push(
      "Cart Charges",
      ["cart", "charges"],
      canUse(["cart-charges"]),
      <Link
        key="cart-charges"
        to={ap("cart-charges")}
        className={linkClass(isActive(ap("cart-charges")))}
      >
        <Receipt size={ICON} className={iconClass} />
        <span className="truncate">Cart Charges</span>
      </Link>,
    );

    push(
      "Contact Requests",
      ["contact"],
      canUse(["contact-us"]),
      <Link
        key="contact"
        to={ap("contact-us")}
        className={linkClass(isActive(ap("contact-us")))}
      >
        <Mail size={ICON} className={iconClass} />
        <span className="truncate">Contact Requests</span>
      </Link>,
    );

    push(
      "Support Tickets",
      ["support", "ticket", "chat"],
      canUse(["support-tickets"]),
      <Link
        key="support-tickets"
        to={ap("support-tickets")}
        className={linkClass(
          isActive(ap("support-tickets")) ||
            location.pathname.startsWith(`${ap("support-tickets")}/`),
        )}
      >
        <Headphones size={ICON} className={iconClass} />
        <span className="truncate">Support Tickets</span>
      </Link>,
    );

    push(
      "Coupons",
      ["coupon", "list"],
      canUse(["coupons"]),
      <div key="coupons">
        <button
          type="button"
          onClick={() => setIsCouponOpen(!isCouponOpen)}
          className={groupBtnClass(false)}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <Tags size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Coupons"}</span>
          </div>
          {!compact && (isCouponOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isCouponOpen ? "max-h-32 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1">
            <Link to={ap("coupons")} className={subLinkClass(false)}>
              Coupon List
            </Link>
          </div>
        </div>
      </div>,
    );

    push(
      "Dashboard",
      ["dashboard", "home"],
      canUse(["admin"]),
      <Link
        key="dashboard"
        to={ap("dashboard")}
        className={linkClass(isActive(ap("dashboard")))}
      >
        <LayoutDashboard size={ICON} className={iconClass} />
        <span className="truncate">Dashboard</span>
      </Link>,
    );

    push(
      "Delivery",
      ["delivery", "ship"],
      canUse(["delivery"]),
      <Link
        key="delivery"
        to={ap("delivery")}
        className={linkClass(isActive(ap("delivery")))}
      >
        <GrDeliver size={ICON} className={iconClass} />
        <span className="truncate">Delivery</span>
      </Link>,
    );

    push(
      "Exchange Orders",
      ["exchange", "order"],
      canUse(["admin"]),
      <Link
        key="exchange-orders"
        to={ap("exchange-orders")}
        className={linkClass(isActive(ap("exchange-orders")))}
      >
        <Receipt size={ICON} className={iconClass} />
        <span className="truncate">Exchange Orders</span>
      </Link>,
    );

    push(
      "Features",
      ["feature"],
      canUse(["features"]),
      <Link
        key="features"
        to={ap("features")}
        className={linkClass(isActive(ap("features")))}
      >
        <Package size={ICON} className={iconClass} />
        <span className="truncate">Features</span>
      </Link>,
    );

    push(
      "Filters",
      ["filter"],
      canUse(["filters"]),
      <Link
        key="filters"
        to={ap("filters")}
        className={linkClass(isActive(ap("filters")))}
      >
        <Package size={ICON} className={iconClass} />
        <span className="truncate">Filters</span>
      </Link>,
    );

    push(
      "Home banners",
      ["home", "banner", "splash"],
      canUse(["banner"]),
      <Link
        key="splash"
        to={ap("splash")}
        className={linkClass(isActive(ap("splash")))}
      >
        <Package size={ICON} className={iconClass} />
        <span className="truncate">Home banners</span>
      </Link>,
    );

    const inventoryLinks = [
      {
        label: "Categories",
        to: ap("inventory/categories"),
        active: location.pathname.includes(ap("inventory/categories")),
        keywords: ["category"],
      },
      {
        label: "Central Stock management",
        to: ap("inventory/central"),
        active: location.pathname.includes(ap("inventory/central")),
        keywords: ["central", "stock"],
      },
      {
        label: "Inventory codes",
        to: ap("inventory-codes"),
        active: location.pathname.includes(ap("inventory-codes")),
        keywords: ["code"],
      },
      {
        label: "Items",
        to: ap("items"),
        active: location.pathname.includes(ap("items")),
        keywords: ["item", "product"],
      },
      {
        label: "Stock management",
        to: ap("stocks"),
        active: location.pathname.includes(ap("stocks")),
        keywords: ["stock"],
      },
      {
        label: "SubCategories",
        to: ap("subcategoriess"),
        active: location.pathname.includes(ap("subcategoriess")),
        keywords: ["subcategory"],
      },
    ].sort((a, b) => a.label.localeCompare(b.label));

    push(
      "Inventory",
      ["inventory", "stock", "category", "items", ...inventoryLinks.map((l) => l.label)],
      canUse(["categories", "subcategories", "items", "warehouse"]),
      <div key="inventory">
        <button
          type="button"
          onClick={() => setIsInventoryOpen(!isInventoryOpen)}
          className={groupBtnClass(isInventoryOpen)}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <Package size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Inventory"}</span>
          </div>
          {!compact && (isInventoryOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isInventoryOpen ? "max-h-96 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            {inventoryLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={subLinkClass(item.active)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>,
    );

    const moneyFeatureLinks = [
      (isFullAdminUser || canUse(["admin"])) && {
        label: "Cash wallet",
        to: ap("money-features/cash-wallet"),
        active:
          isActive(ap("money-features/cash-wallet")) ||
          isActive(ap("money-features/wallet")),
        keywords: ["cash", "wallet"],
        icon: Wallet,
      },
      canUse(["coupons"]) && {
        label: "Gift card",
        to: ap("money-features/gift-card"),
        active:
          isActive(ap("money-features/gift-card")) ||
          isActive(ap("money-features/giftcard")),
        keywords: ["gift"],
        icon: Gift,
      },
      (isFullAdminUser || canUse(["admin"])) && {
        label: "Overview",
        to: ap("money-features"),
        active:
          location.pathname.endsWith("/money-features") ||
          location.pathname.endsWith("/money-features/"),
        keywords: ["money", "overview"],
        icon: HandCoins,
      },
      (isFullAdminUser || canUse(["rewards", "admin"])) && {
        label: "Points wallet",
        to: ap("money-features/points-wallet"),
        active:
          isActive(ap("money-features/points-wallet")) ||
          isActive(ap("money-features/redeem-coins")) ||
          isActive(ap("rewards")),
        keywords: ["points", "coins", "rewards"],
        icon: Coins,
      },
      canUse(["referral"]) && {
        label: "Refer & earn",
        to: ap("money-features/refer-earn"),
        active:
          isActive(ap("money-features/refer-earn")) ||
          isActive(ap("referral")),
        keywords: ["referral", "refer"],
        icon: Gift,
      },
    ]
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));

    push(
      "Money features",
      [
        "money",
        "wallet",
        "gift",
        "referral",
        "rewards",
        "points",
        ...moneyFeatureLinks.map((l) => l.label),
      ],
      showMoneyFeatures,
      <div key="money-features">
        <button
          type="button"
          onClick={() => setIsMoneyFeaturesOpen(!isMoneyFeaturesOpen)}
          className={groupBtnClass(isMoneyFeaturesSectionActive())}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <HandCoins size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Money features"}</span>
          </div>
          {!compact && (isMoneyFeaturesOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isMoneyFeaturesOpen
              ? "max-h-80 opacity-100 mt-0.5"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            {moneyFeatureLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={subLinkClass(item.active)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={12} className="shrink-0" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>,
    );

    push(
      "Notifications",
      [
        "notification",
        "broadcast",
        "template",
        "email",
        "history",
        "test",
        "sent",
      ],
      canUse(["admin"]),
      <div key="notifications">
        <button
          type="button"
          onClick={() => {
            setIsNotificationOpen((o) => !o);
            if (!isNotificationOpen) setIsTemplatesOpen(false);
          }}
          className={groupBtnClass(isNotificationSectionActive())}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <Bell size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Notifications"}</span>
          </div>
          {!compact && (isNotificationOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isNotificationOpen
              ? "max-h-[420px] opacity-100 mt-0.5"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-brand-800 ml-4">
            <Link
              to={ap("notifications")}
              className={subLinkClass(location.pathname === ap("notifications"))}
            >
              All notifications
            </Link>
            <Link
              to={ap("notifications/sent")}
              className={subLinkClass(isActive(ap("notifications/sent")))}
            >
              All send notifications
            </Link>
            <div>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium rounded-md ${
                  isActive(ap("notifications/templates")) ||
                  isActive(ap("notifications/email-templates"))
                    ? "bg-white/10 text-white"
                    : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                }`}
              >
                Templates
                {isTemplatesOpen ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </button>
              <div
                className={`overflow-hidden ${isTemplatesOpen ? "max-h-24" : "max-h-0"}`}
              >
                <Link
                  to={ap("notifications/templates")}
                  className="block pl-3 py-1 text-[10px] text-stone-500 hover:text-stone-300"
                >
                  In-app
                </Link>
                <Link
                  to={ap("notifications/email-templates")}
                  className="block pl-3 py-1 text-[10px] text-stone-500 hover:text-stone-300"
                >
                  Email
                </Link>
              </div>
            </div>
            <Link
              to={ap("notifications/broadcast")}
              className={subLinkClass(isActive(ap("notifications/broadcast")))}
            >
              Broadcast
            </Link>
            <Link
              to={ap("notifications/history")}
              className="block px-3 py-1.5 text-[11px] text-stone-500 hover:bg-white/5 hover:text-stone-300 rounded-md"
            >
              History
            </Link>
            <Link
              to={ap("notifications/test")}
              className="block px-3 py-1.5 text-[11px] text-stone-500 hover:bg-white/5 hover:text-stone-300 rounded-md"
            >
              Test
            </Link>
          </div>
        </div>
      </div>,
    );

    push(
      "Orders",
      ["order", "orders", "exchange"],
      canUse(["admin"]),
      <div key="orders">
        <button
          type="button"
          onClick={() => setIsOrdersOpen(!isOrdersOpen)}
          className={groupBtnClass(isOrdersSectionActive())}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <ShoppingCart size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Orders"}</span>
          </div>
          {!compact &&
            (isOrdersOpen ? (
              <ChevronDown size={14} className={chevronClass} />
            ) : (
              <ChevronRight size={14} className={chevronClass} />
            ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isOrdersOpen ? "max-h-32 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            <Link
              to={ap("orders")}
              className={subLinkClass(
                isActive(ap("orders")) &&
                  !location.pathname.startsWith(ap("exchange-orders")),
              )}
            >
              Orders
            </Link>
            <Link
              to={ap("exchange-orders")}
              className={subLinkClass(isActive(ap("exchange-orders")))}
            >
              Exchange orders
            </Link>
          </div>
        </div>
      </div>,
    );

    push(
      "Pincode",
      ["pincode", "pin", "serviceable"],
      canUse(["servicablePincode"]),
      <Link
        key="pincode"
        to={ap("pincode")}
        className={linkClass(isActive(ap("pincode")))}
      >
        <Receipt size={ICON} className={iconClass} />
        <span className="truncate">Pincode</span>
      </Link>,
    );

    const policyChildren = [
      canUse(["exchange"]) && {
        label: "Exchange Policy",
        to: ap("exchange"),
        active: location.pathname.includes(ap("exchange")),
      },
      canUse(["admin"]) && {
        label: "Cancellation Policy",
        to: ap("cancellation"),
        active: location.pathname.includes(ap("cancellation")),
      },

      canUse(["admin"]) && {
  label: "US Policy",
  to: ap("usp"),
  active: location.pathname.includes(ap("uspolicy")),
},
    ]
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));

    push(
      "Policy",
      ["policy", "exchange", "cancellation", ...policyChildren.map((c) => c.label)],
      canUse(["exchange", "admin"]),
      <div key="policy">
        <button
          type="button"
          onClick={() => setIsPolicyOpen(!isPolicyOpen)}
          className={groupBtnClass(false)}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <ShoppingCart size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Policy"}</span>
          </div>
          {!compact && (isPolicyOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isPolicyOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            {policyChildren.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={subLinkClass(item.active)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>,
    );

    push(
      "Reviews",
      ["review"],
      canUse(["reviews"]),
      <Link
        key="reviews"
        to={ap("reviews")}
        className={linkClass(isActive(ap("reviews")))}
      >
        <Receipt size={ICON} className={iconClass} />
        <span className="truncate">Reviews</span>
      </Link>,
    );


    push(
      "Referrals",
      ["referral", "refer", "earn", "refer-earn", "refer & earn"],
      canUse(["referral"]),
      <Link
        key="referrals-nav"
        to={ap("money-features/refer-earn")}
        className={linkClass(
          location.pathname.startsWith(ap("referral")) ||
            location.pathname.includes("/money-features/refer-earn") ||
            location.pathname.includes("/money-features/refer"),
        )}
      >
        <Gift size={ICON} className={iconClass} />
        <span className="truncate">Referrals</span>
      </Link>,
    );

    push(
      "Rewards",
      ["rewards", "points", "coins", "wallet", "redeem"],
      isFullAdminUser || canUse(["rewards", "admin"]),
      <Link
        key="rewards-nav"
        to={ap("wallet")}
        className={linkClass(
          location.pathname.startsWith(ap("wallet")) ||
            location.pathname.startsWith(ap("rewards")) ||
            location.pathname.includes("/rewards"),
        )}
      >
        <Coins size={ICON} className={iconClass} />
        <span className="truncate">Rewards</span>
      </Link>,
    );

    push(
      "Sections",
      ["section", "sections"],
      canUse(["section"]),
      <Link
        key="sections"
        to={ap("section")}
        className={linkClass(isActive(ap("sections")))}
      >
        <ShoppingCart size={ICON} className={iconClass} />
        <span className="truncate">Sections</span>
      </Link>,
    );

    const userLinks = [
      {
        label: "Fake Users",
        to: ap("users/fake"),
        active: location.pathname.includes(ap("users/fake")),
        keywords: ["fake"],
      },
      {
        label: "User",
        to: ap("users/real"),
        active:
          location.pathname.includes(ap("users/real")) ||
          location.pathname.includes(ap("active-users")),
        keywords: ["real", "active"],
      },
    ].sort((a, b) => a.label.localeCompare(b.label));

    push(
      "Users",
      ["users", "fake", "real", "active"],
      canUse(["admin"]),
      <div key="users">
        <button
          type="button"
          onClick={() => setIsUsersOpen(!isUsersOpen)}
          className={groupBtnClass(isUsersSectionActive())}
        >
          <div className={`flex items-center min-w-0 ${compact ? "" : "gap-2"}`}>
            <Users size={ICON} className={iconClass} />
            <span className="truncate">{compact ? "" : "Users"}</span>
          </div>
          {!compact && (isUsersOpen ? (
            <ChevronDown size={14} className={chevronClass} />
          ) : (
            <ChevronRight size={14} className={chevronClass} />
          ))}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showChildren && isUsersOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-7 pr-2 py-1 space-y-0.5">
            {userLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={subLinkClass(item.active)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>,
    );

    push(
      "Warehouse",
      ["warehouse"],
      canUse(["warehouse"]),
      <Link
        key="warehouse"
        to={ap("warehouse")}
        className={linkClass(isActive(ap("warehouse")))}
      >
        <Building2 size={ICON} className={iconClass} />
        <span className="truncate">Warehouse</span>
      </Link>,
    );

    const q = searchQuery.trim();
    const filtered = q
      ? list.filter((item) => matchesQuery(item.label, item.keywords, q))
      : list;

    const dashboard = filtered.filter((item) => item.label === "Dashboard");
    const rest = filtered
      .filter((item) => item.label !== "Dashboard")
      .sort((a, b) => a.label.localeCompare(b.label));

    return [...dashboard, ...rest];
  }, [
    ap,
    location.pathname,
    canUse,
    isActive,
    searchQuery,
    isAnalyticsSectionActive,
    isAnalyticsOpen,
    isCouponOpen,
    isInventoryOpen,
    isNotificationSectionActive,
    isNotificationOpen,
    isTemplatesOpen,
    isPolicyOpen,
    isUsersOpen,
    isUsersSectionActive,
    isMoneyFeaturesOpen,
    isMoneyFeaturesSectionActive,
    isOrdersOpen,
    isOrdersSectionActive,
    showMoneyFeatures,
    isFullAdminUser,
  ]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (matchesQuery("Analytics", ["workspace", "events"], q))
      setIsAnalyticsOpen(true);
    if (matchesQuery("Coupons", ["coupon"], q)) setIsCouponOpen(true);
    if (matchesQuery("Inventory", ["stock", "category", "items"], q))
      setIsInventoryOpen(true);
    if (matchesQuery("Notifications", ["broadcast", "template"], q))
      setIsNotificationOpen(true);
    if (matchesQuery("Policy", ["exchange", "cancellation","uspolicy"], q))
      setIsPolicyOpen(true);
    if (matchesQuery("Notifications", ["template", "email"], q))
      setIsTemplatesOpen(true);
    if (matchesQuery("Users", ["fake", "real"], q)) setIsUsersOpen(true);
    if (matchesQuery("Money features", ["wallet", "gift", "referral"], q))
      setIsMoneyFeaturesOpen(true);
    if (matchesQuery("Referrals", ["referral", "refer", "earn"], q))
      setIsMoneyFeaturesOpen(true);
    if (matchesQuery("Rewards", ["rewards", "points", "coins"], q))
      setIsMoneyFeaturesOpen(true);
    if (matchesQuery("Orders", ["order", "exchange"], q)) setIsOrdersOpen(true);
  }, [searchQuery]);

  if (entries.length === 0 && searchQuery.trim()) {
    return (
      <p className="px-3 py-6 text-center text-[11px] text-stone-500">
        No menu items match &ldquo;{searchQuery}&rdquo;
      </p>
    );
  }

  return (
    <div className={`${compact ? "[&_.truncate]:hidden" : ""} space-y-0.5`}>
      {entries.map((e) => (
        <SidebarTooltip key={e.label} label={e.label} show={compact} lightMode={lightMode}>
          {e.node}
        </SidebarTooltip>
      ))}
    </div>
  );
}
