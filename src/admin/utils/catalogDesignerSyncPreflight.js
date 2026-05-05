/** All non-empty SKU strings on an inventory item (designer or catalog). */
export function variantSkuSet(item) {
  const set = new Set();
  for (const v of item?.variants || []) {
    for (const s of v?.sizes || []) {
      const sku = String(s?.sku || "").trim();
      if (sku) set.add(sku);
    }
  }
  return set;
}

/**
 * Catalog SKUs that do not appear anywhere on the designer document.
 * Matches server checks like “designer row is missing catalog SKU(s)…”.
 */
export function catalogSkusMissingOnDesigner(designerItem, catalogItem) {
  const designerSkus = variantSkuSet(designerItem);
  const missing = [];
  for (const v of catalogItem?.variants || []) {
    const color = String(v?.color?.name || "").trim() || "—";
    for (const sz of v?.sizes || []) {
      const sku = String(sz?.sku || "").trim();
      if (!sku || designerSkus.has(sku)) continue;
      missing.push({ color, sku });
    }
  }
  return missing;
}

export function summarizeMissingCatalogSkus(missing, opts = {}) {
  const max = typeof opts.maxRows === "number" ? opts.maxRows : 18;
  if (!missing?.length) return "";
  const head = missing.slice(0, max);
  const lines = head.map((m) => `• Color “${m.color}”: ${m.sku}`);
  const tail =
    missing.length > max ? `\n… and ${missing.length - max} more` : "";
  return `${lines.join("\n")}${tail}`;
}
