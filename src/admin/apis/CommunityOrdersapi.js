import { apiConnector } from "../services/Apiconnector";

/** Community-attributed orders live on the backend service. */
const ORDERS = "/admin/community-orders";

export const getCommunityOrderSummary = (params = {}) =>
  apiConnector("GET", `${ORDERS}/summary`, null, {}, params);

export const listCommunityOrders = (params = {}) =>
  apiConnector("GET", ORDERS, null, {}, params);

export const getCommunityOrder = (orderId) =>
  apiConnector("GET", `${ORDERS}/${encodeURIComponent(orderId)}`);
