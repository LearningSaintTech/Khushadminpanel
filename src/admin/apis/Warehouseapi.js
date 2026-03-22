import { apiConnector } from "../services/Apiconnector";

export const warehouseEndpoints = {
  // 🔹 Warehouse
  CREATE_WAREHOUSE: "/warehouse/create",
  GET_SINGLE_WAREHOUSE: "/warehouse/getSingle",
  UPDATE_WAREHOUSE: "/warehouse/update",
  TOGGLE_WAREHOUSE_STATUS: "/warehouse/toggle-active",
  DELETE_WAREHOUSE: "/warehouse/delete",
  GET_WAREHOUSE_LIST: "/warehouse/getAll",

  // 🔹 Warehouse Pincodes
  GET_WAREHOUSE_PINCODES: "/warehouse",
  ADD_WAREHOUSE_PINCODES: "/warehouse",
  DELETE_WAREHOUSE_PINCODE: "/warehouse",

  // 🔹 Warehouse Stock
  GET_WAREHOUSE_STOCK: "/warehouse",
  UPDATE_WAREHOUSE_STOCK: "/warehouse",
};


// ================================
// 🏭 Warehouse APIs
// ================================

// ✅ Create Warehouse
export const createWarehouse = (data) => {
  return apiConnector(
    "POST",
    warehouseEndpoints.CREATE_WAREHOUSE,
    data
  );
};

// ✅ Get Single Warehouse
export const getWarehouseById = (id) => {
  return apiConnector(
    "GET",
    `${warehouseEndpoints.GET_SINGLE_WAREHOUSE}/${id}`
  );
};

// ✅ Update Warehouse
export const updateWarehouse = (id, data) => {
  return apiConnector(
    "PUT",
    `${warehouseEndpoints.UPDATE_WAREHOUSE}/${id}`,
    data
  );
};

// ✅ Toggle Warehouse Status
export const toggleWarehouseStatus = (id) => {
  return apiConnector(
    "PATCH",
    `${warehouseEndpoints.TOGGLE_WAREHOUSE_STATUS}/${id}`
  );
};

// ✅ Delete Warehouse
export const deleteWarehouse = (id) => {
  return apiConnector(
    "DELETE",
    `${warehouseEndpoints.DELETE_WAREHOUSE}/${id}`
  );
};

// ✅ Get Warehouse List
export const getWarehouses = (page = 1, limit = 10, search = "") => {
  const queryParams = new URLSearchParams({
    page,
    limit,
    search,
  });

  const endpoint = `${warehouseEndpoints.GET_WAREHOUSE_LIST}?${queryParams.toString()}`;
  console.log("[Warehouseapi] getWarehouses →", { page, limit, search, endpoint });

  // apiConnector returns response body: { success, message, data: { data, pagination } }
  return apiConnector("GET", endpoint).then((res) => {
    const payload = res?.data ?? {};
    const list = payload.data ?? payload.warehouses ?? [];
    const pg = payload.pagination;
    console.log("[Warehouseapi] getWarehouses ←", {
      success: res?.success,
      count: Array.isArray(list) ? list.length : "?",
      pagination: pg,
    });
    return res;
  });
};



// ================================
// 📍 Warehouse Pincode APIs
// ================================

// ✅ Get All Pincodes of Warehouse
export const getWarehousePincodes = (warehouseId) => {
  return apiConnector(
    "GET",
    `${warehouseEndpoints.GET_WAREHOUSE_PINCODES}/${warehouseId}/pincodes`
  );
};

// ✅ Add Pincodes to Warehouse
// (pass array or single pincodeId as per backend)
export const addWarehousePincodes = (warehouseId, data) => {
  return apiConnector(
    "POST",
    `${warehouseEndpoints.ADD_WAREHOUSE_PINCODES}/${warehouseId}/pincodes`,
    data
  );
};

// ✅ Delete Specific Pincode from Warehouse
export const deleteWarehousePincode = (warehouseId, pincodeId) => {
  return apiConnector(
    "DELETE",
    `${warehouseEndpoints.DELETE_WAREHOUSE_PINCODE}/${warehouseId}/pincodes/${pincodeId}`
  );
};



// ================================
// 📦 Warehouse Stock APIs
// ================================

// ✅ Get Warehouse Stock (pagination + server-side filters)
// opts: { itemSearch?: string, skuSearch?: string } — filters by catalog product name and/or SKU
export const getWarehouseStock = (
  warehouseId,
  page = 1,
  limit = 50,
  opts = {}
) => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const itemSearch = (opts.itemSearch || "").trim();
  const skuSearch = (opts.skuSearch || "").trim();
  if (itemSearch) queryParams.set("itemSearch", itemSearch);
  if (skuSearch) queryParams.set("skuSearch", skuSearch);

  const url = `${warehouseEndpoints.GET_WAREHOUSE_STOCK}/${warehouseId}/stock?${queryParams.toString()}`;
  console.log("[Warehouseapi] getWarehouseStock →", {
    warehouseId,
    page,
    limit,
    itemSearch: itemSearch || undefined,
    skuSearch: skuSearch || undefined,
    url,
  });

  return apiConnector("GET", url).then((res) => {
    const payload = res?.data ?? {};
    const rows = payload.data ?? payload.stock ?? [];
    console.log("[Warehouseapi] getWarehouseStock ←", {
      warehouseId,
      success: res?.success,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      pagination: payload.pagination,
    });
    return res;
  });
};

// ✅ Add / Update Stock
// body: { sku: "SKU-0-S", quantity: 3 }
export const updateWarehouseStock = (warehouseId, data) => {
  const path = `${warehouseEndpoints.UPDATE_WAREHOUSE_STOCK}/${warehouseId}/stock`;
  console.log("[Warehouseapi] updateWarehouseStock →", { warehouseId, body: data, path });
  return apiConnector("POST", path, data).then((res) => {
    console.log("[Warehouseapi] updateWarehouseStock ←", {
      warehouseId,
      success: res?.success,
      message: res?.message,
      data: res?.data,
    });
    return res;
  });
};
