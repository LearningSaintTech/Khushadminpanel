// layouts/Layout.jsx
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import Sidebar from "../common components/sidebar";
import { useNotification } from "../../../context/NotificationContext";
import { AdminPanelBasePathProvider, useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { ThemeProvider } from "../../../context/ThemeContext";
import { getAdminPageTitle } from "../../utils/adminPageTitle";

function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LayoutInner({ filterSidebar }) {
  const { unreadCount, refreshUnreadCount } = useNotification();
  const basePath = useAdminPanelBasePath();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const pageTitle = getAdminPageTitle(location.pathname, basePath);

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  const notificationsPath = `${basePath}/notifications`;

  return (
    <div className="min-h-screen bg-[#e8ecf1] p-3">
      <div className="flex h-[calc(100vh-1.5rem)] gap-3">
        <Sidebar
          basePath={basePath}
          filterByModules={filterSidebar}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 pl-14 shadow-sm lg:pl-4">
            <h1 className="truncate text-sm font-semibold text-slate-900">{pageTitle}</h1>
            {!filterSidebar && (
              <Link
                to={notificationsPath}
                className="relative shrink-0 rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <NotificationBadge count={unreadCount} />
              </Link>
            )}
          </header>

          <main className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

/** @param {{ basePath?: string, filterSidebar?: boolean }} props */
const Layout = ({ basePath = "/admin", filterSidebar = false }) => {
  return (
    <ThemeProvider>
      <AdminPanelBasePathProvider basePath={basePath}>
        <LayoutInner filterSidebar={filterSidebar} />
      </AdminPanelBasePathProvider>
    </ThemeProvider>
  );
};

export default Layout;
