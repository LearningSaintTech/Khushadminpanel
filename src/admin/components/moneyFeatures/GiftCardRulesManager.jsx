import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import {
  fieldClass,
  inputClass,
  labelClass,
  tableScrollShell,
} from "./moneyFeaturesShared";
import {
  createGiftCardRules,
  deleteGiftCardRules,
  listGiftCardRules,
  previewGiftCardCredit,
  toggleGiftCardRulesActive,
  updateGiftCardRules,
} from "../../apis/GiftCardRulesapi";

const DEFAULT_TIERS = {
  tier1MaxPay: 1000,
  tier1Multiplier: 2,
  tier2Threshold: 1000,
  tier2BonusPercent: 25,
};

const EMPTY_FORM = {
  name: "",
  description: "",
  currency: "INR",
  multiplier: 2,
  rulesText: "",
  isActive: false,
  imageFile: null,
  imageUrl: "",
  ...DEFAULT_TIERS,
};

function tiersFromDoc(doc) {
  const tiers = doc?.bonusTiers ?? [];
  const mult = tiers.find((t) => t.type === "multiplier");
  const excess = tiers.find((t) => t.type === "excess_bonus_percent");
  return {
    tier1MaxPay: mult?.maxPayAmount ?? DEFAULT_TIERS.tier1MaxPay,
    tier1Multiplier: mult?.multiplier ?? doc?.multiplier ?? DEFAULT_TIERS.tier1Multiplier,
    tier2Threshold: excess?.threshold ?? DEFAULT_TIERS.tier2Threshold,
    tier2BonusPercent: excess?.bonusPercent ?? DEFAULT_TIERS.tier2BonusPercent,
  };
}

function docToForm(doc) {
  if (!doc) return { ...EMPTY_FORM };
  const tiers = tiersFromDoc(doc);
  return {
    name: doc.name ?? "",
    description: doc.description ?? "",
    currency: doc.currency ?? "INR",
    multiplier: doc.multiplier ?? 2,
    rulesText: Array.isArray(doc.rules) ? doc.rules.join("\n") : "",
    isActive: Boolean(doc.isActive),
    imageFile: null,
    imageUrl: doc.image ?? "",
    ...tiers,
  };
}

function buildBonusTiers(form) {
  return [
    {
      type: "multiplier",
      maxPayAmount: Number(form.tier1MaxPay),
      multiplier: Number(form.tier1Multiplier),
    },
    {
      type: "excess_bonus_percent",
      threshold: Number(form.tier2Threshold),
      bonusPercent: Number(form.tier2BonusPercent),
    },
  ];
}

function buildFormData(form, { isCreate }) {
  const fd = new FormData();
  fd.append("name", form.name.trim());
  fd.append("description", form.description?.trim() ?? "");
  fd.append("currency", (form.currency || "INR").trim().toUpperCase());
  fd.append("multiplier", String(form.multiplier || form.tier1Multiplier || 2));
  fd.append("rules", JSON.stringify(
    form.rulesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  ));
  fd.append("bonusTiers", JSON.stringify(buildBonusTiers(form)));
  if (form.isActive) fd.append("isActive", "true");
  if (form.imageFile) fd.append("image", form.imageFile);
  if (isCreate && !form.imageFile) {
    throw new Error("Promotional image is required when creating a rule set");
  }
  return fd;
}

function formatTierSummary(doc) {
  if (Array.isArray(doc?.bonusSummary) && doc.bonusSummary.length) {
    return doc.bonusSummary.join(" · ");
  }
  const tiers = doc?.bonusTiers ?? [];
  const mult = tiers.find((t) => t.type === "multiplier");
  const excess = tiers.find((t) => t.type === "excess_bonus_percent");
  const parts = [];
  if (mult) {
    parts.push(
      mult.maxPayAmount != null
        ? `${mult.multiplier}× up to ₹${mult.maxPayAmount}`
        : `${mult.multiplier}×`,
    );
  }
  if (excess) {
    parts.push(`above ₹${excess.threshold}: +${excess.bonusPercent}% on excess`);
  }
  return parts.join(" · ") || `${doc?.multiplier ?? 2}× flat`;
}

const GiftCardRulesManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewAmount, setPreviewAmount] = useState("1100");
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listGiftCardRules(1, 50);
      const data = res?.data ?? res;
      setItems(data?.items ?? []);
    } catch (e) {
      setError(e?.message || "Failed to load gift card rules");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setSuccess("");
    setError("");
  };

  const openEdit = (doc) => {
    setEditingId(doc._id);
    setForm(docToForm(doc));
    setShowForm(true);
    setSuccess("");
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = buildFormData(form, { isCreate: !editingId });
      if (editingId) {
        await updateGiftCardRules(editingId, fd);
        setSuccess("Gift card rules updated");
      } else {
        await createGiftCardRules(fd);
        setSuccess("Gift card rules created");
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (doc) => {
    setError("");
    try {
      await toggleGiftCardRulesActive(doc._id, !doc.isActive);
      setSuccess(doc.isActive ? "Rule set deactivated" : "Rule set activated");
      await load();
    } catch (e) {
      setError(e?.message || "Could not change active status");
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteGiftCardRules(doc._id);
      setSuccess("Rule set deleted");
      if (editingId === doc._id) closeForm();
      await load();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  };

  const runPreview = async () => {
    const amount = Number(previewAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPreviewResult(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewGiftCardCredit(amount);
      setPreviewResult(res?.data ?? res);
    } catch (e) {
      setPreviewResult({ error: e?.message || "Preview failed" });
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(runPreview, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewAmount, items]);

  const activeRule = items.find((r) => r.isActive);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-success/30 bg-success-bg px-3 py-2 text-[11px] text-success">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto max-w-2xl text-[11px] text-stone-500">
          Only one rule set can be <strong>active</strong> at a time.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New rule set
        </button>
      </div>

      {activeRule ? (
        <div className="rounded-xl border border-success/30 bg-success-bg/60 p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
            <CheckCircle2 size={14} />
            Active for purchases
          </p>
          <p className="mt-1 text-xs font-semibold text-stone-900">{activeRule.name}</p>
          <p className="mt-0.5 text-[11px] text-stone-700">{formatTierSummary(activeRule)}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <p className={labelClass}>Live preview (active rules)</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className={labelClass}>Customer pays (₹)</span>
            <input
              type="number"
              min="1"
              value={previewAmount}
              onChange={(e) => setPreviewAmount(e.target.value)}
              className={`${fieldClass} w-32 tabular-nums`}
            />
          </label>
          {previewLoading ? (
            <span className="flex items-center gap-1 text-[11px] text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
              Calculating…
            </span>
          ) : previewResult?.error ? (
            <span className="text-[11px] text-danger">{previewResult.error}</span>
          ) : previewResult ? (
            <p className="text-[11px] text-stone-800">
              Gift card value:{" "}
              <strong className="text-success">
                ₹{Number(previewResult.creditAmount ?? previewResult.cardValue ?? 0).toLocaleString("en-IN")}
              </strong>
              {previewResult.appliedTierType ? (
                <span className="ml-2 text-stone-500">({previewResult.appliedTierType})</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-stone-400">
          Examples: ₹500 → ₹1,000 · ₹1,000 → ₹2,000 · ₹1,100 → ₹1,125
        </p>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-border bg-white p-3 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs font-semibold text-stone-900">
              {editingId ? "Edit rule set" : "Create rule set"}
            </h3>
            <button type="button" onClick={closeForm} className="text-stone-400 hover:text-stone-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs">
              <span className="text-[10px] text-slate-600">Name *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={`mt-1 ${fieldClass}`}
                placeholder="Khush Gift Card"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[10px] text-slate-600">Currency</span>
              <input
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className={`mt-1 ${fieldClass}`}
              />
            </label>
          </div>

          <label className="block text-xs">
            <span className="text-[10px] text-slate-600">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-amber-900">Tier 1 — Multiplier (pay up to cap)</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                <span className="text-[10px] text-slate-600">Max pay amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={form.tier1MaxPay}
                  onChange={(e) => setField("tier1MaxPay", e.target.value)}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
              <label className="text-xs">
                <span className="text-[10px] text-slate-600">Multiplier (e.g. 2 = 2×)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.tier1Multiplier}
                  onChange={(e) => {
                    setField("tier1Multiplier", e.target.value);
                    setField("multiplier", e.target.value);
                  }}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500">
              If pay ≤ max amount, gift card value = pay × multiplier.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <p className="text-[10px] font-semibold text-brand-900">Tier 2 — Bonus above threshold</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                <span className="text-[10px] text-slate-600">Threshold (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={form.tier2Threshold}
                  onChange={(e) => setField("tier2Threshold", e.target.value)}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
              <label className="text-xs">
                <span className="text-[10px] text-slate-600">Bonus % on excess</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tier2BonusPercent}
                  onChange={(e) => setField("tier2BonusPercent", e.target.value)}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500">
              If pay &gt; threshold: value = pay + (pay − threshold) × bonus%.
            </p>
          </div>

          <label className="block text-xs">
            <span className="text-[10px] text-slate-600">Terms shown to customer (one per line)</span>
            <textarea
              value={form.rulesText}
              onChange={(e) => setField("rulesText", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Gift cards can be purchased instantly..."
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <label className="block text-xs">
              <span className="text-[10px] text-slate-600">
                Promo image {!editingId && "*"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setField("imageFile", e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs"
              />
            </label>
            {(form.imageUrl || form.imageFile) && (
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
                <img
                  src={
                    form.imageFile
                      ? URL.createObjectURL(form.imageFile)
                      : form.imageUrl
                  }
                  alt="Preview"
                  className="max-h-28 mx-auto object-contain"
                />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
            />
            Set as active after save (deactivates other sets)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-canvas-muted/50 px-2 py-1.5">
          <h3 className="text-xs font-semibold text-stone-800">All rule sets</h3>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={`${inputClass} text-brand-600`}
          >
            Refresh
          </button>
        </div>
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[11px] text-stone-500">
            No rule sets yet. Create one above.
          </p>
        ) : (
          <div className={tableScrollShell}>
            <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">Name</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">Bonus</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">Status</th>
                  <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id} className="group border-t border-border/80 hover:bg-brand-50/30">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt=""
                            className="h-8 w-12 rounded-lg border border-border object-cover"
                          />
                        ) : null}
                        <span className="font-medium text-stone-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-2 py-2 text-[10px] text-stone-600">
                      {formatTierSummary(row)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          row.isActive
                            ? "bg-success-bg text-success"
                            : "bg-canvas-muted text-stone-600"
                        }`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title={row.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggle(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-stone-600 hover:bg-canvas-muted"
                        >
                          <Power size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftCardRulesManager;
