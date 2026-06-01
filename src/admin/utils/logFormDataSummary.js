/**
 * Debug helper: log FormData keys without dumping large binary bodies.
 * @param {FormData} formData
 * @param {string} [label]
 */
export function logFormDataSummary(formData, label = "FormData") {
  if (!formData || typeof formData.entries !== "function") {
    console.warn(`[${label}] not FormData`, formData);
    return;
  }
  const entries = [];
  for (const [key, value] of formData.entries()) {
    if (typeof File !== "undefined" && value instanceof File) {
      entries.push({
        key,
        type: "File",
        name: value.name,
        size: value.size,
        mime: value.type || "",
      });
    } else if (typeof Blob !== "undefined" && value instanceof Blob) {
      entries.push({ key, type: "Blob", size: value.size });
    } else {
      const str = String(value ?? "");
      entries.push({
        key,
        value: str.length > 240 ? `${str.slice(0, 240)}… (${str.length} chars)` : str,
      });
    }
  }
  console.log(`[${label}] ${entries.length} field(s)`, entries);
}
