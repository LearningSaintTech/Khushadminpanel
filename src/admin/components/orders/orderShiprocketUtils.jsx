import { ExternalLink } from "lucide-react";
import {
  getLatestExchange,
  getLatestExchangeForwardOrder,
  isExchangeStatus,
  isNormalDeliveryLine,
} from "./orderStatusUtils";

export const getNormalDeliveryShiprocket = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const sr = item.shiprocket || {};
  const awb = sr.awbCode || item.trackingId || null;
  const hasAny =
    awb ||
    sr.orderId != null ||
    sr.shipmentId != null ||
    (sr.status && String(sr.status).trim()) ||
    (item.courier && String(item.courier).trim());
  if (!hasAny) return null;
  return {
    awb,
    trackingUrl:
      sr.trackingUrl ||
      (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : null),
    status: sr.status || null,
    shiprocketOrderId: sr.orderId ?? null,
    shipmentId: sr.shipmentId ?? item.shipmentId ?? null,
    shipmentGroupId:
      sr.shipmentGroupId ??
      item.shipmentGroupId ??
      sr.shipment_group_id ??
      item.shipment_group_id ??
      null,
    courier: item.courier || null,
    labelUrl: sr.labelUrl || null,
    invoiceUrl: sr.invoiceUrl || null,
  };
};

export const getExchangeForwardShiprocket = (item) => {
  const fwd = getLatestExchangeForwardOrder(item);
  if (!fwd) return null;
  const awb = fwd.awbCode || item?.trackingId || null;
  const hasAny =
    awb ||
    fwd.orderId != null ||
    fwd.shipmentId != null ||
    (fwd.status && String(fwd.status).trim()) ||
    (fwd.courierName && String(fwd.courierName).trim());
  if (!hasAny) return null;
  return {
    awb,
    trackingUrl:
      fwd.trackingUrl ||
      (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : null),
    status: fwd.status || null,
    shiprocketOrderId: fwd.orderId ?? null,
    shipmentId: fwd.shipmentId ?? null,
    shipmentGroupId: null,
    courier: fwd.courierName || item?.courier || null,
    labelUrl: fwd.labelUrl || null,
    invoiceUrl: fwd.invoiceUrl || null,
  };
};

export const getLineShiprocket = (item) => {
  if (!item) return null;
  if (isExchangeStatus(item?.status)) {
    const forward = getExchangeForwardShiprocket(item);
    if (forward) return forward;
  }
  return getNormalDeliveryShiprocket(item);
};

export const getOrderNormalShiprocketPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getNormalDeliveryShiprocket(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
};

export const getOrderShiprocketPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getLineShiprocket(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
};

export const getOrderShipmentIds = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const ids = items.flatMap((it) => {
    const sr = getLineShiprocket(it);
    const forward = getLatestExchangeForwardOrder(it);
    return [
      sr?.shipmentId,
      sr?.shipmentGroupId,
      forward?.shipmentId,
      it?.shipmentId,
      it?.shipmentGroupId,
      it?.shiprocket?.shipmentId,
      it?.shiprocket?.shipmentGroupId,
      it?.exchanges?.[0]?.shiprocket?.forwardOrder?.shipmentId,
    ]
      .filter(Boolean)
      .map(String);
  });
  return Array.from(new Set(ids));
};

export const getOrderForwardPreview = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    const forward = getLatestExchangeForwardOrder(item);
    if (forward?.shipmentId || forward?.trackingUrl || forward?.awbCode) {
      return forward;
    }
  }
  return null;
};

export const hasNormalDeliveryInOrder = (order) =>
  Array.isArray(order?.items) &&
  order.items.some((item) => isNormalDeliveryLine(item));

export const getOrderForwardCreateTarget = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    if (!isNormalDeliveryLine(item)) continue;
    if (!isExchangeStatus(item?.status)) continue;
    const latestExchange = getLatestExchange(item);
    if (!latestExchange?._id) continue;
    return { exchangeId: String(latestExchange._id), item };
  }
  return null;
};

export const shiprocketFromItemRow = (row) => {
  if (!row) return null;
  const line = {
    ...(row.item && typeof row.item === "object" ? row.item : {}),
    delivery: { type: row.deliveryType || row.item?.delivery?.type },
  };
  return getLineShiprocket(line);
};

export function ShiprocketDetails({ sr, compact }) {
  if (!sr) return <span className="text-gray-400">—</span>;
  if (compact) {
    const meta = [sr.courier].filter(Boolean).join(" · ");
    return (
      <div className="min-w-0 leading-tight">
        {sr.trackingUrl ? (
          <a
            href={sr.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] text-brand-600 hover:underline"
            title={sr.awb || "Track"}
          >
            <ExternalLink size={9} className="shrink-0" aria-hidden />
            <span className="truncate">{sr.awb || "Track"}</span>
          </a>
        ) : (
          <span
            className="block truncate font-mono text-[9px] text-gray-800"
            title={sr.awb || undefined}
          >
            {sr.awb || "—"}
          </span>
        )}
        {meta ? (
          <p className="truncate text-[9px] text-stone-500" title={meta}>
            {meta}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold uppercase text-sky-700">Shiprocket</span>
        {sr.status && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
            {sr.status}
          </span>
        )}
      </div>
      {sr.awb && (
        <p className="font-mono text-xs">
          AWB:{" "}
          {sr.trackingUrl ? (
            <a
              href={sr.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            >
              {sr.awb}
              <ExternalLink size={12} />
            </a>
          ) : (
            sr.awb
          )}
        </p>
      )}
      {sr.courier && <p className="text-xs text-gray-600">Courier: {sr.courier}</p>}
      {(sr.shiprocketOrderId != null || sr.shipmentId != null) && (
        <p className="text-xs text-gray-500">
          {sr.shiprocketOrderId != null && <>SR order: {sr.shiprocketOrderId}</>}
          {sr.shiprocketOrderId != null && sr.shipmentId != null && " · "}
          {sr.shipmentId != null && <>Shipment: {sr.shipmentId}</>}
        </p>
      )}
      {(sr.labelUrl || sr.invoiceUrl) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {sr.labelUrl && (
            <span className="text-xs font-medium text-brand-600">Label ready</span>
          )}
          {sr.invoiceUrl && (
            <span className="text-xs font-medium text-brand-600">Invoice ready</span>
          )}
        </div>
      )}
    </div>
  );
}
