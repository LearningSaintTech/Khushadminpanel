import { apiConnector } from "../services/Apiconnector";

// API endpoints
const COUPON_API = {
  CREATE: "/coupons/create",
  UPDATE: "/coupons/update",               // /coupon/update/:id
  GET_ALL: "/coupons/getAll",
  GET_SINGLE: "/coupons/getSingle",        // /coupon/getSingle/:id
  // DELETE: "/coupons/delete",               // if exists
    TOGGLE_STATUS: "/coupons/toggleActiveStatus",
     ANALYTICS: "/coupons/analytics", 
};

// ✅ Create Coupon
export const createCoupon = (data) => {
  return apiConnector("POST", COUPON_API.CREATE, data);
};

// ✅ Get All Coupons (with search + influencer filter support)
// isInfluencer can be:
// - "true"  → only influencer coupons
// - "false" → only non-influencer coupons
// - undefined/null → backend default (currently non-influencer)
export const getCoupons = (page = 1, limit = 10, search = "", isInfluencer) => {
  let url = `${COUPON_API.GET_ALL}?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  if (typeof isInfluencer === "string" && isInfluencer.length) {
    url += `&isInfluencer=${encodeURIComponent(isInfluencer)}`;
  }
  return apiConnector("GET", url);
};

// ✅ Get Single Coupon by ID
export const getCouponById = (id) => {
  return apiConnector("GET", `${COUPON_API.GET_SINGLE}/${id}`);
};

// ✅ Update Coupon
export const updateCoupon = (id, data) => {
  return apiConnector("PUT", `${COUPON_API.UPDATE}/${id}`, data);
};

// ✅ Toggle Active Status
export const toggleCouponStatus = (id) => {
  return apiConnector("PATCH", `${COUPON_API.TOGGLE_STATUS}/${id}`);
};

// ✅ Get Coupon Analytics (global or single coupon if couponId passed)
export const getCouponAnalytics = (couponId) => {
  let url = COUPON_API.ANALYTICS;
  if (couponId) {
    url += `?couponId=${encodeURIComponent(couponId)}`;
  }
  return apiConnector("GET", url);
};
// ✅ Delete Coupon (if API exists)
// export const deleteCoupon = (id) => {
//   return apiConnector("DELETE", `/coupon/delete/${id}`);
// };
