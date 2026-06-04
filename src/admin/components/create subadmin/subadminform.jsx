import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createSubAdmin,
  updateSubAdmin,
  getSubAdminById,
} from "../../apis/subadminapi";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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
} from "./subadminShared";

const SubAdminForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("subadmin"));
  };

  const [formData, setFormData] = useState({
    name: "",
    countryCode: "+91",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    role: "subadmin",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;

    const fetchSubAdmin = async () => {
      setFetching(true);
      try {
        const res = await getSubAdminById(id);
        if (res?.success) {
          setFormData({
            name: res.data.name || "",
            countryCode: res.data.countryCode || "+91",
            phoneNumber: res.data.phoneNumber || "",
            email: res.data.email || "",
            address: res.data.address || "",
            city: res.data.city || "",
            pinCode: res.data.pinCode || "",
            role: res.data.role || "subadmin",
          });
        } else {
          setError(res.message || "Failed to fetch sub-admin data");
        }
      } catch (err) {
        console.error("Failed to load subadmin:", err);
        setError("Failed to load sub-admin data");
      } finally {
        setFetching(false);
      }
    };

    fetchSubAdmin();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = isEdit
        ? await updateSubAdmin(id, formData)
        : await createSubAdmin(formData);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to save sub-admin");
      }

      navigate(ap("subadmin"));
    } catch (err) {
      setError(err.message || "Failed to save sub-admin");
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
            Edit sub-admin
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
          {isEdit ? "Edit sub-admin" : "Create sub-admin"}
        </h1>
        <button type="button" onClick={() => navigate(ap("subadmin"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <div className={alertDanger}>{error}</div> : null}

        <FormSection title="Account" hint="Login and contact details">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Email" required>
              <input
                name="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Country code">
              <input
                name="countryCode"
                placeholder="+91"
                value={formData.countryCode}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Phone number" required>
              <input
                name="phoneNumber"
                type="tel"
                placeholder="Phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Role">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="subadmin">Subadmin</option>
                <option value="super_subadmin">Super subadmin</option>
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Address" hint="Optional location fields">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="City">
              <input
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Pin code">
              <input
                name="pinCode"
                placeholder="Pin code"
                value={formData.pinCode}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea
                  name="address"
                  placeholder="Full address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <div className={formStickyFooter}>
          <button
            type="button"
            onClick={() => navigate(ap("subadmin"))}
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

export default SubAdminForm;
