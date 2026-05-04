import { useEffect, useMemo, useState } from "react";
import {
  createDesignerListingTemplate,
  deleteDesignerListingTemplate,
  listDesignerListingTemplates,
  updateDesignerListingTemplate,
} from "../../apis/designerApi";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import { Plus, Trash2 } from "lucide-react";
import { CARE_ICON_OPTIONS } from "../../../utils/designerCareIconOptions";

const emptyInstruction = () => ({
  text: "",
  iconKey: "",
  iconUrl: "",
});

const buildInitialForm = () => ({
  name: "",
  description: "",
  isActive: true,
  shortDescription: "",
  longDescription: "",
  careDescription: "",
  instructions: [],
});

const mapCareToForm = (row) => {
  const care = row?.care && typeof row.care === "object" ? row.care : {};
  const instructions = Array.isArray(care.instructions)
    ? care.instructions.map((inst) => ({
        text: inst?.text || "",
        iconKey: inst?.iconKey || "",
        iconUrl: inst?.iconUrl || "",
      }))
    : [];
  return {
    careDescription: care.description || "",
    instructions: instructions.length ? instructions : [],
  };
};

const DesignerListingTemplateManager = () => {
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
      const res = await listDesignerListingTemplates({
        page,
        limit: 10,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      if (res?.success) {
        setRows(res?.data?.items || []);
        setPagination(res?.data?.pagination || { totalPages: 1, total: 0 });
      } else {
        setErrors(extractBackendMessages(res || { message: "Could not load templates." }));
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
    const care = mapCareToForm(row);
    setForm({
      name: row?.name || "",
      description: row?.description || "",
      isActive: row?.isActive !== false,
      shortDescription: row?.shortDescription || "",
      longDescription: row?.longDescription || "",
      careDescription: care.careDescription,
      instructions: care.instructions.length ? care.instructions : [emptyInstruction()],
    });
    setShowForm(true);
  };

  const addInstruction = () =>
    setForm((s) => ({
      ...s,
      instructions: [...(s.instructions || []), emptyInstruction()],
    }));

  const updateInstruction = (idx, patch) =>
    setForm((s) => {
      const list = [...(s.instructions || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...s, instructions: list };
    });

  const removeInstruction = (idx) =>
    setForm((s) => ({
      ...s,
      instructions: (s.instructions || []).filter((_, i) => i !== idx),
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    setSuccessMsg("");
    try {
      const care = {
        description: form.careDescription || "",
        instructions: (form.instructions || []).map((inst) => ({
          text: inst?.text || "",
          iconKey: inst?.iconKey || "",
          iconUrl: String(inst?.iconUrl || "").trim(),
        })),
      };
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        shortDescription: form.shortDescription.trim(),
        longDescription: form.longDescription.trim(),
        care,
      };
      if (isEditing) {
        await updateDesignerListingTemplate(editingId, body);
        setSuccessMsg("Template updated.");
      } else {
        await createDesignerListingTemplate(body);
        setSuccessMsg("Template created.");
      }
      await fetchRows();
      resetForm();
    } catch (err) {
      setErrors(extractBackendMessages(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!id || !window.confirm("Delete this template?")) return;
    setDeletingId(id);
    setErrors([]);
    try {
      await deleteDesignerListingTemplate(id);
      setSuccessMsg("Template deleted.");
      await fetchRows();
    } catch (err) {
      setErrors(extractBackendMessages(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="max-w-5xl space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Listing copy templates</h1>
          <p className="text-xs text-gray-500">
            Reusable short/long descriptions and care instructions. Apply them when creating inventory
            items (same idea as size chart templates).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> New template
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <ul className="list-disc pl-5">
            {errors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {successMsg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successMsg}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={fieldClass + " max-w-xs"}
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600">
            <tr>
              <th className="p-2.5">Name</th>
              <th className="p-2.5">Short preview</th>
              <th className="p-2.5">Care lines</th>
              <th className="p-2.5">Active</th>
              <th className="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No templates yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-100">
                  <td className="p-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="p-2.5 text-xs text-gray-600 line-clamp-2">
                    {r.shortDescription || "—"}
                  </td>
                  <td className="p-2.5 text-xs text-gray-600">
                    {Array.isArray(r.care?.instructions) ? r.care.instructions.length : 0}
                  </td>
                  <td className="p-2.5">
                    {r.isActive !== false ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      type="button"
                      className="mr-2 text-indigo-700 hover:underline"
                      onClick={() => openEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === r._id}
                      className="text-rose-700 hover:underline disabled:opacity-50"
                      onClick={() => onDelete(r._id)}
                    >
                      {deletingId === r._id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span className="text-sm text-gray-600">
          Page {page} / {pagination.totalPages || 1}
        </span>
        <button
          type="button"
          disabled={page >= (pagination.totalPages || 1)}
          className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-100 bg-black/45 p-0">
          <div className="flex h-dvh w-full flex-col overflow-hidden bg-white">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-3 sm:px-5">
              <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 sm:text-lg">
                {isEditing ? "Edit listing template" : "New listing template"}
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                onClick={resetForm}
              >
                Close
              </button>
            </header>
            <form
              onSubmit={onSubmit}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:space-y-5 sm:px-6 sm:pb-8 sm:pt-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Name</label>
                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-end sm:col-span-1">
                  <label className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                    />
                    Active template
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Notes (optional)</label>
                  <input
                    className={fieldClass}
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Short description</label>
                  <input
                    className={fieldClass}
                    value={form.shortDescription}
                    onChange={(e) => setForm((s) => ({ ...s, shortDescription: e.target.value }))}
                  />
                </div>
                <div className="lg:row-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Long description</label>
                  <textarea
                    className={`${fieldClass} min-h-[120px] w-full sm:min-h-[160px] lg:min-h-[220px]`}
                    rows={6}
                    value={form.longDescription}
                    onChange={(e) => setForm((s) => ({ ...s, longDescription: e.target.value }))}
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Care description</label>
                  <textarea
                    className={`${fieldClass} min-h-[72px] w-full sm:min-h-[88px]`}
                    rows={3}
                    value={form.careDescription}
                    onChange={(e) => setForm((s) => ({ ...s, careDescription: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-gray-800">Care instructions</span>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-900 hover:bg-cyan-100 sm:w-auto"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>
              {(form.instructions || []).length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  No instruction lines yet — add at least one for a useful template.
                </p>
              ) : (
                <div className="space-y-3">
                  {(form.instructions || []).map((inst, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-gray-50/90 p-3 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-800">Line {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeInstruction(idx)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800"
                          aria-label="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="min-w-0 md:col-span-2">
                          <label className="mb-0.5 block text-[11px] text-gray-600">Text</label>
                          <input
                            className={fieldClass}
                            placeholder="Instruction text"
                            value={inst.text}
                            onChange={(e) => updateInstruction(idx, { text: e.target.value })}
                          />
                        </div>
                        <div className="min-w-0 md:col-span-2">
                          <label className="mb-0.5 block text-[11px] text-gray-600">Icon</label>
                          <select
                            className={fieldClass}
                            value={
                              CARE_ICON_OPTIONS.some((o) => o.iconKey === inst.iconKey) ? inst.iconKey : ""
                            }
                            onChange={(e) => {
                              const key = e.target.value;
                              const opt = CARE_ICON_OPTIONS.find((o) => o.iconKey === key);
                              updateInstruction(idx, {
                                iconKey: key,
                                iconUrl: opt ? String(opt.iconUrl || "") : "",
                              });
                            }}
                          >
                            <option value="">Optional — preset icon</option>
                            {CARE_ICON_OPTIONS.map((opt) => (
                              <option key={opt.iconKey} value={opt.iconKey}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-gray-200 bg-white/95 py-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  className="order-2 w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium sm:order-1 sm:w-auto"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="order-1 w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:order-2 sm:min-w-[140px] sm:w-auto"
                >
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DesignerListingTemplateManager;
