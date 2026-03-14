import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { notificationApi } from "../admin/services/notificationApi.js";

const NotificationContext = createContext(null);

const LIST_PAGE_SIZE = 20;
const DROPDOWN_LIMIT = 5;

// Same host as API, no /api path (backend attaches Socket.IO to same server).
// Match API base: env or fallback to localhost so socket connects to same backend as Apiconnector.
const API_BASE = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : "http://localhost:5000/api";
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

export function NotificationProvider({ children }) {
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownList, setDropdownList] = useState([]);

  const refreshList = useCallback(async (page = 1, limit = LIST_PAGE_SIZE) => {
    setLoading(true);
    try {
      const data = await notificationApi.getList({ page, limit });
      const items = data?.list ?? [];
      const total = data?.total ?? 0;
      setList(items);
      setDropdownList(items.slice(0, DROPDOWN_LIMIT));
      return { list: items, total, page: data?.page ?? page, limit: data?.limit ?? limit };
    } catch {
      setList([]);
      setDropdownList([]);
      return { list: [], total: 0, page: 1, limit };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      const count = data?.count ?? 0;
      setUnreadCount(count);
      return count;
    } catch {
      setUnreadCount(0);
      return 0;
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await notificationApi.markRead(id);
      setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setDropdownList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // keep state as is
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
      setDropdownList((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // keep state as is
    }
  }, []);

  const prependFromSocket = useCallback((payload) => {
    const item = {
      _id: payload.id,
      title: payload.title,
      body: payload.body,
      module: payload.module,
      referenceId: payload.referenceId,
      createdAt: payload.createdAt,
      read: false,
    };
    setList((prev) => [item, ...prev.filter((n) => n._id !== item._id)]);
    setDropdownList((prev) =>
      [item, ...prev.filter((n) => n._id !== item._id)].slice(0, DROPDOWN_LIMIT)
    );
    setUnreadCount((c) => c + 1);
  }, []);

  const value = {
    list,
    dropdownList,
    unreadCount,
    loading,
    refreshList,
    refreshUnreadCount,
    markRead,
    markAllRead,
    prependFromSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

/**
 * Hook to connect socket and fetch initial data when token is available.
 * Call from a component inside NotificationProvider (e.g. NotificationSocketConnector).
 */
export function useNotificationSocket(token) {
  const { refreshList, refreshUnreadCount, prependFromSocket } = useNotification();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !SOCKET_URL) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (import.meta.env?.DEV) console.log("[Admin] Notification socket connected");
      refreshList(1, LIST_PAGE_SIZE).catch(() => {});
      refreshUnreadCount().catch(() => {});
    });

    socket.on("notification:new", (payload) => {
      prependFromSocket(payload);
    });

    socket.on("connect_error", (err) => {
      if (import.meta.env?.DEV) console.warn("[Admin] Notification socket connect_error", err?.message || err);
      refreshList(1, LIST_PAGE_SIZE).catch(() => {});
      refreshUnreadCount().catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, refreshList, refreshUnreadCount, prependFromSocket]);

  return null;
}
