import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  createRewardRules,
  updateRewardRules,
} from "../../apis/Rewardapi";

const RewardForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const editData = location.state;

  const [form, setForm] = useState({
    earning_rules: {
      type: "SLAB_BASED",
      slabs: [{ min_price: "", max_price: "", points: "", points_percentage: "" }],
    },
    redemption_rules: {
      min_points_required: "",
      point_value_in_currency: "",
    },
    recharge_bonus_rules: [
      { min_amount: "", max_amount: "", cashToAdd: "", bonus_percentage: "" },
    ],
    expiry_rules: {
      expiry_days: "",
      expiry_strategy: "FIFO",
    },
    limits: {
      max_points_earned_per_order: "",
    },
    order_rules: {
      eligible_for_rewards_min_order_value: "",
    },
  });

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setForm(editData);
    }
  }, [editData]);

  /** Empty string / undefined only — omit from payload so server does not get null. */
  const toOptionalNumber = (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };

  const toNumber = (val) => (val === "" || val === null || val === undefined ? null : Number(val));

  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm";

  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      earning_rules: {
        type: "SLAB_BASED",
        slabs: form.earning_rules.slabs.map((s) => {
          const min_price = toNumber(s.min_price);
          const max_price = toNumber(s.max_price);
          const points = toOptionalNumber(s.points);
          const points_percentage = toOptionalNumber(s.points_percentage);
          return {
            min_price,
            max_price,
            ...(points !== undefined && { points }),
            ...(points_percentage !== undefined && { points_percentage }),
          };
        }),
      },
      redemption_rules: {
        min_points_required: toNumber(form.redemption_rules.min_points_required),
        point_value_in_currency: toNumber(form.redemption_rules.point_value_in_currency),
      },
      recharge_bonus_rules: form.recharge_bonus_rules.map((r) => {
        const min_amount = toNumber(r.min_amount);
        const max_amount = toNumber(r.max_amount);
        const cashToAdd = toOptionalNumber(r.cashToAdd);
        const bonus_percentage = toOptionalNumber(r.bonus_percentage);
        return {
          min_amount,
          max_amount,
          ...(cashToAdd !== undefined && { cashToAdd }),
          ...(bonus_percentage !== undefined && { bonus_percentage }),
        };
      }),
      expiry_rules: {
        expiry_days: toNumber(form.expiry_rules.expiry_days),
        expiry_strategy: form.expiry_rules.expiry_strategy,
      },
      limits: {
        max_points_earned_per_order: toNumber(form.limits.max_points_earned_per_order),
      },
      order_rules: {
        eligible_for_rewards_min_order_value: toNumber(
          form.order_rules.eligible_for_rewards_min_order_value
        ),
      },
    };

    try {
      if (id) {
        await updateRewardRules(id, payload);
      } else {
        await createRewardRules(payload);
      }
      navigate("/admin/rewards");
    } catch (err) {
      console.error(err);
      alert("Failed to save reward rule. Please check the inputs.");
    }
  };

  // Generic updater for simple fields
  const updateField = (path, value) => {
    setForm((prev) => {
      const keys = path.split(".");
      const newForm = { ...prev };

      let current = newForm;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return newForm;
    });
  };

  // Updater for items inside arrays (slabs & recharge)
  const updateArrayItem = (arrayPath, index, field, value) => {
    setForm((prev) => {
      const keys = arrayPath.split(".");
      const newForm = { ...prev };

      let current = newForm;
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          current[keys[i]] = [...current[keys[i]]]; // copy the array
          current[keys[i]][index] = {
            ...current[keys[i]][index],
            [field]: value,
          };
        } else {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
      }
      return newForm;
    });
  };

  const addSlab = () => {
    setForm((prev) => ({
      ...prev,
      earning_rules: {
        ...prev.earning_rules,
        slabs: [
          ...prev.earning_rules.slabs,
          { min_price: "", max_price: "", points: "", points_percentage: "" },
        ],
      },
    }));
  };

  const removeSlab = (index) => {
    if (form.earning_rules.slabs.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      earning_rules: {
        ...prev.earning_rules,
        slabs: prev.earning_rules.slabs.filter((_, i) => i !== index),
      },
    }));
  };

  const addRecharge = () => {
    setForm((prev) => ({
      ...prev,
      recharge_bonus_rules: [
        ...prev.recharge_bonus_rules,
        { min_amount: "", max_amount: "", cashToAdd: "", bonus_percentage: "" },
      ],
    }));
  };

  const removeRecharge = (index) => {
    if (form.recharge_bonus_rules.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      recharge_bonus_rules: prev.recharge_bonus_rules.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {id ? "Edit Reward Rule" : "Create New Reward Rule"}
          </h1>
          <p className="text-gray-500 mt-1">
            Configure earning, redemption, and bonus rules for your users
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Order & Limits */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold mb-6">📋 Order & Limits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Minimum Order Value (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.order_rules.eligible_for_rewards_min_order_value || ""}
                  onChange={(e) => updateField("order_rules.eligible_for_rewards_min_order_value", e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <label className={labelClass}>Max Points Per Order</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.limits.max_points_earned_per_order || ""}
                  onChange={(e) => updateField("limits.max_points_earned_per_order", e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>
          </div>

          {/* Expiry Rules */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold mb-6">⏳ Expiry Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Expiry Days</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.expiry_rules.expiry_days || ""}
                  onChange={(e) => updateField("expiry_rules.expiry_days", e.target.value)}
                  placeholder="365"
                />
              </div>
              <div>
                <label className={labelClass}>Expiry Strategy</label>
                <select
                  className={inputClass}
                  value={form.expiry_rules.expiry_strategy}
                  onChange={(e) => updateField("expiry_rules.expiry_strategy", e.target.value)}
                >
                  <option value="FIFO">FIFO (First In, First Out)</option>
                  <option value="LIFO">LIFO (Last In, First Out)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Redemption Rules */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold mb-6">💰 Redemption Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Minimum Points Required</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.redemption_rules.min_points_required || ""}
                  onChange={(e) => updateField("redemption_rules.min_points_required", e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <label className={labelClass}>Point Value (₹ per point)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.redemption_rules.point_value_in_currency || ""}
                  onChange={(e) => updateField("redemption_rules.point_value_in_currency", e.target.value)}
                  placeholder="0.5"
                />
              </div>
            </div>
          </div>

          {/* Earning Slabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">📈 Earning Slabs</h2>
              <button
                type="button"
                onClick={addSlab}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                + Add Slab
              </button>
            </div>

            <div className="space-y-4">
              {form.earning_rules.slabs.map((slab, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <label className={labelClass}>Min Price (₹)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={slab.min_price || ""}
                      onChange={(e) => updateArrayItem("earning_rules.slabs", index, "min_price", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Price (₹)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={slab.max_price || ""}
                      onChange={(e) => updateArrayItem("earning_rules.slabs", index, "max_price", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Points Awarded</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={slab.points || ""}
                      onChange={(e) => updateArrayItem("earning_rules.slabs", index, "points", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Points (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={slab.points_percentage || ""}
                        onChange={(e) => updateArrayItem("earning_rules.slabs", index, "points_percentage", e.target.value)}
                      />
                      {form.earning_rules.slabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlab(index)}
                          className="text-red-500 hover:text-red-600 self-end mb-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recharge Bonus */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">⚡ Recharge Bonus</h2>
              <button
                type="button"
                onClick={addRecharge}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                + Add Recharge Slab
              </button>
            </div>

            <div className="space-y-4">
              {form.recharge_bonus_rules.map((bonus, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <label className={labelClass}>Min Amount (₹)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={bonus.min_amount || ""}
                      onChange={(e) => updateArrayItem("recharge_bonus_rules", index, "min_amount", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Amount (₹)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={bonus.max_amount || ""}
                      onChange={(e) => updateArrayItem("recharge_bonus_rules", index, "max_amount", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cash Bonus (₹)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={bonus.cashToAdd || ""}
                      onChange={(e) => updateArrayItem("recharge_bonus_rules", index, "cashToAdd", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bonus (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={bonus.bonus_percentage || ""}
                        onChange={(e) => updateArrayItem("recharge_bonus_rules", index, "bonus_percentage", e.target.value)}
                      />
                      {form.recharge_bonus_rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecharge(index)}
                          className="text-red-500 hover:text-red-600 self-end mb-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-3.5 rounded-2xl shadow-md transition-all"
            >
              {id ? "Update Reward Rule" : "Create Reward Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RewardForm;