import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, IndianRupee, Repeat, XCircle, ChevronRight } from "lucide-react";
import { getOrderHistory, getExchangeHistory, getRejectedHistory } from "../../apis/driverApi";

function formatDeliveredDate(dateVal) {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

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

export default function OrderHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [ordersList, setOrdersList] = useState([]);
  const [exchangeList, setExchangeList] = useState([]);
  const [rejectedList, setRejectedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      getOrderHistory(1, 20),
      getExchangeHistory(1, 20),
      getRejectedHistory(1, 20),
    ])
      .then(([ordersRes, exchangeRes, rejectedRes]) => {
        if (cancelled) return;
        const ordersRaw = ordersRes?.data ?? ordersRes;
        const ordersPayload = ordersRaw?.data ?? ordersRaw;
        const ordersData = Array.isArray(ordersPayload?.list)
          ? ordersPayload.list
          : [];
        setOrdersList(ordersData);

        const exchangeRaw = exchangeRes?.data ?? exchangeRes;
        const exchangePayload = exchangeRaw?.data ?? exchangeRaw;
        const exchangeData = Array.isArray(exchangePayload?.list)
          ? exchangePayload.list
          : [];
        setExchangeList(exchangeData);

        const rejectedRaw = rejectedRes?.data ?? rejectedRes;
        const rejectedPayload = rejectedRaw?.data ?? rejectedRaw;
        const rejectedData = Array.isArray(rejectedPayload?.list)
          ? rejectedPayload.list
          : [];
        setRejectedList(rejectedData);
      })
      .catch((err) => {
        if (!cancelled)
          setError(typeof err === "string" ? err : "Failed to load order history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const listByTab = {
    orders: ordersList,
    exchange: exchangeList,
    rejected: rejectedList,
  };
  const list = listByTab[activeTab] ?? [];
  const hasList = list.length > 0;
  const showEmpty = !loading && !error && !hasList;

  const emptyConfig = {
    orders: {
      title: "No orders in history",
      message:
        "Your delivered orders will appear here once you complete deliveries.",
      icon: Package,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-400",
    },
    exchange: {
      title: "No exchange orders in history",
      message: "Your exchange order history will appear here.",
      icon: Repeat,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-400",
    },
    rejected: {
      title: "No rejected orders",
      message: "Orders you reject will appear here.",
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-400",
    },
  };
  const empty = emptyConfig[activeTab] ?? emptyConfig.orders;
  const EmptyIcon = empty.icon;

  const handleCardClick = (assignment) => {
    navigate("/driver/order-detail", { state: { assignment } });
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Package size={20} className="text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Order history</h1>
            <p className="text-xs text-gray-500 mt-0.5">Orders, exchange & rejected</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "orders"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("exchange")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "exchange"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Exchange
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "rejected"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-4/5 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-red-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {showEmpty && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className={`w-20 h-20 rounded-full ${empty.iconBg} flex items-center justify-center mb-4`}
            >
              <EmptyIcon size={36} className={empty.iconColor} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{empty.title}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[260px]">
              {empty.message}
            </p>
            <button
              type="button"
              onClick={() => navigate("/driver/dashboard")}
              className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        )}

        {hasList && !loading && (
          <div className="space-y-3 pb-6">
            {list.map((a) => {
              const city = a.order?.address?.city ?? "";
              const pincode = a.order?.address?.pincode ?? "";
              const location = [city, pincode].filter(Boolean).join(", ") || "—";
              const amount = Number(
                a.order?.pricing?.finalPayable ?? a.amountToCollect ?? 0
              ).toFixed(2);
              const isExchange = isExchangeAssignment(a);
              const isRejected = String(a?.status).toUpperCase() === "REJECTED";
              return (
                <button
                  type="button"
                  key={a._id}
                  onClick={() => handleCardClick(a)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isExchange && activeTab !== "orders" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-800">
                            Exchange
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                        <p className="font-semibold text-gray-900">
                          #{a.orderId ?? a._id?.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        <span className="line-clamp-1">{location}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {isRejected
                          ? `Rejected ${formatDeliveredDate(a.updatedAt)}`
                          : `Delivered ${formatDeliveredDate(a.deliveredAt)}`}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <IndianRupee size={16} className="text-gray-500" />
                        <span className="text-lg font-bold text-gray-900">
                          ₹{amount}
                        </span>
                      </span>
                      <ChevronRight size={20} className="text-gray-300" />
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate("/driver/dashboard")}
              className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-white transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
