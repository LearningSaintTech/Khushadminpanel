/** CDN icon/image URL from API fields (iconUrl, iconKey, legacy icon). */
export function resolveSubcategoryIconUrl(sub) {
  if (!sub) return "";

  if (typeof sub.iconUrl === "string" && sub.iconUrl.trim()) {
    return sub.iconUrl.trim();
  }
  if (typeof sub.icon === "string" && sub.icon.trim()) {
    return sub.icon.trim();
  }
  if (sub.icon?.url && String(sub.icon.url).trim()) {
    return String(sub.icon.url).trim();
  }

  const iconKey = sub.iconKey;
  if (typeof iconKey === "string" && iconKey.trim()) {
    const key = iconKey.trim();
    if (/^https?:\/\//i.test(key)) return key;

    const ref = sub.imageUrl || sub.iconUrl;
    if (typeof ref === "string" && ref.includes("://")) {
      const origin = ref.match(/^(https?:\/\/[^/]+)/)?.[1];
      if (origin) return `${origin}/${key.replace(/^\//, "")}`;
    }
    return `https://d3bi5d5em13bi2.cloudfront.net/${key.replace(/^\//, "")}`;
  }

  return "";
}

export function normalizeCategoryId(sub) {
  if (!sub) return null;
  const raw = sub.categoryId ?? sub.parentCategory ?? sub.category;
  if (raw == null) return null;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const id = raw._id ?? raw.id;
  return id != null ? String(id) : null;
}

/** Debug: log every FormData entry (files show name/size/type). */
export function logSubcategoryFormData(label, formData) {
  if (!formData || typeof formData.entries !== "function") {
    console.warn(`[Subcategory] ${label}: invalid FormData`, formData);
    return;
  }
  console.group(`[Subcategory] FormData — ${label}`);
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(key, {
        fileName: value.name,
        size: value.size,
        type: value.type,
      });
    } else {
      console.log(key, value);
    }
  }
  console.groupEnd();
}

/** Parse update/create API body (apiConnector returns response.data). */
export function parseSubcategoryFromApiResponse(res) {
  const payload = res?.data ?? res;
  if (payload && typeof payload === "object" && payload._id) return payload;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return null;
}

/**
 * Build PATCH/POST multipart body for subcategory.
 * @param {object} form - form state with iconFile, image, flags, etc.
 * @param {{ sortOrder?: string, includeSortOrder?: boolean }} options
 */
export function buildSubcategoryFormData(form, options = {}) {
  const formData = new FormData();
  formData.append("name", String(form.name || "").trim());
  formData.append("description", String(form.description || "").trim());
  formData.append("isActive", String(Boolean(form.isActive)));
  formData.append("isNavbar", String(Boolean(form.showInNavbar ?? form.isNavbar)));
  formData.append("isFooter", String(Boolean(form.isFooter)));

  if (form.iconFile) {
    formData.append("icon", form.iconFile);
    console.log("[Subcategory] buildFormData: icon file attached", form.iconFile.name);
  } else {
    console.warn(
      "[Subcategory] buildFormData: no iconFile — icon field will NOT be sent (existing icon kept on server)",
    );
  }

  if (form.image) {
    formData.append("image", form.image);
    console.log("[Subcategory] buildFormData: image file attached", form.image.name);
  }

  if (options.includeSortOrder && options.sortOrder != null) {
    formData.append("sortOrder", String(options.sortOrder).trim());
  }

  return formData;
}
