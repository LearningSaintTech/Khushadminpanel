import { apiConnector } from "../services/Apiconnector";

// ===============================
// 🔹 API ENDPOINTS
// ===============================
const REVIEW_API = {
  GET_ALL_REVIEWS: (itemId) => `/reviews/getAll/${itemId}`,
};

const ITEMS_API = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
};

// ===============================
// 🔹 GET REVIEWS
// ===============================
export const getReviews = (itemId, page = 1, limit = 4) => {
  if (!itemId) {
    throw new Error("itemId is required");
  }

  const url = `${REVIEW_API.GET_ALL_REVIEWS(itemId)}?page=${page}&limit=${limit}`;
  return apiConnector("GET", url);
};

// ===============================
// 🔹 GET ITEMS WITH SKUS
// ===============================
export const getItemsWithSkus = (
  page = 1,
  limit = 10,
  skuPage = 1,
  skuLimit = 15
) => {
  const url = `${ITEMS_API.GET_ITEMS_WITH_SKUS}?page=${page}&limit=${limit}&skuPage=${skuPage}&skuLimit=${skuLimit}`;
  return apiConnector("GET", url);
};