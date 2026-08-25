/**
 * Report Axios "timeout exceeded" to backend (fetch — avoids axios recursion).
 */
import { getApiBaseUrl, getOrCreateDeviceId } from "./apiConfig";
import appStore from "../redux/Appstore";

const REPORT_PATH = "/client-errors/timeout";
const recentKeys = new Map();
const DEDUPE_MS = 15_000;

export function isAxiosTimeoutError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(
    error?.message || error?.response?.data?.message || error || ""
  );
  return (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    /timeout of \d+ms exceeded/i.test(message) ||
    /timeout.*exceeded/i.test(message)
  );
}

function buildApiPath(config) {
  if (!config) return "";
  const base = String(config.baseURL || "").replace(/\/$/, "");
  const url = String(config.url || "");
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function shouldSkip(apiPath) {
  return /client-errors\/timeout/i.test(apiPath) || /\/analytics\/events/i.test(apiPath);
}

export function reportClientTimeout(error, { client = "admin" } = {}) {
  try {
    if (typeof window === "undefined" || !error || !isAxiosTimeoutError(error)) return;

    // Apiconnector rejects with a plain object (base) — original axios error may be lost.
    // Accept either axios error or our normalized base if message matches timeout.
    const config = error.config || error.__axiosConfig || null;
    const apiPath = buildApiPath(config || { url: error.url, baseURL: getApiBaseUrl() }).slice(
      0,
      500
    );
    if (!apiPath || shouldSkip(apiPath)) return;

    const timeoutMs =
      Number(config?.timeout) ||
      (typeof error.timeoutMs === "number" ? error.timeoutMs : null);
    const method = (config?.method || error.method || "GET").toUpperCase();
    const dedupeKey = `${client}|${method}|${apiPath}|${timeoutMs}`;
    const now = Date.now();
    const last = recentKeys.get(dedupeKey) || 0;
    if (now - last < DEDUPE_MS) return;
    recentKeys.set(dedupeKey, now);
    if (recentKeys.size > 100) {
      for (const [k, t] of recentKeys) {
        if (now - t > DEDUPE_MS) recentKeys.delete(k);
      }
    }

    const startedAt = config?.metadata?.startedAt;
    const durationMs =
      typeof startedAt === "number" && Number.isFinite(startedAt)
        ? Math.max(0, now - startedAt)
        : timeoutMs;

    const state = appStore.getState()?.global;
    const token = state?.token || null;
    const role = state?.role || null;

    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const deviceId = getOrCreateDeviceId?.();
    if (deviceId) headers["x-device-id"] = deviceId;

    const body = {
      client,
      role: role ? String(role) : undefined,
      method,
      apiPath,
      pageUrl: window.location.href.slice(0, 500),
      timeoutMs,
      durationMs,
      message: String(error.message || "timeout exceeded").slice(0, 500),
      code: error.code || "ECONNABORTED",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : undefined,
      occurredAt: new Date().toISOString(),
    };

    const baseUrl = String(getApiBaseUrl() || "").replace(/\/$/, "");
    if (!baseUrl) return;

    fetch(`${baseUrl}${REPORT_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the failed request path */
  }
}
