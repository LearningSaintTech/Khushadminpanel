import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2, Film } from "lucide-react";
import {
  createFeaturedImage,
  updateFeaturedImage,
  getFeaturedImageById,
} from "../../apis/Bannerapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const PAGE_OPTIONS = [
  { value: "home", label: "Home page" },
  { value: "lock", label: "Lock screen" },
  { value: "bottom", label: "Bottom banner" },
];

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

const BannerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({
    file: null,
    preview: null,
    fileType: null,
    heading: "",
    subHeading: "",
    page: "home",
  });

  useEffect(() => {
    if (!isEdit) return;

    const loadBanner = async () => {
      setLoadingBanner(true);
      setLoadError("");
      try {
        const response = await getFeaturedImageById(id);
        const banner = response?.data?.data || response?.data || response;

        if (!banner || !banner._id) {
          setLoadError("Banner not found.");
          return;
        }

        const previewUrl = banner.url || null;
        const fileType = previewUrl?.match(/\.(mp4|webm|mov)$/i)
          ? "video"
          : previewUrl
            ? "image"
            : null;

        setForm({
          file: null,
          preview: previewUrl,
          fileType,
          heading: banner.heading || "",
          subHeading: banner.subHeading || "",
          page: banner.page || "home",
        });
      } catch (err) {
        console.error("Error loading banner:", err);
        setLoadError(err?.message || "Failed to load banner.");
      } finally {
        setLoadingBanner(false);
      }
    };

    loadBanner();
  }, [id, isEdit]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileType = selectedFile.type.startsWith("video")
      ? "video"
      : selectedFile.type.startsWith("image")
        ? "image"
        : null;

    if (!fileType) {
      alert("Please select an image or video file.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: selectedFile,
      preview: URL.createObjectURL(selectedFile),
      fileType,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("heading", form.heading);
    formData.append("subHeading", form.subHeading);
    formData.append("page", form.page);
    if (form.file) {
      formData.append("file", form.file);
    }

    if (!isEdit && !form.file) {
      alert("Please upload an image or video.");
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await updateFeaturedImage(id, formData);
      } else {
        await createFeaturedImage(formData);
      }
      navigate(ap("banners"));
    } catch (err) {
      console.error("Error saving banner:", err);
      if (err.response?.status === 413) {
        alert("File is too large.");
      } else {
        alert(err?.response?.data?.message || err?.message || "Failed to save banner.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingBanner || Boolean(loadError);

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("banners"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit Banner" : "Create Banner"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              Featured image or video for app pages
            </p>
          </div>
        </div>
        {isEdit && form.page ? (
          <span className="inline-flex shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-brand-700">
            {form.page}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {loadError}
        </div>
      ) : null}

      {loadingBanner ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading banner…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(220px,280px)] lg:items-start">
          <div className="space-y-3">
            <FormSection title="Copy" hint="Text shown over or beside the banner.">
              <Field label="Main heading">
                <input
                  type="text"
                  name="heading"
                  className={fieldClass}
                  placeholder="Headline"
                  value={form.heading}
                  onChange={handleChange}
                  disabled={formDisabled}
                />
              </Field>
              <Field label="Sub heading">
                <input
                  type="text"
                  name="subHeading"
                  className={fieldClass}
                  placeholder="Supporting line"
                  value={form.subHeading}
                  onChange={handleChange}
                  disabled={formDisabled}
                />
              </Field>
            </FormSection>

            <FormSection title="Placement" hint="Where this banner appears in the app.">
              <Field label="Page location" required>
                <select
                  name="page"
                  className={fieldClass}
                  value={form.page}
                  onChange={handleChange}
                  disabled={formDisabled}
                >
                  {PAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </FormSection>
          </div>

          <FormSection
            title="Media"
            hint={isEdit ? "Upload a new file to replace the current asset." : "Image or video required."}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas-muted/50">
                {form.preview ? (
                  form.fileType === "video" ? (
                    <video
                      src={form.preview}
                      controls
                      className="max-h-40 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={form.preview}
                      alt="Preview"
                      className="max-h-40 w-full object-contain"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-1 px-3 py-6 text-stone-400">
                    {form.fileType === "video" ? (
                      <Film className="h-8 w-8" strokeWidth={1.25} />
                    ) : (
                      <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
                    )}
                    <span className="text-[10px]">No media yet</span>
                  </div>
                )}
              </div>
              <label className="w-full">
                <span className="sr-only">Upload file</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  disabled={formDisabled}
                  onChange={handleFileChange}
                  className={`${fieldClass} file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700`}
                />
              </label>
              <p className="text-center text-[10px] text-stone-400">
                JPG, PNG, WebP, MP4, WebM supported.
              </p>
            </div>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("banners"))}
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
              "Update banner"
            ) : (
              "Create banner"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BannerForm;
