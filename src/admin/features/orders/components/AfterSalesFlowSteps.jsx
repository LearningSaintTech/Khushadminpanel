import React, { useMemo } from "react";

const RETURN_STEPS = [
  { id: "requested", label: "Requested", match: ["returnrequested", "return_requested"] },
  { id: "approved", label: "Approved", match: ["returnapproved", "return_approved"] },
  {
    id: "pickup",
    label: "Pickup",
    match: [
      "pickupscheduled",
      "outforpickup",
      "return_pickup_scheduled",
      "pickup_scheduled",
    ],
  },
  {
    id: "picked",
    label: "Picked",
    match: ["pickedup", "picked_up", "returned", "intransit", "in_transit"],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    match: ["receivedatwarehouse", "received_at_warehouse", "qualitycheck", "qcpassed", "qcfailed"],
  },
  {
    id: "refund",
    label: "Refund",
    match: ["refundinitiated", "refundprocessed", "refunded"],
  },
];

const EXCHANGE_STEPS = [
  { id: "requested", label: "Requested", match: ["exchangerequested", "exchange_requested"] },
  { id: "approved", label: "Approved", match: ["exchangeapproved", "exchange_approved"] },
  {
    id: "pickup",
    label: "Pickup",
    match: [
      "pickupscheduled",
      "outforpickup",
      "exchange_pickup_scheduled",
      "exchange_out_for_pickup",
    ],
  },
  {
    id: "picked",
    label: "Picked",
    match: ["pickedup", "exchange_picked", "intransit", "exchange_return_in_transit"],
  },
  {
    id: "received",
    label: "Received",
    match: ["receivedatwarehouse", "exchange_received", "qualitycheck", "qcpassed"],
  },
  {
    id: "replacement",
    label: "Replacement",
    match: [
      "exchangeshipped",
      "replacementshipped",
      "exchange_shipped",
      "outofdelivery",
      "exchange_out_for_delivery",
      "replacementoutofdelivery",
    ],
  },
  {
    id: "done",
    label: "Done",
    match: [
      "exchangedelivered",
      "exchangecompleted",
      "exchange_delivered",
      "exchange_completed",
      "replacementdelivered",
    ],
  },
];

const TERMINAL_CANCEL = new Set([
  "pickupcancelled",
  "pickup_cancelled",
  "returnrejected",
  "return_rejected",
  "exchangerejected",
  "exchange_rejected",
  "cancelled",
  "canceled",
]);

function norm(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function resolveStepIndex(steps, docStatus, lineStatus) {
  const keys = [norm(docStatus), norm(lineStatus)].filter(Boolean);
  if (keys.some((k) => TERMINAL_CANCEL.has(k))) return -1;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i].match.some((m) => keys.includes(norm(m)))) return i;
  }
  return 0;
}

/**
 * Horizontal step timeline for return / exchange reverse flow.
 */
export default function AfterSalesFlowSteps({
  kind = "return",
  docStatus,
  lineStatus,
  className = "",
}) {
  const steps = kind === "exchange" ? EXCHANGE_STEPS : RETURN_STEPS;
  const { activeIndex, cancelled } = useMemo(() => {
    const idx = resolveStepIndex(steps, docStatus, lineStatus);
    return { activeIndex: idx, cancelled: idx < 0 };
  }, [steps, docStatus, lineStatus]);

  if (cancelled) {
    const label =
      formatCancelLabel(docStatus) ||
      formatCancelLabel(lineStatus) ||
      "Cancelled / rejected";
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 ${className}`}
        role="status"
      >
        Flow stopped: {label}
      </div>
    );
  }

  return (
    <ol
      className={`grid gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label={`${kind} progress`}
    >
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        const connectorDone = i < activeIndex;
        return (
          <li key={step.id} className="relative flex min-w-0 flex-col items-center text-center">
            {i > 0 ? (
              <span
                className={`absolute left-0 right-1/2 top-[0.6875rem] z-0 h-0.5 -translate-y-1/2 ${
                  connectorDone || current ? "bg-brand-400" : "bg-stone-200"
                }`}
                aria-hidden
              />
            ) : null}
            {i < steps.length - 1 ? (
              <span
                className={`absolute left-1/2 right-0 top-[0.6875rem] z-0 h-0.5 -translate-y-1/2 ${
                  done ? "bg-brand-400" : "bg-stone-200"
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ring-2 ring-white ${
                current
                  ? "bg-brand-600 text-white"
                  : done
                    ? "bg-brand-500 text-white"
                    : "bg-stone-200 text-stone-500"
              }`}
              aria-current={current ? "step" : undefined}
            >
              {done && !current ? "✓" : i + 1}
            </span>
            <span
              className={`mt-1 max-w-full truncate text-[10px] font-medium leading-tight ${
                current
                  ? "text-brand-800"
                  : done
                    ? "text-stone-700"
                    : "text-stone-400"
              }`}
              title={step.label}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function formatCancelLabel(raw) {
  const k = norm(raw);
  if (!k) return "";
  if (k.includes("reject")) return "Rejected";
  if (k.includes("cancel")) return "Pickup cancelled";
  return String(raw || "").replace(/_/g, " ");
}

export function isReturnFlowItem(item) {
  if (!item) return false;
  if (item.afterSales?.type === "RETURN") return true;
  if (item.activeFlow === "RETURN") return true;
  const s = String(item.status || "").toUpperCase();
  if (s.startsWith("RETURN_") || s === "RETURNED" || s === "REFUNDED") return true;
  return Array.isArray(item.returns) && item.returns.length > 0;
}

export function isExchangeFlowItem(item) {
  if (!item) return false;
  if (item.afterSales?.type === "EXCHANGE") return true;
  if (item.activeFlow === "EXCHANGE") return true;
  const s = String(item.status || "").toUpperCase();
  if (s.startsWith("EXCHANGE_")) return true;
  return Array.isArray(item.exchanges) && item.exchanges.length > 0;
}
