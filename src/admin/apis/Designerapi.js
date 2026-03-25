import { apiConnector } from "../services/Apiconnector";

const ADMIN_BASE = "/admin/panels/designer";
const DESIGNER_AUTH_BASE = "/designer/auth";
const DESIGNER_INVENTORY_BASE = "/designer/inventory";

// Admin-side designer management
export const createDesigner = (data) => apiConnector("POST", `${ADMIN_BASE}/create`, data);
export const getDesigners = (page = 1, limit = 10, search = "") => {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search: String(search || ""),
  });
  return apiConnector("GET", `${ADMIN_BASE}/designers/list?${q.toString()}`);
};
export const getDesignerById = (id) => apiConnector("GET", `${ADMIN_BASE}/designers/${id}`);
export const updateDesigner = (id, data) =>
  apiConnector("PUT", `${ADMIN_BASE}/designers/${id}/update`, data);
export const toggleDesignerStatus = (id) =>
  apiConnector("PUT", `${ADMIN_BASE}/designers/${id}/toggle-status`);

// Admin-side designer inventory
export const getDesignerInventory = ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  designerId = "",
  isListed = "",
} = {}) => {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search: String(search) } : {}),
    ...(status ? { status: String(status) } : {}),
    ...(designerId ? { designerId: String(designerId) } : {}),
    ...(isListed !== "" && isListed !== undefined && isListed !== null
      ? { isListed: String(isListed) }
      : {}),
  });
  return apiConnector("GET", `${ADMIN_BASE}/inventory/list?${q.toString()}`);
};
export const getDesignerInventoryById = (id) =>
  apiConnector("GET", `${ADMIN_BASE}/inventory/${id}`);
export const updateDesignerInventory = (id, data) =>
  apiConnector("PUT", `${ADMIN_BASE}/inventory/${id}/update`, data);
export const changeDesignerInventoryStatus = (id, status) =>
  apiConnector("PATCH", `${ADMIN_BASE}/inventory/${id}/status`, { status });
export const patchDesignerInventoryListed = (id, body) =>
  apiConnector("PATCH", `${ADMIN_BASE}/inventory/${id}/listed`, body);
export const exportDesignerInventory = (type = "csv", params = {}) =>
  apiConnector(
    "GET",
    `${ADMIN_BASE}/inventory/export/${type}`,
    null,
    {},
    params,
    { responseType: "blob" }
  );

// Designer panel auth
export const designerLogin = (data) => apiConnector("POST", `${DESIGNER_AUTH_BASE}/login`, data);
export const designerVerifyOtp = (data) =>
  apiConnector("POST", `${DESIGNER_AUTH_BASE}/verify-otp`, data);
export const designerResendOtp = (data) =>
  apiConnector("POST", `${DESIGNER_AUTH_BASE}/resend-otp`, data);
export const designerLogout = () => apiConnector("POST", `${DESIGNER_AUTH_BASE}/logout`);
export const getDesignerProfile = () => apiConnector("GET", `${DESIGNER_AUTH_BASE}/getProfile`);

// Designer panel inventory
export const createDesignerItem = (data) =>
  apiConnector("POST", `${DESIGNER_INVENTORY_BASE}/create`, data);
export const listDesignerItems = (params = {}) => {
  const q = new URLSearchParams(params);
  return apiConnector("GET", `${DESIGNER_INVENTORY_BASE}/list?${q.toString()}`);
};
export const getDesignerItemById = (id) =>
  apiConnector("GET", `${DESIGNER_INVENTORY_BASE}/${id}`);
export const updateDesignerItem = (id, data) =>
  apiConnector("PUT", `${DESIGNER_INVENTORY_BASE}/${id}/update`, data);
export const deleteDesignerItem = (id) =>
  apiConnector("DELETE", `${DESIGNER_INVENTORY_BASE}/${id}/delete`);
export const changeDesignerItemStatus = (id, status) =>
  apiConnector("PATCH", `${DESIGNER_INVENTORY_BASE}/${id}/status`, { status });
export const regenerateDesignerSku = (id) =>
  apiConnector("PATCH", `${DESIGNER_INVENTORY_BASE}/${id}/generate-sku`);

