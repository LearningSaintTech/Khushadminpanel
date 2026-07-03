import { apiConnector } from "../services/Apiconnector";

export const blogEndpoints = {
  CREATE: "/blog/create",
  GET_ALL_ADMIN: "/blog/admin/getAll",
  GET_SINGLE_ADMIN: "/blog/admin/getSingle",
  UPDATE: "/blog/update",
  DELETE: "/blog/delete",
  TOGGLE_PUBLISH: "/blog/toggle-publish",
  TOGGLE_FEATURED: "/blog/toggle-featured",
  GET_SETTINGS_ADMIN: "/blog/admin/settings",
  UPDATE_SETTINGS_ADMIN: "/blog/admin/settings",
};

export const createBlogPost = (formData) =>
  apiConnector("POST", blogEndpoints.CREATE, formData);

export const getAllBlogPosts = (page = 1, limit = 20, search = "", categoryId = "", isPublished = "") => {
  let url = `${blogEndpoints.GET_ALL_ADMIN}?page=${page}&limit=${limit}`;
  if (search?.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  if (categoryId?.trim()) url += `&categoryId=${encodeURIComponent(categoryId.trim())}`;
  if (isPublished !== "" && isPublished !== null && typeof isPublished !== "undefined") {
    url += `&isPublished=${isPublished}`;
  }
  return apiConnector("GET", url);
};

export const getBlogPostById = (id) =>
  apiConnector("GET", `${blogEndpoints.GET_SINGLE_ADMIN}/${id}`);

export const updateBlogPost = (id, formData) =>
  apiConnector("PUT", `${blogEndpoints.UPDATE}/${id}`, formData);

export const deleteBlogPost = (id) =>
  apiConnector("DELETE", `${blogEndpoints.DELETE}/${id}`);

export const toggleBlogPublish = (id, isPublished) =>
  apiConnector("PATCH", `${blogEndpoints.TOGGLE_PUBLISH}/${id}`, { isPublished });

export const toggleBlogFeatured = (id, isFeatured) =>
  apiConnector("PATCH", `${blogEndpoints.TOGGLE_FEATURED}/${id}`, { isFeatured });

export const getBlogSettings = () =>
  apiConnector("GET", blogEndpoints.GET_SETTINGS_ADMIN);

export const updateBlogSettings = (data) =>
  apiConnector("PATCH", blogEndpoints.UPDATE_SETTINGS_ADMIN, data);

export const getBlogCommentsAdmin = (page = 1, limit = 20, search = "", blogId = "", isHidden = "") => {
  let url = `/blog/admin/comments?page=${page}&limit=${limit}`;
  if (search?.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  if (blogId?.trim()) url += `&blogId=${encodeURIComponent(blogId.trim())}`;
  if (isHidden !== "" && isHidden !== null && typeof isHidden !== "undefined") {
    url += `&isHidden=${isHidden}`;
  }
  return apiConnector("GET", url);
};

export const hideBlogComment = (commentId, isHidden) =>
  apiConnector("PATCH", `/blog/admin/comments/${commentId}/hide`, { isHidden });

export const deleteBlogCommentAdmin = (commentId) =>
  apiConnector("DELETE", `/blog/admin/comments/${commentId}`);
