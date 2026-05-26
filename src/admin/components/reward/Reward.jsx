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
    if (!window.confirm("Are you sure you want to delete this reward rule? This action cannot be undone.")) return;

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
    navigate(`/admin/rewards/edit/${rewardRule._id}`, { state: rewardRule });
  };

  const formatEarningValue = (slab) => {
    const pointsPercentage = Number(slab?.points_percentage ?? 0);
    return pointsPercentage > 0 ? `${pointsPercentage}% Points` : `${Number(slab?.points ?? 0)} Points`;
  };

  const formatRechargeBonusValue = (bonus) => {
    const bonusPercentage = Number(bonus?.bonus_percentage ?? 0);
    return bonusPercentage > 0 
      ? `+ ${bonusPercentage}% Cash Bonus` 
      : `+ ₹${Number(bonus?.cashToAdd ?? 0)} Cash Bonus`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Reward Rules</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage how users earn and redeem reward points
            </p>
          </div>

          {!rewardRule ? (
            <button
              onClick={() => navigate("/admin/rewards/create")}
              className="bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + Create New Rule
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              ✏️ Edit Rule
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500">Loading reward rules...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !rewardRule && (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Reward Rules Found</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              You haven't created any reward rules yet. Create one to start rewarding your users.
            </p>
            <button
              onClick={() => navigate("/admin/rewards/create")}
              className="bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create Reward Rule
            </button>
          </div>
        )}

        {/* Main Content */}
        {rewardRule && (
          <div className="bg-white border border-gray-200">
            {/* Top Bar */}
            <div className="bg-gray-900 text-white px-8 py-5 border-b border-gray-200">
              <h2 className="text-xl font-medium">Active Reward Configuration</h2>
              <p className="text-xs text-gray-400 mt-1">Last updated: Just now</p>
            </div>

            <div className="p-8 space-y-10">
              {/* Order & Limits */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">ORDER & LIMITS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-200 p-6">
                  <div>
                    <p className="text-xs text-gray-500">Minimum Order Value</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      ₹{rewardRule.order_rules?.eligible_for_rewards_min_order_value || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max Points Per Order</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {rewardRule.limits?.max_points_earned_per_order || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expiry Rules */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">EXPIRY RULES</h3>
                <div className="border border-gray-200 p-6">
                  <p className="text-sm text-gray-700">
                    Points expire after{" "}
                    <span className="font-medium text-gray-900">
                      {rewardRule.expiry_rules?.expiry_days || "—"} days
                    </span>{" "}
                    using{" "}
                    <span className="font-medium text-gray-900">
                      {rewardRule.expiry_rules?.expiry_strategy || "FIFO"}
                    </span>{" "}
                    strategy.
                  </p>
                </div>
              </div>

              {/* Redemption Rules */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">REDEMPTION RULES</h3>
                <div className="border border-gray-200 p-6">
                  <p className="text-sm text-gray-700">
                    Minimum{" "}
                    <span className="font-medium text-gray-900">
                      {rewardRule.redemption_rules?.min_points_required || 0} points
                    </span>{" "}
                    required to redeem{" "}
                    <span className="font-medium text-gray-900">
                      ₹{rewardRule.redemption_rules?.point_value_in_currency || 0}
                    </span>{" "}
                    worth of value.
                  </p>
                </div>
              </div>

              {/* Earning Slabs */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">EARNING SLABS</h3>
                <div className="space-y-3">
                  {rewardRule.earning_rules?.slabs?.length > 0 ? (
                    rewardRule.earning_rules.slabs.map((slab, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border border-gray-200 px-6 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">Slab {index + 1}</span>
                          <span className="text-sm font-medium text-gray-900">
                            ₹{slab.min_price} - ₹{slab.max_price || "∞"}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-blue-600">
                            {formatEarningValue(slab)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No earning slabs configured</p>
                  )}
                </div>
              </div>

              {/* Recharge Bonus */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">RECHARGE BONUS</h3>
                <div className="space-y-3">
                  {rewardRule.recharge_bonus_rules?.length > 0 ? (
                    rewardRule.recharge_bonus_rules.map((bonus, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border border-gray-200 px-6 py-4"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            ₹{bonus.min_amount} - ₹{bonus.max_amount || "∞"}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-emerald-600">
                            {formatRechargeBonusValue(bonus)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No recharge bonus configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 p-6 flex gap-4">
              <button
                onClick={handleEdit}
                className="flex-1 bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Edit Reward Rule
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-3 text-sm font-medium hover:bg-red-700 transition-colors"
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