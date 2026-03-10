// src/apis/Bannerapi.js  (or your current file)

import { apiConnector } from "../services/Apiconnector";

export const featuredImageEndpoints = {
  CREATE_FEATURED_IMAGE: "/featuredImages/create",
  GET_FEATURED_IMAGES: "/featuredImages/get-all",          // ← changed here: get-all (hyphen + lowercase)
  UPDATE_FEATURED_IMAGE: "/featuredImages/update",        // keep for now
  DELETE_FEATURED_IMAGE: "/featuredImages/delete",        // keep for now
};

export const createFeaturedImage = (data) => {
  return apiConnector(
    "POST",
    featuredImageEndpoints.CREATE_FEATURED_IMAGE,
    data // FormData – should already include heading, subHeading, page, file
  );
};

export const getFeaturedImages = (pageFilter = "", pageNum = 1, limit = 10) => {
  // Build query string to handle both page type filter and pagination
  // Backend uses 'page' query param for filtering by page type (home/lock/bottom)
  // When "all" is selected, don't pass 'page' parameter - backend returns all banners
  // Backend might handle pagination internally based on limit only, or use a different param
  let url = `${featuredImageEndpoints.GET_FEATURED_IMAGES}?limit=${limit}`;
  
  if (pageFilter && pageFilter !== "all") {
    // Filter by page type (home/lock/bottom) - pass as string
    url += `&page=${encodeURIComponent(pageFilter)}`;
  }
  // When "all" is selected, only pass limit
  // Backend should return all banners (possibly paginated based on limit)
  // Note: If backend needs pagination for "all", it might require a different parameter
  
  console.log("Banner API URL:", url);
  console.log("Page Filter:", pageFilter, "Page Num:", pageNum);
  
  return apiConnector("GET", url);
};

// ✅ Update Featured Image
// Note: FormData Content-Type is handled automatically by the browser (with boundary)
// imageId is sent as query parameter, other data in FormData body
export const updateFeaturedImage = (imageId, formData) => {
  return apiConnector(
    "PUT",
    featuredImageEndpoints.UPDATE_FEATURED_IMAGE,
    formData,
    {},
    { imageId } // Send imageId as query parameter
  );
};



// ✅ Delete Featured Image (using path parameter)
export const deleteFeaturedImage = (id) => {
  return apiConnector(
    "DELETE",
    `${featuredImageEndpoints.DELETE_FEATURED_IMAGE}/${id}`
  );
};

export const getFeaturedImageById = (imageId) => {
  return apiConnector(
    "GET",
    "/featuredImages/get",
    null,
    {},
    { imageId } // query param
  );
};
