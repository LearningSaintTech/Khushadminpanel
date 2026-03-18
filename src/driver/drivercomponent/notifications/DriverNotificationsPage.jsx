import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CheckCheck } from "lucide-react";
import { useNotification } from "../../../context/NotificationContext";
import { notificationApi } from "../../../admin/services/notificationApi.js";

const PAGE_SIZE = 20;

function formatNotificationDate(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function DriverNotificationsPage() {
  const navigate = useNavigate();
  const { markRead, markAllRead, unreadCount } = useNotification();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const data = await notificationApi.getList({ page: pageNum, limit: PAGE_SIZE });
      const items = data?.list ?? [];
      setList((prev) => (append ? [...prev, ...items] : items));
      setTotal(data?.total ?? 0);
      setPage(data?.page ?? pageNum);
    } catch {
      if (!append) setList([]);
      setTotal((t) => (append ? t : 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n) => {
    if (!n.read) handleMarkRead(n._id);
    if (n.module === "assignment" && n.referenceId) {
      navigate(`/driver/assignment/${n.referenceId}`);
    } else if (n.module === "order" && n.referenceId) {
      navigate("/driver/order-history");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Bell size={20} className="text-gray-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <CheckCheck size={16} />
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex justify-between gap-2 mb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-14" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell size={36} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No notifications yet</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[260px]">
              Assignment and order updates will show up here when something needs your attention.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-all duration-150 hover:shadow-md active:scale-[0.99] ${
                    !n.read
                      ? "border-l-4 border-l-black border border-gray-100"
                      : "border border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{n.title}</p>
                      {n.body && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.body}</p>
                      )}
                      {(n.module === "assignment" || n.module === "order") && n.referenceId && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 mt-2">
                          View details
                          <ChevronRight size={14} />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                      {formatNotificationDate(n.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && total > PAGE_SIZE && list.length < total && (
          <button
            type="button"
            onClick={() => loadPage(page + 1, true)}
            disabled={loading}
            className="mt-4 w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
