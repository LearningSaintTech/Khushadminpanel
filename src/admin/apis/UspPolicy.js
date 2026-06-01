import { apiConnector } from "../services/Apiconnector";

export const policyEndpoints = {
  CREATE_POLICY: "/policies/create",
  GET_POLICIES: "/policies/admin/getAll",
  UPDATE_POLICY: "/policies/update",
  DELETE_POLICY: "/policies/delete",
};

// ✅ CREATE POLICY (multipart/form-data)
export const createPolicy = (data) => {
  return apiConnector(
    "POST",
    policyEndpoints.CREATE_POLICY,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

// ✅ GET ALL POLICIES
export const getPolicies = (page = 1, limit = 20) => {
  return apiConnector(
    "GET",
    policyEndpoints.GET_POLICIES,
    null,
    null,
    { page, limit }
  );
};

// ✅ UPDATE POLICY
export const updatePolicy = (id, data) => {
  return apiConnector(
    "PUT",
    `${policyEndpoints.UPDATE_POLICY}/${id}`,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

// ✅ DELETE POLICY
export const deletePolicy = (id) => {
  return apiConnector(
    "DELETE",
    `${policyEndpoints.DELETE_POLICY}/${id}`
  );
};