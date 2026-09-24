import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { patchSupportAddress } from "../api/supportRoomApi";
import { getBackendErrorMessage } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

function buildAddressForm(order) {
  const addr = order?.address || {};
  const user =
    order?.user && typeof order.user === "object"
      ? order.user
      : order?.userId && typeof order.userId === "object"
        ? order.userId
        : {};
  return {
    name: addr.name || user.name || "",
    phone: addr.phone || user.phoneNumber || user.phone || "",
    pincode: addr.pincode || "",
    city: addr.city || "",
    state: addr.state || "",
    fullAddress: addr.fullAddress || "",
    reason: "",
  };
}

export default function AddressAction({ order, onDone }) {
  const [form, setForm] = useState(() => buildAddressForm(order));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildAddressForm(order));
  }, [order?.orderId, order?.address, order?.user, order?.userId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    setSaving(true);
    try {
      await patchSupportAddress(order.orderId, form);
      toast.success("Address updated");
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to update address"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-stone-600">
        Update shipping contact fields. Changes are logged with before/after.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Name</label>
          <input className={fieldClass} value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={fieldClass} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className={labelClass}>Pincode</label>
          <input className={fieldClass} value={form.pincode} onChange={set("pincode")} />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={fieldClass} value={form.city} onChange={set("city")} />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input className={fieldClass} value={form.state} onChange={set("state")} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Full address</label>
        <textarea
          className={`${fieldClass} min-h-[72px]`}
          value={form.fullAddress}
          onChange={set("fullAddress")}
        />
      </div>
      <div>
        <label className={labelClass}>Support reason *</label>
        <textarea
          className={`${fieldClass} min-h-[64px]`}
          value={form.reason}
          onChange={set("reason")}
          required
          placeholder="Why is this being corrected?"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Update address"}
      </button>
    </form>
  );
}
