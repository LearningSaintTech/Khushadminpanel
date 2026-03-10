import { apiConnector } from "../services/Apiconnector";

// API endpoints
const FILTER_API = {
  CREATE_FILTER: "/filters/create",
  TOGGLE_STATUS: "/items/toggleactiveStatus",
};

// Create Filter API
export const createFilter = (data) => {
  return apiConnector("POST", FILTER_API.CREATE_FILTER, data);
};

// Get Filters with pagination and search support
export const getFilters = (page = 1, limit = 10, search = "") => {
  let url = `/filters/all?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiConnector("GET", url);
};

export const deleteFilter = (id) => {
  return apiConnector("DELETE", `/filters/${id}`);
};
export const updateFilter = (id, data) => {
    return apiConnector("PUT", `/filters/${id}`, data);
}
export const toggleFilterStatus = (id) => {
  return apiConnector("PATCH", `/filters/${id}/toggle-active`);
};
export const getFilterById = (id) => {
  return apiConnector("GET", `/filters/${id}`);
};