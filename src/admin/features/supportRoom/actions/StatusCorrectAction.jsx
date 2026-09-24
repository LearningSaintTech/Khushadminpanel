import React, { useState } from "react";
import toast from "react-hot-toast";
import { supportCorrectItemStatus } from "../api/supportRoomApi";
import { getBackendErrorMessage, LINE_STATUS_OPTIONS } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

export default function StatusCorrectAction({ order, onDone }) {
  const items = order?.items || [];
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!itemId || !status || !reason.trim()) {
      toast.error("Item, status, and reason are required");
      return;
    }
    setSaving(true);
    try {
      await supportCorrectItemStatus(order.orderId, itemId, { status, reason });
      toast.success("Status corrected");
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Status update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Correct a line status. Every change requires a support reason and is audited.
      </p>
      <div>
        <label className={labelClass}>Line item *</label>
        <select
          className={fieldClass}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          required
        >
          <option value="">Select…</option>
          {items.map((it) => {
            const id = String(it._id || it.itemId);
            return (
              <option key={id} value={id}>
                {(it.sku || "Item") + ` · ${it.status}`}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className={labelClass}>New status *</label>
        <select
          className={fieldClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
        >
          <option value="">Select…</option>
          {LINE_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Correct status"}
      </button>
    </form>
  );
}
