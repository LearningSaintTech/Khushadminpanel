import { ExternalLink } from "lucide-react";
import SafeExternalLink from "../../components/SafeExternalLink.jsx";
import { getPublicStoreUrl } from "../../utils/apiConfig.js";
import { StatusBadge, formatDt } from "../orderAgentShared";
import { carrierMetaLine, extractLineCarrier, getItemShippingProvider } from "./carrierExtract";

const STORE_URL = getPublicStoreUrl();

export function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function itemFromRow(row) {
  const item = row?.item && typeof row.item === "object" ? { ...row.item } : {};
  const inferred =
    String(row?.inferredShippingProvider || getItemShippingProvider(item) || "").toUpperCase();
  if (inferred && inferred !== "NONE") {
    return { ...item, shippingProvider: inferred };
  }
  return item;
}

function imageUrl(item) {
  const v = item?.variant;
  return (
    v?.imageUrl ||
    (Array.isArray(v?.images) && v.images[0]) ||
    item?.imageUrl ||
    (Array.isArray(item?.images) && item.images[0]) ||
    ""
  );
}

function storefrontUrl(itemId, item) {
  const pid = item?.productId || itemId;
  if (!pid || !STORE_URL) return null;
  return `${STORE_URL}/product/${pid}`;
}

function paymentLabel(payment) {
  if (!payment) return "—";
  const mode = String(payment.mode || "").toUpperCase();
  const status = String(payment.status || "").toUpperCase();
  if (!mode && !status) return "—";
  return [mode, status].filter(Boolean).join(" · ");
}

function CourierCell({ item, compact = true }) {
  const carrier = extractLineCarrier(item);
  if (!carrier) return "—";

  const isInternalSelf =
    carrier.provider === "SELF_SHIPPING" &&
    String(carrier.mode || "INTERNAL").toUpperCase() !== "EXTERNAL";
  const metaParts =
    carrier.provider === "SELF_SHIPPING"
      ? [carrier.notes].filter(Boolean)
      : [carrier.courier, carrierMetaLine(carrier)].filter(Boolean);
  const meta = metaParts.join(" · ");
  const toneClass =
    carrier.provider === "DELHIVERY"
      ? "text-emerald-700"
      : carrier.provider === "SHADOWFAX"
        ? "text-orange-700"
        : carrier.provider === "SELF_SHIPPING"
          ? "text-violet-700"
          : "text-brand-600";

  if (!compact) {
    return (
      <div className="space-y-1 text-[11px]">
        <span className="font-semibold text-stone-700">{carrier.label}</span>
        {carrier.awb ? (
          <p className="font-mono text-[10px]">
            {carrier.trackingUrl ? (
              <SafeExternalLink
                href={carrier.trackingUrl}
                className={`inline-flex items-center gap-1 hover:underline ${toneClass}`}
              >
                {carrier.awb}
                <ExternalLink size={11} />
              </SafeExternalLink>
            ) : (
              carrier.awb
            )}
          </p>
        ) : isInternalSelf ? (
          <p className={`text-[10px] font-medium ${toneClass}`}>Khush in-house</p>
        ) : carrier.provider === "SELF_SHIPPING" ? (
          <p className={`text-[10px] ${toneClass}`}>{carrier.courier || "External carrier"}</p>
        ) : null}
        {meta ? <p className="text-[10px] text-stone-500">{meta}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 leading-tight">
      <span className="text-[9px] font-semibold uppercase text-stone-500">{carrier.label}</span>
      {carrier.awb && carrier.trackingUrl ? (
        <SafeExternalLink
          href={carrier.trackingUrl}
          className={`inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] hover:underline ${toneClass}`}
          title={carrier.awb}
        >
          <ExternalLink size={9} className="shrink-0" aria-hidden />
          <span className="truncate">{carrier.awb}</span>
        </SafeExternalLink>
      ) : carrier.awb ? (
        <p className="truncate font-mono text-[9px] text-stone-700" title={carrier.awb}>
          {carrier.awb}
        </p>
      ) : isInternalSelf ? (
        <p className={`truncate text-[9px] font-medium ${toneClass}`}>Khush in-house</p>
      ) : carrier.provider === "SELF_SHIPPING" ? (
        <p className={`truncate text-[9px] ${toneClass}`}>
          {carrier.courier || "External — add carrier"}
        </p>
      ) : (
        <p className="text-[9px] text-amber-700">Pending AWB</p>
      )}
      {meta ? (
        <p className="truncate text-[9px] text-stone-500" title={meta}>
          {meta}
        </p>
      ) : null}
    </div>
  );
}

function courierSummary(row) {
  return <CourierCell item={itemFromRow(row)} compact />;
}

function noteText(row) {
  const latest = row?.latestOrderNote?.text;
  if (latest != null && String(latest).trim()) return String(latest).trim();
  const notes = row?.orderNotes;
  if (Array.isArray(notes) && notes.length) {
    return String(notes[notes.length - 1]?.text || "").trim();
  }
  return "";
}

export function renderItemListCell(key, row) {
  const item = itemFromRow(row);
  const itemId = row.itemId ?? item.itemId;

  switch (key) {
    case "image": {
      const src = imageUrl(item);
      if (!src) {
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-stone-200 bg-stone-50 text-[9px] text-stone-400">
            —
          </div>
        );
      }
      return (
        <img src={src} alt="" className="h-10 w-10 rounded border border-stone-200 object-cover" loading="lazy" />
      );
    }
    case "orderId":
      return <span className="font-medium text-brand-700">{row.orderId || "—"}</span>;
    case "date":
    case "orderDateTime":
      return formatDt(row.orderCreatedAt);
    case "customer":
      return row.user?.name || row.address?.name || "—";
    case "phone":
      return `${row.user?.countryCode || ""}${row.user?.phoneNumber || row.address?.phone || "—"}`;
    case "email":
      return row.user?.email || "—";
    case "notes": {
      const text = noteText(row);
      return (
        <span className="block max-w-[160px] truncate text-stone-600" title={text || "No notes"}>
          {text || "—"}
        </span>
      );
    }
    case "product":
      return (
        <span className="block max-w-[200px] truncate font-medium" title={item.name || ""}>
          {item.name || "—"}
        </span>
      );
    case "productId":
      return item.productId || "—";
    case "sku":
      return item.sku || itemId || "—";
    case "variantSku":
      return item.variant?.sku || "—";
    case "size":
      return item.variant?.size || "—";
    case "color":
      return item.variant?.color || "—";
    case "qty":
      return item.quantity ?? "—";
    case "pincode":
      return row.address?.pincode || "—";
    case "city":
      return row.address?.city || "—";
    case "storeLink": {
      const url = storefrontUrl(itemId, item);
      if (!url) return "—";
      return (
        <SafeExternalLink
          href={url}
          className="inline-flex items-center gap-0.5 text-brand-700 hover:text-brand-900"
        >
          <ExternalLink size={12} />
          Store
        </SafeExternalLink>
      );
    }
    case "orderAmount":
      return formatInr(row.finalPayable ?? row.orderTotalBeforeWallet ?? row.payment?.amount);
    case "walletUsed":
      return (row.walletUsedAmount ?? 0) > 0 ? formatInr(row.walletUsedAmount) : "—";
    case "payment":
      return paymentLabel(row.payment);
    case "gatewayOrderId":
      return row.payment?.gatewayOrderId ? (
        <span className="font-mono text-[10px]" title={row.payment.gatewayOrderId}>
          {row.payment.gatewayOrderId}
        </span>
      ) : (
        "—"
      );
    case "status":
      return <StatusBadge status={row.itemStatus} />;
    case "courier":
      return courierSummary(row);
    default:
      return "—";
  }
}

export function renderOrderListCell(key, order) {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null;
  const pseudoRow = {
    orderId: order.orderId,
    orderCreatedAt: order.createdAt,
    user: order.user,
    address: order.address,
    payment: order.payment,
    walletUsedAmount: order.pricing?.walletUsedAmount ?? order.walletUsedAmount,
    finalPayable: order.pricing?.finalPayable ?? order.totalAmount,
    latestOrderNote: order.latestOrderNote,
    orderNotes: order.orderNotes,
    item: firstItem,
    itemId: firstItem?.itemId,
    itemStatus: order.status,
  };

  switch (key) {
    case "qty": {
      const items = order.items || [];
      const total = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      return total || items.length || "—";
    }
    case "status":
      return <StatusBadge status={order.status} />;
    case "courier":
      if (!firstItem) return "—";
      return <CourierCell item={firstItem} compact />;
    case "orderAmount":
      return formatInr(
        order.totalAmount ?? order.pricing?.finalPayableBeforeWallet ?? order.pricing?.finalPayable ?? 0,
      );
    case "walletUsed": {
      const w = order.pricing?.walletUsedAmount ?? order.walletUsedAmount ?? 0;
      return w > 0 ? formatInr(w) : "—";
    }
    default:
      return renderItemListCell(key, pseudoRow);
  }
}

export function renderStaleCell(key, row) {
  switch (key) {
    case "orderId":
      return row.orderId || "—";
    case "sku":
      return row.sku || "—";
    case "customer":
      return row.customerName || "—";
    case "city":
      return row.city || "—";
    case "status":
      return <StatusBadge status={row.itemStatus || row.orderStatus} />;
    case "hoursStale":
      return row.hoursStale != null ? Math.round(row.hoursStale) : "—";
    case "payment":
      return [row.paymentMode, row.paymentStatus].filter(Boolean).join(" · ") || "—";
    case "updatedAt":
      return formatDt(row.staleSince || row.orderUpdatedAt);
    default:
      return "—";
  }
}
