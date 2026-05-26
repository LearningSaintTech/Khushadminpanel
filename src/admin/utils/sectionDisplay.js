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
