import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getSingleDelivery,
} from "../../apis/Deliveryapi";
import { getPincodes } from "../../apis/Pincodeapi";
import { Search, Loader2, Trash2, X, Save } from "lucide-react";

const PINCODE_PAGE_SIZE = 10;

const cleanApiErrorMessage = (err, fallback = "Failed to delete") => {
  const raw = String(err?.response?.data?.message || err?.message || "");
  const cleaned = raw
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "")
    .replace(/\{\{baseUrl\}\}[\s\S]*/gi, "")
    .trim();
  return cleaned || fallback;
};

const DELIVERY_TYPE_OPTIONS = [
  { value: "NORMAL", label: "NORMAL" },
  { value: "ONE_DAY", label: "ONE_DAY" },
  { value: "90_MIN", label: "90_MIN" },
];

const defaultFormData = {
  deliveryType: "",
  min: "",
  max: "",
  unit: "DAY",
  discountType: "FLAT",
  discountValue: "",
  maxDiscountAmount: "",
  deliveryCharge: "",
  isActive: true,
};

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted disabled:text-stone-500";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";
const fieldErrorClass = "border-danger focus:border-danger focus:ring-danger/20";

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {hint ? <p className="mb-1 text-[10px] text-stone-400">{hint}</p> : null}
      {children}
      {error ? <p className="mt-1 text-[10px] text-danger">{error}</p> : null}
    </div>
  );
}

export default function Deliveryform({ editId = null, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [selectedPincodes, setSelectedPincodes] = useState([]);
  const [editPincodes, setEditPincodes] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);
  const [pincodes, setPincodes] = useState([]);
  const [pincodesLoading, setPincodesLoading] = useState(false);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [pincodePage, setPincodePage] = useState(1);
  const [pincodeTotalPages, setPincodeTotalPages] = useState(1);

  useEffect(() => {
    fetchPincodes(1, "");
  }, []);

  useEffect(() => {
    if (editId) {
      setEditPincodes(false);
      loadDelivery(editId);
    } else {
      setEditPincodes(true);
      setFormData(defaultFormData);
      setSelectedPincodes([]);
      setFormErrors({});
      setApiErrors([]);
    }
  }, [editId]);

  useEffect(() => {
    if (editId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editId]);

  const fetchPincodes = async (page = 1, search = "") => {
    setPincodesLoading(true);
    try {
      const res = await getPincodes(page, PINCODE_PAGE_SIZE, search);
      const raw = res?.data ?? res;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data?.data)
          ? raw.data.data
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      setPincodes(Array.isArray(list) ? list : []);
      setPincodePage(page);
      const pagination = raw?.pagination ?? res?.pagination;
      setPincodeTotalPages(
        pagination?.totalPages ?? (list.length >= PINCODE_PAGE_SIZE ? page + 1 : page),
      );
    } catch {
      toast.error("Failed to load pincodes");
    } finally {
      setPincodesLoading(false);
    }
  };

  const loadDelivery = async (id) => {
    setLoading(true);
    try {
      const res = await getSingleDelivery(id);
      const item = res?.data?.data || res?.data;
      if (!item?._id) throw new Error("Delivery not found");
      const normalizedPincodeIds = Array.isArray(item.serviceablePincodes)
        ? item.serviceablePincodes
            .map((pin) =>
              typeof pin === "string"
                ? pin
                : pin?._id || pin?.id || pin?.pincodeId?._id || pin?.pincodeId?.id,
            )
            .filter(Boolean)
            .map(String)
        : [];
      setSelectedPincodes(normalizedPincodeIds);
      setFormData({
        deliveryType: item.deliveryType || "",
        min: String(item.deliveryDuration?.min ?? ""),
        max: String(item.deliveryDuration?.max ?? ""),
        unit: item.deliveryDuration?.unit || "DAY",
        discountType: item.discount?.type === "PERCENT" ? "PERCENTAGE" : item.discount?.type || "FLAT",
        discountValue: String(item.discount?.value ?? ""),
        maxDiscountAmount: String(item.discount?.maxDiscountAmount ?? ""),
        deliveryCharge: String(item.deliveryCharge ?? ""),
        isActive: !!item.isActive,
      });
      setFormErrors({});
      setApiErrors([]);
    } catch {
      toast.error("Could not load delivery");
      onCancel?.();
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors = {};
    const shouldValidatePincodes = !editId || editPincodes;
    const dt = formData.deliveryType?.trim() || "";
    if (!dt) errors.deliveryType = "Delivery type is required";
    else if (!DELIVERY_TYPE_OPTIONS.some((o) => o.value === dt))
      errors.deliveryType = "Select NORMAL, ONE_DAY, or 90_MIN";
    if (!formData.min || Number(formData.min) <= 0) errors.min = "Min duration must be > 0";
    if (!formData.max || Number(formData.max) <= 0) errors.max = "Max duration must be > 0";
    if (Number(formData.min) > Number(formData.max)) errors.max = "Max must be ≥ Min";
    if (formData.deliveryCharge === "" || Number(formData.deliveryCharge) < 0)
      errors.deliveryCharge = "Delivery charge is required (≥ 0)";
    if (shouldValidatePincodes && selectedPincodes.length === 0) {
      errors.pincodes = "Select at least one pincode";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiErrors([]);
    if (!validate()) {
      toast.error("Please fix the errors below");
      return;
    }
    setSaving(true);
    const payload = {
      deliveryType: formData.deliveryType.trim(),
      deliveryDuration: {
        min: Number(formData.min),
        max: Number(formData.max),
        unit: formData.unit,
      },
      discount: {
        type: formData.discountType === "PERCENTAGE" ? "PERCENT" : "FLAT",
        value: Number(formData.discountValue) || 0,
        maxDiscountAmount: Number(formData.maxDiscountAmount) || 0,
      },
      deliveryCharge: Number(formData.deliveryCharge),
      isActive: formData.isActive,
    };
    if (!editId || editPincodes) {
      payload.serviceablePincodes = selectedPincodes.map(String);
    }
    try {
      if (editId) {
        await updateDelivery(editId, payload);
        toast.success("Delivery option updated");
      } else {
        await createDelivery(payload);
        toast.success("Delivery option created");
      }
      onSuccess?.();
    } catch (err) {
      console.error("[DeliveryForm] submit:error", err);
      const raw = err?.response?.data ?? err ?? {};
      const data = typeof raw === "string" ? { message: raw } : raw;
      const msgs = [];
      if (data?.errors && typeof data.errors === "object")
        Object.values(data.errors).forEach((v) =>
          Array.isArray(v)
            ? v.forEach((m) => m && msgs.push(String(m)))
            : v && msgs.push(String(v)),
        );
      if (data?.message && !msgs.length) msgs.push(String(data.message));
      if (data?.error) msgs.push(String(data.error));
      if (!msgs.length && err?.message) msgs.push(String(err.message));
      if (!msgs.length) msgs.push("Failed to save");
      setApiErrors(msgs);
      toast.error(msgs[0]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!window.confirm("Delete this delivery option?")) return;
    setSaving(true);
    try {
      const res = await deleteDelivery(editId);
      const success = res?.data?.success ?? res?.success ?? true;
      if (!success) throw new Error(res?.data?.message || res?.message || "Delete failed");
      toast.success("Delivery option deleted");
      onSuccess?.();
    } catch (err) {
      console.error("[DeliveryForm] delete:error", err);
      toast.error(cleanApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePincode = (id) => {
    const idStr = String(id);
    setSelectedPincodes((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr],
    );
  };

  const toggleSelectAllPincodes = () => {
    const ids = pincodes.map((p) => p._id).filter(Boolean).map(String);
    const allSelected = ids.length > 0 && ids.every((id) => selectedPincodes.includes(id));
    setSelectedPincodes((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
    );
  };

  const handlePincodeSearch = (e) => {
    e?.preventDefault?.();
    fetchPincodes(1, pincodeSearch.trim());
  };

  const pincodesDisabled = !!editId && !editPincodes;

  if (loading && editId) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        Loading delivery…
      </div>
    );
  }

  return (
    <div ref={formRef} className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">
          {editId ? "Edit delivery option" : "New delivery option"}
        </h2>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-stone-500 hover:bg-canvas-muted"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {apiErrors.length > 0 ? (
          <div className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2">
            <p className="text-[11px] font-medium text-danger">Please fix the following:</p>
            <ul className="mt-1 list-inside list-disc text-[11px] text-danger">
              {apiErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <FormSection title="Delivery type" hint="NORMAL, ONE_DAY, or 90_MIN.">
          <Field label="Type" required error={formErrors.deliveryType}>
            <select
              value={formData.deliveryType}
              onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
              className={`${fieldClass} ${formErrors.deliveryType ? fieldErrorClass : ""}`}
            >
              <option value="">Select type</option>
              {DELIVERY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>

        <FormSection
          title="Serviceable pincodes"
          hint={
            editId && !editPincodes
              ? "Enable “Update pincodes” below to change pincode mapping."
              : "Select at least one pincode for this option."
          }
        >
          {editId ? (
            <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                checked={editPincodes}
                onChange={(e) => setEditPincodes(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Update serviceable pincodes in this edit
            </label>
          ) : null}

          <div className={pincodesDisabled ? "pointer-events-none opacity-60" : ""}>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  disabled={pincodesDisabled}
                  value={pincodeSearch}
                  onChange={(e) => setPincodeSearch(e.target.value)}
                  placeholder="Search pincode…"
                  className={`${fieldClass} pl-8`}
                />
              </div>
              <button
                type="button"
                disabled={pincodesDisabled}
                onClick={handlePincodeSearch}
                className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Search
              </button>
            </div>

            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-canvas-muted/50 p-2">
              {pincodesLoading ? (
                <p className="py-2 text-[11px] text-stone-500">Loading…</p>
              ) : pincodes.length === 0 ? (
                <p className="py-2 text-[11px] text-stone-500">No pincodes found.</p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-2 py-1 text-[11px] font-medium text-stone-700">
                    <input
                      type="checkbox"
                      disabled={pincodesDisabled}
                      checked={
                        pincodes.length > 0 &&
                        pincodes.every((p) => selectedPincodes.includes(String(p._id)))
                      }
                      onChange={toggleSelectAllPincodes}
                      className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                    />
                    Select all on page
                  </label>
                  <div className="mt-1 space-y-0.5">
                    {pincodes.map((p) => (
                      <label
                        key={p._id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          disabled={pincodesDisabled}
                          checked={selectedPincodes.includes(String(p._id))}
                          onChange={() => togglePincode(p._id)}
                          className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                        />
                        <span>{p.pinCode ?? p.pincode ?? p.pin_code ?? p._id}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
              <span>
                Page {pincodePage} / {pincodeTotalPages} · {selectedPincodes.length} selected
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pincodePage <= 1 || pincodesLoading || pincodesDisabled}
                  onClick={() => fetchPincodes(pincodePage - 1, pincodeSearch.trim())}
                  className="rounded-lg border border-border px-2 py-0.5 hover:bg-canvas-muted disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={
                    pincodePage >= pincodeTotalPages || pincodesLoading || pincodesDisabled
                  }
                  onClick={() => fetchPincodes(pincodePage + 1, pincodeSearch.trim())}
                  className="rounded-lg border border-border px-2 py-0.5 hover:bg-canvas-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            {formErrors.pincodes ? (
              <p className="text-[10px] text-danger">{formErrors.pincodes}</p>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Duration & charge">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Field label="Min duration" required error={formErrors.min}>
              <input
                type="number"
                min={1}
                value={formData.min}
                onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                className={`${fieldClass} ${formErrors.min ? fieldErrorClass : ""}`}
              />
            </Field>
            <Field label="Max duration" required error={formErrors.max}>
              <input
                type="number"
                min={1}
                value={formData.max}
                onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                className={`${fieldClass} ${formErrors.max ? fieldErrorClass : ""}`}
              />
            </Field>
            <Field label="Unit">
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={fieldClass}
              >
                <option value="DAY">Days</option>
                <option value="HOUR">Hours</option>
                <option value="MINUTE">Minutes</option>
              </select>
            </Field>
            <Field label="Charge (₹)" required error={formErrors.deliveryCharge}>
              <input
                type="number"
                min={0}
                step={1}
                value={formData.deliveryCharge}
                onChange={(e) => setFormData({ ...formData, deliveryCharge: e.target.value })}
                className={`${fieldClass} ${formErrors.deliveryCharge ? fieldErrorClass : ""}`}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Discount" hint="Optional delivery discount.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Discount type">
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className={fieldClass}
              >
                <option value="FLAT">Flat</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </Field>
            <Field label="Discount value">
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <Field label="Max discount (₹)">
              <input
                type="number"
                min={0}
                step={1}
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[11px] font-medium text-stone-700">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-border accent-brand-600"
          />
          Active
        </label>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <div>
            {editId ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-bg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-canvas-muted"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {editId ? "Update" : "Create"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
