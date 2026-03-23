import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  createInventoryCode,
  updateInventoryCode,
  getSingleInventoryCode,
  INVENTORY_CODE_TYPES,
} from "../../apis/inventoryCodeApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { Save, ArrowLeft, AlertCircle, Layers } from "lucide-react";

const typeLabels = {
  CATEGORY: "Category (e.g. TW-TS)",
  FIT: "Fit (e.g. SF)",
  COLOR: "Colour (e.g. BLK)",
  SECTION: "Section (e.g. DR)",
};

const InventoryCodeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    type: "CATEGORY",
    code: "",
    name: "",
    sortOrder: 0,
    isActive: true,
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getSingleInventoryCode(id);
        const row = res?.data ?? {};
        if (cancelled) return;
        setForm({
          type: row.type || "CATEGORY",
          code: row.code || "",
          name: row.name || "",
          sortOrder: row.sortOrder ?? 0,
          isActive: row.isActive !== false,
          remarks: row.remarks || "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Failed to load record");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === "sortOrder") {
      setForm((prev) => ({ ...prev, sortOrder: value === "" ? "" : Number(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const code = String(form.code).trim();
    const name = String(form.name).trim();
    if (!code) return setError("Code is required");
    if (!name) return setError("Name is required");

    const sortOrder =
      form.sortOrder === "" || form.sortOrder === null || Number.isNaN(Number(form.sortOrder))
        ? 0
        : Number(form.sortOrder);

    const payload = {
      type: form.type,
      code: code.toUpperCase(),
      name,
      sortOrder,
      isActive: Boolean(form.isActive),
      remarks: String(form.remarks || "").trim(),
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateInventoryCode(id, payload);
      } else {
        await createInventoryCode(payload);
      }
      navigate(ap("inventory-codes"));
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message || "Save failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={ap("inventory-codes")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-fit"
          >
            <ArrowLeft size={18} /> Back to list
          </Link>
          <Link
            to={ap("inventory-codes/sku-formula")}
            className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 w-fit"
          >
            <Layers size={18} /> SKU &amp; sku_uid formula
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit inventory code" : "Add inventory code"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Codes are stored in uppercase. Type + code must be unique.
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={loading}
              >
                {INVENTORY_CODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t] || t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. TW-TS, SF, BLK"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Display name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. T-Shirt, Slim Fit, Black"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sort order</label>
              <input
                name="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Remarks (optional)
              </label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={3}
                placeholder="Notes for ambiguous codes, etc."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto sm:px-8"
            >
              <Save size={18} />
              {loading ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InventoryCodeForm;
