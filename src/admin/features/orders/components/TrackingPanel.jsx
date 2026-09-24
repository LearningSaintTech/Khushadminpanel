import React from "react";
import { Truck, ExternalLink, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { getLineStatusDisplay } from "../utils/orderStatusDisplay.jsx";
import SafeExternalLink from "../../../../components/SafeExternalLink.jsx";

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

function CopyableAwb({ value, label = "AWB copied" }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-stone-800">{value}</span>
      <button
        type="button"
        onClick={() => copyText(value, label)}
        className="inline-flex items-center justify-center rounded border border-stone-200 bg-white p-0.5 text-stone-500 hover:bg-stone-50"
        title={label}
        aria-label={label}
      >
        <Copy size={12} />
      </button>
    </span>
  );
}

/**
 * Forward + reverse AWB / tracking + carrier webhook timeline.
 */
export default function TrackingPanel({
  item,
  titleClassName = "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500",
}) {
  if (!item) return null;

  const display = getLineStatusDisplay(item);
  const timeline = Array.isArray(item.carrierWebhookTimeline)
    ? item.carrierWebhookTimeline
    : [];

  const hasAwb =
    display?.forwardAwb ||
    display?.reverseAwb ||
    display?.awb ||
    display?.trackingUrl;

  if (!hasAwb && timeline.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className={titleClassName}>
          <Truck className="h-3.5 w-3.5 text-brand-600" aria-hidden />
          Tracking
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {display?.providerLabel ? (
            <div>
              <dt className="text-[10px] uppercase text-stone-500">Provider</dt>
              <dd className="font-medium text-stone-800">{display.providerLabel}</dd>
            </div>
          ) : null}
          {display?.forwardAwb ? (
            <div>
              <dt className="text-[10px] uppercase text-stone-500">Forward AWB</dt>
              <dd>
                <CopyableAwb value={display.forwardAwb} />
              </dd>
            </div>
          ) : null}
          {display?.reverseAwb ? (
            <div>
              <dt className="text-[10px] uppercase text-stone-500">Reverse AWB</dt>
              <dd>
                <CopyableAwb value={display.reverseAwb} />
              </dd>
            </div>
          ) : null}
          {!display?.forwardAwb && display?.awb ? (
            <div>
              <dt className="text-[10px] uppercase text-stone-500">AWB</dt>
              <dd>
                <CopyableAwb value={display.awb} />
              </dd>
            </div>
          ) : null}
          {display?.trackingUrl ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase text-stone-500">Track</dt>
              <dd>
                <SafeExternalLink
                  href={display.trackingUrl}
                  className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                >
                  Open tracking <ExternalLink size={12} aria-hidden />
                </SafeExternalLink>
              </dd>
            </div>
          ) : null}
          {display?.lastScanLabel ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase text-stone-500">Last scan</dt>
              <dd className="text-stone-700">{display.lastScanLabel}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {timeline.length > 0 ? (
        <div className="rounded-xl border border-orange-200/80 bg-orange-50/40 p-3 shadow-sm">
          <div className={titleClassName}>
            <Truck className="h-3.5 w-3.5 text-orange-600" aria-hidden />
            Carrier webhook timeline
          </div>
          <ul className="space-y-0">
            {timeline.map((ev, i) => (
              <li
                key={`${ev.event}-${ev.at}-${i}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-orange-100 py-2.5 text-sm last:border-0 last:pb-0 first:pt-0"
              >
                <span className="min-w-[120px] font-medium text-gray-900">
                  {ev.statusLabel || ev.event || "—"}
                </span>
                {ev.remarks ? (
                  <span className="text-xs italic text-gray-500">{ev.remarks}</span>
                ) : null}
                {ev.at ? (
                  <span className="ml-auto text-xs tabular-nums text-gray-500">
                    {new Date(ev.at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
