/**
 * Driver (delivery agent) API – auth, profile, toggle online, deliveries, assignment actions.
 * Uses shared apiConnector; token from localStorage ("token").
 */
import { apiConnector } from "../../admin/services/Apiconnector";

const BASE = "/delivery-agent";

export const driverEndpoints = {
  LOGIN: `${BASE}/login`,
  VERIFY_OTP: `${BASE}/verify-otp`,
  RESEND_OTP: `${BASE}/resend-otp`,
  LOGOUT: `${BASE}/logout`,
  NEW_ACCESS_TOKEN: `${BASE}/newAccessToken`,
  GET_PROFILE: `${BASE}/getProfile`,
  TOGGLE_ONLINE: `${BASE}/toggle-online`,
  DELIVERIES: `${BASE}/deliveries`,
  DELIVERIES_HISTORY: `${BASE}/deliveries/history`,
  DELIVERIES_HISTORY_EXCHANGE: `${BASE}/deliveries/history/exchange`,
  ACCEPT: (id) => `${BASE}/deliveries/${id}/accept`,
  REJECT: (id) => `${BASE}/deliveries/${id}/reject`,
  PICKUP: (id) => `${BASE}/deliveries/${id}/pickup`,
  OUT_FOR_DELIVERY: (id) => `${BASE}/deliveries/${id}/out-for-delivery`,
  EXCHANGE_RECEIVED: (id) => `${BASE}/deliveries/${id}/exchange-received`,
  COD_PAYMENT_QR: (id) => `${BASE}/deliveries/${id}/cod-payment-qr`,
  DELIVERED: (id) => `${BASE}/deliveries/${id}/delivered`,
};

/** POST – send OTP. Body: { countryCode, phoneNumber }. Returns { userId, message }. */
export const driverLogin = (data) => apiConnector("POST", driverEndpoints.LOGIN, data);

/** POST – verify OTP. Body: { userId, otp }. Returns { accessToken, userId, message }. Backend sets refreshToken in cookie. */
export const driverVerifyOtp = (data) => apiConnector("POST", driverEndpoints.VERIFY_OTP, data);

/** POST – resend OTP. Body: { userId }. */
export const driverResendOtp = (data) => apiConnector("POST", driverEndpoints.RESEND_OTP, data);

/** POST – logout (requires auth). */
export const driverLogout = () => apiConnector("POST", driverEndpoints.LOGOUT);

/** GET – profile (requires auth). */
export const driverGetProfile = () => apiConnector("GET", driverEndpoints.GET_PROFILE);

/** PATCH – toggle accepting pickups. Body: { isOnline: boolean }. */
export const driverToggleOnline = (isOnline) =>
  apiConnector("PATCH", driverEndpoints.TOGGLE_ONLINE, { isOnline });

/** GET – my deliveries (assignments). Returns array of assignments with order/items. */
export const getMyDeliveries = () => apiConnector("GET", driverEndpoints.DELIVERIES);

/** GET – order history (delivered). Query: page, limit. Returns { list, pagination }. */
export const getOrderHistory = (page = 1, limit = 20) => {
  const url = `${driverEndpoints.DELIVERIES_HISTORY}?page=${page}&limit=${limit}`;
  console.log("[Driver API] getOrderHistory", { page, limit, url });
  return apiConnector("GET", url);
};

/** GET – exchange order history. Query: page, limit. Returns { list, pagination }. */
export const getExchangeHistory = (page = 1, limit = 20) => {
  const url = `${driverEndpoints.DELIVERIES_HISTORY_EXCHANGE}?page=${page}&limit=${limit}`;
  console.log("[Driver API] getExchangeHistory", { page, limit, url });
  return apiConnector("GET", url);
};

/** POST – accept assignment. */
export const acceptDelivery = (assignmentId) =>
  apiConnector("POST", driverEndpoints.ACCEPT(assignmentId));

/** POST – reject assignment. */
export const rejectDelivery = (assignmentId) =>
  apiConnector("POST", driverEndpoints.REJECT(assignmentId));

/** POST – mark picked up. */
export const markPickup = (assignmentId) =>
  apiConnector("POST", driverEndpoints.PICKUP(assignmentId));

/** POST – mark out for delivery. */
export const markOutForDelivery = (assignmentId) =>
  apiConnector("POST", driverEndpoints.OUT_FOR_DELIVERY(assignmentId));

/** POST – mark exchange received (exchange pickup only: item handed over at warehouse). */
export const markExchangeReceived = (assignmentId) =>
  apiConnector("POST", driverEndpoints.EXCHANGE_RECEIVED(assignmentId));

/** POST – get COD payment QR (body not needed). Returns { qrCodeId, imageUrl, amount }. */
export const getCodPaymentQr = (assignmentId) =>
  apiConnector("POST", driverEndpoints.COD_PAYMENT_QR(assignmentId));

/** POST – mark delivered. For COD, body: { paymentCollectedMethod: "CASH" | "ONLINE" }. */
export const markDelivered = (assignmentId, body = {}) =>
  apiConnector("POST", driverEndpoints.DELIVERED(assignmentId), body);
