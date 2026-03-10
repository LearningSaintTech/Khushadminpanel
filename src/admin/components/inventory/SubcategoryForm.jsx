// SubcategoryForm.jsx - Reusable form component for Create/Edit Subcategory
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import {
  createSubcategory,
  updateSubcategory,
  getSubcategoriesByCategory,
} from "../../apis/subcategoryapis";

const SubcategoryForm = () => {
  const { categoryId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: "1",
    image: null,
    imagePreview: null,
    isActive: true,
    showInNavbar: false,
  });

  // Load subcategory data if editing
  useEffect(() => {
    if (isEdit && id) {
      const loadSubcategory = async () => {
        try {
          setLoading(true);
          const res = await getSubcategoriesByCategory(categoryId, 1, 100);
          const data = res.data?.data || res.data || {};
          const subs = data.subcategories || data.subCategories || data || [];
          const subcategory = subs.find((s) => s._id === id);

          if (subcategory) {
            setForm({
              name: subcategory.name || "",
              description: subcategory.description || "",
              sortOrder: String(subcategory.sortOrder ?? 1),
              image: null,
              imagePreview: subcategory.imageUrl || null,
              isActive: subcategory.isActive !== false,
              showInNavbar: subcategory.showInNavbar || subcategory.isNavbar || false,
            });
          }
        } catch (err) {
          console.error("Error loading subcategory:", err);
        } finally {
          setLoading(false);
        }
      };
      loadSubcategory();
    }
  }, [id, categoryId, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === "image") {
      const file = files?.[0] || null;
      setForm({
        ...form,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : form.imagePreview,
      });
    } else if (type === "checkbox") {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Subcategory name is required");
      return;
    }
    if (!isEdit && !form.image) {
      alert("Image is required when creating a subcategory");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", form.isActive);
      formData.append("isNavbar", form.showInNavbar);
      if (form.image) formData.append("image", form.image);
      if (!isEdit) formData.append("sortOrder", form.sortOrder || "1");

      if (isEdit) {
        await updateSubcategory(id, formData);
      } else {
        await createSubcategory(categoryId, formData);
      }
      navigate(`/admin/inventory/subcategories/${categoryId}`);
    } catch (err) {
      console.error("Error saving subcategory:", err);
      alert(err?.response?.data?.message || "Failed to save subcategory");
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
            onClick={() => navigate(`/admin/inventory/subcategories/${categoryId}`)}
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
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
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

            {/* Sort Order */}
            {!isEdit && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={form.sortOrder}
                  onChange={handleChange}
                  placeholder="1"
                  min="0"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Subcategory Image {isEdit && <span className="text-gray-400 font-normal">(optional)</span>}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              
              {form.imagePreview && (
                <div className="mb-3">
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
                  required={!isEdit}
                  className="hidden"
                />
              </label>
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
                onClick={() => navigate(`/admin/inventory/subcategories/${categoryId}`)}
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
