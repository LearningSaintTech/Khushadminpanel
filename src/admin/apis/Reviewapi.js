import { apiConnector } from "../services/Apiconnector";

const REVIEW_API = {
  GET_ALL_REVIEWS: (itemId) => `/reviews/getAll/${itemId}`,
  ADMIN_STATS: (itemId) => `/reviews/admin/stats/${itemId}`,
  UPDATE: (reviewId) => `/reviews/update/${reviewId}`,
  DELETE: (reviewId) => `/reviews/delete/${reviewId}`,
};

const ITEMS_API = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
};

/** List reviews for a product (paginated). */
export const getReviews = (itemId, page = 1, limit = 50) => {
  if (!itemId) throw new Error("itemId is required");
  const id = typeof itemId === "object" ? itemId.toString() : String(itemId);
  const url = `${REVIEW_API.GET_ALL_REVIEWS(id)}?page=${page}&limit=${limit}`;
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

/** List reviews for a product (paginated). */
export const getReviews = (itemId, page = 1, limit = 50) => {
  if (!itemId) throw new Error("itemId is required");
  const id = typeof itemId === "object" ? itemId.toString() : String(itemId);
  const url = `${REVIEW_API.GET_ALL_REVIEWS(id)}?page=${page}&limit=${limit}`;
  return apiConnector("GET", url);
};

/** Admin: aggregate stats for an item (avg, count, star distribution). */
export const getReviewStats = (itemId) => {
  if (!itemId) throw new Error("itemId is required");
  const id = typeof itemId === "object" ? itemId.toString() : String(itemId);
  return apiConnector("GET", REVIEW_API.ADMIN_STATS(id));
};

/** Update review (multipart). Admin can edit any review. */
export const updateReview = (reviewId, { rating, description, files = [] }) => {
  if (!reviewId) throw new Error("reviewId is required");
  const formData = new FormData();
  if (rating != null && rating !== "") formData.append("rating", String(rating));
  if (description != null) formData.append("description", String(description));
  (Array.isArray(files) ? files : []).forEach((f) => {
    if (f) formData.append("images", f);
  });
  return apiConnector("PATCH", REVIEW_API.UPDATE(reviewId), formData);
};

export const deleteReview = (reviewId) => {
  if (!reviewId) throw new Error("reviewId is required");
  return apiConnector("DELETE", REVIEW_API.DELETE(reviewId));
};

/**
 * Items list for admin (name, productId, itemId, SKUs).
 * Optional search matches name, productId, description, SKU.
 */
export const getItemsWithSkus = (
  page = 1,
  limit = 12,
  search = "",
  skuPage = 1,
  skuLimit = 15
) => {
  let url = `${ITEMS_API.GET_ITEMS_WITH_SKUS}?page=${page}&limit=${limit}&skuPage=${skuPage}&skuLimit=${skuLimit}`;
  if (search && String(search).trim()) {
    url += `&search=${encodeURIComponent(String(search).trim())}`;
  }
  return apiConnector("GET", url);
};
