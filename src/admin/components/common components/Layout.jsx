// layouts/Layout.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import Sidebar from "../common components/sidebar";
import { Outlet } from "react-router-dom";
import { useNotification } from "../../../context/NotificationContext";

function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const Layout = () => {
  const { unreadCount, refreshUnreadCount } = useNotification();

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar: notifications bell (only when inside main content area) */}
      <div className="hidden lg:flex items-center justify-end gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200 shrink-0">
        <Link
          to="/admin/notifications"
          className="relative p-2 rounded-lg hover:bg-gray-200 transition"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-700" />
          <NotificationBadge count={unreadCount} />
        </Link>
      </div>

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:ml-72">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout
