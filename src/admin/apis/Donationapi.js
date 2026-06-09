// src/apis/DonationApi.js

import { apiConnector } from "../services/Apiconnector";

export const donationEndpoints = {
  GET_DONATIONS: "/admin/donations",
};

// ✅ Get Donations with Filters
export const getDonations = ({
  page = 1,
  limit = 20,
  search = "",
  paymentStatus = "",
  startDate = "",
  endDate = "",
} = {}) => {
  const queryParams = new URLSearchParams();

  queryParams.append("page", page);
  queryParams.append("limit", limit);

  if (search) {
    queryParams.append("search", search);
  }

  if (paymentStatus) {
    queryParams.append("paymentStatus", paymentStatus);
  }

  if (startDate) {
    queryParams.append("startDate", startDate);
  }

  if (endDate) {
    queryParams.append("endDate", endDate);
  }

  const url = `${donationEndpoints.GET_DONATIONS}?${queryParams.toString()}`;

  console.log("=== DONATION API REQUEST ===");
  console.log("URL:", url);
  console.log("Filters:", {
    page,
    limit,
    search,
    paymentStatus,
    startDate,
    endDate,
  });

  return apiConnector("GET", url);
};