import { formatBindOfferSummary } from "./bindOffer.util";

/** Legacy section discount label */
export function formatSectionLegacyDiscount(discount) {
  const d = discount;
  if (!d || d.value == null || d.value === "" || Number(d.value) <= 0) {
    return null;
  }
  return d.type === "PERCENT" ? `${d.value}%` : `₹${d.value}`;
}

/** Bind offer or legacy discount for list / detail */
export function formatSectionOffer(section) {
  const bindLabel = formatBindOfferSummary(section?.bindOffer);
  if (bindLabel) return bindLabel;
  return formatSectionLegacyDiscount(section?.discount);
}

/** Read app/web order from section API objects (list vs single response shapes) */
export function getSectionDisplayOrders(section) {
  if (!section || typeof section !== "object") {
    return { appOrder: null, webOrder: null };
  }
  const appOrder =
    section.appOrder ??
    section.apporder ??
    section.app_order ??
    null;
  const webOrder =
    section.webOrder ??
    section.weborder ??
    section.web_order ??
    section.webinfo?.webOrder ??
    section.webinfo?.weborder ??
    null;
  return { appOrder, webOrder };
}
