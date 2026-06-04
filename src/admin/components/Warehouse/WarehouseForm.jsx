import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createWarehouse,
  updateWarehouse,
  getWarehouseById,
} from "../../apis/Warehouseapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60";

const btnOutline =
  "inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-60";

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: {
      line: "",
      city: "",
      state: "",
      pinCode: "",
      country: "India",
    },
    isActive: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && id) {
      loadWarehouse();
    }
  }, [id, isEdit]);

  const loadWarehouse = async () => {
    try {
      setLoading(true);
      const response = await getWarehouseById(id);
      const warehouse = response?.data?.data || response?.data || {};

      if (warehouse) {
        const addr = warehouse.address || {};
        setForm({
          name: warehouse.name || "",
          code: warehouse.code || "",
          address: {
            line: addr.line || addr.address || "",
            city: addr.city || "",
            state: addr.state || "",
            pinCode: addr.pinCode || addr.pincode || "",
            country: addr.country || "India",
          },
          isActive: warehouse.isActive !== false,
        });
      }
    } catch (err) {
      console.error("Error loading warehouse:", err);
      setError("Failed to load warehouse data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
    setError("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("Warehouse name is required");
      return false;
    }
    if (!form.address.city.trim()) {
      setError("City is required");
      return false;
    }
    if (!form.address.state.trim()) {
      setError("State is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        address: {
          line: form.address.line.trim() || "",
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pinCode: form.address.pinCode.trim() || "",
          country: form.address.country.trim() || "India",
        },
        isActive: form.isActive,
      };

      if (isEdit) {
        await updateWarehouse(id, payload);
      } else {
        await createWarehouse(payload);
      }

      navigate(ap("warehouse"));
    } catch (err) {
      console.error("Error saving warehouse:", err);
      setError(err?.response?.data?.message || "Failed to save warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={btnOutline}
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          {isEdit ? "Edit warehouse" : "Create warehouse"}
        </h1>
        <button type="button" onClick={() => navigate(ap("warehouse"))} className={btnOutline}>
          Close
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-2.5 rounded-xl border border-border bg-white p-3 shadow-sm"
      >
        <div>
          <label className={labelClass}>
            Warehouse name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter warehouse name"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Warehouse code</label>
          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="e.g. MUM-01"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Address line</label>
          <textarea
            name="address.line"
            value={form.address.line}
            onChange={handleChange}
            placeholder="Enter street address"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              City <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="address.city"
              value={form.address.city}
              onChange={handleChange}
              placeholder="Enter city"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              State <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="address.state"
              value={form.address.state}
              onChange={handleChange}
              placeholder="Enter state"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Pincode</label>
            <input
              type="text"
              name="address.pinCode"
              value={form.address.pinCode}
              onChange={handleChange}
              placeholder="Enter pincode"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input
              type="text"
              name="address.country"
              value={form.address.country}
              onChange={handleChange}
              placeholder="Enter country"
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 pt-1 text-[12px] text-stone-700">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-100"
          />
          Active
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
          <button type="button" onClick={() => navigate(ap("warehouse"))} className={btnOutline}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Saving…" : isEdit ? "Update warehouse" : "Create warehouse"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WarehouseForm;
