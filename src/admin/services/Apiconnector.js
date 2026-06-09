import axios from "axios";
import appStore from "../../redux/Appstore";
import { logout } from "../../redux/GlobalSlice";
import { getLoginPathForPathname } from "../../utils/authRole";

/**
 * Cresate axios instance
 */
const apiBaseUrl = "https://api.khushpehno.com/api";
// const apiBaseUrl = "https://apidev.khushpehno.com/api";
// const apiBaseUrl = "https://apidev.khushpehno.com/api";
// const apiBaseUrl ="http://localhost:5000/api";
//   import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
//   (import.meta.env.DEV
//     ? "http://localhost:5000/api"
//     : "https://api.khushpehno.com/api");

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
});

/**
 * REQUEST INTERCEPTOR
 * Add token from Redux (persisted) or fallback localStorage
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const state = appStore.getState();
    const token = state?.global?.token ?? localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 */
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error?.response?.data;
    const status = error?.response?.status;
    const base =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? { ...payload }
        : {};
    if (typeof status === "number") {
      base.status = status;
    }
    if (typeof payload === "string" && payload.trim()) {
      base.message = payload;
    }
    if (!base.message) {
      base.message =
        (typeof payload === "object" && payload?.message) ||
        error?.message ||
        "Something went wrong";
    }

    if (status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname || "";
      const isAuthPage =
        /\/login$|\/verify-otp$|\/otp$|^\/admin\/?$/.test(path) ||
        path.endsWith("/admin");
      if (!isAuthPage) {
        appStore.dispatch(logout());
        const loginPath = getLoginPathForPathname(path);
        if (window.location.pathname !== loginPath) {
          window.location.replace(loginPath);
        }
      }
    }

    return Promise.reject(base);
  }
);

/**
 * API CONNECTOR
 * Handles both JSON and multipart/form-data automatically
 * @param {string} method - GET, POST, PUT, PATCH, DELETE
 * @param {string} url
 * @param {object | FormData} bodyData
 * @param {object} headers
 * @param {object} params
 */
function isFormDataPayload(bodyData) {
  if (!bodyData || typeof bodyData !== "object") return false;
  if (typeof FormData !== "undefined" && bodyData instanceof FormData) return true;
  return Object.prototype.toString.call(bodyData) === "[object FormData]";
}

export const apiConnector = (
  method,
  url,
  bodyData = null,
  headers = {},
  params = {},
  requestConfig = {}
) => {
  const finalHeaders = { ...headers };

  // Automatically detect FormData - DON'T set Content-Type (browser needs to set boundary)
  // For FormData, let axios/browser set Content-Type automatically with boundary
  if (
    bodyData &&
    !isFormDataPayload(bodyData) &&
    !finalHeaders["Content-Type"] &&
    !finalHeaders["content-type"]
  ) {
    finalHeaders["Content-Type"] = "application/json";
  }

  return axiosInstance({
    method,
    url,
    data: bodyData,
    headers: finalHeaders,
    params,
    ...requestConfig,
  });
};
