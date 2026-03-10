import { apiConnector } from "../services/Apiconnector";

export const bannerEndpoints = {
  CREATE_BANNER: "/banner/create",
  GET_BANNERS: "/banner/getAll",
  UPDATE_BANNER: "/banner/update",
  DELETE_BANNER: "/banner/delete",
};

// ✅ Create Banner (NO FormData here)
export const createBanner = (data) => {
  return apiConnector(
    "POST",
    bannerEndpoints.CREATE_BANNER,
    data
  );
};

// ✅ Get Banners
export const getBanners = () => {
  return apiConnector(
    "GET",
    bannerEndpoints.GET_BANNERS
  );
};

// ✅ Update Banner
export const updateBanner = (id, data) => {
  return apiConnector(
    "PUT",
    `${bannerEndpoints.UPDATE_BANNER}/${id}`,
    data
  );
};

// ✅ Delete Banner
export const deleteBanner = (id) => {
  return apiConnector(
    "DELETE",
    `${bannerEndpoints.DELETE_BANNER}/${id}`
  );
};
