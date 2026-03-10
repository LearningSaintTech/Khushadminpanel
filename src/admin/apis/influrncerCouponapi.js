import { apiConnector } from "../services/Apiconnector";

// ==========================================
// API ENDPOINTS
// ==========================================

const INFLUENCER_COUPON_API = {
  // Attach / Detach
  ATTACH: "/admin/panels/influencer/coupon/attach",
  DETACH: "/admin/panels/influencer/coupon/detach",

  // Fetch
  GET_ALL: "/admin/panels/influencer/coupon/all",

  // Analytics
  COUPON_ANALYTICS: "/admin/panels/influencer/coupon/analytics",
  INFLUENCER_ANALYTICS:
    "/admin/panels/influencer/coupon/analytics/influencer",

  // History
  INFLUENCER_HISTORY:
    "/admin/panels/influencer/coupon/history/influencer",

COUPON_INFLUENCER_HISTORY:
  "/admin/panels/influencer/coupon/history",
};
// ==========================================
// ATTACH COUPON TO INFLUENCER
// ==========================================

export const attachCouponToInfluencer = (
  couponId,
  influencerId
) => {
  return apiConnector("POST", INFLUENCER_COUPON_API.ATTACH, {
    couponId,
    influencerId,
  });
};

// ==========================================
// DETACH COUPON FROM INFLUENCER
// ==========================================

export const detachCouponFromInfluencer = (
  couponId,
  influencerId
) => {
  return apiConnector(
    "DELETE",
    `${INFLUENCER_COUPON_API.DETACH}/${couponId}/${influencerId}`
  );
};

// ==========================================
// GET ALL COUPONS OF AN INFLUENCER
// ==========================================

export const getInfluencerCoupons = (
  influencerId,
  page = 1,
  limit = 10,
  isActive = "",
  sortBy = "createdAt",
  sortOrder = "desc"
) => {
  let url = `${INFLUENCER_COUPON_API.GET_ALL}/${influencerId}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

  if (isActive !== "") {
    url += `&isActive=${isActive}`;
  }

  return apiConnector("GET", url);
};

// ==========================================
// SINGLE COUPON ANALYTICS
// ==========================================

export const getCouponAnalytics = (couponId) => {
  return apiConnector(
    "GET",
    `${INFLUENCER_COUPON_API.COUPON_ANALYTICS}/${couponId}`
  );
};

// ==========================================
// INFLUENCER ANALYTICS (ALL COUPONS SUMMARY)
// ==========================================

export const getInfluencerAnalytics = (influencerId) => {
  return apiConnector(
    "GET",
    `${INFLUENCER_COUPON_API.INFLUENCER_ANALYTICS}/${influencerId}`
  );
};

// ==========================================
// COUPON + INFLUENCER COMBINED ANALYTICS
// ==========================================

export const getCouponInfluencerAnalytics = (
  couponId,
  influencerId
) => {
  return apiConnector(
    "GET",
    `${INFLUENCER_COUPON_API.COUPON_ANALYTICS}/${couponId}/influencer/${influencerId}`
  );
};

// ==========================================
// INFLUENCER COUPON HISTORY (WITH PAGINATION)
// ==========================================

export const getInfluencerCouponHistory = (
  influencerId,
  page = 1,
  limit = 10
) => {
  return apiConnector(
    "GET",
    `${INFLUENCER_COUPON_API.INFLUENCER_HISTORY}/${influencerId}?page=${page}&limit=${limit}`
  );
};

export const getCouponInfluencerHistoryDetail = (
  couponId,
  influencerId
) => {
  return apiConnector(
    "GET",
    `${INFLUENCER_COUPON_API.COUPON_INFLUENCER_HISTORY}/${couponId}/influencer/${influencerId}`
  );
};