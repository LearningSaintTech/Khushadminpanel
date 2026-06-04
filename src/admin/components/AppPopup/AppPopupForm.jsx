import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2 } from "lucide-react";
import { createAppPopup, getAppPopupById, updateAppPopup } from "../../apis/appPopupApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const PLATFORM_OPTIONS = ["ANDROID", "IOS", "WEB"];
const ACTION_OPTIONS = ["NAVIGATE", "EXTERNAL_LINK", "DEEPLINK", "NONE"];
const AUDIENCE_OPTIONS = ["ALL", "NEW_USERS", "RETURNING_USERS"];

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

const AppPopupForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [loading, setLoading] = useState(false);
  const [loadingPopup, setLoadingPopup] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    popupId: "",
    title: "",
    description: "",
    image: "",
    imageFile: null,
    ctaText: "Check it out",
    ctaAction: "NAVIGATE",
    ctaValue: "",
    secondaryText: "Maybe later",
    isClosable: true,
    showOnce: true,
    priority: 1,
    startDate: "",
    endDate: "",
    isActive: true,
    audience: "ALL",
    platforms: ["ANDROID", "IOS"],
  });

  useEffect(() => {
    if (!isEdit) return;
    const loadPopup = async () => {
      setLoadingPopup(true);
      setLoadError("");
      try {
        const res = await getAppPopupById(id);
        const popup = res?.data;
        if (!popup) {
          setLoadError("Popup not found.");
          return;
        }
        setForm({
          popupId: popup.popupId || "",
          title: popup.title || "",
          description: popup.description || "",
          image: popup.image || "",
          imageFile: null,
          ctaText: popup.ctaText || "Check it out",
          ctaAction: popup.ctaAction || "NAVIGATE",
          ctaValue: popup.ctaValue || "",
          secondaryText: popup.secondaryText || "Maybe later",
          isClosable: Boolean(popup.isClosable),
          showOnce: Boolean(popup.showOnce),
          priority: popup.priority || 1,
          startDate: popup.startDate ? new Date(popup.startDate).toISOString().slice(0, 16) : "",
          endDate: popup.endDate ? new Date(popup.endDate).toISOString().slice(0, 16) : "",
          isActive: Boolean(popup.isActive),
          audience: popup.audience || "ALL",
          platforms:
            Array.isArray(popup.platforms) && popup.platforms.length
              ? popup.platforms
              : ["ANDROID", "IOS"],
        });
      } catch (error) {
        console.error("Failed to load popup:", error);
        setLoadError(error?.message || "Failed to load popup.");
      } finally {
        setLoadingPopup(false);
      }
    };

    loadPopup();
  }, [id, isEdit]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlatform = (platform) => {
    setForm((prev) => {
      const exists = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: exists ? prev.platforms.filter((p) => p !== platform) : [...prev.platforms, platform],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      priority: Number(form.priority) || 1,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
      endDate: form.endDate ? new Date(form.endDate).toISOString() : "",
    };

    if (!payload.popupId || !payload.title || !payload.startDate || !payload.endDate) {
      alert("Please fill Popup ID, title, start date, and end date.");
      return;
    }

    if (!payload.platforms.length) {
      alert("Please select at least one platform.");
      return;
    }
    if (!isEdit && !form.imageFile) {
      alert("Please upload a popup image.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("popupId", payload.popupId);
      formData.append("title", payload.title);
      formData.append("description", payload.description || "");
      formData.append("ctaText", payload.ctaText || "");
      formData.append("ctaAction", payload.ctaAction || "NONE");
      formData.append("ctaValue", payload.ctaValue || "");
      formData.append("secondaryText", payload.secondaryText || "");
      formData.append("priority", String(payload.priority));
      formData.append("startDate", payload.startDate);
      formData.append("endDate", payload.endDate);
      formData.append("isClosable", String(payload.isClosable));
      formData.append("showOnce", String(payload.showOnce));
      formData.append("isActive", String(payload.isActive));
      formData.append("audience", payload.audience || "ALL");
      formData.append("platforms", JSON.stringify(payload.platforms));
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      if (isEdit) {
        await updateAppPopup(id, formData);
      } else {
        await createAppPopup(formData);
      }
      navigate(ap("app-popup"));
    } catch (error) {
      console.error("Save popup failed:", error);
      alert(error?.message || "Failed to save popup");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingPopup || Boolean(loadError);

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("app-popup"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
            title="Back to list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit App Popup" : "Create App Popup"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              Shown when customers open the app
            </p>
          </div>
        </div>
        {isEdit && form.popupId ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-brand-700">
            {form.popupId}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {loadError}
        </div>
      ) : null}

      {loadingPopup ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading popup details…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(200px,240px)] lg:items-start">
          {/* Left column — fields */}
          <div className="space-y-3">
            <FormSection title="Basic details" hint="Unique ID and copy shown on the popup.">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Popup ID" required>
                  <input
                    className={fieldClass}
                    placeholder="e.g. welcome_offer"
                    value={form.popupId}
                    onChange={(e) => setField("popupId", e.target.value)}
                    disabled={formDisabled || isEdit}
                  />
                </Field>
                <Field label="Title" required>
                  <input
                    className={fieldClass}
                    placeholder="Popup headline"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  className={`${fieldClass} min-h-[72px] resize-y`}
                  rows={3}
                  placeholder="Short message under the title"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={formDisabled}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Call to action"
              hint="Primary button and optional dismiss label."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Primary button text">
                  <input
                    className={fieldClass}
                    value={form.ctaText}
                    onChange={(e) => setField("ctaText", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
                <Field label="Dismiss button text">
                  <input
                    className={fieldClass}
                    value={form.secondaryText}
                    onChange={(e) => setField("secondaryText", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Action type">
                  <select
                    className={fieldClass}
                    value={form.ctaAction}
                    onChange={(e) => setField("ctaAction", e.target.value)}
                    disabled={formDisabled}
                  >
                    {ACTION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Action value">
                  <input
                    className={fieldClass}
                    placeholder="URL, route, or deeplink"
                    value={form.ctaValue}
                    onChange={(e) => setField("ctaValue", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Schedule & targeting" hint="When the popup is eligible to show.">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Start date" required>
                  <input
                    className={fieldClass}
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setField("startDate", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
                <Field label="End date" required>
                  <input
                    className={fieldClass}
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setField("endDate", e.target.value)}
                    disabled={formDisabled}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Audience">
                  <select
                    className={fieldClass}
                    value={form.audience}
                    onChange={(e) => setField("audience", e.target.value)}
                    disabled={formDisabled}
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                    disabled={formDisabled}
                  />
                  <p className="mt-1 text-[10px] text-stone-400">Higher = shown first when multiple match.</p>
                </Field>
              </div>
            </FormSection>

            <FormSection title="Platforms & behavior">
              <div>
                <p className={labelClass}>Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => {
                    const selected = form.platforms.includes(platform);
                    return (
                      <label
                        key={platform}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          selected
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-border bg-white text-stone-600 hover:bg-canvas-muted"
                        } ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-brand-600"
                          checked={selected}
                          onChange={() => togglePlatform(platform)}
                          disabled={formDisabled}
                        />
                        {platform}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { key: "isClosable", label: "User can close" },
                  { key: "showOnce", label: "Show once per user" },
                  { key: "isActive", label: "Active" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${
                      form[key]
                        ? "border-brand-200 bg-brand-50 text-brand-800"
                        : "border-border bg-canvas-muted/40 text-stone-600"
                    } ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand-600"
                      checked={form[key]}
                      onChange={(e) => setField(key, e.target.checked)}
                      disabled={formDisabled}
                    />
                    <span className="font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </FormSection>
          </div>

          {/* Right column — image */}
          <FormSection
            title="Popup image"
            hint={isEdit ? "Upload a new file to replace the current image." : "Required for new popups."}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex aspect-4/5 w-full max-w-[200px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas-muted/50">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="Popup preview"
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
              <p className="text-center text-[10px] text-stone-400">
                Recommended: portrait image, clear text at top.
              </p>
            </div>
          </FormSection>
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("app-popup"))}
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
              "Update popup"
            ) : (
              "Create popup"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppPopupForm;
