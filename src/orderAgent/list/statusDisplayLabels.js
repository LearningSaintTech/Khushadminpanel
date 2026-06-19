/**
 * Human-readable status labels (mirrors backend orderStatusMeta.util.js).
 */
const STATUS_LABEL_OVERRIDES = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  CANCELED: "Canceled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
  RETURN_REQUESTED: "Return requested",
  RETURN_APPROVED: "Return approved",
  RETURN_PICKUP_SCHEDULED: "Return pickup scheduled",
  EXCHANGE_REQUESTED: "Exchange requested",
  EXCHANGE_APPROVED: "Exchange approved",
  EXCHANGE_REJECTED: "Exchange rejected",
  EXCHANGE_PICKUP_SCHEDULED: "Exchange pickup scheduled",
  EXCHANGE_OUT_FOR_PICKUP: "Exchange out for pickup",
  EXCHANGE_PICKED: "Exchange picked",
  EXCHANGE_RECEIVED: "Exchange received",
  EXCHANGE_PROCESSING: "Exchange processing",
  EXCHANGE_SHIPPED: "Exchange shipped",
  EXCHANGE_OUT_FOR_DELIVERY: "Exchange out for delivery",
  EXCHANGE_DELIVERED: "Exchange delivered",
  EXCHANGE_COMPLETED: "Exchange completed",
  NEW: "New",
  READY_TO_SHIP: "Ready to ship",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  RTO: "RTO",
  RTO_DELIVERED: "RTO delivered",
  returnRequested: "Return requested",
  returnApproved: "Return approved",
  pickupScheduled: "Pickup scheduled",
  pickedUp: "Picked up",
  inTransit: "In transit",
  receivedAtWarehouse: "Received at warehouse",
  qualityCheck: "Quality check",
  refundProcessed: "Refund processed",
  returnRejected: "Return rejected",
  exchangeRequested: "Exchange requested",
  exchangeApproved: "Exchange approved",
  exchangeShipped: "Exchange shipped",
  exchangeDelivered: "Exchange delivered",
  exchangeCompleted: "Exchange completed",
  exchangeRejected: "Exchange rejected",
  outForDelivery: "Out for delivery",
};

/** Canonical status key for badges, filters, and labels (Shiprocket "OUT FOR DELIVERY" → OUT_FOR_DELIVERY). */
export function normalizeStatusToken(status) {
  const upper = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!upper) return "";
  if (upper === "CANCELED") return "CANCELLED";
  return upper;
}

/** Remove backend kind suffixes and accidental count suffixes from option labels. */
export function stripStatusMetaSuffix(label) {
  return String(label || "")
    .replace(/\s+\(\d+\)\s*$/, "")
    .replace(/\s+\(line\)\s*$/i, "")
    .replace(/\s+\(request\)\s*$/i, "")
    .trim();
}

export function formatStatusDisplayLabel(value, fallbackLabel = "") {
  const key = normalizeStatusToken(value) || String(value || "").trim();
  if (!key) return "";
  if (STATUS_LABEL_OVERRIDES[key]) return STATUS_LABEL_OVERRIDES[key];
  const cleaned = stripStatusMetaSuffix(fallbackLabel);
  if (cleaned && cleaned !== key) return cleaned;
  if (/^[A-Z0-9_]+$/.test(key)) {
    return key
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function formatStatusWithCount(baseLabel, count, { loading = false } = {}) {
  const clean = stripStatusMetaSuffix(baseLabel);
  if (loading || count == null) return clean;
  return `${clean} (${count})`;
}

/** Dropdown label for exchange/return — kind hint for document statuses only. */
export function formatSectionStatusOption(opt, count, section, { countsLoading = false } = {}) {
  const base = formatStatusDisplayLabel(opt.value, opt.label);
  const withCount = formatStatusWithCount(base, count, { loading: countsLoading });
  if (section !== "exchange" && section !== "returns") return withCount;
  if (opt.kind === "document") {
    return `${base} · request${countsLoading || count == null ? "" : ` (${count})`}`;
  }
  return withCount;
}

const ALL_LABELS = {
  orders: "All statuses",
  exchange: "All exchange statuses",
  returns: "All return statuses",
};

export function defaultAllStatusLabel(section) {
  return ALL_LABELS[section] || ALL_LABELS.orders;
}
