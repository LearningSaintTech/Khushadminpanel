/**
 * Unified line status display — reads items.status + items.shipping (v2 model).
 * Falls back to legacy provider blobs when shipping subdoc is absent.
 */
import React from "react";

export function normalizeStatusToken(status) {
  const upper = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!upper) return "";
  if (upper === "CANCELED") return "CANCELLED";
  return upper;
}

export function formatStatusTokenForUi(token) {
  const key = normalizeStatusToken(token);
  if (!key) return "";
  return key
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const EXCEPTION_SCAN_PATTERNS = [
  /undelivered/i,
  /not\s*picked/i,
  /exception/i,
  /\bnc\b/i,
  /refused/i,
  /unavailable/i,
  /pickup_exception/i,
];

function inferScanKindFromLabel(label) {
  const text = String(label || "");
  if (!text) return "MILESTONE";
  if (EXCEPTION_SCAN_PATTERNS.some((re) => re.test(text))) return "EXCEPTION";
  if (/rto|cancelled|canceled|lost|damaged|returned/i.test(text)) return "TERMINAL";
  return "MILESTONE";
}

export function inferActiveFlow(item) {
  if (item?.activeFlow) return item.activeFlow;
  const s = normalizeStatusToken(item?.status);
  if (s.startsWith("EXCHANGE_")) return "EXCHANGE";
  if (
    ["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_PICKUP_SCHEDULED", "RETURNED", "REFUNDED"].includes(
      s,
    )
  ) {
    return "RETURN";
  }
  return "FORWARD";
}

function latestAttachedDoc(item, key) {
  const docs = Array.isArray(item?.[key]) ? [...item[key]] : [];
  if (!docs.length) return null;
  docs.sort(
    (a, b) =>
      new Date(b?.updatedAt || b?.createdAt || 0).getTime() -
      new Date(a?.updatedAt || a?.createdAt || 0).getTime(),
  );
  return docs[0];
}

function resolveForwardAwbFromHistory(item) {
  const segments = item?.workflowHistory || [];
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (seg?.flow === "FORWARD" && seg?.shipping?.awb) {
      return seg.shipping.awb;
    }
  }
  return null;
}

function resolveForwardShipping(item) {
  const s = item?.shipping;
  const provider =
    s?.provider ||
    item?.shippingProvider ||
    (item?.shadowfax?.awb ? "SHADOWFAX" : null) ||
    (item?.shiprocket?.awbCode ? "SHIPROCKET" : null) ||
    (item?.delhivery?.waybill ? "DELHIVERY" : null) ||
    (item?.selfShipping?.mode ? "SELF_SHIPPING" : null);

  const awb =
    s?.awb ||
    item?.shadowfax?.awb ||
    item?.shiprocket?.awbCode ||
    item?.delhivery?.waybill ||
    item?.trackingId ||
    resolveForwardAwbFromHistory(item) ||
    null;

  const trackingUrl =
    s?.trackingUrl ||
    item?.shadowfax?.trackingUrl ||
    item?.shiprocket?.trackingUrl ||
    item?.delhivery?.trackingUrl ||
    null;

  const scanLabel =
    s?.carrierScan?.label ||
    item?.shadowfax?.status ||
    item?.shiprocket?.status ||
    item?.delhivery?.status ||
    null;

  const scanKind =
    s?.carrierScan?.scanKind || (scanLabel ? inferScanKindFromLabel(scanLabel) : null);

  if (!provider && !awb && !scanLabel) return null;

  return {
    provider,
    awb,
    trackingUrl,
    carrierScan: s?.carrierScan || (scanLabel ? { label: scanLabel, scanKind } : null),
    selfShipping: s?.selfShipping || item?.selfShipping || null,
    manifestError: s?.manifestError || item?.shippingManifestError || null,
  };
}

function resolveReversePickup(item) {
  const unified = item?.shipping?.reversePickup;
  const legacyAwb =
    item?.shadowfax?.returnPickupAwb ||
    item?.delhivery?.returnPickupWaybill ||
    null;
  const legacyUrl =
    item?.shadowfax?.returnPickupTrackingUrl ||
    item?.delhivery?.returnPickupTrackingUrl ||
    null;

  const retDoc = latestAttachedDoc(item, "returns");
  const exDoc = latestAttachedDoc(item, "exchanges");
  const docAwb =
    retDoc?.shadowfax?.returnPickup?.awb ||
    retDoc?.returnPickup?.manualTrackingId ||
    retDoc?.delhivery?.returnPickup?.waybill ||
    exDoc?.shadowfax?.returnPickup?.awb ||
    exDoc?.returnPickup?.manualTrackingId ||
    exDoc?.delhivery?.returnPickup?.waybill ||
    null;
  const docUrl =
    retDoc?.shadowfax?.returnPickup?.trackingUrl ||
    exDoc?.shadowfax?.returnPickup?.trackingUrl ||
    null;

  const awb = unified?.awb || legacyAwb || docAwb || null;
  if (!awb) return null;

  return {
    awb,
    trackingUrl: unified?.trackingUrl || legacyUrl || docUrl || null,
  };
}

function resolveShipping(item, activeFlow) {
  const forward = resolveForwardShipping(item);
  const reverse = resolveReversePickup(item);
  const isReverseLeg = activeFlow === "RETURN" || activeFlow === "EXCHANGE";

  const awb = isReverseLeg ? reverse?.awb || forward?.awb || null : forward?.awb || null;
  const trackingUrl = isReverseLeg
    ? reverse?.trackingUrl || forward?.trackingUrl || null
    : forward?.trackingUrl || null;

  return {
    ...(forward || {}),
    leg: isReverseLeg ? "reverse" : "forward",
    awb,
    trackingUrl,
    forwardAwb: forward?.awb || resolveForwardAwbFromHistory(item) || null,
    reverseAwb: reverse?.awb || null,
    reverseTrackingUrl: reverse?.trackingUrl || null,
  };
}

const PROVIDER_LABELS = {
  SHADOWFAX: "Shadowfax",
  SHIPROCKET: "Shiprocket",
  DELHIVERY: "Delhivery",
  SELF_SHIPPING: "Self shipping",
};

const FLOW_LABELS = {
  FORWARD: "Forward",
  EXCHANGE: "Exchange",
  RETURN: "Return",
};

export function getLineStatusDisplay(item) {
  if (!item) return null;
  const milestone = normalizeStatusToken(item.status);
  const activeFlow = inferActiveFlow(item);
  const shipping = resolveShipping(item, activeFlow);
  const scan = shipping?.carrierScan;
  const provider = shipping?.provider || null;

  const journeySummary = [];
  for (const seg of item.workflowHistory || []) {
    if (!seg?.flow) continue;
    journeySummary.push({
      flow: seg.flow,
      exitStatus: seg.exitStatus,
      awb: seg.shipping?.awb || null,
      active: false,
    });
  }
  if (activeFlow) {
    journeySummary.push({
      flow: activeFlow,
      status: milestone,
      active: true,
    });
  }

  return {
    activeFlow,
    leg: shipping?.leg || "forward",
    milestone,
    milestoneLabel: formatStatusTokenForUi(milestone),
    provider,
    providerLabel: provider ? PROVIDER_LABELS[provider] || provider : null,
    awb: shipping?.awb || null,
    forwardAwb: shipping?.forwardAwb || null,
    reverseAwb: shipping?.reverseAwb || null,
    trackingUrl: shipping?.trackingUrl || null,
    reverseTrackingUrl: shipping?.reverseTrackingUrl || null,
    lastScanLabel: scan?.label || null,
    scanKind: scan?.scanKind || null,
    manifestError: shipping?.manifestError || null,
    selfShippingCarrier:
      provider === "SELF_SHIPPING" && shipping?.selfShipping?.mode === "EXTERNAL"
        ? shipping.selfShipping.carrierName
        : null,
    journeySummary,
  };
}

export function getLineMilestoneForBadge(item) {
  const d = getLineStatusDisplay(item);
  return d?.milestone || normalizeStatusToken(item?.status) || "";
}

export function isExceptionScan(item) {
  const kind = getLineStatusDisplay(item)?.scanKind;
  return kind === "EXCEPTION" || kind === "TERMINAL";
}

export function renderLineJourneySummary(item, { compact = false } = {}) {
  const display = getLineStatusDisplay(item);
  const steps = display?.journeySummary || [];
  if (steps.length <= 1) return null;

  return (
    <div className={`space-y-0.5 ${compact ? "text-[9px]" : "text-[10px]"}`}>
      <p className="font-medium text-stone-500">Journey</p>
      {steps.map((step, idx) => {
        const flowLabel = FLOW_LABELS[step.flow] || step.flow;
        const statusLabel = step.active
          ? formatStatusTokenForUi(step.status)
          : formatStatusTokenForUi(step.exitStatus);
        const awbBit = step.awb ? ` · ${step.awb}` : "";
        return (
          <p
            key={`${step.flow}-${idx}`}
            className={step.active ? "text-stone-800" : "text-stone-500"}
            title={`${flowLabel}: ${statusLabel}${awbBit}`}
          >
            {idx > 0 ? "→ " : ""}
            {flowLabel}: {statusLabel}
            {step.active ? " (active)" : ""}
          </p>
        );
      })}
    </div>
  );
}
