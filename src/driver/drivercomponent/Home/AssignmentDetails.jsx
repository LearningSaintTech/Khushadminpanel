import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Send, X, Package, IndianRupee, Phone } from "lucide-react";
import { MdArrowBackIos } from "react-icons/md";
import { QRCodeSVG } from "qrcode.react";
import {
  getMyDeliveries,
  acceptDelivery,
  rejectDelivery,
  markPickup,
  markOutForDelivery,
  markExchangeReceived,
  getCodPaymentQr,
  markDelivered,
} from "../../apis/driverApi";

// Full exchange flow (matches timeline: Requested → Approved → … → Completed).
// Driver assignments exist for EXCHANGE_PICKUP_SCHEDULED (pickup) and EXCHANGE_SHIPPED (delivery).
const EXCHANGE_FLOW_STATUSES = [
  "EXCHANGE_REQUESTED",
  "EXCHANGE_APPROVED",
  "EXCHANGE_PICKUP_SCHEDULED",
  "EXCHANGE_PICKED",
  "EXCHANGE_RECEIVED",
  "EXCHANGE_PROCESSING",
  "EXCHANGE_SHIPPED",
  "EXCHANGE_DELIVERED",
  "EXCHANGE_COMPLETED",
];

const EXCHANGE_FLOW_LABELS = {
  EXCHANGE_REQUESTED: "Exchange Requested",
  EXCHANGE_APPROVED: "Exchange Approved",
  EXCHANGE_PICKUP_SCHEDULED: "Exchange Pickup Scheduled",
  EXCHANGE_PICKED: "Exchange Picked",
  EXCHANGE_RECEIVED: "Exchange Received",
  EXCHANGE_PROCESSING: "Exchange Processing",
  EXCHANGE_SHIPPED: "Exchange Shipped",
  EXCHANGE_DELIVERED: "Exchange Delivered",
  EXCHANGE_COMPLETED: "Exchange Completed",
};

// The 4 exchange statuses the driver can update (in order).
const DRIVER_EXCHANGE_STATUSES = [
  "EXCHANGE_PICKED",
  "EXCHANGE_RECEIVED",
  "EXCHANGE_SHIPPED",
  "EXCHANGE_DELIVERED",
];
const DRIVER_EXCHANGE_LABELS = {
  EXCHANGE_PICKED: "Exchange Picked",
  EXCHANGE_RECEIVED: "Exchange Received",
  EXCHANGE_SHIPPED: "Exchange Shipped",
  EXCHANGE_DELIVERED: "Exchange Delivered",
};

// Item statuses that indicate a driver assignment is for an exchange (subset of EXCHANGE_FLOW_STATUSES).
const EXCHANGE_ITEM_STATUSES = EXCHANGE_FLOW_STATUSES.filter(
  (s) => !["EXCHANGE_REQUESTED", "EXCHANGE_APPROVED"].includes(s)
);

function isExchangeAssignment(assignment) {
  const items = assignment?.items ?? [];
  return items.some(
    (it) => it?.status && EXCHANGE_ITEM_STATUSES.includes(String(it.status).toUpperCase())
  );
}

/** True if this exchange is for pickup (collect item from customer); false if for delivery (deliver replacement) */
function isExchangePickup(assignment) {
  const items = assignment?.items ?? [];
  const pickupStatuses = ["EXCHANGE_PICKUP_SCHEDULED", "EXCHANGE_PICKED", "EXCHANGE_RECEIVED", "EXCHANGE_PROCESSING"];
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
};

const EXCHANGE_STATUS_LABELS = {
  ASSIGNED: "New exchange assignment",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export default function AssignmentDetails() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  // COD: Cash vs Online flow
  const [codPaymentChoice, setCodPaymentChoice] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [qrImageBase64, setQrImageBase64] = useState(null);
  const [showQr, setShowQr] = useState(false);
  // Confirm before accept/reject: 'accept' | 'reject' | null
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    console.log("[AssignmentDetails] Load assignment", { assignmentId });
    (async () => {
      try {
        const res = await getMyDeliveries();
        const list = res?.data ?? res ?? [];
        const found = Array.isArray(list) ? list.find((a) => String(a._id) === String(assignmentId)) : null;
        if (!cancelled) {
          setAssignment(found || null);
          if (!found && list.length >= 0) setError("Assignment not found.");
          console.log("[AssignmentDetails] Assignment loaded", { found: !!found, status: found?.status, paymentMode: found?.paymentMode });
        }
      } catch (err) {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Failed to load");
          console.log("[AssignmentDetails] Load error", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const runAction = async (fn, body, options = {}) => {
    if (!assignmentId) return;
    const actionName = body?.paymentCollectedMethod ? `markDelivered(${body.paymentCollectedMethod})` : fn?.name || "action";
    const isMarkDelivered = body?.paymentCollectedMethod !== undefined;
    const isExchangeReceived = options?.successType === "exchangeReceived";
    const isReject = options?.successType === "reject";
    const currentAssignment = assignment; // capture before refetch (delivered/rejected assignments are excluded from getMyDeliveries)
    console.log("[AssignmentDetails] Run action", { assignmentId, actionName, body });
    setActionLoading(true);
    setError("");
    try {
      if (body !== undefined) await fn(assignmentId, body);
      else await fn(assignmentId);
      const res = await getMyDeliveries();
      const list = res?.data ?? res ?? [];
      const updated = Array.isArray(list) ? list.find((a) => String(a._id) === String(assignmentId)) : null;
      const notInList = updated == null; // list.find returns undefined when not found; delivered/rejected are excluded
      setAssignment(updated || null);
      console.log("[AssignmentDetails] Action success", { actionName, newStatus: updated?.status, notInList });
      // Rejected assignments are excluded from list; go back to dashboard
      if (isReject && notInList) {
        navigate("/driver/dashboard", { replace: true });
        return;
      }
      // "Exchange Received" also sets assignment to DELIVERED, so it disappears from list; show success
      if (isExchangeReceived) {
        const source = updated || currentAssignment;
        navigate("/driver/delivery-success", {
          state: {
            orderId: source?.order?.orderId ?? source?.orderId ?? "",
            amount: source?.amountToCollect ?? 0,
            isExchange: true,
            isExchangeReceived: true,
          },
          replace: true,
        });
        return;
      }
      // Delivered assignments (regular + exchange) are excluded from getMyDeliveries(), so updated is null/undefined after delivery
      const justDelivered =
        updated?.status === "DELIVERED" ||
        isMarkDelivered ||
        (notInList && currentAssignment?.status === "OUT_FOR_DELIVERY");
      if (justDelivered) {
        const source = updated || currentAssignment;
        const orderId = source?.order?.orderId ?? source?.orderId ?? "";
        const amount = source?.amountToCollect ?? 0;
        const isExchange = isExchangeAssignment(source);
        navigate("/driver/delivery-success", {
          state: { orderId, amount, isExchange },
          replace: true,
        });
        return;
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Action failed");
      console.log("[AssignmentDetails] Action failed", { actionName, err: typeof err === "string" ? err : err?.message });
    } finally {
      setActionLoading(false);
    }
  };

  const refreshAssignment = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const res = await getMyDeliveries();
      const list = res?.data ?? res ?? [];
      const found = Array.isArray(list) ? list.find((a) => String(a._id) === String(assignmentId)) : null;
      if (found) {
        if (found.codOnlinePaymentReceived) {
          console.log("[AssignmentDetails] Poll: payment received ✓", { assignmentId });
        }
        setAssignment(found);
      }
    } catch (_) {}
  }, [assignmentId]);

  // Poll for COD online payment received when QR is shown. Stop once payment received to avoid unnecessary API calls.
  const shouldPoll = showQr && assignmentId && assignment?.paymentMode === "COD" && !assignment?.codOnlinePaymentReceived;
  useEffect(() => {
    if (!shouldPoll) return;
    console.log("[AssignmentDetails] Start polling for COD payment (every 2s)", { assignmentId });
    const interval = setInterval(refreshAssignment, 2000);
    return () => {
      console.log("[AssignmentDetails] Stop polling", { assignmentId });
      clearInterval(interval);
    };
  }, [shouldPoll, refreshAssignment, assignmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate("/driver/dashboard")} className="px-6 py-2 bg-black text-white rounded-xl">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const order = assignment?.order ?? {};
  const address = order?.address ?? {};
  const payment = order?.payment ?? {};
  const items = assignment?.items ?? [];
  const status = assignment?.status ?? "";
  const amountToCollect = assignment?.amountToCollect ?? 0;
  const paymentMode = assignment?.paymentMode ?? "COD";

  const isExchange = isExchangeAssignment(assignment);
  const isPickup = isExchange && isExchangePickup(assignment);
  const statusLabel = isExchange ? (EXCHANGE_STATUS_LABELS[status] || STATUS_LABELS[status] || status) : (STATUS_LABELS[status] || status);

  // Build a single-line address for display and for Google Maps (Get direction)
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

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex justify-center">
      <div className="w-full max-w-[420px] flex flex-col bg-[#f2f2f2]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-white border-b border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <MdArrowBackIos size={22} className="text-gray-800" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[15px] font-bold tracking-wide text-gray-900">
              {isExchange ? (isPickup ? "Exchange pickup" : "Exchange delivery") : "Order details"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">#{orderId}</p>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
          {/* Status & type card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
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

              {isExchange && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Exchange progress
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DRIVER_EXCHANGE_STATUSES.map((driverStatus) => {
                      const itemStatuses = [...new Set(items.map((it) => (it?.status || "").toUpperCase()).filter(Boolean))];
                      const statusesConsideredDone = {
                        EXCHANGE_PICKED: ["EXCHANGE_PICKED", "EXCHANGE_RECEIVED", "EXCHANGE_SHIPPED", "OUT_FOR_DELIVERY", "EXCHANGE_DELIVERED"],
                        EXCHANGE_RECEIVED: ["EXCHANGE_RECEIVED", "EXCHANGE_SHIPPED", "OUT_FOR_DELIVERY", "EXCHANGE_DELIVERED"],
                        EXCHANGE_SHIPPED: ["EXCHANGE_SHIPPED", "OUT_FOR_DELIVERY", "EXCHANGE_DELIVERED"],
                        EXCHANGE_DELIVERED: ["EXCHANGE_DELIVERED"],
                      };
                      const done = itemStatuses.some((st) => (statusesConsideredDone[driverStatus] || []).includes(st));
                      const current = itemStatuses.some((st) => st === driverStatus) ||
                        (driverStatus === "EXCHANGE_SHIPPED" && itemStatuses.includes("OUT_FOR_DELIVERY"));
                      return (
                        <span
                          key={driverStatus}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                            done
                              ? "bg-violet-100 text-violet-700"
                              : current
                                ? "bg-violet-200 text-violet-900 font-semibold"
                                : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {DRIVER_EXCHANGE_LABELS[driverStatus]}
                          {done && " ✓"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Package size={18} className="text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-800">Items ({items.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const imageUrl = item?.variant?.imageUrl || "https://picsum.photos/100/87";
                const itemKey = item?.sku ? `${item.sku}-${idx}` : `item-${idx}`;
                const lineTotal = ((item?.unitPrice ?? 0) * (item?.quantity ?? 1));
                const productName = item?.variant?.name ?? item?.productName ?? null;
                return (
                  <div key={itemKey} className="flex gap-4 p-4">
                    <button
                      type="button"
                      onClick={() => setImagePreviewUrl(imageUrl)}
                      className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                    >
                      <img
                        src={imageUrl}
                        alt={productName || item?.sku || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      {productName && (
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{productName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {item?.sku ?? "—"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Qty: {item?.quantity ?? 1}</span>
                        <span className="text-sm font-semibold text-gray-900">₹{lineTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Address card */}
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
            {import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY && deliveryAddressString && (
              <div className="px-4 pb-4">
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
                  <iframe
                    title={isExchange && isPickup ? "Pickup location" : "Delivery location"}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(deliveryAddressString)}`}
                  />
                </div>
              </div>
            )}
            <div className="px-4 pb-4">
              <a
                href={mapsDirectionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                {isExchange && isPickup ? "Get direction (pickup)" : "Get direction"}
                <Send size={16} />
              </a>
            </div>
          </div>

          {/* Payment summary card */}
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

        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Confirm Accept / Reject modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmAction(null)}>
            <div
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-[15px] font-medium text-gray-900">
                {confirmAction === "accept"
                  ? isExchange
                    ? "Accept this exchange assignment?"
                    : "Accept this order?"
                  : isExchange
                    ? "Reject this exchange assignment?"
                    : "Reject this order?"}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 h-[48px] border border-gray-300 rounded-xl text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction === "accept") {
                      setConfirmAction(null);
                      runAction(acceptDelivery);
                    } else {
                      setConfirmAction(null);
                      runAction(rejectDelivery, undefined, { successType: "reject" });
                    }
                  }}
                  disabled={actionLoading}
                  className={`flex-1 h-[48px] rounded-xl text-[14px] font-semibold disabled:opacity-70 ${
                    confirmAction === "accept"
                      ? "bg-black text-white"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {actionLoading ? "…" : "Yes"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white px-4 py-4 space-y-3 border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] safe-area-pb">
          {status === "ASSIGNED" && (
            <>
              <button
                onClick={() => setConfirmAction("accept")}
                disabled={actionLoading}
                className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
              >
                {actionLoading ? "…" : isExchange ? "Accept exchange" : "Accept"}
              </button>
              <button
                onClick={() => setConfirmAction("reject")}
                disabled={actionLoading}
                className="w-full h-[52px] border border-gray-400 rounded-xl text-[14px] font-semibold disabled:opacity-70"
              >
                {isExchange ? "Reject exchange" : "Reject"}
              </button>
            </>
          )}
          {status === "ACCEPTED" && (
            <button
              onClick={() => runAction(markPickup)}
              disabled={actionLoading}
              className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
            >
              {actionLoading
                ? "…"
                : isExchange && isPickup
                  ? "Exchange Picked"
                  : isExchange
                    ? "Mark pickup"
                    : "Mark Pickup"}
            </button>
          )}
          {status === "PICKED_UP" && isExchange && isPickup && (
            <button
              onClick={() => runAction(markExchangeReceived, undefined, { successType: "exchangeReceived" })}
              disabled={actionLoading}
              className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
            >
              {actionLoading ? "…" : "Exchange Received"}
            </button>
          )}
          {status === "PICKED_UP" && (!isExchange || !isPickup) && (
            <button
              onClick={() => runAction(markOutForDelivery)}
              disabled={actionLoading}
              className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
            >
              {actionLoading ? "…" : isExchange ? "Exchange Shipped" : "Out for Delivery"}
            </button>
          )}
          {status === "OUT_FOR_DELIVERY" && paymentMode !== "COD" && (
            <button
              onClick={() => runAction(markDelivered)}
              disabled={actionLoading}
              className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
            >
              {actionLoading ? "…" : isExchange ? "Exchange Delivered" : "Mark Delivered"}
            </button>
          )}
          {status === "OUT_FOR_DELIVERY" && paymentMode === "COD" && (
            <>
              {codPaymentChoice === null && (
                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-gray-700">Customer paid by?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("[AssignmentDetails] COD choice: CASH");
                        setCodPaymentChoice("CASH");
                      }}
                      className="flex-1 h-[48px] bg-amber-500 text-white rounded-xl text-[14px] font-semibold"
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log("[AssignmentDetails] COD choice: ONLINE (QR)");
                        setCodPaymentChoice("ONLINE");
                      }}
                      className="flex-1 h-[48px] bg-green-600 text-white rounded-xl text-[14px] font-semibold"
                    >
                      Online (QR)
                    </button>
                  </div>
                </div>
              )}
              {codPaymentChoice === "CASH" && (
                <button
                  onClick={() => runAction(markDelivered, { paymentCollectedMethod: "CASH" })}
                  disabled={actionLoading}
                  className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
                >
                  {actionLoading ? "…" : isExchange ? "Exchange Delivered (Cash)" : "Mark Delivered (Cash)"}
                </button>
              )}
              {codPaymentChoice === "ONLINE" && !showQr && (
                <button
                  onClick={async () => {
                    console.log("[AssignmentDetails] Request COD payment QR", { assignmentId });
                    setActionLoading(true);
                    setError("");
                    try {
                      const res = await getCodPaymentQr(assignmentId);
                      const data = res?.data ?? res ?? {};
                      setQrImageUrl(data.imageUrl);
                      setQrImageBase64(data.imageBase64 || null);
                      setShowQr(true);
                      console.log("[AssignmentDetails] QR generated, showing to customer", { hasImageUrl: !!data.imageUrl, hasBase64: !!data.imageBase64 });
                    } catch (err) {
                      setError(typeof err === "string" ? err : "Failed to load QR");
                      console.log("[AssignmentDetails] QR generation failed", { err: typeof err === "string" ? err : err?.message });
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className="w-full h-[52px] bg-green-600 text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
                >
                  {actionLoading ? "…" : "Show QR to customer"}
                </button>
              )}
              {codPaymentChoice === "ONLINE" && showQr && (
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-gray-700">Scan QR to pay ₹{amountToCollect.toFixed(2)}</p>
                  {(qrImageUrl || qrImageBase64) && (
                    <div className="flex flex-col items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
                      {qrImageBase64 ? (
                        <img
                          src={`data:image/png;base64,${qrImageBase64}`}
                          alt="Scan to pay via UPI"
                          className="w-[250px] h-[250px] object-contain bg-white"
                        />
                      ) : (
                        <div className="flex justify-center p-3 bg-white rounded-lg">
                          <QRCodeSVG value={qrImageUrl} size={250} level="M" includeMargin />
                        </div>
                      )}
                      <p className="text-[12px] text-gray-600 text-center">Customer scans with GPay, PhonePe or any UPI app</p>
                    </div>
                  )}
                  {assignment?.codOnlinePaymentReceived ? (
                    <>
                      <p className="text-center text-green-600 font-semibold text-[14px]">Payment received ✓</p>
                      <button
                        onClick={() => {
                          console.log("[AssignmentDetails] Mark Delivered (ONLINE) – payment already received");
                          runAction(markDelivered, { paymentCollectedMethod: "ONLINE" });
                        }}
                        disabled={actionLoading}
                        className="w-full h-[52px] bg-black text-white rounded-xl text-[14px] font-semibold disabled:opacity-70"
                      >
                        {actionLoading ? "…" : isExchange ? "Exchange Delivered" : "Mark Delivered"}
                      </button>
                    </>
                  ) : (
                    <p className="text-center text-gray-500 text-[13px]">Waiting for payment…</p>
                  )}
                </div>
              )}
            </>
          )}
          {(status === "DELIVERED" || status === "REJECTED" || status === "CANCELLED") && (
            <p className="text-center text-gray-500 text-sm">
              {isExchange && status === "DELIVERED" ? "Exchange complete. No actions available." : "No actions available."}
            </p>
          )}
        </div>
      </div>

      {/* Image preview lightbox – large view on click */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagePreviewUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setImagePreviewUrl(null)}
          aria-label="Close image preview"
        >
          <button
            type="button"
            onClick={() => setImagePreviewUrl(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <img
            src={imagePreviewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
