import { apiConnector } from "../../admin/services/Apiconnector";

// ======================================================
// 🔹 COUPON ENDPOINTS
// ======================================================
const COUPON_ENDPOINTS = {
  GET_ALL: "/influencer/coupon/all",
  GET_BY_ID: (couponId) => `/influencer/coupon/${couponId}`,

  ANALYTICS_ALL: "/influencer/coupon/analytics",
  ANALYTICS_BY_ID: (couponId) =>
    `/influencer/coupon/${couponId}/analytics`,

  // Backend gives history of ALL coupons
  HISTORY: "/influencer/coupon/history",
};

// ======================================================
// 🔹 COMMON ERROR HANDLER
// ======================================================
const handleResponse = (response, label) => {
  const data = response?.data;

  console.log(`${label}:`, data);

  if (!data) throw new Error("No response from server");

  if (data?.success === false) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
};

// ======================================================
// 🔹 GET ALL COUPONS
// ======================================================
export const getAllCoupons = async (page = 1, limit = 10) => {
  try {
    const res = await apiConnector(
      "GET",
      `${COUPON_ENDPOINTS.GET_ALL}?page=${page}&limit=${limit}`
    );

    return handleResponse(res, "GET ALL COUPONS");
  } catch (error) {
    console.error("GET ALL COUPONS ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch coupons"
    );
  }
};

// ======================================================
// 🔹 GET SINGLE COUPON
// ======================================================
export const getCouponById = async (couponId) => {
  try {
    if (!couponId) throw new Error("Coupon ID required");

    const res = await apiConnector(
      "GET",
      COUPON_ENDPOINTS.GET_BY_ID(couponId)
    );

    return handleResponse(res, "GET COUPON BY ID");
  } catch (error) {
    console.error("GET COUPON ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch coupon"
    );
  }
};

// ======================================================
// 🔹 GET ALL ANALYTICS
// ======================================================
export const getCouponAnalytics = async () => {
  try {
    const res = await apiConnector(
      "GET",
      COUPON_ENDPOINTS.ANALYTICS_ALL
    );

    return handleResponse(res, "COUPON ANALYTICS");
  } catch (error) {
    console.error("COUPON ANALYTICS ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch analytics"
    );
  }
};

// ======================================================
// 🔹 GET SINGLE ANALYTICS
// ======================================================
export const getCouponAnalyticsById = async (couponId) => {
  try {
    if (!couponId) throw new Error("Coupon ID required");

    const res = await apiConnector(
      "GET",
      COUPON_ENDPOINTS.ANALYTICS_BY_ID(couponId)
    );

    return handleResponse(res, "COUPON ANALYTICS BY ID");
  } catch (error) {
    console.error("COUPON ANALYTICS BY ID ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch analytics"
    );
  }
};

// ======================================================
// 🔹 GET COUPON HISTORY
// ======================================================
// Backend gives history of ALL coupons
// Optional couponId filter done in frontend
export const getCouponHistory = async (
  page = 1,
  limit = 10,
  couponId = null
) => {
  try {
    const res = await apiConnector(
      "GET",
      `${COUPON_ENDPOINTS.HISTORY}?page=${page}&limit=${limit}`
    );

    const data = handleResponse(res, "COUPON HISTORY");

    // Optional filtering by couponId
    if (couponId && data?.data?.history) {
      data.data.history = data.data.history.filter(
        (h) => h.couponId === couponId
      );
    }

    return data;
  } catch (error) {
    console.error("COUPON HISTORY ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to fetch coupon history"
    );
  }
};