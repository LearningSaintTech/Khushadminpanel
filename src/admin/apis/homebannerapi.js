// src/admin/services/bannerApi.js
import { apiConnector } from "../services/Apiconnector";

// API Endpoints
const BANNER_API = {
  CREATE: "/banner/create",
  UPDATE: "/banner/update",
  GET_ALL: "/banner/getAll",
  GET_SINGLE: "/banner/getSingle",
  DELETE: "/banner/delete",
};

/**
 * Create a Banner
 * @param {FormData} data
 * @returns {Promise<Object>}
 */
export const createBanner = async (data) => {
  return await apiConnector("POST", BANNER_API.CREATE, data);
};

/**
 * Update a Banner by ID
 * @param {string} bannerId
 * @param {FormData} data
 * @returns {Promise<Object>}
 */
export const updateBanner = async (bannerId, data) => {
  return await apiConnector("PUT", `${BANNER_API.UPDATE}/${bannerId}`, data);
};

/**
 * Get all Banners
 * @returns {Promise<Object>}
 */
export const getAllBanners = async () => {
  return await apiConnector("GET", BANNER_API.GET_ALL);
};

/**
 * Get a single Banner by ID
 * @param {string} bannerId
 * @returns {Promise<Object>}
 */
export const getSingleBanner = async (bannerId) => {
  return await apiConnector("GET", `${BANNER_API.GET_SINGLE}/${bannerId}`);
};

/**
 * Delete a Banner by ID
 * @param {string} bannerId
 * @returns {Promise<Object>}
 */
export const deleteBanner = async (bannerId) => {
  return await apiConnector("DELETE", `${BANNER_API.DELETE}/${bannerId}`);
};
