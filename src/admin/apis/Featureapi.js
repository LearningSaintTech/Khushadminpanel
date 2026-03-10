// src/apis/FeatureApi.js

import { apiConnector } from "../services/Apiconnector";

export const featureEndpoints = {
  CREATE_FEATURE: "/features/create",
  GET_FEATURES: "/features/getAll",
  UPDATE_FEATURE: "/features/update",
  DELETE_FEATURE: "/features/delete",
};

// ✅ Create Feature (FormData: featureName, description, icon)
export const createFeature = (data) => {
  return apiConnector(
    "POST",
    featureEndpoints.CREATE_FEATURE,
    data // FormData
  );
};

// ✅ Get All Features (pagination support)
export const getFeatures = (page = 1, limit = 6) => {
  return apiConnector(
    "GET",
    featureEndpoints.GET_FEATURES,
    null,
    {},
    { page, limit } // query params
  );
};

// ✅ Update Feature (id in URL)
// Bannerapi.js
// ✅ Update Feature (id in URL)
export const updateFeature = (id, data) => {
  return apiConnector(
    "PATCH",
    `${featureEndpoints.UPDATE_FEATURE}/${id}`,
    data
  );
};

// ✅ Delete Feature (id in URL)
export const deleteFeature = (id) => {
  return apiConnector(
    "DELETE",
    `${featureEndpoints.DELETE_FEATURE}/${id}`
  );
};
