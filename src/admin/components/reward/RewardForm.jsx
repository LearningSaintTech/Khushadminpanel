import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  createRewardRules,
  updateRewardRules,
  getRewardRules,
} from "../../apis/Rewardapi";
import {
  btnOutline,
  btnPrimary,
  Field,
  fieldClass,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./rewardShared";

const emptySlab = { min_price: "", max_price: "", points: "", points_percentage: "" };
const emptyRecharge = { min_amount: "", max_amount: "", cashToAdd: "", bonus_percentage: "" };

const defaultForm = {
  earning_rules: {
    type: "SLAB_BASED",
    slabs: [{ ...emptySlab }],
  },
  redemption_rules: {
    min_points_required: "",
    point_value_in_currency: "",
  },
  recharge_bonus_rules: [{ ...emptyRecharge }],
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
};

function normalizeRuleToForm(rule) {
  if (!rule || typeof rule !== "object") return defaultForm;
  const slabs = rule.earning_rules?.slabs;
  const recharges = rule.recharge_bonus_rules;
  return {
    earning_rules: {
      type: rule.earning_rules?.type || "SLAB_BASED",
      slabs:
        Array.isArray(slabs) && slabs.length > 0
          ? slabs.map((s) => ({
              min_price: s.min_price ?? "",
              max_price: s.max_price ?? "",
              points: s.points ?? "",
              points_percentage: s.points_percentage ?? "",
            }))
          : [{ ...emptySlab }],
    },
    redemption_rules: {
      min_points_required: rule.redemption_rules?.min_points_required ?? "",
      point_value_in_currency: rule.redemption_rules?.point_value_in_currency ?? "",
    },
    recharge_bonus_rules:
      Array.isArray(recharges) && recharges.length > 0
        ? recharges.map((r) => ({
            min_amount: r.min_amount ?? "",
            max_amount: r.max_amount ?? "",
            cashToAdd: r.cashToAdd ?? "",
            bonus_percentage: r.bonus_percentage ?? "",
          }))
        : [{ ...emptyRecharge }],
    expiry_rules: {
      expiry_days: rule.expiry_rules?.expiry_days ?? "",
      expiry_strategy: rule.expiry_rules?.expiry_strategy || "FIFO",
    },
    limits: {
      max_points_earned_per_order: rule.limits?.max_points_earned_per_order ?? "",
    },
    order_rules: {
      eligible_for_rewards_min_order_value:
        rule.order_rules?.eligible_for_rewards_min_order_value ?? "",
    },
  };
}

const RewardForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const editData = location.state;
  const isEdit = Boolean(id);

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(isEdit && !editData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("wallet"));
  };

  useEffect(() => {
    if (editData) {
      setForm(normalizeRuleToForm(editData));
      setLoading(false);
      return;
    }
    if (!id) {
      setForm(defaultForm);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getRewardRules();
        const data = res?.data?.data ?? res?.data ?? res;
        const rule = Array.isArray(data) ? data[0] : data;
        if (!cancelled && rule?._id) setForm(normalizeRuleToForm(rule));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load reward rule");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, editData]);

  const toOptionalNumber = (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };

  const toNumber = (val) =>
    val === "" || val === null || val === undefined ? null : Number(val);

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
    setError("");
  };

  const updateArrayItem = (arrayPath, index, field, value) => {
    setForm((prev) => {
      const newForm = { ...prev };
      const keys = arrayPath.split(".");
      let current = newForm;
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          current[keys[i]] = [...current[keys[i]]];
          current[keys[i]][index] = { ...current[keys[i]][index], [field]: value };
        } else {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
      }
      return newForm;
    });
    setError("");
  };

  const addSlab = () => {
    setForm((prev) => ({
      ...prev,
      earning_rules: {
        ...prev.earning_rules,
        slabs: [...prev.earning_rules.slabs, { ...emptySlab }],
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
      recharge_bonus_rules: [...prev.recharge_bonus_rules, { ...emptyRecharge }],
    }));
  };

  const removeRecharge = (index) => {
    if (form.recharge_bonus_rules.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      recharge_bonus_rules: prev.recharge_bonus_rules.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      earning_rules: {
        type: "SLAB_BASED",
        slabs: form.earning_rules.slabs.map((s) => ({
          min_price: toNumber(s.min_price),
          max_price: toNumber(s.max_price),
          ...(toOptionalNumber(s.points) !== undefined && {
            points: toOptionalNumber(s.points),
          }),
          ...(toOptionalNumber(s.points_percentage) !== undefined && {
            points_percentage: toOptionalNumber(s.points_percentage),
          }),
        })),
      },
      redemption_rules: {
        min_points_required: toNumber(form.redemption_rules.min_points_required),
        point_value_in_currency: toNumber(form.redemption_rules.point_value_in_currency),
      },
      recharge_bonus_rules: form.recharge_bonus_rules.map((r) => ({
        min_amount: toNumber(r.min_amount),
        max_amount: toNumber(r.max_amount),
        ...(toOptionalNumber(r.cashToAdd) !== undefined && {
          cashToAdd: toOptionalNumber(r.cashToAdd),
        }),
        ...(toOptionalNumber(r.bonus_percentage) !== undefined && {
          bonus_percentage: toOptionalNumber(r.bonus_percentage),
        }),
      })),
      expiry_rules: {
        expiry_days: toNumber(form.expiry_rules.expiry_days),
        expiry_strategy: form.expiry_rules.expiry_strategy,
      },
      limits: {
        max_points_earned_per_order: toNumber(form.limits.max_points_earned_per_order),
      },
      order_rules: {
        eligible_for_rewards_min_order_value: toNumber(
          form.order_rules.eligible_for_rewards_min_order_value,
        ),
      },
    };

    try {
      if (id) {
        await updateRewardRules(id, payload);
      } else {
        await createRewardRules(payload);
      }
      navigate(ap("wallet"));
    } catch (err) {
      console.error(err);
      setError("Failed to save reward rule. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  };

  const formTitle = isEdit ? "Edit reward rule" : "Create reward rule";

  if (loading) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline} title="Back">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            {formTitle}
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-12 text-[11px] text-stone-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading reward rule…
        </div>
      </div>
    );
  }

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          {formTitle}
        </h1>
        <button
          type="button"
          onClick={() => navigate(ap("wallet"))}
          className={btnOutline}
          title="Close"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger"
          >
            {error}
          </div>
        ) : null}

        <FormSection title="Order & limits" hint="Minimum order and max points per order.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Minimum order value (₹)">
              <input
                type="number"
                className={fieldClass}
                value={form.order_rules.eligible_for_rewards_min_order_value ?? ""}
                onChange={(e) =>
                  updateField("order_rules.eligible_for_rewards_min_order_value", e.target.value)
                }
                placeholder="500"
              />
            </Field>
            <Field label="Max points per order">
              <input
                type="number"
                className={fieldClass}
                value={form.limits.max_points_earned_per_order ?? ""}
                onChange={(e) =>
                  updateField("limits.max_points_earned_per_order", e.target.value)
                }
                placeholder="1000"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Expiry rules">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Expiry days">
              <input
                type="number"
                className={fieldClass}
                value={form.expiry_rules.expiry_days ?? ""}
                onChange={(e) => updateField("expiry_rules.expiry_days", e.target.value)}
                placeholder="365"
              />
            </Field>
            <Field label="Expiry strategy">
              <select
                className={fieldClass}
                value={form.expiry_rules.expiry_strategy}
                onChange={(e) => updateField("expiry_rules.expiry_strategy", e.target.value)}
              >
                <option value="FIFO">FIFO (first in, first out)</option>
                <option value="LIFO">LIFO (last in, first out)</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Redemption rules" hint="Points required and currency value.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Minimum points required">
              <input
                type="number"
                className={fieldClass}
                value={form.redemption_rules.min_points_required ?? ""}
                onChange={(e) =>
                  updateField("redemption_rules.min_points_required", e.target.value)
                }
                placeholder="100"
              />
            </Field>
            <Field label="Point value (₹ per point)">
              <input
                type="number"
                step="0.01"
                className={fieldClass}
                value={form.redemption_rules.point_value_in_currency ?? ""}
                onChange={(e) =>
                  updateField("redemption_rules.point_value_in_currency", e.target.value)
                }
                placeholder="0.50"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Earning slabs"
          hint="Price ranges and points earned per order."
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addSlab}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
            >
              + Add slab
            </button>
          </div>
          <div className="space-y-2">
            {form.earning_rules.slabs.map((slab, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-canvas-muted/40 p-2 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Min price (₹)">
                  <input
                    type="number"
                    className={fieldClass}
                    value={slab.min_price ?? ""}
                    onChange={(e) =>
                      updateArrayItem("earning_rules.slabs", index, "min_price", e.target.value)
                    }
                  />
                </Field>
                <Field label="Max price (₹)">
                  <input
                    type="number"
                    className={fieldClass}
                    value={slab.max_price ?? ""}
                    onChange={(e) =>
                      updateArrayItem("earning_rules.slabs", index, "max_price", e.target.value)
                    }
                  />
                </Field>
                <Field label="Points">
                  <input
                    type="number"
                    className={fieldClass}
                    value={slab.points ?? ""}
                    onChange={(e) =>
                      updateArrayItem("earning_rules.slabs", index, "points", e.target.value)
                    }
                  />
                </Field>
                <Field label="Points (%)">
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      className={fieldClass}
                      value={slab.points_percentage ?? ""}
                      onChange={(e) =>
                        updateArrayItem(
                          "earning_rules.slabs",
                          index,
                          "points_percentage",
                          e.target.value,
                        )
                      }
                    />
                    {form.earning_rules.slabs.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSlab(index)}
                        className="shrink-0 rounded-lg border border-danger/30 px-2 text-[11px] text-danger hover:bg-danger-bg"
                        title="Remove slab"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </Field>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="Recharge bonus" hint="Wallet recharge tiers and bonuses.">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addRecharge}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
            >
              + Add tier
            </button>
          </div>
          <div className="space-y-2">
            {form.recharge_bonus_rules.map((bonus, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-canvas-muted/40 p-2 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Min amount (₹)">
                  <input
                    type="number"
                    className={fieldClass}
                    value={bonus.min_amount ?? ""}
                    onChange={(e) =>
                      updateArrayItem("recharge_bonus_rules", index, "min_amount", e.target.value)
                    }
                  />
                </Field>
                <Field label="Max amount (₹)">
                  <input
                    type="number"
                    className={fieldClass}
                    value={bonus.max_amount ?? ""}
                    onChange={(e) =>
                      updateArrayItem("recharge_bonus_rules", index, "max_amount", e.target.value)
                    }
                  />
                </Field>
                <Field label="Cash bonus (₹)">
                  <input
                    type="number"
                    className={fieldClass}
                    value={bonus.cashToAdd ?? ""}
                    onChange={(e) =>
                      updateArrayItem("recharge_bonus_rules", index, "cashToAdd", e.target.value)
                    }
                  />
                </Field>
                <Field label="Bonus (%)">
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      className={fieldClass}
                      value={bonus.bonus_percentage ?? ""}
                      onChange={(e) =>
                        updateArrayItem(
                          "recharge_bonus_rules",
                          index,
                          "bonus_percentage",
                          e.target.value,
                        )
                      }
                    />
                    {form.recharge_bonus_rules.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeRecharge(index)}
                        className="shrink-0 rounded-lg border border-danger/30 px-2 text-[11px] text-danger hover:bg-danger-bg"
                        title="Remove tier"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </Field>
              </div>
            ))}
          </div>
        </FormSection>

        <div className={formStickyFooter}>
          <button
            type="button"
            onClick={() => navigate(ap("wallet"))}
            disabled={saving}
            className={btnOutline}
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {isEdit ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RewardForm;
