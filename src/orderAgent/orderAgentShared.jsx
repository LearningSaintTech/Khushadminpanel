import { formatStatusDisplayLabel, normalizeStatusToken } from "./list/statusDisplayLabels";

export const inputClass =
  "rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** Sidebar / analytics console logs — VITE_DEBUG_ORDER_AGENT=true or Vite dev mode. */
export const isOrderAgentDebugEnabled =
  import.meta.env.DEV ||
  String(import.meta.env.VITE_DEBUG_ORDER_AGENT ?? "").toLowerCase() === "true";

export function logOrderAgentDebug(event, payload) {
  if (!isOrderAgentDebugEnabled) return;
  console.log(`[order-agent][sidebar-analytics] ${event}`);

  if (payload?.data?.orders?.counts) {
    const { view, data } = payload;
    console.log(`  view: ${view ?? payload.countsView ?? "—"}`);
    const sections = [
      ["ORDERS", data.orders],
      ["EXCHANGE", data.exchange],
      ["RETURNS", data.returns],
    ];
    for (const [name, section] of sections) {
      console.log(`  ── ${name} (total ${section?.total ?? 0}) ──`);
      console.table(
        [...(section?.counts || [])].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
      );
    }
    if (data.shippingProviders?.counts?.length) {
      console.log("  ── SHIPPING PROVIDERS ──");
      console.table(data.shippingProviders.counts);
    }
    if (data.stale) {
      console.log(`  stale: ${data.stale.count} (>${data.stale.thresholdHours}h)`);
    }
    return;
  }

  if (payload?.statusCounts) {
    console.log(`  view: ${payload.view}, countsView: ${payload.countsView}`);
    for (const section of ["orders", "exchange", "returns"]) {
      const rows = Object.entries(payload.statusCounts[section] || {}).map(([status, count]) => ({
        status,
        count,
      }));
      if (!rows.length) continue;
      console.log(`  ── ${section.toUpperCase()} ──`);
      console.table(rows.sort((a, b) => b.count - a.count));
    }
    console.log("  sectionTotals:", payload.sectionTotals);
    console.log("  staleCount:", payload.staleCount);
    return;
  }

  console.log(payload);
}

export const btnSecondary =
  "rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted";

export const tableShell =
  "max-h-[calc(100vh-12rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm";

export const formatDt = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_TONES = {
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-amber-100 text-amber-900",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-stone-200 text-stone-700",
  MIXED: "bg-fuchsia-100 text-fuchsia-800",
  OTHER: "bg-slate-200 text-slate-800",
  EXCHANGE_REQUESTED: "bg-sky-100 text-sky-800",
  EXCHANGE_COMPLETED: "bg-emerald-100 text-emerald-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  REFUNDED: "bg-emerald-100 text-emerald-800",
  returnRejected: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }) {
  const raw = String(status || "");
  const s = normalizeStatusToken(raw) || raw;
  const tone =
    STATUS_TONES[s] ||
    STATUS_TONES[raw] ||
    STATUS_TONES[raw.toUpperCase()] ||
    (s.startsWith("EXCHANGE_") || s.startsWith("exchange")
      ? "bg-sky-50 text-sky-800"
      : s.startsWith("RETURN") || s.includes("return") || /^pickup|^refund|^quality|^receivedAt/i.test(s)
        ? "bg-orange-50 text-orange-800"
        : "bg-stone-100 text-stone-600");
  const label =
    s === "MIXED"
      ? "Mixed"
      : s === "OTHER"
        ? "Other"
        : formatStatusDisplayLabel(s, s);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${tone}`}
    >
      {label || "—"}
    </span>
  );
}

export function StaticPreviewBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
      <strong>Preview mode</strong> — static sample data. API integration coming soon.
    </div>
  );
}

/** Collapse line-level rows into one row per order for "by order" list view. */
export function groupRowsByOrder(
  rows = [],
  { orderKey = "orderId", statusField = "status", extraKeys = [] } = {},
) {
  const map = new Map();

  for (const row of rows) {
    const key = String(row[orderKey] || "");
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }

  return Array.from(map.entries()).map(([orderId, items]) => {
    const statuses = [...new Set(items.map((item) => String(item[statusField] || "")).filter(Boolean))];
    const status = statuses.length === 1 ? statuses[0] : "MIXED";
    const payments = [...new Set(items.map((item) => String(item.payment || "")).filter(Boolean))];
    const payment = payments.length === 1 ? payments[0] : payments.length > 1 ? "Mixed" : "—";
    const updatedAt = items.reduce((max, item) => {
      const t = new Date(item.updatedAt).getTime();
      return Number.isFinite(t) && t > max ? t : max;
    }, 0);

    const grouped = {
      id: orderId,
      orderId,
      customer: items[0]?.customer,
      city: items[0]?.city,
      itemCount: items.length,
      status,
      payment,
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : items[0]?.updatedAt,
      _lineItems: items,
    };

    for (const key of extraKeys) {
      const values = [...new Set(items.map((item) => String(item[key] || "")).filter(Boolean))];
      grouped[key] = values.length === 1 ? values[0] : values.join(", ");
    }

    return grouped;
  });
}

/** Known enum-style tokens used for static preview filtering (carrier raw strings → Other). */
const KNOWN_LINE_STATUS_TOKENS = new Set([
  "CREATED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "CANCELED",
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
  "NEW",
  "READY_TO_SHIP",
  "PICKED_UP",
  "IN_TRANSIT",
  "RTO",
  "RTO_DELIVERED",
]);

export function isKnownLineStatusEnum(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return false;
  if (KNOWN_LINE_STATUS_TOKENS.has(raw)) return true;
  const upper = raw.toUpperCase();
  if (upper === "CANCELED") return KNOWN_LINE_STATUS_TOKENS.has("CANCELLED");
  return KNOWN_LINE_STATUS_TOKENS.has(upper);
}

export function isOtherLineStatus(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return false;
  return !isKnownLineStatusEnum(raw);
}
