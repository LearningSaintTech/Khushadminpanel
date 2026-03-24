// Sidebar.jsx
import { useState, useEffect, useRef } from "react";
import Khush from "../../../assets/images/khushh.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotification } from "../../../context/NotificationContext";
import {
  LayoutDashboard,
  Bell,
  FileText,
  Mail,
  Megaphone,
  History,
  FlaskConical,
  Package,
  Tags,
  ShoppingCart,
  Receipt,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  Users,
  UserPlus,
  Truck,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { GrDeliver } from "react-icons/gr";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../apis/Authapi";
import { logout } from "../../../redux/GlobalSlice";
import { subadminApi } from "../../../subadmin/apis/subadminApi";

const Sidebar = ({ basePath = "/admin", filterByModules = false }) => {
  const ap = (suffix) => {
    const t = String(suffix || "").replace(/^\/+/,"");
    return `${basePath}/${t}`.replace(/\/+/g, "/");
  };

  const dispatch = useDispatch();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isInfluencerOpen, setIsInfluencerOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef(null);

  const rawRole = useSelector((s) => s.global?.role);
  const isFullAdminUser = String(rawRole || "").toUpperCase() === "ADMIN";
  const [allowedModules, setAllowedModules] = useState(null);

  const { unreadCount, dropdownList, markRead, markAllRead, refreshUnreadCount, refreshList } = useNotification();

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
        if (!cancelled) setAllowedModules(new Set(Array.isArray(list) ? list : []));
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

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setIsBellOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isNotificationSectionActive() && (location.pathname.includes("templates") || location.pathname.includes("email-templates"))) {
      setIsNotificationOpen(true);
      setIsTemplatesOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isDesignerSectionActive()) {
      setIsDesignerOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    console.log("🚪 Logout button clicked");

    if (isLoggingOut) {
      console.log("⚠️ Logout already in progress");
      return;
    }

    try {
      setIsLoggingOut(true);
      console.log("📡 Calling logout API...");

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
      console.error("❌ Logout error:", error);
      console.error("❌ Error details:", {
        message: error?.response?.data?.message || error,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      dispatch(logout());
      navigate(basePath === "/subadmin" ? "/subadmin/login" : "/admin");
    } finally {
      setIsLoggingOut(false);
      console.log("🏁 Logout process finished");
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
          fixed inset-y-0 left-0 z-40 w-72 bg-black text-gray-100 flex flex-col
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
              <img src={Khush} alt="Khush Logo" className="w-full h-full object-contain" />
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
                <div className="absolute top-full right-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Notifications</span>
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
                      <p className="px-3 py-4 text-sm text-gray-500">No notifications</p>
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
                          <p className="text-sm text-gray-200 font-medium truncate">{n.title}</p>
                          {n.body && <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>}
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
        <nav className="flex-1 px-4 py-5 overflow-y-auto scrollbar-hide">
          <div className="space-y-1.5">
            {/* Dashboard */}
            {canUse(["admin"]) && (
              <Link
                to={ap("dashboard")}
                className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isActive(ap("dashboard")) ? "bg-white/10 text-white" : ""
                }`}
              >
                <LayoutDashboard
                  size={20}
                  className="text-gray-400 group-hover:text-black"
                />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Notifications dropdown */}
            {canUse(["admin"]) && (
            <div>
              <button
                onClick={() => {
                  setIsNotificationOpen((o) => !o);
                  if (!isNotificationOpen) setIsTemplatesOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isNotificationSectionActive() ? "bg-white/10 text-white" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-gray-400 group-hover:text-black" />
                  <span>Notifications</span>
                </div>
                {isNotificationOpen ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isNotificationOpen ? "max-h-[420px] opacity-100 mt-1" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-4 pr-2 py-1 space-y-0.5 border-l-2 border-gray-700 ml-5">
                  <Link
                    to={ap("notifications")}
                    className={`block px-3 py-2.5 rounded text-sm font-medium ${
                      location.pathname === ap("notifications")
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    1. All notifications
                  </Link>
                  <Link
                    to={ap("notifications/sent")}
                    className={`block px-3 py-2.5 rounded text-sm font-medium ${
                      isActive(ap("notifications/sent"))
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    2. All send notifications
                  </Link>
                  <div>
                    <button
                      onClick={() => setIsTemplatesOpen((o) => !o)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-sm font-medium ${
                        isActive(ap("notifications/templates")) || isActive(ap("notifications/email-templates"))
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      }`}
                    >
                      3. Templates
                      {isTemplatesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className={`overflow-hidden ${isTemplatesOpen ? "max-h-24" : "max-h-0"}`}>
                      <Link
                        to={ap("notifications/templates")}
                        className="block pl-4 py-2 text-xs text-gray-500 hover:text-gray-300"
                      >
                        In-app
                      </Link>
                      <Link
                        to={ap("notifications/email-templates")}
                        className="block pl-4 py-2 text-xs text-gray-500 hover:text-gray-300"
                      >
                        Email
                      </Link>
                    </div>
                  </div>
                  <Link
                    to={ap("notifications/broadcast")}
                    className={`block px-3 py-2.5 rounded text-sm font-medium ${
                      isActive(ap("notifications/broadcast"))
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    4. Broadcast
                  </Link>
                  <Link
                    to={ap("notifications/history")}
                    className="block px-3 py-2.5 rounded text-sm text-gray-500 hover:bg-white/5 hover:text-gray-400"
                  >
                    History
                  </Link>
                  <Link
                    to={ap("notifications/test")}
                    className="block px-3 py-2.5 rounded text-sm text-gray-500 hover:bg-white/5 hover:text-gray-400"
                  >
                    Test
                  </Link>
                </div>
              </div>
            </div>
            )}

            {/* Inventory Dropdown */}
            {canUse(["categories", "subcategories", "items", "warehouse"]) && (
            <div>
              <button
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isInventoryOpen ? "bg-white/5 text-white" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package
                    size={20}
                    className="text-gray-400 group-hover:text-black"
                  />
                  <span>Inventory</span>
                </div>
                {isInventoryOpen ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </button>

              {/* Dropdown */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isInventoryOpen
                    ? "max-h-96 opacity-100 mt-1"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-10 pr-4 py-2 space-y-1">
                  <Link
                    to={ap("inventory/categories")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("inventory/categories"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    Categories
                  </Link>

                  <Link
                    to={ap("inventory-codes")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("inventory-codes"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    Inventory codes
                  </Link>

                  <Link
                    to={ap("subcategoriess")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("subcategoriess"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    SubCategories
                  </Link>
                  <Link
                    to={ap("items")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("items"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    Items
                  </Link>
                  <Link
                    to={ap("inventory/central")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("items"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                  Central  Stock management
                  </Link>
                  <Link
                    to={ap("stocks")}
                    className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                      location.pathname.includes(ap("items"))
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    Stock management
                  </Link>
                </div>
              </div>
            </div>
            )}

            {/* Other items */}
            {/* Coupons Dropdown */}
            {canUse(["coupons"]) && (
            <div>
              <button
                onClick={() => setIsCouponOpen(!isCouponOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group"
              >
                <div className="flex items-center gap-3">
                  <Tags
                    size={20}
                    className="text-gray-400 group-hover:text-black"
                  />
                  <span>Coupons</span>
                </div>
                {isCouponOpen ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isCouponOpen
                    ? "max-h-40 opacity-100 mt-1"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-10 pr-4 py-2 space-y-1">
                  <Link
                    to={ap("coupons")}
                    className="block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black"
                  >
                    Coupon List
                  </Link>

                  <Link
                    to={ap("coupon-analytics")}
                    className="block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black"
                  >
                    Coupon Analytics
                  </Link>
                </div>
              </div>
            </div>
            )}

            {canUse(["sections"]) && (
            <Link
              to={ap("sections")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("sections")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <ShoppingCart
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Sections</span>
            </Link>
            )}
            {/* Policy Dropdown */}
            {canUse(["exchange", "admin"]) && (
            <div>
              <button
                onClick={() => setIsPolicyOpen(!isPolicyOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart
                    size={20}
                    className="text-gray-400 group-hover:text-black"
                  />
                  <span>Policy</span>
                </div>

                {isPolicyOpen ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isPolicyOpen
                    ? "max-h-40 opacity-100 mt-1"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-10 pr-4 py-2 space-y-1">
                  {canUse(["exchange"]) && (
                    <Link
                      to={ap("exchange")}
                      className={`block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black ${
                        location.pathname.includes(ap("exchange"))
                          ? "bg-white/10 text-white"
                          : ""
                      }`}
                    >
                      Exchange
                    </Link>
                  )}

                  {canUse(["admin"]) && (
                    <Link
                      to={ap("cancellation")}
                      className={`block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black ${
                        location.pathname.includes(ap("cancellation"))
                          ? "bg-white/10 text-white"
                          : ""
                      }`}
                    >
                      Cancellation
                    </Link>
                  )}
                </div>
              </div>
            </div>
            )}

            {canUse(["banner"]) && (
            <Link
              to={ap("banners")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("banners")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <FileText
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Banner</span>
            </Link>
            )}

            {canUse(["brands"]) && (
            <Link
              to={ap("brands")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("brands")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <FileText
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Brands</span>
            </Link>
            )}

            {canUse(["features"]) && (
            <Link
              to={ap("features")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("features")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Package
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Features</span>
            </Link>
            )}

            {canUse(["admin"]) && (
            <Link
              to={ap("orders")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("orders")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Package
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Orders</span>
            </Link>
            )}

            {/* <Link
              to={ap("status")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("status")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Package
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Status</span>

              
            </Link> */}

            {canUse(["filters"]) && (
            <Link
              to={ap("filters")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("filters")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Package
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Filters</span>
            </Link>
            )}

            {canUse(["banner"]) && (
            <Link
              to={ap("splash")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("splash")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Package
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Home banners</span>
            </Link>
            )}

            {canUse(["warehouse"]) && (
            <Link
              to={ap("warehouse")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("warehouse")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Building2
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Warehouse</span>
            </Link>
            )}

            {canUse(["cart-charges"]) && (
            <Link
              to={ap("cart-charges")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("cart-charges")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Receipt
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Cart Charges</span>
            </Link>
            )}

            {canUse(["reviews"]) && (
            <Link
              to={ap("reviews")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("reviews")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Receipt
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Reviews</span>
            </Link>
            )}

            {canUse(["contact-us"]) && (
            <Link
              to={ap("contact-us")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("contact-us")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Mail
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Contact Requests</span>
            </Link>
            )}

            {canUse(["delivery"]) && (
            <Link
              to={ap("delivery")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("delivery")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <GrDeliver
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Delivery</span>
            </Link>
            )}

            {canUse(["servicablePincode"]) && (
            <Link
              to={ap("pincode")}
              className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                isActive(ap("pincode")) ? "bg-white/10 text-white" : ""
              }`}
            >
              <Receipt
                size={20}
                className="text-gray-400 group-hover:text-black"
              />
              <span>Pincode</span>
            </Link>
            )}

            {/* Panel Management Section */}
            {canUse(["admin"]) && (
            <div className="pt-4 mt-4 border-t border-gray-800">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Panel Management
              </div>

              <Link
                to={ap("subadmin")}
                className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isActive(ap("subadmin")) ? "bg-white/10 text-white" : ""
                }`}
              >
                <UserPlus
                  size={20}
                  className="text-gray-400 group-hover:text-black"
                />
                <span>Sub Admin</span>
              </Link>

              <Link
                to={ap("subadmin/module-access")}
                className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isActive(ap("subadmin/module-access")) ? "bg-white/10 text-white" : ""
                }`}
              >
                <ShieldCheck size={20} className="text-gray-400 group-hover:text-black" />
                <span>Module Access</span>
              </Link>

              {!filterByModules && (
                <Link
                  to={ap("audit-logs")}
                  className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                    isActive(ap("audit-logs")) ? "bg-white/10 text-white" : ""
                  }`}
                >
                  <History size={20} className="text-gray-400 group-hover:text-black" />
                  <span>Audit Logs</span>
                </Link>
              )}

              {/* Influencer Dropdown */}
              <div>
                <button
                  onClick={() => setIsInfluencerOpen(!isInfluencerOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group"
                >
                  <div className="flex items-center gap-3">
                    <Users
                      size={20}
                      className="text-gray-400 group-hover:text-black"
                    />
                    <span>Influencer</span>
                  </div>
                  {isInfluencerOpen ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isInfluencerOpen
                      ? "max-h-40 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-10 pr-4 py-2 space-y-1">
                    <Link
                      to={ap("influencer")}
                      className="block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black"
                    >
                      Influencer List
                    </Link>

                    <Link
                      to={ap("influencer/coupons")}
                      className="block px-4 py-2 text-sm text-gray-400 hover:bg-white hover:text-black"
                    >
                      Influencer Coupons
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                to={ap("driver")}
                className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                  isActive(ap("driver")) ? "bg-white/10 text-white" : ""
                }`}
              >
                <Truck
                  size={20}
                  className="text-gray-400 group-hover:text-black"
                />
                <span>Driver</span>
              </Link>

              <div>
                <button
                  onClick={() => setIsDesignerOpen(!isDesignerOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-white hover:text-black transition-all duration-200 font-medium group ${
                    isDesignerSectionActive() ? "bg-white/10 text-white" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users
                      size={20}
                      className="text-gray-400 group-hover:text-black"
                    />
                    <span>Designer</span>
                  </div>
                  {isDesignerOpen ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isDesignerOpen
                      ? "max-h-40 opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-10 pr-4 py-2 space-y-1">
                    <Link
                      to={ap("designer")}
                      className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                        isActive(ap("designer"))
                          ? "bg-white/10 text-white"
                          : ""
                      }`}
                    >
                      Management
                    </Link>

                    <Link
                      to={ap("designer/inventory")}
                      className={`block px-4 py-2.5 text-gray-400 hover:bg-white hover:text-black transition-all duration-200 text-sm font-medium ${
                        isActive(ap("designer/inventory"))
                          ? "bg-white/10 text-white"
                          : ""
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
        <div className="p-4 border-t border-gray-800 shrink-0">
          <Link
            to={ap("settings")}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 font-medium group mb-2"
          >
            <Settings
              size={20}
              className="text-gray-400 group-hover:text-white"
            />
            <span>Settings</span>
          </Link>
          <Link
            to={ap("profile")}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 font-medium group mb-2"
          >
            <Settings
              size={20}
              className="text-gray-400 group-hover:text-white"
            />
            <span>Profile</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={20} />
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
