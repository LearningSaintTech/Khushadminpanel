// CategoryForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Image as ImageIcon, ZoomIn, X } from "lucide-react";
import {
  createCategory,
  updateCategory,
  getAllCategories,
} from "../../apis/categoryapi";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    iconFile: null,
    iconPreview: null,
    sortOrder: 1,
    image: null,
    imagePreview: null,
    isActive: true,
    isNavbar: false,
    isFooter: false,
  });

  const [categories, setCategories] = useState([]);
  const [originalSortOrder, setOriginalSortOrder] = useState(null);
  const [allowEditSortOrder, setAllowEditSortOrder] = useState(false);
  const [sortError, setSortError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [imageError, setImageError] = useState("");

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

            const iconFromApi =
              (typeof category.icon === "string" && category.icon.trim()) ||
              (category.icon &&
                typeof category.icon === "object" &&
                String(category.icon.url || "").trim()) ||
              (typeof category.iconUrl === "string" && category.iconUrl.trim()) ||
              "";

            setForm({
              name: category.name || "",
              description: category.description || "",
              iconFile: null,
              iconPreview: iconFromApi || null,
              sortOrder: loadedSort,
              image: null,
              imagePreview: category.imageUrl || null,
              isActive: category.isActive ?? true,
              isNavbar: category.isNavbar ?? false,
              isFooter: category.isFooter ?? false,
            });

            setOriginalSortOrder(loadedSort);
          }
        } else {
          // Create: auto-generate sort order as (max existing + 1) or 1
          const maxSort = catArray.length
            ? Math.max(0, ...catArray.map((c) => Number(c.sortOrder) || 0))
            : 0;
          const nextSort = maxSort + 1;
          setForm((prev) => ({ ...prev, sortOrder: nextSort }));
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

    // Icon file upload (multipart field name: icon)
    if (name === "iconUpload") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        iconFile: file,
        iconPreview: file ? URL.createObjectURL(file) : prev.iconPreview,
      }));
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

    // Create: category image is required (clear message instead of generic API failure)
    if (!isEdit && !form.image) {
      setSubmitError("Image not uploaded.");
      setImageError("Please upload a category image to continue.");
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

    // Frontend duplicate check
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
      formData.append("isFooter", form.isFooter);
      if (form.iconFile) {
        formData.append("icon", form.iconFile);
      }

      // Only include sortOrder when creating or when explicitly allowed during edit
      if (!isEdit || allowEditSortOrder) {
        formData.append("sortOrder", Number(form.sortOrder));
      }

      if (form.image) {
        formData.append("image", form.image);
      }

      if (isEdit) {
        await updateCategory(id, formData);
        setSuccessMessage("Category updated successfully!");
      } else {
        await createCategory(formData);
        setSuccessMessage("Category created successfully!");
      }

      setTimeout(() => {
        navigate("/admin/inventory/categories");
      }, 1200);
    } catch (err) {
      console.error("Error saving category:", err);

      const messages = extractBackendMessages(err);
      const blob = messages.join(" ").toLowerCase();

      if (
        blob.includes("image") ||
        blob.includes("file") ||
        blob.includes("upload") ||
        blob.includes("photo")
      ) {
        setImageError(
          messages.find((m) =>
            /image|file|upload|photo|required/i.test(m)
          ) || "Image could not be saved. Please upload a valid image."
        );
        setSubmitError("Image not uploaded or invalid.");
      } else {
        setImageError("");
        setSubmitError(
          messages.length ? messages.join(" ") : "Failed to save category."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <>
      {successMessage && (
        <div className="max-w-4xl mx-auto mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-xs">
            {successMessage}
          </div>
        </div>
      )}

      <div className="w-full text-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate("/admin/inventory/categories")}
              className="flex items-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
            <div className="text-right">
              <h1 className="text-lg sm:text-xl font-bold text-stone-900">
                {isEdit ? "Edit Category" : "Create Category"}
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                {isEdit ? "Update category information" : "Add a new category"}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter category name"
                  className="w-full px-3.5 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-transparent transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter category description"
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Icon file (navbar / UI — e.g. SVG, PNG) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Icon
                  <span className="text-stone-500 font-normal ml-1">(optional)</span>
                </label>
                <p className="mb-2 text-xs text-stone-500">
                  Upload a small icon file (SVG, PNG, etc.). Sent as the multipart field{" "}
                  <span className="font-mono text-stone-600">icon</span>.
                </p>

                {form.iconPreview && (
                  <div className="mb-3 relative inline-block">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((prev) => ({
                          ...prev,
                          iconFile: null,
                          iconPreview: null,
                        }));
                      }}
                      className="absolute -top-1 -right-1 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                      title="Remove icon"
                      aria-label="Remove icon"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                    <img
                      src={form.iconPreview}
                      alt="Icon preview"
                      className="h-20 w-20 object-contain rounded-lg border-2 border-border bg-canvas-muted p-1 shadow-sm"
                    />
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full max-w-md px-4 py-5 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-gray-400 hover:bg-brand-50/30 transition-colors group">
                  <div className="flex flex-col items-center justify-center">
                    <Upload
                      size={22}
                      className="text-stone-400 group-hover:text-stone-600 mb-2"
                    />
                    <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900">
                      {form.iconPreview ? "Change icon" : "Choose icon file"}
                    </span>
                    <span className="text-xs text-stone-500 mt-1">
                      SVG, PNG, JPG, WebP (recommended: square SVG)
                    </span>
                  </div>
                  <input
                    type="file"
                    name="iconUpload"
                    onChange={handleChange}
                    accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg"
                    className="hidden"
                  />
                </label>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Sort Order{" "}
                  {!isEdit && (
                    <span className="text-stone-500 font-normal">
                      (auto-generated, you can change)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={form.sortOrder}
                  onChange={handleChange}
                  disabled={isEdit && !allowEditSortOrder}
                  className="w-full px-3.5 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-transparent transition-all disabled:bg-canvas-muted disabled:cursor-not-allowed disabled:text-stone-500"
                  min="1"
                  step="1"
                />

                {isEdit && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowEditSortOrder"
                      checked={allowEditSortOrder}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-border text-black focus:ring-2 focus:ring-brand-100"
                    />
                    Allow editing sort order
                  </label>
                )}

                {sortError && (
                  <p className="text-red-500 text-xs mt-1.5">{sortError}</p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Category Image{" "}
                  {isEdit ? (
                    <span className="text-stone-400 font-normal">(optional)</span>
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </label>

                {imageError && (
                  <p className="text-red-500 text-xs mt-2">{imageError}</p>
                )}

                {form.imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((prev) => ({
                          ...prev,
                          image: null,
                          imagePreview: null,
                        }));
                      }}
                      className="absolute -top-1 -right-1 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                    <div
                      className="relative group cursor-pointer"
                      onClick={() =>
                        setZoomedImage({
                          url: form.imagePreview,
                          name: form.name || "Category Image",
                        })
                      }
                    >
                      <img
                        src={form.imagePreview}
                        alt="Preview"
                        className="h-32 w-32 lg:h-40 lg:w-40 object-cover rounded-lg border-2 border-border shadow-sm hover:ring-2 hover:ring-brand-500 transition-all duration-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                        <ZoomIn className="h-6 w-6 lg:h-8 lg:w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">
                      Click image to zoom · Cross to remove
                    </p>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-gray-400 hover:bg-brand-50/30 transition-colors group">
                  <div className="flex flex-col items-center justify-center">
                    <ImageIcon
                      size={24}
                      className="text-stone-400 group-hover:text-stone-600 mb-2"
                    />
                    <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900">
                      {form.imagePreview ? "Change Image" : "Choose Image"}
                    </span>
                    <span className="text-xs text-stone-500 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </span>
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
                    className="w-4 h-4 rounded border-border text-black focus:ring-2 focus:ring-brand-100 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-stone-700 group-hover:text-stone-900">
                    Active
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="isNavbar"
                    checked={form.isNavbar}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-border text-black focus:ring-2 focus:ring-brand-100 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-stone-700 group-hover:text-stone-900">
                    Show in Navbar
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="isFooter"
                    checked={form.isFooter}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-border text-black focus:ring-2 focus:ring-brand-100 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-stone-700 group-hover:text-stone-900">
                    Show in Footer
                  </span>
                </label>
              </div>

              {/* Error */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
                  {submitError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate("/admin/inventory/categories")}
                  className="px-5 py-2 text-xs font-medium text-stone-700 bg-white border border-border rounded-lg hover:bg-brand-50/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Saving..."
                    : isEdit
                    ? "Update Category"
                    : "Create Category"}
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
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 backdrop-blur-sm"
              aria-label="Close zoom"
            >
              <X size={28} />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.name}
                className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "95vw", maxHeight: "90vh" }}
              />
            </div>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
              <p className="text-base font-medium">{zoomedImage.name}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CategoryForm;