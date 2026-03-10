// BrandForm.jsx - Reusable form component for Create/Edit Brand
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import {
  createBrand,
  updateBrand,
  getBrands,
} from "../../apis/BrandApi";

const BrandForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    icon: null,
    iconPreview: null,
  });

  // Load brand data if editing
  useEffect(() => {
    if (isEdit) {
      const loadBrand = async () => {
        try {
          setLoading(true);
          const res = await getBrands();
          const brandList = res?.data?.data?.brands || res?.data?.brands || [];
          const brand = brandList.find((b) => b._id === id);

          if (brand) {
            setForm({
              name: brand.name || "",
              icon: null,
              iconPreview: brand.icon?.imageUrl || null,
            });
          }
        } catch (err) {
          console.error("Error loading brand:", err);
        } finally {
          setLoading(false);
        }
      };
      loadBrand();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "icon") {
      const file = files?.[0] || null;
      setForm({
        ...form,
        icon: file,
        iconPreview: file ? URL.createObjectURL(file) : form.iconPreview,
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Brand name is required");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name.trim());
      if (form.icon) formData.append("icon", form.icon);

      if (isEdit) {
        await updateBrand(id, formData);
      } else {
        await createBrand(formData);
      }
      navigate("/admin/brands");
    } catch (err) {
      console.error("Error saving brand:", err);
      alert(err?.response?.data?.message || "Failed to save brand");
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
            onClick={() => navigate("/admin/brands")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Brand" : "Create Brand"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update brand information" : "Add a new brand"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Brand Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Nike, Adidas, Puma"
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
            </div>

            {/* Brand Logo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Brand Logo {isEdit && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              
              {form.iconPreview && (
                <div className="mb-3">
                  <img
                    src={form.iconPreview}
                    alt="Preview"
                    className="h-24 w-24 object-contain rounded-lg border-2 border-gray-200 bg-gray-50 p-2 shadow-sm"
                  />
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors group">
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400 group-hover:text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                    {form.iconPreview ? "Change Logo" : "Choose Logo"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 10MB</span>
                </div>
                <input
                  type="file"
                  name="icon"
                  onChange={handleChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/brands")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : isEdit ? "Update Brand" : "Create Brand"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BrandForm;
