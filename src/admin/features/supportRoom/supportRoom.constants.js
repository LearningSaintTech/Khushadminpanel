export const SUPPORT_ISSUES = [
  {
    id: "address",
    label: "Wrong address / phone / name / pincode",
    description: "Correct shipping contact or address on the order",
  },
  {
    id: "cancel",
    label: "Cancel after processing",
    description: "Cancel line item(s) with policy reason + support note",
  },
  {
    id: "status",
    label: "Status incorrectly set",
    description: "Correct a line status with mandatory reason",
  },
  {
    id: "return",
    label: "Create return on behalf",
    description: "Request only, or schedule pickup via same approve + carrier flow as Orders",
  },
  {
    id: "exchange",
    label: "Create / fix exchange",
    description: "Request only, or schedule pickup via same approve + carrier flow as Orders",
  },
  {
    id: "sync",
    label: "Sync courier tracking",
    description: "Pull latest Delhivery / Shadowfax tracking (Shiprocket: phase 2)",
  },
  {
    id: "refund",
    label: "Send refund request",
    description:
      "Queue on Refunds tab — payout only after Approve (Razorpay / wallet / other)",
  },
];

export const LINE_STATUS_OPTIONS = [
  "CREATED",
  "CONFIRMED",
  "STITCHING",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "RTO_IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_PICKUP_SCHEDULED",
  "EXCHANGE_REQUESTED",
  "EXCHANGE_APPROVED",
  "EXCHANGE_REJECTED",
  "EXCHANGE_PICKUP_SCHEDULED",
  "EXCHANGE_OUT_FOR_PICKUP",
  "EXCHANGE_PICKED",
  "EXCHANGE_RECEIVED",
  "EXCHANGE_PROCESSING",
  "EXCHANGE_SHIPPED",
  "EXCHANGE_OUT_FOR_DELIVERY",
  "EXCHANGE_DELIVERED",
  "EXCHANGE_COMPLETED",
];

export const RETURN_REASON_OPTIONS = [
  { key: "SIZE", label: "Size-related issues" },
  { key: "COLOR", label: "Color-related issues" },
  { key: "MANUFACTURING_DEFECT", label: "Manufacturing defects" },
  { key: "WRONG_PRODUCT", label: "Wrong product delivered" },
  { key: "LATE_DELIVERY", label: "Late delivery" },
  { key: "CHANGED_MIND", label: "Changed of mind" },
  { key: "DESIGN_MISMATCH", label: "Design mismatch" },
  { key: "PACKAGING_ISSUE", label: "Packaging issues" },
  { key: "DAMAGE", label: "Damage" },
];

const RECENT_KEY = "supportRoom.recentCases";

export function loadRecentCases() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function pushRecentCase(entry) {
  const next = [
    entry,
    ...loadRecentCases().filter((c) => c.orderId !== entry.orderId),
  ].slice(0, 12);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function getBackendErrorMessage(err, fallback = "Something went wrong") {
  const data = err?.response?.data ?? {};
  return (
    data?.message ||
    (typeof err?.message === "string" ? err.message : null) ||
    fallback
  );
}
