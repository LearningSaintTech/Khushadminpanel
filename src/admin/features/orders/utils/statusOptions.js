/** Status option sets for forward / return / exchange admin actions. */

export const FULFILLMENT_STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "STITCHING", label: "Stitching" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RTO_IN_TRANSIT", label: "RTO in transit" },
];

export const EXCHANGE_STATUS_OPTIONS = [
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

export const RETURN_STATUS_OPTIONS = [
  { value: "RETURN_REQUESTED", label: "Return requested" },
  { value: "RETURN_APPROVED", label: "Return approved" },
  { value: "RETURN_PICKUP_SCHEDULED", label: "Return pickup scheduled" },
  { value: "RETURNED", label: "Returned" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "CANCELLED", label: "Cancelled / pickup cancelled" },
];

export const ALL_STATUS_OPTIONS = [
  ...FULFILLMENT_STATUS_OPTIONS,
  ...EXCHANGE_STATUS_OPTIONS,
  ...RETURN_STATUS_OPTIONS.filter((o) => o.value !== "CANCELLED"),
];

export function isExchangeStatus(value) {
  return String(value || "")
    .toUpperCase()
    .startsWith("EXCHANGE_");
}

export function isReturnStatus(value) {
  const s = String(value || "").toUpperCase();
  return (
    s.startsWith("RETURN_") || s === "RETURNED" || s === "REFUNDED"
  );
}

/**
 * @param {{ exchangeOnly?: boolean, returnOnly?: boolean, activeFlow?: string }} mode
 */
export function getStatusChangeOptions(mode = {}) {
  const { exchangeOnly, returnOnly, activeFlow } = mode;
  if (exchangeOnly || activeFlow === "EXCHANGE") return EXCHANGE_STATUS_OPTIONS;
  if (returnOnly || activeFlow === "RETURN") return RETURN_STATUS_OPTIONS;
  return FULFILLMENT_STATUS_OPTIONS;
}

/**
 * Ensure current status appears even if outside the filtered set.
 */
export function statusOptionsForItem(item, mode = {}) {
  const options = getStatusChangeOptions({
    ...mode,
    activeFlow: mode.activeFlow || item?.activeFlow || item?.afterSales?.type,
  });
  const current = String(item?.status || "").toUpperCase();
  if (!current) return options;
  if (options.some((opt) => opt.value === current)) return options;
  const fromAll = ALL_STATUS_OPTIONS.find((opt) => opt.value === current);
  return [
    fromAll || { value: current, label: current.replace(/_/g, " ") },
    ...options,
  ];
}
