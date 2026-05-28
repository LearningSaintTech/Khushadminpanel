import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Ticket, Save } from "lucide-react";
import {
  createCoupon,
  updateCoupon,
  getCouponById,
} from "../../apis/Couponapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "mb-1 block text-[11px] font-medium text-slate-700";
const hintClass = "mt-0.5 text-[10px] text-slate-400";
const sectionClass =
  "rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:p-3.5 space-y-3";

function FieldLabel({ children, required, hint }) {
  return (
    <div className="mb-1">
      <label className={labelClass}>
        {children}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className={sectionClass}>
      <div className="border-b border-slate-200/80 pb-2 mb-1">
        <h2 className="text-xs font-semibold text-slate-800">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[10px] text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

const CouponForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(isEdit);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    maxDiscountAmount: "",
    minCartValue: "",
    maxCartValue: "",
    totalUsageLimit: "",
    perUserUsageLimit: "1",
    startDate: "",
    expiryDate: "",
    applicableOn: "ALL",
    isInfluencer: false,
    isAutoIncluded: false,
  });

  useEffect(() => {
    if (!isEdit) return;

    const loadCoupon = async () => {
      try {
        setInitialLoad(true);
        const response = await getCouponById(id);
        const coupon = response?.data;

        if (coupon) {
          setFormData({
            code: coupon.code || "",
            description: coupon.description || "",
            discountType: coupon.discountType || "PERCENT",
            discountValue: coupon.discountValue ?? "",
            maxDiscountAmount: coupon.maxDiscountAmount ?? "",
            minCartValue: coupon.minCartValue ?? "",
            maxCartValue:
              coupon.maxCartValue !== undefined && coupon.maxCartValue !== null
                ? String(coupon.maxCartValue)
                : "",
            totalUsageLimit: coupon.totalUsageLimit ?? "",
            perUserUsageLimit: coupon.perUserUsageLimit || "1",
            startDate: coupon.startDate ? coupon.startDate.split("T")[0] : "",
            expiryDate: coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "",
            applicableOn: coupon.applicableOn || "ALL",
            isInfluencer: !!coupon.isInfluencer,
            isAutoIncluded: !!coupon.isAutoIncluded,
          });
        } else {
          setError("Coupon not found");
        }
      } catch (err) {
        console.error("Error loading coupon:", err);
        setError("Failed to load coupon");
      } finally {
        setInitialLoad(false);
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
      maxDiscountAmount: formData.maxDiscountAmount
        ? Number(formData.maxDiscountAmount)
        : undefined,
      minCartValue: formData.minCartValue
        ? Number(formData.minCartValue)
        : undefined,
      maxCartValue: formData.maxCartValue
        ? Number(formData.maxCartValue)
        : undefined,
      totalUsageLimit: formData.totalUsageLimit
        ? Number(formData.totalUsageLimit)
        : undefined,
      perUserUsageLimit: formData.perUserUsageLimit
        ? Number(formData.perUserUsageLimit)
        : 1,
      startDate: formData.startDate,
      expiryDate: formData.expiryDate,
      applicableOn: formData.applicableOn,
      isInfluencer: !!formData.isInfluencer,
      isAutoIncluded: !!formData.isAutoIncluded,
    };

    try {
      setLoading(true);
      setError(null);

      if (isEdit) {
        await updateCoupon(id, payload);
      } else {
        await createCoupon(payload);
      }

      navigate(ap("coupons"));
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        Loading coupon…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => navigate(ap("coupons"))}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Ticket className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-right sm:text-left">
              <h1 className="truncate text-sm font-semibold text-slate-900">
                {isEdit ? "Edit coupon" : "Create coupon"}
              </h1>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                {isEdit ? "Update discount settings" : "Add a new discount code"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4">
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <Section title="Basic" description="Code and short description">
            <div>
              <FieldLabel required hint="Max 20 characters, stored uppercase">
                Coupon code
              </FieldLabel>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="HOLI30"
                required
                maxLength={20}
                className={`${inputClass} max-w-xs font-mono uppercase tracking-wide`}
              />
            </div>
            <div>
              <FieldLabel hint="Shown to admins; optional for customers">
                Description
              </FieldLabel>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g. 30% off on Holi sale"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </Section>

          <Section title="Discount" description="Type, value and cap">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel required>Discount type</FieldLabel>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className={inputClass}
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Flat (₹)</option>
                </select>
              </div>
              <div>
                <FieldLabel required>Value</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    {formData.discountType === "PERCENT" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="30"
                    required
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel hint="For % discounts only">Max discount (₹)</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="maxDiscountAmount"
                    value={formData.maxDiscountAmount}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="500"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Cart & usage limits">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel hint="Optional">Min cart (₹)</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="minCartValue"
                    value={formData.minCartValue}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="999"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel hint="Optional">Max cart (₹)</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="maxCartValue"
                    value={formData.maxCartValue}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="5000"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel hint="Blank = unlimited">Total uses</FieldLabel>
                <input
                  type="number"
                  name="totalUsageLimit"
                  value={formData.totalUsageLimit}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="∞"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Per user</FieldLabel>
                <input
                  type="number"
                  name="perUserUsageLimit"
                  value={formData.perUserUsageLimit}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          <Section title="Validity">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Start date</FieldLabel>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel required>Expiry date</FieldLabel>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Applicable on</FieldLabel>
              <select
                name="applicableOn"
                value={formData.applicableOn}
                onChange={handleInputChange}
                className={inputClass}
              >
                <option value="ALL">All products</option>
                <option value="CATEGORY">Specific category</option>
                <option value="PRODUCT">Specific product</option>
              </select>
            </div>
          </Section>

          <Section title="Options">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/30 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50/50">
                <input
                  type="checkbox"
                  name="isInfluencer"
                  checked={!!formData.isInfluencer}
                  onChange={handleInputChange}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-800">
                    Influencer coupon
                  </span>
                  <span className="block text-[10px] text-slate-500 leading-snug">
                    Shows in influencer coupon management
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/30 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50/50">
                <input
                  type="checkbox"
                  name="isAutoIncluded"
                  checked={!!formData.isAutoIncluded}
                  onChange={handleInputChange}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-800">
                    Auto include
                  </span>
                  <span className="block text-[10px] text-slate-500 leading-snug">
                    Can be auto-applied in cart / checkout
                  </span>
                </span>
              </label>
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(ap("coupons"))}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {isEdit ? "Update coupon" : "Create coupon"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponForm;
