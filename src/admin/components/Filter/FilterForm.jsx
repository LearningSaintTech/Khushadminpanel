import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader2, Save } from "lucide-react";
import {
  createFilter,
  updateFilter,
  getFilterById,
} from "../../apis/Filterapi";
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

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

const FilterForm = () => {
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
    key: "",
    label: "",
    description: "",
    values: [{ label: "", value: "", hex: "" }],
    isActive: true,
    sortOrder: 1,
    valueHasHex: false,
  });

  const normalizeHex = (hex) => {
    const v = String(hex ?? "").trim();
    if (!v) return null;
    const withHash = v.startsWith("#") ? v : `#${v}`;
    const normalized = withHash.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized)) return null;
    return normalized;
  };

  useEffect(() => {
    if (!isEdit) return;

    const loadFilter = async () => {
      try {
        setInitialLoad(true);
        setError(null);

        const response = await getFilterById(id);
        const filter = response?.data?.data || response?.data;

        const hasHex = Array.isArray(filter.values)
          ? filter.values.some((v) => String(v?.hex ?? "").trim().length > 0)
          : false;

        setFormData({
          key: filter.key || "",
          label: filter.label || "",
          description: filter.description || "",
          values:
            filter.values?.length > 0
              ? filter.values.map((v) => ({
                  label: v?.label ?? "",
                  value: v?.value ?? "",
                  hex: v?.hex ?? "",
                }))
              : [{ label: "", value: "", hex: "" }],
          isActive: filter.isActive !== false,
          sortOrder: filter.sortOrder || 1,
          valueHasHex: hasHex,
        });
      } catch (err) {
        console.error("Error loading filter:", err);
        setError("Failed to load filter data");
      } finally {
        setInitialLoad(false);
      }
    };

    loadFilter();
  }, [id, isEdit]);

  useEffect(() => {
    const keyLower = String(formData.key ?? "").trim().toLowerCase();
    if (!isEdit && (keyLower === "color" || keyLower.includes("color"))) {
      setFormData((prev) => ({ ...prev, valueHasHex: true }));
    }
  }, [formData.key, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleValueChange = (index, field, value) => {
    const newValues = [...formData.values];
    newValues[index] = { ...newValues[index], [field]: value };
    setFormData((prev) => ({ ...prev, values: newValues }));
  };

  const addValuePair = () => {
    setFormData((prev) => ({
      ...prev,
      values: [...prev.values, { label: "", value: "", hex: "" }],
    }));
  };

  const removeValuePair = (index) => {
    if (formData.values.length <= 1) return;
    const newValues = formData.values.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, values: newValues }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.key.trim() || !formData.label.trim()) {
      setError("Key and label are required");
      return;
    }

    const validValues = formData.values.filter((v) => v.label.trim() && v.value.trim());

    if (validValues.length === 0) {
      setError("At least one valid label-value pair is required");
      return;
    }

    const payload = {
      key: formData.key,
      label: formData.label,
      description: formData.description,
      values: validValues.map((v) => {
        const base = { label: v.label, value: v.value };
        if (!formData.valueHasHex) return base;
        return {
          ...base,
          hex: normalizeHex(v.hex),
        };
      }),
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 1,
    };

    try {
      setLoading(true);
      setError(null);

      if (isEdit) {
        await updateFilter(id, payload);
      } else {
        await createFilter(payload);
      }

      navigate(ap("filters"));
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save filter");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        Loading filter…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("filters"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit filter" : "Create filter"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              {isEdit ? "Update filter configuration" : "Add a new product filter"}
            </p>
          </div>
        </div>
        {formData.key ? (
          <span className="inline-flex shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
            {formData.key}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormSection title="Basic" hint="Key is used in APIs; label is shown in the UI.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Key" required>
              <input
                type="text"
                name="key"
                value={formData.key}
                onChange={handleInputChange}
                placeholder="e.g. color"
                required
                className={`${fieldClass} font-mono`}
              />
            </Field>
            <Field label="Label shown in UI" required>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                placeholder="e.g. Color"
                required
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional description"
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Sort order">
              <input
                type="number"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleInputChange}
                min="0"
                className={fieldClass}
              />
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] font-medium text-stone-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                />
                Active
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Values"
          hint="At least one label + value pair. Enable hex for color swatches."
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="valueHasHex"
                checked={formData.valueHasHex}
                onChange={(e) => {
                  const next = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    valueHasHex: next,
                    values: prev.values.map((v) => ({
                      ...v,
                      hex: next ? (v.hex ?? "") : "",
                    })),
                  }));
                }}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Hex field per value (color filters)
            </label>
            <button
              type="button"
              onClick={addValuePair}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add value
            </button>
          </div>

          <div className="space-y-2">
            {formData.values.map((value, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-canvas-muted/40 p-2"
              >
                <input
                  type="text"
                  placeholder="Label"
                  value={value.label}
                  onChange={(e) => handleValueChange(index, "label", e.target.value)}
                  className={`${fieldClass} min-w-[100px] flex-1`}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={value.value}
                  onChange={(e) => handleValueChange(index, "value", e.target.value)}
                  className={`${fieldClass} min-w-[100px] flex-1`}
                />
                {formData.valueHasHex ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="#FF0000"
                      value={value.hex ?? ""}
                      onChange={(e) => handleValueChange(index, "hex", e.target.value)}
                      className={`${fieldClass} w-28 font-mono`}
                    />
                    {normalizeHex(value.hex) ? (
                      <span
                        className="h-7 w-7 shrink-0 rounded border border-border"
                        style={{ backgroundColor: normalizeHex(value.hex) }}
                        title={normalizeHex(value.hex)}
                      />
                    ) : null}
                  </div>
                ) : null}
                {formData.values.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeValuePair(index)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                    title="Remove"
                    aria-label="Remove value"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("filters"))}
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
                {isEdit ? "Update filter" : "Create filter"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterForm;
