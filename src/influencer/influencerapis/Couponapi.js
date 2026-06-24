import { apiConnector } from "../../admin/services/Apiconnector";
import logger from "../../utils/logger.js";

const couponLog = logger.child("influencer-coupon");

const COUPON_ENDPOINTS = {
  GET_ALL: "/influencer/coupon/all",
  GET_BY_ID: (couponId) => `/influencer/coupon/${couponId}`,
  ANALYTICS_ALL: "/influencer/coupon/analytics",
  ANALYTICS_BY_ID: (couponId) => `/influencer/coupon/${couponId}/analytics`,
  HISTORY: "/influencer/coupon/history",
};

function handleResponse(response) {
  const data = response?.data ?? response;
  if (!data) throw new Error("No response from server");
  if (data?.success === false) {
    throw new Error(data?.message || "Something went wrong");
  }
  return data;
}

function toApiError(error, fallback) {
  return new Error(error?.message || error?.response?.data?.message || fallback);
}

export const getAllCoupons = async (page = 1, limit = 10) => {
  try {
    const res = await apiConnector(
      "GET",
      `${COUPON_ENDPOINTS.GET_ALL}?page=${page}&limit=${limit}`
    );
    return handleResponse(res);
  } catch (error) {
    couponLog.debug("getAllCoupons failed", { message: error?.message });
    throw toApiError(error, "Failed to fetch coupons");
  }
};

export const getCouponById = async (couponId) => {
  try {
    if (!couponId) throw new Error("Coupon ID required");
    const res = await apiConnector("GET", COUPON_ENDPOINTS.GET_BY_ID(couponId));
    return handleResponse(res);
  } catch (error) {
    couponLog.debug("getCouponById failed", { message: error?.message });
    throw toApiError(error, "Failed to fetch coupon");
  }
};

export const getCouponAnalytics = async () => {
  try {
    const res = await apiConnector("GET", COUPON_ENDPOINTS.ANALYTICS_ALL);
    return handleResponse(res);
  } catch (error) {
    couponLog.debug("getCouponAnalytics failed", { message: error?.message });
    throw toApiError(error, "Failed to fetch analytics");
  }
};

export const getCouponAnalyticsById = async (couponId) => {
  try {
    if (!couponId) throw new Error("Coupon ID required");
    const res = await apiConnector("GET", COUPON_ENDPOINTS.ANALYTICS_BY_ID(couponId));
    return handleResponse(res);
  } catch (error) {
    couponLog.debug("getCouponAnalyticsById failed", { message: error?.message });
    throw toApiError(error, "Failed to fetch analytics");
  }
};

export const getCouponHistory = async (page = 1, limit = 10, couponId = null) => {
  try {
    const res = await apiConnector(
      "GET",
      `${COUPON_ENDPOINTS.HISTORY}?page=${page}&limit=${limit}`
    );
    const data = handleResponse(res);
    if (couponId && data?.data?.history) {
      data.data.history = data.data.history.filter((h) => h.couponId === couponId);
    }
    return data;
  } catch (error) {
    couponLog.debug("getCouponHistory failed", { message: error?.message });
    throw toApiError(error, "Failed to fetch coupon history");
  }
};
