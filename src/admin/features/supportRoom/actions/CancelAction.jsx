import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supportCancelItems } from "../api/supportRoomApi";
import { getAllCancellation } from "../../../apis/CancellationPolicyapi";
import { getBackendErrorMessage } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

export default function CancelAction({ order, onDone }) {
  const items = order?.items || [];
  const [selected, setSelected] = useState([]);
  const [policyReason, setPolicyReason] = useState("");
  const [reason, setReason] = useState("");
  const [policyReasons, setPolicyReasons] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAllCancellation(1, 20);
        const list =
          res?.data?.data?.policies ||
          res?.data?.data ||
          res?.data?.policies ||
          [];
        const rows = Array.isArray(list) ? list : [];
        const active = rows.find((p) => p.isActive) || rows[0];
        const reasons = active?.cancellationReasons || [];
        if (!cancelled) setPolicyReasons(Array.isArray(reasons) ? reasons : []);
      } catch {
        if (!cancelled) setPolicyReasons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cancellable = useMemo(
    () =>
      items.filter((it) => {
        const st = String(it.status || "").toUpperCase();
        return st && st !== "CANCELLED" && st !== "DELIVERED" && st !== "REFUNDED";
      }),
    [items]
  );

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected.length) {
      toast.error("Select at least one item");
      return;
    }
    if (!policyReason.trim()) {
      toast.error("Select a policy cancellation reason");
      return;
    }
    if (!reason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    setSaving(true);
    try {
      await supportCancelItems(order.orderId, {
        itemIds: selected,
        reasons: [policyReason],
        reason,
        adminRemark: reason,
      });
      toast.success("Cancellation submitted");
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Cancel failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Cancel line items using cancellation policy reasons. Support reason is logged.
      </p>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
        {cancellable.length === 0 ? (
          <p className="p-3 text-sm text-stone-500">No cancellable items on this order.</p>
        ) : (
          cancellable.map((it) => {
            const id = it._id || it.itemId;
            const sid = String(id);
            return (
              <label
                key={sid}
                className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-stone-50"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(sid)}
                  onChange={() => toggle(sid)}
                />
                <span className="min-w-0">
                  <span className="font-medium text-stone-800">
                    {it.sku || it.variant?.sku || "Item"}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {it.variant?.color} / {it.variant?.size} · {it.status}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <div>
        <label className={labelClass}>Policy reason *</label>
        {policyReasons.length > 0 ? (
          <select
            className={fieldClass}
            value={policyReason}
            onChange={(e) => setPolicyReason(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {policyReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={fieldClass}
            value={policyReason}
            onChange={(e) => setPolicyReason(e.target.value)}
            placeholder="Policy reason text"
            required
          />
        )}
      </div>
      <div>
        <label className={labelClass}>Support reason *</label>
        <textarea
          className={`${fieldClass} min-h-[64px]`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving || !cancellable.length}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Cancelling…" : "Cancel selected"}
      </button>
    </form>
  );
}
