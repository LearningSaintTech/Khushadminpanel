export const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

export function variantMediaUrl(img) {
  if (img == null) return "";
  if (typeof img === "string") return img.trim();
  if (typeof img?.url === "string") return img.url.trim();
  return "";
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
