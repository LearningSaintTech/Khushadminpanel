/** Community designer attribution: { designedBy: "Priya Sharma", designedById: "..." } */
export function designedByMeta(item) {
  const raw = item?.designedBy ?? item?.designed_by ?? item?.designer ?? null;

  let id = String(item?.designedById || item?.designerId || "");
  let name = "";

  if (typeof raw === "string" && raw.trim()) {
    name = raw.trim();
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    id =
      id ||
      String(
        raw._id || raw.id || raw.userId || raw.designerId || raw.designedById || "",
      );
    name = String(raw.name || raw.username || raw.fullName || raw.label || "");
  }

  if (!name) {
    name = String(item?.designedByName || item?.designerName || "");
  }

  return { id, name, raw };
}

/** Name + id from a designer inventory row (or catalog form) for POST /items/create. */
export function designedByFieldsFromSource(source) {
  if (!source || typeof source !== "object") {
    return { designedBy: "", designedById: "" };
  }
  const nested = source.designer && typeof source.designer === "object" ? source.designer : {};
  const designedBy = String(
    (typeof source.designedBy === "string" && source.designedBy.trim()) ||
      source.designerName ||
      nested.name ||
      "",
  ).trim();
  const designedById = String(
    source.designedById ||
      source.designerId ||
      nested._id ||
      nested.id ||
      (typeof source.userId === "object" ? source.userId?._id : source.userId) ||
      "",
  ).trim();
  return { designedBy, designedById };
}

export function logDesignedByFromItems(label, items) {
  const list = Array.isArray(items) ? items : [];
  console.log(`[${label}] designedBy`, {
    count: list.length,
    rows: list.map((item) => ({
      _id: item?._id,
      productId: item?.productId,
      name: item?.name,
      designedBy: designedByMeta(item),
      rawDesignedBy: item?.designedBy,
      rawDesignedById: item?.designedById,
    })),
  });
}
