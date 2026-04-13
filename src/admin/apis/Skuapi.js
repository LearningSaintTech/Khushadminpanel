import { apiConnector } from "../services/Apiconnector";

export const skuEndpoints = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
  UPDATE_ITEM: "/items/update",
  SET_ALL_CENTRAL_STOCK: "/admin/inventory/set-all-central-stock",
};

/** Tried in order until one responds (not 404). Matches KhushBackend route variants. */
export const SET_ALL_CENTRAL_STOCK_URLS = [
  "/admin/inventory/set-all-central-stock",
  "/admin/inventory/stock/set-all-central-stock",
  "/items/admin/set-all-central-stock",
];

// ✅ Get Items with SKUs (items pagination + sku pagination + search)
export const getItemsWithSkus = (
  page = 1,
  limit = 10,
  skuPage = 1,
  skuLimit = 5,
  search = ""
) => {

  const queryParams = new URLSearchParams({
    page,
    limit,
    skuPage,
    skuLimit,
  });

  if (search) {
    queryParams.append("search", search);
  }

  return apiConnector(
    "GET",
    `${skuEndpoints.GET_ITEMS_WITH_SKUS}?${queryParams.toString()}`
  );
};


// ✅ Update SKU Stock
export const updateItem = (itemId, data) => {
  return apiConnector(
    "PATCH",
    `${skuEndpoints.UPDATE_ITEM}/${itemId}`,
    data
  );
};

function isSetAllCentralStockNotFoundError(err) {
  const status = err?.status;
  if (status === 404) return true;
  const msg = String(err?.message || "");
  return /cannot post|status code 404|\b404\b/i.test(msg);
}

/** Admin: bulk-set central stock on every SKU line in the catalog (server Mongo bulkWrite). */
export async function setAllCentralStockUniform(body) {
  const requestConfig = { timeout: 300000 };
  let lastErr = null;
  const urls = SET_ALL_CENTRAL_STOCK_URLS;
  for (let i = 0; i < urls.length; i += 1) {
    const path = urls[i];
    try {
      return await apiConnector(
        "POST",
        path,
        body,
        {},
        {},
        requestConfig
      );
    } catch (err) {
      lastErr = err;
      const tryNext = i < urls.length - 1 && isSetAllCentralStockNotFoundError(err);
      if (!tryNext) throw err;
    }
  }
  throw lastErr ?? new Error("Fast catalog stock: no endpoint matched");
}