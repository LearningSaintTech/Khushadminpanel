/**
 * Safe http(s) URLs for API-sourced links (tracking, support media, CDN).
 */

export function getSafeHttpHref(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") return parsed.href;
    if (import.meta.env.DEV && parsed.protocol === "http:") return parsed.href;
    return null;
  } catch {
    return null;
  }
}

/** Open allowlisted http(s) URL in a new tab (e.g. invoice PDF from API). */
export function openSafeExternalUrl(url) {
  const safe = getSafeHttpHref(url);
  if (!safe) return false;
  const a = document.createElement("a");
  a.href = safe;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

/** tel: links — digits and leading + only. */
export function getSafeTelHref(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits || digits.length < 6) return null;
  return `tel:${digits}`;
}

/** Google Maps directions / place URLs from trusted builders. */
export function getSafeMapsHref(url) {
  const safe = getSafeHttpHref(url);
  if (!safe) return null;
  try {
    const host = new URL(safe).hostname.toLowerCase();
    if (
      host === "maps.google.com" ||
      host === "www.google.com" ||
      host === "maps.app.goo.gl" ||
      host.endsWith(".google.com")
    ) {
      return safe;
    }
  } catch {
    return null;
  }
  return null;
}
