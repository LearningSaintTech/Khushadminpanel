/** Skip compression for files already under ~400 KB */
const SKIP_BELOW_BYTES = 400_000;
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Resize large photos before multipart upload so saves finish within the API timeout.
 * SVG/GIF and small files are returned unchanged.
 */
export async function compressImageForUpload(file) {
  if (!(file instanceof File)) return file;
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image compression failed"))),
        outputType,
        outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
      );
    });

    if (!blob || blob.size >= file.size) return file;

    const ext = outputType === "image/png" ? ".png" : ".jpg";
    const baseName = (file.name || "image").replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}${ext}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function compressImageFilesForUpload(files) {
  const list = Array.from(files || []);
  return Promise.all(list.map(compressImageForUpload));
}
