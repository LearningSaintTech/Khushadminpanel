// SubcategoryForm.jsx - Reusable form component for Create/Edit Subcategory
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import {
  createSubcategory,
  updateSubcategory,
  getSubcategoriesByCategory,
} from "../../apis/subcategoryapis";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

function normalizeSubcategoryList(res) {
  const data = res?.data?.data || res?.data || res || {};
  const subs =
    data.subcategories ||
    data.subCategories ||
    (Array.isArray(data) ? data : []);
  return Array.isArray(subs) ? subs : [];
}

// Used for: create (/:categoryId/create) and category-scoped edit (/:categoryId/edit/:id).
// Back / success → /admin/inventory/subcategories/:categoryId
const SubcategoryForm = () => {
  const { categoryId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const backUrl = categoryId ? `/admin/inventory/subcategories/${categoryId}` : "/admin/inventory/categories";

  const [loading, setLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState([]);
  const [clientErrors, setClientErrors] = useState({ name: "", image: "" });
  /** Edit only: when true, user can change sort order and it is sent on update */
  const [editSortOrder, setEditSortOrder] = useState(false);
  const [originalSortOrder, setOriginalSortOrder] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: "",
    image: null,
    imagePreview: null,
    isActive: true,
    showInNavbar: false,
  });

  const computeNextSortOrderValue = useCallback(async () => {
    if (!categoryId || isEdit) return null;
    try {
      const res = await getSubcategoriesByCategory(categoryId, 1, 500);
      const list = normalizeSubcategoryList(res);
      const max = list.reduce((m, s) => {
        const n = Number(s?.sortOrder);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      return String(max + 1);
    } catch (e) {
      console.error("Failed to compute sort order:", e);
      return null;
    }
  }, [categoryId]);

  const suggestNextSortOrder = useCallback(async () => {
    const next = await computeNextSortOrderValue();
    if (next == null) return null;
    setForm((prev) => ({ ...prev, sortOrder: next }));
    return next;
  }, [computeNextSortOrderValue]);

  // Create: auto-fill next sort order from existing subcategories in this category
  useEffect(() => {
    if (isEdit || !categoryId) return;
    let cancelled = false;
    (async () => {
      const next = await computeNextSortOrderValue();
      if (cancelled || next == null) return;
      setForm((prev) => ({ ...prev, sortOrder: next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, isEdit, computeNextSortOrderValue]);

  // Load subcategory data if editing
  useEffect(() => {
    if (isEdit && id) {
      const loadSubcategory = async () => {
        try {
          setLoading(true);
          const res = await getSubcategoriesByCategory(categoryId, 1, 100);
          const subs = normalizeSubcategoryList(res);
          const subcategory = subs.find((s) => s._id === id);

          if (subcategory) {
            const so = String(subcategory.sortOrder ?? 1);
            setOriginalSortOrder(so);
            setEditSortOrder(false);
            setForm({
              name: subcategory.name || "",
              description: subcategory.description || "",
              sortOrder: so,
              image: null,
              imagePreview: subcategory.imageUrl || null,
              isActive: subcategory.isActive !== false,
              showInNavbar:
                subcategory.showInNavbar || subcategory.isNavbar || false,
            });
          } else {
            console.error("Subcategory not found for id:", id);
            alert(
              "Subcategory not found. It may have been deleted or moved. Returning to list."
            );
            navigate(backUrl);
          }
        } catch (err) {
          console.error("Error loading subcategory:", err);
          alert(
            err?.response?.data?.message ||
              "Failed to load subcategory details. Returning to list."
          );
          navigate(-1);
        } finally {
          setLoading(false);
        }
      };
      loadSubcategory();
    }
  }, [id, categoryId, isEdit, navigate]);

  const handleChange = (e) => {
    setBackendErrors([]);
    const { name, value, type, checked, files } = e.target;
    if (name === "image") {
      const file = files?.[0] || null;
      setForm({
        ...form,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : form.imagePreview,
      });
      setClientErrors((prev) => ({ ...prev, image: "" }));
    } else if (type === "checkbox") {
      if (name === "editSortOrder") {
        setEditSortOrder(checked);
        if (!checked) {
          setForm((prev) => ({
            ...prev,
            sortOrder: originalSortOrder || prev.sortOrder,
          }));
        }
        return;
      }
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
      if (name === "name") setClientErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendErrors([]);
    const nextClient = { name: "", image: "" };
    if (!form.name.trim()) nextClient.name = "Subcategory name is required";
    if (!isEdit && !form.image) nextClient.image = "Image is required when creating a subcategory";
    if (nextClient.name || nextClient.image) {
      setClientErrors(nextClient);
      return;
    }
    setClientErrors({ name: "", image: "" });

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", form.isActive);
      formData.append("isNavbar", form.showInNavbar);
      if (form.image) formData.append("image", form.image);
      if (!isEdit) {
        formData.append("sortOrder", form.sortOrder?.trim() || "1");
      } else if (editSortOrder) {
        formData.append(
          "sortOrder",
          form.sortOrder?.trim() || originalSortOrder || "1"
        );
      }

      if (isEdit) {
        await updateSubcategory(id, formData);
      } else {
        await createSubcategory(categoryId, formData);
      }
      navigate(backUrl);
    } catch (err) {
      console.error("Error saving subcategory:", err);
      const msgs = extractBackendMessages(err);
      setBackendErrors(msgs);
      const blob = msgs.join(" ").toLowerCase();
      if (
        /sort|order|already|exist|duplicate|unique|taken/.test(blob) &&
        (!isEdit || editSortOrder)
      ) {
        await suggestNextSortOrder();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Back Button and Title on Right */}
        <div className="flex items-center justify-between mb-8">
          <button
          onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Subcategory" : "Create Subcategory"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update subcategory information" : "Add a new subcategory"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {backendErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                <div className="font-semibold mb-2">Please review:</div>
                <ul className="list-disc list-inside space-y-1">
                  {backendErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Subcategory Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter subcategory name"
                className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all ${
                  clientErrors.name ? "border-red-400" : "border-gray-300"
                }`}
              />
              {clientErrors.name && (
                <p className="mt-1 text-sm text-red-600">{clientErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter subcategory description"
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Sort Order — create: always; edit: only when checkbox enabled */}
            {!isEdit && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Sort Order
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                  <input
                    type="number"
                    name="sortOrder"
                    value={form.sortOrder}
                    onChange={handleChange}
                    placeholder="Auto"
                    min="0"
                    className="flex-1 min-w-0 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => suggestNextSortOrder()}
                    className="shrink-0 px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Use next available
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Filled automatically from the highest sort order in this category + 1. Use the button if the server says this order is already taken.
                </p>
              </div>
            )}

            {isEdit && categoryId && (
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer group max-w-xl">
                  <input
                    type="checkbox"
                    name="editSortOrder"
                    checked={editSortOrder}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                      Edit sort order
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 font-normal">
                      Current order:{" "}
                      <span className="font-medium text-gray-700">
                        {originalSortOrder || form.sortOrder || "—"}
                      </span>
                      . Enable only if you want to change it on save.
                    </span>
                  </span>
                </label>
                {editSortOrder && (
                  <div className="pl-7 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      New sort order
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                      <input
                        type="number"
                        name="sortOrder"
                        value={form.sortOrder}
                        onChange={handleChange}
                        placeholder="Sort order"
                        min="0"
                        className="flex-1 min-w-0 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => suggestNextSortOrder()}
                        className="shrink-0 px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Use next available
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Subcategory Image {isEdit && <span className="text-gray-400 font-normal">(optional)</span>}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              
              {form.imagePreview && (
                <div className="mb-3 relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      setBackendErrors([]);
                      setClientErrors((prev) => ({ ...prev, image: "" }));
                      setForm((prev) => ({ ...prev, image: null, imagePreview: null }));
                    }}
                    className="absolute -top-1 -right-1 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                  <img
                    src={form.imagePreview}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                  />
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors group">
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400 group-hover:text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                    {form.imagePreview ? "Change Image" : "Choose Image"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</span>
                </div>
                <input
                  type="file"
                  name="image"
                  onChange={handleChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
              {clientErrors.image && (
                <p className="mt-2 text-sm text-red-600">{clientErrors.image}</p>
              )}
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Active</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name="showInNavbar"
                  checked={form.showInNavbar}
                  onChange={handleChange}
                  disabled={!form.isActive}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Show in Navbar</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(backUrl)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : isEdit ? "Update Subcategory" : "Create Subcategory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubcategoryForm;
