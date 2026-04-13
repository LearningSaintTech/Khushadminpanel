/**
 * Display helpers for designer inventory API rows (`productType` = name, `productTypeCode` = CATEGORY code).
 */

/** Compact line for tables / dashboard: "Name [CODE] / Fit" */
export function formatProductTypeAndFit(row) {
  const name = row?.productType || "—";
  const code = row?.productTypeCode;
  const fit = row?.fitType || "—";
  const productPart = code ? `${name} [${code}]` : name;
  return `${productPart} / ${fit}`;
}

/** Detail / modal line with parentheses for code: "Name (CODE) / Fit" */
export function formatProductTypeAndFitDetail(row) {
  const name = row?.productType || "—";
  const code = row?.productTypeCode;
  const fit = row?.fitType || "—";
  const productPart = code ? `${name} (${code})` : name;
  return `${productPart} / ${fit}`;
}
