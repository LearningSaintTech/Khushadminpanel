import { apiConnector } from "../services/Apiconnector";

const appPopupEndpoints = {
  CREATE: "/app-popup/create",
  GET_ALL: "/app-popup/getAll",
  GET_SINGLE: "/app-popup/getSingle",
  UPDATE: "/app-popup/update",
  DELETE: "/app-popup/delete",
};

export const createAppPopup = (data) => {
  return apiConnector("POST", appPopupEndpoints.CREATE, data);
};

export const getAppPopups = (page = 1, limit = 10, isActive = "") => {
  const params = { page, limit };
  if (isActive !== "") params.isActive = isActive;
  return apiConnector("GET", appPopupEndpoints.GET_ALL, null, {}, params);
};

export const getAppPopupById = (id) => {
  return apiConnector("GET", `${appPopupEndpoints.GET_SINGLE}/${id}`);
};

export const updateAppPopup = (id, data) => {
  return apiConnector("PUT", `${appPopupEndpoints.UPDATE}/${id}`, data);
};

export const deleteAppPopup = (id) => {
  return apiConnector("DELETE", `${appPopupEndpoints.DELETE}/${id}`);
};
