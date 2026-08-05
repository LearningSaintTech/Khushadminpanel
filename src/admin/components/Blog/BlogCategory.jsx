import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, X, Save } from "lucide-react";
import {
  createBlogCategory,
  deleteBlogCategory,
  getAllBlogCategories,
  toggleBlogCategoryStatus,
  updateBlogCategory,
} from "../../apis/BlogCategoryApi";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";
const inputToolbar =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  order: 1,
  isActive: true,
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

export default function BlogCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllBlogCategories(1, 100, "", statusFilter);
      const payload = response?.data?.data || response?.data || {};
      const list = payload.categories || [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("FETCH BLOG CATEGORIES ERROR:", error);
      toast.error("Failed to load blog categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [statusFilter]);

  const nextOrder = useMemo(() => {
    if (!categories.length) return 1;
    return Math.max(...categories.map((item) => Number(item.order) || 0)) + 1;
  }, [categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "order"
            ? Number(value) || 0
            : value,
    }));
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ ...emptyForm, order: nextOrder });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingCategory) {
        await updateBlogCategory(editingCategory.id, formData);
        toast.success("Category updated");
      } else {
        await createBlogCategory(formData);
        toast.success("Category created");
      }
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("SUBMIT CATEGORY ERROR:", error);
      toast.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      order: category.order || 1,
      isActive: category.isActive ?? true,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteBlogCategory(id);
      toast.success("Category deleted");
      if (editingCategory?.id === id) resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete category");
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      await toggleBlogCategoryStatus(category.id, !category.isActive);
      toast.success(category.isActive ? "Category deactivated" : "Category activated");
      fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update category status");
    }
  };

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Blog Categories
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputToolbar}
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          type="button"
          onClick={fetchCategories}
          className={inputToolbar}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full text-left text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted/80 backdrop-blur">
              <tr>
                <th className="px-3 py-2 font-semibold text-stone-600">Order</th>
                <th className="px-3 py-2 font-semibold text-stone-600">Name</th>
                <th className="px-3 py-2 font-semibold text-stone-600">Slug</th>
                <th className="px-3 py-2 font-semibold text-stone-600">Status</th>
                <th className="px-3 py-2 font-semibold text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                    Loading...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-b border-border/70 hover:bg-canvas-muted/30">
                    <td className="px-3 py-2">{category.order}</td>
                    <td className="px-3 py-2 font-semibold">{category.name}</td>
                    <td className="px-3 py-2 text-stone-500">/{category.slug}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          category.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(category)}
                          className="rounded-md border border-border px-2 py-1 text-[10px]"
                        >
                          {category.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category.id)}
                          className="rounded-md border border-border p-1.5 text-danger hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormSection
            title={editingCategory ? "Edit category" : "Create category"}
            hint="Blog posts must be attached to an active category."
          >
            <Field label="Name" required>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Slug">
              <input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className={fieldClass}
                placeholder="Auto-generated if blank"
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className={fieldClass}
              />
            </Field>
            <Field label="Order" required>
              <input
                type="number"
                min={1}
                name="order"
                value={formData.order}
                onChange={handleChange}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Active">
              <label className="inline-flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                Available for new blog posts
              </label>
            </Field>
            <div className="flex gap-2 pt-1">
              {editingCategory ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold"
                >
                  <X size={14} />
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingCategory ? "Save category" : "Add category"}
              </button>
            </div>
          </FormSection>
        </form>
      </div>
    </div>
  );
}
