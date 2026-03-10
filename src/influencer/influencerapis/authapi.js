import { apiConnector } from "../../admin/services/Apiconnector";

// ======================================================
// ENDPOINTS
// ======================================================

const AUTH_ENDPOINTS = {
  LOGIN: "/influencer/login",
  VERIFY_OTP: "/influencer/verify-otp",
  RESEND_OTP: "/influencer/resend-otp",
  LOGOUT: "/influencer/logout",
};

// ====================
// 🔹 LOGIN
// ====================
export const loginInfluencer = async (countryCode, phoneNumber) => {
  try {
    const response = await apiConnector(
      "POST",
      "/influencer/login",
      { countryCode, phoneNumber }
    );

    const data = response.data;

    console.log("LOGIN RESPONSE:", data);

    // ✅ Only check for userId
    if (!data?.userId) {
      throw new Error("Failed to send OTP");
    }

    // Save userId for verify page
    localStorage.setItem("userId", data.userId);

    return data;

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to send OTP"
    );
  }
};



// ====================
// 🔹 VERIFY OTP
// ====================
export const verifyOtp = async (userId, otp) => {
  try {
    const response = await apiConnector(
      "POST",
      AUTH_ENDPOINTS.VERIFY_OTP,
      { userId, otp }
    );

    const data = response.data;
    console.log("VERIFY RESPONSE:", data);

    // If backend uses success field
    if (data?.success === false) {
      throw new Error(data?.message);
    }

    // If backend sends token directly
    const token = data?.data?.token || data?.token;

    if (token) {
      localStorage.setItem("token", token);
    }

    return data;

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "OTP verification failed"
    );
  }
};

// ====================
// 🔹 RESEND OTP
// ====================
export const resendOtp = async (userId) => {
  try {
    const response = await apiConnector(
      "POST",
      AUTH_ENDPOINTS.RESEND_OTP,
      { userId }
    );

    const data = response.data;
    console.log("RESEND RESPONSE:", data);

    if (data?.success === false) {
      throw new Error(data?.message);
    }

    return data;

  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Failed to resend OTP"
    );
  }
};

// ====================
// 🔹 LOGOUT
// ====================
export const logoutInfluencer = async (userId) => {
  try {
    const response = await apiConnector(
      "POST",
      AUTH_ENDPOINTS.LOGOUT,
      { userId }
    );

    const data = response.data;

    if (data?.success === false) {
      throw new Error(data?.message);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("userId");

    return data;

  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      "Logout failed"
    );
  }
};
