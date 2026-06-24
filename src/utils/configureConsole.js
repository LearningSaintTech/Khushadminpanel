/**
 * Patches global console in the browser when VITE_APP_ENV=prod.
 * Import this once at the top of main.jsx (before any other app code).
 */
import { isLoggingEnabled } from "./logLevel.js";

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/** Raw console — used internally by logger so output is never double-filtered. */
export function getOriginalConsole() {
  return originalConsole;
}

function noop() {}

export function configureConsole() {
  if (isLoggingEnabled()) return;

  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.error = noop;
}

configureConsole();
