import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/users";

export const listUsers = (params = {}) =>
  apiConnector("GET", BASE, null, {}, params);

export const getActiveUsers = (params = {}) =>
  apiConnector("GET", `${BASE}/active`, null, {}, params);

export const getUserById = (id) => apiConnector("GET", `${BASE}/${id}`);

export const createUser = (body) => apiConnector("POST", BASE, body);

export const updateUser = (id, body) => apiConnector("PATCH", `${BASE}/${id}`, body);

export const deleteUser = (id) => apiConnector("DELETE", `${BASE}/${id}`);
