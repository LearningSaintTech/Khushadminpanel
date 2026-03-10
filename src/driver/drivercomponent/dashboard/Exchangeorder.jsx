import { useState, useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyDeliveries } from "../../apis/driverApi";

/** Item statuses that indicate this assignment is for exchange (pickup/delivery) */
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
    (it) => it?.status && EXCHANGE_ITEM_STATUSES.includes(String(it.status).toUpperCase())
  );
}

function buildDeliveryAddress(address) {
  if (!address) return "";
  const parts = [
    address.fullAddress || address.addressLine,
    address.city,
    address.state,
    address.pincode ? String(address.pincode).trim() : null,
  ].filter(Boolean);
  return parts.join(", ");
}

const EXCHANGE_STATUS_LABELS = {
  ASSIGNED: "New",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  EXCHANGE_PICKUP_SCHEDULED: "Pickup scheduled",
  EXCHANGE_PICKED: "Picked",
  EXCHANGE_SHIPPED: "Exchange shipped",
  EXCHANGE_DELIVERED: "Delivered",
};

export default function ExchangeOrderDashboard() {
  const navigate = useNavigate();
  const [exchangeDeliveries, setExchangeDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    console.log("[ExchangeOrderDashboard] mount");
    setLoading(true);
    getMyDeliveries()
      .then((res) => {
        console.log("[ExchangeOrderDashboard] getMyDeliveries full response:", res);
        console.log("[ExchangeOrderDashboard] res?.data:", res?.data);
        const list = res?.data ?? res ?? [];
        const arr = Array.isArray(list) ? list : [];
        const exchangeOnly = arr.filter((a) => isExchangeAssignment(a));
        console.log("[ExchangeOrderDashboard] deliveries list (all):", arr, "exchange only:", exchangeOnly);
        setExchangeDeliveries(exchangeOnly);
      })
      .catch((err) => {
        console.log("[ExchangeOrderDashboard] getMyDeliveries error:", err?.response ?? err);
        setExchangeDeliveries([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const listToShow = exchangeDeliveries;
  const hasCards = listToShow.length > 0;
  const showEmpty = !loading && !hasCards;

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="px-6 py-2 rounded-xl text-sm transition bg-white border border-gray-300 hover:bg-gray-50"
        >
          Orders
        </button>
        <button className="px-6 py-2 rounded-xl text-sm transition bg-black text-white">
          Exchange Orders
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center py-16 text-gray-500">Loading…</div>
      )}

      {hasCards && (
        <div className="space-y-4 flex-1">
          {listToShow.slice(0, visibleCount).map((a) => {
            const order = a?.order ?? {};
            const address = order?.address ?? {};
            const deliveryAddress = buildDeliveryAddress(address);
            const addrDisplay = deliveryAddress || address?.fullAddress || address?.city || "—";
            const status = a?.status ?? "";
            const amount = a?.amountToCollect ?? 0;
            const paymentMode = a?.paymentMode ?? "PREPAID";
            const itemStatus = a?.items?.[0]?.status ?? status;
            const statusLabel = EXCHANGE_STATUS_LABELS[itemStatus] || EXCHANGE_STATUS_LABELS[status] || status;
            return (
              <div
                key={a._id}
                onClick={() => navigate(`/driver/assignment/${a._id}`)}
                className="bg-white rounded-2xl p-4 shadow-md cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <h3 className="font-semibold mb-3">
                  {statusLabel} · {order?.orderId || ""}
                </h3>
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <MapPin size={18} className="text-gray-500 mt-1 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 wrap-break-word">{addrDisplay}</p>
                      <p className="text-sm text-gray-500">Order #{order?.orderId?.slice(-6) || a._id?.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">₹{Number(amount).toFixed(2)}</p>
                    <p className="text-sm font-semibold">{paymentMode}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{statusLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {listToShow.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + 4)}
              className="w-full py-2 text-gray-500 text-sm"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {showEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-gray-600 font-medium">No exchange order assigned</p>
          <p className="text-sm text-gray-500 mt-1">
            When an exchange order is assigned to you, it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}