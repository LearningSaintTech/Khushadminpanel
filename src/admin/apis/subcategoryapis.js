// subcategoryapi.js
import { apiConnector } from "../services/Apiconnector";

export const getSubcategoriesByCategory = (
  categoryId,
  page = 1,
  limit = 10,
  search = ""
) => {
  let url = `/subcategories/getAll/${categoryId}?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiConnector("GET", url);
};

export const createSubcategory = (categoryId, formData) => {
    return apiConnector(
      "POST",
      `/subcategories/create/${categoryId}`,
      formData // body
    );
  };
  export const updateSubcategory = (subcategoryId, formData) => {
    console.log("[Subcategory API] PATCH update", subcategoryId);
    if (formData?.entries) {
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}:`, value.name, value.size, "bytes");
        } else {
          console.log(`  ${key}:`, value);
        }
      }
    }
    return apiConnector(
      "PATCH",
      `/subcategories/update/${subcategoryId}`,
      formData // body
    ).then((res) => {
      console.log("[Subcategory API] PATCH response", res);
      return res;
    });
  };
  export const toggleSubcategoryActiveStatus = (subcategoryId) => {
    return apiConnector(
      "PATCH",
      `/subcategories/activeStatus/${subcategoryId}`
    );
  };
  export const toggleSubcategoryNavbarStatus = (subcategoryId) => {
    return apiConnector(
      "PATCH",
      `/subcategories/navbarStatus/${subcategoryId}`
    );
  };

export const getAllSubcategories = (page = 1, limit = 10, search = "") => {
  let url = `/subcategories/getAll?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiConnector("GET", url);
};
