import React, { useMemo } from "react";
import { RotateCcw, RefreshCw, Copy } from "lucide-react";
import toast from "react-hot-toast";
import {
  formatStatusTokenForUi,
  getLineStatusDisplay,
} from "../utils/orderStatusDisplay.jsx";

async function copyText(value, label) {
  const text = value == null ? "" : String(value);
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
}

function sortDocsNewestFirst(docs) {
  return [...(docs || [])].sort(
    (a, b) =>
      new Date(b?.updatedAt || b?.createdAt || 0).getTime() -
      new Date(a?.updatedAt || a?.createdAt || 0).getTime(),
  );
}

function DocCard({ kind, doc, lineDisplay }) {
  if (!doc) return null;
  const reverseAwb =
    doc?.shadowfax?.returnPickup?.awb ||
    doc?.delhivery?.returnPickup?.waybill ||
    doc?.returnPickup?.manualTrackingId ||
    lineDisplay?.reverseAwb ||
    null;
  const reverseUrl =
    doc?.shadowfax?.returnPickup?.trackingUrl ||
    doc?.delhivery?.returnPickup?.trackingUrl ||
    lineDisplay?.reverseTrackingUrl ||
    null;
  const docId = doc._id ? String(doc._id) : null;
  const idCopyLabel = kind === "return" ? "Return ID copied" : "Exchange ID copied";

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          {kind}
        </span>
        <span className="font-semibold text-stone-900">
          {formatStatusTokenForUi(doc.status) || doc.status || "—"}
        </span>
        {docId ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-500">
            {docId.slice(-8)}
            <button
              type="button"
              onClick={() => copyText(docId, idCopyLabel)}
              className="inline-flex items-center justify-center rounded border border-stone-200 bg-white p-0.5 text-stone-500 hover:bg-stone-50"
              title={idCopyLabel}
              aria-label={idCopyLabel}
            >
              <Copy size={11} />
            </button>
          </span>
        ) : null}
      </div>
      {doc.reason ? (
        <p className="text-xs text-stone-600">
          Reason: {doc.reason}
          {doc.description ? ` — ${doc.description}` : ""}
        </p>
      ) : null}
      {reverseAwb ? (
        <p className="mt-1 inline-flex flex-wrap items-center gap-1 font-mono text-xs text-stone-700">
          <span>Reverse AWB: {reverseAwb}</span>
          <button
            type="button"
            onClick={() => copyText(reverseAwb, "AWB copied")}
            className="inline-flex items-center justify-center rounded border border-stone-200 bg-white p-0.5 text-stone-500 hover:bg-stone-50"
            title="AWB copied"
            aria-label="Copy AWB"
          >
            <Copy size={11} />
          </button>
          {reverseUrl ? (
            <>
              {" · "}
              <a
                href={reverseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                Track
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {doc.orphaned ? (
        <p className="mt-1 text-xs font-medium text-red-600">Orphaned request</p>
      ) : null}
    </div>
  );
}

/**
 * Return / exchange requests attached to a line (and afterSales summary).
 */
export default function AfterSalesPanel({
  item,
  titleClassName = "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500",
}) {
  const lineDisplay = useMemo(() => getLineStatusDisplay(item), [item]);
  const returns = useMemo(
    () => sortDocsNewestFirst(item?.returns),
    [item?.returns],
  );
  const exchanges = useMemo(
    () => sortDocsNewestFirst(item?.exchanges),
    [item?.exchanges],
  );
  const afterSales = item?.afterSales;

  if (!afterSales && returns.length === 0 && exchanges.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200/70 bg-white p-3 shadow-sm">
      <div className={titleClassName}>
        {afterSales?.type === "EXCHANGE" || exchanges.length ? (
          <RefreshCw className="h-3.5 w-3.5 text-amber-700" aria-hidden />
        ) : (
          <RotateCcw className="h-3.5 w-3.5 text-amber-700" aria-hidden />
        )}
        After-sales
      </div>

      {afterSales ? (
        <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
          <p className="font-medium text-stone-900">
            {afterSales.type || "Request"} ·{" "}
            {formatStatusTokenForUi(afterSales.state) || afterSales.state || "—"}
          </p>
          {afterSales.qty != null ? (
            <p className="text-xs text-stone-500">Qty {afterSales.qty}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {returns.map((doc) => (
          <DocCard
            key={String(doc._id || doc.status)}
            kind="Return"
            doc={doc}
            lineDisplay={lineDisplay}
          />
        ))}
        {exchanges.map((doc) => (
          <DocCard
            key={String(doc._id || doc.status)}
            kind="Exchange"
            doc={doc}
            lineDisplay={lineDisplay}
          />
        ))}
      </div>
    </div>
  );
}
