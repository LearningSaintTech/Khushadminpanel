import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Settings2, Loader2, Save } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getEarningsPolicy, updateEarningsPolicy } from "../../apis/Earningsapi";
import {
  PageHeader,
  FormSection,
  Field,
  fieldClass,
  btnPrimary,
  StatCard,
  fmtInr,
  extractCommunityRecord,
} from "./earningsShared";

const EarningsPolicy = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    creatorCommissionRatePct: "",
    designerCommissionRatePct: "",
    minPayoutAmount: "",
    returnWindowDaysOverride: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEarningsPolicy();
      const data = extractCommunityRecord(res) || {};
      console.log("[Earnings] parsed policy", data);
      setForm({
        creatorCommissionRatePct:
          data.creatorCommissionRatePct != null
            ? String(data.creatorCommissionRatePct)
            : "",
        designerCommissionRatePct:
          data.designerCommissionRatePct != null
            ? String(data.designerCommissionRatePct)
            : "",
        minPayoutAmount:
          data.minPayoutAmount != null ? String(data.minPayoutAmount) : "",
        returnWindowDaysOverride:
          data.returnWindowDaysOverride != null
            ? String(data.returnWindowDaysOverride)
            : "",
      });
    } catch (err) {
      toast.error(err?.message || "Failed to load policy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        creatorCommissionRatePct: Number(form.creatorCommissionRatePct),
        designerCommissionRatePct: Number(form.designerCommissionRatePct),
        minPayoutAmount: Number(form.minPayoutAmount),
      };
      if (form.returnWindowDaysOverride !== "") {
        body.returnWindowDaysOverride = Number(form.returnWindowDaysOverride);
      }
      console.log("[Earnings] update policy body", body);
      await updateEarningsPolicy(body);
      toast.success("Policy updated");
      load();
    } catch (err) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl text-stone-900">
      <PageHeader
        icon={Settings2}
        title="Earnings policy"
        subtitle="PATCH /admin/earnings/policy"
        onRefresh={load}
        loading={loading}
        backLink={
          <Link
            to={ap("earnings")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Earnings
          </Link>
        }
      />

      {!loading ? (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Creator %"
            value={form.creatorCommissionRatePct || "—"}
            accent="brand"
          />
          <StatCard
            label="Designer %"
            value={form.designerCommissionRatePct || "—"}
            accent="violet"
          />
          <StatCard
            label="Min payout"
            value={
              form.minPayoutAmount !== ""
                ? fmtInr(form.minPayoutAmount)
                : "—"
            }
            accent="amber"
          />
          <StatCard
            label="Return days"
            value={form.returnWindowDaysOverride || "—"}
          />
        </div>
      ) : null}

      <FormSection
        title="Rates & thresholds"
        hint="Creator rate applies only with contentId attribution; designer rate with designedById."
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        ) : (
          <form onSubmit={handleSave} className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Creator commission %" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.creatorCommissionRatePct}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      creatorCommissionRatePct: e.target.value,
                    }))
                  }
                  placeholder="e.g. 5"
                />
              </Field>
              <Field label="Designer commission %" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.designerCommissionRatePct}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      designerCommissionRatePct: e.target.value,
                    }))
                  }
                  placeholder="e.g. 8"
                />
              </Field>
              <Field label="Min payout amount (₹)" required>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClass}
                  value={form.minPayoutAmount}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      minPayoutAmount: e.target.value,
                    }))
                  }
                  placeholder="e.g. 500"
                />
              </Field>
              <Field
                label="Return window days override"
                hint="Optional — leave blank to use default"
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={fieldClass}
                  value={form.returnWindowDaysOverride}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      returnWindowDaysOverride: e.target.value,
                    }))
                  }
                  placeholder="e.g. 7"
                />
              </Field>
            </div>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save policy
            </button>
          </form>
        )}
      </FormSection>
    </div>
  );
};

export default EarningsPolicy;
