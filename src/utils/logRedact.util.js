const SENSITIVE_KEY_RE =
  /^(authorization|password|otp|accesstoken|access_token|refreshtoken|refresh_token|token|secret|signature|phone|phonenumber|email|address|street|pincode|postal)$/i;

const SENSITIVE_KEY_PARTIAL_RE = /(password|secret|token|signature|authorization|otp)/i;

export function redactForLog(value, depth = 0) {
  if (value == null || depth > 5) return value;
  if (typeof value !== "object") return value;
  if (typeof FormData !== "undefined" && value instanceof FormData) return "[FormData]";
  if (Array.isArray(value)) return value.map((item) => redactForLog(item, depth + 1));

  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEY_RE.test(lower) || SENSITIVE_KEY_PARTIAL_RE.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redactForLog(raw, depth + 1);
  }
  return out;
}
