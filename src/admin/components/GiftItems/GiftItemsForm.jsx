import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2 } from "lucide-react";
import { createGiftItem, getGiftItemById, updateGiftItem } from "../../apis/giftItemsApi";
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

const GiftItemsForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
    image: "",
    imageFile: null,
  });

  useEffect(() => {
    if (!isEdit) return;
    const loadItem = async () => {
      setLoadingItem(true);
      setLoadError("");
      try {
        const res = await getGiftItemById(id);
        const item = res?.data;
        if (!item) {
          setLoadError("Gift item not found.");
          return;
        }
        setForm({
          name: item.name || "",
          description: item.description || "",
          sortOrder: item.sortOrder ?? 0,
          isActive: Boolean(item.isActive),
          image: item.image || "",
          imageFile: null,
        });
      } catch (error) {
        console.error("Failed to load gift item:", error);
        setLoadError(error?.message || "Failed to load gift item.");
      } finally {
        setLoadingItem(false);
      }
    };

    loadItem();
  }, [id, isEdit]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name?.trim()) {
      alert("Please enter a name.");
      return;
    }
    if (!isEdit && !form.imageFile) {
      alert("Please upload an image.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description || "");
      formData.append("sortOrder", String(Number(form.sortOrder) || 0));
      formData.append("isActive", String(form.isActive));
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      if (isEdit) {
        await updateGiftItem(id, formData);
      } else {
        await createGiftItem(formData);
      }
      navigate(ap("gift-items"));
    } catch (error) {
      console.error("Save gift item failed:", error);
      alert(error?.message || "Failed to save gift item");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingItem || Boolean(loadError);

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("gift-items"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit Gift Item" : "Create Gift Item"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              Free add-ons customers can include with an order
            </p>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {loadError}
        </div>
      ) : null}

      {loadingItem ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading gift item…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(200px,240px)] lg:items-start">
          <div className="space-y-3">
            <FormSection title="Details" hint="Shown when customers pick a free gift at checkout.">
              <Field label="Name" required>
                <input
                  className={fieldClass}
                  placeholder="e.g. Thank-you card"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  disabled={formDisabled}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={`${fieldClass} min-h-[88px] resize-y`}
                  placeholder="Optional short description"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={formDisabled}
                />
              </Field>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Sort order">
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.sortOrder}
                    onChange={(e) => setField("sortOrder", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
                <Field label="Status">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${
                      form.isActive
                        ? "border-brand-200 bg-brand-50 text-brand-800"
                        : "border-border bg-canvas-muted/40 text-stone-600"
                    } ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand-600"
                      checked={form.isActive}
                      onChange={(e) => setField("isActive", e.target.checked)}
                      disabled={formDisabled}
                    />
                    <span className="font-medium">Active</span>
                  </label>
                </Field>
              </div>
            </FormSection>
          </div>

          <FormSection
            title="Gift image"
            hint={isEdit ? "Upload a new file to replace the current image." : "Required for new gift items."}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex aspect-square w-full max-w-[200px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas-muted/50">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="Gift item preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 px-3 text-center text-stone-400">
                    <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
                    <span className="text-[10px]">No image yet</span>
                  </div>
                )}
              </div>
              <label className="w-full">
                <span className="sr-only">Upload image</span>
                <input
                  className={`${fieldClass} file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700`}
                  type="file"
                  accept="image/*"
                  disabled={formDisabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setForm((prev) => ({
                      ...prev,
                      imageFile: file,
                      image: file ? URL.createObjectURL(file) : prev.image,
                    }));
                  }}
                />
              </label>
            </div>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("gift-items"))}
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
              "Update gift item"
            ) : (
              "Create gift item"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GiftItemsForm;
