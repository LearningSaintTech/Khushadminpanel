import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/inventory-codes";

export const inventoryCodeEndpoints = {
  CREATE: `${BASE}/create`,
  UPDATE: `${BASE}/update`,
  GET_ALL: `${BASE}/getAll`,
  GET_SINGLE: `${BASE}/getSingle`,
  DELETE: `${BASE}/delete`,
  SKU_FORMULA_BASE: `${BASE}/sku-formula-configs`,
};

export const createInventoryCode = (data) =>
  apiConnector("POST", inventoryCodeEndpoints.CREATE, data);

export const updateInventoryCode = (id, data) =>
  apiConnector("PATCH", `${inventoryCodeEndpoints.UPDATE}/${id}`, data);

export const getAllInventoryCodes = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.type) q.set("type", params.type);
  if (params.search != null && String(params.search).trim() !== "") {
    q.set("search", String(params.search).trim());
  }
  if (params.isActive === true || params.isActive === false) {
    q.set("isActive", params.isActive ? "true" : "false");
  }
  const qs = q.toString();
  return apiConnector(
    "GET",
    qs ? `${inventoryCodeEndpoints.GET_ALL}?${qs}` : inventoryCodeEndpoints.GET_ALL
  );
};

export const getSingleInventoryCode = (id) =>
  apiConnector("GET", `${inventoryCodeEndpoints.GET_SINGLE}/${id}`);

export const deleteInventoryCode = (id) =>
  apiConnector("DELETE", `${inventoryCodeEndpoints.DELETE}/${id}`);

export const INVENTORY_CODE_TYPES = ["CATEGORY", "FIT", "COLOR", "SECTION"];

const SF = inventoryCodeEndpoints.SKU_FORMULA_BASE;

export const getAllSkuFormulaConfigs = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiConnector("GET", qs ? `${SF}/getAll?${qs}` : `${SF}/getAll`);
};

export const getActiveSkuFormulaConfig = () =>
  apiConnector("GET", `${SF}/getActive`);

export const getSingleSkuFormulaConfig = (id) =>
  apiConnector("GET", `${SF}/getSingle/${id}`);

export const createSkuFormulaConfig = (data) =>
  apiConnector("POST", `${SF}/create`, data);

export const updateSkuFormulaConfig = (id, data) =>
  apiConnector("PATCH", `${SF}/update/${id}`, data);

export const deleteSkuFormulaConfig = (id) =>
  apiConnector("DELETE", `${SF}/delete/${id}`);

export const setActiveSkuFormulaConfig = (id) =>
  apiConnector("PATCH", `${SF}/setActive/${id}`);
