import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { useNotification } from "../../../context/NotificationContext";
import { notificationApi } from "../../../admin/services/notificationApi.js";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  PageToolbar,
  LoadingBlock,
  EmptyBlock,
  inputClass,
} from "./notificationsShared";

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

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
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
    if (n.module === "order" && n.referenceId) {
      navigate(ap("orders"));
    }
  };

  return (
    <div className="text-stone-900">
      <PageToolbar
        icon={Bell}
        title="Notifications"
        subtitle="Updates and system alerts"
      >
        {unreadCount > 0 ? (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            {unreadCount} unread
          </span>
        ) : null}
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className={`${inputClass} font-medium text-brand-600`}
          >
            Mark all read
          </button>
        ) : null}
      </PageToolbar>

      {loading && list.length === 0 ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyBlock message="No notifications yet." />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {list.map((n) => (
            <li key={n._id} className="border-t border-border/80 first:border-t-0">
              <button
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full px-3 py-2 text-left transition-colors hover:bg-brand-50/30 ${
                  !n.read ? "bg-brand-50/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-[11px] font-semibold text-stone-900">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-stone-500">
                    {formatNotificationDate(n.createdAt)}
                  </span>
                </div>
                {n.body ? <p className="mt-0.5 text-[11px] text-stone-600">{n.body}</p> : null}
                {n.module === "order" && n.referenceId ? (
                  <p className="mt-1 text-[10px] font-medium text-brand-600">View orders →</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && list.length < total ? (
        <button
          type="button"
          onClick={() => loadPage(page + 1, true)}
          disabled={loading}
          className={`${inputClass} mt-2 w-full font-medium disabled:opacity-50`}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </span>
          ) : (
            "Load more"
          )}
        </button>
      ) : null}
    </div>
  );
}
