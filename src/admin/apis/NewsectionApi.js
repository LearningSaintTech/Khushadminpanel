import { apiConnector } from "../services/Apiconnector";

export const sectionEndpoints = {
  CREATE_SECTION: "/sections/create",
  GET_SECTIONS: "/sections/get",
  GET_ALL_SECTIONS: "/sections/getAll",
  GET_SINGLE_SECTION: "/sections/getSingle",
  GET_ONE_SECTION: "/sections/getOne",
  UPDATE_SECTION: "/sections/update",
  TOGGLE_SECTION_STATUS: "/sections/activeStatus",
  DELETE_SECTION: "/sections/delete",
};

//
// ======================================================
// ✅ CREATE SECTION
// multipart/form-data
// ======================================================
//

export const createSection = (data) => {
  return apiConnector(
    "POST",
    sectionEndpoints.CREATE_SECTION,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

//
// ======================================================
// ✅ GET ACTIVE SECTIONS
// ======================================================
//

export const getSections = ({
  type,
  pinCode,
  page = 1,
  limit = 10,
  isWeb,
  isApp,
  webOrder,
  appOrder,
  productLimit,
}) => {
  return apiConnector(
    "GET",
    sectionEndpoints.GET_SECTIONS,
    null,
    null,
    {
      type,
      pinCode,
      page,
      limit,
      isWeb,
      isApp,
      webOrder,
      appOrder,
      productLimit,
    }
  );
};

//
// ======================================================
// ✅ GET ALL SECTIONS
// ======================================================
//

/**
 * @param {number|Object} pageOrParams - page number, or { page, limit, type, search }
 * @param {number} [limitArg=10]
 */
export const getAllSections = (pageOrParams = 1, limitArg = 10) => {
  let page = 1;
  let limit = 10;
  let type;
  let search;

  if (typeof pageOrParams === "object" && pageOrParams !== null) {
    page = pageOrParams.page ?? 1;
    limit = pageOrParams.limit ?? 10;
    type = pageOrParams.type;
    search = pageOrParams.search;
  } else {
    page = pageOrParams;
    limit = limitArg;
  }

  const params = { page, limit };
  if (type && type !== "ALL") params.type = type;
  if (search && String(search).trim()) {
    params.search = String(search).trim();
  }

  return apiConnector(
    "GET",
    sectionEndpoints.GET_ALL_SECTIONS,
    null,
    null,
    params
  );
};

//
// ======================================================
// ✅ GET SINGLE SECTION
// ======================================================
//

export const getSingleSection = (
  sectionId
) => {
  return apiConnector(
    "GET",
    `${sectionEndpoints.GET_SINGLE_SECTION}/${sectionId}`
  );
};

//
// ======================================================
// ✅ GET ONE SECTION (PUBLIC)
// ======================================================
//

export const getOneSection = (
  sectionId
) => {
  return apiConnector(
    "GET",
    `${sectionEndpoints.GET_ONE_SECTION}/${sectionId}`
  );
};

//
// ======================================================
// ✅ UPDATE SECTION
// multipart/form-data
// ======================================================
//

export const updateSection = (
  sectionId,
  data
) => {
  return apiConnector(
    "PATCH",
    `${sectionEndpoints.UPDATE_SECTION}/${sectionId}`,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

//
// ======================================================
// ✅ TOGGLE ACTIVE STATUS
// ======================================================
//

export const toggleSectionStatus = (
  sectionId
) => {
  return apiConnector(
    "PATCH",
    `${sectionEndpoints.TOGGLE_SECTION_STATUS}/${sectionId}`
  );
};

//
// ======================================================
// ✅ DELETE SECTION
// ======================================================
//

export const deleteSection = (
  sectionId
) => {
  return apiConnector(
    "DELETE",
    `${sectionEndpoints.DELETE_SECTION}/${sectionId}`
  );
};