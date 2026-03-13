import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500 py-8">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden bg-white">
          {list.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  !n.read ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-gray-900 flex-1">{n.title}</p>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatNotificationDate(n.createdAt)}
                  </span>
                </div>
                {n.body ? (
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                ) : null}
                {(n.module === "assignment" || n.module === "order") && n.referenceId && (
                  <p className="text-xs text-blue-600 mt-1">View details →</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && list.length < total && (
        <button
          type="button"
          onClick={() => loadPage(page + 1, true)}
          disabled={loading}
          className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
