import { apiConnector } from "../../admin/services/Apiconnector";

const AUTH = "/order-agent/auth";
const ORDERS = "/order-agent/orders";

export const orderAgentLogin = (data) => apiConnector("POST", `${AUTH}/login`, data);

export const orderAgentVerifyOtp = (data) =>
  apiConnector("POST", `${AUTH}/verify-otp`, data);

export const orderAgentResendOtp = (data) =>
  apiConnector("POST", `${AUTH}/resend-otp`, data);

export const orderAgentLogout = () => apiConnector("POST", `${AUTH}/logout`);

export const getOrderAgentStatusOptions = () =>
  apiConnector("GET", "/order-agent/meta/status-options");

/** Single call for all Order Agent sidebar status / provider / stale counts. */
export const getOrderAgentSidebarCounts = ({ view = "item" } = {}) => {
  const params = new URLSearchParams();
  if (view === "order") params.set("view", "order");
  const query = params.toString();
  return apiConnector("GET", `/order-agent/meta/sidebar-counts${query ? `?${query}` : ""}`);
};

/** @deprecated use getOrderAgentAnalytics */
export const getOrderAgentStatusCounts = ({
  view = "item",
  exchangeOnly = false,
  returnOnly = false,
} = {}) => getOrderAgentAnalytics({ view, section: exchangeOnly ? "exchange" : returnOnly ? "returns" : "orders" });

export const getOrderAgentAnalytics = ({
  view = "item",
  section = "orders",
} = {}) => {
  const params = new URLSearchParams({ view });
  if (section === "exchange") params.set("exchangeOnly", "true");
  if (section === "returns") params.set("returnOnly", "true");
  return apiConnector("GET", `${ORDERS}/analytics/status-counts?${params.toString()}`);
};

export {
  getOrderAgentOrders,
  getProcessingOrderItems,
  getStaleOrdersList,
} from "./orderAgentListApi.js";

export const getProcessingOrderDetail = (orderId) =>
  apiConnector("GET", `${ORDERS}/${orderId}`);

export const updateProcessingItemStatus = (orderId, itemId, body) =>
  apiConnector("PATCH", `${ORDERS}/${orderId}/items/${itemId}/status`, body);

export const downloadShadowfaxLabel = (orderId, itemId) =>
  apiConnector("POST", `${ORDERS}/shadowfax-label/download`, { orderId, itemId });

export const downloadSelfShippingLabel = (orderId, itemId) =>
  apiConnector("POST", `${ORDERS}/self-shipping-label/download`, { orderId, itemId });

export const createShiprocketForOrder = (orderId, body = {}) =>
  apiConnector("POST", `${ORDERS}/${orderId}/shiprocket/create`, body);

export const createDelhiveryForOrder = (orderId, body = {}) =>
  apiConnector("POST", `${ORDERS}/${orderId}/delhivery/create`, body);
