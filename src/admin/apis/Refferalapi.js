import { apiConnector } from "../services/Apiconnector";

// Referral API endpoints
const REFERRAL_API = {
  REFERRAL_CONFIG: "/admin/referral/config",
  REFERRAL_LIST: "/admin/referral",
  REFERRAL_ANALYTICS: "/admin/referral/analytics",
};

// Create / Update Referral Config
export const updateReferralConfig = (data) => {
  return apiConnector("PATCH", REFERRAL_API.REFERRAL_CONFIG, data);
};

// Get Referral Config
export const getReferralConfig = () => {
  return apiConnector("GET", REFERRAL_API.REFERRAL_CONFIG);
};

// Get Referral Analytics
export const getReferralAnalytics = () => {
  return apiConnector("GET", REFERRAL_API.REFERRAL_ANALYTICS);
};

// Get Referrals with pagination
export const getReferrals = (
  page = 1,
  limit = 20,
  status = "",
  search = ""
) => {
  let url = `${REFERRAL_API.REFERRAL_LIST}?page=${page}&limit=${limit}`;

  if (status && status.trim()) {
    url += `&status=${encodeURIComponent(status.trim())}`;
  }

  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }

  return apiConnector("GET", url);
};

// Get Referral By ID
export const getReferralById = (referralId) => {
  return apiConnector(
    "GET",
    `${REFERRAL_API.REFERRAL_LIST}/${referralId}`
  );
};

// Update Referral Status
export const updateReferralStatus = (referralId, data) => {
  return apiConnector(
    "PATCH",
    `${REFERRAL_API.REFERRAL_LIST}/${referralId}/status`,
    data
  );
};

// Reject Referral
export const rejectReferral = (referralId, note) => {
  return apiConnector(
    "PATCH",
    `${REFERRAL_API.REFERRAL_LIST}/${referralId}/status`,
    {
      status: "REJECTED",
      note,
    }
  );
};

// Approve / Reward Referral
export const rewardReferral = (referralId, note = "") => {
  return apiConnector(
    "PATCH",
    `${REFERRAL_API.REFERRAL_LIST}/${referralId}/status`,
    {
      status: "REWARDED",
      note,
    }
  );
};