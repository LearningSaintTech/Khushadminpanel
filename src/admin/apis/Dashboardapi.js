import { apiConnector } from "../services/Apiconnector";

export const dashboardEndpoints = {
  ITEMS_COUNT: "/admin/dashboard/counts?type=items",
  CATEGORY_COUNT: "/admin/dashboard/counts?type=category",
  SUBCATEGORY_COUNT: "/admin/dashboard/counts?type=subcategory",
  ANALYTICS: "/coupons/analytics", 
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