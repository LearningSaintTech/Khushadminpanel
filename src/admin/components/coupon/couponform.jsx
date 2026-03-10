import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createCoupon,
  updateCoupon,
  getCouponById,
} from "../../apis/CouponApi";

const CouponForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    maxDiscountAmount: "",
    minCartValue: "",
    totalUsageLimit: "",
    perUserUsageLimit: "1",
    startDate: "",
    expiryDate: "",
    applicableOn: "ALL",
  });

  // Load coupon data if editing
  useEffect(() => {
    if (!isEdit) return;

    const loadCoupon = async () => {
      try {
        setLoading(true);
        const response = await getCouponById(id);
        const coupon = response?.data;

        if (coupon) {
          setFormData({
            code: coupon.code || "",
            description: coupon.description || "",
            discountType: coupon.discountType || "PERCENT",
            discountValue: coupon.discountValue || "",
            maxDiscountAmount: coupon.maxDiscountAmount || "",
            minCartValue: coupon.minCartValue || "",
            totalUsageLimit: coupon.totalUsageLimit || "",
            perUserUsageLimit: coupon.perUserUsageLimit || "1",
            startDate: coupon.startDate ? coupon.startDate.split('T')[0] : "",
            expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : "",
            applicableOn: coupon.applicableOn || "ALL",
          });
        } else {
          setError("Coupon not found");
        }
      } catch (err) {
        console.error("Error loading coupon:", err);
        setError("Failed to load coupon");
      } finally {
        setLoading(false);
      }
    };

    loadCoupon();
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      setError("Coupon code is required");
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    if (!formData.startDate || !formData.expiryDate) {
      setError("Start and expiry dates are required");
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
      minCartValue: formData.minCartValue ? Number(formData.minCartValue) : undefined,
      totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : undefined,
      perUserUsageLimit: formData.perUserUsageLimit ? Number(formData.perUserUsageLimit) : 1,
      startDate: formData.startDate,
      expiryDate: formData.expiryDate,
      applicableOn: formData.applicableOn,
    };

    try {
      setLoading(true);
      setError(null);

      if (isEdit) {
        await updateCoupon(id, payload);
      } else {
        await createCoupon(payload);
      }

      navigate("/admin/coupons");
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button and Title on Right */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/coupons")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Coupon" : "Create Coupon"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update coupon information" : "Create a new discount coupon"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && !isEdit && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            {/* Coupon Code - Small Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="HOLI30"
                  required
                  maxLength={20}
                  className="w-48 px-4 py-2.5 text-sm font-medium rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all uppercase tracking-wide placeholder:normal-case placeholder:text-gray-400"
                />
                <span className="text-xs text-gray-500">Max 20 characters</span>
              </div>
            </div>

            {/* Discount Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all cursor-pointer"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {formData.discountType === "PERCENT" ? (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  ) : (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  )}
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="30"
                    required
                    className={`w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${formData.discountType === "PERCENT" ? "pl-8" : "pl-8"}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Discount <span className="text-xs text-gray-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    name="maxDiscountAmount"
                    value={formData.maxDiscountAmount}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="500"
                    className="w-full px-4 py-2.5 pl-8 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-xs text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g. 30% off on Holi Sale"
                rows={2}
                className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all resize-none placeholder:text-gray-400"
              />
            </div>

            {/* Usage Limits & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min Cart Value <span className="text-xs text-gray-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    name="minCartValue"
                    value={formData.minCartValue}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="999"
                    className="w-full px-4 py-2.5 pl-8 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Usage Limit <span className="text-xs text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  name="totalUsageLimit"
                  value={formData.totalUsageLimit}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Unlimited if blank"
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Per User Limit
                </label>
                <input
                  type="number"
                  name="perUserUsageLimit"
                  value={formData.perUserUsageLimit}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Applicable On */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Applicable On
              </label>
              <select
                name="applicableOn"
                value={formData.applicableOn}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all cursor-pointer"
              >
                <option value="ALL">All Products</option>
                <option value="CATEGORY">Specific Category</option>
                <option value="PRODUCT">Specific Product</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/coupons")}
                className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  isEdit ? "Update Coupon" : "Create Coupon"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CouponForm;