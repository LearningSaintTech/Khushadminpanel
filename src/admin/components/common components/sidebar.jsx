// Sidebar.jsx
import { useState, useEffect, useRef } from "react";
import SidebarMainNav from "./sidebarMainNav";
import Khush from "../../../assets/images/khushh.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotification } from "../../../context/NotificationContext";
import {
  Bell,
  History,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  Users,
  UserPlus,
  Truck,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../apis/Authapi";
import { logout } from "../../../redux/GlobalSlice";
import { subadminApi } from "../../../subadmin/apis/subadminApi";

const Sidebar = ({ basePath = "/admin", filterByModules = false }) => {
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef(null);

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

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.replace(/\/+/g, "/") === path;
  const isNotificationSectionActive = () =>
    location.pathname.startsWith(ap("notifications"));
  const isDesignerSectionActive = () =>
    location.pathname.startsWith(ap("designer"));
  const isAnalyticsSectionActive = () =>
    location.pathname.startsWith(ap("analytics")) ||
    location.pathname.startsWith(ap("coupon-analytics"));

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
    if (isAnalyticsSectionActive()) {
      setIsAnalyticsOpen(true);
    }
  }, [location.pathname]);

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
      {/* Mobile Hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black text-white shadow-lg rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu size={24} />
      </button>

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-black text-gray-100 flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:shadow-2xl
        `}
      >
        {/* Logo + Notification icon */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-14 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <img
                src={Khush}
                alt="Khush Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          {canUse(["admin"]) && (
            <div className="relative shrink-0" ref={bellRef}>
              <button
                type="button"
                onClick={() => {
                  setIsBellOpen((o) => !o);
                  refreshList(1).catch(() => {});
                }}
                className="relative p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition"
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

        {/* Navigation - scrollable but scrollbar hidden */}
        <nav className="flex-1 flex flex-col min-h-0 px-3 py-3 overflow-hidden">
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
                className="w-full rounded-lg border border-gray-700 bg-gray-900/80 py-2 pl-8 pr-8 text-xs text-gray-100 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600"
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

          <div className="flex-1 overflow-y-auto scrollbar-hide pr-0.5">
            <SidebarMainNav
              ap={ap}
              location={location}
              canUse={canUse}
              isActive={isActive}
              searchQuery={searchQuery}
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
            />

            {/* Panel Management â€” order unchanged */}
            {canUse(["admin"]) && (
              <div className="pt-4 mt-4 border-t border-gray-800">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Panel Management
                </div>

                <Link
                  to={ap("subadmin")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                    isActive(ap("subadmin"))
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white hover:text-black"
                  }`}
                >
                  <UserPlus
                    size={16}
                    className="text-gray-400 group-hover:text-black shrink-0"
                  />
                  <span className="truncate">Sub Admin</span>
                </Link>

                <Link
                  to={ap("subadmin/module-access")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                    isActive(ap("subadmin/module-access"))
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white hover:text-black"
                  }`}
                >
                  <ShieldCheck
                    size={16}
                    className="text-gray-400 group-hover:text-black shrink-0"
                  />
                  <span className="truncate">Module Access</span>
                </Link>

                {!filterByModules && (
                  <Link
                    to={ap("audit-logs")}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                      isActive(ap("audit-logs"))
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white hover:text-black"
                    }`}
                  >
                    <History
                      size={16}
                      className="text-gray-400 group-hover:text-black shrink-0"
                    />
                    <span className="truncate">Audit Logs</span>
                  </Link>
                )}

                {/* Influencer Dropdown */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsInfluencerOpen(!isInfluencerOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md text-gray-300 hover:bg-white hover:text-black transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users
                        size={16}
                        className="text-gray-400 group-hover:text-black shrink-0"
                      />
                      <span className="truncate">Influencer</span>
                    </div>
                    {isInfluencerOpen ? (
                      <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isInfluencerOpen
                        ? "max-h-40 opacity-100 mt-0.5"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-7 pr-2 py-1 space-y-0.5">
                      <Link
                        to={ap("influencer")}
                        className="block px-3 py-1.5 text-[11px] text-gray-400 hover:bg-white hover:text-black rounded-md"
                      >
                        Influencer List
                      </Link>

                      <Link
                        to={ap("influencer/coupons")}
                        className="block px-3 py-1.5 text-[11px] text-gray-400 hover:bg-white hover:text-black rounded-md"
                      >
                        Influencer Coupons
                      </Link>
                    </div>
                  </div>
                </div>

                <Link
                  to={ap("driver")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                    isActive(ap("driver"))
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white hover:text-black"
                  }`}
                >
                  <Truck
                    size={16}
                    className="text-gray-400 group-hover:text-black shrink-0"
                  />
                  <span className="truncate">Driver</span>
                </Link>

                <div>
                  <button
                    type="button"
                    onClick={() => setIsDesignerOpen(!isDesignerOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors group ${
                      isDesignerSectionActive()
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white hover:text-black"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users
                        size={16}
                        className="text-gray-400 group-hover:text-black shrink-0"
                      />
                      <span className="truncate">Designer</span>
                    </div>
                    {isDesignerOpen ? (
                      <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isDesignerOpen
                        ? "max-h-40 opacity-100 mt-0.5"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-7 pr-2 py-1 space-y-0.5">
                      <Link
                        to={ap("designer")}
                        className={`block px-3 py-1.5 rounded-md text-[11px] font-medium ${
                          isActive(ap("designer"))
                            ? "bg-white/10 text-white"
                            : "text-gray-400 hover:bg-white hover:text-black"
                        }`}
                      >
                        Management
                      </Link>

                      <Link
                        to={ap("designer/inventory")}
                        className={`block px-3 py-1.5 rounded-md text-[11px] font-medium ${
                          isActive(ap("designer/inventory"))
                            ? "bg-white/10 text-white"
                            : "text-gray-400 hover:bg-white hover:text-black"
                        }`}
                      >
                        Inventory
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-800 shrink-0">
          <Link
            to={ap("settings")}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-gray-300 hover:bg-white/10 hover:text-white transition-colors group mb-1"
          >
            <Settings
              size={16}
              className="text-gray-400 group-hover:text-white shrink-0"
            />
            <span>Settings</span>
          </Link>
          <Link
            to={ap("profile")}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-gray-300 hover:bg-white/10 hover:text-white transition-colors group mb-1"
          >
            <Settings
              size={16}
              className="text-gray-400 group-hover:text-white shrink-0"
            />
            <span>Profile</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={16} className="shrink-0" />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
