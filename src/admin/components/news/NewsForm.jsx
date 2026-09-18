import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Link2,
  Layers,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { createNews, getSingleNews, updateNews, getAllNews } from "../../apis/NewsApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted disabled:text-stone-500";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function FormSection({ title, hint, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 border-b border-border pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={15} className="text-brand-600" /> : null}
          <div>
            <h2 className="text-xs font-bold text-stone-900">{title}</h2>
            {hint ? <p className="text-[10px] text-stone-500">{hint}</p> : null}
          </div>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass}>
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
        {hint ? <span className="text-[10px] text-stone-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function isValidHttpUrl(string) {
  if (!string || typeof string !== "string") return false;
  const trimmed = string.trim();
  return /^https?:\/\//i.test(trimmed);
}

export default function NewsForm() {
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
    isActive: true,
    sortOrder: 0,
    logo: null,
    logoPreview: null,
    links: [""],
  });

  const [dragActive, setDragActive] = useState(false);

  // Load existing news item for editing
  useEffect(() => {
    if (!isEdit) return;

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        setLoadingItem(true);
        setLoadError("");

        let newsItem = null;
        try {
          const singleRes = await getSingleNews(id);
          newsItem = singleRes?.data?.data || singleRes?.data || null;
        } catch {
          // Fallback to searching all
          const listRes = await getAllNews({ page: 1, limit: 100 });
          const list = listRes?.data?.data?.news || listRes?.data?.data || listRes?.data || [];
          newsItem = (Array.isArray(list) ? list : []).find((x) => (x._id || x.id) === id);
        }

        if (!newsItem) {
          if (isMounted) setLoadError("News item not found.");
          return;
        }

        if (isMounted) {
          const linksArr = Array.isArray(newsItem.links) && newsItem.links.length > 0
            ? newsItem.links
            : [""];

          setForm({
            name: newsItem.name || "",
            isActive: newsItem.isActive !== undefined ? Boolean(newsItem.isActive) : true,
            sortOrder: newsItem.sortOrder !== undefined ? Number(newsItem.sortOrder) : 0,
            logo: null,
            logoPreview: newsItem.logo || null,
            links: linksArr,
          });
        }
      } catch (err) {
        console.error("[NewsForm] fetch error:", err);
        if (isMounted) setLoadError(err?.message || "Failed to load news item.");
      } finally {
        if (isMounted) setLoadingItem(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileSelection = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP, SVG)");
      return;
    }
    setForm((prev) => ({
      ...prev,
      logo: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelection(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Links management
  const handleLinkChange = (index, value) => {
    setForm((prev) => {
      const nextLinks = [...prev.links];
      nextLinks[index] = value;
      return { ...prev, links: nextLinks };
    });
  };

  const handleAddLink = () => {
    if (form.links.length >= 20) {
      toast.error("Maximum 20 links allowed");
      return;
    }
    setForm((prev) => ({
      ...prev,
      links: [...prev.links, ""],
    }));
  };

  const handleRemoveLink = (index) => {
    setForm((prev) => {
      const filtered = prev.links.filter((_, i) => i !== index);
      return { ...prev, links: filtered.length > 0 ? filtered : [""] };
    });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    if (!isEdit && !form.logo) {
      toast.error("Logo file is required");
      return;
    }

    // Filter out completely blank lines
    const validLinks = form.links.map((l) => l.trim()).filter(Boolean);

    if (validLinks.length === 0) {
      toast.error("At least one link URL is required");
      return;
    }

    if (validLinks.length > 20) {
      toast.error("Maximum 20 links allowed");
      return;
    }

    // Check all links start with http:// or https://
    for (const link of validLinks) {
      if (!isValidHttpUrl(link)) {
        toast.error(`Invalid URL: "${link}". URLs must start with http:// or https://`);
        return;
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("isActive", String(form.isActive));
      formData.append("sortOrder", String(Number(form.sortOrder) || 0));

      // Append links as JSON array string
      formData.append("links", JSON.stringify(validLinks));

      // Logo is required on create, optional on update
      if (form.logo) {
        formData.append("logo", form.logo);
      }

      if (isEdit) {
        await updateNews(id, formData);
        toast.success("News item updated successfully");
      } else {
        await createNews(formData);
        toast.success("News item created successfully");
      }

      navigate(ap("news"));
    } catch (err) {
      console.error("[NewsForm] submit error:", err);
      const msg = err?.message || err?.response?.data?.message || "Failed to save news item";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2 text-stone-500">
          <Loader2 className="animate-spin text-brand-600" size={28} />
          <span className="text-xs">Loading news details…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger-bg p-6 text-center shadow-sm">
        <AlertCircle size={32} className="mx-auto text-danger mb-2" />
        <h2 className="text-sm font-bold text-stone-900">{loadError}</h2>
        <button
          type="button"
          onClick={() => navigate(ap("news"))}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <ArrowLeft size={14} /> Back to News List
        </button>
      </div>
    );
  }

  const validPreviewLinks = form.links.map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Top Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ap("news"))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-stone-600 transition hover:bg-canvas-muted hover:text-stone-900"
            title="Back to News List"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-stone-900">
              {isEdit ? "Edit Press & News Item" : "Create Press & News Item"}
            </h1>
            <p className="text-[10px] text-stone-500">
              {isEdit ? `Updating ID: ${id}` : "Publish media coverage, newspaper clippings, or press mentions"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("news"))}
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-600 hover:bg-canvas-muted transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            <span>{isEdit ? "Save Changes" : "Create News Item"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-7 space-y-4">
          {/* General Information */}
          <FormSection
            title="Press Information"
            hint="Brand/publication name and display order"
            icon={Layers}
          >
            <Field
              label="Publication / Media Name"
              required
              hint={`${form.name.length} chars`}
            >
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="e.g. Khush Summer, Vogue India, Elle Magazine…"
                className={fieldClass}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Field label="Sort Order" hint="Lower appears first (0, 1, 2…)">
                <input
                  type="number"
                  name="sortOrder"
                  value={form.sortOrder}
                  onChange={handleInputChange}
                  min={0}
                  className={fieldClass}
                />
              </Field>

              <Field label="Visibility Status" hint="Active items appear on storefront">
                <label className="flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-semibold text-stone-800">
                    {form.isActive ? (
                      <span className="text-success inline-flex items-center gap-1">
                        <CheckCircle2 size={13} /> Active (Visible)
                      </span>
                    ) : (
                      <span className="text-stone-400">Inactive (Hidden)</span>
                    )}
                  </span>
                </label>
              </Field>
            </div>
          </FormSection>

          {/* Logo Upload */}
          <FormSection
            title="Press Logo / Media Image"
            hint={isEdit ? "Upload a new logo to replace the current one" : "Upload high-res media/publication logo"}
            icon={ImageIcon}
          >
            <Field label="Media Logo File" required={!isEdit}>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                  dragActive
                    ? "border-brand-500 bg-brand-50/50"
                    : "border-border hover:border-brand-300 bg-stone-50/60"
                }`}
              >
                {form.logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-28 w-44 overflow-hidden rounded-lg border border-border bg-white p-2 shadow-xs">
                      <img
                        src={form.logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer rounded-lg bg-white border border-border px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-50 shadow-xs">
                        Change File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {form.logo && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              logo: null,
                              logoPreview: isEdit ? prev.logoPreview : null,
                            }))
                          }
                          className="rounded-lg border border-danger/30 text-danger px-2.5 py-1 text-[11px] font-medium hover:bg-danger-bg"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <UploadCloud size={20} />
                    </div>
                    <div className="text-xs font-semibold text-stone-800">
                      Click to upload or drag and drop
                    </div>
                    <p className="text-[10px] text-stone-400">
                      PNG, JPG, WEBP, or SVG (Recommended: Transparent background)
                    </p>
                    <label className="mt-1 cursor-pointer rounded-full bg-brand-600 px-3.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 transition">
                      Browse Files
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </Field>
          </FormSection>

          {/* Links Section */}
          <FormSection
            title="Press & Media Links"
            hint="Add 1 to 20 external URLs (must start with http:// or https://)"
            icon={Link2}
          >
            <div className="space-y-2.5">
              {form.links.map((link, idx) => {
                const isValid = !link.trim() || isValidHttpUrl(link);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
                        {idx + 1}
                      </span>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        placeholder="https://instagram.com/khush or https://youtube.com/@khush"
                        className={`${fieldClass} ${!isValid ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
                      />
                      {link.trim() && isValidHttpUrl(link) && (
                        <a
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-stone-500 hover:text-brand-600 hover:border-brand-300 transition"
                          title="Open URL in new tab"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        disabled={form.links.length === 1 && !form.links[0]}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-stone-400 hover:text-danger hover:border-danger/30 transition disabled:opacity-30"
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {!isValid && (
                      <p className="text-[10px] text-danger pl-8">
                        URL must start with http:// or https://
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={form.links.length >= 20}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 transition disabled:opacity-40"
                >
                  <Plus size={13} />
                  <span>Add Another Link ({form.links.length}/20)</span>
                </button>
                <span className="text-[10px] text-stone-400">
                  {validPreviewLinks.length} valid link(s)
                </span>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Right Column: Live Real-Time Card Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-700">
                <Sparkles size={16} />
                <span className="text-xs font-bold">Storefront Live Preview</span>
              </div>
              <span className="text-[10px] font-medium text-brand-600 uppercase tracking-wider">
                Real-time
              </span>
            </div>

            {/* Simulated Live Card */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Customer View
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    form.isActive
                      ? "bg-success-bg text-success"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {form.isActive ? "Visible" : "Hidden"}
                </span>
              </div>

              {/* Logo Area */}
              <div className="relative mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-stone-50 p-3 border border-stone-100">
                {form.logoPreview ? (
                  <img
                    src={form.logoPreview}
                    alt={form.name || "Preview"}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-stone-400 gap-1 text-center p-2">
                    <ImageIcon size={28} className="opacity-40" />
                    <span className="text-[11px] font-medium">Logo will appear here</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-stone-900 mb-2 truncate">
                {form.name.trim() || "Publication Name"}
              </h3>

              {/* Links preview */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                {validPreviewLinks.length > 0 ? (
                  validPreviewLinks.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-stone-700 bg-stone-50 border border-stone-200/70"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link2 size={12} className="text-brand-600 shrink-0" />
                        <span className="truncate">{url}</span>
                      </div>
                      <ExternalLink size={11} className="text-stone-400 shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-[10px] text-stone-400 italic">
                    Add at least 1 link above to preview links row
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-border bg-stone-50 p-3 text-[10px] text-stone-500 space-y-1.5">
              <p className="font-bold text-stone-700">📌 Integration Tips:</p>
              <p>• Logos with transparent PNG backgrounds look best on both dark and light modes.</p>
              <p>• Links can point to Instagram posts, YouTube interviews, press releases, or magazine articles.</p>
              <p>• Sort order 0 will place the item at the top of the list.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
