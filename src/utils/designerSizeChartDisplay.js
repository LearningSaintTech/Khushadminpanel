/**
 * Normalize designer/catalog item size chart data for UI (API may return `sizeCharts` and/or legacy `sizeChart`).
 */

/** Encode characters that break `<img src>` when filenames contain spaces (e.g. `photo (1).avif`). */
export function safeImageUrl(url) {
  if (url == null || typeof url !== "string") return "";
  const s = url.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return s;
  return s.replace(/ /g, "%20");
}

function sideHasContent(side) {
  if (!side || typeof side !== "object") return false;
  const h = side.headers;
  const r = side.rows;
  const m = side.measureImage;
  return (
    (Array.isArray(h) && h.length > 0) ||
    (Array.isArray(r) && r.length > 0) ||
    (Array.isArray(m) && m.length > 0)
  );
}

/**
 * @returns {{ in: object|null, cm: object|null }}
 */
export function getDisplaySizeChartTables(item) {
  const sc = item?.sizeCharts;
  if (sc && (sideHasContent(sc.in) || sideHasContent(sc.cm))) {
    return {
      in: sideHasContent(sc.in) ? sc.in : null,
      cm: sideHasContent(sc.cm) ? sc.cm : null,
    };
  }
  const leg = item?.sizeChart;
  if (!sideHasContent(leg)) return { in: null, cm: null };
  const u = leg.unit === "cm" ? "cm" : "in";
  return {
    in: u === "in" ? leg : null,
    cm: u === "cm" ? leg : null,
  };
}

/** True if item has any size chart table and/or measurement images (dual or legacy). */
export function itemHasSizeChartContent(item) {
  const { in: inch, cm } = getDisplaySizeChartTables(item);
  if (inch || cm) return true;
  const leg = item?.sizeChart;
  return Boolean(
    leg &&
      Array.isArray(leg.measureImage) &&
      leg.measureImage.some((im) => (typeof im === "string" ? im : im?.url))
  );
}

export function measurementCell(row, headerKey) {
  const m = row?.measurements;
  if (m instanceof Map) return m.get(headerKey);
  if (m && typeof m === "object") return m[headerKey];
  return undefined;
}

function mapDesignerRowsToForm(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const measurements = r?.measurements;
    const asObj =
      measurements instanceof Map
        ? Object.fromEntries(measurements.entries())
        : measurements && typeof measurements === "object"
          ? measurements
          : {};
    return { size: r?.size || "", measurements: asObj };
  });
}

function mapDesignerMeasureImagesToFormUrls(measureImage) {
  if (!Array.isArray(measureImage)) return [];
  return measureImage.map((img) => (typeof img === "string" ? img : img?.url || "")).filter(Boolean);
}

/**
 * Map designer inventory API doc → ItemForm-like `sizeCharts` (URLs as strings in measureImages).
 */
export function designerItemToFormSizeCharts(d) {
  const empty = () => ({ headers: [], rows: [], measureImages: [] });
  const sc = d?.sizeCharts;
  if (sc && typeof sc === "object" && (sc.in || sc.cm)) {
    return {
      in: {
        headers: Array.isArray(sc.in?.headers) ? sc.in.headers : [],
        rows: mapDesignerRowsToForm(sc.in?.rows),
        measureImages: mapDesignerMeasureImagesToFormUrls(sc.in?.measureImage),
      },
      cm: {
        headers: Array.isArray(sc.cm?.headers) ? sc.cm.headers : [],
        rows: mapDesignerRowsToForm(sc.cm?.rows),
        measureImages: mapDesignerMeasureImagesToFormUrls(sc.cm?.measureImage),
      },
    };
  }
  const leg = d?.sizeChart;
  const u = leg?.unit === "cm" ? "cm" : "in";
  const one = {
    headers: Array.isArray(leg?.headers) ? leg.headers : [],
    rows: mapDesignerRowsToForm(leg?.rows),
    measureImages: mapDesignerMeasureImagesToFormUrls(leg?.measureImage),
  };
  return {
    in: u === "in" ? one : empty(),
    cm: u === "cm" ? one : empty(),
  };
}
