import { apiConnector } from "../services/Apiconnector";

export const sectionEndpoints = {
  CREATE_SECTION: "/sections/create",
  GET_SECTIONS: "/sections/get",
  GET_SINGLE: "/sections/getSingle",
  UPDATE_SECTION: "/sections/update",
  TOGGLE_ACTIVE_STATUS: "/sections/activeStatus",
};

// Create
export const createSection = (data) => {
  return apiConnector("POST", sectionEndpoints.CREATE_SECTION, data);
};

// Get (with pagination)
export const getSections = ({
  type,
  page = 1,
  limit = 5,
} = {}) => {
  const queryParams = [`page=${page}`, `limit=${limit}`];
  if (type && type !== "ALL") {
    queryParams.push(`type=${type}`);
  }

  const query = `?${queryParams.join("&")}`;

  return apiConnector(
    "GET",
    sectionEndpoints.GET_SECTIONS + query
  );
};

// Alias
export const getAllSections = (params = {}) => {
  return getSections(params);
};

// Get single
export const getSingleSection = (id) => {
  if (!id) {
    throw new Error("Section ID is required");
  }

  return apiConnector(
    "GET",
    `${sectionEndpoints.GET_SINGLE}/${id}`
  );
};

// Update
export const updateSection = (id, data) => {
  return apiConnector(
    "PATCH",
    `${sectionEndpoints.UPDATE_SECTION}/${id}`,
    data
  );
};

// Toggle Active Status
export const toggleSectionActiveStatus = (id) => {
  if (!id) {
    throw new Error("Section ID is required");
  }

  return apiConnector(
    "PATCH",
    `${sectionEndpoints.TOGGLE_ACTIVE_STATUS}/${id}`
  );
};