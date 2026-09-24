import React, { useState } from "react";
import toast from "react-hot-toast";
import { supportSyncTracking } from "../api/supportRoomApi";
import { getBackendErrorMessage } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

export default function SyncTrackingAction({ order, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    setSaving(true);
    try {
      const res = await supportSyncTracking(order.orderId, { reason });
      const data = res?.data?.data || res?.data || {};
      setLastResult(data.results || data);
      toast.success("Tracking sync attempted");
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Sync failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Pulls latest tracking for Delhivery waybills and Shadowfax AWBs on this order.
      </p>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Shiprocket sync-tracking is not wired in Support Room yet (phase 2). Any Shiprocket AWBs
        found are reported as skipped.
      </div>
      <div>
        <label className={labelClass}>Support reason *</label>
        <textarea
          className={`${fieldClass} min-h-[64px]`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="e.g. Customer reports status stuck — syncing carriers"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Syncing…" : "Sync tracking"}
      </button>
      {lastResult ? (
        <pre className="max-h-40 overflow-auto rounded-lg bg-stone-50 p-3 text-[11px] text-stone-600">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
