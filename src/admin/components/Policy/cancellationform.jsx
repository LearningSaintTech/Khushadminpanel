import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createCancellation,
  updateCancellation,
  getSingleCancellation,
} from "../../apis/CancellationPolicyapi";
import { Save, ArrowLeft, AlertCircle, Plus, Trash, Loader2 } from "lucide-react";
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
  alertDanger,
} from "./policyShared";

const CancellationPolicyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("cancellation"));
  };

  const [form, setForm] = useState({
    name: "",
    description: "",
    cancellationReasons: "",
  });
  const [policies, setPolicies] = useState([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    const loadPolicy = async () => {
      try {
        setFetching(true);
        const res = await getSingleCancellation(id);
        const p = res?.data || {};
        setForm({
          name: p.name || "",
          description: p.description || "",
          cancellationReasons: p.cancellationReasons?.join(", ") || "",
        });
        if (p.policies) {
          const arr = Object.entries(p.policies).map(([key, val]) => ({
            key,
            value: Array.isArray(val) ? val.join(", ") : val.toString(),
          }));
          setPolicies(arr.length ? arr : [{ key: "", value: "" }]);
        }
      } catch {
        setError("Failed to load policy data");
      } finally {
        setFetching(false);
      }
    };
    loadPolicy();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePolicyChange = (index, field, value) => {
    const updated = [...policies];
    updated[index][field] = value;
    setPolicies(updated);
  };

  const addPolicy = () => setPolicies([...policies, { key: "", value: "" }]);
  const removePolicy = (index) => setPolicies(policies.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const reasons = form.cancellationReasons
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (!form.name.trim()) return setError("Policy name is required");
    if (reasons.length === 0) return setError("At least one cancellation reason is required");

    const policiesObj = {};
    policies.forEach((p) => {
      if (!p.key) return;
      const values = p.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const num = Number(v);
          return Number.isNaN(num) ? v : num;
        });
      policiesObj[p.key] = values.length === 1 ? values[0] : values;
    });

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      cancellationReasons: reasons,
      policies: policiesObj,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateCancellation(id, payload);
        alert("Policy updated successfully!");
      } else {
        await createCancellation(payload);
        alert("Policy created successfully!");
      }
      navigate(ap("cancellation"));
    } catch (err) {
      setError(err?.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Edit cancellation policy
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
          {isEdit ? "Edit cancellation policy" : "Create cancellation policy"}
        </h1>
        <button type="button" onClick={() => navigate(ap("cancellation"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <div className={`${alertDanger} flex items-center gap-2`}>
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}

        <FormSection title="Policy details">
          <Field label="Policy name" required>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Standard Policy"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </Field>
          <Field label="Cancellation reasons" required>
            <input
              type="text"
              name="cancellationReasons"
              value={form.cancellationReasons}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Changed mind, Wrong size"
            />
            <p className="mt-1 text-[10px] text-stone-500">Separate reasons with commas</p>
          </Field>
        </FormSection>

        <FormSection
          title="Policy rules"
          hint="Optional key/value rules (comma-separated values)."
        >
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={addPolicy}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add rule
            </button>
          </div>
          {policies.map((policy, index) => (
            <div key={index} className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Policy key"
                value={policy.key}
                onChange={(e) => handlePolicyChange(index, "key", e.target.value)}
                className={`${fieldClass} sm:w-1/2`}
              />
              <input
                type="text"
                placeholder="Value (comma separated)"
                value={policy.value}
                onChange={(e) => handlePolicyChange(index, "value", e.target.value)}
                className={`${fieldClass} sm:w-1/2`}
              />
              <button
                type="button"
                onClick={() => removePolicy(index)}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg px-2.5 py-1.5 text-[11px] font-semibold text-danger transition hover:bg-danger/10"
                title="Remove"
              >
                <Trash className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("cancellation"))} className={btnOutline}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? (
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

export default CancellationPolicyForm;
