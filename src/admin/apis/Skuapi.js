import { apiConnector } from "../services/Apiconnector";

export const skuEndpoints = {
  GET_ITEMS_WITH_SKUS: "/items/skus",
  UPDATE_ITEM: "/items/update",
};

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