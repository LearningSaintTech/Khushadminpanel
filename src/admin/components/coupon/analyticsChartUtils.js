/** @typedef {{ day: string, value: number }} TimelineRow */

export function sumTimeline(rows = []) {
  return (rows || []).reduce((sum, row) => sum + Number(row?.value || 0), 0);
}

export function mergeTimelines(series = []) {
  const dayMap = new Map();
  for (const s of series) {
    for (const row of s.rows || []) {
      const day = String(row?.day || "");
      if (!day) continue;
      if (!dayMap.has(day)) dayMap.set(day, { day });
      dayMap.get(day)[s.key] = Number(row?.value || 0);
    }
  }
  return Array.from(dayMap.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)));
}

export function formatChartDay(day) {
  if (!day) return "";
  const parts = String(day).split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return String(day);
}

export function buildFunnelSteps(metrics = {}) {
  const addToCart = sumTimeline(metrics.cartTimeline);
  const checkout =
    Number(metrics.checkoutStartsCount || 0) || sumTimeline(metrics.checkoutTimeline);
  const paymentInitiated = sumTimeline(metrics.paymentInitiatedTimeline);
  const paymentSuccess =
    Number(metrics.paymentSuccessCount || 0) || sumTimeline(metrics.paymentSuccessTimeline);
  const orderPlaced =
    Number(metrics.orderPlacedEventsCount || 0) || sumTimeline(metrics.orderPlacedTimeline);

  const steps = [
    { name: "Add to cart", value: addToCart, fill: "#6366f1" },
    { name: "Checkout", value: checkout, fill: "#8b5cf6" },
    { name: "Pay initiated", value: paymentInitiated, fill: "#a855f7" },
    { name: "Pay success", value: paymentSuccess, fill: "#22c55e" },
    { name: "Order placed", value: orderPlaced, fill: "#0ea5e9" },
  ];

  const top = steps[0]?.value || 1;
  return steps.map((step, idx) => {
    const prev = idx > 0 ? steps[idx - 1].value : step.value;
    const convFromPrev = prev > 0 ? Math.round((step.value / prev) * 1000) / 10 : null;
    const convFromTop = top > 0 ? Math.round((step.value / top) * 1000) / 10 : null;
    return { ...step, convFromPrev, convFromTop };
  });
}

export function buildChannelSplit(metrics = {}) {
  const website = sumTimeline(metrics.websiteUserTimeline);
  const app = sumTimeline(metrics.appUserTimeline);
  return [
    { name: "Website users", value: website, fill: "#6366f1" },
    { name: "App users", value: app, fill: "#8b5cf6" },
  ].filter((x) => x.value > 0);
}

export function buildPaymentSplit(metrics = {}) {
  const success = Number(metrics.paymentSuccessCount || 0) || sumTimeline(metrics.paymentSuccessTimeline);
  const failed = Number(metrics.paymentFailedCount || 0) || sumTimeline(metrics.paymentFailedTimeline);
  return [
    { name: "Success", value: success, fill: "#22c55e" },
    { name: "Failed", value: failed, fill: "#ef4444" },
  ].filter((x) => x.value > 0);
}

const MODULE_TIMELINE_MAP = {
  cart: [
    { id: "cartTimeline", label: "Add to cart", color: "#6366f1" },
    { id: "cartViewTimeline", label: "Cart views", color: "#8b5cf6" },
    { id: "removeFromCartTimeline", label: "Removes", color: "#f97316" },
  ],
  checkout: [{ id: "checkoutTimeline", label: "Checkout", color: "#6366f1" }],
  payment: [
    { id: "paymentInitiatedTimeline", label: "Initiated", color: "#a855f7" },
    { id: "paymentSuccessTimeline", label: "Success", color: "#22c55e" },
    { id: "paymentFailedTimeline", label: "Failed", color: "#ef4444" },
  ],
  orders: [
    { id: "orderedValueTimeline", label: "GMV", color: "#6366f1", valuePrefix: "Rs " },
    { id: "orderPlacedTimeline", label: "Orders placed", color: "#0ea5e9" },
    { id: "deliveredTimeline", label: "Delivered", color: "#22c55e" },
  ],
  browse: [
    { id: "productViewTimeline", label: "Product views", color: "#6366f1" },
    { id: "searchTimeline", label: "Search", color: "#8b5cf6" },
    { id: "categoryViewTimeline", label: "Categories", color: "#0ea5e9" },
  ],
  engagement: [
    { id: "sessionTimeline", label: "Sessions", color: "#6366f1" },
    { id: "notificationOpenedTimeline", label: "Notif opens", color: "#f59e0b" },
  ],
  auth: [
    { id: "authSuccessTimeline", label: "Login success", color: "#22c55e" },
    { id: "authFailedTimeline", label: "Login failed", color: "#ef4444" },
    { id: "newSigninTimeline", label: "Signups", color: "#6366f1" },
  ],
  users: [
    { id: "websiteUserTimeline", label: "Website DAU", color: "#6366f1" },
    { id: "appUserTimeline", label: "App DAU", color: "#8b5cf6" },
  ],
};

export function getModuleChartSeries(module, metrics = {}) {
  if (module === "all") {
    return [
      { id: "orderedValueTimeline", label: "GMV", color: "#6366f1", rows: metrics.orderedValueTimeline },
      { id: "checkoutTimeline", label: "Checkout", color: "#8b5cf6", rows: metrics.checkoutTimeline },
      { id: "paymentSuccessTimeline", label: "Pay success", color: "#22c55e", rows: metrics.paymentSuccessTimeline },
    ];
  }
  const defs = MODULE_TIMELINE_MAP[module] || [];
  return defs.map((d) => ({
    ...d,
    rows: metrics[d.id] || [],
  }));
}

export function toRankedBarData(rows = [], { labelKey = "label", valueKey = "count" } = {}) {
  return (rows || [])
    .map((row) => ({
      name: String(row[labelKey] || row.key || row.name || row.segmentCode || row.pincode || "—").slice(0, 32),
      value: Number(row[valueKey] ?? row.value ?? row.sentCount ?? row.orders ?? 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}
