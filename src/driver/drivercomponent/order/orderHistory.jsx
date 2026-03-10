import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrderHistory } from "../../apis/driverApi";

export default function OrderHistory() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    console.log("[Driver OrderHistory] mount, calling getOrderHistory(1, 20)");
    setLoading(true);
    setError("");
    getOrderHistory(1, 20)
      .then((res) => {
        if (cancelled) return;
        console.log("[Driver OrderHistory] getOrderHistory response", { res: res?.data ?? res });
        const raw = res?.data ?? res;
        const payload = raw?.data ?? raw;
        const listData = Array.isArray(payload?.list) ? payload.list : [];
        const paginationData = payload?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 };
        console.log("[Driver OrderHistory] payload", { listLength: listData.length, pagination: paginationData });
        setList(listData);
        setPagination(paginationData);
      })
      .catch((err) => {
        console.log("[Driver OrderHistory] getOrderHistory error", err);
        if (!cancelled) setError(typeof err === "string" ? err : "Failed to load order history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen mx-auto bg-[#f2f2f2] flex flex-col">
      <div className="flex items-center justify-center h-14 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-sm font-semibold tracking-widest">ORDER HISTORY</h1>
      </div>

      <div className="flex gap-3 px-5 mt-6 shrink-0">
        <button
          className="bg-black text-white px-6 py-2 rounded-lg text-sm"
        >
          Orders
        </button>
        <button
          onClick={() => navigate("/driver/exchange-order-history")}
          className="border border-black px-6 py-2 rounded-lg text-sm"
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
            <p className="text-gray-600 font-medium">No orders in history</p>
            <p className="text-sm text-gray-500 mt-1">
              Your delivered orders will appear here once you complete deliveries.
            </p>
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
