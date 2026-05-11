import { useEffect, useMemo, useState } from "react";
import {
  createDesignerSizeChart,
  deleteDesignerSizeChart,
  listDesignerSizeCharts,
  updateDesignerSizeChart,
} from "../../apis/designerApi";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import { Plus, Trash2 } from "lucide-react";
import {
  SIZE_CHART_PRESETS,
  mergeSizeChartsWithPreset,
} from "../../../utils/sizeChartPresets";

const emptyChartSide = () => ({
  headers: [],
  rows: [],
  measureImages: [],
});

const emptySizeCharts = () => ({
  in: emptyChartSide(),
  cm: emptyChartSide(),
});

const isLocalPickedFile = (img) => {
  if (img == null || typeof img !== "object") return false;
  if (typeof File !== "undefined" && img instanceof File) return true;
  if (typeof Blob !== "undefined" && img instanceof Blob) return true;
  return false;
};

const buildInitialForm = () => ({
  name: "",
  description: "",
  isActive: true,
  gender: "men",
  category: "upper",
  sizeCharts: emptySizeCharts(),
});

const mapRowsFromApi = (rows) =>
  Array.isArray(rows)
    ? rows.map((row) => {
        const raw = row?.measurements;
        const measurements =
          raw instanceof Map
            ? Object.fromEntries(raw.entries())
            : raw && typeof raw === "object"
              ? raw
              : {};
        return { size: row?.size || "", measurements };
      })
    : [];

const toFormSizeCharts = (row) => {
  const next = emptySizeCharts();
  if (row?.sizeCharts && typeof row.sizeCharts === "object") {
    ["in", "cm"].forEach((side) => {
      const src = row.sizeCharts?.[side];
      next[side] = {
        headers: Array.isArray(src?.headers) ? src.headers : [],
        rows: mapRowsFromApi(src?.rows),
        measureImages: Array.isArray(src?.measureImage)
          ? src.measureImage.map((m) => m?.url || "").filter(Boolean)
          : [],
      };
    });
    return next;
  }
  if (row?.sizeChart && typeof row.sizeChart === "object") {
    const side = row.sizeChart.unit === "cm" ? "cm" : "in";
    next[side] = {
      headers: Array.isArray(row.sizeChart.headers)
        ? row.sizeChart.headers
        : [],
      rows: mapRowsFromApi(row.sizeChart.rows),
      measureImages: Array.isArray(row.sizeChart.measureImage)
        ? row.sizeChart.measureImage.map((m) => m?.url || "").filter(Boolean)
        : [],
    };
  }
  return next;
};

const DesignerSizeChartManager = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [activeSide, setActiveSide] = useState("in");
  const [form, setForm] = useState(buildInitialForm());
  const [errors, setErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const fieldClass =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  const fetchRows = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const res = await listDesignerSizeCharts({
        page,
        limit: 10,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      if (res?.success) {
        setRows(res?.data?.items || []);
        setPagination(res?.data?.pagination || { totalPages: 1, total: 0 });
      } else {
        setErrors(
          extractBackendMessages(
            res || { message: "Could not load size charts." },
          ),
        );
      }
    } catch (e) {
      setErrors(extractBackendMessages(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, debouncedSearch]);

  const resetForm = () => {
    setForm(buildInitialForm());
    setEditingId("");
    setShowForm(false);
  };

  const openCreate = () => {
    setErrors([]);
    setSuccessMsg("");
    setForm(buildInitialForm());
    setEditingId("");
    setShowForm(true);
  };

  const openEdit = (row) => {
    setErrors([]);
    setSuccessMsg("");
    setEditingId(row?._id || "");
    setForm({
      name: row?.name || "",
      description: row?.description || "",
      isActive: row?.isActive !== false,
      gender: "men",
      category: "upper",
      sizeCharts: toFormSizeCharts(row),
    });
    setShowForm(true);
  };

  const addHeader = (side) =>
    setForm((s) => ({
      ...s,
      sizeCharts: {
        ...s.sizeCharts,
        [side]: {
          ...s.sizeCharts[side],
          headers: [
            ...(s.sizeCharts[side].headers || []),
            { key: "", label: "" },
          ],
        },
      },
    }));

  const updateHeader = (side, index, field, value) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const headers = [...(chart.headers || [])];
      const current = { ...(headers[index] || {}) };
      current[field] = value;
      headers[index] = current;
      return {
        ...s,
        sizeCharts: { ...s.sizeCharts, [side]: { ...chart, headers } },
      };
    });

  const removeHeader = (side, index) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            headers: (chart.headers || []).filter((_, i) => i !== index),
          },
        },
      };
    });

  const addRow = (side) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const measurements = {};
      (chart.headers || []).forEach((h) => {
        const k = String(h?.key || "").trim();
        if (k) measurements[k] = "";
      });
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            rows: [...(chart.rows || []), { size: "", measurements }],
          },
        },
      };
    });

  const updateRow = (side, rowIndex, field, value) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const rows = [...(chart.rows || [])];
      const current = { ...(rows[rowIndex] || {}) };
      if (field === "size") current.size = value;
      else
        current.measurements = {
          ...(current.measurements || {}),
          [field]: value,
        };
      rows[rowIndex] = current;
      return {
        ...s,
        sizeCharts: { ...s.sizeCharts, [side]: { ...chart, rows } },
      };
    });

  const removeRow = (side, rowIndex) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            rows: (chart.rows || []).filter((_, i) => i !== rowIndex),
          },
        },
      };
    });

  const addMeasureImageUrl = (side) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            measureImages: [...(chart.measureImages || []), ""],
          },
        },
      };
    });

  const addMeasureImageFiles = (side, files) => {
    if (!files?.length) return;
    const next = Array.from(files);
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            measureImages: [...(chart.measureImages || []), ...next],
          },
        },
      };
    });
  };

  const updateMeasureImageUrl = (side, index, value) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const list = [...(chart.measureImages || [])];
      list[index] = value;
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: { ...chart, measureImages: list },
        },
      };
    });

  const removeMeasureImageUrl = (side, index) =>
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            measureImages: (chart.measureImages || []).filter(
              (_, i) => i !== index,
            ),
          },
        },
      };
    });

  const applyPreset = () => {
    const genderKey = SIZE_CHART_PRESETS[form.gender] ? form.gender : "unisex";
    const preset = SIZE_CHART_PRESETS[genderKey]?.[form.category];
    if (!preset) return;
    setForm((s) => ({
      ...s,
      sizeCharts: mergeSizeChartsWithPreset(s.sizeCharts, preset),
    }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    setSuccessMsg("");
    try {
      const buildChartPayload = (side) => {
        const chart = form.sizeCharts[side];
        const headers = (chart.headers || []).filter(
          (h) => String(h?.key || "").trim() && String(h?.label || "").trim(),
        );
        const rows = (chart.rows || [])
          .filter((r) => String(r?.size || "").trim())
          .map((r) => ({
            size: String(r.size || "").trim(),
            measurements: Object.fromEntries(
              Object.entries(r.measurements || {}).map(([k, v]) => [
                k,
                v === "" ? null : Number(v),
              ]),
            ),
          }));
        const measureImage = (chart.measureImages || [])
          .map((img, idx) => {
            if (isLocalPickedFile(img)) {
              return {
                imageKey: `${side === "in" ? "measureImagesIn" : "measureImagesCm"}/${idx}`,
              };
            }
            const url = String(img || "").trim();
            if (!url) return null;
            return { url, imageKey: "" };
          })
          .filter(Boolean);
        return { headers, rows, measureImage };
      };

      const sizeCharts = {
        in: buildChartPayload("in"),
        cm: buildChartPayload("cm"),
      };

      const useLegacyUnit =
        (sizeCharts.in.rows.length ||
          sizeCharts.in.headers.length ||
          sizeCharts.in.measureImage.length) > 0
          ? "in"
          : "cm";
      const sizeChart = {
        unit: useLegacyUnit,
        headers: sizeCharts[useLegacyUnit].headers,
        rows: sizeCharts[useLegacyUnit].rows,
        measureImage: sizeCharts[useLegacyUnit].measureImage,
      };

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: Boolean(form.isActive),
        sizeCharts,
        sizeChart,
      };
      if (!payload.name) {
        throw { message: "Name is required." };
      }

      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("description", payload.description);
      formData.append("isActive", String(payload.isActive));
      formData.append("sizeCharts", JSON.stringify(payload.sizeCharts));
      formData.append("sizeChart", JSON.stringify(payload.sizeChart));

      (form.sizeCharts.in.measureImages || []).forEach((img) => {
        if (isLocalPickedFile(img)) formData.append("measureImagesIn", img);
      });
      (form.sizeCharts.cm.measureImages || []).forEach((img) => {
        if (isLocalPickedFile(img)) formData.append("measureImagesCm", img);
      });

      if (isEditing) {
        await updateDesignerSizeChart(editingId, formData);
        setSuccessMsg("Size chart updated successfully.");
      } else {
        await createDesignerSizeChart(formData);
        setSuccessMsg("Size chart created successfully.");
      }
      resetForm();
      await fetchRows();
    } catch (e2) {
      setErrors(extractBackendMessages(e2));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this size chart template?");
    if (!ok) return;
    setDeletingId(id);
    setErrors([]);
    setSuccessMsg("");
    try {
      await deleteDesignerSizeChart(id);
      setSuccessMsg("Size chart deleted successfully.");
      await fetchRows();
    } catch (e) {
      setErrors(extractBackendMessages(e));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Size chart templates
          </h1>
          <p className="text-xs text-gray-500">
            Create reusable templates for item creation.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create template
        </button>
      </div>

      <input
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        placeholder="Search by name or description"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successMsg}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <ul className="list-disc pl-5">
            {errors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full table-auto lg:min-w-full text-sm">
          {" "}
          <thead className="bg-gray-50/90">
            <tr>
              <th className="p-1.5 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="p-1.5 text-left font-semibold text-gray-700">
                Description
              </th>
              <th className="p-2.5 text-left font-semibold text-gray-700">
                Status
              </th>
              <th className="p-2.5 text-left font-semibold text-gray-700">
                Updated
              </th>
              <th className="p-2.5 text-right font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-center text-gray-500" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-center text-gray-500" colSpan={5}>
                  No templates found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-gray-100">
                  <td className="p-2.5 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="p-2.5 text-gray-700">
                    {row.description || "-"}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive
                          ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-2.5 text-gray-600">
                    {row.updatedAt
                      ? new Date(row.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row._id)}
                        disabled={deletingId === row._id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center text-sm text-gray-500">
            No templates found.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row._id}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {row.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.description || "-"}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    row.isActive
                      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                  }`}
                >
                  {row.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Updated:{" "}
                {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-medium text-indigo-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row._id)}
                  disabled={deletingId === row._id}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <span className="text-xs text-gray-500">
          Total: {pagination.total || 0}
        </span>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          Page {page} / {pagination.totalPages || 1}
        </span>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page >= (pagination.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {showForm ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-hidden">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing
                  ? "Edit size chart template"
                  : "Create size chart template"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <form
              onSubmit={onSave}
              className="space-y-3 overflow-x-hidden px-3 pb-6 sm:px-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    value={form.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: e.target.value === "true",
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-gray-700">
                      Gender preset
                    </label>
                    <select
                      className={fieldClass}
                      value={form.gender}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, gender: e.target.value }))
                      }
                    >
                      <option value="men">men</option>
                      <option value="women">women</option>
                      <option value="unisex">unisex</option>
                      <option value="kids">kids</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-gray-700">
                      Garment type
                    </label>
                    <select
                      className={fieldClass}
                      value={form.category}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, category: e.target.value }))
                      }
                    >
                      <option value="upper">Upper</option>
                      <option value="lower">Lower</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={applyPreset}
                      className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
                    >
                      Apply preset
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["in", "cm"].map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setActiveSide(side)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        activeSide === side
                          ? "bg-indigo-600 text-white"
                          : "border border-indigo-200 bg-white text-indigo-700"
                      }`}
                    >
                      {side === "in" ? "Inches (in)" : "Centimeters (cm)"}
                    </button>
                  ))}
                </div>

                <div className="mt-3 rounded-lg border border-indigo-200/80 bg-white/80 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-indigo-900">
                      {activeSide === "in" ? "Inches (in)" : "Centimeters (cm)"}
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addHeader(activeSide)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        <Plus size={12} /> Header
                      </button>
                      <button
                        type="button"
                        onClick={() => addRow(activeSide)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-800"
                      >
                        <Plus size={12} /> Row
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(form.sizeCharts[activeSide].headers || []).map(
                      (header, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <input
                            className={fieldClass}
                            placeholder="Key (e.g. chest)"
                            value={header.key || ""}
                            onChange={(e) =>
                              updateHeader(
                                activeSide,
                                idx,
                                "key",
                                e.target.value,
                              )
                            }
                          />
                          <input
                            className={fieldClass}
                            placeholder="Label (e.g. Chest (in))"
                            value={header.label || ""}
                            onChange={(e) =>
                              updateHeader(
                                activeSide,
                                idx,
                                "label",
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeHeader(activeSide, idx)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {(form.sizeCharts[activeSide].rows || []).map(
                      (row, rowIdx) => (
                        <div
                          key={rowIdx}
                          className="rounded-lg border border-gray-200 bg-white p-2"
                        >
                          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                            <input
                              className={fieldClass}
                              placeholder="Size (e.g. S, M)"
                              value={row.size || ""}
                              onChange={(e) =>
                                updateRow(
                                  activeSide,
                                  rowIdx,
                                  "size",
                                  e.target.value,
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeRow(activeSide, rowIdx)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                            >
                              Remove row
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(form.sizeCharts[activeSide].headers || []).map(
                              (h) => (
                                <input
                                  key={h.key}
                                  type="number"
                                  step="any"
                                  className={fieldClass}
                                  placeholder={h.label || h.key}
                                  value={row.measurements?.[h.key] ?? ""}
                                  onChange={(e) =>
                                    updateRow(
                                      activeSide,
                                      rowIdx,
                                      h.key,
                                      e.target.value,
                                    )
                                  }
                                />
                              ),
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/40 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-900">
                        Measurement image URLs
                      </p>
                      <button
                        type="button"
                        onClick={() => addMeasureImageUrl(activeSide)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900"
                      >
                        <Plus size={12} /> Add URL
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(form.sizeCharts[activeSide].measureImages || []).map(
                        (url, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]"
                          >
                            {isLocalPickedFile(url) ? (
                              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700">
                                <span className="truncate">{url.name}</span>
                              </div>
                            ) : (
                              <input
                                className={fieldClass}
                                placeholder="https://..."
                                value={url || ""}
                                onChange={(e) =>
                                  updateMeasureImageUrl(
                                    activeSide,
                                    idx,
                                    e.target.value,
                                  )
                                }
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                removeMeasureImageUrl(activeSide, idx)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-800">
                        <Plus size={12} /> Upload files
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            addMeasureImageFiles(activeSide, e.target.files)
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse items-center justify-center gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 sm:w-36"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-36"
                >
                  {saving ? "Saving..." : isEditing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DesignerSizeChartManager;
