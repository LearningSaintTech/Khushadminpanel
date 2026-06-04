import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createExchange,
  updateExchange,
  getSingleExchange,
} from "../../apis/Exchangeapi";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
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

const ExchangeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("exchange"));
  };

  const [formData, setFormData] = useState({
    maxExchangeTimeInDays: "",
    maxExchangeLimit: "",
    exchangeReasons: [],
  });
  const [reasonInput, setReasonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    const fetchExchangePolicy = async () => {
      try {
        setFetching(true);
        const res = await getSingleExchange(id);
        if (res?.success && res.data) {
          setFormData({
            maxExchangeTimeInDays: String(res.data.maxExchangeTimeInDays || ""),
            maxExchangeLimit: String(res.data.maxExchangeLimit || ""),
            exchangeReasons: res.data.exchangeReasons || [],
          });
        }
      } catch (err) {
        console.error("Failed to load exchange policy:", err);
        setError("Failed to load existing policy.");
      } finally {
        setFetching(false);
      }
    };
    fetchExchangePolicy();
  }, [id, isEdit]);

  const handleAddReason = () => {
    const trimmed = reasonInput.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      exchangeReasons: [...prev.exchangeReasons, trimmed],
    }));
    setReasonInput("");
  };

  const handleRemoveReason = (index) => {
    setFormData((prev) => ({
      ...prev,
      exchangeReasons: prev.exchangeReasons.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (formData.exchangeReasons.length === 0) {
      setError("Please add at least one exchange reason.");
      return;
    }
    if (!formData.maxExchangeTimeInDays || !formData.maxExchangeLimit) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        maxExchangeTimeInDays: Number(formData.maxExchangeTimeInDays),
        maxExchangeLimit: Number(formData.maxExchangeLimit),
        exchangeReasons: formData.exchangeReasons,
      };
      if (isEdit) await updateExchange(id, payload);
      else await createExchange(payload);
      navigate(ap("exchange"));
    } catch (err) {
      console.error("Save error:", err);
      setError(err?.response?.data?.message || "Failed to save exchange policy. Please try again.");
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
            Edit exchange policy
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
          {isEdit ? "Edit exchange policy" : "Create exchange policy"}
        </h1>
        <button type="button" onClick={() => navigate(ap("exchange"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <div className={alertDanger}>{error}</div> : null}

        <FormSection title="Exchange limits" hint="Maximum window and value for customer exchanges.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Max exchange period (days)" required>
              <input
                type="number"
                min="1"
                value={formData.maxExchangeTimeInDays}
                onChange={(e) =>
                  setFormData({ ...formData, maxExchangeTimeInDays: e.target.value })
                }
                className={fieldClass}
                placeholder="e.g. 30"
                required
              />
            </Field>
            <Field label="Max exchange limit (₹)" required>
              <input
                type="number"
                min="1"
                value={formData.maxExchangeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, maxExchangeLimit: e.target.value })
                }
                className={fieldClass}
                placeholder="e.g. 5000"
                required
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Valid exchange reasons" hint="Add at least one reason customers can select.">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddReason();
                }
              }}
              className={fieldClass}
              placeholder="e.g. Defective product, Wrong size…"
            />
            <button
              type="button"
              onClick={handleAddReason}
              disabled={!reasonInput.trim()}
              className={`${btnPrimary} shrink-0 disabled:opacity-50`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add
            </button>
          </div>
          <div className="min-h-[72px] space-y-2">
            {formData.exchangeReasons.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-canvas-muted p-4 text-center text-[11px] text-stone-500">
                No reasons added yet.
              </div>
            ) : (
              formData.exchangeReasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-border bg-canvas-muted px-2.5 py-2"
                >
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => {
                      const updated = [...formData.exchangeReasons];
                      updated[index] = e.target.value;
                      setFormData((prev) => ({ ...prev, exchangeReasons: updated }));
                    }}
                    className="flex-1 border-none bg-transparent p-0 text-[11px] text-stone-800 focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveReason(index)}
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-danger-bg hover:text-danger"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ))
            )}
          </div>
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("exchange"))} className={btnOutline}>
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

export default ExchangeForm;
