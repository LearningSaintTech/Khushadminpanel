import { apiConnector } from "../services/Apiconnector";

// ✅ Status Endpoints
const statusEndpoints = {
  CREATE_STATUS: "/admin/statuses/create",
  GET_STATUSES: "/admin/statuses/all",
  GET_SINGLE_STATUS: (id) => `/admin/statuses/getSingle/${id}`,
  UPDATE_STATUS: (id) => `/admin/statuses/update/${id}`,
  DELETE_STATUS: (id) => `/admin/statuses/delete/${id}`, // if backend supports
};


// ✅ Create Status
export const createStatus = (data) => {
  return apiConnector("POST", statusEndpoints.CREATE_STATUS, data);
};


// ✅ Get All Statuses
export const getStatuses = () => {
  return apiConnector("GET", statusEndpoints.GET_STATUSES);
};


// ✅ Get Single Status
export const getSingleStatus = (id) => {
  return apiConnector("GET", statusEndpoints.GET_SINGLE_STATUS(id));
};


// ✅ Update Status
export const updateStatus = (id, data) => {
  return apiConnector("PUT", statusEndpoints.UPDATE_STATUS(id), data);
};


// ✅ Delete Status
export const deleteStatus = (id) => {
  return apiConnector("DELETE", statusEndpoints.DELETE_STATUS(id));
};