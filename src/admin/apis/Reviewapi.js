import { apiConnector } from "../services/Apiconnector";

// ===============================
// 🔹 API ENDPOINTS
// ===============================
const REVIEW_API = {
  GET_ALL_REVIEWS: (itemId) => `/reviews/getAll/${itemId}`,
  GET_SINGLE_REVIEW: (reviewId) => `/reviews/getSingle/${reviewId}`,
  DELETE_REVIEW: (reviewId) => `/reviews/delete/${reviewId}`,
  UPDATE_REVIEW: (reviewId) => `/reviews/update/${reviewId}`,
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
// 🔹 GET SINGLE REVIEW
// ===============================
export const getSingleReview = (reviewId) => {
  if (!reviewId) {
    throw new Error("reviewId is required");
  }

  return apiConnector("GET", REVIEW_API.GET_SINGLE_REVIEW(reviewId));
};

// ===============================
// 🔹 DELETE REVIEW
// ===============================
export const deleteReview = (reviewId) => {
  if (!reviewId) {
    throw new Error("reviewId is required");
  }

  return apiConnector("DELETE", REVIEW_API.DELETE_REVIEW(reviewId));
};

// ===============================
// 🔹 UPDATE REVIEW
// ===============================
export const updateReview = (reviewId, data) => {
  if (!reviewId) {
    throw new Error("reviewId is required");
  }

  return apiConnector("PUT", REVIEW_API.UPDATE_REVIEW(reviewId), data);
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