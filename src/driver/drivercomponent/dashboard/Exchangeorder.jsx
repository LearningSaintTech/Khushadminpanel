import { useState, useEffect } from "react";
import { MapPin, Package, RefreshCw, ChevronRight, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyDeliveries } from "../../apis/driverApi";

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
  EXCHANGE_SHIPPED: "Shipped",
  EXCHANGE_DELIVERED: "Delivered",
};

export default function ExchangeOrderDashboard() {
  const navigate = useNavigate();
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);

  const fetchDeliveries = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMyDeliveries();
      const list = res?.data ?? res ?? [];
      const arr = Array.isArray(list) ? list : [];
      setAllDeliveries(arr);
    } catch {
      setAllDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const deliveries = allDeliveries.filter((a) => !isExchangeAssignment(a));
  const exchangeDeliveries = allDeliveries.filter((a) => isExchangeAssignment(a));
  const newOrdersCount = deliveries.filter((a) => String(a?.status) === "ASSIGNED").length;
  const newExchangeCount = exchangeDeliveries.filter((a) => String(a?.status) === "ASSIGNED").length;

  const listToShow = exchangeDeliveries;
  const hasCards = listToShow.length > 0;
  const showEmpty = !loading && !hasCards;

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => navigate("/driver/dashboard")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5"
          >
            Orders
            {newOrdersCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                {newOrdersCount > 99 ? "99+" : newOrdersCount}
              </span>
            )}
          </button>
          <button
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-white text-gray-900 shadow-sm flex items-center justify-center gap-1.5"
          >
            Exchange
            {newExchangeCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-violet-500 text-white text-xs font-bold">
                {newExchangeCount > 99 ? "99+" : newExchangeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Exchange orders</h2>
          {hasCards && (
            <button
              type="button"
              onClick={() => fetchDeliveries(true)}
              disabled={refreshing}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex gap-2 mb-2">
                  <div className="h-4 bg-violet-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-4/5 mb-4" />
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasCards && !loading && (
          <div className="space-y-3">
            {listToShow.slice(0, visibleCount).map((a) => {
              const order = a?.order ?? {};
              const address = order?.address ?? {};
              const deliveryAddress = buildDeliveryAddress(address);
              const addrDisplay = deliveryAddress || address?.fullAddress || address?.city || "—";
              const status = a?.status ?? "";
              const amount = a?.amountToCollect ?? 0;
              const paymentMode = a?.paymentMode ?? "PREPAID";
              const itemStatus = a?.items?.[0]?.status ?? status;
              const statusLabel =
                EXCHANGE_STATUS_LABELS[itemStatus] ||
                EXCHANGE_STATUS_LABELS[status] ||
                status;
              const itemCount = a?.items?.length ?? 0;
              return (
                <button
                  type="button"
                  key={a._id}
                  onClick={() => navigate(`/driver/assignment/${a._id}`)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md active:scale-[0.99] transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200">
                          Exchange
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            status === "ASSIGNED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{order?.orderId?.slice(-8) || a._id?.slice(-8)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
                        <p className="line-clamp-2 wrap-break-word">{addrDisplay}</p>
                      </div>
                      {itemCount > 0 && (
                        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                          <Package size={12} />
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{Number(amount).toFixed(2)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          paymentMode === "COD"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {paymentMode}
                      </span>
                      <ChevronRight size={20} className="text-gray-300 mt-1" />
                    </div>
                  </div>
                </button>
              );
            })}
            {listToShow.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 6)}
                className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mb-4">
              <Repeat size={36} className="text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No exchange orders</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[260px]">
              When an exchange is assigned to you, it will appear here. You can pick up or deliver exchange items.
            </p>
            <button
              type="button"
              onClick={() => navigate("/driver/dashboard")}
              className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              View orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
