import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Send, Package, IndianRupee, Phone } from "lucide-react";
import { MdArrowBackIos } from "react-icons/md";

const EXCHANGE_ITEM_STATUSES = [
  "EXCHANGE_PICKUP_SCHEDULED",
  "EXCHANGE_PICKED",
  "EXCHANGE_RECEIVED",
  "EXCHANGE_PROCESSING",
  "EXCHANGE_SHIPPED",
  "EXCHANGE_DELIVERED",
  "EXCHANGE_COMPLETED",
];

function isExchangeAssignment(assignment) {
  const items = assignment?.items ?? [];
  return items.some(
    (it) =>
      it?.status && EXCHANGE_ITEM_STATUSES.includes(String(it.status).toUpperCase())
  );
}

function isExchangePickup(assignment) {
  const items = assignment?.items ?? [];
  const pickupStatuses = [
    "EXCHANGE_PICKUP_SCHEDULED",
    "EXCHANGE_PICKED",
    "EXCHANGE_RECEIVED",
    "EXCHANGE_PROCESSING",
  ];
  return items.some(
    (it) => it?.status && pickupStatuses.includes(String(it.status).toUpperCase())
  );
}

const STATUS_LABELS = {
  ASSIGNED: "New assignment",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function formatDate(dateVal) {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const assignment = location.state?.assignment ?? null;

  if (!assignment) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            <MdArrowBackIos size={22} className="text-gray-800" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-gray-600 font-medium">No order selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Go back to order history and tap a card to view details.
          </p>
          <button
            type="button"
            onClick={() => navigate("/driver/order-history")}
            className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            Order history
          </button>
        </div>
      </div>
    );
  }

  const order = assignment?.order ?? {};
  const address = order?.address ?? {};
  const items = assignment?.items ?? [];
  const status = assignment?.status ?? "";
  const amountToCollect = assignment?.amountToCollect ?? 0;
  const paymentMode = assignment?.paymentMode ?? "COD";
  const isExchange = isExchangeAssignment(assignment);
  const isPickup = isExchange && isExchangePickup(assignment);
  const statusLabel = STATUS_LABELS[status] || status;

  const deliveryAddressParts = [
    address?.fullAddress || address?.addressLine,
    address?.city,
    address?.state,
    address?.pincode ? String(address.pincode).trim() : null,
  ].filter(Boolean);
  const deliveryAddressString = deliveryAddressParts.join(", ") || "";
  const mapsDirectionUrl = deliveryAddressString
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddressString)}`
    : "https://www.google.com/maps";

  const orderId = order?.orderId ?? assignment?._id?.slice(-8) ?? "—";
  const deliveredAt = assignment?.deliveredAt;
  const rejectedAt = assignment?.rejectedAt ?? assignment?.updatedAt;

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-white border-b border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          aria-label="Go back"
        >
          <MdArrowBackIos size={22} className="text-gray-800" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[15px] font-bold text-gray-900">Order details</h1>
          <p className="text-xs text-gray-500 mt-0.5">#{orderId}</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {/* Status & type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-800">{statusLabel}</span>
            <div className="flex items-center gap-2">
              {isExchange ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
                  Exchange
                </span>
              ) : (
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    paymentMode === "COD"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {paymentMode === "COD" ? "COD" : "Prepaid"}
                </span>
              )}
            </div>
          </div>
          {status === "DELIVERED" && deliveredAt && (
            <p className="text-xs text-gray-500 mt-2">
              Delivered {formatDate(deliveredAt)}
            </p>
          )}
          {status === "REJECTED" && (
            <p className="text-xs text-red-600 mt-2">
              Rejected {rejectedAt ? formatDate(rejectedAt) : ""}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Package size={18} className="text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-800">Items ({items.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const imageUrl = item?.variant?.imageUrl || "https://picsum.photos/100/87";
              const itemKey = item?.sku ? `${item.sku}-${idx}` : `item-${idx}`;
              const lineTotal = (item?.unitPrice ?? 0) * (item?.quantity ?? 1);
              const productName = item?.variant?.name ?? item?.productName ?? null;
              return (
                <div key={itemKey} className="flex gap-4 p-4">
                  <img
                    src={imageUrl}
                    alt={productName || item?.sku || "Product"}
                    className="w-20 h-20 shrink-0 rounded-xl object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    {productName && (
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {productName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">SKU: {item?.sku ?? "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        Qty: {item?.quantity ?? 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MapPin size={18} className="text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-800">
              {isExchange ? (isPickup ? "Pickup from" : "Deliver to") : "Deliver to"}
            </h2>
          </div>
          <div className="p-4 space-y-2">
            <p className="font-semibold text-gray-900">{address?.name || "—"}</p>
            {deliveryAddressString ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line wrap-break-word">
                {deliveryAddressString.replace(/, /g, ",\n")}
              </p>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
            {address?.phone && (
              <a
                href={`tel:${address.phone}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black"
              >
                <Phone size={14} />
                {address.phone}
              </a>
            )}
          </div>
          {deliveryAddressString && (
            <div className="px-4 pb-4">
              <a
                href={mapsDirectionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Get direction
                <Send size={16} />
              </a>
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <IndianRupee size={18} className="text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-800">Payment summary</h2>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {isExchange
                ? `Exchange ${isPickup ? "pickup" : "delivery"}`
                : paymentMode === "COD"
                  ? "Cash to collect"
                  : "Prepaid"}
            </span>
            <span className="text-lg font-bold text-gray-900">
              {amountToCollect > 0 ? `₹${amountToCollect.toFixed(2)}` : "No payment"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
