import { apiConnector } from "../../admin/services/Apiconnector";

const ORDERS = "/order-agent/orders";

function appendParams(params, entries) {
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
}

export const getOrderAgentOrders = ({
  page = 1,
  limit = 20,
  search = "",
  orderStatus = "",
  itemStatusConsistency = "",
  startDate = "",
  endDate = "",
  paymentStatus = "",
  paymentMode = "",
  city = "",
  exchangeOnly = false,
  returnOnly = false,
} = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  appendParams(params, {
    search,
    orderStatus,
    itemStatusConsistency,
    startDate,
    endDate,
    paymentStatus,
    paymentMode,
    city,
  });
  if (exchangeOnly) params.set("exchangeOnly", "true");
  if (returnOnly) params.set("returnOnly", "true");
  return apiConnector("GET", `${ORDERS}?${params.toString()}`);
};

export const getProcessingOrderItems = ({
  page = 1,
  limit = 20,
  search = "",
  itemStatus = "",
  orderStatus = "",
  shippingProvider = "",
  startDate = "",
  endDate = "",
  paymentStatus = "",
  paymentMode = "",
  city = "",
  exchangeOnly = false,
  returnOnly = false,
} = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  appendParams(params, {
    search,
    itemStatus,
    orderStatus,
    shippingProvider,
    startDate,
    endDate,
    paymentStatus,
    paymentMode,
    city,
  });
  if (exchangeOnly) params.set("exchangeOnly", "true");
  if (returnOnly) params.set("returnOnly", "true");
  return apiConnector("GET", `${ORDERS}/items?${params.toString()}`);
};

export const getStaleOrdersList = ({ hours = 24 } = {}) => {
  const params = new URLSearchParams({ hours: String(hours) });
  return apiConnector("GET", `${ORDERS}/stale-alert/list?${params.toString()}`);
};
