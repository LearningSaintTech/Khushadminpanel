// Edit subcategory from "Show all subcategories" page (subcategoriess).
// Route: /admin/inventory/subcategories/edit/:id
// Back / success → /admin/subcategoriess
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import {
  updateSubcategory,
  getSubcategoriesByCategory,
  getAllSubcategories,
} from "../../apis/subcategoryapis";

const BACK_URL = "/admin/subcategoriess";

export default function SubcategoryEditStandalone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryIdFromState = location.state?.categoryId;
  const subcategoryFromState = location.state?.subcategory;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
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

  function applySubcategoryToForm(subcategory) {
    setForm({
      name: subcategory.name || "",
      description: subcategory.description || "",
      sortOrder: String(subcategory.sortOrder ?? 1),
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
    const { name, value, type, checked, files } = e.target;
    if (name === "image") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : prev.imagePreview,
      }));
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      alert("Subcategory name is required");
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", form.isActive);
      formData.append("isNavbar", form.showInNavbar);
      if (form.image) formData.append("image", form.image);
      await updateSubcategory(id, formData);
      navigate(BACK_URL);
    } catch (err) {
      console.error("Error saving", err);
      alert(err?.response?.data?.message || "Failed to save subcategory");
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
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
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
