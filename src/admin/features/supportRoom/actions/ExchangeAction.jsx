import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  supportCreateExchange,
  supportPatchExchange,
  supportScheduleExchange,
} from "../api/supportRoomApi";
import { getBackendErrorMessage } from "../supportRoom.constants";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

function collectExchanges(order) {
  const out = [];
  for (const it of order?.items || []) {
    for (const ex of it.exchanges || []) {
      out.push({
        ...ex,
        lineSku: it.sku,
        lineItemId: String(it._id || it.itemId),
        line: it,
      });
    }
  }
  return out;
}

function inferPickupHint(item) {
  if (!item) return "Carrier resolved from original forward shipment on approve.";
  if (item?.shadowfax?.awb) {
    return "Forward was Shadowfax → approve will book Shadowfax reverse pickup.";
  }
  if (item?.delhivery?.waybill) {
    return "Forward was Delhivery → approve will book Delhivery reverse pickup.";
  }
  if (item?.shiprocket?.awb || item?.shiprocket?.orderId) {
    return "Forward was Shiprocket → pickup books via Shiprocket auto flow.";
  }
  return "Approve uses the same shipping-partner flow as Orders exchange approval.";
}

function toastPickupResult(pickup, kind = "Exchange") {
  if (!pickup) {
    toast.success(`${kind} scheduled flow completed`);
    return;
  }
  if (pickup.scheduled) {
    toast.success(pickup.message || `${kind} approved and pickup scheduled`);
  } else if (pickup.error || pickup.bookError || pickup.assignError) {
    toast.error(
      `${kind} approved but pickup incomplete: ${
        pickup.error || pickup.bookError || pickup.assignError
      }`
    );
  } else if (pickup.message) {
    toast.success(`${kind} approved. ${pickup.message}`);
  } else {
    toast.success(`${kind} approved`);
  }
}

export default function ExchangeAction({ order, onDone }) {
  const items = order?.items || [];
  const allExchanges = useMemo(() => collectExchanges(order), [order]);
  const openExchanges = useMemo(
    () =>
      allExchanges.filter((ex) =>
        ["exchangeRequested", "exchangeApproved", "pickupScheduled"].includes(ex.status)
      ),
    [allExchanges]
  );
  const scheduleableExchanges = useMemo(
    () =>
      allExchanges.filter((ex) =>
        ["exchangeRequested", "exchangeApproved"].includes(ex.status)
      ),
    [allExchanges]
  );

  const [mode, setMode] = useState("create"); // create | scheduleExisting | patch
  const [intent, setIntent] = useState("requested"); // requested | schedule
  const [itemId, setItemId] = useState("");
  const [exchangeReason, setExchangeReason] = useState("Wrong size");
  const [desiredSize, setDesiredSize] = useState("");
  const [desiredColor, setDesiredColor] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [patchSize, setPatchSize] = useState("");
  const [patchColor, setPatchColor] = useState("");
  const [supportReason, setSupportReason] = useState("");
  const [bookShadowfax, setBookShadowfax] = useState(true);
  const [bookDelhivery, setBookDelhivery] = useState(true);
  const [manualTrackingId, setManualTrackingId] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedItem = useMemo(
    () => items.find((it) => String(it._id || it.itemId) === String(itemId)),
    [items, itemId]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!supportReason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        if (!itemId) {
          toast.error("Select an item");
          setSaving(false);
          return;
        }
        const res = await supportCreateExchange(order.orderId, itemId, {
          exchangeReason,
          reason: exchangeReason,
          desiredSize: desiredSize || undefined,
          desiredColor: desiredColor || undefined,
          supportReason,
          intent,
          bookShadowfax: intent === "schedule" ? bookShadowfax : undefined,
          bookDelhivery: intent === "schedule" ? bookDelhivery : undefined,
          manualTrackingId:
            intent === "schedule" && manualTrackingId.trim()
              ? manualTrackingId.trim()
              : undefined,
        });
        const data = res?.data?.data || res?.data || {};
        if (intent === "schedule") {
          toastPickupResult(data.pickupResult, "Exchange");
        } else {
          toast.success("Exchange requested on behalf of customer");
        }
      } else if (mode === "scheduleExisting") {
        if (!exchangeId) {
          toast.error("Select an exchange to schedule");
          setSaving(false);
          return;
        }
        const res = await supportScheduleExchange(exchangeId, {
          supportReason,
          adminRemark: supportReason,
          bookShadowfax,
          bookDelhivery,
          manualTrackingId: manualTrackingId.trim() || undefined,
        });
        const data = res?.data?.data || res?.data || {};
        toastPickupResult(data.pickupResult, "Exchange");
      } else {
        if (!exchangeId) {
          toast.error("Select an exchange to patch");
          setSaving(false);
          return;
        }
        await supportPatchExchange(exchangeId, {
          desiredSize: patchSize,
          desiredColor: patchColor,
          reason: supportReason,
          supportReason,
        });
        toast.success("Exchange updated");
      }
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Exchange action failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { id: "create", label: "Create" },
          { id: "scheduleExisting", label: "Schedule open" },
          { id: "patch", label: "Fix open (size/color)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-lg px-3 py-1.5 ${
              mode === tab.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <>
          <div>
            <label className={labelClass}>Outcome *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  intent === "requested"
                    ? "border-brand-400 bg-brand-50"
                    : "border-stone-200"
                }`}
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={intent === "requested"}
                  onChange={() => setIntent("requested")}
                />
                <span className="text-sm font-medium">Requested</span>
                <span className="block text-[11px] text-stone-500 mt-0.5">
                  Create exchange only — approve later like a customer request.
                </span>
              </label>
              <label
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  intent === "schedule"
                    ? "border-brand-400 bg-brand-50"
                    : "border-stone-200"
                }`}
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={intent === "schedule"}
                  onChange={() => setIntent("schedule")}
                />
                <span className="text-sm font-medium">Schedule</span>
                <span className="block text-[11px] text-stone-500 mt-0.5">
                  Create → approve → book reverse pickup with shipping partner (Orders flow).
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Delivered line *</label>
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
            {selectedItem ? (
              <p className="mt-1 text-[11px] text-stone-500">{inferPickupHint(selectedItem)}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Exchange reason *</label>
            <input
              className={fieldClass}
              value={exchangeReason}
              onChange={(e) => setExchangeReason(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Desired size</label>
              <input
                className={fieldClass}
                value={desiredSize}
                onChange={(e) => setDesiredSize(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Desired color</label>
              <input
                className={fieldClass}
                value={desiredColor}
                onChange={(e) => setDesiredColor(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : null}

      {mode === "scheduleExisting" ? (
        <div>
          <label className={labelClass}>Open exchange to approve + schedule *</label>
          <select
            className={fieldClass}
            value={exchangeId}
            onChange={(e) => setExchangeId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {scheduleableExchanges.map((ex) => {
              const id = String(ex._id || ex.id);
              return (
                <option key={id} value={id}>
                  {(ex.lineSku || "Exchange") +
                    ` · ${ex.status}` +
                    (ex.desiredSize ? ` · size ${ex.desiredSize}` : "")}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-stone-500">
            Uses the same approve + shipping-partner booking path as Orders.
          </p>
        </div>
      ) : null}

      {mode === "patch" ? (
        <>
          <div>
            <label className={labelClass}>Open exchange *</label>
            <select
              className={fieldClass}
              value={exchangeId}
              onChange={(e) => {
                const id = e.target.value;
                setExchangeId(id);
                const found = openExchanges.find((x) => String(x._id || x.id) === id);
                if (found) {
                  setPatchSize(found.desiredSize || "");
                  setPatchColor(found.desiredColor || "");
                }
              }}
              required
            >
              <option value="">Select…</option>
              {openExchanges.map((ex) => {
                const id = String(ex._id || ex.id);
                return (
                  <option key={id} value={id}>
                    {(ex.lineSku || "Exchange") +
                      ` · ${ex.status}` +
                      (ex.desiredSize ? ` · size ${ex.desiredSize}` : "")}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Desired size</label>
              <input
                className={fieldClass}
                value={patchSize}
                onChange={(e) => setPatchSize(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Desired color</label>
              <input
                className={fieldClass}
                value={patchColor}
                onChange={(e) => setPatchColor(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : null}

      {(mode === "create" && intent === "schedule") || mode === "scheduleExisting" ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Shipping partner options
          </p>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={bookShadowfax}
              onChange={(e) => setBookShadowfax(e.target.checked)}
            />
            Book with Shadowfax if method is Shadowfax manual
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={bookDelhivery}
              onChange={(e) => setBookDelhivery(e.target.checked)}
            />
            Book with Delhivery if method is Delhivery manual
          </label>
          <div>
            <label className={labelClass}>Manual reverse AWB (optional)</label>
            <input
              className={fieldClass}
              value={manualTrackingId}
              onChange={(e) => setManualTrackingId(e.target.value)}
              placeholder="Only if already booked outside system"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Support reason *</label>
        <textarea
          className={`${fieldClass} min-h-[64px]`}
          value={supportReason}
          onChange={(e) => setSupportReason(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving
          ? "Saving…"
          : mode === "create"
            ? intent === "schedule"
              ? "Create & schedule pickup"
              : "Create exchange request"
            : mode === "scheduleExisting"
              ? "Approve & schedule pickup"
              : "Patch exchange"}
      </button>
    </form>
  );
}
