// src/apis/cancellationApi.js

import { apiConnector } from "../services/Apiconnector";

export const cancellationEndpoints = {
  CREATE_CANCELLATION: "/admin/cancellation-policies/create",
  UPDATE_CANCELLATION: "/admin/cancellation-policies/update",
  GET_ALL_CANCELLATION: "/admin/cancellation-policies/getAll",
  GET_SINGLE_CANCELLATION: "/admin/cancellation-policies/getSingle",
  DELETE_CANCELLATION: "/admin/cancellation-policies/delete",
  DELETE_REASON: "/admin/cancellation-policies/deleteReason",
  TOGGLE_ACTIVE: "/admin/cancellation-policies/toggleActive",
};


// Create Cancellation Policy
export const createCancellation = (data) =>
  apiConnector("POST", cancellationEndpoints.CREATE_CANCELLATION, data);


// Update Cancellation Policy
export const updateCancellation = (id, data) =>
  apiConnector(
    "PATCH",
    `${cancellationEndpoints.UPDATE_CANCELLATION}/${id}`,
    data
  );


// Get All Cancellation Policies
export const getAllCancellation = (page = 1, limit = 10) =>
  apiConnector(
    "GET",
    `${cancellationEndpoints.GET_ALL_CANCELLATION}?page=${page}&limit=${limit}`
  );


// Get Single Cancellation Policy
export const getSingleCancellation = (id) =>
  apiConnector(
    "GET",
    `${cancellationEndpoints.GET_SINGLE_CANCELLATION}/${id}`
  );


// Delete Cancellation Policy
export const deleteCancellation = (id) =>
  apiConnector(
    "DELETE",
    `${cancellationEndpoints.DELETE_CANCELLATION}/${id}`
  );


// Delete Cancellation Reason
export const deleteCancellationReason = (id) =>
  apiConnector(
    "DELETE",
    `${cancellationEndpoints.DELETE_REASON}/${id}`
  );


// Toggle Active / Inactive
export const toggleCancellationActive = (id) =>
  apiConnector(
    "PATCH",
    `${cancellationEndpoints.TOGGLE_ACTIVE}/${id}`
  );