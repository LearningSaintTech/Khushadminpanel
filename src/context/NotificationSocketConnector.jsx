
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNotificationSocket } from "./NotificationContext.jsx";
import { selectToken } from "../redux/GlobalSelector";

/**
 * Connects Socket.IO when user is authenticated (token from Redux memory).
 */
export function NotificationSocketConnector() {
  useLocation();
  const token = useSelector(selectToken);

  useNotificationSocket(token);

  return null;
}
