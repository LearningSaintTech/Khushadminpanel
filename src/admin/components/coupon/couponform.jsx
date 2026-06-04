import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  createCoupon,
  updateCoupon,
  getCouponById,
} from "../../apis/Couponapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted disabled:text-stone-500";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

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

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {hint ? <p className="mb-1 text-[10px] text-stone-400">{hint}</p> : null}
      {children}
    </div>
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
      <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        Loading coupon…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("coupons"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit coupon" : "Create coupon"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              {isEdit ? "Update discount settings" : "Add a new discount code"}
            </p>
          </div>
        </div>
        {formData.code ? (
          <span className="inline-flex shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-brand-700">
            {formData.code}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormSection title="Basic" hint="Code and short description.">
          <Field label="Coupon code" required hint="Max 20 characters, stored uppercase">
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="HOLI30"
              required
              maxLength={20}
              className={`${fieldClass} max-w-xs font-mono uppercase tracking-wide`}
            />
          </Field>
          <Field label="Description" hint="Shown to admins; optional for customers">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g. 30% off on Holi sale"
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </Field>
        </FormSection>

        <FormSection title="Discount" hint="Type, value and cap.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Discount type" required>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className={fieldClass}
              >
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Flat (₹)</option>
              </select>
            </Field>
            <Field label="Value" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
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
                  className={`${fieldClass} pl-7`}
                />
              </div>
            </Field>
            <Field label="Max discount (₹)" hint="For % discounts only">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="500"
                  className={`${fieldClass} pl-7`}
                />
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Cart & usage limits">
          <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
            <Field label="Min cart (₹)" hint="Optional">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  name="minCartValue"
                  value={formData.minCartValue}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="999"
                  className={`${fieldClass} pl-7`}
                />
              </div>
            </Field>
            <Field label="Max cart (₹)" hint="Optional">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  name="maxCartValue"
                  value={formData.maxCartValue}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="5000"
                  className={`${fieldClass} pl-7`}
                />
              </div>
            </Field>
            <Field label="Total uses" hint="Blank = unlimited">
              <input
                type="number"
                name="totalUsageLimit"
                value={formData.totalUsageLimit}
                onChange={handleInputChange}
                min="0"
                placeholder="∞"
                className={fieldClass}
              />
            </Field>
            <Field label="Per user">
              <input
                type="number"
                name="perUserUsageLimit"
                value={formData.perUserUsageLimit}
                onChange={handleInputChange}
                min="1"
                placeholder="1"
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Validity">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Start date" required>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className={`${fieldClass} min-w-0`}
              />
            </Field>
            <Field label="Expiry date" required>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                required
                className={`${fieldClass} min-w-0`}
              />
            </Field>
          </div>
          <Field label="Applicable on">
            <select
              name="applicableOn"
              value={formData.applicableOn}
              onChange={handleInputChange}
              className={fieldClass}
            >
              <option value="ALL">All products</option>
              <option value="CATEGORY">Specific category</option>
              <option value="PRODUCT">Specific product</option>
            </select>
          </Field>
        </FormSection>

        <FormSection title="Options">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-white p-2.5 transition hover:border-brand-300 hover:bg-brand-50/40 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60">
              <input
                type="checkbox"
                name="isInfluencer"
                checked={!!formData.isInfluencer}
                onChange={handleInputChange}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-100"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-stone-800">
                  Influencer coupon
                </span>
                <span className="block text-[10px] leading-snug text-stone-500">
                  Shows in influencer coupon management
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-white p-2.5 transition hover:border-brand-300 hover:bg-brand-50/40 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60">
              <input
                type="checkbox"
                name="isAutoIncluded"
                checked={!!formData.isAutoIncluded}
                onChange={handleInputChange}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-100"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-stone-800">
                  Auto include
                </span>
                <span className="block text-[10px] leading-snug text-stone-500">
                  Can be auto-applied in cart / checkout
                </span>
              </span>
            </label>
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("coupons"))}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
  );
};

export default CouponForm;
