import { apiConnector } from "../../admin/services/Apiconnector";

const AUTH = "/designer/auth";
const INVENTORY = "/designer/inventory";
const SIZE_CHART = "/designer/size-chart";
const LISTING_TEMPLATE = "/designer/listing-template";

/**
 * Designer inventory API. Create/update bodies are usually `FormData` with at least:
 * `productTypeCode` (CATEGORY code from inventory meta), optional `productType` (name; server can resolve from code),
 * `fitType`, variants, fabric, optional `metaTitle`, `metaDescription`, `metaTags` (string or JSON array string), etc.
 */
export const designerApi = {
  login: (data) => apiConnector("POST", `${AUTH}/login`, data),
  verifyOtp: (data) => apiConnector("POST", `${AUTH}/verify-otp`, data),
  resendOtp: (data) => apiConnector("POST", `${AUTH}/resend-otp`, data),
  logout: () => apiConnector("POST", `${AUTH}/logout`),
  getProfile: () => apiConnector("GET", `${AUTH}/getProfile`),
  /** Pass plain object (JSON) or FormData (e.g. with profileImage file). */
  updateProfile: (data) => apiConnector("PUT", `${AUTH}/update-profile`, data),

  listInventory: (params = {}) => {
    const q = new URLSearchParams(params);
    return apiConnector("GET", `${INVENTORY}/list?${q.toString()}`);
  },
  getItem: (id) => apiConnector("GET", `${INVENTORY}/${id}`),
  createItem: (data) => apiConnector("POST", `${INVENTORY}/create`, data),
  updateItem: (id, data) => apiConnector("PUT", `${INVENTORY}/${id}/update`, data),
  deleteItem: (id) => apiConnector("DELETE", `${INVENTORY}/${id}/delete`),
  changeStatus: (id, status) => apiConnector("PATCH", `${INVENTORY}/${id}/status`, { status }),
  regenerateSku: (id) => apiConnector("PATCH", `${INVENTORY}/${id}/generate-sku`),
  getInventoryCodes: (params = {}) => {
    const q = new URLSearchParams(params);
    return apiConnector("GET", `${INVENTORY}/meta/inventory-codes?${q.toString()}`);
  },
  listSizeCharts: (params = {}) => {
    const q = new URLSearchParams(params);
    return apiConnector("GET", `${SIZE_CHART}/list?${q.toString()}`);
  },
  getSizeChart: (id) => apiConnector("GET", `${SIZE_CHART}/${id}`),
  createSizeChart: (data) => apiConnector("POST", `${SIZE_CHART}/create`, data),
  updateSizeChart: (id, data) => apiConnector("PATCH", `${SIZE_CHART}/${id}/update`, data),
  deleteSizeChart: (id) => apiConnector("DELETE", `${SIZE_CHART}/${id}/delete`),

  listListingTemplates: (params = {}) => {
    const q = new URLSearchParams(params);
    return apiConnector("GET", `${LISTING_TEMPLATE}/list?${q.toString()}`);
  },
  getListingTemplate: (id) => apiConnector("GET", `${LISTING_TEMPLATE}/${id}`),
  createListingTemplate: (data) => apiConnector("POST", `${LISTING_TEMPLATE}/create`, data),
  updateListingTemplate: (id, data) =>
    apiConnector("PATCH", `${LISTING_TEMPLATE}/${id}/update`, data),
  deleteListingTemplate: (id) => apiConnector("DELETE", `${LISTING_TEMPLATE}/${id}/delete`),
};

// Named exports for direct imports in designer components
export const listDesignerItems = (params = {}) => designerApi.listInventory(params);
export const getDesignerItemById = (id) => designerApi.getItem(id);
export const createDesignerItem = (data) => designerApi.createItem(data);
export const updateDesignerItem = (id, data) => designerApi.updateItem(id, data);
export const deleteDesignerItem = (id) => designerApi.deleteItem(id);
export const changeDesignerItemStatus = (id, status) => designerApi.changeStatus(id, status);
export const regenerateDesignerSku = (id) => designerApi.regenerateSku(id);
export const getDesignerInventoryCodes = (params = {}) => designerApi.getInventoryCodes(params);
export const updateDesignerProfile = (data) => designerApi.updateProfile(data);
export const listDesignerSizeCharts = (params = {}) => designerApi.listSizeCharts(params);
export const getDesignerSizeChartById = (id) => designerApi.getSizeChart(id);
export const createDesignerSizeChart = (data) => designerApi.createSizeChart(data);
export const updateDesignerSizeChart = (id, data) => designerApi.updateSizeChart(id, data);
export const deleteDesignerSizeChart = (id) => designerApi.deleteSizeChart(id);
export const listDesignerListingTemplates = (params = {}) =>
  designerApi.listListingTemplates(params);
export const getDesignerListingTemplateById = (id) => designerApi.getListingTemplate(id);
export const createDesignerListingTemplate = (data) => designerApi.createListingTemplate(data);
export const updateDesignerListingTemplate = (id, data) =>
  designerApi.updateListingTemplate(id, data);
export const deleteDesignerListingTemplate = (id) => designerApi.deleteListingTemplate(id);

