// FilterForm.jsx - Reusable form component for Create/Edit Filter
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
import {
  createFilter,
  updateFilter,
  getFilterById,
} from "../../apis/Filterapi";

const FilterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    key: "",
    label: "",
    description: "",
    values: [{ label: "", value: "" }],
    isActive: true,
    sortOrder: 1,
  });

  // Load filter data if editing
 useEffect(() => {
  if (!isEdit) return;

  const loadFilter = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getFilterById(id);
      const filter = response?.data?.data || response?.data;

      setFormData({
        key: filter.key || "",
        label: filter.label || "",
        description: filter.description || "",
        values:
          filter.values?.length > 0
            ? filter.values
            : [{ label: "", value: "" }],
        isActive: filter.isActive !== false,
        sortOrder: filter.sortOrder || 1,
      });
    } catch (err) {
      console.error("Error loading filter:", err);
      setError("Failed to load filter data");
    } finally {
      setLoading(false);
    }
  };

  loadFilter();
}, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleValueChange = (index, field, value) => {
    const newValues = [...formData.values];
    newValues[index] = { ...newValues[index], [field]: value };
    setFormData((prev) => ({ ...prev, values: newValues }));
  };

  const addValuePair = () => {
    setFormData((prev) => ({
      ...prev,
      values: [...prev.values, { label: "", value: "" }],
    }));
  };

  const removeValuePair = (index) => {
    if (formData.values.length <= 1) return;
    const newValues = formData.values.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, values: newValues }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.key.trim() || !formData.label.trim()) {
      setError("Key and Label are required");
      return;
    }

    const validValues = formData.values.filter(
      (v) => v.label.trim() && v.value.trim()
    );

    if (validValues.length === 0) {
      setError("At least one valid label-value pair is required");
      return;
    }

    const payload = {
      key: formData.key,
      label: formData.label,
      description: formData.description,
      values: validValues,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 1,
    };

    try {
      setLoading(true);
      setError(null);

      if (isEdit) {
        await updateFilter(id, payload);
      } else {
        await createFilter(payload);
      }

      navigate("/admin/filters");
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save filter");
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
            onClick={() => navigate("/admin/filters")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? "Edit Filter" : "Create Filter"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Update filter information" : "Add a new filter option"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="key"
                  value={formData.key}
                  onChange={handleInputChange}
                  placeholder="e.g. color"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleInputChange}
                  placeholder="e.g. Color"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter filter description"
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Values */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Values <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addValuePair}
                  className="flex items-center gap-1.5 text-sm font-medium text-black hover:text-gray-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Value</span>
                </button>
              </div>
              <div className="space-y-3">
                {formData.values.map((value, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Label"
                      value={value.label}
                      onChange={(e) =>
                        handleValueChange(index, "label", e.target.value)
                      }
                      className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={value.value}
                      onChange={(e) =>
                        handleValueChange(index, "value", e.target.value)
                      }
                      className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                    {formData.values.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeValuePair(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sort Order */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Active</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/filters")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : isEdit ? "Update Filter" : "Create Filter"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FilterForm;
