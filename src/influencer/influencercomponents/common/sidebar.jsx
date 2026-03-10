// src/influencer/influencercomponents/common/sidebar.jsx
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  ShoppingBag,
  IndianRupee,
  UserCircle,
  Menu,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function InfluencerLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);

  const navigate = useNavigate();

  const toggleCoupons = () => setIsCouponsOpen((prev) => !prev);

  // LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${import.meta.env.VITE_BASE_URL}/api/influencer/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear token and influencer data
      localStorage.removeItem("token");
      localStorage.removeItem("influencer");

      navigate("/influencer/login");
    } catch (error) {
      console.error("Logout error:", error);

      localStorage.clear();
      navigate("/influencer/login");
    }
  };

  const navItems = [
    { to: "/influencer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      label: "Coupons",
      icon: Ticket,
      hasSubmenu: true,
      isOpen: isCouponsOpen,
      onToggle: toggleCoupons,
      subItems: [
        { to: "/influencer/coupon", label: "All Coupons", icon: Ticket },
        { to: "/influencer/analytics", label: "Coupon Analytics", icon: BarChart3 },
      ],
    },
    { to: "/influencer/orders", label: "Orders", icon: ShoppingBag },
    { to: "/influencer/earnings", label: "Earnings", icon: IndianRupee },
    { to: "/influencer/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 lg:w-80 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex-col shadow-2xl shadow-black/30 relative">
        
        {/* Brand */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-2xl shadow-lg">
                K
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Khush</h2>
              <p className="text-xs uppercase tracking-widest text-indigo-300/80">
                Influencer Hub
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) =>
            item.hasSubmenu ? (
              <div key={item.label}>
                <button
                  onClick={item.onToggle}
                  className={`group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl ${
                    item.isOpen
                      ? "bg-indigo-600/20 text-white"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.isOpen ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                {item.isOpen && (
                  <div className="pl-11 space-y-1 py-1">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${
                            isActive
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "text-gray-400 hover:bg-white/5"
                          }`
                        }
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-4 py-3.5 rounded-xl ${
                    isActive
                      ? "bg-indigo-600/30 text-white"
                      : "text-gray-300 hover:bg-white/10"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">

        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-lg">Khush</span>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-72 bg-slate-900 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="px-3 py-6 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl ${
                        isActive
                          ? "bg-indigo-600/30 text-white"
                          : "hover:bg-white/10"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}

                {/* Mobile Logout */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    Log Out
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}