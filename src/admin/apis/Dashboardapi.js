import { apiConnector } from "../services/Apiconnector";

export const dashboardEndpoints = {
  ITEMS_COUNT: "/admin/dashboard/counts?type=items",
  CATEGORY_COUNT: "/admin/dashboard/counts?type=category",
  SUBCATEGORY_COUNT: "/admin/dashboard/counts?type=subcategory",
  ORDERS_COUNT: "/admin/dashboard/counts?type=orders",
  ANALYTICS: "/coupons/analytics",
  ACTIVE_USERS: "/admin/users/active",
};

// ✅ Fetch Items Count
export const getItemsCount = () => {
  return apiConnector("GET", dashboardEndpoints.ITEMS_COUNT);
};

// ✅ Fetch Category Count
export const getCategoryCount = () => {
  return apiConnector("GET", dashboardEndpoints.CATEGORY_COUNT);
};

// ✅ Fetch Subcategory Count
export const getSubcategoryCount = () => {
  return apiConnector("GET", dashboardEndpoints.SUBCATEGORY_COUNT);
};

export const getCouponAnalytics = () => {
  return apiConnector("GET", dashboardEndpoints.ANALYTICS);
};

export const getOrdersCount = () => {
  return apiConnector("GET", dashboardEndpoints.ORDERS_COUNT);
};

export const getActiveUsers = (params = {}) => {
  return apiConnector("GET", dashboardEndpoints.ACTIVE_USERS, null, {}, params);
};