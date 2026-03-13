import { useLocation } from "react-router-dom";
import { useNotificationSocket } from "./NotificationContext.jsx";

/**
 * Connects Socket.IO when user is authenticated (token in localStorage).
 * useLocation() ensures we re-render on route change (e.g. after login) so token is re-read.
 */
export function NotificationSocketConnector() {
  useLocation(); // subscribe to route changes so we re-render after login redirect
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useNotificationSocket(token);

  return null;
}
