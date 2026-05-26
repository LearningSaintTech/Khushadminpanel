// src/apis/feedbackApi.js

import { apiConnector } from "../services/Apiconnector";

export const feedbackEndpoints = {
  GET_ALL_FEEDBACKS:
    "/suggestions/admin/getAll",
};

// ================= GET ALL FEEDBACKS =================

export const getAllFeedbacks = async (
  page = 1,
  limit = 20
) => {
  try {
    const response =
      await apiConnector(
        "GET",
        `${feedbackEndpoints.GET_ALL_FEEDBACKS}?page=${page}&limit=${limit}`
      );

    console.log(
      "GET ALL FEEDBACKS RESPONSE:",
      response
    );

    return response;
  } catch (error) {
    console.error(
      "GET ALL FEEDBACKS ERROR:",
      error
    );

    throw error;
  }
};