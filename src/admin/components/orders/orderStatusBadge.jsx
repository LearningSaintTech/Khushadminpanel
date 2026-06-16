import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { formatStatusTokenForUi, getDisplayItemStatus, normalizeItemStatusToken } from "./orderStatusUtils";
import { getItemShippingProvider, getNormalDeliveryDelhivery } from "./orderShippingUtils";
import { getLineShiprocket } from "./orderShiprocketUtils";

const STATUS_STYLES = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
  CREATED: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
  PROCESSING: { bg: "bg-blue-100", text: "text-blue-800", Icon: RefreshCw },
  CONFIRMED: { bg: "bg-brand-100", text: "text-brand-800", Icon: RefreshCw },
  "PICKUP GENERATED": { bg: "bg-sky-100", text: "text-sky-800", Icon: Truck },
  "PICKUP EXCEPTION": { bg: "bg-orange-100", text: "text-orange-800", Icon: AlertTriangle },
  SHIPPED: { bg: "bg-purple-100", text: "text-purple-800", Icon: Truck },
  DELIVERED: { bg: "bg-green-100", text: "text-green-800", Icon: CheckCircle },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800", Icon: XCircle },
  "OUT FOR DELIVERY": { bg: "bg-cyan-100", text: "text-cyan-800", Icon: Truck },
  "EXCHANGE REQUESTED": { bg: "bg-orange-100", text: "text-orange-800", Icon: RefreshCw },
  "EXCHANGE APPROVED": { bg: "bg-teal-100", text: "text-teal-800", Icon: CheckCircle },
  "EXCHANGE REJECTED": { bg: "bg-pink-100", text: "text-pink-800", Icon: XCircle },
  "EXCHANGE PICKUP SCHEDULED": { bg: "bg-amber-100", text: "text-amber-800", Icon: Truck },
  "EXCHANGE PICKUP EXCEPTION": { bg: "bg-orange-100", text: "text-orange-800", Icon: AlertTriangle },
  "EXCHANGE OUT FOR PICKUP": { bg: "bg-amber-100", text: "text-amber-800", Icon: Truck },
  "EXCHANGE PICKED": { bg: "bg-amber-100", text: "text-amber-800", Icon: Truck },
  "EXCHANGE RETURN IN TRANSIT": { bg: "bg-amber-100", text: "text-amber-900", Icon: Truck },
  "EXCHANGE RECEIVED": { bg: "bg-teal-100", text: "text-teal-800", Icon: Package },
  "EXCHANGE PROCESSING": { bg: "bg-blue-100", text: "text-blue-800", Icon: RefreshCw },
  "EXCHANGE SHIPPED": { bg: "bg-purple-100", text: "text-purple-800", Icon: Truck },
  "EXCHANGE OUT FOR DELIVERY": { bg: "bg-cyan-100", text: "text-cyan-800", Icon: Truck },
  "EXCHANGE DELIVERED": { bg: "bg-green-100", text: "text-green-800", Icon: CheckCircle },
  "EXCHANGE COMPLETED": { bg: "bg-green-100", text: "text-green-800", Icon: CheckCircle },
};

export function OrderStatusBadge({ status = "pending" }) {
  const s = (status || "pending").toUpperCase().replace(/_/g, " ").trim();
  const {
    bg = "bg-gray-100",
    text = "text-gray-800",
    Icon = Clock,
  } = STATUS_STYLES[s] || STATUS_STYLES.PENDING;
  let displayText = s.charAt(0) + s.slice(1).toLowerCase();
  if (displayText.length > 24) {
    displayText = displayText
      .replace("Exchange ", "Ex. ")
      .replace("Pickup Scheduled", "Pickup Sch.")
      .replace("Return In Transit", "Ret. in transit")
      .replace("Out For Delivery", "Out for Del.");
  }
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${bg} ${text} truncate`}
      title={displayText}
    >
      <Icon size={12} className="shrink-0" />
      <span className="truncate">{displayText}</span>
    </span>
  );
}

/** Single resolved status badge — stored line status first; courier hint in tooltip */
/** Compact status dropdown for list/detail tables — change status without opening order detail. */
export function InlineItemStatusSelect({
  value,
  options,
  onChange,
  disabled = false,
  isUpdating = false,
  className = "",
}) {
  return (
    <div
      className={`relative min-w-0 ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next && next !== value) onChange(next);
        }}
        disabled={disabled || isUpdating}
        className="w-full max-w-full cursor-pointer truncate rounded-lg border border-border bg-white px-1.5 py-1 text-[10px] font-semibold text-stone-800 shadow-sm outline-none transition hover:border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Change line status"
        title="Change status"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isUpdating ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}

export function OrderItemStatusBreakdown({ item, tableRow = false }) {
  const apiStatus = normalizeItemStatusToken(item?.status);
  const effective = apiStatus || getDisplayItemStatus(item);
  const provider = getItemShippingProvider(item);
  const sr = provider === "SHIPROCKET" ? getLineShiprocket(item) : null;
  const titleParts = [formatStatusTokenForUi(effective)];
  const enriched = getDisplayItemStatus(item);
  if (apiStatus && enriched && apiStatus !== enriched) {
    titleParts.push(`Courier sync: ${formatStatusTokenForUi(enriched)}`);
  }
  if (provider === "SELF_SHIPPING") titleParts.push("Self shipping");
  if (sr?.courier) titleParts.push(sr.courier);
  if (sr?.status) titleParts.push(`Shiprocket: ${sr.status}`);
  const dl = provider === "DELHIVERY" ? getNormalDeliveryDelhivery(item) : null;
  if (dl?.status) titleParts.push(`Delhivery: ${dl.status}`);

  return (
    <div
      className={`min-w-0 ${tableRow ? "max-w-[9.5rem]" : "max-w-[12rem]"}`}
      title={titleParts.join(" · ")}
    >
      <OrderStatusBadge status={effective} />
      {sr?.courier ? (
        <p className="mt-0.5 truncate text-[9px] leading-tight text-stone-500">
          {sr.courier}
        </p>
      ) : null}
    </div>
  );
}
