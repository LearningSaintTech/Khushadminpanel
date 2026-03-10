// src/apis/itemApi.js
import { apiConnector } from '../services/Apiconnector';

// Internal item endpoints used by this module
const ITEMS_API = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
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
 * @param {Object} query - Query parameters
 * @param {number} [query.page=1]
 * @param {number} [query.limit=10]
 * @param {string} [query.search]           - search by name / productId
 * @param {string} [query.categoryId]
 * @param {string} [query.subcategoryId]
 * @param {string} [query.color]
 * @param {string} [query.size]
 * @param {number} [query.minPrice]
 * @param {number} [query.maxPrice]
 * @returns {Promise<Object>} { success, message, data: { items, pagination } }
 */
export const searchItems = async (query = {}) => {
  try {
    const response = await apiConnector(
      'GET',
      '/items/search',
      null,
      {},
      query // passed as query params
    );
    return response;
  } catch (error) {
    console.error('Error searching items:', error);
    throw error?.response?.data || { success: false, message: 'Failed to search items' };
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
    throw error?.response?.data || { success: false, message: 'Failed to fetch subcategory items' };
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
    throw error?.response?.data || { success: false, message: 'Failed to fetch item details' };
  }
};

/**
 * Create a new item (with images)
 * Endpoint: POST /items/create
 * @param {FormData} formData - multipart form data (fields + files)
 */
export const createItem = async (formData) => {
  try {
    const response = await apiConnector(
      'POST',
      '/items/create',
      formData,
      {
        'Content-Type': 'multipart/form-data',
      }
    );
    return response;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error?.response?.data || { success: false, message: 'Failed to create item' };
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
      {
        'Content-Type': 'multipart/form-data',
      }
    );
    return response;
  } catch (error) {
    console.error('Error updating item:', error);
    throw error?.response?.data || { success: false, message: 'Failed to update item' };
  }
};

/**
 * Optional: Quick helper to get items for dropdowns / selects
 * (limited results, good for autocomplete / multi-select)
 */
export const getItemsForSelect = async (limit = 50, search = '') => {
  return searchItems({ limit, search });
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

export default {
  searchItems,
  getItemsBySubcategory,
  getSingleItem,
  createItem,
  updateItem,
  getItemsForSelect,
  getItemsWithSkus,
};