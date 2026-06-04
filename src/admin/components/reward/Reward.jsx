import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getRewardRules, deleteRewardRules } from "../../apis/Rewardapi";
import {
  btnIconDelete,
  btnIconEdit,
  btnPrimary,
  FormSection,
  pageToolbar,
} from "./rewardShared";

const formatEarningValue = (slab) => {
  const pointsPercentage = Number(slab?.points_percentage ?? 0);
  return pointsPercentage > 0
    ? `${pointsPercentage}% points`
    : `${Number(slab?.points ?? 0)} points`;
};

const formatRechargeBonusValue = (bonus) => {
  const bonusPercentage = Number(bonus?.bonus_percentage ?? 0);
  return bonusPercentage > 0
    ? `+${bonusPercentage}% cash bonus`
    : `+₹${Number(bonus?.cashToAdd ?? 0)} cash bonus`;
};

const RewardRules = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [rewardRule, setRewardRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchRewardRule = async () => {
    try {
      setLoading(true);
      const res = await getRewardRules();
      const data = res?.data?.data ?? res?.data ?? res;
      const rule = Array.isArray(data) ? data[0] : data;
      setRewardRule(rule?._id ? rule : null);
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
    if (!rewardRule?._id) return;
    if (
      !window.confirm(
        "Delete this reward rule? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      await deleteRewardRules(rewardRule._id);
      setRewardRule(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete reward rule");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!rewardRule?._id) return;
    navigate(ap(`rewards/edit/${rewardRule._id}`), { state: rewardRule });
  };

  return (
    <div className="text-stone-900">
      <div className={pageToolbar}>
        <div className="mr-auto min-w-0">
          <h1 className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">
            {rewardRule ? "Reward rule" : "Reward rules"}
          </h1>
          {!loading && rewardRule ? (
            <p className="mt-0.5 text-[11px] text-stone-500">
              Active points, redemption, and bonus configuration
            </p>
          ) : !loading && !rewardRule ? (
            <p className="mt-0.5 text-[11px] text-stone-500">
              Configure how users earn and redeem points
            </p>
          ) : null}
        </div>
        {!loading && !rewardRule ? (
          <button
            type="button"
            onClick={() => navigate(ap("rewards/create"))}
            className={btnPrimary}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Create
          </button>
        ) : null}
        {!loading && rewardRule ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleEdit}
              className={btnIconEdit}
              title="Edit reward rule"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={btnIconDelete}
              title="Delete reward rule"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-14 text-[11px] text-stone-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading reward rules…
        </div>
      ) : null}

      {!loading && !rewardRule ? (
        <div className="rounded-xl border border-border bg-white px-4 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">No reward rules</p>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-stone-500">
            Create one rule to configure how users earn and redeem points.
          </p>
          <button
            type="button"
            onClick={() => navigate(ap("rewards/create"))}
            className={`${btnPrimary} mt-4`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Create rule
          </button>
        </div>
      ) : null}

      {!loading && rewardRule ? (
        <div className="space-y-3">
          <FormSection title="Order & limits" hint="Minimum order and earning caps.">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Min order value
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">
                  ₹{rewardRule.order_rules?.eligible_for_rewards_min_order_value ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Max points per order
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">
                  {rewardRule.limits?.max_points_earned_per_order ?? "—"}
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection title="Expiry rules">
            <p className="text-[11px] text-stone-700">
              Points expire after{" "}
              <span className="font-semibold text-stone-900">
                {rewardRule.expiry_rules?.expiry_days ?? "—"} days
              </span>{" "}
              using{" "}
              <span className="font-semibold text-stone-900">
                {rewardRule.expiry_rules?.expiry_strategy || "FIFO"}
              </span>
              .
            </p>
          </FormSection>

          <FormSection title="Redemption rules">
            <p className="text-[11px] text-stone-700">
              Minimum{" "}
              <span className="font-semibold text-stone-900">
                {rewardRule.redemption_rules?.min_points_required ?? 0} points
              </span>{" "}
              to redeem{" "}
              <span className="font-semibold text-stone-900">
                ₹{rewardRule.redemption_rules?.point_value_in_currency ?? 0}
              </span>{" "}
              per point.
            </p>
          </FormSection>

          <FormSection
            title="Earning slabs"
            hint={
              rewardRule.earning_rules?.slabs?.length
                ? `${rewardRule.earning_rules.slabs.length} slab(s)`
                : "None configured"
            }
          >
            {rewardRule.earning_rules?.slabs?.length > 0 ? (
              <div className="space-y-1.5">
                {rewardRule.earning_rules.slabs.map((slab, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-canvas-muted/50 px-2.5 py-2 text-[11px]"
                  >
                    <span className="font-medium text-stone-800">
                      <span className="mr-2 text-[10px] text-stone-500">#{index + 1}</span>
                      ₹{slab.min_price} – ₹{slab.max_price || "∞"}
                    </span>
                    <span className="font-semibold text-brand-700">{formatEarningValue(slab)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-stone-500">No earning slabs configured.</p>
            )}
          </FormSection>

          <FormSection
            title="Recharge bonus"
            hint={
              rewardRule.recharge_bonus_rules?.length
                ? `${rewardRule.recharge_bonus_rules.length} tier(s)`
                : "None configured"
            }
          >
            {rewardRule.recharge_bonus_rules?.length > 0 ? (
              <div className="space-y-1.5">
                {rewardRule.recharge_bonus_rules.map((bonus, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-canvas-muted/50 px-2.5 py-2 text-[11px]"
                  >
                    <span className="font-medium text-stone-800">
                      ₹{bonus.min_amount} – ₹{bonus.max_amount || "∞"}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {formatRechargeBonusValue(bonus)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-stone-500">No recharge bonus configured.</p>
            )}
          </FormSection>
        </div>
      ) : null}
    </div>
  );
};

export default RewardRules;
