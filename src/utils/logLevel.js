/**
 * Logging is controlled by VITE_APP_ENV in your .env file:
 *   dev  → all console.* and logger output enabled
 *   prod → no logs in the browser
 *
 * If VITE_APP_ENV is unset: dev server → logs on, production build → logs off.
 */

function normalizeAppEnv(value) {
  const v = String(value ?? "").toLowerCase().trim();
  if (v === "dev" || v === "development") return "dev";
  if (v === "prod" || v === "production") return "prod";
  return "";
}

export function resolveAppEnv() {
  const fromEnv = normalizeAppEnv(import.meta.env.VITE_APP_ENV);
  if (fromEnv) return fromEnv;
  return import.meta.env.PROD ? "prod" : "dev";
}

export function isLoggingEnabled() {
  return resolveAppEnv() === "dev";
}

/** @deprecated Use isLoggingEnabled() — kept for existing imports. */
export function shouldLogLevel() {
  return isLoggingEnabled();
}

/** @deprecated Use resolveAppEnv() — kept for existing imports. */
export function resolveLogLevel() {
  return isLoggingEnabled() ? "debug" : "off";
}

function isNonProdDebugFlag(value) {
  if (!isLoggingEnabled()) return false;
  return String(value ?? "").toLowerCase() === "true";
}

/** Feature flag: verbose order screen logs (dev only). */
export function isDebugOrders() {
  if (!isLoggingEnabled()) return false;
  return import.meta.env.DEV || isNonProdDebugFlag(import.meta.env.VITE_DEBUG_ORDERS);
}

/** Feature flag: order-agent sidebar / analytics logs (dev only). */
export function isDebugOrderAgent() {
  if (!isLoggingEnabled()) return false;
  return import.meta.env.DEV || isNonProdDebugFlag(import.meta.env.VITE_DEBUG_ORDER_AGENT);
}
