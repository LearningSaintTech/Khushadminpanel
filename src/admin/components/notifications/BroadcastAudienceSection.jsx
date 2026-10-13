import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Trash2, Users } from "lucide-react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Field, FormSection, fieldClass } from "./notificationsShared";
import { DEFAULT_AUDIENCE, EMPTY_SEGMENT_FILTERS, audienceToPayload } from "./broadcastAudience.js";

/**
 * Broadcast audience: all users, or an order-based customer segment (number of orders,
 * previous order date, value of orders). Segments can be saved and reused; members are
 * recalculated from orders on every send.
 */

const LAST_ORDER_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "within", label: "Ordered in the last … days" },
  { value: "notWithin", label: "No order in the last … days" },
  { value: "between", label: "Previous order between dates" },
];

const errMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function filtersFromSaved(saved) {
  const f = saved?.filters || {};
  const s = (v) => (v == null ? "" : String(v));
  return {
    orderCount: { min: s(f.orderCount?.min), max: s(f.orderCount?.max) },
    lastOrder: {
      mode: f.lastOrder?.mode || "any",
      days: s(f.lastOrder?.days),
      from: s(f.lastOrder?.from),
      to: s(f.lastOrder?.to),
    },
    orderValue: { basis: f.orderValue?.basis || "total", min: s(f.orderValue?.min), max: s(f.orderValue?.max) },
  };
}

function NumberInput({ value, onChange, placeholder, step = "1", disabled }) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass}
    />
  );
}

export default function BroadcastAudienceSection({ value, onChange, channels }) {
  const audience = value || DEFAULT_AUDIENCE;
  const filters = audience.filters || EMPTY_SEGMENT_FILTERS;
  const [saved, setSaved] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSegment = audience.type === "customerSegment";
  const selectedSaved = saved.find((s) => s._id === audience.segmentId) || null;

  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await adminNotificationApi.listCustomerSegments();
      setSaved(Array.isArray(res?.list) ? res.list : []);
    } catch {
      setSaved([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSegment) loadSaved();
  }, [isSegment, loadSaved]);

  // Any change to the audience or channels makes the last preview stale.
  useEffect(() => {
    setPreview(null);
  }, [audience, channels]);

  const update = (next) => {
    setMessage(null);
    onChange({ ...audience, ...next });
  };

  /** Editing a filter turns a saved segment into custom (unsaved) filters. */
  const setFilter = (group, key, v) =>
    update({
      segmentId: "",
      filters: { ...filters, [group]: { ...filters[group], [key]: v } },
    });

  const pickSaved = (id) => {
    if (!id) {
      update({ segmentId: "" });
      return;
    }
    const seg = saved.find((s) => s._id === id);
    update({ segmentId: id, filters: filtersFromSaved(seg) });
    setSaveName("");
  };

  const runPreview = async () => {
    setPreviewing(true);
    setMessage(null);
    try {
      const payload = audienceToPayload(audience);
      const res = await adminNotificationApi.previewCustomerSegment({
        ...(payload.segmentId ? { segmentId: payload.segmentId } : { filters: payload.filters }),
        channels,
      });
      setPreview(res);
    } catch (err) {
      setPreview(null);
      setMessage({ type: "error", text: errMessage(err, "Preview failed") });
    } finally {
      setPreviewing(false);
    }
  };

  const saveSegment = async () => {
    const name = saveName.trim();
    if (!name) {
      setMessage({ type: "error", text: "Enter a name to save this segment" });
      return;
    }
    setSaving(true);
    try {
      const res = await adminNotificationApi.createCustomerSegment({
        name,
        filters: audienceToPayload({ ...audience, segmentId: "" }).filters,
      });
      await loadSaved();
      if (res?.segment?._id) update({ segmentId: res.segment._id });
      setSaveName("");
      setMessage({ type: "success", text: `Saved segment "${name}"` });
    } catch (err) {
      setMessage({ type: "error", text: errMessage(err, "Could not save segment") });
    } finally {
      setSaving(false);
    }
  };

  const deleteSaved = async () => {
    if (!selectedSaved) return;
    if (!window.confirm(`Delete saved segment "${selectedSaved.name}"? Scheduled broadcasts keep their own copy.`)) {
      return;
    }
    setDeleting(true);
    try {
      await adminNotificationApi.deleteCustomerSegment(selectedSaved._id);
      await loadSaved();
      update({ segmentId: "" });
      setMessage({ type: "success", text: "Segment deleted" });
    } catch (err) {
      setMessage({ type: "error", text: errMessage(err, "Could not delete segment") });
    } finally {
      setDeleting(false);
    }
  };

  const mode = filters.lastOrder.mode;

  return (
    <FormSection
      title="Audience"
      hint="Send to everyone, or only to customers matching their order history."
    >
      <div className="flex flex-wrap gap-3">
        {[
          { value: "all", label: "All users" },
          { value: "customerSegment", label: "Customer segment" },
        ].map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="broadcast-audience"
              checked={audience.type === opt.value}
              onChange={() => update({ type: opt.value })}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            <span className="text-[11px] text-stone-700">{opt.label}</span>
          </label>
        ))}
      </div>

      {isSegment ? (
        <>
          <Field label="Saved segment" hint="Pick a saved segment, or set custom filters below.">
            <div className="flex gap-2">
              <select
                value={audience.segmentId || ""}
                onChange={(e) => pickSaved(e.target.value)}
                className={fieldClass}
                disabled={savedLoading}
              >
                <option value="">{savedLoading ? "Loading…" : "— Custom filters —"}</option>
                {saved.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.lastMatchedCount != null ? ` (${s.lastMatchedCount} customers)` : ""}
                  </option>
                ))}
              </select>
              {selectedSaved ? (
                <button
                  type="button"
                  onClick={deleteSaved}
                  disabled={deleting}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 text-[11px] text-danger hover:bg-danger-bg disabled:opacity-50"
                  title="Delete this saved segment"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              ) : null}
            </div>
            {selectedSaved ? (
              <p className="mt-1 text-[10px] text-stone-500">{selectedSaved.summary}</p>
            ) : null}
          </Field>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Number of orders" hint="Delivered / confirmed purchases only">
              <div className="flex gap-1.5">
                <NumberInput
                  value={filters.orderCount.min}
                  placeholder="Min"
                  onChange={(v) => setFilter("orderCount", "min", v)}
                />
                <NumberInput
                  value={filters.orderCount.max}
                  placeholder="Max"
                  onChange={(v) => setFilter("orderCount", "max", v)}
                />
              </div>
            </Field>

            <Field label="Previous order date" hint="Dates are in IST">
              <select
                value={mode}
                onChange={(e) => setFilter("lastOrder", "mode", e.target.value)}
                className={fieldClass}
              >
                {LAST_ORDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {mode === "within" || mode === "notWithin" ? (
                <div className="mt-1.5">
                  <NumberInput
                    value={filters.lastOrder.days}
                    placeholder="Days, e.g. 30"
                    onChange={(v) => setFilter("lastOrder", "days", v)}
                  />
                </div>
              ) : null}
              {mode === "between" ? (
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="date"
                    value={filters.lastOrder.from}
                    onChange={(e) => setFilter("lastOrder", "from", e.target.value)}
                    className={fieldClass}
                    aria-label="From date"
                  />
                  <input
                    type="date"
                    value={filters.lastOrder.to}
                    onChange={(e) => setFilter("lastOrder", "to", e.target.value)}
                    className={fieldClass}
                    aria-label="To date"
                  />
                </div>
              ) : null}
            </Field>

            <Field label="Value of orders (₹)" hint="Paid amount, minus refunds">
              <select
                value={filters.orderValue.basis}
                onChange={(e) => setFilter("orderValue", "basis", e.target.value)}
                className={fieldClass}
              >
                <option value="total">Total spent</option>
                <option value="average">Average order value</option>
              </select>
              <div className="mt-1.5 flex gap-1.5">
                <NumberInput
                  value={filters.orderValue.min}
                  placeholder="Min"
                  step="any"
                  onChange={(v) => setFilter("orderValue", "min", v)}
                />
                <NumberInput
                  value={filters.orderValue.max}
                  placeholder="Max"
                  step="any"
                  onChange={(v) => setFilter("orderValue", "max", v)}
                />
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runPreview}
              disabled={previewing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50"
            >
              {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
              Preview audience
            </button>
            {!audience.segmentId ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  type="text"
                  value={saveName}
                  maxLength={80}
                  placeholder="Name, e.g. VIP — 5+ orders"
                  onChange={(e) => setSaveName(e.target.value)}
                  className={`${fieldClass} min-w-0 sm:max-w-xs`}
                />
                <button
                  type="button"
                  onClick={saveSegment}
                  disabled={saving}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-stone-700 hover:bg-canvas-muted disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save segment
                </button>
              </div>
            ) : null}
          </div>

          {message ? (
            <p className={`text-[11px] ${message.type === "error" ? "text-danger" : "text-success"}`}>
              {message.text}
            </p>
          ) : null}

          {preview ? (
            <div className="rounded-lg border border-border bg-canvas-muted/40 px-3 py-2 text-[11px] text-stone-700">
              <p className="font-semibold text-stone-900">
                {preview.matchedCustomers.toLocaleString("en-IN")} customers match
                {preview.eligibleRecipients != null
                  ? ` · ${preview.eligibleRecipients.toLocaleString("en-IN")} can receive the selected channels`
                  : ""}
              </p>
              <p className="mt-0.5 text-stone-500">{preview.description}</p>
              {preview.matchedCustomers > 0 ? (
                <p className="mt-0.5 text-stone-500">
                  Avg {preview.avgOrdersPerCustomer} orders · avg spend {inr(preview.avgSpendPerCustomer)} per
                  customer · total {inr(preview.totalSpend)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] text-stone-400">
              Members are recalculated from orders when the broadcast is sent (or released, if scheduled).
            </p>
          )}
        </>
      ) : null}
    </FormSection>
  );
}
