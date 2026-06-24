import { apiConnector } from "../../admin/services/Apiconnector";

const AUTH_ENDPOINTS = {
  LOGIN: "/influencer/login",
  VERIFY_OTP: "/influencer/verify-otp",
  RESEND_OTP: "/influencer/resend-otp",
  LOGOUT: "/influencer/logout",
  GET_PROFILE: "/influencer/getProfile",
};

const INFLUENCER_USER_ID_KEY = "influencer_userId";

export const loginInfluencer = async (countryCode, phoneNumber) => {
  const response = await apiConnector("POST", AUTH_ENDPOINTS.LOGIN, {
    countryCode,
    phoneNumber,
  });

  const data = response?.data ?? response;

  if (!data?.userId) {
    throw new Error("Failed to send OTP");
  }

  sessionStorage.setItem(INFLUENCER_USER_ID_KEY, String(data.userId));
  return data;
};

export const verifyOtp = async (userId, otp) => {
  const response = await apiConnector("POST", AUTH_ENDPOINTS.VERIFY_OTP, {
    userId,
    otp,
  });

  const data = response?.data ?? response;

  if (data?.success === false) {
    throw new Error(data?.message || "OTP verification failed");
  }

  return data;
};

export const resendOtp = async (userId) => {
  const response = await apiConnector("POST", AUTH_ENDPOINTS.RESEND_OTP, {
    userId,
  });

  const data = response?.data ?? response;

  if (data?.success === false) {
    throw new Error(data?.message || "Failed to resend OTP");
  }

  return data;
};

export const logoutInfluencer = async () => {
  try {
    await apiConnector("POST", AUTH_ENDPOINTS.LOGOUT);
  } finally {
    sessionStorage.removeItem(INFLUENCER_USER_ID_KEY);
  }
};

export const getInfluencerProfile = () =>
  apiConnector("GET", AUTH_ENDPOINTS.GET_PROFILE);

export function getInfluencerUserId() {
  return sessionStorage.getItem(INFLUENCER_USER_ID_KEY);
}
