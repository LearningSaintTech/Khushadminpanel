import React, { useEffect, useState } from "react";
import {
  getDeliveries,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  checkDeliveryByPincode,
} from "../../apis/Deliveryapi";
import { 
  Plus, Edit2, Trash2, CheckCircle, XCircle, 
  Loader2, Search, AlertCircle 
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
  const [checkResult, setCheckResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

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

  // Fetch deliveries
  const fetchDeliveries = async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await getDeliveries(page, limit);
      const data = res?.data?.data || res?.data || {};
      
      setDeliveries(data.deliveries || data.items || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit) || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries(1);
  }, []);

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.deliveryType.trim()) errors.deliveryType = "Required";
    if (!formData.min || formData.min <= 0) errors.min = "Valid min duration required";
    if (!formData.max || formData.max <= 0) errors.max = "Valid max duration required";
    if (Number(formData.min) > Number(formData.max)) errors.max = "Max must be ≥ Min";
    if (!formData.deliveryCharge || formData.deliveryCharge < 0) errors.deliveryCharge = "Valid charge required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);
    const payload = {
      deliveryType: formData.deliveryType.trim(),
      deliveryDuration: {
        min: Number(formData.min),
        max: Number(formData.max),
        unit: formData.unit,
      },
      discount: {
        type: formData.discountType,
        value: Number(formData.discountValue || 0),
        maxDiscountAmount: Number(formData.maxDiscountAmount || 0),
      },
      deliveryCharge: Number(formData.deliveryCharge),
      isActive: formData.isActive,
    };

    try {
      if (editId) {
        await updateDelivery(editId, payload);
      } else {
        await createDelivery(payload);
      }
      resetForm();
      fetchDeliveries();
    } catch (err) {
      console.error("Delivery save failed:", err);
      alert("Failed to save delivery. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setFormData({
      deliveryType: item.deliveryType || "",
      min: item.deliveryDuration?.min || "",
      max: item.deliveryDuration?.max || "",
      unit: item.deliveryDuration?.unit || "DAY",
      discountType: item.discount?.type || "FLAT",
      discountValue: item.discount?.value || "",
      maxDiscountAmount: item.discount?.maxDiscountAmount || "",
      deliveryCharge: item.deliveryCharge || "",
      isActive: !!item.isActive,
    });
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this delivery option?")) return;
    
    setActionLoading(true);
    try {
      await deleteDelivery(id);
      if (deliveries.length === 1 && currentPage > 1) {
        fetchDeliveries(currentPage - 1);
      } else {
        fetchDeliveries();
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete delivery.");
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
  };

  const handleCheckDelivery = async () => {
    if (!pinCode.trim() || pinCode.length !== 6) {
      alert("Please enter a valid 6-digit pincode");
      return;
    }

    setCheckingPin(true);
    try {
      const res = await checkDeliveryByPincode(pinCode.trim());
      setCheckResult(res?.data || null);
    } catch (err) {
      console.error("Pincode check failed:", err);
      setCheckResult({ isServiceable: false, error: "Service check failed" });
    } finally {
      setCheckingPin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Delivery Management
          </h1>
          {/* <button
            onClick={resetForm}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Delivery Option
          </button> */}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-10">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            {editId ? "Edit Delivery Option" : "Create New Delivery Option"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Delivery Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="deliveryType"
                  value={formData.deliveryType}
                  onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                    formErrors.deliveryType ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. Standard, Express, Same Day"
                />
                {formErrors.deliveryType && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.deliveryType}</p>
                )}
              </div>

              {/* Duration Min - Max */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="min"
                    value={formData.min}
                    onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                      formErrors.min ? "border-red-500" : "border-gray-300"
                    }`}
                    min="1"
                  />
                  {formErrors.min && <p className="mt-1 text-sm text-red-600">{formErrors.min}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="max"
                    value={formData.max}
                    onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                      formErrors.max ? "border-red-500" : "border-gray-300"
                    }`}
                    min="1"
                  />
                  {formErrors.max && <p className="mt-1 text-sm text-red-600">{formErrors.max}</p>}
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                >
                  <option value="DAY">Days</option>
                  <option value="HOUR">Hours</option>
                </select>
              </div>

              {/* Delivery Charge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Charge (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="deliveryCharge"
                  value={formData.deliveryCharge}
                  onChange={(e) => setFormData({ ...formData, deliveryCharge: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                    formErrors.deliveryCharge ? "border-red-500" : "border-gray-300"
                  }`}
                  min="0"
                  step="1"
                />
                {formErrors.deliveryCharge && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.deliveryCharge}</p>
                )}
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
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
                  name="discountValue"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Max Discount Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount (₹)
                </label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="ml-3 text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {editId ? "Update Delivery" : "Create Delivery"}
              </button>
            </div>
          </form>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Delivery Options</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading delivery options...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No delivery options configured yet.
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {item.deliveryType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.deliveryDuration?.min}–{item.deliveryDuration?.max} {item.deliveryDuration?.unit?.toLowerCase() || 'days'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                          ₹{item.deliveryCharge || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.discount?.value ? (
                            <>
                              {item.discount.type === "PERCENTAGE" ? `${item.discount.value}%` : `₹${item.discount.value}`}
                              {item.discount.maxDiscountAmount > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (max ₹{item.discount.maxDiscountAmount})
                                </span>
                              )}
                            </>
                          ) : "—"}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="text-red-600 hover:text-red-900 transition"
                            title="Delete"
                            disabled={actionLoading}
                          >
                            <Trash2 className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{deliveries.length}</span> of{" "}
                    <span className="font-medium">{totalPages * limit}</span> options
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => fetchDeliveries(currentPage - 1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Previous
                    </button>

                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => fetchDeliveries(currentPage + 1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pincode Check Section */}
        <div className="mt-10 bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Check Serviceability by Pincode
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <div className="flex-1">
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Pincode
              </label>
              <div className="relative">
                <input
                  id="pincode"
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit pincode"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <button
              onClick={handleCheckDelivery}
              disabled={checkingPin || pinCode.length !== 6}
              className="mt-6 sm:mt-7 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
            >
              {checkingPin ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Availability"
              )}
            </button>
          </div>

          {/* Result */}
          {checkResult && (
            <div className="mt-8">
              <div className={`p-5 rounded-lg border ${
                checkResult.isServiceable 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {checkResult.isServiceable ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <h3 className="text-lg font-semibold">
                    {checkResult.isServiceable ? "Serviceable" : "Not Serviceable"}
                  </h3>
                </div>

                {checkResult.deliveryOptions?.length > 0 ? (
                  <div className="space-y-4">
                    {checkResult.deliveryOptions.map((opt) => (
                      <div key={opt._id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{opt.deliveryType}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {opt.deliveryDuration.min}–{opt.deliveryDuration.max} {opt.deliveryDuration.unit.toLowerCase()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ₹{opt.deliveryCharge || 0}
                            </p>
                            {opt.discount?.value > 0 && (
                              <p className="text-sm text-green-600">
                                {opt.discount.type === "PERCENTAGE" 
                                  ? `${opt.discount.value}% off` 
                                  : `₹${opt.discount.value} off`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 mt-2">No delivery options available for this pincode.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Delivery;