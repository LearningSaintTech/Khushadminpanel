import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getSingleDelivery,
} from "../../apis/Deliveryapi";
import { getPincodes } from "../../apis/Pincodeapi";
import { Search, Loader2, Trash2, X } from "lucide-react";

const PINCODE_PAGE_SIZE = 10;

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

export default function Deliveryform({ editId = null, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [selectedPincodes, setSelectedPincodes] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      loadDelivery(editId);
    } else {
      setFormData(defaultFormData);
      setSelectedPincodes([]);
      setFormErrors({});
      setApiErrors([]);
    }
  }, [editId]);

  const fetchPincodes = async (page = 1, search = "") => {
    setPincodesLoading(true);
    try {
      const res = await getPincodes(page, PINCODE_PAGE_SIZE, search);
      const raw = res?.data ?? res;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setPincodes(Array.isArray(list) ? list : []);
      setPincodePage(page);
      const pagination = raw?.pagination ?? res?.pagination;
      setPincodeTotalPages(pagination?.totalPages ?? (list.length >= PINCODE_PAGE_SIZE ? page + 1 : page));
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
      setSelectedPincodes(item.serviceablePincodes || []);
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
    if (!formData.deliveryType?.trim()) errors.deliveryType = "Delivery type is required";
    if (!formData.min || Number(formData.min) <= 0) errors.min = "Min duration must be > 0";
    if (!formData.max || Number(formData.max) <= 0) errors.max = "Max duration must be > 0";
    if (Number(formData.min) > Number(formData.max)) errors.max = "Max must be ≥ Min";
    if (formData.deliveryCharge === "" || Number(formData.deliveryCharge) < 0)
      errors.deliveryCharge = "Delivery charge is required (≥ 0)";
    if (selectedPincodes.length === 0) errors.pincodes = "Select at least one pincode";
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
      serviceablePincodes: selectedPincodes,
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
      const raw = err?.response?.data ?? err ?? {};
      const data = typeof raw === "string" ? { message: raw } : raw;
      const msgs = [];
      if (data?.errors && typeof data.errors === "object")
        Object.values(data.errors).forEach((v) => (Array.isArray(v) ? v.forEach((m) => m && msgs.push(String(m))) : v && msgs.push(String(v))));
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
    if (!window.confirm("Delete this delivery option? This cannot be undone.")) return;
    setSaving(true);
    try {
      await deleteDelivery(editId);
      toast.success("Delivery option deleted");
      onSuccess?.();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const togglePincode = (id) => {
    setSelectedPincodes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPincodes = () => {
    const ids = pincodes.map((p) => p._id).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every((id) => selectedPincodes.includes(id));
    setSelectedPincodes((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const handlePincodeSearch = (e) => {
    e?.preventDefault?.();
    fetchPincodes(1, pincodeSearch.trim());
  };

  if (loading && editId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {editId ? "Edit delivery option" : "New delivery option"}
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {apiErrors.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-medium text-red-800 mb-1">Please fix the following:</p>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
              {apiErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Delivery type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.deliveryType}
              onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-500 outline-none transition-shadow ${
                formErrors.deliveryType ? "border-red-400" : "border-slate-300"
              }`}
            >
              <option value="">Select type</option>
              <option value="NORMAL">NORMAL</option>
              <option value="ONE_DAY">ONE_DAY</option>
              <option value="90_MIN">90_MIN</option>
            </select>
            {formErrors.deliveryType && (
              <p className="mt-1 text-xs text-red-600">{formErrors.deliveryType}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Serviceable pincodes <span className="text-red-500">*</span>
            </label>
            <form onSubmit={handlePincodeSearch} className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={pincodeSearch}
                  onChange={(e) => setPincodeSearch(e.target.value)}
                  placeholder="Search pincode..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-500 outline-none"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800">
                Search
              </button>
            </form>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-44 overflow-y-auto">
              {pincodesLoading ? (
                <p className="text-sm text-slate-500 py-2">Loading...</p>
              ) : pincodes.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No pincodes found.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 py-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pincodes.length > 0 && pincodes.every((p) => selectedPincodes.includes(p._id))}
                      onChange={toggleSelectAllPincodes}
                      className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                    />
                    Select all on page
                  </label>
                  <div className="space-y-1 mt-1">
                    {pincodes.map((p) => (
                      <label key={p._id} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-slate-100 rounded-lg px-2">
                        <input
                          type="checkbox"
                          checked={selectedPincodes.includes(p._id)}
                          onChange={() => togglePincode(p._id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                        />
                        <span>{p.pinCode ?? p.pincode ?? p.pin_code ?? p._id}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>Page {pincodePage} of {pincodeTotalPages} · {selectedPincodes.length} selected</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pincodePage <= 1 || pincodesLoading}
                  onClick={() => fetchPincodes(pincodePage - 1, pincodeSearch.trim())}
                  className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={pincodePage >= pincodeTotalPages || pincodesLoading}
                  onClick={() => fetchPincodes(pincodePage + 1, pincodeSearch.trim())}
                  className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            {formErrors.pincodes && <p className="mt-1 text-xs text-red-600">{formErrors.pincodes}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Min duration <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={formData.min}
                onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 outline-none ${
                  formErrors.min ? "border-red-400" : "border-slate-300"
                }`}
              />
              {formErrors.min && <p className="mt-1 text-xs text-red-600">{formErrors.min}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Max duration <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={formData.max}
                onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 outline-none ${
                  formErrors.max ? "border-red-400" : "border-slate-300"
                }`}
              />
              {formErrors.max && <p className="mt-1 text-xs text-red-600">{formErrors.max}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-400 outline-none"
            >
              <option value="DAY">Days</option>
              <option value="HOUR">Hours</option>
              <option value="MINUTE">Minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery charge (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.deliveryCharge}
              onChange={(e) => setFormData({ ...formData, deliveryCharge: e.target.value })}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 outline-none ${
                formErrors.deliveryCharge ? "border-red-400" : "border-slate-300"
              }`}
            />
            {formErrors.deliveryCharge && <p className="mt-1 text-xs text-red-600">{formErrors.deliveryCharge}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Discount type</label>
            <select
              value={formData.discountType}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-slate-400 outline-none"
            >
              <option value="FLAT">Flat</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Discount value</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max discount (₹)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.maxDiscountAmount}
              onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div>
            {editId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-medium text-sm disabled:opacity-50"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white font-medium text-sm hover:bg-slate-900 disabled:opacity-60"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              {editId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
