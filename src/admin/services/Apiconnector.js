import axios from "axios";

/**
 * Create axios instance
 */
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 60000,
});

/**
 * REQUEST INTERCEPTOR
 * Add token automatically if available
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

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
    const message =
      error?.response?.data?.message ||
      error.message ||
      "Something went wrong";

    return Promise.reject(message);
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
export const apiConnector = (
  method,
  url,
  bodyData = null,
  headers = {},
  params = {}
) => {
  const finalHeaders = { ...headers };

  // Automatically detect FormData - DON'T set Content-Type (browser needs to set boundary)
  // For FormData, let axios/browser set Content-Type automatically with boundary
  if (
    bodyData &&
    !(bodyData instanceof FormData) &&
    !finalHeaders["Content-Type"]
  ) {
    finalHeaders["Content-Type"] = "application/json";
  }
  // If bodyData is FormData, don't set Content-Type - browser will add it with boundary

  return axiosInstance({
    method,
    url,
    data: bodyData,
    headers: finalHeaders,
    params,
  });
};
