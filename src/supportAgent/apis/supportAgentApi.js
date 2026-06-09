import { apiConnector } from "../../admin/services/Apiconnector";

const AUTH = "/agent/auth";
const TICKETS = "/agent/tickets";

/** POST – send OTP. Body: { phoneNumber }. */
export const supportAgentLogin = (data) =>
  apiConnector("POST", `${AUTH}/login`, data);

/** POST – verify OTP. Body: { agentId, otp }. */
export const supportAgentVerifyOtp = (data) =>
  apiConnector("POST", `${AUTH}/verify-otp`, data);

/** POST – resend OTP. Body: { agentId }. */
export const supportAgentResendOtp = (data) =>
  apiConnector("POST", `${AUTH}/resend-otp`, data);

export const supportAgentLogout = () => apiConnector("POST", `${AUTH}/logout`);

export const getMySupportTickets = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return apiConnector("GET", qs ? `${TICKETS}?${qs}` : TICKETS);
};

export const getMySupportTicket = (id) => apiConnector("GET", `${TICKETS}/${id}`);

export const getMyTicketMessages = (id, page = 1, limit = 100) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiConnector("GET", `${TICKETS}/${id}/messages?${q.toString()}`);
};

export const getMyTicketHistory = (id, limit = 200) => {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiConnector("GET", `${TICKETS}/${id}/history?${q.toString()}`);
};

export const sendMyTicketMessage = (id, message) =>
  apiConnector("POST", `${TICKETS}/${id}/messages`, { message });

export const resolveMyTicket = (id) => apiConnector("PATCH", `${TICKETS}/${id}/resolve`);
