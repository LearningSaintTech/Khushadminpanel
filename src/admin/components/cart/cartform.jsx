import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCartCharges,
  updateCartCharges,
  getSingleCartCharge,
} from "../../apis/Cartapi";

const CartChargesConfigForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    isActive: true,
    cartCharge: [],
  });

  // ✅ Prefill Data (Edit Mode)
  useEffect(() => {
    if (id) {
      const loadConfig = async () => {
        try {
          setLoading(true);
          const response = await getSingleCartCharge(id);
          const data = response?.data?.data || response?.data;

          if (data) {
            setFormData({
              isActive: data.isActive !== false,
              cartCharge: JSON.parse(JSON.stringify(data.cartCharge || [])),
            });
          }
        } catch (err) {
          console.error(err);
          setError("Failed to load cart charges configuration");
        } finally {
          setLoading(false);
        }
      };
      loadConfig();
    }
  }, [id]);

  // ✅ Back Button
  const handleBack = () => {
    navigate("/admin/cart-charges");
  };

  // ============================
  // Charge + Rule Handlers
  // ============================

  const addNewCharge = () => {
    setFormData((prev) => ({
      ...prev,
      cartCharge: [...prev.cartCharge, { key: "", rules: {} }],
    }));
  };

  const removeCharge = (index) => {
    const updated = [...formData.cartCharge];
    updated.splice(index, 1);
    setFormData({ ...formData, cartCharge: updated });
  };

  const updateChargeKey = (index, value) => {
    const updated = [...formData.cartCharge];
    updated[index].key = value;
    
    // Reset rules when key changes to match the new key type
    const keyType = value.toLowerCase();
    if (keyType === "delivery" || keyType === "packing") {
      updated[index].rules = { min: 0, max: 0, value: 0 };
    } else if (keyType === "platformfee" || keyType === "convienece") {
      updated[index].rules = { base: 0, percent: 0 };
    } else if (keyType === "surge") {
      updated[index].rules = { threshold: 0, multiplier: 1 };
    } else if (keyType === "nightcharge") {
      updated[index].rules = { startTime: "22:00", endTime: "06:00", value: 0 };
    } else {
      // For unknown keys, keep existing rules or set empty
      updated[index].rules = updated[index].rules || {};
    }
    
    setFormData({ ...formData, cartCharge: updated });
  };

  const updateRule = (chargeIndex, ruleKey, value) => {
    const updated = [...formData.cartCharge];
    const rules = { ...updated[chargeIndex].rules };
    
    // Convert numeric values
    if (ruleKey === "min" || ruleKey === "max" || ruleKey === "value" || 
        ruleKey === "base" || ruleKey === "percent" || ruleKey === "threshold" || 
        ruleKey === "multiplier") {
      rules[ruleKey] = value === "" ? 0 : Number(value);
    } else {
      rules[ruleKey] = value;
    }

    updated[chargeIndex].rules = rules;
    setFormData({ ...formData, cartCharge: updated });
  };

  // Get rule fields based on charge key type
  const getRuleFields = (charge) => {
    const keyType = charge?.key?.toLowerCase() || "";
    
    if (keyType === "delivery" || keyType === "packing") {
      return [
        { label: "Min", key: "min", type: "number" },
        { label: "Max", key: "max", type: "number" },
        { label: "Value", key: "value", type: "number" },
      ];
    } else if (keyType === "platformfee" || keyType === "convienece") {
      return [
        { label: "Base", key: "base", type: "number" },
        { label: "Percent", key: "percent", type: "number" },
      ];
    } else if (keyType === "surge") {
      return [
        { label: "Threshold", key: "threshold", type: "number" },
        { label: "Multiplier", key: "multiplier", type: "number", step: "0.1" },
      ];
    } else if (keyType === "nightcharge") {
      return [
        { label: "Start Time", key: "startTime", type: "time" },
        { label: "End Time", key: "endTime", type: "time" },
        { label: "Value", key: "value", type: "number" },
      ];
    }
    
    // For unknown keys, show dynamic rule editor based on existing rules
    const rules = charge?.rules || {};
    if (Object.keys(rules).length > 0) {
      return Object.keys(rules).map(ruleKey => ({
        label: ruleKey,
        key: ruleKey,
        type: typeof rules[ruleKey] === "number" ? "number" : "text",
      }));
    }
    
    // Default empty state
    return [];
  };

  // ============================
  // Submit
  // ============================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validate that all charges have keys
      const invalidCharges = formData.cartCharge.filter(
        (charge) => !charge.key || charge.key.trim() === ""
      );

      if (invalidCharges.length > 0) {
        setError("Please provide a key for all charges");
        setLoading(false);
        return;
      }

      const payload = {
        isActive: formData.isActive,
        cartCharge: formData.cartCharge.map((charge) => ({
          key: charge.key.trim(),
          rules: charge.rules,
        })),
      };

      if (id) {
        await updateCartCharges(id, payload);
        alert("✅ Cart charges updated successfully!");
      } else {
        await createCartCharges(payload);
        alert("✅ Cart charges created successfully!");
      }

      navigate("/admin/cart-charges");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to save cart charges configuration");
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // UI
  // ============================

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
        {/* 🔙 Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 text-sm text-gray-600 hover:text-black flex items-center gap-2 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cart Charges
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          {id ? "Edit Cart Charges" : "Create Cart Charges"}
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading && !formData.cartCharge.length && (
          <p className="mb-4 text-gray-600">Loading...</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
              className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
            />
            <label htmlFor="isActive" className="font-semibold text-gray-900 cursor-pointer">
              Enable Cart Charges
            </label>
          </div>

          {/* Charges */}
          {formData.cartCharge.map((charge, index) => {
            const ruleFields = getRuleFields(charge);
            
            return (
              <div key={index} className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Charge Key
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. delivery, packing, platformfee, surge, nightcharge, convienece"
                      value={charge.key}
                      onChange={(e) => updateChargeKey(index, e.target.value)}
                      className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Common keys: delivery, packing, platformfee, surge, nightcharge, convienece
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCharge(index)}
                    className="px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>

                {charge.key && (
                  <div className="space-y-3 pt-3 border-t border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-700">Rules</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ruleFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            step={field.step || (field.type === "number" ? "1" : undefined)}
                            value={charge.rules[field.key] || ""}
                            onChange={(e) => updateRule(index, field.key, e.target.value)}
                            className="w-full border-2 border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            placeholder={field.label}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addNewCharge}
            className="w-full sm:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition font-medium text-gray-900"
          >
            + Add Charge Type
          </button>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : id ? "Update Configuration" : "Create Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartChargesConfigForm;
