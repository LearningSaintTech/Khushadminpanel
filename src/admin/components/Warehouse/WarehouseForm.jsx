import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createWarehouse,
  updateWarehouse,
  getWarehouseById,
} from "../../apis/Warehouseapi";

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: {
      line: "",
      city: "",
      state: "",
      pinCode: "",
      country: "India",
    },
    isActive: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && id) {
      loadWarehouse();
    }
  }, [id, isEdit]);

  const loadWarehouse = async () => {
    try {
      setLoading(true);
      const response = await getWarehouseById(id);
      const warehouse = response?.data?.data || response?.data || {};

      if (warehouse) {
        const addr = warehouse.address || {};
        setForm({
          name: warehouse.name || "",
          code: warehouse.code || "",
          address: {
            line: addr.line || addr.address || "",
            city: addr.city || "",
            state: addr.state || "",
            pinCode: addr.pinCode || addr.pincode || "",
            country: addr.country || "India",
          },
          isActive: warehouse.isActive !== false,
        });
      }
    } catch (err) {
      console.error("Error loading warehouse:", err);
      setError("Failed to load warehouse data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested address fields
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
    setError("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("Warehouse name is required");
      return false;
    }
    if (!form.address.city.trim()) {
      setError("City is required");
      return false;
    }
    if (!form.address.state.trim()) {
      setError("State is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        address: {
          line: form.address.line.trim() || "",
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pinCode: form.address.pinCode.trim() || "",
          country: form.address.country.trim() || "India",
        },
        isActive: form.isActive,
      };

      if (isEdit) {
        await updateWarehouse(id, payload);
      } else {
        await createWarehouse(payload);
      }

      navigate("/admin/warehouse");
    } catch (err) {
      console.error("Error saving warehouse:", err);
      setError(
        err?.response?.data?.message || "Failed to save warehouse"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Professional Back Button */}
        <button
          onClick={() => navigate("/admin/warehouse")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Warehouses</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black">
            {isEdit ? "Edit Warehouse" : "Create New Warehouse"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEdit
              ? "Update warehouse information"
              : "Add a new warehouse to your system"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter warehouse name"
                required
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Warehouse Code
              </label>
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. MUM-01"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
              />
            </div>

            {/* Address Line */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Address Line
              </label>
              <textarea
                name="address.line"
                value={form.address.line}
                onChange={handleChange}
                placeholder="Enter street address"
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none bg-white text-black"
              />
            </div>

            {/* City and State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={form.address.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={form.address.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
                />
              </div>
            </div>

            {/* Pincode and Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  name="address.pinCode"
                  value={form.address.pinCode}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  name="address.country"
                  value={form.address.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-black cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-black">
                  Active
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/warehouse")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Saving..."
                  : isEdit
                  ? "Update Warehouse"
                  : "Create Warehouse"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WarehouseForm;
