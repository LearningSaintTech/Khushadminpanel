import { apiConnector } from "../services/Apiconnector";

export const marqueHeadingEndpoints = {
  CREATE_MARQUE_HEADING:
    "/marque-headings/create",

  GET_ALL_MARQUE_HEADINGS:
    "/marque-headings/getAll",

  UPDATE_MARQUE_HEADING_ITEM:
    "/marque-headings/update",

  DELETE_MARQUE_HEADING:
    "/marque-headings/delete",
};

// ================= CREATE MARQUE HEADING =================
export const createMarqueHeading =
  async (data) => {
    try {
      const response =
        await apiConnector(
          "POST",
          marqueHeadingEndpoints.CREATE_MARQUE_HEADING,
          data
        );

      console.log(
        "CREATE MARQUE HEADING RESPONSE:",
        response
      );

      return response;
    } catch (error) {
      console.error(
        "CREATE MARQUE HEADING ERROR:",
        error
      );

      throw error;
    }
  };

// ================= GET ALL MARQUE HEADINGS =================
export const getAllMarqueHeadings =
  async (order = "") => {
    try {
      let url =
        marqueHeadingEndpoints.GET_ALL_MARQUE_HEADINGS;

      if (order !== "") {
        url += `?order=${order}`;
      }

      const response =
        await apiConnector(
          "GET",
          url
        );

      console.log(
        "GET ALL MARQUE HEADINGS RESPONSE:",
        response
      );

      return response;
    } catch (error) {
      console.error(
        "GET ALL MARQUE HEADINGS ERROR:",
        error
      );

      throw error;
    }
  };

// ================= UPDATE MARQUE HEADING ITEM =================
export const updateMarqueHeadingItem =
  async (
    documentId,
    itemIndex,
    data
  ) => {
    try {
      const response =
        await apiConnector(
          "PATCH",
          `${marqueHeadingEndpoints.UPDATE_MARQUE_HEADING_ITEM}/${documentId}/item/${itemIndex}`,
          data
        );

      console.log(
        "UPDATE MARQUE HEADING RESPONSE:",
        response
      );

      return response;
    } catch (error) {
      console.error(
        "UPDATE MARQUE HEADING ERROR:",
        error
      );

      throw error;
    }
  };

// ================= DELETE MARQUE HEADING =================
export const deleteMarqueHeading =
  async (id) => {
    try {
      const response =
        await apiConnector(
          "DELETE",
          `${marqueHeadingEndpoints.DELETE_MARQUE_HEADING}/${id}`
        );

      console.log(
        "DELETE MARQUE HEADING RESPONSE:",
        response
      );

      return response;
    } catch (error) {
      console.error(
        "DELETE MARQUE HEADING ERROR:",
        error
      );

      throw error;
    }
  };