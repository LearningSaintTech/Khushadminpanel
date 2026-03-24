import { apiConnector } from "../../admin/services/Apiconnector";

const BASE = "/subadmin";

export const subadminApi = {
  login: (data) => apiConnector("POST", `${BASE}/login`, data),
  verifyOtp: (data) => apiConnector("POST", `${BASE}/verify-otp`, data),
  resendOtp: (data) => apiConnector("POST", `${BASE}/resend-otp`, data),
  logout: () => apiConnector("POST", `${BASE}/logout`),
  getMyModuleAccess: () => apiConnector("GET", `${BASE}/my-module-access`),
};

