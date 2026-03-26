import { apiConnector } from "../../admin/services/Apiconnector";

const AUTH = "/designer/auth";
const INVENTORY = "/designer/inventory";

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
    const url = `${INVENTORY}/meta/inventory-codes?${q.toString()}`;
    console.log("[designerApi.getInventoryCodes] request:", { url, params });
    return apiConnector("GET", url);
  },
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

