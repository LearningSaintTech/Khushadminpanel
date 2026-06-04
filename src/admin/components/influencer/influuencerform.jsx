import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createInfluencer,
  updateInfluencer,
  getInfluencerById,
} from "../../apis/Influencer";
import { toast } from "react-toastify";
import { ArrowLeft, Plus, X, Loader2, Save, Trash2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  alertDanger,
  btnOutline,
  btnPrimary,
  Field,
  fieldClass,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./influencerShared";

const DIGITAL_SOURCE_OPTIONS = ["instagram", "youtube", "facebook", "twitter", "tiktok", "other"];

function getBackendErrorMessage(err, fallback = "Something went wrong") {
  if (err == null) return fallback;
  if (typeof err === "string" && err.trim()) return err.trim();
  const data = err?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    return typeof first === "string" ? first : first?.msg || first?.message || fallback;
  }
  if (typeof data?.error === "string") return data.error;
  if (typeof err?.message === "string" && err.message) return err.message;
  return fallback;
}

const InfluencerForm = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const { id } = useParams();
  const isEdit = !!id;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("influencer"));
  };

  const [formData, setFormData] = useState({
    name: "",
    countryCode: "+91",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    digitalSources: [],
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const normalizePlatform = (value) =>
    DIGITAL_SOURCE_OPTIONS.includes(value) ? value : "other";

  useEffect(() => {
    if (!isEdit) return;
    const fetchInfluencer = async () => {
      setFetching(true);
      setError("");
      try {
        const res = await getInfluencerById(id);
        const data = res?.data ?? res;
        const payload = data?.data ?? data;
        if (payload && typeof payload === "object") {
          const sources = Array.isArray(payload.digitalSources) ? payload.digitalSources : [];
          setFormData({
            name: payload.name || "",
            countryCode: payload.countryCode || "+91",
            phoneNumber: payload.phoneNumber || "",
            email: payload.email || "",
            address: payload.address || "",
            city: payload.city || "",
            pinCode:
              payload.pinCode !== undefined && payload.pinCode !== ""
                ? String(payload.pinCode)
                : "",
            digitalSources: sources.map((s) => ({
              platform: normalizePlatform((s.platform || "").toLowerCase()),
              handle: s.handle || "",
              followers: s.followers !== undefined ? String(s.followers) : "",
              verified: !!s.verified,
              link: s.link || "",
            })),
          });
        } else {
          const msg = res?.message || data?.message || "Failed to fetch influencer data";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getBackendErrorMessage(err, "Failed to load influencer data");
        setError(msg);
        toast.error(msg);
      } finally {
        setFetching(false);
      }
    };
    fetchInfluencer();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleDigitalChange = (index, field, value) => {
    const updated = [...formData.digitalSources];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, digitalSources: updated });
  };

  const addDigitalSource = () => {
    setFormData({
      ...formData,
      digitalSources: [
        ...formData.digitalSources,
        {
          platform: DIGITAL_SOURCE_OPTIONS[0],
          handle: "",
          followers: "",
          verified: false,
          link: "",
        },
      ],
    });
  };

  const removeDigitalSource = (index) => {
    setFormData({
      ...formData,
      digitalSources: formData.digitalSources.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      if (id) {
        await updateInfluencer(id, formData);
        toast.success("Influencer updated successfully.");
      } else {
        await createInfluencer(formData);
        toast.success("Influencer created successfully.");
      }
      navigate(ap("influencer"));
    } catch (err) {
      const msg = getBackendErrorMessage(err, "Failed to save influencer");
      setError(msg);
      toast.error(msg);
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
            Edit influencer
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
          {isEdit ? "Edit influencer" : "Create influencer"}
        </h1>
        <button type="button" onClick={() => navigate(ap("influencer"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <div className={alertDanger}>{error}</div> : null}

        <FormSection title="Basic information" hint="Contact and location details">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={fieldClass}
                placeholder="Full name"
              />
            </Field>
            <Field label="Email" required>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={fieldClass}
                placeholder="email@example.com"
              />
            </Field>
            <Field label="Country code">
              <input
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                className={fieldClass}
                placeholder="+91"
              />
            </Field>
            <Field label="Phone number" required>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className={fieldClass}
                placeholder="Phone number"
              />
            </Field>
            <Field label="City">
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={fieldClass}
                placeholder="City"
              />
            </Field>
            <Field label="Pin code">
              <input
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                className={fieldClass}
                placeholder="Pin code"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                  placeholder="Full address"
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection title="Digital sources" hint="Social profiles and follower counts">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addDigitalSource}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add platform
            </button>
          </div>
          {formData.digitalSources.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-canvas-muted py-6 text-center text-[11px] text-stone-500">
              No platforms added yet.
            </p>
          ) : (
            formData.digitalSources.map((src, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-canvas-muted/30 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-800">
                    Platform {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDigitalSource(index)}
                    className="rounded-lg p-1 text-danger hover:bg-danger-bg"
                    aria-label="Remove platform"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Platform" required>
                    <select
                      value={
                        DIGITAL_SOURCE_OPTIONS.includes(src.platform) ? src.platform : "other"
                      }
                      onChange={(e) => handleDigitalChange(index, "platform", e.target.value)}
                      className={fieldClass}
                    >
                      {DIGITAL_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Handle" required>
                    <input
                      value={src.handle}
                      onChange={(e) => handleDigitalChange(index, "handle", e.target.value)}
                      className={fieldClass}
                      placeholder="@username"
                    />
                  </Field>
                  <Field label="Followers">
                    <input
                      type="number"
                      value={src.followers}
                      onChange={(e) => handleDigitalChange(index, "followers", e.target.value)}
                      className={fieldClass}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Profile link">
                    <input
                      type="url"
                      value={src.link}
                      onChange={(e) => handleDigitalChange(index, "link", e.target.value)}
                      className={fieldClass}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-stone-700">
                  <input
                    type="checkbox"
                    checked={src.verified}
                    onChange={(e) => handleDigitalChange(index, "verified", e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                  />
                  Verified account
                </label>
              </div>
            ))
          )}
        </FormSection>

        <div className={formStickyFooter}>
          <button
            type="button"
            onClick={() => navigate(ap("influencer"))}
            disabled={loading}
            className={btnOutline}
          >
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

export default InfluencerForm;
