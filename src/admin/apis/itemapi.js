// src/apis/itemApi.js
import { apiConnector } from '../services/Apiconnector';

/** Variant images + size-chart uploads can exceed the default 60s axios timeout */
const ITEM_MULTIPART_TIMEOUT_MS = 300000;

// Internal item endpoints used by this module
const ITEMS_API = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
  BULK_UPLOAD_ITEMS: "/admin/orders/items/bulk-upload",
};

/**
 * Get all items with pagination and search (similar to getAllCategories pattern)
 * Endpoint: GET /api/items/getAll
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {string} [search=""] - search by name / productId
 * @param {string} [categoryId=""] - filter by category
 * @param {string} [subcategoryId=""] - filter by subcategory
 * @returns {Promise<Object>} { success, message, data: { items, pagination } }
 */
export const getAllItems = async (page = 1, limit = 10, search = "", categoryId = "", subcategoryId = "") => {
  let url = `/items/getAll?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  if (categoryId && categoryId.trim()) {
    url += `&categoryId=${encodeURIComponent(categoryId.trim())}`;
  }
  if (subcategoryId && subcategoryId.trim()) {
    url += `&subcategoryId=${encodeURIComponent(subcategoryId.trim())}`;
  }
  return apiConnector("GET", url);
};

/**
 * Search / List items with filters and pagination
 * Endpoint: GET /api/items/search
 *
 * Response shape (typical): { success, message, data: { items: [], pagination? } }
 *
 * @param {Object} query - Query parameters
 * @param {number} [query.page=1]
 * @param {number} [query.limit=10]
 * @param {string} [query.keywords]       - text search: name, descriptions, productId, SKU (preferred)
 * @param {string} [query.search]         - alias for keywords (normalized before request)
 * @param {string} [query.categoryId]
 * @param {string} [query.subcategoryId]
 * @param {string} [query.color]
 * @param {string} [query.size]
 * @param {number} [query.minPrice]
 * @param {number} [query.maxPrice]
 * @returns {Promise<Object>} { success, message, data: { items, pagination } }
 */
export const searchItems = async (query = {}) => {
  const params = { includeInactive: true, ...query };
  const kw = (params.keywords ?? params.search ?? "").toString().trim();
  delete params.search;
  delete params.keywords;
  if (kw) params.keywords = kw;

  try {
    const response = await apiConnector(
      'GET',
      '/items/search',
      null,
      {},
      params
    );
    return response;
  } catch (error) {
    console.error('Error searching items:', error);
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      throw error;
    }
    throw { success: false, message: String(error || 'Failed to search items') };
  }
};

/**
 * Get items belonging to a specific subcategory with pagination and search
 * Endpoint: GET /items/get/subcategory/:subcategoryId
 */
export const getItemsBySubcategory = async (subcategoryId, page = 1, limit = 10, search = "") => {
  if (!subcategoryId) throw new Error('subcategoryId is required');

  try {
    const params = { page, limit };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiConnector(
      'GET',
      `/items/get/subcategory/${subcategoryId}`,
      null,
      {},
      params
    );
    return response;
  } catch (error) {
    console.error('Error fetching subcategory items:', error);
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      throw error;
    }
    throw { success: false, message: String(error || 'Failed to fetch subcategory items') };
  }
};

/**
 * Get single item by ID
 * Endpoint: GET /items/single/:itemId   (confirm this path with backend)
 */
export const getSingleItem = async (itemId) => {
  if (!itemId) throw new Error('itemId is required');

  try {
    const response = await apiConnector(
      'GET',
      `/items/single/${itemId}`
    );
    return response;
  } catch (error) {
    console.error('Error fetching single item:', error);
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      throw error;
    }
    throw { success: false, message: String(error || 'Failed to fetch item details') };
  }
};

/** Admin: all SkuUid documents for an item */
export const getItemSkuUids = async (itemId) => {
  if (!itemId) throw new Error("itemId is required");
  return apiConnector("GET", `/items/sku-uids/${itemId}`);
};

/** Admin: update one SkuUid (code, batchRef, remarks) */
export const updateItemSkuUid = async (itemId, skuUidId, body) => {
  if (!itemId || !skuUidId) throw new Error("itemId and skuUidId are required");
  return apiConnector("PATCH", `/items/sku-uids/${itemId}/${skuUidId}`, body);
};

/**
 * Create a new item (with images)
 * Endpoint: POST /items/create
 * @param {FormData} formData - multipart form data (fields + files)
 */
export const createItem = async (formData) => {
  try {
    console.log("[itemapi] POST /items/create — start");
    if (formData?.entries) {
      const keys = [];
      for (const [key] of formData.entries()) keys.push(key);
      console.log("[itemapi] POST /items/create — FormData keys", [...new Set(keys)]);
    }
    // Do not set Content-Type — browser/axios must add multipart boundary automatically.
    const response = await apiConnector(
      'POST',
      '/items/create',
      formData,
      {},
      {},
      { timeout: ITEM_MULTIPART_TIMEOUT_MS },
    );
    console.log("[itemapi] POST /items/create — success", {
      success: response?.success,
      message: response?.message,
      itemId: response?.data?._id ?? response?.data?.data?._id,
    });
    return response;
  } catch (error) {
    console.error("[itemapi] POST /items/create — error", error);
    // apiConnector rejects with response body object (no err.response)
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      throw error;
    }
    throw { success: false, message: String(error || 'Failed to create item') };
  }
};

/**
 * Update existing item
 * Endpoint: PATCH /items/update/:productId
 * @param {string} productId
 * @param {FormData} formData
 */
export const updateItem = async (productId, formData) => {
  if (!productId) throw new Error('productId is required');

  try {
    const response = await apiConnector(
      'PATCH',
      `/items/update/${productId}`,
      formData,
      {},
      {},
      { timeout: ITEM_MULTIPART_TIMEOUT_MS },
    );
    return response;
  } catch (error) {
    console.error('Error updating item:', error);
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      throw error;
    }
    throw { success: false, message: String(error || 'Failed to update item') };
  }
};

/**
 * Optional: Quick helper to get items for dropdowns / selects
 * (limited results, good for autocomplete / multi-select)
 */
export const getItemsForSelect = async (limit = 50, search = '') => {
  const q = (search || '').trim();
  return searchItems(q ? { limit, keywords: q } : { limit });
};


export const getItemsWithSkus = (
  page = 1,
  limit = 10,
  skuPage = 1,
  skuLimit = 15,
  search = ""
) => {

  const queryParams = new URLSearchParams({
    page,
    limit,
    skuPage,
    skuLimit,
  });

  if (search && search.trim()) {
    queryParams.append("search", search.trim());
  }

  const url = `${ITEMS_API.GET_ITEMS_WITH_SKUS}?${queryParams.toString()}`;

  console.log("📦 Items SKU API:", url);

  return apiConnector("GET", url);
};


/**
 * Bulk upload items with JSON + images
 * Endpoint: POST /api/admin/orders/items/bulk-upload
 *
 * FormData fields:
 * - products: JSON file
 * - images: multiple image files
 */

export const bulkUploadItems = async (formData) => {
  try {
    const response = await apiConnector("POST", ITEMS_API.BULK_UPLOAD_ITEMS, formData);

    return response;
  } catch (error) {
    console.error("Error bulk uploading items:", error);
    throw error?.response?.data || {
      success: false,
      message: "Bulk upload failed",
    };
  }
};

/**
 * Pricing change history for a catalog item
 * GET /api/items/pricing-history/:itemId
 */
export const getItemPricingHistory = async (itemId, page = 1, limit = 50) => {
  if (!itemId) throw { success: false, message: "Item ID is required" };
  const url = `/items/pricing-history/${encodeURIComponent(String(itemId))}?page=${page}&limit=${limit}`;
  console.log("[pricing-history][frontend] getItemPricingHistory", { itemId, page, limit, url });
  try {
    const res = await apiConnector("GET", url);
    console.log("[pricing-history][frontend] getItemPricingHistory OK", {
      itemId,
      keys: res && typeof res === "object" ? Object.keys(res) : typeof res,
      res,
    });
    return res;
  } catch (err) {
    console.error("[pricing-history][frontend] getItemPricingHistory FAIL", {
      itemId,
      url,
      err,
    });
    throw err;
  }
};

/**
 * Pricing audit summary for a catalog item
 * GET /api/items/pricing-audit/:itemId
 */
export const getItemPricingAudit = async (itemId) => {
  if (!itemId) throw { success: false, message: "Item ID is required" };
  const url = `/items/pricing-audit/${encodeURIComponent(String(itemId))}`;
  return apiConnector("GET", url);
};

export default {
  searchItems,
  getItemsBySubcategory,
  getSingleItem,
  getItemSkuUids,
  updateItemSkuUid,
  createItem,
  updateItem,
  getItemsForSelect,
  getItemsWithSkus,
  bulkUploadItems,
  getItemPricingHistory,
  getItemPricingAudit,
};
