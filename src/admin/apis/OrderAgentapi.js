import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/order-agents";

export const getOrderAgents = (page = 1, limit = 20, search = "", status = "") => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return apiConnector("GET", `${BASE}?${params.toString()}`);
};

export const getOrderAgentById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const createOrderAgent = (body) => apiConnector("POST", BASE, body);

export const updateOrderAgent = (id, body) => apiConnector("PUT", `${BASE}/${id}`, body);

export const deleteOrderAgent = (id) => apiConnector("DELETE", `${BASE}/${id}`);
