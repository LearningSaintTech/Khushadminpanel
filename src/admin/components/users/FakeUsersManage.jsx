import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Upload } from "lucide-react";
import Modal from "../modals/commonmodal";
import {
  listFakeUsers,
  createFakeUser,
  updateFakeUser,
  deleteFakeUser,
  importFakeUsersFromJson,
} from "../../apis/fakeUserApi";
import {
  btnIconDelete,
  btnIconEdit,
  btnOutline,
  btnPrimary,
  inputClass,
  labelClass,
  tableScrollShell,
  thClass,
} from "./usersShared";

const emptyForm = {
  name: "",
  phoneNumber: "",
  countryCode: "+91",
  gender: "",
  race: "indian",
  isActive: true,
};

const getRowId = (row) => row?._id ?? row?.id ?? null;

const getApiErrorMessage = (err, fallback) =>
  err?.message ||
  (Array.isArray(err?.errors) ? err.errors.map((e) => e.msg || e.message).filter(Boolean).join(", ") : "") ||
  fallback;

export default function FakeUsersManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listFakeUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        gender: genderFilter || undefined,
      });
      const data = res?.data ?? {};
      setRows(data?.items ?? []);
      const p = data?.pagination ?? {};
      setPagination((prev) => ({
        ...prev,
        totalItems: p.totalItems ?? 0,
        totalPages: Math.max(1, p.totalPages ?? 1),
      }));
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, genderFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      phoneNumber: row.phoneNumber || "",
      countryCode: row.countryCode || "+91",
      gender: row.gender || "",
      race: row.race || "indian",
      isActive: row.isActive !== false,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = String(form.name || "").trim();
    const phoneNumber = String(form.phoneNumber || "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        name,
        phoneNumber,
        countryCode: String(form.countryCode || "+91").trim() || "+91",
        race: String(form.race || "indian").trim() || "indian",
        isActive: form.isActive !== false,
        ...(form.gender === "f" || form.gender === "m" ? { gender: form.gender } : {}),
      };
      const editId = getRowId(editing);
      if (editId) {
        await updateFakeUser(editId, payload);
      } else {
        await createFakeUser(payload);
      }
      setModalOpen(false);
      setEditing(null);
      await fetchList();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save fake user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const id = getRowId(row);
    if (!id) {
      alert("Cannot delete — missing user id");
      return;
    }
    if (!window.confirm(`Delete fake user "${row.name}"?`)) return;
    try {
      await deleteFakeUser(id);
      await fetchList();
    } catch (err) {
      alert(err?.message || "Failed to delete");
    }
  };

  const handleImport = async () => {
    if (
      !window.confirm(
        "Import up to 4000 male + 4000 female from indian-names.json? Skips existing phones."
      )
    ) {
      return;
    }
    try {
      setImporting(true);
      const res = await importFakeUsersFromJson({});
      const data = res?.data ?? {};
      alert(`Import done. Created: ${data.created ?? 0}, Skipped: ${data.skipped ?? 0}`);
      await fetchList();
    } catch (err) {
      alert(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <>
      <form
        onSubmit={applyFilters}
        className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm"
      >
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Fake users
        </h1>
        <input
          type="text"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} min-w-[160px] flex-1 max-w-[220px]`}
        />
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className={`${inputClass} shrink-0 min-w-[110px]`}
        >
          <option value="">All genders</option>
          <option value="f">Female</option>
          <option value="m">Male</option>
        </select>
        <select
          value={pagination.limit}
          onChange={(e) =>
            setPagination((p) => ({ ...p, page: 1, limit: parseInt(e.target.value, 10) || 20 }))
          }
          className={`${inputClass} shrink-0 min-w-[108px]`}
          title="Rows per page"
        >
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button type="submit" className={btnPrimary}>
          Apply
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className={btnOutline}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {importing ? "Importing…" : "Import JSON"}
        </button>
        <button type="button" onClick={openCreate} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[760px] w-full divide-y divide-border text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Gender</th>
              <th className={thClass}>Active</th>
              <th className={`${thClass} min-w-[130px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  No fake users. Add one or run Import JSON.
                </td>
              </tr>
            ) : (
              rows.map((u, idx) => (
                <tr key={u._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(pagination.page - 1) * pagination.limit + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-semibold capitalize text-stone-900">
                    {u.name || "—"}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-stone-700">
                    {`${u.countryCode || ""} ${u.phoneNumber || ""}`.trim()}
                  </td>
                  <td className="px-2 py-2 uppercase text-stone-700">{u.gender || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">{u.isActive ? "Yes" : "No"}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className={btnIconEdit}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className={`${btnIconDelete} ml-1.5`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit fake user" : "Add fake user"}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className={btnOutline}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {error ? (
          <p className="mb-2 rounded-lg border border-danger/30 bg-danger-bg px-2 py-1.5 text-[11px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          <div>
            <div className={labelClass}>Name</div>
            <input
              className={inputClass}
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className={labelClass}>Code</div>
              <input
                className={inputClass}
                value={form.countryCode}
                onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <div className={labelClass}>Phone</div>
              <input
                className={inputClass}
                placeholder="Phone *"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <div className={labelClass}>Gender</div>
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="">(optional)</option>
              <option value="f">Female</option>
              <option value="m">Male</option>
            </select>
          </div>
          <div>
            <div className={labelClass}>Race</div>
            <input
              className={inputClass}
              placeholder="Race"
              value={form.race}
              onChange={(e) => setForm((f) => ({ ...f, race: e.target.value }))}
            />
          </div>
          <div className="border-t border-border pt-2">
            <label className="flex items-center gap-2 text-[12px] font-medium text-stone-800">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-100"
              />
              Active account
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
