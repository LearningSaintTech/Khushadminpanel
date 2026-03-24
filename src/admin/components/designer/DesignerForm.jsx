import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createDesigner, getDesignerById, updateDesigner } from "../../apis/Designerapi";

const DesignerForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingDesigner, setLoadingDesigner] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
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
            countryCode: res.data?.countryCode || "+91",
            phoneNumber: res.data?.phoneNumber || "",
            email: res.data?.email || "",
            address: res.data?.address || "",
            city: res.data?.city || "",
            pinCode: res.data?.pinCode || "",
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
      if (isEdit) {
        await updateDesigner(id, payload);
      } else {
        await createDesigner(payload);
      }
      navigate("/admin/designer");
    } catch (err) {
      setError(err?.message || "Failed to save designer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-black p-3 sm:p-4">
      <div className="max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{isEdit ? "Edit Designer" : "Create Designer"}</h1>
      <p className="mb-3 text-xs sm:text-sm text-gray-500">Fill in designer details to manage profile access.</p>
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/30 p-3 sm:p-4 shadow-sm">
        {loadingDesigner ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Loading designer details...
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {["name", "countryCode", "phoneNumber", "email", "address", "city", "pinCode", "profileImage", "profileImageKey"].map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium capitalize text-gray-700">{key}</label>
              <input
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5"
                name={key}
                type={key === "email" ? "email" : key === "pinCode" ? "number" : key.includes("Image") ? "url" : "text"}
                value={form[key]}
                onChange={onChange}
                disabled={loadingDesigner}
                required={["name", "phoneNumber", "countryCode"].includes(key)}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <input
              type="checkbox"
              name="isActive"
              checked={Boolean(form.isActive)}
              onChange={onChange}
              disabled={loadingDesigner}
            />
            Is Active
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <input
              type="checkbox"
              name="isNumberVerified"
              checked={Boolean(form.isNumberVerified)}
              onChange={onChange}
              disabled={loadingDesigner}
            />
            Number Verified
          </label>
        </div>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button type="button" className="inline-flex items-center justify-center rounded-full border border-black/15 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-black hover:text-white transition-colors" onClick={() => navigate("/admin/designer")}>
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default DesignerForm;

