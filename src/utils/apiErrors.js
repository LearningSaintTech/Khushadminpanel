/** User-facing message when the API returns HTTP 429. */
export const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a few minutes and try again.";

export function isRateLimitedStatus(status) {
  return status === 429;
}

export function isRateLimitedMessage(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("429") || text.includes("too many");
}

export function normalizeRateLimitMessage(message, status) {
  if (isRateLimitedStatus(status) || isRateLimitedMessage(message)) {
    return RATE_LIMIT_MESSAGE;
  }
  return message;
}
