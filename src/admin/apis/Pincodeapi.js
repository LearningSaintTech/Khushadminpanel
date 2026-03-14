import { apiConnector } from "../services/Apiconnector";

export const pincodeEndpoints = {
  CREATE_PINCODE: "/servicablePincode/create",
  GET_PINCODES: "/servicablePincode/getAll",
  UPDATE_PINCODE: "/servicablePincode/update",
  DELETE_PINCODE: "/servicablePincode/delete",
  BULK_UPLOAD_PINCODE: "/servicablePincode/bulk-upload",   // ⭐ ADD THIS
};

// ✅ Create Pincode
export const createPincode = (data) => {
  return apiConnector(
    "POST",
    pincodeEndpoints.CREATE_PINCODE,
    data
  );
};

// ✅ Get All Pincodes
export const getPincodes = (page = 1, limit = 10, search = "") => {
  let url = `${pincodeEndpoints.GET_PINCODES}?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiConnector("GET", url);
};

// ✅ Update Pincode
export const updatePincode = (pincode, data) => {
  return apiConnector(
    "PUT",
    `${pincodeEndpoints.UPDATE_PINCODE}/${pincode}`,
    data
  );
};

// ✅ Delete Pincode
export const deletePincode = (pincode) => {
  return apiConnector(
    "DELETE",
    `${pincodeEndpoints.DELETE_PINCODE}/${pincode}`
  );
};

// ✅ Bulk Upload Pincodes ⭐
export const bulkUploadPincodes = (pincodes) => {
  return apiConnector(
    "POST",
    pincodeEndpoints.BULK_UPLOAD_PINCODE,
    { pincodes }
  );
};
