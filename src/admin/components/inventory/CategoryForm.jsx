// CategoryForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Image as ImageIcon, ZoomIn, X } from "lucide-react";
import {
  createCategory,
  updateCategory,
  getAllCategories,
} from "../../apis/categoryapi";

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: 1,
    image: null,
    imagePreview: null,
    isActive: true,
    isNavbar: false,
  });

  const [categories, setCategories] = useState([]);
  const [originalSortOrder, setOriginalSortOrder] = useState(null);
  const [allowEditSortOrder, setAllowEditSortOrder] = useState(false);
  const [sortError, setSortError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);

  // ================= LOAD DATA =================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const res = await getAllCategories(1, 500);
        const catArray =
          res?.data?.categories ||
          res?.data?.data?.categories ||
          res?.data?.data ||
          [];

        setCategories(catArray);

        if (isEdit) {
          const category = catArray.find((cat) => cat._id === id);

          if (category) {
            const loadedSort = Number(category.sortOrder ?? 1);

            setForm({
              name: category.name || "",
              description: category.description || "",
              sortOrder: loadedSort,
              image: null,
              imagePreview: category.imageUrl || null,
              isActive: category.isActive ?? true,
              isNavbar: category.isNavbar ?? false,
            });

            setOriginalSortOrder(loadedSort);
          }
        }
      } catch (err) {
        console.error("Error loading categories:", err);
        setSubmitError("Failed to load categories.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setSubmitError("");

    // Toggle edit sort order
    if (name === "allowEditSortOrder") {
      const allow = checked;
      setAllowEditSortOrder(allow);

      if (!allow && originalSortOrder !== null) {
        setForm((prev) => ({ ...prev, sortOrder: originalSortOrder }));
        setSortError("");
      }
      return;
    }

    // Checkbox fields
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    // Image upload
    if (name === "image") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : prev.imagePreview,
      }));
      return;
    }

    // Sort order must be number
    if (name === "sortOrder") {
      const numValue = value === "" ? "" : Number(value);
      setForm((prev) => ({ ...prev, sortOrder: numValue }));
      setSortError("");
      return;
    }

    // Other fields
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ================= VALIDATION =================
  const validateForm = () => {
    if (!form.name.trim()) {
      setSubmitError("Category name is required.");
      return false;
    }

    const sortValue = Number(form.sortOrder);

    if (isNaN(sortValue) || sortValue < 1) {
      setSubmitError("Sort order must be a positive number.");
      return false;
    }

    // Prevent accidental change when edit is disabled
    if (isEdit && !allowEditSortOrder && sortValue !== originalSortOrder) {
      setSubmitError("Enable 'Edit sort order' to change it.");
      return false;
    }

    // Frontend duplicate check (extra safety)
    const duplicate = categories.find((cat) => {
      if (isEdit && cat._id === id) return false;
      return Number(cat.sortOrder) === sortValue;
    });

    if (duplicate) {
      setSortError(`Sort order ${sortValue} already exists.`);
      return false;
    }

    setSortError("");
    setSubmitError("");
    return true;
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", form.isActive);
      formData.append("isNavbar", form.isNavbar);

      // Only include sortOrder when:
      // - Creating new category
      // - OR editing and user explicitly enabled sort order editing
      if (!isEdit || allowEditSortOrder) {
        formData.append("sortOrder", Number(form.sortOrder));
      }

      if (form.image) {
        formData.append("image", form.image);
      }

      if (isEdit) {
        await updateCategory(id, formData);
      } else {
        await createCategory(formData);
      }

      navigate("/admin/inventory/categories");
    } catch (err) {
      console.error("Error saving category:", err);
      const errorMsg =
        err?.response?.data?.message ||
        "Failed to save category.";
      setSubmitError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Back Button and Title on Right */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/inventory/categories")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Category" : "Create Category"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update category information" : "Add a new category"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter category name"
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
                placeholder="Enter category description"
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                name="sortOrder"
                value={form.sortOrder}
                onChange={handleChange}
                disabled={isEdit && !allowEditSortOrder}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
                min="1"
                step="1"
              />

              {isEdit && (
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowEditSortOrder"
                    checked={allowEditSortOrder}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                  />
                  Allow editing sort order
                </label>
              )}

              {sortError && <p className="text-red-500 text-xs mt-1.5">{sortError}</p>}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Category Image {isEdit && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              
              {form.imagePreview && (
                <div className="mb-3 relative inline-block">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => setZoomedImage({ url: form.imagePreview, name: form.name || "Category Image" })}
                  >
                    <img
                      src={form.imagePreview}
                      alt="Preview"
                      className="h-32 w-32 lg:h-40 lg:w-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all duration-200"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 lg:h-8 lg:w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Click image to zoom</p>
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
                  name="isNavbar"
                  checked={form.isNavbar}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Show in Navbar</span>
              </label>
            </div>

            {/* Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {submitError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/inventory/categories")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Close zoom"
          >
            <X size={28} />
          </button>

          {/* Zoomed Image Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '95vw', maxHeight: '90vh' }}
            />
          </div>

          {/* Image Name */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
            <p className="text-base font-medium">{zoomedImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryForm;