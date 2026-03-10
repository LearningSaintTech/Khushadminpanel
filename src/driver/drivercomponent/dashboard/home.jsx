import { useState, useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyDeliveries } from "../../apis/driverApi";

/** Item statuses that indicate this assignment is for exchange (pickup/delivery), not regular order delivery */
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

const STATUS_LABELS = {
  ASSIGNED: "New",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await getMyDeliveries();
      console.log("[DriverDashboard home] getMyDeliveries full response:", res);
      console.log("[DriverDashboard home] res?.data:", res?.data);
      const list = res?.data ?? res ?? [];
      const arr = Array.isArray(list) ? list : [];
      const regularOnly = arr.filter((a) => !isExchangeAssignment(a));
      console.log("[DriverDashboard home] deliveries list (all):", arr, "regular only:", regularOnly);
      setDeliveries(regularOnly);
    } catch (err) {
      console.log("[DriverDashboard home] getMyDeliveries error:", err?.response ?? err);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const showApiList = activeTab === "orders" && !loading;
  const listToShow = showApiList ? deliveries : [];
  const hasApiCards = listToShow.length > 0;
  const showEmptyOrders = activeTab === "orders" && !hasApiCards && !loading;

  return (
    <div className="p-4 space-y-4 min-h-screen">
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-5 py-2 rounded-lg text-sm transition ${
            activeTab === "orders" ? "bg-black text-white" : "border border-black"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => navigate("/driver/exchange-orders")}
          className={`px-5 py-2 rounded-lg text-sm transition ${
            activeTab === "exchange" ? "bg-black text-white" : "border border-black"
          }`}
        >
          Exchange Orders
        </button>
      </div>

      {loading && activeTab === "orders" && (
        <div className="text-center text-gray-500 py-4">Loading deliveries…</div>
      )}

      {hasApiCards && (
        <div className="space-y-4">
          {listToShow.slice(0, visibleCount).map((a) => {
            const order = a?.order ?? {};
            const address = order?.address ?? {};
            const deliveryAddress = buildDeliveryAddress(address);
            const addrDisplay = deliveryAddress || address?.fullAddress || address?.city || "—";
            const status = a?.status ?? "";
            const amount = a?.amountToCollect ?? 0;
            const paymentMode = a?.paymentMode ?? "COD";
            return (
              <div
                key={a._id}
                onClick={() => navigate(`/driver/assignment/${a._id}`)}
                className="bg-white rounded-2xl p-4 shadow-md cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <h3 className="font-semibold mb-3">
                  {STATUS_LABELS[status] || status} · {order?.orderId || ""}
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
                    <p className="text-sm font-medium">₹{amount.toFixed(2)}</p>
                    <p className="text-sm font-semibold">{paymentMode}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{STATUS_LABELS[status] || status}</span>
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

      {showEmptyOrders && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-gray-600 font-medium">No order assigned</p>
          <p className="text-sm text-gray-500 mt-1">When an order is assigned to you, it will appear here.</p>
        </div>
      )}
    </div>
  );
}
