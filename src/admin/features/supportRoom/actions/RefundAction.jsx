import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supportIssueRefund } from "../api/supportRoomApi";
import { getBackendErrorMessage } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

function suggestAmount(order, itemId) {
  if (itemId) {
    const item = (order?.items || []).find(
      (it) => String(it._id) === String(itemId) || String(it.itemId) === String(itemId)
    );
    if (item) {
      const n = Number(item.finalPayable ?? item.subtotalAfterDiscount ?? 0);
      if (Number.isFinite(n) && n > 0) return String(n);
    }
  }
  const total =
    Number(order?.pricing?.grandTotal) ||
    Number(order?.payment?.amount) ||
    0;
  return total > 0 ? String(total) : "";
}

function paymentHint(order) {
  const mode = String(order?.payment?.mode || "").toUpperCase();
  const status = String(order?.payment?.status || "").toUpperCase();
  const paymentId = order?.payment?.paymentId || null;
  if (mode === "RAZORPAY" && status === "SUCCESS" && paymentId) {
    return {
      auto: "RAZORPAY",
      text: `Prepaid Razorpay (${paymentId}). AUTO will call Razorpay refund API.`,
    };
  }
  if (mode === "NIMBLE") {
    return {
      auto: "OTHER",
      text: "Nimble / other gateway — mark as Other source (manual).",
    };
  }
  return {
    auto: "WALLET",
    text: `Payment mode ${mode || "unknown"} — AUTO will credit Khush Wallet.`,
  };
}

export default function RefundAction({ order, onDone }) {
  const items = order?.items || [];
  const hint = useMemo(() => paymentHint(order), [order]);
  const [itemId, setItemId] = useState("");
  const [amount, setAmount] = useState(() => suggestAmount(order, ""));
  const [destination, setDestination] = useState("AUTO");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const onItemChange = (id) => {
    setItemId(id);
    setAmount(suggestAmount(order, id));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    setSaving(true);
    try {
      await supportIssueRefund(order.orderId, {
        itemId: itemId || null,
        amount: amt,
        destination,
        reason: reason.trim(),
        notes: notes.trim(),
      });
      toast.success(
        "Refund request sent — approve it on Orders → Refunds to pay out"
      );
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Refund request failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Send a refund request to <strong>Orders → Refunds</strong>. It stays{" "}
        <strong>REQUESTED</strong> until someone Approves there — then Razorpay
        / wallet runs automatically, or Other source waits for Mark done.
      </p>
      <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        {hint.text}
      </div>

      <div>
        <label className={labelClass}>Line item (optional)</label>
        <select
          className={fieldClass}
          value={itemId}
          onChange={(e) => onItemChange(e.target.value)}
        >
          <option value="">Whole order / custom amount</option>
          {items.map((it) => {
            const id = String(it._id || it.itemId);
            return (
              <option key={id} value={id}>
                {(it.name || it.sku || id).toString().slice(0, 48)} · ₹
                {Number(it.finalPayable || 0).toLocaleString("en-IN")} ·{" "}
                {it.status}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className={labelClass}>Amount (₹)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          className={fieldClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Refund destination</label>
        <select
          className={fieldClass}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="AUTO">AUTO (detect from payment)</option>
          <option value="RAZORPAY">Razorpay API (prepaid only)</option>
          <option value="WALLET">Khush Wallet (automated)</option>
          <option value="OTHER">Other source (manual)</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Support reason</label>
        <textarea
          className={fieldClass}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are we refunding?"
          required
        />
      </div>

      <div>
        <label className={labelClass}>Notes (optional)</label>
        <input
          className={fieldClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal note"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Sending…" : "Send refund request"}
      </button>
    </form>
  );
}
