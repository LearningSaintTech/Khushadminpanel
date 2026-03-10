import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrderHistory, getExchangeHistory } from "../../apis/driverApi";

export default function ExchangeOrderHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("exchange");
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = (tab, page = 1, limit = 20) => {
    const apiName = tab === "exchange" ? "getExchangeHistory" : "getOrderHistory";
    console.log("[Driver ExchangeOrderHistory] fetchList", { tab, page, limit, apiName });
    setLoading(true);
    setError("");
    const api = tab === "exchange" ? getExchangeHistory(page, limit) : getOrderHistory(page, limit);
    api
      .then((res) => {
        const raw = res?.data ?? res;
        const payload = raw?.data ?? raw;
        const listData = Array.isArray(payload?.list) ? payload.list : [];
        const paginationData = payload?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 };
        console.log("[Driver ExchangeOrderHistory] response", { tab, listLength: listData.length, pagination: paginationData });
        setList(listData);
        setPagination(paginationData);
      })
      .catch((err) => {
        console.log("[Driver ExchangeOrderHistory] error", { tab, err });
        setError(typeof err === "string" ? err : "Failed to load history");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    console.log("[Driver ExchangeOrderHistory] useEffect run fetchList", activeTab);
    fetchList(activeTab);
  }, [activeTab]);

  const onTabChange = (tab) => {
    setActiveTab(tab);
  };

  const emptyMessage = activeTab === "orders"
    ? "Your delivered orders will appear here."
    : "Your exchange order history will appear here.";
  const emptyTitle = activeTab === "orders"
    ? "No orders in history"
    : "No exchange orders in history";

  return (
    <div className="min-h-screen mx-auto bg-[#f2f2f2] flex flex-col">
      <div className="flex items-center justify-center h-14 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-sm font-semibold tracking-widest">ORDER HISTORY</h1>
      </div>

      <div className="flex gap-3 px-5 mt-6 shrink-0">
        <button
          onClick={() => onTabChange("orders")}
          className={`px-6 py-2 rounded-lg text-sm border transition ${
            activeTab === "orders"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-400"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => onTabChange("exchange")}
          className={`px-6 py-2 rounded-lg text-sm border transition ${
            activeTab === "exchange"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-400"
          }`}
        >
          Exchange Orders
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {loading && (
          <p className="text-center text-gray-500 py-8">Loading…</p>
        )}
        {error && (
          <p className="text-center text-red-600 py-4">{error}</p>
        )}
        {!loading && !error && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-600 font-medium">{emptyTitle}</p>
            <p className="text-sm text-gray-500 mt-1">{emptyMessage}</p>
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="mt-6 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        )}
        {!loading && !error && list.length > 0 && (
          <div className="space-y-3 pb-6">
            {list.map((a) => (
              <div
                key={a._id}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                <p className="font-semibold text-sm">Order #{a.orderId}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {a.order?.address?.city}, {a.order?.address?.pincode}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Delivered {a.deliveredAt ? new Date(a.deliveredAt).toLocaleDateString() : "—"}
                </p>
                {activeTab === "exchange" && a.items?.length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Exchange: {a.items.map((i) => i.status).filter(Boolean).join(", ") || "—"}
                  </p>
                )}
                <p className="text-sm font-medium mt-2">
                  ₹{Number(a.order?.pricing?.finalPayable ?? a.amountToCollect ?? 0).toFixed(2)}
                </p>
              </div>
            ))}
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="w-full mt-4 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
