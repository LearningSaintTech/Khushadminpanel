import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { getReferralConfig, updateReferralConfig } from "../../apis/Refferalapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  btnOutline,
  btnPrimary,
  Field,
  fieldClass,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./referralShared";

const defaultConfig = {
  isEnabled: true,
  minimumOrderAmount: 1,
  minimumWalletRecharge: 2,
  referralRewardAmount: 150,
  referralExpiryDays: 45,
  conditions: [
    {
      key: "ORDER_AMOUNT",
      source: "ORDER",
      operator: ">=",
      value: 199,
      isEnabled: true,
      priority: 1,
    },
  ],
  uiConfig: {
    bannerTitle: "Refer & Earn",
  },
};

function normalizeConfig(data) {
  if (!data || typeof data !== "object") return defaultConfig;
  return {
    isEnabled: data.isEnabled !== false,
    minimumOrderAmount: data.minimumOrderAmount ?? defaultConfig.minimumOrderAmount,
    minimumWalletRecharge: data.minimumWalletRecharge ?? defaultConfig.minimumWalletRecharge,
    referralRewardAmount: data.referralRewardAmount ?? defaultConfig.referralRewardAmount,
    referralExpiryDays: data.referralExpiryDays ?? defaultConfig.referralExpiryDays,
    conditions: Array.isArray(data.conditions) && data.conditions.length > 0
      ? data.conditions
      : defaultConfig.conditions,
    uiConfig: {
      bannerTitle: data.uiConfig?.bannerTitle || defaultConfig.uiConfig.bannerTitle,
    },
  };
}

export default function ReferralConfig() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("money-features/refer-earn"));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await getReferralConfig();
        if (!cancelled && response?.success) {
          setConfig(normalizeConfig(response.data));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load referral configuration");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
    setError("");
  };

  const handleBannerChange = (e) => {
    setConfig((prev) => ({
      ...prev,
      uiConfig: { ...prev.uiConfig, bannerTitle: e.target.value },
    }));
  };

  const handleConditionValue = (index, value) => {
    setConfig((prev) => {
      const conditions = [...(prev.conditions || [])];
      conditions[index] = { ...conditions[index], value: Number(value) };
      return { ...prev, conditions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        isEnabled: config.isEnabled,
        minimumOrderAmount: Number(config.minimumOrderAmount),
        minimumWalletRecharge: Number(config.minimumWalletRecharge),
        referralRewardAmount: Number(config.referralRewardAmount),
        referralExpiryDays: Number(config.referralExpiryDays),
        conditions: (config.conditions || []).map((item) => ({
          key: item.key,
          source: item.source,
          operator: item.operator,
          value: Number(item.value),
          isEnabled: item.isEnabled !== false,
          priority: item.priority ?? 1,
        })),
        uiConfig: {
          bannerTitle: config.uiConfig?.bannerTitle || "Refer & Earn",
        },
        metadata: { updatedBy: "admin-panel" },
      };
      const res = await updateReferralConfig(payload);
      if (res?.success === false) {
        throw new Error(res?.message || "Update failed");
      }
      toast.success("Referral configuration saved");
      navigate(ap("money-features/refer-earn"));
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Failed to save configuration";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Referral configuration
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-12 text-[11px] text-stone-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading…
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
          Referral configuration
        </h1>
        <button type="button" onClick={() => navigate(ap("money-features/refer-earn"))} className={btnOutline}>
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

        <FormSection title="Program status" hint="Turn the referral program on or off.">
          <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-canvas-muted/50 px-3 py-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              name="isEnabled"
              checked={config.isEnabled}
              onChange={handleChange}
              className="h-3.5 w-3.5 rounded border-border accent-brand-600"
            />
            Enable referral program
          </label>
        </FormSection>

        <FormSection title="Reward rules" hint="Amounts and expiry for refer & earn.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Reward amount (₹)">
              <input
                type="number"
                name="referralRewardAmount"
                min={0}
                value={config.referralRewardAmount}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Referral expiry (days)">
              <input
                type="number"
                name="referralExpiryDays"
                min={1}
                value={config.referralExpiryDays}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Minimum order amount (₹)">
              <input
                type="number"
                name="minimumOrderAmount"
                min={0}
                value={config.minimumOrderAmount}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Minimum wallet recharge (₹)">
              <input
                type="number"
                name="minimumWalletRecharge"
                min={0}
                value={config.minimumWalletRecharge}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Eligibility conditions" hint="Rules evaluated when rewarding referrals.">
          <div className="space-y-2">
            {(config.conditions || []).map((cond, index) => (
              <div
                key={cond.key || index}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-canvas-muted/40 p-2 sm:grid-cols-3"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Rule
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-stone-800">
                    {cond.key} ({cond.source} {cond.operator})
                  </p>
                </div>
                <Field label="Minimum value">
                  <input
                    type="number"
                    min={0}
                    value={cond.value ?? ""}
                    onChange={(e) => handleConditionValue(index, e.target.value)}
                    className={fieldClass}
                  />
                </Field>
                <div className="flex items-end">
                  <span className="text-[11px] text-stone-600">
                    {cond.isEnabled ? "Enabled" : "Disabled"} · priority {cond.priority ?? 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="Storefront UI">
          <Field label="Banner title">
            <input
              type="text"
              value={config.uiConfig?.bannerTitle || ""}
              onChange={handleBannerChange}
              className={fieldClass}
              placeholder="Refer & Earn"
            />
          </Field>
        </FormSection>

        <div className={formStickyFooter}>
          <button
            type="button"
            onClick={() => navigate(ap("money-features/refer-earn"))}
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
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
