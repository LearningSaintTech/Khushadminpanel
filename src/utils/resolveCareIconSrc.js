import doNotBleachIcon from "../assets/images/Do Not Bleach icon.svg";
import doNotTumbleDryIcon from "../assets/images/Do Not Tumble Dry icon.svg";
import doNotWashIcon from "../assets/images/Do Not Wash icon.svg";
import maximumTempIcon from "../assets/images/maximum icon.svg";
import { getCdnBaseUrl } from "./apiConfig.js";

/** Public asset URL from a storage key — requires VITE_CDN_BASE_URL in .env. */
export function cdnUrlFromStorageKey(keyOrPath) {
  const raw = String(keyOrPath || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = getCdnBaseUrl();
  if (!base) return "";
  return `${base}/${raw.replace(/^\//, "")}`;
}

/**
 * Image `src` for a care instruction: full URL, data URL, preset reference, or CDN URL from `iconKey`.
 */
export function resolveCareIconSrc(inst) {
  const iconUrl = String(inst?.iconUrl || "").trim();
  const iconKey = String(inst?.iconKey || "").trim();

  if (/^https?:\/\//i.test(iconUrl) || iconUrl.startsWith("data:")) {
    return iconUrl;
  }

  const keyForPresets = (iconKey || iconUrl).toLowerCase();
  if (keyForPresets) {
    if (
      keyForPresets.includes("do not bleach") ||
      keyForPresets.includes("no-bleach") ||
      keyForPresets.includes("nobleach")
    ) {
      return doNotBleachIcon;
    }
    if (keyForPresets.includes("do not tumble dry") || keyForPresets.includes("tumble")) {
      return doNotTumbleDryIcon;
    }
    if (
      keyForPresets.includes("do not wash") ||
      keyForPresets.includes("no-wash") ||
      keyForPresets.includes("nowash")
    ) {
      return doNotWashIcon;
    }
    if (keyForPresets.includes("maximum")) {
      return maximumTempIcon;
    }
  }

  const fromKey = cdnUrlFromStorageKey(iconKey);
  if (fromKey) return fromKey;

  const fromUrlField = cdnUrlFromStorageKey(iconUrl);
  if (fromUrlField) return fromUrlField;

  return "";
}
