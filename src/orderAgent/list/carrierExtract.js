/**
 * Extract Shiprocket / Delhivery / Shadowfax / Self-shipping fields from order line items.
 * Mirrors admin order.jsx carrier helpers — matches MongoDB item shape.
 */

import { formatStatusDisplayLabel } from "./statusDisplayLabels";

const PROVIDER_LABELS = {
  SHIPROCKET: "Shiprocket",
  DELHIVERY: "Delhivery",
  SHADOWFAX: "Shadowfax",
  SELF_SHIPPING: "Self shipping",
};

const SHIPROCKET_TRACKING_BASE = "https://shiprocket.co/tracking";
const SHADOWFAX_TRACKING_BASE = "https://tracker.shadowfax.in";

function hasText(value) {
  return value != null && String(value).trim() !== "";
}

function hasPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function providerLabel(provider) {
  const key = String(provider || "").toUpperCase();
  return PROVIDER_LABELS[key] || provider || "Carrier";
}

export function isNormalDeliveryLine(item) {
  const type = String(item?.delivery?.type || item?.deliveryType || "NORMAL").toUpperCase();
  return type === "NORMAL" || !type;
}

/**
 * Infer provider — SELF_SHIPPING only from explicit shippingProvider field (model rule).
 */
export function getItemShippingProvider(item) {
  if (!item) return null;
  const field = String(item.shippingProvider || "").trim().toUpperCase();

  if (field === "SELF_SHIPPING") return "SELF_SHIPPING";

  const hasDelhivery =
    hasText(item.delhivery?.waybill) || hasText(item.delhivery?.lrn);
  const hasShadowfax = hasText(item.shadowfax?.awb);
  const hasShiprocket =
    hasText(item.shiprocket?.awbCode) ||
    hasPositiveNumber(item.shiprocket?.shipmentId) ||
    hasPositiveNumber(item.shiprocket?.orderId);

  if (hasDelhivery) return "DELHIVERY";
  if (hasShadowfax) return "SHADOWFAX";
  if (hasShiprocket) return "SHIPROCKET";
  if (field === "DELHIVERY" || field === "SHIPROCKET" || field === "SHADOWFAX") {
    return field;
  }
  return null;
}

function buildShiprocketTrackingUrl(awb, existing) {
  if (existing) return existing;
  if (!awb) return null;
  return `${SHIPROCKET_TRACKING_BASE}/${encodeURIComponent(String(awb))}`;
}

function buildDelhiveryTrackingUrl(waybill, existing) {
  if (existing) return existing;
  if (!waybill) return null;
  return `https://www.delhivery.com/track/package/${encodeURIComponent(String(waybill).trim())}`;
}

function buildShadowfaxTrackingUrl(awb, existing) {
  if (existing) return existing;
  if (!awb) return null;
  return `${SHADOWFAX_TRACKING_BASE}/${encodeURIComponent(String(awb).trim())}`;
}

export function getNormalDeliveryShiprocket(item) {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const provider = getItemShippingProvider(item);
  if (provider === "SHADOWFAX" || provider === "DELHIVERY") return null;
  const sr = item.shiprocket || {};
  const awb =
    sr.awbCode ||
    sr.awb ||
    (provider === "SHIPROCKET" && item.trackingId ? String(item.trackingId).trim() : null) ||
    null;
  const hasAny =
    awb ||
    sr.orderId != null ||
    sr.shipmentId != null ||
    (sr.status && String(sr.status).trim()) ||
    (item.courier && String(item.courier).trim());
  if (!hasAny) return null;
  return {
    provider: "SHIPROCKET",
    label: providerLabel("SHIPROCKET"),
    awb,
    trackingUrl: buildShiprocketTrackingUrl(awb, sr.trackingUrl),
    status: sr.status || null,
    courier: item.courier || null,
    shiprocketOrderId: sr.orderId ?? null,
    shipmentId: sr.shipmentId ?? item.shipmentGroupId ?? null,
    labelUrl: sr.labelUrl || null,
    invoiceUrl: sr.invoiceUrl || null,
  };
}

function getDelhiveryWaybill(item) {
  const wb = item?.delhivery?.waybill;
  if (wb) return String(wb).trim();
  if (getItemShippingProvider(item) === "DELHIVERY" && item?.trackingId) {
    return String(item.trackingId).trim();
  }
  return null;
}

export function getNormalDeliveryDelhivery(item) {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const dl = item.delhivery || {};
  const waybill = getDelhiveryWaybill(item);
  const hasAny = waybill || (dl.status && String(dl.status).trim()) || dl.trackingUrl;
  if (!hasAny) return null;
  return {
    provider: "DELHIVERY",
    label: providerLabel("DELHIVERY"),
    awb: waybill,
    trackingUrl: buildDelhiveryTrackingUrl(waybill, dl.trackingUrl),
    status: dl.status || null,
    courier: item.courier || "Delhivery",
    lrn: dl.lrn || null,
    orderRef: dl.orderRef || null,
  };
}

function getShadowfaxAwb(item) {
  const awb = item?.shadowfax?.awb;
  if (awb) return String(awb).trim();
  if (getItemShippingProvider(item) === "SHADOWFAX" && item?.trackingId) {
    return String(item.trackingId).trim();
  }
  return null;
}

export function getNormalDeliveryShadowfax(item) {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const sfx = item.shadowfax || {};
  const awb = getShadowfaxAwb(item);
  const hasAny = awb || (sfx.status && String(sfx.status).trim()) || sfx.trackingUrl;
  if (!hasAny) return null;
  return {
    provider: "SHADOWFAX",
    label: providerLabel("SHADOWFAX"),
    awb,
    trackingUrl: buildShadowfaxTrackingUrl(awb, sfx.trackingUrl),
    status: sfx.status || null,
    courier: item.courier || "Shadowfax",
    orderRef: sfx.orderRef || null,
  };
}

export function getSelfShippingLine(item) {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const provider = getItemShippingProvider(item);
  if (provider !== "SELF_SHIPPING") return null;

  const ss = item.selfShipping || {};
  const mode = String(ss.mode || "INTERNAL").toUpperCase();
  const isInternal = mode !== "EXTERNAL";
  const trackingId = item.trackingId ? String(item.trackingId).trim() : null;

  return {
    provider: "SELF_SHIPPING",
    label: providerLabel("SELF_SHIPPING"),
    awb: trackingId,
    trackingUrl: ss.trackingUrl || null,
    status: null,
    courier: isInternal
      ? "Khush in-house"
      : ss.carrierName || item.courier || null,
    mode,
    notes: ss.notes || null,
  };
}

/** Unified carrier row for list cells — picks the active provider for one line item. */
export function extractLineCarrier(item) {
  if (!item) return null;
  const provider = getItemShippingProvider(item);
  if (provider === "DELHIVERY") return getNormalDeliveryDelhivery(item);
  if (provider === "SHADOWFAX") return getNormalDeliveryShadowfax(item);
  if (provider === "SELF_SHIPPING") return getSelfShippingLine(item);
  return getNormalDeliveryShiprocket(item);
}

/** Secondary meta line (SR order id, shipment id, LRN, mode, carrier status). */
export function carrierMetaLine(carrier) {
  if (!carrier) return "";
  const parts = [];
  if (carrier.provider === "SHIPROCKET") {
    if (carrier.shiprocketOrderId != null) parts.push(`SR ${carrier.shiprocketOrderId}`);
    if (carrier.shipmentId != null) parts.push(`Ship ${carrier.shipmentId}`);
  }
  if (carrier.provider === "DELHIVERY" && carrier.lrn) parts.push(`LRN ${carrier.lrn}`);
  if (carrier.provider === "SELF_SHIPPING" && carrier.mode === "EXTERNAL" && carrier.courier) {
    parts.push("External");
  }
  if (carrier.status) {
    parts.push(formatStatusDisplayLabel(carrier.status, carrier.status));
  }
  return parts.join(" · ");
}
