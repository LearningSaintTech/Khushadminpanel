/** Client-side upload rules for designer inventory media (format + size only; no resolution checks). */

export const VARIANT_IMAGE_ACCEPT = ".webp,image/webp";

export const VARIANT_VIDEO_ACCEPT = ".mp4,video/mp4";

export const VARIANT_MEDIA_ACCEPT = `${VARIANT_IMAGE_ACCEPT},${VARIANT_VIDEO_ACCEPT}`;

/** Images must be strictly under 1 MB. */
export const VARIANT_IMAGE_MAX_BYTES = 1024 * 1024;

/** Product videos: MP4 (H.264), between 2 MB and 4 MB inclusive. */
export const VARIANT_VIDEO_MIN_BYTES = 2 * 1024 * 1024;
export const VARIANT_VIDEO_MAX_BYTES = 4 * 1024 * 1024;

export const MEASURE_IMAGE_ACCEPT = VARIANT_IMAGE_ACCEPT;
export const MEASURE_IMAGE_MAX_BYTES = VARIANT_IMAGE_MAX_BYTES;

export const CARE_ICON_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml";
export const CARE_ICON_MAX_BYTES = 2 * 1024 * 1024;

const WEBP_MIME = "image/webp";
const WEBP_EXT_RE = /\.webp$/i;

const MP4_MIME = "video/mp4";
const MP4_EXT_RE = /\.mp4$/i;

const CARE_ICON_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);
const CARE_ICON_EXT_RE = /\.(jpe?g|png|webp|svg)$/i;

export function formatUploadSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatUploadSizeLimit(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function fileMime(file) {
  return String(file?.type || "").toLowerCase().trim();
}

function fileName(file) {
  return String(file?.name || "file").trim() || "file";
}

export function isInventoryImageFile(file) {
  if (!(file instanceof File)) return false;
  const mime = fileMime(file);
  if (mime === WEBP_MIME) return true;
  return WEBP_EXT_RE.test(fileName(file));
}

export function isInventoryVideoFile(file) {
  if (!(file instanceof File)) return false;
  const mime = fileMime(file);
  if (mime === MP4_MIME) return true;
  return MP4_EXT_RE.test(fileName(file));
}

export function isCareIconFile(file) {
  if (!(file instanceof File)) return false;
  const mime = fileMime(file);
  if (CARE_ICON_MIME.has(mime)) return true;
  return CARE_ICON_EXT_RE.test(fileName(file));
}

function validateImageSize(file) {
  if (file.size < VARIANT_IMAGE_MAX_BYTES) return null;
  return `"${fileName(file)}": image must be under 1 MB (selected ${formatUploadSize(file.size)}). Use WebP only.`;
}

function validateVideoSize(file) {
  const name = fileName(file);
  const size = formatUploadSize(file.size);
  if (file.size < VARIANT_VIDEO_MIN_BYTES) {
    return `"${name}": video must be between 2 MB and 4 MB (selected ${size}). Use MP4 (H.264).`;
  }
  if (file.size > VARIANT_VIDEO_MAX_BYTES) {
    return `"${name}": video must be between 2 MB and 4 MB (selected ${size}). Use MP4 (H.264).`;
  }
  return null;
}

export function validateVariantMediaFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, error: "Invalid file." };
  }

  const isVideo = isInventoryVideoFile(file);
  const isImage = isInventoryImageFile(file);

  if (!isVideo && !isImage) {
    return {
      ok: false,
      error: `"${fileName(file)}": use WebP for images or MP4 (H.264) for videos.`,
    };
  }

  if (isImage) {
    const sizeError = validateImageSize(file);
    if (sizeError) return { ok: false, error: sizeError };
    return { ok: true };
  }

  const sizeError = validateVideoSize(file);
  if (sizeError) return { ok: false, error: sizeError };
  return { ok: true };
}

export function validateMeasureImageFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, error: "Invalid file." };
  }
  if (!isInventoryImageFile(file)) {
    return {
      ok: false,
      error: `"${fileName(file)}": measurement images must be WebP only.`,
    };
  }
  const sizeError = validateImageSize(file);
  if (sizeError) return { ok: false, error: sizeError };
  return { ok: true };
}

export function validateCareIconFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, error: "Invalid file." };
  }
  if (!isCareIconFile(file)) {
    return {
      ok: false,
      error: `"${fileName(file)}": care icons must be JPG, PNG, WebP, or SVG.`,
    };
  }
  if (file.size > CARE_ICON_MAX_BYTES) {
    return {
      ok: false,
      error: `"${fileName(file)}": icon must be ${formatUploadSizeLimit(CARE_ICON_MAX_BYTES)} or smaller (selected ${formatUploadSize(file.size)}).`,
    };
  }
  return { ok: true };
}

export function partitionFilesByValidator(files, validator) {
  const accepted = [];
  const errors = [];
  for (const file of Array.from(files || [])) {
    const result = validator(file);
    if (result.ok) accepted.push(file);
    else errors.push(result.error);
  }
  return { accepted, errors };
}

export const VARIANT_MEDIA_UPLOAD_HINT =
  "Images: WebP only, under 1 MB. Videos: MP4 (H.264), 2–4 MB (~10 sec).";

export const MEASURE_IMAGE_UPLOAD_HINT =
  "WebP only — under 1 MB per image.";

export const CARE_ICON_UPLOAD_HINT =
  "JPG, PNG, WebP, or SVG — max 2 MB.";
