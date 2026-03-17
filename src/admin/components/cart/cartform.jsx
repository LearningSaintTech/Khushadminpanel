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
          console.log("[CartForm] Load single config", { id });
          const response = await getSingleCartCharge(id);
          const data = response?.data?.data || response?.data;
          console.log("[CartForm] Load response", { id, hasData: !!data, raw: response?.data });

          if (data) {
          const mapRule = (r) => {
            const hasPercent = r?.percent !== undefined && r?.percent !== null && r?.percent !== "";
            return {
              min: r?.min ?? "",
              max: r?.max === null || r?.max === undefined ? "" : r.max,
              type: hasPercent ? "PERCENT" : "FLAT",
              amount: hasPercent ? (r.percent ?? "") : (r.value ?? ""),
            };
          };
          const list = data.cartCharge || [];
          const byKey = {};
          list.forEach((item) => {
            const key = item.key || "";
            const rule = item.rules && !Array.isArray(item.rules) ? item.rules : (item.rules && item.rules[0]) || {};
            if (!byKey[key]) byKey[key] = { key, rules: [] };
            byKey[key].rules.push(mapRule(rule));
          });
          setFormData({
            isActive: data.isActive !== false,
            cartCharge: Object.values(byKey),
          });
          console.log("[CartForm] Load set formData", { cartChargeCount: Object.values(byKey).length, byKey });
        }
      } catch (err) {
        console.error("[CartForm] Load failed", err);
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
      cartCharge: [...prev.cartCharge, { key: "", rules: [] }],
    }));
  };

 const addRuleField = (chargeIndex) => {
  const updated = [...formData.cartCharge];

  if (!Array.isArray(updated[chargeIndex].rules)) {
    updated[chargeIndex].rules = [];
  }

  updated[chargeIndex].rules.push({
    min: "",
    max: "",
    type: "FLAT",
    amount: "",
  });

  setFormData({ ...formData, cartCharge: updated });
};

  // const updateRuleKey = (chargeIndex, oldKey, newKey) => {
  //   const updated = [...formData.cartCharge];

  //   if (!newKey.trim()) return;

  //   const rules = { ...updated[chargeIndex].rules };

  //   if (oldKey !== newKey) {
  //     const value = rules[oldKey];
  //     delete rules[oldKey];
  //     rules[newKey] = value;
  //   }

  //   updated[chargeIndex].rules = rules;
  //   setFormData({ ...formData, cartCharge: updated });
  // };
  const updateRuleValue = (chargeIndex, ruleIndex, field, value) => {
    const updated = formData.cartCharge.map((charge, ci) =>
      ci !== chargeIndex
        ? charge
        : {
            ...charge,
            rules: charge.rules.map((r, ri) => {
              if (ri !== ruleIndex) return r;
              if (field === "type") return { ...r, type: value };
              if (field === "amount") return { ...r, amount: value === "" ? "" : (isNaN(Number(value)) ? value : Number(value)) };
              if (field === "min" || field === "max") return { ...r, [field]: value === "" ? "" : Number(value) };
              return r;
            }),
          }
    );
    setFormData({ ...formData, cartCharge: updated });
  };

  // const removeRuleField = (chargeIndex, ruleKey) => {
  //   const updated = [...formData.cartCharge];

  //   delete updated[chargeIndex].rules[ruleKey];

  //   setFormData({ ...formData, cartCharge: updated });
  // };
  const removeRuleField = (chargeIndex, ruleIndex) => {
    const updated = [...formData.cartCharge];

    updated[chargeIndex].rules.splice(ruleIndex, 1);

    setFormData({ ...formData, cartCharge: updated });
  };
  const removeCharge = (index) => {
    const updated = [...formData.cartCharge];
    updated.splice(index, 1);
    setFormData({ ...formData, cartCharge: updated });
  };

  const updateChargeKey = (index, value) => {
    const updated = [...formData.cartCharge];
    updated[index].key = value;

    setFormData({ ...formData, cartCharge: updated });
  };

  // const updateRule = (chargeIndex, ruleKey, value) => {
  //   const updated = [...formData.cartCharge];
  //   const rules = { ...updated[chargeIndex].rules };

  //   // Convert numeric values
  //   if (ruleKey === "min" || ruleKey === "max" || ruleKey === "value" ||
  //       ruleKey === "base" || ruleKey === "percent" || ruleKey === "threshold" ||
  //       ruleKey === "multiplier") {
  //     rules[ruleKey] = value === "" ? 0 : Number(value);
  //   } else {
  //     rules[ruleKey] = value;
  //   }

  //   updated[chargeIndex].rules = rules;
  //   setFormData({ ...formData, cartCharge: updated });
  // };

  // Get rule fields based on charge key type
  // const getRuleFields = (charge) => {
  //   const keyType = charge?.key?.toLowerCase() || "";

  //   if (keyType === "delivery" || keyType === "packing") {
  //     return [
  //       { label: "Min", key: "min", type: "number" },
  //       { label: "Max", key: "max", type: "number" },
  //       { label: "Value", key: "value", type: "number" },
  //     ];
  //   } else if (keyType === "platformfee" || keyType === "convienece") {
  //     return [
  //       { label: "Base", key: "base", type: "number" },
  //       { label: "Percent", key: "percent", type: "number" },
  //     ];
  //   } else if (keyType === "surge") {
  //     return [
  //       { label: "Threshold", key: "threshold", type: "number" },
  //       { label: "Multiplier", key: "multiplier", type: "number", step: "0.1" },
  //     ];
  //   } else if (keyType === "nightcharge") {
  //     return [
  //       { label: "Start Time", key: "startTime", type: "time" },
  //       { label: "End Time", key: "endTime", type: "time" },
  //       { label: "Value", key: "value", type: "number" },
  //     ];
  //   }

  //   // For unknown keys, show dynamic rule editor based on existing rules
  //   const rules = charge?.rules || {};
  //   if (Object.keys(rules).length > 0) {
  //     return Object.keys(rules).map(ruleKey => ({
  //       label: ruleKey,
  //       key: ruleKey,
  //       type: typeof rules[ruleKey] === "number" ? "number" : "text",
  //     }));
  //   }

  //   // Default empty state
  //   return [];
  // };

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
        (charge) => !charge.key || charge.key.trim() === "",
      );

      if (invalidCharges.length > 0) {
        setError("Please provide a key for all charges");
        setLoading(false);
        return;
      }

    const buildRule = (rule) => {
      const cleaned = {};
      if (rule.min !== "" && rule.min !== undefined) cleaned.min = Number(rule.min);
      cleaned.max = rule.max === "" || rule.max === undefined ? null : Number(rule.max);
      if (rule.type === "PERCENT") {
        if (rule.amount !== "" && rule.amount !== undefined) cleaned.percent = Number(rule.amount);
      } else {
        if (rule.amount !== "" && rule.amount !== undefined) cleaned.value = Number(rule.amount);
      }
      return cleaned;
    };

    const payload = {
      isActive: formData.isActive,
      cartCharge: formData.cartCharge.flatMap((charge) =>
        (charge.rules || []).map((rule) => ({
          key: charge.key.trim(),
          rules: buildRule(rule),
        }))
      ),
    };
      console.log("[CartForm] Submit payload", { id, payload, cartChargeLength: payload.cartCharge?.length });
      if (id) {
        await updateCartCharges(id, payload);
        console.log("[CartForm] Update success", id);
        alert("✅ Cart charges updated successfully!");
      } else {
        await createCartCharges(payload);
        console.log("[CartForm] Create success");
        alert("✅ Cart charges created successfully!");
      }

      navigate("/admin/cart-charges");
    } catch (err) {
      console.error("[CartForm] Submit failed", err?.response?.data ?? err);
      setError(
        err?.response?.data?.message ||
          "Failed to save cart charges configuration",
      );
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
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
            <label
              htmlFor="isActive"
              className="font-semibold text-gray-900 cursor-pointer"
            >
              Enable Cart Charges
            </label>
          </div>

          {/* Charges */}
          {formData.cartCharge.map((charge, index) => {
            // const ruleFields = getRuleFields(charge);

            return (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4"
              >
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
                      Common keys: delivery, packing, platformfee, surge,
                      nightcharge, convienece
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
                    <h4 className="text-sm font-semibold text-gray-700">
                      Rules
                    </h4>

                  {charge.rules.map((rule, ruleIndex) => (
                    <div
                      key={ruleIndex}
                      className="flex gap-3 items-center flex-wrap p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Min</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={rule.min ?? ""}
                          onChange={(e) =>
                            updateRuleValue(index, ruleIndex, "min", e.target.value)
                          }
                          className="w-24 border-2 border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Max (empty = no max)</label>
                        <input
                          type="number"
                          placeholder="null"
                          value={rule.max ?? ""}
                          onChange={(e) =>
                            updateRuleValue(index, ruleIndex, "max", e.target.value)
                          }
                          className="w-24 border-2 border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                        <select
                          value={rule.type ?? "FLAT"}
                          onChange={(e) =>
                            updateRuleValue(index, ruleIndex, "type", e.target.value)
                          }
                          className="w-28 border-2 border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        >
                          <option value="FLAT">FLAT</option>
                          <option value="PERCENT">PERCENT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">
                          {rule.type === "PERCENT" ? "Percent (e.g. 20)" : "Value (e.g. 100)"}
                        </label>
                        <input
                          type="number"
                          placeholder={rule.type === "PERCENT" ? "20" : "100"}
                          min={0}
                          step={rule.type === "PERCENT" ? 1 : 0.01}
                          value={rule.amount ?? ""}
                          onChange={(e) =>
                            updateRuleValue(index, ruleIndex, "amount", e.target.value)
                          }
                          className="w-28 border-2 border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRuleField(index, ruleIndex)}
                        className="mt-5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                    {/* Add Rule Button */}
                    <button
                      type="button"
                      onClick={() => addRuleField(index)}
                      className="text-sm text-blue-600"
                    >
                      + Add Rule
                    </button>
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
              {loading
                ? "Saving..."
                : id
                  ? "Update Configuration"
                  : "Create Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CartChargesConfigForm;
