// Edit subcategory from "Show all subcategories" page (subcategoriess).
// Route: /admin/inventory/subcategories/edit/:id
// Back / success → /admin/subcategoriess
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import {
  updateSubcategory,
  getSubcategoriesByCategory,
  getAllSubcategories,
} from "../../apis/subcategoryapis";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

const BACK_URL = "/admin/subcategoriess";

function getCategoryIdFromSubcategory(sub) {
  if (!sub) return null;
  const c = sub.categoryId ?? sub.parentCategory ?? sub.category;
  if (c == null) return null;
  if (typeof c === "string") return c;
  const id = c._id ?? c.id;
  return id != null ? String(id) : null;
}

export default function SubcategoryEditStandalone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryIdFromState = location.state?.categoryId;
  const subcategoryFromState = location.state?.subcategory;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [backendErrors, setBackendErrors] = useState([]);
  const [clientErrors, setClientErrors] = useState({ name: "" });
  const [editSortOrder, setEditSortOrder] = useState(false);
  const [originalSortOrder, setOriginalSortOrder] = useState("");
  const [categoryIdForSort, setCategoryIdForSort] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: "1",
    image: null,
    imagePreview: null,
    isActive: true,
    showInNavbar: false,
  });

  function normalizeSubList(res) {
    const raw = res?.data;
    if (Array.isArray(raw)) return raw;
    const data = raw?.data || raw || {};
    const subs = data.subcategories || data.subCategories || data;
    return Array.isArray(subs) ? subs : [];
  }

  const suggestNextSortOrder = useCallback(async () => {
    if (!categoryIdForSort) return null;
    try {
      const res = await getSubcategoriesByCategory(categoryIdForSort, 1, 500);
      const list = normalizeSubList(res);
      const max = list.reduce((m, s) => {
        const n = Number(s?.sortOrder);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      const next = String(max + 1);
      setForm((prev) => ({ ...prev, sortOrder: next }));
      return next;
    } catch (e) {
      console.error("Failed to suggest sort order:", e);
      return null;
    }
  }, [categoryIdForSort]);

  function applySubcategoryToForm(subcategory) {
    const catId = getCategoryIdFromSubcategory(subcategory);
    setCategoryIdForSort(catId);
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
      showInNavbar: subcategory.showInNavbar ?? subcategory.isNavbar ?? false,
    });
  }

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    // If we have the subcategory from the list (clicking Edit from row), use it immediately.
    if (subcategoryFromState && String(subcategoryFromState._id) === String(id)) {
      applySubcategoryToForm(subcategoryFromState);
      setNotFound(false);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        let subcategory = null;
        let categoryId = categoryIdFromState;

        if (categoryId) {
          const res = await getSubcategoriesByCategory(categoryId, 1, 100);
          const list = normalizeSubList(res);
          subcategory = list.find((s) => String(s._id) === String(id)) || null;
        }
        if (!subcategory) {
          const res = await getAllSubcategories(1, 500);
          const list = normalizeSubList(res);
          subcategory = list.find((s) => String(s._id) === String(id)) || null;
        }
        if (subcategory) {
          applySubcategoryToForm(subcategory);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error loading subcategory", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, categoryIdFromState, subcategoryFromState]);

  const handleChange = (e) => {
    setBackendErrors([]);
    const { name, value, type, checked, files } = e.target;
    if (name === "image") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : prev.imagePreview,
      }));
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
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendErrors([]);
    if (!form.name?.trim()) {
      setClientErrors({ name: "Subcategory name is required" });
      return;
    }
    setClientErrors({ name: "" });
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", form.isActive);
      formData.append("isNavbar", form.showInNavbar);
      if (form.image) formData.append("image", form.image);
      if (editSortOrder) {
        formData.append(
          "sortOrder",
          form.sortOrder?.trim() || originalSortOrder || "1"
        );
      }
      await updateSubcategory(id, formData);
      navigate(BACK_URL);
    } catch (err) {
      console.error("Error saving", err);
      const msgs = extractBackendMessages(err);
      setBackendErrors(msgs);
      const blob = msgs.join(" ").toLowerCase();
      if (
        editSortOrder &&
        /sort|order|already|exist|duplicate|unique|taken/.test(blob)
      ) {
        await suggestNextSortOrder();
      }
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(BACK_URL);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-gray-700 font-medium">Subcategory not found</p>
        <button
          onClick={goBack}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Back to Subcategories
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Subcategories</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Subcategory</h1>
            <p className="mt-1 text-sm text-gray-500">Update subcategory (from all subcategories)</p>
          </div>
        </div>

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
                className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                  clientErrors.name ? "border-red-400" : "border-gray-300"
                }`}
              />
              {clientErrors.name && (
                <p className="mt-1 text-sm text-red-600">{clientErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter description"
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

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
                    {!categoryIdForSort && (
                      <span className="block mt-1 text-amber-700">
                        Category id not available — you can still type a sort order, but &quot;Use next
                        available&quot; is disabled.
                      </span>
                    )}
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
                      disabled={!categoryIdForSort}
                      onClick={() => suggestNextSortOrder()}
                      className="shrink-0 px-4 py-2 text-sm font-medium text-gray-800 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Use next available
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Image <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {form.imagePreview && (
                <div className="mb-3 relative inline-block">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, image: null, imagePreview: null }))}
                    className="absolute -top-1 -right-1 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                  <img
                    src={form.imagePreview}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors group">
                <ImageIcon size={24} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  {form.imagePreview ? "Change Image" : "Choose Image"}
                </span>
                <input
                  type="file"
                  name="image"
                  onChange={handleChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="showInNavbar"
                  checked={form.showInNavbar}
                  onChange={handleChange}
                  disabled={!form.isActive}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Show in Navbar</span>
              </label>
            </div>
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={goBack}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update Subcategory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
