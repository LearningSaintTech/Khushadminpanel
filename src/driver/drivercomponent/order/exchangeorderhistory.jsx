import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Repeat, MapPin, IndianRupee, ChevronRight } from "lucide-react";
import { getOrderHistory, getExchangeHistory } from "../../apis/driverApi";

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

export default function ExchangeOrderHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("exchange");
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = (tab, page = 1, limit = 20) => {
    setLoading(true);
    setError("");
    const api = tab === "exchange" ? getExchangeHistory(page, limit) : getOrderHistory(page, limit);
    api
      .then((res) => {
        const raw = res?.data ?? res;
        const payload = raw?.data ?? raw;
        const listData = Array.isArray(payload?.list) ? payload.list : [];
        const paginationData =
          payload?.pagination ?? {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          };
        setList(listData);
        setPagination(paginationData);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to load history");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList(activeTab);
  }, [activeTab]);

  const hasList = list.length > 0;
  const showEmpty = !loading && !error && !hasList;
  const isExchangeTab = activeTab === "exchange";

  const emptyTitle = isExchangeTab
    ? "No exchange orders in history"
    : "No orders in history";
  const emptyMessage = isExchangeTab
    ? "Your exchange order history will appear here."
    : "Your delivered orders will appear here.";

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Repeat size={20} className="text-violet-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Order history</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isExchangeTab ? "Exchange deliveries" : "Delivered orders"}
            </p>
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
                <div className="flex gap-2 mb-2">
                  {isExchangeTab && (
                    <div className="h-4 bg-violet-200 rounded w-16" />
                  )}
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-4/5 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => fetchList(activeTab)}
              className="mt-2 text-sm font-medium text-red-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                isExchangeTab ? "bg-violet-50" : "bg-gray-100"
              }`}
            >
              <Repeat
                size={36}
                className={isExchangeTab ? "text-violet-400" : "text-gray-400"}
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{emptyTitle}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[260px]">{emptyMessage}</p>
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
              const exchangeStatuses = a.items
                ?.map((i) => i.status)
                .filter(Boolean);
              return (
                <button
                  type="button"
                  key={a._id}
                  onClick={() =>
                    navigate("/driver/order-detail", { state: { assignment: a } })
                  }
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isExchangeTab && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-800">
                            Exchange
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
                        Delivered {formatDeliveredDate(a.deliveredAt)}
                      </p>
                      {isExchangeTab && exchangeStatuses?.length > 0 && (
                        <p className="text-xs text-violet-600 mt-1">
                          {exchangeStatuses.join(", ")}
                        </p>
                      )}
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
