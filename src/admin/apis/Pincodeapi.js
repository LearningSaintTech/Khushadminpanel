import { apiConnector } from "../services/Apiconnector";

export const pincodeEndpoints = {
  CREATE_PINCODE: "/servicablePincode/create",
  GET_PINCODES: "/servicablePincode/getAll",
  UPDATE_PINCODE: "/servicablePincode/update",
  DELETE_PINCODE: "/servicablePincode/delete",
};

// ✅ Create Pincode
export const createPincode = (data) => {
  return apiConnector(
    "POST",
    pincodeEndpoints.CREATE_PINCODE,
    data
  );
};

// ✅ Get All Pincodes (with pagination and search support)
export const getPincodes = (page = 1, limit = 10, search = "") => {
  let url = `${pincodeEndpoints.GET_PINCODES}?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiConnector("GET", url);
};

// ✅ Update Pincode (send pincode in URL like backend expects)
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
