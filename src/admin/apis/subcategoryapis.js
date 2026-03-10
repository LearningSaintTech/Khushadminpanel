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
    return apiConnector(
      "PATCH",
      `/subcategories/update/${subcategoryId}`,
      formData // body
    );
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
