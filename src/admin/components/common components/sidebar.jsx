// Sidebar.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import SidebarMainNav from "./sidebarMainNav";
import SidebarTooltip from "./SidebarTooltip";
import Khush from "../../../assets/images/khushh.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotification } from "../../../context/NotificationContext";
import {
  Bell,
  History,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings,
  LogOut,
  Menu,
  Users,
  UserPlus,
  Truck,
  ShieldCheck,
  Search,
  X,
  Gift,
  Coins,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../apis/Authapi";
import { logout } from "../../../redux/GlobalSlice";
import { subadminApi } from "../../../subadmin/apis/subadminApi";
import { useTheme } from "../../../context/ThemeContext";

const Sidebar = ({
  basePath = "/admin",
  filterByModules = false,
  collapsed = false,
  onToggleCollapse,
}) => {
  const ap = (suffix) => {
    const t = String(suffix || "").replace(/^\/+/, "");
    return `${basePath}/${t}`.replace(/\/+/g, "/");
  };

  const dispatch = useDispatch();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isInfluencerOpen, setIsInfluencerOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isMoneyFeaturesOpen, setIsMoneyFeaturesOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const navScrollRef = useRef(null);
  const [scrollHints, setScrollHints] = useState({ top: false, bottom: false });

  const rawRole = useSelector((s) => s.global?.role);
  const isFullAdminUser = String(rawRole || "").toUpperCase() === "ADMIN";
  const [allowedModules, setAllowedModules] = useState(null);

  const {
    unreadCount,
    dropdownList,
    markRead,
    markAllRead,
    refreshUnreadCount,
    refreshList,
  } = useNotification();

  const { toggleTheme, isDark } = useTheme();

  useEffect(() => {
    if (!filterByModules || isFullAdminUser) {
      setAllowedModules(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await subadminApi.getMyModuleAccess();
        const list = res?.data?.allowedModules ?? [];
        if (!cancelled)
          setAllowedModules(new Set(Array.isArray(list) ? list : []));
      } catch {
        if (!cancelled) setAllowedModules(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterByModules, isFullAdminUser]);

  const canUse = (keys) => {
    if (!filterByModules || isFullAdminUser) return true;
    if (!keys?.length) return true;
    if (allowedModules === null) return false;
    return keys.some((k) => allowedModules.has(k));
  };

  const isActive = (path) => location.pathname === path || location.pathname.replace(/\/+/g, "/") === path;
  const isNotificationSectionActive = () => location.pathname.startsWith(ap("notifications"));
  const isDesignerSectionActive = () => location.pathname.startsWith(ap("designer"));
  const isUsersSectionActive = () =>
    location.pathname.startsWith(ap("users")) ||
    location.pathname.startsWith(ap("active-users"));
  const isAnalyticsSectionActive = () =>
    location.pathname.startsWith(ap("analytics")) ||
    location.pathname.startsWith(ap("coupon-analytics"));
  const isMoneyFeaturesSectionActive = () =>
    location.pathname.includes("/money-features") ||
    location.pathname.startsWith(ap("referral")) ||
    location.pathname.startsWith(ap("rewards"));

  const isOrdersSectionActive = () =>
    location.pathname.startsWith(ap("orders")) ||
    location.pathname.startsWith(ap("exchange-orders"));

  const isReferralsActive = () =>
    location.pathname.startsWith(ap("referral")) ||
    location.pathname.includes("/money-features/refer-earn") ||
    location.pathname.includes("/money-features/refer");

  const isRewardsActive = () =>
    location.pathname.startsWith(ap("rewards")) ||
    location.pathname.includes("/money-features/points-wallet") ||
    location.pathname.includes("/money-features/redeem-coins");

  const showReferralsTab = isFullAdminUser || canUse(["referral"]);
  const showRewardsTab = isFullAdminUser || canUse(["rewards"]);

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target))
        setIsBellOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (
      isNotificationSectionActive() &&
      (location.pathname.includes("templates") ||
        location.pathname.includes("email-templates"))
    ) {
      setIsNotificationOpen(true);
      setIsTemplatesOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isDesignerSectionActive()) {
      setIsDesignerOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isUsersSectionActive()) {
      setIsUsersOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isAnalyticsSectionActive()) {
      setIsAnalyticsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isMoneyFeaturesSectionActive()) {
      setIsMoneyFeaturesOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isOrdersSectionActive()) {
      setIsOrdersOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const updateScrollHints = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight - clientHeight > 6;
    setScrollHints({
      top: overflow && scrollTop > 6,
      bottom: overflow && scrollTop + clientHeight < scrollHeight - 6,
    });
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return undefined;

    updateScrollHints();
    el.addEventListener("scroll", updateScrollHints, { passive: true });
    const ro = new ResizeObserver(updateScrollHints);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      ro.disconnect();
    };
  }, [
    updateScrollHints,
    collapsed,
    searchQuery,
    isInventoryOpen,
    isNotificationOpen,
    isTemplatesOpen,
    isCouponOpen,
    isAnalyticsOpen,
    isPolicyOpen,
    isInfluencerOpen,
    isDesignerOpen,
    isUsersOpen,
    isMoneyFeaturesOpen,
    isOrdersOpen,
  ]);

  const showMoneyFeatures =
    isFullAdminUser || canUse(["coupons", "referral", "rewards"]);

  const panelItemClass = (active) => {
    const base = collapsed
      ? "flex items-center justify-center rounded-xl px-2 py-2 transition-colors"
      : "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors";
    if (active) {
      return `${base} ${
        isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700"
      }`;
    }
    return `${base} ${
      isDark
        ? "text-gray-300 hover:bg-white/10 hover:text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  };

  const panelIconClass = isDark
    ? "text-gray-400 group-hover:text-white shrink-0"
    : "text-slate-400 group-hover:text-slate-700 shrink-0";

  const handleLogout = async () => {
    console.log("ðŸšª Logout button clicked");

    if (isLoggingOut) {
      console.log("âš ï¸ Logout already in progress");
      return;
    }

    try {
      setIsLoggingOut(true);
      console.log("ðŸ“¡ Calling logout API...");

      if (basePath === "/subadmin") {
        try {
          await subadminApi.logout();
        } catch {
          /* ignore */
        }
      } else {
        await logoutUser();
      }
      dispatch(logout());
      navigate(basePath === "/subadmin" ? "/subadmin/login" : "/admin");
    } catch (error) {
      console.error("âŒ Logout error:", error);
      console.error("âŒ Error details:", {
        message: error?.response?.data?.message || error,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      dispatch(logout());
      navigate(basePath === "/subadmin" ? "/subadmin/login" : "/admin");
    } finally {
      setIsLoggingOut(false);
      console.log("ðŸ Logout process finished");
    }
  };

  return (
    <>
      {/* Mobile menu toggle */}
      <button
        type="button"
        className={`fixed top-4 left-4 z-50 rounded-xl p-2 shadow-lg transition-all duration-300 lg:hidden ${
          isDark ? "bg-[#140034] text-white" : "border border-slate-200 bg-white text-slate-800"
        } ${isOpen ? "scale-95 opacity-90" : "scale-100 opacity-100"}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col overflow-visible
          will-change-[width,transform]
          transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          lg:static lg:z-auto lg:h-full lg:shrink-0 lg:translate-x-0
          lg:rounded-lg lg:border lg:shadow-sm
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-[4.25rem]" : "w-60"}
          ${
            isDark
              ? "border-transparent bg-gradient-to-b from-[#4B0082] to-[#140034] text-gray-100"
              : "border-slate-200/80 bg-white text-slate-700"
          }
        `}
      >
        {/* Logo + Notification icon */}
        <div
          className={`flex h-14 shrink-0 items-center border-b ${
            isDark ? "border-gray-800" : "border-slate-200"
          } ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}
        >
          {/* <div className="flex items-center gap-2 min-w-0">
            <div className="w-14 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <img
                src={Khush}
                alt="Khush Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div> */}
          <SidebarTooltip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            show={collapsed}
            lightMode={!isDark}
          >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-xl transition ${
              isDark
                ? "text-gray-400 hover:bg-white/10 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          </SidebarTooltip>
          {canUse(["admin"]) && (
            <div className={`relative shrink-0 ${collapsed ? "hidden" : ""}`} ref={bellRef}>
              <button
                type="button"
                onClick={() => {
                  setIsBellOpen((o) => !o);
                  refreshList(1).catch(() => {});
                }}
                className={`relative rounded-xl p-2 transition ${
                  isDark
                    ? "text-gray-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
                aria-label="Notifications"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {isBellOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          markAllRead();
                          setIsBellOpen(false);
                        }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {dropdownList.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-500">
                        No notifications
                      </p>
                    ) : (
                      dropdownList.map((n) => (
                        <Link
                          key={n._id}
                          to={ap("notifications")}
                          onClick={() => {
                            markRead(n._id);
                            setIsBellOpen(false);
                          }}
                          className={`block px-3 py-2.5 hover:bg-white/5 border-b border-gray-800 last:border-0 ${!n.read ? "bg-white/5" : ""}`}
                        >
                          <p className="text-sm text-gray-200 font-medium truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {n.body}
                            </p>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    to={ap("notifications")}
                    onClick={() => setIsBellOpen(false)}
                    className="block px-3 py-2.5 text-center text-sm font-medium text-gray-300 hover:bg-white/5 border-t border-gray-700"
                  >
                    See all
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 flex flex-col min-h-0 py-3 overflow-hidden ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
          <div className="shrink-0 mb-3 px-1">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className={`w-full rounded-xl border py-2 pl-8 pr-8 text-xs focus:outline-none focus:ring-1 ${
                  isDark
                    ? "border-gray-700 bg-gray-900/80 text-gray-100 placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-600"
                    : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:ring-indigo-200"
                }`}
                aria-label="Search sidebar menu"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          )}

          {/* {!collapsed && (showReferralsTab || showRewardsTab) && (
            <div className="shrink-0 mb-3 px-1">
              <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Money
              </p>
              <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/60 p-0.5">
                {showReferralsTab && (
                  <Link
                    to={ap("money-features/refer-earn")}
                    onClick={() => setIsMoneyFeaturesOpen(true)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      isReferralsActive()
                        ? "bg-white text-black"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Gift size={13} className="shrink-0" />
                    Referrals
                  </Link>
                )}
                {showRewardsTab && (
                  <Link
                    to={ap("money-features/points-wallet")}
                    onClick={() => setIsMoneyFeaturesOpen(true)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      isRewardsActive()
                        ? "bg-white text-black"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Coins size={13} className="shrink-0" />
                    Rewards
                  </Link>
                )}
              </div>
            </div>
          )} */}

          <div className="relative flex min-h-0 flex-1 flex-col">
            {scrollHints.top && (
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex h-7 items-start justify-center pt-0.5 ${
                  isDark
                    ? "bg-gradient-to-b from-[#4B0082] via-[#4B0082]/80 to-transparent"
                    : "bg-gradient-to-b from-white via-white/90 to-transparent"
                }`}
                aria-hidden
              >
                <ChevronUp
                  size={14}
                  className={isDark ? "text-white/40" : "text-slate-400"}
                />
              </div>
            )}

            <div
              ref={navScrollRef}
              className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
            >
            <SidebarMainNav
              ap={ap}
              location={location}
              canUse={canUse}
              isActive={isActive}
              searchQuery={searchQuery}
              lightMode={!isDark}
              isNotificationSectionActive={isNotificationSectionActive}
              isAnalyticsSectionActive={isAnalyticsSectionActive}
              isAnalyticsOpen={isAnalyticsOpen}
              setIsAnalyticsOpen={setIsAnalyticsOpen}
              isCouponOpen={isCouponOpen}
              setIsCouponOpen={setIsCouponOpen}
              isInventoryOpen={isInventoryOpen}
              setIsInventoryOpen={setIsInventoryOpen}
              isNotificationOpen={isNotificationOpen}
              setIsNotificationOpen={setIsNotificationOpen}
              isTemplatesOpen={isTemplatesOpen}
              setIsTemplatesOpen={setIsTemplatesOpen}
              isPolicyOpen={isPolicyOpen}
              setIsPolicyOpen={setIsPolicyOpen}
              isUsersOpen={isUsersOpen}
              setIsUsersOpen={setIsUsersOpen}
              isUsersSectionActive={isUsersSectionActive}
              isMoneyFeaturesOpen={isMoneyFeaturesOpen}
              setIsMoneyFeaturesOpen={setIsMoneyFeaturesOpen}
              isMoneyFeaturesSectionActive={isMoneyFeaturesSectionActive}
              isOrdersOpen={isOrdersOpen}
              setIsOrdersOpen={setIsOrdersOpen}
              isOrdersSectionActive={isOrdersSectionActive}
              showMoneyFeatures={showMoneyFeatures}
              isFullAdminUser={isFullAdminUser}
              compact={collapsed}
            />

            {/* Panel Management */}
            {canUse(["admin"]) && (
            <div className={`mt-3 space-y-0.5 border-t pt-3 ${isDark ? "border-gray-800" : "border-slate-200"}`}>
              {!collapsed && (
              <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                isDark ? "text-gray-500" : "text-slate-400"
              }`}>
                Panel Management
              </div>
              )}

              <SidebarTooltip label="Sub Admin" show={collapsed} lightMode={!isDark}>
                <Link
                  to={ap("subadmin")}
                  className={`group ${panelItemClass(isActive(ap("subadmin")))}`}
                >
                  <UserPlus size={16} className={panelIconClass} />
                  {!collapsed && <span className="truncate">Sub Admin</span>}
                </Link>
              </SidebarTooltip>

              <SidebarTooltip label="Module Access" show={collapsed} lightMode={!isDark}>
                <Link
                  to={ap("subadmin/module-access")}
                  className={`group ${panelItemClass(isActive(ap("subadmin/module-access")))}`}
                >
                  <ShieldCheck size={16} className={panelIconClass} />
                  {!collapsed && <span className="truncate">Module Access</span>}
                </Link>
              </SidebarTooltip>

              {!filterByModules && (
                <SidebarTooltip label="Audit Logs" show={collapsed} lightMode={!isDark}>
                  <Link
                    to={ap("audit-logs")}
                    className={`group ${panelItemClass(isActive(ap("audit-logs")))}`}
                  >
                    <History size={16} className={panelIconClass} />
                    {!collapsed && <span className="truncate">Audit Logs</span>}
                  </Link>
                </SidebarTooltip>
              )}

              {collapsed ? (
                <SidebarTooltip label="Influencer" show={collapsed} lightMode={!isDark}>
                  <Link
                    to={ap("influencer")}
                    className={`group ${panelItemClass(location.pathname.startsWith(ap("influencer")))}`}
                  >
                    <Users size={16} className={panelIconClass} />
                  </Link>
                </SidebarTooltip>
              ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setIsInfluencerOpen(!isInfluencerOpen)}
                  className={`group w-full ${panelItemClass(location.pathname.startsWith(ap("influencer")))} justify-between`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Users size={16} className={panelIconClass} />
                    <span className="truncate">Influencer</span>
                  </div>
                  {isInfluencerOpen ? (
                    <ChevronDown size={14} className={isDark ? "text-gray-400" : "text-slate-400"} />
                  ) : (
                    <ChevronRight size={14} className={isDark ? "text-gray-400" : "text-slate-400"} />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isInfluencerOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-0.5 py-1 pl-7 pr-2">
                    <Link
                      to={ap("influencer")}
                      className={`block rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        isActive(ap("influencer"))
                          ? isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700"
                          : isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      Influencer List
                    </Link>
                    <Link
                      to={ap("influencer/coupons")}
                      className={`block rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        isActive(ap("influencer/coupons"))
                          ? isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700"
                          : isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      Influencer Coupons
                    </Link>
                  </div>
                </div>
              </div>
              )}

              <SidebarTooltip label="Driver" show={collapsed} lightMode={!isDark}>
                <Link
                  to={ap("driver")}
                  className={`group ${panelItemClass(isActive(ap("driver")))}`}
                >
                  <Truck size={16} className={panelIconClass} />
                  {!collapsed && <span className="truncate">Driver</span>}
                </Link>
              </SidebarTooltip>

              {collapsed ? (
                <SidebarTooltip label="Designer" show={collapsed} lightMode={!isDark}>
                  <Link
                    to={ap("designer")}
                    className={`group ${panelItemClass(isDesignerSectionActive())}`}
                  >
                    <Users size={16} className={panelIconClass} />
                  </Link>
                </SidebarTooltip>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsDesignerOpen(!isDesignerOpen)}
                    className={`group w-full ${panelItemClass(isDesignerSectionActive())} justify-between`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Users size={16} className={panelIconClass} />
                      <span className="truncate">Designer</span>
                    </div>
                    {isDesignerOpen ? (
                      <ChevronDown size={14} className={isDark ? "text-gray-400 shrink-0" : "text-slate-400 shrink-0"} />
                    ) : (
                      <ChevronRight size={14} className={isDark ? "text-gray-400 shrink-0" : "text-slate-400 shrink-0"} />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isDesignerOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-0.5 py-1 pl-7 pr-2">
                      <Link
                        to={ap("designer")}
                        className={`block rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          isActive(ap("designer"))
                            ? isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700"
                            : isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Management
                      </Link>
                      <Link
                        to={ap("designer/inventory")}
                        className={`block rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          isActive(ap("designer/inventory"))
                            ? isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700"
                            : isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Inventory
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
            </div>

            {scrollHints.bottom && (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end pb-1 pt-6 ${
                  isDark
                    ? "bg-gradient-to-t from-[#140034] via-[#140034]/85 to-transparent"
                    : "bg-gradient-to-t from-white via-white/90 to-transparent"
                }`}
                aria-hidden
              >
                <span
                  className={`mb-0.5 flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wide ${
                    isDark ? "text-white/50" : "text-slate-400"
                  }`}
                >
                  <ChevronDown size={12} className="animate-bounce" />
                  More
                </span>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div
          className={`shrink-0 border-t ${isDark ? "border-gray-800" : "border-slate-200"} ${
            collapsed ? "p-2" : "p-3"
          }`}
        >
          <SidebarTooltip
            label={isDark ? "Light mode" : "Dark mode"}
            show={collapsed}
            lightMode={!isDark}
          >
          <button
            type="button"
            onClick={toggleTheme}
            className={`mb-1 flex w-full items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              collapsed ? "justify-center" : "justify-between gap-2"
            } ${
              isDark
                ? "text-gray-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {collapsed ? (
              isDark ? <Moon size={16} className="shrink-0" /> : <Sun size={16} className="shrink-0" />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  {isDark ? (
                    <Moon size={16} className="shrink-0 text-indigo-300" />
                  ) : (
                    <Sun size={16} className="shrink-0 text-amber-300" />
                  )}
                  <span>{isDark ? "Dark mode" : "Light mode"}</span>
                </span>
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    isDark ? "bg-indigo-500" : "bg-white/25"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isDark ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </>
            )}
          </button>
          </SidebarTooltip>

          <SidebarTooltip label="Settings" show={collapsed} lightMode={!isDark}>
          <Link
            to={ap("settings")}
            className={`mb-1 flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors group ${
              collapsed ? "justify-center" : "gap-2"
            } ${
              isDark
                ? "text-gray-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Settings
              size={16}
              className={`shrink-0 ${
                isDark ? "text-gray-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
            {!collapsed && <span>Settings</span>}
          </Link>
          </SidebarTooltip>

          <SidebarTooltip label="Profile" show={collapsed} lightMode={!isDark}>
          <Link
            to={ap("profile")}
            className={`mb-1 flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors group ${
              collapsed ? "justify-center" : "gap-2"
            } ${
              isDark
                ? "text-gray-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Settings
              size={16}
              className={`shrink-0 ${
                isDark ? "text-gray-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
            {!collapsed && <span>Profile</span>}
          </Link>
          </SidebarTooltip>

          <SidebarTooltip label={isLoggingOut ? "Logging out…" : "Logout"} show={collapsed} lightMode={!isDark}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              collapsed ? "justify-center" : "gap-2"
            } ${
              isDark
                ? "text-red-400 hover:bg-red-950/40 hover:text-red-300"
                : "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>}
          </button>
          </SidebarTooltip>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
