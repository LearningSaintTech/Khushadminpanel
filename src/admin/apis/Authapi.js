import { apiConnector } from "../services/Apiconnector";

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
export const verifyOtp = (data) => {
  return apiConnector("POST", authEndpoints.VERIFY_OTP, data);
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
export const resendOtp = (data) => {
  return apiConnector("POST", authEndpoints.RESEND_OTP, data);
};

/**
 * ================================
 * LOGIN
 * ================================
 */
export const loginUser = (data) => {
  return apiConnector("POST", authEndpoints.LOGIN, data);
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