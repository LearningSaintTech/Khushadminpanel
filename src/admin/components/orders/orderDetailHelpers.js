import {
  getDisplayItemStatus,
  isExchangeLineItem,
  isExchangeOrderEntry,
  isExchangeStatus,
  normalizeItemStatusToken,
} from "./orderStatusUtils";

const itemLineKey = (it) => String(it?.itemId || it?._id || "");

/** Unwrap getSingleOrder API response (handles nested `data` wrappers). */
export function normalizeOrderDetailPayload(res) {
  if (!res) return null;
  let payload = res?.data ?? res;
  if (
    payload &&
    typeof payload === "object" &&
    payload.data &&
    typeof payload.data === "object" &&
    (payload.data.orderId || payload.data._id || Array.isArray(payload.data.items))
  ) {
    payload = payload.data;
  }
  if (!payload || typeof payload !== "object") return null;

  const items =
    payload.items ?? payload.orderItems ?? payload.lineItems ?? null;
  if (!Array.isArray(payload.items) && Array.isArray(items)) {
    return { ...payload, items };
  }
  return payload;
}

/** Merge list-row item snapshots when detail API omits exchanges / variant fields. */
export function mergeOrderItemsFromListSnapshot(detail, listOrder) {
  if (!detail || !listOrder) return detail;
  const listItems = Array.isArray(listOrder.items) ? listOrder.items : [];
  if (!listItems.length) return detail;

  const listByKey = new Map();
  listItems.forEach((it) => {
    const k = itemLineKey(it);
    if (k) listByKey.set(k, it);
  });

  const detailItems = Array.isArray(detail.items) ? detail.items : [];
  const mergedItems = detailItems.length
    ? detailItems.map((dit) => {
        const lit = listByKey.get(itemLineKey(dit));
        if (!lit) return dit;
        const detailStatus = normalizeItemStatusToken(dit.status || "");
        const listStatus = normalizeItemStatusToken(lit.status || "");
        const resolvedStatus =
          isExchangeStatus(detailStatus) ? detailStatus
          : isExchangeStatus(listStatus) ? listStatus
          : getDisplayItemStatus({ ...lit, ...dit, exchanges: dit.exchanges?.length ? dit.exchanges : lit.exchanges })
            || dit.status || lit.status;
        return {
          ...lit,
          ...dit,
          exchanges:
            Array.isArray(dit.exchanges) && dit.exchanges.length
              ? dit.exchanges
              : lit.exchanges,
          status: resolvedStatus || dit.status || lit.status,
          variant: dit.variant || lit.variant,
          shiprocket: dit.shiprocket || lit.shiprocket,
        };
      })
    : listItems;

  return { ...listOrder, ...detail, items: mergedItems };
}

/** Keep exchange lines when viewing exchange orders; never drop all items. */
export function resolveItemsForExchangeDetailView(orderPayload) {
  const items = Array.isArray(orderPayload?.items) ? orderPayload.items : [];
  if (!items.length) return items;

  const exchangeLines = items.filter((it) => isExchangeLineItem(it));
  if (exchangeLines.length > 0) return exchangeLines;

  if (isExchangeOrderEntry(orderPayload)) return items;

  return items;
}
