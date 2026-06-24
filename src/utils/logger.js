import { getOriginalConsole } from "./configureConsole.js";
import {
  isDebugOrderAgent,
  isDebugOrders,
  isLoggingEnabled,
  resolveAppEnv,
} from "./logLevel.js";

const consoleOut = getOriginalConsole();

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  fractionalSecondDigits: 3,
});

function formatTimestamp(date = new Date()) {
  return `${istFormatter.format(date)} IST`;
}

function formatPrefix(level, context) {
  const ctx = context ? ` [${context}]` : "";
  return `${formatTimestamp()} [${level}]${ctx}`;
}

function write(level, context, message, args) {
  if (!isLoggingEnabled()) return;

  const prefix = formatPrefix(level, context);
  const fn =
    level === "error"
      ? consoleOut.error
      : level === "warn"
        ? consoleOut.warn
        : consoleOut.log;

  if (args.length === 0) {
    fn(prefix, message);
    return;
  }
  fn(prefix, message, ...args);
}

function bindLevel(level, defaultContext) {
  return (contextOrMessage, messageOrArg, ...rest) => {
    if (typeof contextOrMessage === "string" && messageOrArg === undefined) {
      write(level, defaultContext, contextOrMessage, []);
      return;
    }
    if (typeof contextOrMessage === "string" && typeof messageOrArg === "string") {
      write(level, contextOrMessage, messageOrArg, rest);
      return;
    }
    write(level, defaultContext, contextOrMessage, messageOrArg !== undefined ? [messageOrArg, ...rest] : rest);
  };
}

/**
 * App logger — prefer over raw console.* in new code.
 * @example logger.info('Auth', 'OTP sent');
 * @example logger.debug('Orders', 'filter applied', { count: 12 });
 */
export const logger = {
  error: bindLevel("error"),
  warn: bindLevel("warn"),
  info: bindLevel("info"),
  debug: bindLevel("debug"),

  /** Child logger with a fixed context label. */
  child(context) {
    return {
      error: (message, ...args) => write("error", context, message, args),
      warn: (message, ...args) => write("warn", context, message, args),
      info: (message, ...args) => write("info", context, message, args),
      debug: (message, ...args) => write("debug", context, message, args),
    };
  },

  /** Log only when a feature debug flag is on (dev only). */
  debugWhen(enabled, context, message, ...args) {
    if (!enabled || !isLoggingEnabled()) return;
    write("debug", context, message, args);
  },

  isLoggingEnabled,
  getAppEnv: resolveAppEnv,
  isDebugOrders,
  isDebugOrderAgent,
};

export default logger;
