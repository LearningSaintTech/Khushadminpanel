import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createDesigner, getDesignerById, updateDesigner } from "../../apis/Designerapi";
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
} from "./designerShared";

const FIELD_LABELS = {
  name: "Name",
  employeeId: "Employee ID",
  countryCode: "Country code",
  phoneNumber: "Phone number",
  email: "Email",
  address: "Address",
  city: "City",
  pinCode: "Pin code",
  profileImage: "Profile image URL",
  profileImageKey: "Profile image key",
};

const DesignerForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("designer"));
  };

  const [loading, setLoading] = useState(false);
  const [loadingDesigner, setLoadingDesigner] = useState(isEdit);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    employeeId: "",
    countryCode: "+91",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    pinCode: "",
    profileImage: "",
    profileImageKey: "",
    isActive: false,
    isNumberVerified: false,
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoadingDesigner(true);
      setError("");
      try {
        const res = await getDesignerById(id);
        if (res?.success) {
          setForm({
            name: res.data?.name || "",
            employeeId: res.data?.employeeId || "",
            countryCode: res.data?.countryCode || "+91",
            phoneNumber: res.data?.phoneNumber || "",
            email: res.data?.email || "",
            address: res.data?.address || "",
            city: res.data?.city || "",
            pinCode: res.data?.pinCode != null ? String(res.data.pinCode) : "",
            profileImage: res.data?.profileImage || "",
            profileImageKey: res.data?.profileImageKey || "",
            isActive: Boolean(res.data?.isActive),
            isNumberVerified: Boolean(res.data?.isNumberVerified),
          });
        }
      } catch (err) {
        setError(err?.message || "Failed to load designer details.");
      } finally {
        setLoadingDesigner(false);
      }
    })();
  }, [id, isEdit]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        pinCode: form.pinCode ? Number(form.pinCode) : 0,
      };
      if (isEdit) await updateDesigner(id, payload);
      else await createDesigner(payload);
      navigate(ap("designer"));
    } catch (err) {
      setError(err?.message || "Failed to save designer.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingDesigner) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto text-base font-bold sm:text-lg">Edit designer</h1>
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
          {isEdit ? "Edit designer" : "Create designer"}
        </h1>
        <button type="button" onClick={() => navigate(ap("designer"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {error ? <div className={alertDanger}>{error}</div> : null}

        <FormSection title="Account" hint="Contact and employee details">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "name",
              "employeeId",
              "countryCode",
              "phoneNumber",
              "email",
              "city",
              "pinCode",
            ].map((key) => (
              <Field
                key={key}
                label={FIELD_LABELS[key]}
                required={["name", "employeeId", "phoneNumber", "countryCode"].includes(key)}
              >
                <input
                  className={fieldClass}
                  name={key}
                  type={
                    key === "email"
                      ? "email"
                      : key === "pinCode"
                        ? "number"
                        : "text"
                  }
                  value={form[key]}
                  onChange={onChange}
                  required={["name", "employeeId", "phoneNumber", "countryCode"].includes(key)}
                />
              </Field>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Address">
                <textarea
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection title="Profile & flags">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Profile image URL">
              <input
                className={fieldClass}
                name="profileImage"
                type="url"
                value={form.profileImage}
                onChange={onChange}
              />
            </Field>
            <Field label="Profile image key">
              <input
                className={fieldClass}
                name="profileImageKey"
                value={form.profileImageKey}
                onChange={onChange}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="isActive"
                checked={Boolean(form.isActive)}
                onChange={onChange}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="isNumberVerified"
                checked={Boolean(form.isNumberVerified)}
                onChange={onChange}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Number verified
            </label>
          </div>
        </FormSection>

        <div className={formStickyFooter}>
          <button type="button" onClick={() => navigate(ap("designer"))} className={btnOutline}>
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

export default DesignerForm;
