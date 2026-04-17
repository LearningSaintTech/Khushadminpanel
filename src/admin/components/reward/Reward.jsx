import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRewardRules,
  deleteRewardRules,
} from "../../apis/Rewardapi";

const RewardRules = () => {
  const navigate = useNavigate();
  const [rewardRule, setRewardRule] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRewardRule = async () => {
    try {
      setLoading(true);
      const res = await getRewardRules();
      
      console.log("Reward Rules API Response:", res);
      
      // Assuming API returns data directly or in res.data
      setRewardRule(res?.data || res || null);
    } catch (err) {
      console.error("Failed to fetch reward rules:", err);
      setRewardRule(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardRule();
  }, []);

  const handleDelete = async () => {
    if (!rewardRule) return;
    
    if (!window.confirm("Are you sure you want to delete this reward rule? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteRewardRules(rewardRule._id);
      setRewardRule(null);
      alert("Reward rule deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete reward rule");
    }
  };

  const handleEdit = () => {
    if (!rewardRule) return;
    navigate(`/admin/rewards/edit/${rewardRule._id}`, {
      state: rewardRule,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reward Rules</h1>
            <p className="text-gray-500 mt-1">
              Manage how users earn and redeem reward points
            </p>
          </div>

          {!rewardRule ? (
            <button
              onClick={() => navigate("/admin/rewards/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              + Create New Rule
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              ✏️ Edit Rule
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">Loading reward rules...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !rewardRule && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reward Rules Found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              You haven't created any reward rules yet. Create one to start rewarding your users.
            </p>
            <button
              onClick={() => navigate("/admin/rewards/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
            >
              Create Reward Rule
            </button>
          </div>
        )}

        {/* Reward Rule Details */}
        {rewardRule && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <h2 className="text-2xl font-semibold">Active Reward Configuration</h2>
              <p className="text-blue-100 mt-1">Last updated: Just now</p>
            </div>

            <div className="p-8 space-y-10">
              {/* Order & Limits */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📋 Order & Limits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl">
                  <div>
                    <p className="text-sm text-gray-500">Minimum Order Value</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ₹{rewardRule.order_rules?.eligible_for_rewards_min_order_value || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Max Points Per Order</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {rewardRule.limits?.max_points_earned_per_order || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expiry Rules */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  ⏳ Expiry Rules
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <p className="text-gray-700">
                    Points expire after <span className="font-semibold">
                      {rewardRule.expiry_rules?.expiry_days || "—"} days
                    </span> using{" "}
                    <span className="font-semibold">
                      {rewardRule.expiry_rules?.expiry_strategy || "FIFO"}
                    </span> strategy.
                  </p>
                </div>
              </div>

              {/* Redemption Rules */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  💰 Redemption Rules
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <p className="text-gray-700 text-lg">
                    Minimum <span className="font-semibold">
                      {rewardRule.redemption_rules?.min_points_required || 0} points
                    </span>{" "}
                    required to redeem{" "}
                    <span className="font-semibold">
                      ₹{rewardRule.redemption_rules?.point_value_in_currency || 0}
                    </span>{" "}
                    worth of value.
                  </p>
                </div>
              </div>

              {/* Earning Slabs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📈 Earning Slabs
                </h3>
                <div className="space-y-3">
                  {rewardRule.earning_rules?.slabs?.length > 0 ? (
                    rewardRule.earning_rules.slabs.map((slab, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-500">Slab {index + 1}</span>
                          <span className="text-lg font-semibold">
                            ₹{slab.min_price} - ₹{slab.max_price || "∞"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-600 font-semibold text-xl">
                            {slab.points} Points
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No earning slabs configured</p>
                  )}
                </div>
              </div>

              {/* Recharge Bonus */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  ⚡ Recharge Bonus
                </h3>
                <div className="space-y-3">
                  {rewardRule.recharge_bonus_rules?.length > 0 ? (
                    rewardRule.recharge_bonus_rules.map((bonus, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100"
                      >
                        <div>
                          <span className="text-lg font-semibold">
                            ₹{bonus.min_amount} - ₹{bonus.max_amount || "∞"}
                          </span>
                        </div>
                        <div className="text-emerald-600 font-semibold text-xl">
                          + ₹{bonus.cashToAdd} Cash Bonus
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No recharge bonus configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-100 p-8 flex gap-4">
              <button
                onClick={handleEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-medium transition-colors"
              >
                Edit Reward Rule
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-medium transition-colors"
              >
                Delete Rule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardRules;