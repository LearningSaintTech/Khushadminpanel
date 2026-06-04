import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  createGiftCardRule,
  getGiftCardRuleById,
  updateGiftCardRule,
} from "../../apis/GiftcardApi";
import {
  alertDanger,
  btnOutline,
  btnPrimary,
  Field,
  fieldClass,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./giftShared";

const initialSlab = { minPrice: "", maxPrice: "", percent: "", label: "" };

const GiftCardForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "INR",
    isActive: true,
    rules: "",
    image: null,
    slabs: [{ ...initialSlab }],
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loadError, setLoadError] = useState("");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("gift"));
  };

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    const fetchSingle = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const response = await getGiftCardRuleById(id);
        const item = response?.data?.data || response?.data;

        if (cancelled) return;

        if (!item) {
          setLoadError("Gift card not found.");
          return;
        }

        setFormData({
          name: item.name || "",
          description: item.description || "",
          currency: item.currency || "INR",
          isActive: Boolean(item.isActive),
          rules: Array.isArray(item.rules) ? item.rules.join(", ") : "",
          image: null,
          slabs:
            Array.isArray(item.slabs) && item.slabs.length > 0
              ? item.slabs.map((slab) => ({
                  minPrice: slab.minPrice ?? "",
                  maxPrice: slab.maxPrice ?? "",
                  percent: slab.percent ?? "",
                  label: slab.label ?? "",
                }))
              : [{ ...initialSlab }],
        });

        setPreviewImage(item.image || null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            extractBackendMessages(err).join("; ") || "Failed to load gift card.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSingle();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === "image" && files?.[0]) {
      setFormData((prev) => ({ ...prev, image: files[0] }));
      setPreviewImage(URL.createObjectURL(files[0]));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSlabChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedSlabs = [...prev.slabs];
      updatedSlabs[index] = { ...updatedSlabs[index], [field]: value };
      return { ...prev, slabs: updatedSlabs };
    });
  };

  const addSlab = () => {
    setFormData((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { ...initialSlab }],
    }));
  };

  const removeSlab = (index) => {
    setFormData((prev) => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setErrors([]);

      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("description", formData.description.trim());
      payload.append("currency", formData.currency);

      const formattedSlabs = formData.slabs.map((slab) => ({
        minPrice: Number(slab.minPrice),
        maxPrice: slab.maxPrice === "" ? null : Number(slab.maxPrice),
        percent: Number(slab.percent),
        label: slab.label,
      }));
      payload.append("slabs", JSON.stringify(formattedSlabs));
      payload.append("isActive", formData.isActive ? "true" : "false");

      const rulesArray = formData.rules
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      payload.append("rules", JSON.stringify(rulesArray));

      if (formData.image) {
        payload.append("image", formData.image);
      }

      if (isEdit) {
        await updateGiftCardRule(id, payload);
      } else {
        await createGiftCardRule(payload);
      }

      navigate(ap("gift"));
    } catch (err) {
      setErrors(
        extractBackendMessages(err).length
          ? extractBackendMessages(err)
          : ["Something went wrong. Please try again."],
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Edit gift card
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-12 text-[11px] text-stone-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading…
        </div>
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Edit gift card
          </h1>
        </div>
        <div className={alertDanger}>{loadError}</div>
        <button
          type="button"
          onClick={() => navigate(ap("gift"))}
          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Back to gift cards
        </button>
      </div>
    );
  }

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          {isEdit ? "Edit gift card" : "Create gift card"}
        </h1>
        <button type="button" onClick={() => navigate(ap("gift"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {errors.length > 0 ? (
          <ul className={`${alertDanger} list-inside list-disc space-y-0.5`}>
            {errors.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        ) : null}

        <FormSection title="Basic details" hint="Name, currency, and description">
          <Field label="Gift card name" required>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Festive Bonus Card"
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Currency">
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className={`${fieldClass} resize-none`}
              placeholder="Short description"
            />
          </Field>
        </FormSection>

        <FormSection title="Price slabs" hint="Min/max price ranges and bonus percent">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addSlab}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add slab
            </button>
          </div>
          {formData.slabs.map((slab, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-canvas-muted/40 p-2 sm:grid-cols-4"
            >
              <Field label="Min price">
                <input
                  type="number"
                  value={slab.minPrice}
                  onChange={(e) => handleSlabChange(index, "minPrice", e.target.value)}
                  className={fieldClass}
                  placeholder="100"
                />
              </Field>
              <Field label="Max price">
                <input
                  type="number"
                  value={slab.maxPrice}
                  onChange={(e) => handleSlabChange(index, "maxPrice", e.target.value)}
                  className={fieldClass}
                  placeholder="499"
                />
              </Field>
              <Field label="Percent">
                <input
                  type="number"
                  step="1"
                  value={slab.percent}
                  onChange={(e) => handleSlabChange(index, "percent", e.target.value)}
                  className={fieldClass}
                  placeholder="10"
                />
              </Field>
              <Field label="Label">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={slab.label}
                    onChange={(e) => handleSlabChange(index, "label", e.target.value)}
                    className={fieldClass}
                    placeholder="Starter"
                  />
                  {formData.slabs.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSlab(index)}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg px-2 text-danger hover:bg-danger/10"
                      aria-label="Remove slab"
                      title="Remove slab"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </Field>
            </div>
          ))}
        </FormSection>

        <FormSection title="Rules & media">
          <Field label="Rules (comma separated)">
            <textarea
              name="rules"
              rows={3}
              value={formData.rules}
              onChange={handleChange}
              className={`${fieldClass} resize-none`}
              placeholder="Valid for 30 days, Non-refundable"
            />
          </Field>
          <Field label="Image">
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              className="block w-full text-[11px] text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-canvas-muted file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
            />
            {previewImage ? (
              <img
                src={previewImage}
                alt="Gift card preview"
                className="mt-2 h-20 w-20 rounded-lg border border-border object-cover"
              />
            ) : null}
          </Field>
          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-3.5 w-3.5 rounded border-border accent-brand-600"
            />
            Active — visible to customers
          </label>
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("gift"))} disabled={submitting} className={btnOutline}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {isEdit ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GiftCardForm;
