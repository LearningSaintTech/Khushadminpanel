import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/support-tickets";

export const getSupportTickets = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.agentId) q.set("agentId", params.agentId);
  if (params.search) q.set("search", params.search);
  const qs = q.toString();
  return apiConnector("GET", qs ? `${BASE}?${qs}` : BASE);
};

export const getSupportTicketQueue = (page = 1, limit = 20) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiConnector("GET", `${BASE}/queue?${q.toString()}`);
};

export const getSupportTicketById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const getSupportTicketMessages = (id, page = 1, limit = 50) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiConnector("GET", `${BASE}/${id}/messages?${q.toString()}`);
};

export const getSupportTicketHistory = (id, limit = 200) => {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiConnector("GET", `${BASE}/${id}/history?${q.toString()}`);
};

export const sendSupportTicketMessage = (id, message) =>
  apiConnector("POST", `${BASE}/${id}/messages`, { message });

export const assignSupportTicket = (id, agentId) =>
  apiConnector("PATCH", `${BASE}/${id}/assign`, { agentId });

export const assignNextSupportTicket = (agentId) =>
  apiConnector("PATCH", `${BASE}/assign-next`, { agentId });

export const updateSupportTicketStatus = (id, status) =>
  apiConnector("PATCH", `${BASE}/${id}/status`, { status });

export const resolveSupportTicket = (id) =>
  apiConnector("PATCH", `${BASE}/${id}/resolve`);

export const deleteSupportTicket = (id) => apiConnector("DELETE", `${BASE}/${id}`);
