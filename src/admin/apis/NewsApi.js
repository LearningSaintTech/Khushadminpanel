import { apiConnector } from "../services/Apiconnector";

export const newsEndpoints = {
  CREATE: "/news/create",
  GET_ALL: "/news/getAll",
  GET_ACTIVE: "/news/getActive",
  GET_SINGLE: "/news/getSingle",
  UPDATE: "/news/update",
  DELETE: "/news/delete",
};

/**
 * Public / User endpoint (no auth required)
 * GET /api/news/getActive
 * Returns active news items sorted by sortOrder then newest.
 */
export const getActiveNews = async () => {
  return apiConnector("GET", newsEndpoints.GET_ACTIVE);
};

/**
 * Public / User or Admin endpoint
 * GET /api/news/getSingle/:id
 */
export const getSingleNews = async (id) => {
  return apiConnector("GET", `${newsEndpoints.GET_SINGLE}/${id}`);
};

/**
 * Admin: GET /api/news/getAll?page=1&limit=10&isActive=
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {boolean|string} options.isActive - true, false, or "" for all
 */
export const getAllNews = async ({ page = 1, limit = 10, isActive = "" } = {}) => {
  let url = `${newsEndpoints.GET_ALL}?page=${page}&limit=${limit}`;
  if (isActive !== undefined && isActive !== null && isActive !== "") {
    url += `&isActive=${encodeURIComponent(String(isActive))}`;
  }
  return apiConnector("GET", url);
};

/**
 * Admin: POST /api/news/create (multipart/form-data)
 * Fields:
 * - name: string (required)
 * - logo: File (required)
 * - links: JSON array string of URLs e.g. ["https://instagram.com/khush"] (required)
 * - isActive: boolean (optional, default true)
 * - sortOrder: number (optional, default 0)
 */
export const createNews = async (formData) => {
  return apiConnector("POST", newsEndpoints.CREATE, formData);
};

/**
 * Admin: PUT /api/news/update/:id (multipart/form-data)
 * Fields: only fields that changed
 */
export const updateNews = async (id, formData) => {
  return apiConnector("PUT", `${newsEndpoints.UPDATE}/${id}`, formData);
};

/**
 * Admin: DELETE /api/news/delete/:id
 * Deletes news item and S3 logo
 */
export const deleteNews = async (id) => {
  return apiConnector("DELETE", `${newsEndpoints.DELETE}/${id}`);
};
