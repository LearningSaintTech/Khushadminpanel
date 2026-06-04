import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2 } from "lucide-react";
import { createBrand, updateBrand, getBrands } from "../../apis/Brandapi";
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

const BrandForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({
    name: "",
    icon: null,
    iconPreview: null,
  });

  useEffect(() => {
    if (!isEdit) return;

    const loadBrand = async () => {
      setLoadingBrand(true);
      setLoadError("");
      try {
        const res = await getBrands(1, 200);
        const data = res?.data?.data || res?.data || {};
        const brandList = data.brands || data.items || [];
        const brand = (Array.isArray(brandList) ? brandList : []).find((b) => b._id === id);

        if (!brand) {
          setLoadError("Brand not found.");
          return;
        }

        setForm({
          name: brand.name || "",
          icon: null,
          iconPreview: brand.icon?.imageUrl || null,
        });
      } catch (err) {
        console.error("Error loading brand:", err);
        setLoadError(err?.message || "Failed to load brand.");
      } finally {
        setLoadingBrand(false);
      }
    };

    loadBrand();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "icon") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        icon: file,
        iconPreview: file ? URL.createObjectURL(file) : prev.iconPreview,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Brand name is required.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      if (form.icon) formData.append("icon", form.icon);

      if (isEdit) {
        await updateBrand(id, formData);
      } else {
        if (!form.icon) {
          alert("Please upload a brand logo.");
          setLoading(false);
          return;
        }
        await createBrand(formData);
      }

      navigate(ap("brands"));
    } catch (err) {
      console.error("Error saving brand:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to save brand");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingBrand || Boolean(loadError);

  return (
    <div className="mx-auto max-w-3xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("brands"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit Brand" : "Create Brand"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">Name and logo for catalog brands</p>
          </div>
        </div>
        {isEdit && form.name ? (
          <span className="inline-flex shrink-0 max-w-[200px] truncate rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">
            {form.name}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {loadError}
        </div>
      ) : null}

      {loadingBrand ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading brand…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(180px,220px)] lg:items-start">
          <FormSection title="Brand details" hint="Displayed in filters and product listings.">
            <Field label="Brand name" required>
              <input
                type="text"
                name="name"
                className={fieldClass}
                placeholder="e.g. Nike, Adidas"
                value={form.name}
                onChange={handleChange}
                disabled={formDisabled}
                required
              />
            </Field>
          </FormSection>

          <FormSection
            title="Logo"
            hint={isEdit ? "Upload a new file to replace the logo." : "Required for new brands."}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex aspect-square w-full max-w-[160px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas-muted/50 p-2">
                {form.iconPreview ? (
                  <img
                    src={form.iconPreview}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-stone-400">
                    <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
                    <span className="text-[10px]">No logo</span>
                  </div>
                )}
              </div>
              <label className="w-full cursor-pointer">
                <span className="sr-only">Upload logo</span>
                <input
                  type="file"
                  name="icon"
                  accept="image/*"
                  disabled={formDisabled}
                  onChange={handleChange}
                  className={`${fieldClass} cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700`}
                />
              </label>
              <p className="text-center text-[10px] text-stone-400">PNG, JPG, SVG recommended.</p>
            </div>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("brands"))}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Update brand"
            ) : (
              "Create brand"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandForm;
