import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/support-agents";

export const getSupportAgents = (page = 1, limit = 20, search = "", status = "") => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return apiConnector("GET", `${BASE}?${params.toString()}`);
};

export const getSupportAgentById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const createSupportAgent = (body) => apiConnector("POST", BASE, body);

export const updateSupportAgent = (id, body) => apiConnector("PUT", `${BASE}/${id}`, body);

export const deleteSupportAgent = (id) => apiConnector("DELETE", `${BASE}/${id}`);
