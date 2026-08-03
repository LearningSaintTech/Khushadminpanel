export const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

export function variantMediaUrl(img) {
  if (img == null) return "";
  if (typeof img === "string") return img.trim();
  if (typeof img?.url === "string") return img.url.trim();
  return "";
}

/** Prefer explicit url; if missing, build CDN URL from imageKey/key. */
export function resolveVariantMediaUrl(img, cdnBase = "") {
  const url = variantMediaUrl(img);
  if (url) return url;
  const key =
    img && typeof img === "object"
      ? String(img.imageKey || img.key || "").trim()
      : "";
  if (!key) return "";
  const base = String(cdnBase || "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/${key.replace(/^\//, "")}`;
}

/**
 * Normalize a designer/catalog media slot for publish/sync.
 * Keeps imageKey-only rows when a CDN base (or existing url) can resolve a display URL,
 * or when imageKey is present even without CDN (backend can rebuild via buildAssetUrl).
 */
export function normalizeVariantMediaSlot(im, { cdnBase = "" } = {}) {
  if (im == null) return null;
  if (typeof File !== "undefined" && im instanceof File) return im;
  if (typeof Blob !== "undefined" && im instanceof Blob && !(im instanceof File)) return im;

  if (typeof im === "string") {
    const url = im.trim();
    if (!url) return null;
    return {
      url,
      imageKey: "",
      type: inferVariantMediaType(url),
      thumbnail: "",
    };
  }

  if (typeof im !== "object") return null;

  const imageKey = String(im.imageKey || im.key || "").trim();
  const url = resolveVariantMediaUrl(im, cdnBase);
  if (!url && !imageKey) return null;

  return {
    url: url || "",
    imageKey,
    type: im.type || inferVariantMediaType(im),
    thumbnail: im.thumbnail != null ? String(im.thumbnail) : "",
    ...(im.order != null ? { order: im.order } : {}),
  };
}

export function inferVariantMediaTypeFromUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "image";
  return VIDEO_EXT_RE.test(u) ? "video" : "image";
}

/** Resolve `"image"` | `"video"` from API fields, MIME type, URL, or storage key extension. */
export function inferVariantMediaType(img) {
  if (img == null) return "image";
  if (typeof File !== "undefined" && img instanceof File) {
    const t = String(img.type || "");
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("image/")) return "image";
    return VIDEO_EXT_RE.test(String(img.name || "")) ? "video" : "image";
  }
  if (typeof Blob !== "undefined" && img instanceof Blob) {
    const t = String(img.type || "");
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("image/")) return "image";
    return "image";
  }
  if (typeof img === "string") return inferVariantMediaTypeFromUrl(img);
  if (typeof img === "object") {
    const explicit = String(img.type || "").toLowerCase();
    if (explicit === "video" || explicit === "image") return explicit;
    const u = variantMediaUrl(img);
    if (u) return inferVariantMediaTypeFromUrl(u);
    const key = String(img.imageKey || img.key || "").trim();
    if (key) return inferVariantMediaTypeFromUrl(key);
  }
  return "image";
}

export function isVariantVideoMedia(img) {
  return inferVariantMediaType(img) === "video";
}

/** Prefer a raster image for catalog hero; skip variant slots that are video-only. */
export function firstCatalogHeroImageUrl(item) {
  const thumb = item?.thumbnail;
  if (thumb) return String(thumb).trim();
  const imgs = item?.variants?.[0]?.images;
  if (!Array.isArray(imgs) || !imgs.length) return "";
  const firstStill = imgs.find((im) => !isVariantVideoMedia(im));
  return variantMediaUrl(firstStill || imgs[0]);
}
