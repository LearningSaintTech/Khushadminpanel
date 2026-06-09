import {
  formatStatusTokenForUi,
  getDisplayItemStatus,
  lineItemFromOrderItemRow,
  normalizeItemStatusToken,
} from "./orderStatusUtils";

/** Full status list — order used in analytics cards and status dropdowns. */
export const ORDER_STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PICKUP_GENERATED", label: "Pickup generated" },
  { value: "PICKUP_EXCEPTION", label: "Pickup exception" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXCHANGE_REQUESTED", label: "Exchange requested" },
  { value: "EXCHANGE_APPROVED", label: "Exchange approved" },
  { value: "EXCHANGE_REJECTED", label: "Exchange rejected" },
  { value: "EXCHANGE_PICKUP_SCHEDULED", label: "Exchange pickup scheduled" },
  { value: "EXCHANGE_PICKUP_EXCEPTION", label: "Exchange pickup exception" },
  { value: "EXCHANGE_OUT_FOR_PICKUP", label: "Exchange out for pickup" },
  { value: "EXCHANGE_PICKED", label: "Exchange picked" },
  { value: "EXCHANGE_RETURN_IN_TRANSIT", label: "Exchange return in transit" },
  { value: "EXCHANGE_RECEIVED", label: "Exchange received" },
  { value: "EXCHANGE_PROCESSING", label: "Exchange processing" },
  { value: "EXCHANGE_SHIPPED", label: "Exchange shipped" },
  { value: "EXCHANGE_OUT_FOR_DELIVERY", label: "Exchange out for delivery" },
  { value: "EXCHANGE_DELIVERED", label: "Exchange delivered" },
  { value: "EXCHANGE_COMPLETED", label: "Exchange completed" },
];

export const FULFILMENT_STATUS_LABELS = Object.fromEntries(
  ORDER_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

export function getFilteredStatusOptions(exchangeOnly) {
  if (!exchangeOnly) return ORDER_STATUS_OPTIONS;
  return ORDER_STATUS_OPTIONS.filter((opt) => opt.value.startsWith("EXCHANGE_"));
}

export function normalizeAnalyticsStatusKey(status) {
  const k = normalizeItemStatusToken(status);
  if (!k) return "";
  if (k === "CANCELED") return "CANCELLED";
  if (k === "NEW") return "CREATED";
  return k;
}

/** Build a single normalized status → count map from API rows (no double-counting). */
export function buildAnalyticsCountMap(apiCounts = []) {
  const map = new Map();
  for (const row of apiCounts) {
    const key = normalizeAnalyticsStatusKey(row?.status);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + (row.count ?? 0));
  }
  return map;
}

/** Analytics cards for every known status (+ extras from API), always shown. */
export function buildAnalyticsStatusCards(statusOptions, countByStatus) {
  const cards = statusOptions.map((opt) => ({
    status: opt.value,
    label: opt.label,
    count: countByStatus.get(String(opt.value).toUpperCase()) ?? 0,
  }));

  const seen = new Set(statusOptions.map((o) => String(o.value).toUpperCase()));
  for (const [key, count] of countByStatus) {
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      status: key,
      label: FULFILMENT_STATUS_LABELS[key] || formatStatusTokenForUi(key),
      count,
    });
  }
  return cards;
}

/** Raw stored line status — used for filters (not courier/display merge). */
export function getRawLineStatus(item) {
  return normalizeItemStatusToken(
    item?.status || item?.itemStatus || item?.orderStatus || "",
  );
}

/** Line statuses on an order for filtering. */
export function getOrderLineStatusesForFilter(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    const fallback = normalizeItemStatusToken(order?.status || order?.orderStatus || "");
    return fallback ? [fallback] : [];
  }
  return items.map((it) => getRawLineStatus(it)).filter(Boolean);
}

export function orderHasMixedLineStatuses(order) {
  const statuses = getOrderLineStatusesForFilter(order);
  if (statuses.length <= 1) return false;
  return new Set(statuses).size > 1;
}

export function lineStatusMatchesAdminFilter(itemStatus, filterStatus) {
  if (!filterStatus) return true;
  const st = normalizeItemStatusToken(itemStatus);
  const f = normalizeItemStatusToken(filterStatus);
  if (!st || !f) return false;
  if (f === "EXCHANGE") return st.startsWith("EXCHANGE_");
  if (f.startsWith("EXCHANGE_")) return st === f;
  if (f === "DELIVERED") return st === "DELIVERED" || st === "EXCHANGE_DELIVERED";
  return st === f;
}

/**
 * Strict order-list status rules (uses raw API line status):
 * - Mixed tab: 2+ different line statuses; optional status matches any line.
 * - Otherwise with status: every line must match; mixed orders excluded.
 */
export function orderMatchesStatusListFilter(
  order,
  { statusFilter = "", lineConsistencyFilter = "" } = {},
) {
  const mixed = orderHasMixedLineStatuses(order);
  const lineStatuses = getOrderLineStatusesForFilter(order);

  if (lineConsistencyFilter === "mixed") {
    if (!mixed) return false;
    if (!statusFilter) return true;
    return lineStatuses.some((st) => lineStatusMatchesAdminFilter(st, statusFilter));
  }

  if (statusFilter) {
    if (mixed) return false;
    return (
      lineStatuses.length > 0 &&
      lineStatuses.every((st) => lineStatusMatchesAdminFilter(st, statusFilter))
    );
  }

  if (lineConsistencyFilter === "uniform") {
    return !mixed;
  }

  return true;
}

/** Only send consistency to API when user picks Mixed / Same status tabs. */
export function getEffectiveItemStatusConsistency(lineConsistencyFilter) {
  return lineConsistencyFilter || "";
}

export function orderItemRowMatchesStatusFilter(row, filterStatus) {
  if (!filterStatus) return true;
  const line = lineItemFromOrderItemRow(row) || row?.item || row || {};
  const st = line?.status || row?.itemStatus || "";
  return lineStatusMatchesAdminFilter(st, filterStatus);
}

export function summarizeOrderLineStatuses(order) {
  const counts = {};
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    const st = normalizeItemStatusToken(order?.status || order?.orderStatus || "");
    if (st) counts[st] = 1;
  } else {
    for (const it of items) {
      const st = normalizeItemStatusToken(getDisplayItemStatus(it) || it?.status || "");
      if (!st) continue;
      counts[st] = (counts[st] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([st, n]) => `${n}× ${FULFILMENT_STATUS_LABELS[st] || st.replace(/_/g, " ")}`)
    .join(" · ");
}
