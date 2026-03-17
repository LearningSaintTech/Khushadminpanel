import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNotificationSocket } from "./NotificationContext.jsx";
import { selectToken } from "../redux/GlobalSelector";

/**
 * Connects Socket.IO when user is authenticated (token from Redux or localStorage).
 */
export function NotificationSocketConnector() {
  useLocation();
  const reduxToken = useSelector(selectToken);
  const token =
    reduxToken ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  useNotificationSocket(token);

  return null;
}
