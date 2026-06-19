/** Absolute list routes — sidebar + analytics must use these so ?status= syncs reliably. */
export const ORDER_AGENT_SECTION_PATHS = {
  orders: "/order-agent/orders",
  exchange: "/order-agent/exchange",
  returns: "/order-agent/returns",
  stale: "/order-agent/stale-orders",
  orderProcess: "/order-agent/order-process",
  analytics: "/order-agent/analytics",
};

/** Plain sidebar links (order in layout: Stale → … → Analytics). */
export const OTHER_STATUS_VALUE = "OTHER";
export const ORDER_AGENT_STALE_TAB = {
  key: "stale",
  label: "Stale orders",
  path: ORDER_AGENT_SECTION_PATHS.stale,
  icon: "stale",
};

export const ORDER_AGENT_ANALYTICS_TAB = {
  key: "analytics",
  label: "Analytics",
  path: ORDER_AGENT_SECTION_PATHS.analytics,
  icon: "analytics",
};

/** Order processing queue — PROCESSING lines. */
export const ORDER_AGENT_PROCESS_TAB = {
  key: "order-process",
  label: "Order process",
  path: ORDER_AGENT_SECTION_PATHS.orderProcess,
  icon: "process",
  status: "PROCESSING",
};

/** Cancelled orders — top-level tab on orders list. */
export const ORDER_AGENT_CANCEL_TAB = {
  key: "cancel",
  label: "Cancel",
  filter: "status",
  value: "CANCELLED",
};

/** Carrier tabs (after Stale orders in sidebar). */
export const ORDER_AGENT_SHIPPING_NAV = [
  { key: "shiprocket", label: "Shiprocket", filter: "provider", value: "SHIPROCKET" },
  { key: "delhivery", label: "Delhivery", filter: "provider", value: "DELHIVERY" },
  { key: "shadowfax", label: "Shadowfax", filter: "provider", value: "SHADOWFAX" },
  { key: "self-shipping", label: "Self shipping", filter: "provider", value: "SELF_SHIPPING" },
];

/** All orders-route quick filters (Cancel + carriers) — used for active-state logic. */
export const ORDER_AGENT_FLAT_ORDER_TABS = [
  ORDER_AGENT_CANCEL_TAB,
  ...ORDER_AGENT_SHIPPING_NAV,
];

/** Static preview rows — replaced when APIs are wired. */
export const STATIC_ORDER_ROWS = [
  { id: "1", orderId: "ORD-24001", sku: "KH-TSH-001", customer: "Riya Sharma", city: "Mumbai", status: "CONFIRMED", payment: "PREPAID", shippingProvider: "SHIPROCKET", updatedAt: "2026-06-17T09:12:00Z" },
  { id: "2", orderId: "ORD-24002", sku: "KH-JNS-014", customer: "Amit Patel", city: "Ahmedabad", status: "PROCESSING", payment: "COD", shippingProvider: "DELHIVERY", updatedAt: "2026-06-17T08:45:00Z" },
  { id: "3", orderId: "ORD-24003", sku: "KH-DRS-008", customer: "Neha Singh", city: "Delhi", status: "SHIPPED", payment: "PREPAID", shippingProvider: "SHADOWFAX", updatedAt: "2026-06-16T18:20:00Z" },
  { id: "4", orderId: "ORD-24004", sku: "KH-TOP-022", customer: "Karan Mehta", city: "Pune", status: "OUT_FOR_DELIVERY", payment: "COD", shippingProvider: "SELF_SHIPPING", updatedAt: "2026-06-16T14:05:00Z" },
  { id: "5", orderId: "ORD-24005", sku: "KH-SHD-003", customer: "Priya Nair", city: "Bengaluru", status: "DELIVERED", payment: "PREPAID", shippingProvider: "SHIPROCKET", updatedAt: "2026-06-15T11:30:00Z" },
  { id: "6", orderId: "ORD-24006", sku: "KH-ACC-011", customer: "Vikram Rao", city: "Hyderabad", status: "CANCELLED", payment: "PREPAID", shippingProvider: "DELHIVERY", updatedAt: "2026-06-15T09:00:00Z" },
  { id: "7", orderId: "ORD-24007", sku: "KH-RTO-001", customer: "Carrier Raw", city: "Delhi", status: "RTO DELIVERED", payment: "COD", shippingProvider: "DELHIVERY", updatedAt: "2026-06-14T16:00:00Z" },
];

export const STATIC_EXCHANGE_ROWS = [
  { id: "e1", orderId: "ORD-23910", exchangeId: "EX-881", sku: "KH-TSH-001", customer: "Sana Khan", status: "EXCHANGE_REQUESTED", updatedAt: "2026-06-17T10:00:00Z" },
  { id: "e2", orderId: "ORD-23911", exchangeId: "EX-882", sku: "KH-JNS-014", customer: "Rohit Das", status: "EXCHANGE_APPROVED", updatedAt: "2026-06-17T09:30:00Z" },
  { id: "e3", orderId: "ORD-23912", exchangeId: "EX-883", sku: "KH-DRS-008", customer: "Meera Joshi", status: "EXCHANGE_PICKUP_SCHEDULED", updatedAt: "2026-06-16T16:00:00Z" },
  { id: "e4", orderId: "ORD-23913", exchangeId: "EX-884", sku: "KH-TOP-022", customer: "Arjun Verma", status: "EXCHANGE_PICKED", updatedAt: "2026-06-16T12:00:00Z" },
  { id: "e5", orderId: "ORD-23914", exchangeId: "EX-885", sku: "KH-SHD-003", customer: "Divya Iyer", status: "EXCHANGE_SHIPPED", updatedAt: "2026-06-15T15:00:00Z" },
  { id: "e6", orderId: "ORD-23915", exchangeId: "EX-886", sku: "KH-ACC-011", customer: "Nikhil Shah", status: "EXCHANGE_COMPLETED", updatedAt: "2026-06-14T11:00:00Z" },
];

export const STATIC_RETURN_ROWS = [
  { id: "r1", orderId: "ORD-23801", returnId: "RET-501", sku: "KH-TSH-001", customer: "Anita Roy", status: "RETURN_REQUESTED", updatedAt: "2026-06-17T11:00:00Z" },
  { id: "r2", orderId: "ORD-23802", returnId: "RET-502", sku: "KH-JNS-014", customer: "Suresh Kumar", status: "RETURN_APPROVED", updatedAt: "2026-06-17T08:00:00Z" },
  { id: "r3", orderId: "ORD-23803", returnId: "RET-503", sku: "KH-DRS-008", customer: "Pooja Gupta", status: "pickupScheduled", updatedAt: "2026-06-16T17:00:00Z" },
  { id: "r4", orderId: "ORD-23804", returnId: "RET-504", sku: "KH-TOP-022", customer: "Manish Jain", status: "pickedUp", updatedAt: "2026-06-16T10:00:00Z" },
  { id: "r5", orderId: "ORD-23805", returnId: "RET-505", sku: "KH-SHD-003", customer: "Lakshmi P", status: "refundProcessed", updatedAt: "2026-06-15T14:00:00Z" },
  { id: "r6", orderId: "ORD-23806", returnId: "RET-506", sku: "KH-ACC-011", customer: "Harsh T", status: "returnRejected", updatedAt: "2026-06-14T09:00:00Z" },
];

export const STATIC_STALE_ROWS = [
  { id: "s1", orderId: "ORD-23701", sku: "KH-TSH-009", customer: "Old Order A", city: "Mumbai", status: "CONFIRMED", hoursStale: 28, updatedAt: "2026-06-16T06:00:00Z" },
  { id: "s2", orderId: "ORD-23702", sku: "KH-JNS-002", customer: "Old Order B", city: "Delhi", status: "CONFIRMED", hoursStale: 36, updatedAt: "2026-06-15T22:00:00Z" },
  { id: "s3", orderId: "ORD-23703", sku: "KH-DRS-015", customer: "Old Order C", city: "Chennai", status: "CONFIRMED", hoursStale: 52, updatedAt: "2026-06-15T06:00:00Z" },
];

export const STATIC_ANALYTICS = {
  item: {
    orders: [
      { status: "CONFIRMED", label: "Confirmed", count: 42 },
      { status: "PROCESSING", label: "Processing", count: 18 },
      { status: "SHIPPED", label: "Shipped", count: 31 },
      { status: "OUT_FOR_DELIVERY", label: "Out for delivery", count: 9 },
      { status: "DELIVERED", label: "Delivered", count: 156 },
      { status: "CANCELLED", label: "Cancelled", count: 7 },
    ],
    exchange: [
      { status: "EXCHANGE_REQUESTED", label: "Exchange requested", count: 5 },
      { status: "EXCHANGE_APPROVED", label: "Exchange approved", count: 3 },
      { status: "EXCHANGE_PICKUP_SCHEDULED", label: "Pickup scheduled", count: 2 },
      { status: "EXCHANGE_SHIPPED", label: "Exchange shipped", count: 4 },
      { status: "EXCHANGE_COMPLETED", label: "Completed", count: 12 },
    ],
    returns: [
      { status: "RETURN_REQUESTED", label: "Return requested", count: 8 },
      { status: "RETURN_APPROVED", label: "Return approved", count: 4 },
      { status: "pickupScheduled", label: "Pickup scheduled", count: 3 },
      { status: "refundProcessed", label: "Refund processed", count: 22 },
      { status: "returnRejected", label: "Rejected", count: 2 },
    ],
    stale: { count: 3, thresholdHours: 24 },
  },
  order: {
    orders: [
      { status: "CONFIRMED", label: "Confirmed", count: 31 },
      { status: "PROCESSING", label: "Processing", count: 12 },
      { status: "SHIPPED", label: "Shipped", count: 22 },
      { status: "OUT_FOR_DELIVERY", label: "Out for delivery", count: 6 },
      { status: "DELIVERED", label: "Delivered", count: 98 },
      { status: "CANCELLED", label: "Cancelled", count: 5 },
    ],
    exchange: [
      { status: "EXCHANGE_REQUESTED", label: "Exchange requested", count: 4 },
      { status: "EXCHANGE_APPROVED", label: "Exchange approved", count: 2 },
      { status: "EXCHANGE_PICKUP_SCHEDULED", label: "Pickup scheduled", count: 1 },
      { status: "EXCHANGE_SHIPPED", label: "Exchange shipped", count: 3 },
      { status: "EXCHANGE_COMPLETED", label: "Completed", count: 9 },
    ],
    returns: [
      { status: "RETURN_REQUESTED", label: "Return requested", count: 6 },
      { status: "RETURN_APPROVED", label: "Return approved", count: 3 },
      { status: "pickupScheduled", label: "Pickup scheduled", count: 2 },
      { status: "refundProcessed", label: "Refund processed", count: 15 },
      { status: "returnRejected", label: "Rejected", count: 1 },
    ],
    stale: { count: 2, thresholdHours: 24 },
  },
};
