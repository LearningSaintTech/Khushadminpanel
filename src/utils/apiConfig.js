/** All environment-backed configuration — set in `.env` at project root. */

function envTrim(key) {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.[key] != null
      ? String(import.meta.env[key]).trim()
      : "";
  return raw;
}

export function getApiBaseUrl() {
  const fromEnv = envTrim("VITE_API_BASE_URL").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env?.DEV) {
    console.warn(
      "[Khushadminpanel] VITE_API_BASE_URL is not set. Add it to .env."
    );
  }
  return "";
}

/** Socket host (no /api suffix). */
export function getSocketUrl() {
  return getApiBaseUrl().replace(/\/api\/?$/, "");
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
  if (!envTrim("VITE_API_BASE_URL")) {
    console.warn(
      "[Khushadminpanel] VITE_API_BASE_URL is not set for this production build. Set it in .env or CI."
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
