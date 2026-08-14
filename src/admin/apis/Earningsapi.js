import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/earnings";

export const getEarningsPolicy = () =>
  apiConnector("GET", `${BASE}/policy`);

export const updateEarningsPolicy = (body) =>
  apiConnector("PATCH", `${BASE}/policy`, body);

export const getEarningsCommissions = (params = {}) =>
  apiConnector("GET", `${BASE}/commissions`, null, {}, params);

export const getEarningsPayouts = (params = {}) =>
  apiConnector("GET", `${BASE}/payouts`, null, {}, params);

export const payEarningsPayout = (id, body = {}) =>
  apiConnector("PATCH", `${BASE}/payouts/${id}/pay`, body);

export const rejectEarningsPayout = (id, body = {}) =>
  apiConnector("PATCH", `${BASE}/payouts/${id}/reject`, body);

export const getEarningsAttribution = (params = {}) =>
  apiConnector("GET", `${BASE}/attribution`, null, {}, params);

export const settleEarnings = (body = {}) =>
  apiConnector("POST", `${BASE}/settle`, body);
