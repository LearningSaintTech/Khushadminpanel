import { apiConnector } from "../services/Apiconnector";

export const blogCategoryEndpoints = {
  CREATE: "/blog/categories/create",
  GET_ALL_ADMIN: "/blog/categories/admin/getAll",
  GET_SINGLE_ADMIN: "/blog/categories/admin/getSingle",
  UPDATE: "/blog/categories/update",
  DELETE: "/blog/categories/delete",
  TOGGLE_STATUS: "/blog/categories/toggle-status",
};

export const createBlogCategory = (data) =>
  apiConnector("POST", blogCategoryEndpoints.CREATE, data);

export const getAllBlogCategories = (page = 1, limit = 50, search = "", isActive = "") => {
  let url = `${blogCategoryEndpoints.GET_ALL_ADMIN}?page=${page}&limit=${limit}`;
  if (search?.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  if (isActive !== "" && isActive !== null && typeof isActive !== "undefined") {
    url += `&isActive=${isActive}`;
  }
  return apiConnector("GET", url);
};

export const getBlogCategoryById = (id) =>
  apiConnector("GET", `${blogCategoryEndpoints.GET_SINGLE_ADMIN}/${id}`);

export const updateBlogCategory = (id, data) =>
  apiConnector("PUT", `${blogCategoryEndpoints.UPDATE}/${id}`, data);

export const deleteBlogCategory = (id) =>
  apiConnector("DELETE", `${blogCategoryEndpoints.DELETE}/${id}`);

export const toggleBlogCategoryStatus = (id, isActive) =>
  apiConnector("PATCH", `${blogCategoryEndpoints.TOGGLE_STATUS}/${id}`, { isActive });
