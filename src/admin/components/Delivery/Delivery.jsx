import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getDeliveries,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  checkDeliveryByPincode,
  getSingleDelivery,
} from "../../apis/Deliveryapi";
import { getPincodes } from "../../apis/Pincodeapi";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
} from "lucide-react";

const Delivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [pinCode, setPinCode] = useState("");
  const [pincodes, setPincodes] = useState([]);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [pincodePage, setPincodePage] = useState(1);
  const [pincodeTotalPages, setPincodeTotalPages] = useState(1);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDropdownValue, setPincodeDropdownValue] = useState("");
  const [selectedPincodes, setSelectedPincodes] = useState([]);
  const [selectedPincodeLabels, setSelectedPincodeLabels] = useState({});
  const [checkResult, setCheckResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const pincodeLimit = 8;

  const [formData, setFormData] = useState({
    deliveryType: "",
    min: "",
    max: "",
    unit: "DAY",
    discountType: "FLAT",
    discountValue: "",
    maxDiscountAmount: "",
    deliveryCharge: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);

  // ────────────────────────────────────────────────
  // Fetch deliveries (with logging)
  // ────────────────────────────────────────────────
  const fetchDeliveries = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await getDeliveries(page, limit);
      // apiConnector returns response.data, so res is { success, message, data }
      const raw = res ?? {};
      const data = raw?.data;
      const items =
        Array.isArray(data)
          ? data
          : Array.isArray(raw)
            ? raw
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.items)
                ? data.items
                : data
                  ? [data]
                  : [];
      const pag = data?.pagination ?? raw?.pagination ?? {};
      setDeliveries(items);
      setCurrentPage(page);
      setTotalPages(Math.max(1, Number(pag.totalPages) || 1));
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Could not load delivery options";
      toast.error(msg);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };
  // useEffect(() => {
  //   fetchDeliveries(1);
  // }, []);

  const fetchPincodes = async (page = 1, search = "") => {
    setPincodeLoading(true);
    try {
      const res = await getPincodes(page, pincodeLimit, search);
      const raw = res?.data ?? res ?? {};
      const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      const pag = raw?.pagination ?? res?.pagination ?? {};
      setPincodes(list);
      setPincodePage(page);
      setPincodeTotalPages(Math.max(1, Number(pag.totalPages) || 1));
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to load pincodes";
      toast.error(msg);
      setPincodes([]);
    } finally {
      setPincodeLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries(1);
    fetchPincodes(1, "");
  }, []);

  useEffect(() => {
    if (pincodes.length === 0) return;
    setSelectedPincodeLabels((prev) => {
      let next = { ...prev };
      pincodes.forEach((p) => {
        if (p._id && selectedPincodes.includes(p._id)) {
          next[p._id] = p.pinCode || p._id;
        }
      });
      return next;
    });
  }, [pincodes]);

  const handlePincodeSearch = (e) => {
    e?.preventDefault?.();
    fetchPincodes(1, pincodeSearch.trim());
  };

  const togglePincodeSelection = (p) => {
    const id = p._id;
    if (!id) return;
    setSelectedPincodes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedPincodeLabels((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: p.pinCode || id };
    });
  };

  const removeSelectedPincode = (id) => {
    setSelectedPincodes((prev) => prev.filter((x) => x !== id));
    setSelectedPincodeLabels((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const selectAllPincodesOnPage = () => {
    const ids = pincodes.map((p) => p._id).filter(Boolean);
    const labels = {};
    pincodes.forEach((p) => {
      if (p._id) labels[p._id] = p.pinCode || p._id;
    });
    setSelectedPincodes((prev) => {
      const set = new Set([...prev, ...ids]);
      return [...set];
    });
    setSelectedPincodeLabels((prev) => ({ ...prev, ...labels }));
  };

  const addPincodeFromDropdown = (e) => {
    const value = e.target.value;
    if (!value) return;
    const p = pincodes.find((x) => String(x._id) === String(value));
    if (p) togglePincodeSelection(p);
    setPincodeDropdownValue("");
  };
  // ────────────────────────────────────────────────
  // Form validation
  // ────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};

    if (!formData.deliveryType?.trim()) {
      errors.deliveryType = "Delivery type is required";
    }
    if (!formData.min || Number(formData.min) <= 0) {
      errors.min = "Minimum duration must be > 0";
    }
    if (!formData.max || Number(formData.max) <= 0) {
      errors.max = "Maximum duration must be > 0";
    }
    if (Number(formData.min) > Number(formData.max)) {
      errors.max = "Max duration must be ≥ Min duration";
    }
    if (!formData.deliveryCharge || Number(formData.deliveryCharge) < 0) {
      errors.deliveryCharge = "Delivery charge cannot be negative";
    }
    if (selectedPincodes.length === 0) {
      errors.pincodes = "Select at least one serviceable pincode";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ────────────────────────────────────────────────
  // Submit (create or update)
  // ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    setApiErrors([]);

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setActionLoading(true);

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

    console.log("Submitting payload:", payload);

    try {
      if (editId) {
        await updateDelivery(editId, payload);
        toast.success("Delivery option updated");
      } else {
        await createDelivery(payload);
        toast.success("Delivery option created");
      }

      resetForm();
      fetchDeliveries(currentPage); // refresh current page
    } catch (err) {
      const rawData = err?.response?.data ?? err ?? {};
      const data =
        typeof rawData === "string" ? { message: rawData } : rawData;

      const collected = [];

      if (data?.errors && typeof data.errors === "object") {
        Object.values(data.errors).forEach((val) => {
          if (Array.isArray(val)) {
            val.forEach((m) => m && collected.push(String(m)));
          } else if (val) {
            collected.push(String(val));
          }
        });
      }

      if (typeof data?.error === "string") {
        collected.push(data.error);
      }

      if (Array.isArray(data?.details)) {
        data.details.forEach((d) => {
          if (typeof d === "string") collected.push(d);
          else if (d?.message) collected.push(String(d.message));
        });
      }

      if (data?.message && !collected.length) {
        collected.push(String(data.message));
      }

      if (!collected.length && err?.message) {
        collected.push(String(err.message));
      }

      if (!collected.length && typeof err === "string") {
        collected.push(err);
      }

      if (!collected.length) {
        collected.push("Failed to save delivery option");
      }

      setApiErrors(collected);
      toast.error(collected[0]);
    } finally {
      setActionLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // Load single delivery for editing
  // ────────────────────────────────────────────────
  const handleEdit = async (id) => {
    setActionLoading(true);
    try {
      const res = await getSingleDelivery(id);
      const item = res?.data ?? res;

      if (!item?._id) throw new Error("Delivery not found");

      setEditId(item._id);

      setSelectedPincodes(
        (item.serviceablePincodes || []).map((pid) =>
          pid && typeof pid === "object" && pid.toString ? pid.toString() : String(pid)
        )
      );
      setFormData({
        deliveryType: item.deliveryType || "",
        min: String(item.deliveryDuration?.min || ""),
        max: String(item.deliveryDuration?.max || ""),
        unit: item.deliveryDuration?.unit || "DAY",
        discountType:
          item.discount?.type === "PERCENT"
            ? "PERCENTAGE"
            : item.discount?.type || "FLAT",
        discountValue: String(item.discount?.value || ""),
        maxDiscountAmount: String(item.discount?.maxDiscountAmount || ""),
        deliveryCharge: String(item.deliveryCharge || ""),
        isActive: !!item.isActive,
      });
      setFormErrors({});
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Could not load delivery details";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // Delete
  // ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this delivery option?")) return;

    setActionLoading(true);
    try {
      await deleteDelivery(id);
      toast.success("Delivery option deleted");
      fetchDeliveries(currentPage);
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to delete delivery option";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      deliveryType: "",
      min: "",
      max: "",
      unit: "DAY",
      discountType: "FLAT",
      discountValue: "",
      maxDiscountAmount: "",
      deliveryCharge: "",
      isActive: true,
    });
    setFormErrors({});
    setApiErrors([]);
    setSelectedPincodes([]);
    setSelectedPincodeLabels({});
  };

  // ────────────────────────────────────────────────
  // Pincode serviceability check
  // ────────────────────────────────────────────────
  const handleCheckDelivery = async () => {
    if (pinCode.length !== 6 || !/^\d{6}$/.test(pinCode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    setCheckingPin(true);
    setCheckResult(null);
    try {
      const res = await checkDeliveryByPincode(pinCode);
      const result = res?.data ?? res ?? null;
      setCheckResult(result);
      if (result?.deliveryOptions?.length > 0) {
        toast.success(`${result.deliveryOptions.length} option(s) available for ${pinCode}`);
      } else if (result && !result?.isServiceable) {
        toast.error(`Pincode ${pinCode} is not serviceable`);
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Could not check serviceability";
      toast.error(msg);
      setCheckResult({ isServiceable: false });
    } finally {
      setCheckingPin(false);
    }
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Delivery Management
          </h1>
          {editId && (
            <button
              onClick={resetForm}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Plus size={18} className="mr-2" />
              Add New
            </button>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-10">
          <h2 className="text-xl font-semibold mb-6">
            {editId ? "Edit Delivery Option" : "Add New Delivery Option"}
          </h2>

          {apiErrors.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <div className="font-semibold mb-1">
                Please fix the following problems:
              </div>
              <ul className="list-disc list-inside space-y-1">
                {apiErrors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Delivery Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.deliveryType}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryType: e.target.value })
                  }
                  className={`w-full border rounded-lg px-4 py-2.5 bg-white ${
                    formErrors.deliveryType
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                >
                  <option value="">Select delivery type</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="ONE_DAY">ONE_DAY</option>
                  <option value="90_MIN">90_MIN</option>
                </select>
                {formErrors.deliveryType && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.deliveryType}
                  </p>
                )}
              </div>

              {/* Serviceable Pincodes */}
              <div className="md:col-span-2 lg:col-span-3 space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Serviceable Pincodes <span className="text-red-600">*</span>
                </label>

                {/* Pincode dropdown - add from list */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="text-sm text-gray-600 whitespace-nowrap">Add from dropdown:</label>
                  <select
                    value={pincodeDropdownValue}
                    onChange={addPincodeFromDropdown}
                    className="flex-1 max-w-xs border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select pincode to add...</option>
                    {pincodes.map((p) => (
                      <option
                        key={p._id}
                        value={p._id}
                        disabled={selectedPincodes.includes(String(p._id))}
                      >
                        {p.pinCode} {selectedPincodes.includes(String(p._id)) ? "(added)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search + pagination */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <form
                    onSubmit={handlePincodeSearch}
                    className="flex-1 flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={18}
                      />
                      <input
                        type="text"
                        value={pincodeSearch}
                        onChange={(e) => setPincodeSearch(e.target.value)}
                        placeholder="Search pincode..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 whitespace-nowrap"
                    >
                      Search
                    </button>
                  </form>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Page {pincodePage} of {pincodeTotalPages}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={pincodePage <= 1 || pincodeLoading}
                        onClick={() => fetchPincodes(pincodePage - 1, pincodeSearch.trim())}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={pincodePage >= pincodeTotalPages || pincodeLoading}
                        onClick={() => fetchPincodes(pincodePage + 1, pincodeSearch.trim())}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected pincodes chips */}
                {selectedPincodes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-500 self-center">
                      Selected ({selectedPincodes.length}):
                    </span>
                    {selectedPincodes.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                      >
                        {selectedPincodeLabels[id] || id}
                        <button
                          type="button"
                          onClick={() => removeSelectedPincode(id)}
                          className="hover:bg-indigo-200 rounded-full p-0.5"
                          aria-label={`Remove ${selectedPincodeLabels[id] || id}`}
                        >
                          <XCircle size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Pincode grid */}
                <div className="border border-gray-200 rounded-xl bg-gray-50/50 p-4 min-h-[140px]">
                  {pincodeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  ) : pincodes.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">
                      No pincodes found. Try a different search or add pincodes first.
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <button
                          type="button"
                          onClick={selectAllPincodesOnPage}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Select all on this page
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {pincodes.map((p) => {
                          const id = p._id;
                          const idStr = String(id);
                          const isSelected = selectedPincodes.some((s) => String(s) === idStr);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => togglePincodeSelection(p)}
                              className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {p.pinCode}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {formErrors.pincodes && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.pincodes}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min}
                    onChange={(e) =>
                      setFormData({ ...formData, min: e.target.value })
                    }
                    className={`w-full border rounded-lg px-4 py-2.5 ${
                      formErrors.min ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                  />
                  {formErrors.min && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.min}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max}
                    onChange={(e) =>
                      setFormData({ ...formData, max: e.target.value })
                    }
                    className={`w-full border rounded-lg px-4 py-2.5 ${
                      formErrors.max ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                  />
                  {formErrors.max && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.max}
                    </p>
                  )}
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="DAY">Days</option>
                  <option value="HOUR">Hours</option>
                  <option value="MINUTE">Minutes</option>
                </select>
              </div>

              {/* Delivery Charge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Charge (₹) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.deliveryCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryCharge: e.target.value })
                  }
                  className={`w-full border rounded-lg px-4 py-2.5 ${
                    formErrors.deliveryCharge
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                />
                {formErrors.deliveryCharge && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.deliveryCharge}
                  </p>
                )}
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="FLAT">Flat</option>
                  <option value="PERCENTAGE">Percentage</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Max Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.maxDiscountAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscountAmount: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="isActive"
                className="ml-3 text-sm font-medium text-gray-700"
              >
                Active
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading && (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                )}
                {editId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Delivery Options</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No delivery options found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Charge
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deliveries.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {item.deliveryType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.deliveryDuration?.min} –{" "}
                          {item.deliveryDuration?.max}{" "}
                          {item.deliveryDuration?.unit?.toLowerCase() || "days"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ₹{Number(item.deliveryCharge || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.discount?.value > 0 ? (
                            <>
                              {item.discount.type === "PERCENT" || item.discount.type === "PERCENTAGE"
                                ? `${item.discount.value}%`
                                : `₹${item.discount.value}`}
                              {item.discount.maxDiscountAmount > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (max ₹{item.discount.maxDiscountAmount})
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              item.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleEdit(item._id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                            disabled={actionLoading}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Page <strong>{currentPage}</strong> of{" "}
                    <strong>{totalPages}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => fetchDeliveries(currentPage - 1)}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => fetchDeliveries(currentPage + 1)}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pincode Checker */}
        <div className="mt-10 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">
            Check Pincode Serviceability
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit pincode"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={handleCheckDelivery}
              disabled={checkingPin || pinCode.length !== 6}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2 min-w-[160px]"
            >
              {checkingPin && <Loader2 className="animate-spin" size={18} />}
              Check
            </button>
          </div>

          {checkResult && (
            <div
              className={`mt-8 p-5 rounded-lg border ${
                checkResult.isServiceable
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {checkResult.isServiceable ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <XCircle className="text-red-600" size={24} />
                )}
                <h3 className="text-lg font-semibold">
                  {checkResult.isServiceable
                    ? "Serviceable"
                    : "Not Serviceable"}
                </h3>
              </div>

              {checkResult.deliveryOptions?.length > 0 ? (
                <div className="space-y-4">
                  {checkResult.deliveryOptions.map((opt) => (
                    <div key={opt._id} className="bg-white p-4 rounded border">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{opt.deliveryType}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {opt.deliveryDuration?.min}–
                            {opt.deliveryDuration?.max}{" "}
                            {opt.deliveryDuration?.unit?.toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ₹{opt.deliveryCharge || 0}
                          </p>
                            {opt.discount?.value > 0 && (
                            <p className="text-sm text-green-600">
                              {opt.discount.type === "PERCENT" || opt.discount.type === "PERCENTAGE"
                                ? `${opt.discount.value}% off`
                                : `Flat ₹${opt.discount.value} off`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">
                  No delivery options available here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Delivery;
