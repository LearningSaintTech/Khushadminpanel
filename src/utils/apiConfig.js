/** All environment-backed configuration — set in `.env` at project root (see .env.example). */

function envTrim(key) {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.[key] != null
      ? String(import.meta.env[key]).trim()
      : "";
  return raw;
}

/**
 * Local Express runs HTTP; `https://localhost` causes ERR_SSL_PROTOCOL_ERROR.
 * In dev, coerce https → http for loopback only.
 */
function normalizeDevApiOrigin(url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim().replace(/\/$/, "").replace(/\/api\/?$/, "");
  if (!import.meta.env?.DEV) return t;
  if (/^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(t)) {
    return t.replace(/^https:/i, "http:");
  }
  return t;
}

export function getApiBaseUrl() {
  const fromBase = envTrim("VITE_API_BASE_URL").replace(/\/$/, "");
  if (fromBase) return fromBase;
  const fromOrigin = normalizeDevApiOrigin(envTrim("VITE_API_URL"));
  if (fromOrigin) return `${fromOrigin}/api`;
  if (import.meta.env?.DEV) {
    console.warn(
      "[Khushadminpanel] VITE_API_BASE_URL is not set. Add it to .env.",
    );
  }
  return "";
}

/** API host without /api suffix (Socket.IO, CSP). */
export function getApiOrigin() {
  const fromBase = getApiBaseUrl().replace(/\/api\/?$/, "");
  if (fromBase) return normalizeDevApiOrigin(fromBase);
  const fromUrl = normalizeDevApiOrigin(envTrim("VITE_API_URL"));
  return fromUrl;
}

/** Socket host (no /api suffix). */
export function getSocketUrl() {
  return getApiOrigin();
}

/** Public CDN base for storage keys (care icons, uploads). */
export function getCdnBaseUrl() {
  return envTrim("VITE_CDN_BASE_URL").replace(/\/$/, "");
}

/** Public storefront origin for product deep links. */
export function getPublicStoreUrl() {
  return envTrim("VITE_PUBLIC_STORE_URL").replace(/\/$/, "");
}

/** Google Maps embed key (driver panel). */
export function getGoogleMapsEmbedKey() {
  return envTrim("VITE_GOOGLE_MAPS_EMBED_KEY");
}

/** Call once at app boot — warns when production build has no explicit API URL. */
export function warnIfProductionApiUrlMissing() {
  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;
  if (!envTrim("VITE_API_BASE_URL") && !envTrim("VITE_API_URL")) {
    console.warn(
      "[Khushadminpanel] VITE_API_BASE_URL is not set for this production build. Set it in .env or CI.",
    );
  }
}

const DEVICE_ID_KEY = "khush_device_id";

/** Stable device id for refresh-token binding (not a secret). */
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return `web_${Date.now()}`;
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `web_${Date.now()}`;
  }
}

/** Remove legacy token keys from older builds. */
export function clearLegacyAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("userRole");
  } catch {
    /* ignore */
  }
}
