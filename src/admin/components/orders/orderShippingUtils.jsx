import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export const canDownloadInvoice = (item) => {
  const status = String(item?.status || "").toUpperCase();
  return !["CREATED", "CONFIRMED"].includes(status);
};

export const ORDERS_DEBUG =
  import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_ORDERS ?? "") === "true";

export const dbgOrders = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  if (rest.length === 0) console.log(`[Orders] ${label}`);
  else console.log(`[Orders] ${label}`, ...rest);
};

export const dbgOrdersVerbose = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  console.debug(`[Orders] ${label}`, ...rest);
};

export const isNormalDeliveryLine = (item, order = null) => {
  const direct = String(item?.delivery?.type || item?.deliveryType || "").toUpperCase();
  if (direct) return direct === "NORMAL";
  const gid = String(item?.shipmentGroupId || "");
  if (!gid || !Array.isArray(order?.shipments)) return false;
  const shipment = order.shipments.find((s) => String(s.shipmentGroupId) === gid);
  return String(shipment?.deliveryType || "").toUpperCase() === "NORMAL";
};

export const isLineManifestedOnCarrier = (item, order = null) => {
  if (item?.shiprocket?.orderId || item?.delhivery?.waybill) return true;
  const gid = String(item?.shipmentGroupId || "");
  if (!gid || !Array.isArray(order?.shipments)) return false;
  const shipment = order.shipments.find((s) => String(s.shipmentGroupId) === gid);
  return Boolean(shipment?.shiprocket?.orderId || shipment?.delhivery?.waybill);
};

export const isSelfShippingLine = (item) =>
  isNormalDeliveryLine(item) &&
  String(item?.shippingProvider || "").toUpperCase() === "SELF_SHIPPING";

export const SHIPPING_PROVIDER_OPTIONS = [
  { value: "SHIPROCKET", label: "Shiprocket" },
  { value: "DELHIVERY", label: "Delhivery" },
  { value: "SELF_SHIPPING", label: "Self Shipping" },
];

export const shippingProviderLabel = (value) =>
  SHIPPING_PROVIDER_OPTIONS.find(
    (opt) => opt.value === String(value || "").toUpperCase(),
  )?.label || value || "Carrier";

export const extractShippingFallbackEntries = (apiRes, extras = {}) => {
  const data = apiRes?.data ?? apiRes;
  const entries = [];

  const pushIfFallback = (row) => {
    if (!row?.fellBackFrom) return;
    entries.push({
      orderId: row.orderId ?? extras.orderId ?? data?.orderId ?? null,
      itemId: row.itemId ?? extras.itemId ?? data?.itemId ?? null,
      sku: row.sku ?? extras.sku ?? null,
      deliveryPincode:
        row.deliveryPincode ??
        extras.deliveryPincode ??
        data?.deliveryPincode ??
        null,
      fellBackFrom: row.fellBackFrom,
      fallbackReason: row.fallbackReason ?? null,
      provider: row.provider ?? "SELF_SHIPPING",
    });
  };

  pushIfFallback(data?.shippingResult);
  if (Array.isArray(data?.shippingResults)) {
    for (const row of data.shippingResults) {
      pushIfFallback(row);
    }
  }

  return entries;
};

export const getItemShippingProvider = (item) => {
  const p = String(item?.shippingProvider || "").toUpperCase();
  if (p === "DELHIVERY" || p === "SHIPROCKET" || p === "SELF_SHIPPING") return p;
  if (item?.delhivery?.waybill) return "DELHIVERY";
  if (
    item?.shiprocket?.orderId != null ||
    item?.shiprocket?.shipmentId != null ||
    item?.shiprocket?.awbCode
  ) {
    return "SHIPROCKET";
  }
  return null;
};

export const isDelhiveryLine = (item) =>
  isNormalDeliveryLine(item) && getItemShippingProvider(item) === "DELHIVERY";

export const getDelhiveryWaybill = (item) => {
  const wb = item?.delhivery?.waybill;
  if (wb) return String(wb).trim();
  if (getItemShippingProvider(item) === "DELHIVERY" && item?.trackingId) {
    return String(item.trackingId).trim();
  }
  return null;
};

export const getNormalDeliveryDelhivery = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const dl = item.delhivery || {};
  const waybill = getDelhiveryWaybill(item);
  const hasAny =
    waybill ||
    (dl.status && String(dl.status).trim()) ||
    dl.trackingUrl;
  if (!hasAny) return null;
  return {
    provider: "DELHIVERY",
    awb: waybill,
    trackingUrl: dl.trackingUrl || null,
    status: dl.status || null,
    courier: item.courier || "Delhivery",
    lrn: dl.lrn || waybill,
  };
};

export const itemNeedsShippingProviderOnProcessing = (item, newStatus, order = null) => {
  if (String(newStatus || "").toUpperCase() !== "PROCESSING") return false;
  if (!isNormalDeliveryLine(item, order)) return false;
  if (isLineManifestedOnCarrier(item, order)) return false;
  return true;
};

export const defaultShippingProviderForItem = (item) =>
  getItemShippingProvider(item) || "SHIPROCKET";

export const orderHasItemsNeedingShippingProvider = (order, newStatus, itemIds = null) => {
  if (String(newStatus || "").toUpperCase() !== "PROCESSING") return false;
  return (order?.items || []).some((item) => {
    const id = String(item.itemId || item._id);
    if (itemIds?.length && !itemIds.map(String).includes(id)) return false;
    return itemNeedsShippingProviderOnProcessing(item, newStatus, order);
  });
};

export const buildStatusPayload = (newStatus, item, shippingProvider) => {
  const payload = { status: newStatus };
  if (
    newStatus === "PROCESSING" &&
    shippingProvider &&
    isNormalDeliveryLine(item)
  ) {
    payload.shippingProvider = shippingProvider;
  }
  return payload;
};

export const resolveItemDocIds = (orderObj, itemObj) => {
  const orderId =
    orderObj?.orderId || orderObj?._id || orderObj?.id || orderObj?.order_id;
  const itemId =
    itemObj?.itemId || itemObj?._id || itemObj?.id || itemObj?.productItemId;
  return { orderId: orderId ? String(orderId) : null, itemId: itemId ? String(itemId) : null };
};

export const openPdfBlob = (blob, filename, fallbackMsg) => {
  if (!blob || !(blob instanceof Blob)) {
    toast.error(fallbackMsg);
    return;
  }
  if (blob.type && blob.type.includes("json")) {
    blob.text().then((text) => {
      let msg = fallbackMsg;
      try {
        const j = JSON.parse(text);
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      toast.error(msg);
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export function DelhiveryDetails({ dl, compact }) {
  if (!dl) return <span className="text-gray-400">—</span>;
  if (compact) {
    const meta = [dl.status, dl.courier].filter(Boolean).join(" · ");
    return (
      <div className="min-w-0 leading-tight">
        {dl.trackingUrl ? (
          <a
            href={dl.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] text-emerald-700 hover:underline"
            title={dl.awb || "Track"}
          >
            <ExternalLink size={9} className="shrink-0" aria-hidden />
            <span className="truncate">{dl.awb || "Track"}</span>
          </a>
        ) : (
          <span
            className="block truncate font-mono text-[9px] text-gray-800"
            title={dl.awb || undefined}
          >
            {dl.awb || "—"}
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
        <span className="text-xs font-semibold uppercase text-emerald-700">Delhivery</span>
        {dl.status && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            {dl.status}
          </span>
        )}
      </div>
      {dl.awb && (
        <p className="font-mono text-xs">
          Waybill:{" "}
          {dl.trackingUrl ? (
            <a
              href={dl.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
            >
              {dl.awb}
              <ExternalLink size={12} />
            </a>
          ) : (
            dl.awb
          )}
        </p>
      )}
      {dl.courier && <p className="text-xs text-gray-600">Courier: {dl.courier}</p>}
    </div>
  );
}
