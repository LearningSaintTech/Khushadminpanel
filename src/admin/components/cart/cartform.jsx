import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createCartCharges,
  updateCartCharges,
  getSingleCartCharge,
} from "../../apis/Cartapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";
const fieldSmClass =
  "rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const CartChargesConfigForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    isActive: true,
    cartCharge: [],
  });

  useEffect(() => {
    if (!id) return;

    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        setError(null);
        const response = await getSingleCartCharge(id);
        const data = response?.data?.data || response?.data;

        if (data) {
          const mapRule = (r) => {
            const hasPercentField =
              r?.percent !== undefined && r?.percent !== null && r?.percent !== "";
            const isPercentType = String(r?.type || "").toUpperCase() === "PERCENT";
            const resolvedType = hasPercentField || isPercentType ? "PERCENT" : "FLAT";
            return {
              min: r?.min ?? "",
              max: r?.max === null || r?.max === undefined ? "" : r.max,
              type: resolvedType,
              amount:
                resolvedType === "PERCENT" ? (r?.percent ?? r?.value ?? "") : (r?.value ?? ""),
            };
          };

          const list = data.cartCharge || [];
          const byKey = {};
          list.forEach((item) => {
            const key = item.key || "";
            const rule =
              item.rules && !Array.isArray(item.rules)
                ? item.rules
                : (item.rules && item.rules[0]) || {};
            const nextIsCODSpecial = item.isCODSpecial !== undefined ? !!item.isCODSpecial : false;
            if (!byKey[key]) byKey[key] = { key, isCODSpecial: nextIsCODSpecial, rules: [] };
            else if (item.isCODSpecial !== undefined) byKey[key].isCODSpecial = nextIsCODSpecial;
            byKey[key].rules.push(mapRule(rule));
          });

          setFormData({
            isActive: data.isActive !== false,
            cartCharge: Object.values(byKey),
          });
        }
      } catch (err) {
        console.error("[CartForm] Load failed", err);
        setError("Failed to load cart charges configuration");
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, [id]);

  const addNewCharge = () => {
    setFormData((prev) => ({
      ...prev,
      cartCharge: [...prev.cartCharge, { key: "", isCODSpecial: false, rules: [] }],
    }));
  };

  const addRuleField = (chargeIndex) => {
    const updated = [...formData.cartCharge];
    if (!Array.isArray(updated[chargeIndex].rules)) {
      updated[chargeIndex].rules = [];
    }
    updated[chargeIndex].rules.push({ min: "", max: "", type: "FLAT", amount: "" });
    setFormData({ ...formData, cartCharge: updated });
  };

  const updateRuleValue = (chargeIndex, ruleIndex, field, value) => {
    const updated = formData.cartCharge.map((charge, ci) =>
      ci !== chargeIndex
        ? charge
        : {
            ...charge,
            rules: charge.rules.map((r, ri) => {
              if (ri !== ruleIndex) return r;
              if (field === "type") return { ...r, type: value };
              if (field === "amount")
                return {
                  ...r,
                  amount: value === "" ? "" : isNaN(Number(value)) ? value : Number(value),
                };
              if (field === "min" || field === "max")
                return { ...r, [field]: value === "" ? "" : Number(value) };
              return r;
            }),
          },
    );
    setFormData({ ...formData, cartCharge: updated });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

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
        cleaned.type = rule.type ?? "FLAT";
        if (rule.amount !== "" && rule.amount !== undefined) {
          if (rule.type === "PERCENT") {
            cleaned.percent = Number(rule.amount);
            cleaned.value = Number(rule.amount);
          } else {
            cleaned.value = Number(rule.amount);
          }
        }
        return cleaned;
      };

      const payload = {
        isActive: formData.isActive,
        cartCharge: formData.cartCharge.flatMap((charge) =>
          (charge.rules || []).map((rule) => ({
            key: charge.key.trim(),
            isCODSpecial: !!charge.isCODSpecial,
            rules: buildRule(rule),
          })),
        ),
      };

      if (id) {
        await updateCartCharges(id, payload);
      } else {
        await createCartCharges(payload);
      }

      navigate(ap("cart-charges"));
    } catch (err) {
      console.error("[CartForm] Submit failed", err?.response?.data ?? err);
      setError(err?.response?.data?.message || "Failed to save cart charges configuration");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loadingConfig;

  return (
    <div className="mx-auto max-w-4xl text-stone-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(ap("cart-charges"))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {isEdit ? "Edit Cart Charges" : "Create Cart Charges"}
            </h1>
            <p className="truncate text-[11px] text-stone-500">
              Delivery, packing, platform fees, and other cart rules
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      {loadingConfig ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-canvas-muted px-3 py-3 text-[11px] text-stone-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading configuration…
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormSection title="Configuration" hint="Enable or disable this charge set.">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[11px] font-medium text-brand-800">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              disabled={formDisabled}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="h-3.5 w-3.5 accent-brand-600"
            />
            Enable cart charges
          </label>
        </FormSection>

        <FormSection
          title="Charge types & rules"
          hint="Each key (e.g. delivery, packing) can have min/max cart value rules."
        >
          <div className="space-y-2.5">
            {formData.cartCharge.map((charge, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-canvas-muted/40 p-2.5 space-y-2"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <label className={labelClass}>Charge key</label>
                    <input
                      type="text"
                      placeholder="delivery, packing, platformfee…"
                      value={charge.key}
                      disabled={formDisabled}
                      onChange={(e) => updateChargeKey(index, e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCharge(index)}
                    disabled={formDisabled}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-bg px-2.5 py-1.5 text-[11px] font-medium text-danger hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>

                {charge.key ? (
                  <div className="space-y-2 border-t border-border pt-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-700">
                      <input
                        type="checkbox"
                        checked={!!charge.isCODSpecial}
                        disabled={formDisabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => {
                            const updated = [...prev.cartCharge];
                            updated[index] = { ...updated[index], isCODSpecial: checked };
                            return { ...prev, cartCharge: updated };
                          });
                        }}
                        className="h-3 w-3 accent-brand-600"
                      />
                      COD special
                    </label>

                    <p className={labelClass}>Rules</p>
                    {charge.rules.map((rule, ruleIndex) => (
                      <div
                        key={ruleIndex}
                        className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-white p-2"
                      >
                        <div>
                          <label className={labelClass}>Min</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={rule.min ?? ""}
                            disabled={formDisabled}
                            onChange={(e) =>
                              updateRuleValue(index, ruleIndex, "min", e.target.value)
                            }
                            className={`${fieldSmClass} w-20`}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Max</label>
                          <input
                            type="number"
                            placeholder="∞"
                            value={rule.max ?? ""}
                            disabled={formDisabled}
                            onChange={(e) =>
                              updateRuleValue(index, ruleIndex, "max", e.target.value)
                            }
                            className={`${fieldSmClass} w-20`}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Type</label>
                          <select
                            value={rule.type ?? "FLAT"}
                            disabled={formDisabled}
                            onChange={(e) =>
                              updateRuleValue(index, ruleIndex, "type", e.target.value)
                            }
                            className={`${fieldSmClass} w-24`}
                          >
                            <option value="FLAT">FLAT</option>
                            <option value="PERCENT">%</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>
                            {rule.type === "PERCENT" ? "Percent" : "Amount"}
                          </label>
                          <input
                            type="number"
                            placeholder={rule.type === "PERCENT" ? "20" : "100"}
                            min={0}
                            step={rule.type === "PERCENT" ? 1 : 0.01}
                            value={rule.amount ?? ""}
                            disabled={formDisabled}
                            onChange={(e) =>
                              updateRuleValue(index, ruleIndex, "amount", e.target.value)
                            }
                            className={`${fieldSmClass} w-24`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRuleField(index, ruleIndex)}
                          disabled={formDisabled}
                          className="mb-0.5 rounded-lg px-2 py-1 text-[10px] font-medium text-danger hover:bg-danger-bg"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addRuleField(index)}
                      disabled={formDisabled}
                      className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                    >
                      + Add rule
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            <button
              type="button"
              onClick={addNewCharge}
              disabled={formDisabled}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border bg-white px-3 py-2 text-[11px] font-semibold text-stone-700 transition-colors hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-50"
            >
              <Plus size={14} />
              Add charge type
            </button>
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(ap("cart-charges"))}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-canvas-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Update configuration"
            ) : (
              "Create configuration"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CartChargesConfigForm;
