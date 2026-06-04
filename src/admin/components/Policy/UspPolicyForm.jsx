import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { createPolicy, getPolicies, updatePolicy } from "../../apis/UspPolicy";
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
} from "./policyShared";

const initialForm = {
  text: "",
  policyType: "cancellation",
  order: "",
  isActive: true,
  icon: null,
};

async function fetchPolicyById(id) {
  let page = 1;
  const limit = 50;
  while (page <= 20) {
    const res = await getPolicies(page, limit);
    if (!res?.success) break;
    const list = res?.data?.policies || [];
    const found = list.find((p) => p._id === id);
    if (found) return found;
    const totalPages = res?.data?.pagination?.totalPages || 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return null;
}

export default function UspPolicyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("usp"));
  };

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const item = await fetchPolicyById(id);
        if (cancelled) return;
        if (!item) {
          setError("Policy not found");
          return;
        }
        setForm({
          text: item.text || "",
          policyType: item.policyType || "cancellation",
          order: item.order ?? "",
          isActive: item.isActive !== false,
          icon: null,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Could not load policy");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setForm((prev) => ({ ...prev, icon: files?.[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("text", form.text);
      formData.append("policyType", form.policyType);
      formData.append("order", form.order);
      formData.append("isActive", form.isActive);
      if (form.icon) formData.append("icon", form.icon);

      const response = isEdit
        ? await updatePolicy(id, formData)
        : await createPolicy(formData);

      if (response?.success === false) {
        throw new Error(response?.message || "Save failed");
      }
      toast.success(isEdit ? "Policy updated" : "Policy created");
      navigate(ap("usp"));
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Failed to save policy";
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
            Edit USP policy
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
          {isEdit ? "Edit USP policy" : "Create USP policy"}
        </h1>
        <button type="button" onClick={() => navigate(ap("usp"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
            {error}
          </div>
        ) : null}

        <FormSection title="Policy details" hint="Text shown on the storefront USP section.">
          <Field label="Policy text" required>
            <textarea
              name="text"
              value={form.text}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Enter policy text…"
              className={`${fieldClass} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Policy type">
              <select name="policyType" value={form.policyType} onChange={handleChange} className={fieldClass}>
                <option value="cancellation">Cancellation</option>
                <option value="shipping">Shipping</option>
                <option value="refund">Refund</option>
                <option value="exchange">Exchange</option>
                <option value="general">General</option>
              </select>
            </Field>
            <Field label="Display order">
              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                className={fieldClass}
                placeholder="e.g. 1"
              />
            </Field>
          </div>
          <Field label="Icon image">
            <input
              type="file"
              accept="image/*"
              name="icon"
              onChange={handleChange}
              className="block w-full text-[11px] text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-canvas-muted file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
            />
          </Field>
          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="h-3.5 w-3.5 rounded border-border accent-brand-600"
            />
            Active policy
          </label>
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("usp"))} disabled={saving} className={btnOutline}>
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
}
