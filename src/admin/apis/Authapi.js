import { apiConnector } from "../services/Apiconnector";
import { isLoggingEnabled } from "../../utils/logLevel";

const isDevAuthLog =
  Boolean(import.meta.env?.DEV) || isLoggingEnabled();

function logAuth(label, payload) {
  if (!isDevAuthLog) return;
  console.log(`[Auth] ${label}`, payload);
}

/**
 * ================================
 * AUTH API ENDPOINTS
 * ================================
 */
export const authEndpoints = {
  REGISTER: "/auth/register",          // send OTP
  VERIFY_OTP: "/admin/verify-otp",     // verify OTP
  RESEND_OTP: "/admin/resend-otp",     // resend OTP  ✅ NEW
  LOGIN: "/admin/login",
  LOGOUT: "/admin/logout",
  GET_PROFILE: "/admin/getProfile",
  UPDATE_PROFILE: "/admin/update-profile",
};

/**
 * ================================
 * SEND OTP / REGISTER USER
 * ================================
 */
export const registerUser = (data) => {
  return apiConnector("POST", authEndpoints.REGISTER, data);
};

/**
 * ================================
 * VERIFY OTP
 * ================================
 */
export const verifyOtp = async (data) => {
  logAuth("verifyOtp →", {
    userId: data?.userId,
    otpLength: String(data?.otp || "").length,
    endpoint: authEndpoints.VERIFY_OTP,
  });
  try {
    const res = await apiConnector("POST", authEndpoints.VERIFY_OTP, data);
    logAuth("verifyOtp ←", {
      success: res?.success,
      message: res?.message,
      hasAccessToken: Boolean(res?.data?.accessToken),
      roleHint: res?.data?.role || res?.data?.user?.role,
    });
    return res;
  } catch (err) {
    console.error("[Auth] verifyOtp ✕", err);
    throw err;
  }
};

/**
 * ================================
 * RESEND OTP  ✅ NEW
 * ================================
 * @param {Object} data
 * {
 *   userId: string
 * }
 */
export const resendOtp = async (data) => {
  logAuth("resendOtp →", { userId: data?.userId, endpoint: authEndpoints.RESEND_OTP });
  try {
    const res = await apiConnector("POST", authEndpoints.RESEND_OTP, data);
    logAuth("resendOtp ←", { success: res?.success, message: res?.message });
    return res;
  } catch (err) {
    console.error("[Auth] resendOtp ✕", err);
    throw err;
  }
};

/**
 * ================================
 * LOGIN
 * ================================
 */
export const loginUser = async (data) => {
  logAuth("login →", {
    countryCode: data?.countryCode,
    phoneNumber: data?.phoneNumber,
    endpoint: authEndpoints.LOGIN,
  });
  try {
    const res = await apiConnector("POST", authEndpoints.LOGIN, data);
    logAuth("login ←", {
      success: res?.success,
      message: res?.message,
      userId: res?.data?.userId,
    });
    return res;
  } catch (err) {
    console.error("[Auth] login ✕", err);
    throw err;
  }
};

/**
 * ================================
 * LOGOUT
 * ================================
 */
export const logoutUser = () => {
  return apiConnector("POST", authEndpoints.LOGOUT);
};

/**
 * ================================
 * GET USER PROFILE
 * ================================
 */
export const getUserProfile = () => {
  return apiConnector("GET", authEndpoints.GET_PROFILE);
};
export const updateProfile = (data) => {
  return apiConnector("PUT", authEndpoints.UPDATE_PROFILE, data);
};
