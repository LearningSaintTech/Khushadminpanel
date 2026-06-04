import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2, Save } from "lucide-react";
import {
  createFeature,
  updateFeature,
  getFeatures,
} from "../../apis/Featureapi";
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

const FeatureForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [loadingFeature, setLoadingFeature] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({
    featureName: "",
    description: "",
    icon: null,
    iconPreview: null,
  });

  useEffect(() => {
    if (!isEdit) return;

    const loadFeature = async () => {
      setLoadingFeature(true);
      setLoadError("");
      try {
        const res = await getFeatures(1, 200);
        const features = res?.data?.features || [];
        const feature = features.find((f) => f._id === id);

        if (!feature) {
          setLoadError("Feature not found.");
          return;
        }

        setForm({
          featureName: feature.featureName || "",
          description: feature.description || "",
          icon: null,
          iconPreview: feature.icon?.imageUrl || null,
        });
      } catch (err) {
        console.error("Error loading feature:", err);
        setLoadError(err?.message || "Failed to load feature.");
      } finally {
        setLoadingFeature(false);
      }
    };

    loadFeature();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "icon") {
      const file = files?.[0] || null;
      setForm({
        ...form,
        icon: file,
        iconPreview: file ? URL.createObjectURL(file) : form.iconPreview,
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("featureName", form.featureName);
    formData.append("description", form.description);
    if (form.icon) formData.append("icon", form.icon);

    try {
      setLoading(true);
      if (isEdit) {
        await updateFeature(id, formData);
      } else {
        await createFeature(formData);
      }
      navigate(ap("features"));
    } catch (err) {
      console.error("Error saving feature:", err);
      alert(err?.response?.data?.message || "Failed to save feature");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("features"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit feature" : "Create feature"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              {isEdit ? "Update feature details and icon" : "Add a new site feature"}
            </p>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {loadError}
        </div>
      ) : null}

      {loadingFeature ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading feature…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(200px,260px)] lg:items-start">
          <FormSection title="Details" hint="Name and description shown in the app.">
            <Field label="Feature name" required>
              <input
                type="text"
                name="featureName"
                value={form.featureName}
                onChange={handleChange}
                placeholder="Fast delivery"
                required
                disabled={loadingFeature}
                className={fieldClass}
              />
            </Field>
            <Field label="Description" required>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Short description for customers"
                rows={4}
                required
                disabled={loadingFeature}
                className={`${fieldClass} min-h-[88px] resize-y`}
              />
            </Field>
          </FormSection>

          <FormSection title="Icon" hint={isEdit ? "Leave empty to keep current icon." : "PNG, JPG, or SVG."}>
            {form.iconPreview ? (
              <div className="mb-2 flex justify-center rounded-xl border border-border bg-canvas-muted p-3">
                <img
                  src={form.iconPreview}
                  alt="Icon preview"
                  className="h-20 w-20 object-contain"
                />
              </div>
            ) : null}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-canvas-muted/50 px-3 py-6 transition hover:border-brand-400 hover:bg-brand-50/30">
              <ImageIcon className="mb-2 h-6 w-6 text-stone-400" />
              <span className="text-[11px] font-medium text-stone-700">
                {form.iconPreview ? "Change icon" : "Upload icon"}
              </span>
              <span className="mt-1 text-[10px] text-stone-500">Up to 5MB</span>
              <input
                type="file"
                name="icon"
                onChange={handleChange}
                accept="image/*"
                disabled={loadingFeature}
                className="hidden"
              />
            </label>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("features"))}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || loadingFeature}
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
                {isEdit ? "Update feature" : "Create feature"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeatureForm;
