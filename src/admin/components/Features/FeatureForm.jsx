// FeatureForm.jsx - Reusable form component for Create/Edit
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import {
  createFeature,
  updateFeature,
  getFeatures,
} from "../../apis/Featureapi";

const FeatureForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    featureName: "",
    description: "",
    icon: null,
    iconPreview: null,
  });

  // Load feature data if editing
  useEffect(() => {
    if (isEdit) {
      const loadFeature = async () => {
        try {
          setLoading(true);
          const res = await getFeatures(1, 100);
          const features = res?.data?.features || [];
          const feature = features.find((f) => f._id === id);
          
          if (feature) {
            setForm({
              featureName: feature.featureName || "",
              description: feature.description || "",
              icon: null,
              iconPreview: feature.icon?.imageUrl || null,
            });
          }
        } catch (err) {
          console.error("Error loading feature:", err);
        } finally {
          setLoading(false);
        }
      };
      loadFeature();
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
    const formData = new FormData();
    formData.append("featureName", form.featureName);
    formData.append("description", form.description);
    if (form.icon) formData.append("icon", form.icon);

    try {
      setLoading(true);
      if (isEdit) {
        await updateFeature(id, formData);
      } else {
        await createFeature(formData);
      }
      navigate("/admin/features");
    } catch (err) {
      console.error("Error saving feature:", err);
      alert(err?.response?.data?.message || "Failed to save feature");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/70">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Professional Back Button */}
        <button
          onClick={() => navigate("/admin/features")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Features</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEdit ? "Edit Feature" : "Create New Feature"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEdit ? "Update feature information" : "Add a new feature to your site"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feature Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Feature Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="featureName"
                value={form.featureName}
                onChange={handleChange}
                placeholder="Enter feature name"
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter feature description"
                rows={4}
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Icon Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Feature Icon {isEdit && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              
              {form.iconPreview && (
                <div className="mb-3">
                  <img
                    src={form.iconPreview}
                    alt="Preview"
                    className="h-20 w-20 object-contain rounded-lg border-2 border-gray-200 bg-gray-50 p-2 shadow-sm"
                  />
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors group">
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400 group-hover:text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                    {form.iconPreview ? "Change Icon" : "Choose Icon"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 5MB</span>
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
                onClick={() => navigate("/admin/features")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : isEdit ? "Update Feature" : "Create Feature"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeatureForm;
