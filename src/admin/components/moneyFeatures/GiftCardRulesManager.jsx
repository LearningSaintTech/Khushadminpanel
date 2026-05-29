import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
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
    <div className="px-6 py-5 space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Purchase bonus rules</h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Customers pay an amount and receive a gift card with higher redeemable value.
            Only one rule set can be <strong>active</strong> at a time (used by app &amp; website).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Plus size={16} />
          New rule set
        </button>
      </div>

      {activeRule && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 flex items-center gap-1">
            <CheckCircle2 size={14} />
            Active for purchases
          </p>
          <p className="mt-1 font-semibold text-gray-900">{activeRule.name}</p>
          <p className="text-sm text-gray-700 mt-1">{formatTierSummary(activeRule)}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Live preview (uses active rules)</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Customer pays (₹)</span>
            <input
              type="number"
              min="1"
              value={previewAmount}
              onChange={(e) => setPreviewAmount(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 w-32"
            />
          </label>
          {previewLoading ? (
            <span className="text-sm text-gray-500">Calculating…</span>
          ) : previewResult?.error ? (
            <span className="text-sm text-red-600">{previewResult.error}</span>
          ) : previewResult ? (
            <p className="text-sm text-gray-800">
              Gift card value:{" "}
              <strong className="text-emerald-700">
                ₹{Number(previewResult.creditAmount ?? previewResult.cardValue ?? 0).toLocaleString("en-IN")}
              </strong>
              {previewResult.appliedTierType && (
                <span className="text-gray-500 ml-2">({previewResult.appliedTierType})</span>
              )}
            </p>
          ) : null}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Examples: ₹500 → ₹1,000 · ₹1,000 → ₹2,000 · ₹1,100 → ₹1,125
        </p>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {editingId ? "Edit rule set" : "Create rule set"}
            </h3>
            <button type="button" onClick={closeForm} className="text-gray-500 hover:text-gray-800">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-gray-600">Name *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Khush Gift Card"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Currency</span>
              <input
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-600">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-900">Tier 1 — Multiplier (pay up to cap)</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-600">Max pay amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={form.tier1MaxPay}
                  onChange={(e) => setField("tier1MaxPay", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-gray-600">Multiplier (e.g. 2 = 2×)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.tier1Multiplier}
                  onChange={(e) => {
                    setField("tier1Multiplier", e.target.value);
                    setField("multiplier", e.target.value);
                  }}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              If pay ≤ max amount, gift card value = pay × multiplier.
            </p>
          </div>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-indigo-900">Tier 2 — Bonus above threshold</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-600">Threshold (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={form.tier2Threshold}
                  onChange={(e) => setField("tier2Threshold", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-gray-600">Bonus % on excess</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tier2BonusPercent}
                  onChange={(e) => setField("tier2BonusPercent", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              If pay &gt; threshold: value = pay + (pay − threshold) × bonus%.
            </p>
          </div>

          <label className="block text-sm">
            <span className="text-gray-600">Terms shown to customer (one per line)</span>
            <textarea
              value={form.rulesText}
              onChange={(e) => setField("rulesText", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
              placeholder="Gift cards can be purchased instantly..."
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <label className="block text-sm">
              <span className="text-gray-600">
                Promo image {!editingId && "*"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setField("imageFile", e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
            {(form.imageUrl || form.imageFile) && (
              <div className="rounded-lg border border-gray-200 p-2 bg-gray-50">
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

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
            />
            Set as active after save (deactivates other sets)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">All rule sets</h3>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No gift card rule sets yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Bonus</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.image && (
                          <img
                            src={row.image}
                            alt=""
                            className="h-8 w-12 object-cover rounded border"
                          />
                        )}
                        <span className="font-medium text-gray-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                      {formatTierSummary(row)}
                    </td>
                    <td className="px-4 py-3">
                      {row.isActive ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title={row.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggle(row)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(row)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 size={15} />
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
