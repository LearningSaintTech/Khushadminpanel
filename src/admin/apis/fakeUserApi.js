import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/fake-users";

export const listFakeUsers = (params = {}) =>
  apiConnector("GET", BASE, null, {}, params);

export const getFakeUserById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const createFakeUser = (body) => apiConnector("POST", BASE, body);

export const updateFakeUser = (id, body) =>
  apiConnector("PATCH", `${BASE}/${id}`, body);

export const deleteFakeUser = (id) => apiConnector("DELETE", `${BASE}/${id}`);

export const importFakeUsersFromJson = (body = {}) =>
  apiConnector("POST", `${BASE}/import-from-json`, body);
