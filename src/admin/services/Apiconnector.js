import axios from "axios";
import appStore from "../../redux/Appstore";
import { setToken, setRole } from "../../redux/GlobalSlice";
import { decodeTokenRole, getLoginPathForPathname, normalizeRole } from "../../utils/authRole";
import { getApiBaseUrl, getOrCreateDeviceId } from "../../utils/apiConfig";
import {
  refreshAccessTokenWithFallback,
  resolveRefreshRole,
} from "../../utils/authSession";
import { performLogout } from "../../utils/sessionLogout";
import {
  isRateLimitedStatus,
  normalizeRateLimitMessage,
  RATE_LIMIT_MESSAGE,
} from "../../utils/apiErrors";
import logger from "../../utils/logger.js";
import { redactForLog } from "../../utils/logRedact.util.js";
import toast from "react-hot-toast";

const apiLog = logger.child("api");

const apiBaseUrl = getApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  withCredentials: true,
});

let refreshPromise = null;

function isAuthRequestUrl(url = "") {
  return (
    /\/login$/i.test(url) ||
    /\/verify-otp$/i.test(url) ||
    /\/resend-otp$/i.test(url) ||
    /\/otp$/i.test(url) ||
    /newAccessToken/i.test(url)
  );
}

function isAuthPagePath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  return (
    /\/login$|\/verify-otp$|\/otp$|^\/admin\/?$/.test(path) ||
    path.endsWith("/admin")
  );
}

function getStoredToken() {
  return appStore.getState()?.global?.token ?? null;
}

async function runTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const state = appStore.getState().global;
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const role = resolveRefreshRole({
      token: state?.token,
      role: state?.role,
      pathname,
    });
    if (!role || normalizeRole(role) === "ORDER_AGENT") return null;

    const token = await refreshAccessTokenWithFallback(role, pathname);
    if (token) {
      appStore.dispatch(setRole(decodeTokenRole(token)));
    }
    return token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deviceId = getOrCreateDeviceId();
    if (deviceId) {
      config.headers["x-device-id"] = deviceId;
    }
    if (import.meta.env.DEV && String(config.url || "").includes("pricing-history")) {
      apiLog.debug("pricing-history request", {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        full: `${config.baseURL || ""}${config.url || ""}`,
        hasToken: Boolean(token),
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const payload = error?.response?.data;
    const status = error?.response?.status;
    const originalConfig = error?.config;

    const base =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? { ...payload }
        : {};
    if (typeof status === "number") {
      base.status = status;
    }
    if (typeof payload === "string" && payload.trim()) {
      const cannotRoute = payload.match(/Cannot (GET|POST|PUT|PATCH|DELETE) ([^\s<]+)/i);
      base.message = cannotRoute
        ? `API route not found: ${cannotRoute[2]}. Deploy the latest backend or point VITE_API_BASE_URL to your local server.`
        : payload.includes("<!DOCTYPE") || payload.includes("<html")
          ? error?.message || "Request failed"
          : payload;
    }
    if (!base.message) {
      base.message =
        (typeof payload === "object" && payload?.message) ||
        error?.message ||
        "Something went wrong";
    }

    if (isRateLimitedStatus(status)) {
      base.message = RATE_LIMIT_MESSAGE;
      if (typeof window !== "undefined" && isAuthRequestUrl(originalConfig?.url)) {
        toast.error(RATE_LIMIT_MESSAGE, { id: "api-rate-limited" });
      }
    } else {
      base.message = normalizeRateLimitMessage(base.message, status);
    }

    if (import.meta.env.DEV && String(originalConfig?.url || "").includes("pricing-history")) {
      apiLog.error("pricing-history response error", {
        status,
        url: originalConfig?.url,
        baseURL: originalConfig?.baseURL,
        message: base.message,
        payloadPreview: redactForLog(
          typeof payload === "string"
            ? payload.slice(0, 200)
            : payload
        ),
      });
    }

    const canRetry =
      status === 401 &&
      originalConfig &&
      !originalConfig._authRetry &&
      !isAuthRequestUrl(originalConfig.url) &&
      typeof window !== "undefined";

    if (canRetry) {
      try {
        const newToken = await runTokenRefresh();
        if (newToken) {
          appStore.dispatch(setToken(newToken));
          originalConfig._authRetry = true;
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalConfig);
        }
      } catch {
        /* fall through to logout */
      }
    }

    if (status === 401 && typeof window !== "undefined" && !isAuthPagePath()) {
      await performLogout({ server: true });
      const loginPath = getLoginPathForPathname(window.location.pathname);
      if (window.location.pathname !== loginPath) {
        window.location.replace(loginPath);
      }
    }

    if (
      status === 403 &&
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/subadmin") ||
        String(originalConfig?.url || "").includes("/subadmin/"))
    ) {
      const role = normalizeRole(appStore.getState()?.global?.role);
      if (role === "SUBADMIN") {
        toast.error("Module access denied", { id: "subadmin-module-denied" });
      }
    }

    return Promise.reject(base);
  }
);

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

export { apiBaseUrl };
