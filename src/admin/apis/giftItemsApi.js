import { apiConnector } from "../services/Apiconnector";

const giftItemsEndpoints = {
  CREATE: "/gift-items/create",
  GET_ALL: "/gift-items/getAll",
  GET_ACTIVE: "/gift-items/getActive",
  GET_SINGLE: "/gift-items/getSingle",
  UPDATE: "/gift-items/update",
  DELETE: "/gift-items/delete",
};

export const createGiftItem = (data) => {
  return apiConnector("POST", giftItemsEndpoints.CREATE, data);
};

export const getGiftItems = (page = 1, limit = 10, isActive = "") => {
  const params = { page, limit };
  if (isActive !== "") params.isActive = isActive;
  return apiConnector("GET", giftItemsEndpoints.GET_ALL, null, {}, params);
};

export const getActiveGiftItems = () => {
  return apiConnector("GET", giftItemsEndpoints.GET_ACTIVE);
};

export const getGiftItemById = (id) => {
  return apiConnector("GET", `${giftItemsEndpoints.GET_SINGLE}/${id}`);
};

export const updateGiftItem = (id, data) => {
  return apiConnector("PUT", `${giftItemsEndpoints.UPDATE}/${id}`, data);
};

export const deleteGiftItem = (id) => {
  return apiConnector("DELETE", `${giftItemsEndpoints.DELETE}/${id}`);
};
