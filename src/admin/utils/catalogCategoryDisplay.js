export function normalizeIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "",
      )
      .filter(Boolean);
  }
  if (typeof value === "object" && value._id) return [String(value._id)];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function parseCatalogCategoriesResponse(res) {
  const data = res?.data?.data || res?.data || {};
  const list = data.categories || data;
  return Array.isArray(list) ? list : [];
}

export function parseCatalogSubcategoriesResponse(res) {
  const data = res?.data?.data || res?.data || {};
  const list = data.subcategories || data.subCategories || data;
  return Array.isArray(list) ? list : [];
}

export function catalogCategoryLabel(cat) {
  return String(cat?.name || cat?.title || cat?.categoryName || "Category").trim();
}

export function catalogSubcategoryLabel(sub) {
  return String(sub?.name || sub?.title || sub?.subcategoryName || "Subcategory").trim();
}

/** Group secondary subcategory ids under their parent category (using loaded sub lists). */
export function groupSecondarySubsByCategory(secondaryCategoryIds, secondarySubcategoryIds, subsByCategory) {
  const result = [];
  for (const catId of secondaryCategoryIds) {
    const subs = subsByCategory[catId] || [];
    const subIds = new Set(subs.map((s) => String(s._id)));
    const picked = secondarySubcategoryIds.filter((sid) => subIds.has(String(sid)));
    result.push({ categoryId: catId, subcategoryIds: picked });
  }
  return result;
}
