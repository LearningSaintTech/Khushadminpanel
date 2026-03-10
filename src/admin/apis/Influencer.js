import { apiConnector } from "../services/Apiconnector";

export const influencerEndpoints = {
  CREATE_INFLUENCER: "/admin/panels/influencer/create",
  GET_INFLUENCERS: "/admin/panels/influencer/list",
  GET_INFLUENCER_BY_ID: "/admin/panels/influencer",
  UPDATE_INFLUENCER: "/admin/panels/influencer",
  DELETE_INFLUENCER: "/admin/panels/influencer/delete",
  TOGGLE_STATUS: "/admin/panels/influencer",
};

// ✅ Create Influencer
export const createInfluencer = (data) => {
  return apiConnector(
    "POST",
    influencerEndpoints.CREATE_INFLUENCER,
    data
  );
};

// ✅ Get Influencer List (with pagination + search)
export const getInfluencers = (
  page = 1,
  limit = 10,
  search = "",
  isActive = true
) => {
  const queryParams = new URLSearchParams({
    page,
    limit,
    search,
  });

  // Only include isActive if it's a valid boolean (not undefined/null/empty string)
  // If null/undefined/empty, omit the parameter to get all influencers
  if (isActive !== undefined && isActive !== null && isActive !== "") {
    queryParams.append("isActive", isActive);
  }

  return apiConnector(
    "GET",
    `${influencerEndpoints.GET_INFLUENCERS}?${queryParams.toString()}`
  );
};

// ✅ Get Influencer By ID
export const getInfluencerById = (id) => {
  return apiConnector(
    "GET",
    `${influencerEndpoints.GET_INFLUENCER_BY_ID}/${id}`
  );
};

// ✅ Update Influencer
export const updateInfluencer = (id, data) => {
  return apiConnector(
    "PUT",
    `${influencerEndpoints.UPDATE_INFLUENCER}/${id}/update`,
    data
  );
};

// ✅ Delete Influencer
export const deleteInfluencer = (id) => {
  return apiConnector(
    "DELETE",
    `${influencerEndpoints.DELETE_INFLUENCER}/${id}`
  );
};

// ✅ Toggle Influencer Status
export const toggleInfluencerStatus = (id) => {
  return apiConnector(
    "PUT",
    `${influencerEndpoints.TOGGLE_STATUS}/${id}/toggle-status`
  );
};
