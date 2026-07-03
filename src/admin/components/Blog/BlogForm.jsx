import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createBlogPost,
  getBlogPostById,
  updateBlogPost,
} from "../../apis/BlogApi";
import { getAllBlogCategories } from "../../apis/BlogCategoryApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted disabled:text-stone-500";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function createSection(overrides = {}) {
  return {
    key: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subheading: "",
    paragraphs: "",
    inlineImageAlt: "",
    quote: "",
    imageFile: null,
    imagePreview: null,
    existingInlineImage: "",
    existingInlineImageKey: "",
    ...overrides,
  };
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  categoryId: "",
  author: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  readTimeMinutes: 5,
  isPublished: false,
  isFeatured: false,
  heroImageAlt: "",
  bodyIntro: "",
  heroFile: null,
  heroPreview: null,
};

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

function ImageUploadField({ label, required, preview, onChange, hint }) {
  return (
    <Field label={label} required={required}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-canvas-muted/40 px-3 py-2 text-[11px] font-medium text-stone-700 hover:bg-white">
          <ImageIcon size={14} />
          Choose image
          <input type="file" accept="image/*" className="hidden" onChange={onChange} />
        </label>
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-28 w-full max-w-[220px] rounded-lg border border-border object-cover"
          />
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-[10px] text-stone-500">{hint}</p> : null}
    </Field>
  );
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function paragraphsToText(paragraphs) {
  return Array.isArray(paragraphs) ? paragraphs.join("\n\n") : "";
}

export default function BlogForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const [form, setForm] = useState(emptyForm);
  const [sections, setSections] = useState([createSection()]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getAllBlogCategories(1, 100, "", "true");
        const payload = response?.data?.data || response?.data || {};
        const list = payload.categories || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Error loading blog categories:", error);
        toast.error("Failed to load blog categories");
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    const loadPost = async () => {
      setLoadingPost(true);
      setLoadError("");
      try {
        const response = await getBlogPostById(id);
        const post = response?.data?.data || response?.data || response;
        if (!post?.id) {
          setLoadError("Blog post not found.");
          return;
        }

        const apiSections =
          post.body?.sections?.length > 0
            ? post.body.sections
            : [
                {
                  subheading: post.body?.subheading || "",
                  paragraphs: post.body?.paragraphs || [],
                  inlineImage: post.body?.inlineImage || "",
                  inlineImageAlt: post.body?.inlineImageAlt || "",
                  quote: post.body?.quote || "",
                },
              ];

        setForm({
          title: post.title || "",
          slug: post.slug || "",
          excerpt: post.excerpt || "",
          categoryId: post.categoryId || "",
          author: post.author || "",
          publishedAt: toDateInputValue(post.publishedAt),
          readTimeMinutes: Number(String(post.readTime || "5").replace(/\D/g, "")) || 5,
          isPublished: Boolean(post.isPublished),
          isFeatured: Boolean(post.isFeatured),
          heroImageAlt: post.imageAlt || "",
          bodyIntro: post.body?.intro || "",
          heroFile: null,
          heroPreview: post.image || null,
        });

        setSections(
          apiSections.map((section) =>
            createSection({
              subheading: section.subheading || "",
              paragraphs: paragraphsToText(section.paragraphs),
              inlineImageAlt: section.inlineImageAlt || "",
              quote: section.quote || "",
              imagePreview: section.inlineImage || null,
              existingInlineImage: section.inlineImage || "",
            }),
          ),
        );
      } catch (error) {
        console.error("Error loading blog post:", error);
        setLoadError(error?.response?.data?.message || "Failed to load blog post.");
      } finally {
        setLoadingPost(false);
      }
    };

    loadPost();
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "readTimeMinutes"
            ? Number(value) || 0
            : value,
    }));
  };

  const handleHeroImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      heroFile: file,
      heroPreview: URL.createObjectURL(file),
    }));
  };

  const updateSection = (key, patch) => {
    setSections((prev) => prev.map((section) => (section.key === key ? { ...section, ...patch } : section)));
  };

  const handleSectionImageChange = (key) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    updateSection(key, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    });
  };

  const addSection = () => {
    setSections((prev) => [...prev, createSection()]);
  };

  const removeSection = (key) => {
    setSections((prev) => {
      if (prev.length <= 1) {
        toast.error("At least one body section is required.");
        return prev;
      }
      return prev.filter((section) => section.key !== key);
    });
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("excerpt", form.excerpt.trim());
    formData.append("categoryId", form.categoryId);
    formData.append("author", form.author.trim());
    formData.append("readTimeMinutes", String(form.readTimeMinutes || 5));
    formData.append("isPublished", String(form.isPublished));
    formData.append("isFeatured", String(form.isFeatured));
    formData.append("heroImageAlt", form.heroImageAlt.trim());
    formData.append("bodyIntro", form.bodyIntro.trim());

    const sectionPayload = sections.map((section) => ({
      subheading: section.subheading.trim(),
      paragraphs: section.paragraphs
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      inlineImageAlt: section.inlineImageAlt.trim(),
      quote: section.quote.trim(),
      existingInlineImage: section.existingInlineImage || "",
      existingInlineImageKey: section.existingInlineImageKey || "",
    }));

    formData.append("bodySections", JSON.stringify(sectionPayload));

    sections.forEach((section, index) => {
      if (section.imageFile) {
        formData.append(`sectionImage_${index}`, section.imageFile);
      }
    });

    if (form.slug.trim()) formData.append("slug", form.slug.trim());
    if (form.publishedAt) formData.append("publishedAt", form.publishedAt);
    if (form.heroFile) formData.append("heroImage", form.heroFile);

    return formData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.categoryId) {
      toast.error("Please select a category.");
      return;
    }

    if (!isEdit && !form.heroFile) {
      toast.error("Hero image is required.");
      return;
    }

    if (!form.bodyIntro.trim()) {
      toast.error("Intro paragraph is required.");
      return;
    }

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const label = `Section ${index + 1}`;
      if (!section.subheading.trim()) {
        toast.error(`${label}: subheading is required.`);
        return;
      }
      if (!section.paragraphs.trim()) {
        toast.error(`${label}: add at least one paragraph.`);
        return;
      }
      if (!isEdit && !section.imageFile) {
        toast.error(`${label}: inline image is required.`);
        return;
      }
      if (isEdit && !section.imageFile && !section.existingInlineImage) {
        toast.error(`${label}: inline image is required.`);
        return;
      }
    }

    try {
      setLoading(true);
      const formData = buildFormData();
      if (isEdit) {
        await updateBlogPost(id, formData);
        toast.success("Blog post updated");
      } else {
        await createBlogPost(formData);
        toast.success("Blog post created");
      }
      navigate(ap("blog"));
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to save blog post.");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingPost || Boolean(loadError);

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("blog"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <h1 className="truncate text-base font-bold sm:text-lg">
            {isEdit ? "Edit blog post" : "Create blog post"}
          </h1>
        </div>
      </div>

      {loadingPost ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-6 text-[11px] text-stone-500">
          <Loader2 size={16} className="animate-spin" />
          Loading post...
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 p-4 text-[11px] text-danger">
          {loadError}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormSection
            title="Article hero"
            hint="Matches the top hero section on the blog details page."
          >
            <Field label="Title" required>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className={fieldClass}
                disabled={formDisabled}
                required
              />
            </Field>
            <Field label="URL slug">
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                className={fieldClass}
                disabled={formDisabled}
                placeholder="Auto-generated from title if left blank"
              />
            </Field>
            <Field label="Excerpt" required>
              <textarea
                name="excerpt"
                value={form.excerpt}
                onChange={handleChange}
                rows={3}
                className={fieldClass}
                disabled={formDisabled}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Category" required>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className={fieldClass}
                  disabled={formDisabled}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Author" required>
                <input
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  className={fieldClass}
                  disabled={formDisabled}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Publish date" required>
                <input
                  type="date"
                  name="publishedAt"
                  value={form.publishedAt}
                  onChange={handleChange}
                  className={fieldClass}
                  disabled={formDisabled}
                  required={!isEdit}
                />
              </Field>
              <Field label="Read time (minutes)" required>
                <input
                  type="number"
                  min={1}
                  max={120}
                  name="readTimeMinutes"
                  value={form.readTimeMinutes}
                  onChange={handleChange}
                  className={fieldClass}
                  disabled={formDisabled}
                  required
                />
              </Field>
              <Field label="Published">
                <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-stone-700">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={handleChange}
                    disabled={formDisabled}
                  />
                  Live on website
                </label>
              </Field>
              <Field label="Featured">
                <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-stone-700">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={form.isFeatured}
                    onChange={handleChange}
                    disabled={formDisabled}
                  />
                  Show as featured
                </label>
              </Field>
            </div>
            <ImageUploadField
              label="Hero image"
              required={!isEdit}
              preview={form.heroPreview}
              onChange={handleHeroImageChange}
              hint="Full-width cover image behind the article title."
            />
            <Field label="Hero image alt text">
              <input
                name="heroImageAlt"
                value={form.heroImageAlt}
                onChange={handleChange}
                className={fieldClass}
                disabled={formDisabled}
              />
            </Field>
          </FormSection>

          <FormSection
            title="Article intro"
            hint="Opening paragraph shown before all body sections."
          >
            <Field label="Intro paragraph" required>
              <textarea
                name="bodyIntro"
                value={form.bodyIntro}
                onChange={handleChange}
                rows={4}
                className={fieldClass}
                disabled={formDisabled}
                required
              />
            </Field>
          </FormSection>

          <div className="space-y-3">
            {sections.map((section, index) => (
              <FormSection
                key={section.key}
                title={`Body section ${index + 1}`}
                hint="Each section has its own subheading, image, paragraphs, and optional quote."
              >
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSection(section.key)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-danger hover:bg-red-50"
                    disabled={sections.length <= 1 || formDisabled}
                  >
                    <Trash2 size={12} />
                    Remove section
                  </button>
                </div>
                <Field label="Subheading" required>
                  <input
                    value={section.subheading}
                    onChange={(e) => updateSection(section.key, { subheading: e.target.value })}
                    className={fieldClass}
                    disabled={formDisabled}
                    required
                  />
                </Field>
                <ImageUploadField
                  label="Inline image"
                  required={!isEdit || !section.existingInlineImage}
                  preview={section.imagePreview}
                  onChange={handleSectionImageChange(section.key)}
                  hint="Image for this section."
                />
                <Field label="Inline image alt text">
                  <input
                    value={section.inlineImageAlt}
                    onChange={(e) => updateSection(section.key, { inlineImageAlt: e.target.value })}
                    className={fieldClass}
                    disabled={formDisabled}
                  />
                </Field>
                <Field label="Paragraphs" required>
                  <textarea
                    value={section.paragraphs}
                    onChange={(e) => updateSection(section.key, { paragraphs: e.target.value })}
                    rows={8}
                    className={fieldClass}
                    disabled={formDisabled}
                    placeholder="Separate paragraphs with a blank line"
                    required
                  />
                </Field>
                <Field label="Pull quote (optional)">
                  <textarea
                    value={section.quote}
                    onChange={(e) => updateSection(section.key, { quote: e.target.value })}
                    rows={2}
                    className={fieldClass}
                    disabled={formDisabled}
                    placeholder="Optional quote after this section"
                  />
                </Field>
              </FormSection>
            ))}

            <button
              type="button"
              onClick={addSection}
              disabled={formDisabled}
              className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-white py-2.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              <Plus size={14} />
              Add another body section
            </button>
          </div>

          <div className="sticky bottom-2 z-10 flex justify-end gap-2 rounded-xl border border-border bg-white/95 p-2 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => navigate(ap("blog"))}
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-stone-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formDisabled}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create post"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
