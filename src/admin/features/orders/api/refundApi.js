import { apiConnector } from "../../../services/Apiconnector";

const refundEndpoints = {
  LIST: "/admin/refunds",
  CREATE: "/admin/refunds",
  ONE: (id) => `/admin/refunds/${encodeURIComponent(id)}`,
  PROCESS: (id) => `/admin/refunds/${encodeURIComponent(id)}/process`,
  MARK_MANUAL: (id) =>
    `/admin/refunds/${encodeURIComponent(id)}/mark-manual-complete`,
};

export const listRefundRequests = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") q.set(k, String(v));
  });
  const qs = q.toString();
  return apiConnector("GET", `${refundEndpoints.LIST}${qs ? `?${qs}` : ""}`);
};

export const getRefundRequest = (id) =>
  apiConnector("GET", refundEndpoints.ONE(id));

export const createRefundRequest = (body) =>
  apiConnector("POST", refundEndpoints.CREATE, body);

export const processRefundRequest = (id, body = {}) =>
  apiConnector("POST", refundEndpoints.PROCESS(id), body);

export const approveRefundRequest = (id, body = {}) =>
  apiConnector(
    "POST",
    `/admin/refunds/${encodeURIComponent(id)}/approve`,
    body
  );

export const markRefundManualComplete = (id, body = {}) =>
  apiConnector("POST", refundEndpoints.MARK_MANUAL(id), body);
