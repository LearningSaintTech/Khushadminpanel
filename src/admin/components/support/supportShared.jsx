export const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export const btnPrimary =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60";

export const btnSecondary =
  "rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-60";

export const tableShell =
  "max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm";

export const unwrapData = (res) => res?.data ?? res;

/** ObjectId string, populated doc `{ _id }`, or null/undefined. */
export const refId = (value) => {
  if (value != null && typeof value === "object") return String(value._id ?? "");
  return value != null ? String(value) : "";
};

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

const STATUS_STYLES = {
  OPEN: "bg-sky-100 text-sky-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-stone-200 text-stone-700",
};

const PRIORITY_STYLES = {
  LOW: "bg-stone-100 text-stone-600",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-red-100 text-red-800",
};

export function TicketStatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        STATUS_STYLES[s] || "bg-stone-100 text-stone-600"
      }`}
    >
      {s.replace(/_/g, " ") || "—"}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = String(priority || "").toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        PRIORITY_STYLES[p] || "bg-stone-100 text-stone-600"
      }`}
    >
      {p || "—"}
    </span>
  );
}

export const TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export const ISSUE_TYPES = [
  "ORDER_ISSUE",
  "PAYMENT",
  "RETURN",
  "EXCHANGE",
  "DELIVERY",
  "SIZE_ISSUE",
  "OTHER",
];
