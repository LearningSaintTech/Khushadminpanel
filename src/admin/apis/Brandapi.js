import { apiConnector } from "../services/Apiconnector";

export const brandEndpoints = {
  CREATE_BRAND: "/brands/create",
  GET_BRANDS: "/brands/getAll",
  UPDATE_BRAND: "/brands/update",
  DELETE_BRAND: "/brands/delete",
};

// ✅ CREATE BRAND (multipart/form-data)
export const createBrand = (data) => {
  return apiConnector(
    "POST",
    brandEndpoints.CREATE_BRAND,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

// ✅ GET BRANDS
export const getBrands = (page = 1, limit = 10) => {
  return apiConnector("GET", brandEndpoints.GET_BRANDS, null, null, { page, limit });
};

// ✅ UPDATE BRAND
export const updateBrand = (id, data) => {
  return apiConnector(
    "PATCH",
    brandEndpoints.UPDATE_BRAND,
    data,
    {
      "Content-Type": "multipart/form-data",
    },
    { brandId: id }
  );
};


// ✅ DELETE BRAND
export const deleteBrand = (id) => {
  return apiConnector(
    "DELETE",
    `${brandEndpoints.DELETE_BRAND}/${id}` // 👈 FIX
  );
};

