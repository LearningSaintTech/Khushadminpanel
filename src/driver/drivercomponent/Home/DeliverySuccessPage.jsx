import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Home, Package } from "lucide-react";

export default function DeliverySuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state ?? {};
  const orderId = state.orderId ?? state.order_id ?? "—";
  const amount = state.amount ?? 0;
  const isExchange = state.isExchange ?? false;
  const isExchangeReceived = state.isExchangeReceived ?? false;

  const title = isExchangeReceived
    ? "Exchange received"
    : isExchange
      ? "Exchange delivered"
      : "Order delivered";
  const message = isExchangeReceived
    ? "Item handed over at warehouse. Exchange pickup complete."
    : isExchange
      ? "You have completed the exchange delivery."
      : "Payment received. Order delivered successfully.";

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <CheckCircle size={56} className="text-emerald-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 text-center">
        {title}
      </h1>
      <p className="text-sm text-gray-500 mt-2 text-center">
        {message}
      </p>
      {(orderId !== "—" || amount > 0) && (
        <div className="mt-6 w-full max-w-[280px] bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {orderId !== "—" && (
            <p className="text-sm text-gray-600">
              Order <span className="font-semibold text-gray-900">#{orderId}</span>
            </p>
          )}
          {amount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Amount <span className="font-semibold text-gray-900">₹{Number(amount).toFixed(2)}</span>
            </p>
          )}
        </div>
      )}
      <div className="mt-10 w-full max-w-[280px] space-y-3">
        <button
          type="button"
          onClick={() => navigate("/driver/dashboard")}
          className="w-full h-12 bg-black text-white rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Home size={20} />
          Back to dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate("/driver/order-history")}
          className="w-full h-12 border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <Package size={20} />
          Order history
        </button>
      </div>
    </div>
  );
}
