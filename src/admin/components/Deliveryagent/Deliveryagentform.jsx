import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  createDeliveryAgent,
  getDeliveryAgentById,
  updateDeliveryAgent,
} from "../../apis/Driverapi";
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
  unwrapData,
} from "./deliveryAgentShared";

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

const defaultForm = {
  name: "",
  dob: "",
  countryCode: "+91",
  phoneNumber: "",
  email: "",
  address: "",
  city: "",
  pinCode: "",
  licenseNumber: "",
  licenseExpiry: "",
  bikeNumber: "",
  bikeModel: "",
  bikeBrand: "",
  isActive: true,
};

const DeliveryAgentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const isEdit = !!id;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("driver"));
  };

  const [formData, setFormData] = useState(defaultForm);
  const [licenseImageFile, setLicenseImageFile] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [existingLicenseImageUrl, setExistingLicenseImageUrl] = useState("");
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState("");
  const [licensePreviewUrl, setLicensePreviewUrl] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    const loadAgent = async () => {
      try {
        const res = await getDeliveryAgentById(id);
        const raw = unwrapData(res);
        const agent = raw?.deliveryAgent || raw;
        if (!agent || typeof agent !== "object") {
          toast.error("Agent not found");
          navigate(ap("driver"));
          return;
        }
        const formatDate = (val) => {
          if (!val) return "";
          const d = new Date(val);
          return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
        };
        setFormData({
          name: agent.name || "",
          dob: formatDate(agent.dob),
          countryCode: agent.countryCode || "+91",
          phoneNumber: agent.phoneNumber || "",
          email: agent.email || "",
          address: agent.address || "",
          city: agent.city || "",
          pinCode:
            agent.pinCode !== undefined && agent.pinCode !== ""
              ? String(agent.pinCode)
              : "",
          licenseNumber: agent.licenseNumber || "",
          licenseExpiry: formatDate(agent.licenseExpiry),
          bikeNumber: agent.bikeNumber || "",
          bikeModel: agent.bikeModel || "",
          bikeBrand: agent.bikeBrand || "",
          isActive: agent.isActive !== false,
        });
        setExistingLicenseImageUrl(agent.licenseImage?.trim() || "");
        setExistingProfileImageUrl(agent.profileImage?.trim() || "");
      } catch (err) {
        const msg = getBackendErrorMessage(err, "Failed to load agent data");
        setError(msg);
        toast.error(msg);
        navigate(ap("driver"));
      } finally {
        setFetching(false);
      }
    };
    loadAgent();
  }, [id, isEdit, navigate, ap]);

  useEffect(() => {
    if (licenseImageFile) {
      const url = URL.createObjectURL(licenseImageFile);
      setLicensePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLicensePreviewUrl(null);
  }, [licenseImageFile]);

  useEffect(() => {
    if (profileImageFile) {
      const url = URL.createObjectURL(profileImageFile);
      setProfilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setProfilePreviewUrl(null);
  }, [profileImageFile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", formData.name?.trim() ?? "");
    fd.append("countryCode", formData.countryCode?.trim() || "+91");
    fd.append("phoneNumber", formData.phoneNumber?.trim() ?? "");
    fd.append("isActive", formData.isActive);
    if (formData.email?.trim()) fd.append("email", formData.email.trim());
    if (formData.address?.trim()) fd.append("address", formData.address.trim());
    if (formData.city?.trim()) fd.append("city", formData.city.trim());
    if (formData.pinCode) fd.append("pinCode", String(formData.pinCode));
    if (formData.licenseNumber?.trim()) fd.append("licenseNumber", formData.licenseNumber.trim());
    if (formData.bikeNumber?.trim()) fd.append("bikeNumber", formData.bikeNumber.trim());
    if (formData.bikeModel?.trim()) fd.append("bikeModel", formData.bikeModel.trim());
    if (formData.bikeBrand?.trim()) fd.append("bikeBrand", formData.bikeBrand.trim());
    if (formData.dob) fd.append("dob", new Date(formData.dob).toISOString());
    if (formData.licenseExpiry) {
      fd.append("licenseExpiry", new Date(formData.licenseExpiry).toISOString());
    }
    fd.append("licenseImage", licenseImageFile || new File([], "licenseImage"));
    fd.append("profileImage", profileImageFile || new File([], "profileImage"));
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          name: formData.name?.trim(),
          countryCode: formData.countryCode?.trim() || "+91",
          phoneNumber: formData.phoneNumber?.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          pinCode: formData.pinCode ? Number(formData.pinCode) || formData.pinCode : undefined,
          licenseNumber: formData.licenseNumber?.trim() || undefined,
          bikeNumber: formData.bikeNumber?.trim() || undefined,
          bikeModel: formData.bikeModel?.trim() || undefined,
          bikeBrand: formData.bikeBrand?.trim() || undefined,
          isActive: formData.isActive,
        };
        if (formData.dob) payload.dob = new Date(formData.dob).toISOString();
        if (formData.licenseExpiry) {
          payload.licenseExpiry = new Date(formData.licenseExpiry).toISOString();
        }
        await updateDeliveryAgent(id, payload);
        toast.success("Delivery agent updated successfully.");
      } else {
        await createDeliveryAgent(buildFormData());
        toast.success("Delivery agent created. OTP sent for verification.");
      }
      navigate(ap("driver"));
    } catch (err) {
      const msg = getBackendErrorMessage(err, "Operation failed");
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
            Edit delivery agent
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
          {isEdit ? "Edit delivery agent" : "Create delivery agent"}
        </h1>
        <button type="button" onClick={() => navigate(ap("driver"))} className={btnOutline}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <div className={alertDanger}>{error}</div> : null}

        <FormSection title="Basic information" hint="Contact and personal details">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Full name" required>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Country code" required>
              <input
                type="text"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                placeholder="+91"
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Phone number" required>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                disabled={isEdit}
                className={fieldClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Address">
          <Field label="Street address">
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="City">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Pin code">
              <input
                type="text"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                placeholder="e.g. 110001"
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="License & vehicle">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="License number">
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="e.g. DL1234567890"
                className={fieldClass}
              />
            </Field>
            <Field label="License expiry">
              <input
                type="date"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Vehicle number">
              <input
                type="text"
                name="bikeNumber"
                value={formData.bikeNumber}
                onChange={handleChange}
                placeholder="e.g. DL01AB1234"
                className={fieldClass}
              />
            </Field>
            <Field label="Brand">
              <input
                type="text"
                name="bikeBrand"
                value={formData.bikeBrand}
                onChange={handleChange}
                placeholder="e.g. Honda"
                className={fieldClass}
              />
            </Field>
            <Field label="Model">
              <input
                type="text"
                name="bikeModel"
                value={formData.bikeModel}
                onChange={handleChange}
                placeholder="e.g. Activa"
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Documents" hint="Optional images for license and profile">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="License image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLicenseImageFile(e.target.files?.[0] || null)}
                className={`${fieldClass} file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700`}
              />
              {(licensePreviewUrl || (isEdit && existingLicenseImageUrl && !licenseImageFile)) && (
                <div className="relative mt-2 inline-block">
                  <img
                    src={licensePreviewUrl || existingLicenseImageUrl}
                    alt="License preview"
                    className="h-28 max-w-full rounded-lg border border-border object-contain"
                  />
                  {licensePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setLicenseImageFile(null)}
                      className="absolute right-1 top-1 rounded bg-danger px-1.5 py-0.5 text-[10px] text-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </Field>
            <Field label="Profile image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                className={`${fieldClass} file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700`}
              />
              {(profilePreviewUrl || (isEdit && existingProfileImageUrl && !profileImageFile)) && (
                <div className="relative mt-2 inline-block">
                  <img
                    src={profilePreviewUrl || existingProfileImageUrl}
                    alt="Profile preview"
                    className="h-28 max-w-full rounded-lg border border-border object-contain"
                  />
                  {profilePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileImageFile(null)}
                      className="absolute right-1 top-1 rounded bg-danger px-1.5 py-0.5 text-[10px] text-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </Field>
          </div>
        </FormSection>

        <FormSection title="Status">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-stone-700">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
            />
            Active — available for deliveries
          </label>
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("driver"))} className={btnOutline}>
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
                {isEdit ? "Update agent" : "Create agent"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryAgentForm;
