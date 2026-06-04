import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "../modals/commonmodal";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../apis/userApi";
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
  email: "",
  isActive: true,
  isNumberVerified: false,
  gender: "",
};

const getRowId = (row) => row?._id ?? row?.id ?? null;

const getApiErrorMessage = (err, fallback) =>
  err?.message ||
  (Array.isArray(err?.errors) ? err.errors.map((e) => e.msg || e.message).filter(Boolean).join(", ") : "") ||
  fallback;

export default function RealUsersManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
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
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        isActive: isActiveFilter || undefined,
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
  }, [pagination.page, pagination.limit, search, isActiveFilter]);

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
      email: row.email || "",
      isActive: row.isActive !== false,
      isNumberVerified: Boolean(row.isNumberVerified),
      gender: row.gender || "",
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
        isActive: form.isActive !== false,
        isNumberVerified: Boolean(form.isNumberVerified),
        ...(form.gender === "f" || form.gender === "m" ? { gender: form.gender } : {}),
        ...(String(form.email || "").trim() ? { email: String(form.email).trim() } : {}),
      };
      const editId = getRowId(editing);
      if (editId) {
        await updateUser(editId, payload);
      } else {
        await createUser(payload);
      }
      setModalOpen(false);
      setEditing(null);
      await fetchList();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save user"));
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
    if (!window.confirm(`Delete user "${row.name}"?`)) return;
    try {
      await deleteUser(id);
      await fetchList();
    } catch (err) {
      alert(err?.message || "Failed to delete user");
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
          Real users
        </h1>
        <input
          type="text"
          placeholder="Search name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} min-w-[160px] flex-1 max-w-[240px]`}
        />
        <select
          value={isActiveFilter}
          onChange={(e) => setIsActiveFilter(e.target.value)}
          className={`${inputClass} shrink-0 min-w-[120px]`}
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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
        <button type="button" onClick={openCreate} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[920px] w-full divide-y divide-border text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Active</th>
              <th className={thClass}>Verified</th>
              <th className={`${thClass} min-w-[130px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u, idx) => (
                <tr key={u._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(pagination.page - 1) * pagination.limit + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-semibold text-stone-900">{u.name || "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-stone-700">
                    {`${u.countryCode || ""} ${u.phoneNumber || ""}`.trim()}
                  </td>
                  <td className="px-2 py-2 text-stone-700">{u.email || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">{u.isActive ? "Yes" : "No"}</td>
                  <td className="px-2 py-2 text-stone-700">
                    {u.isNumberVerified ? "Yes" : "No"}
                  </td>
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
        title={editing ? "Edit user" : "Add user"}
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
                placeholder="+91"
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
            <div className={labelClass}>Email</div>
            <input
              className={inputClass}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
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
          <div className="flex flex-col gap-3 border-t border-border pt-2 sm:flex-row sm:items-center sm:gap-6">
            <label className="flex items-center gap-2 text-[12px] font-medium text-stone-800">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-100"
              />
              Active account
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-stone-800">
              <input
                type="checkbox"
                checked={form.isNumberVerified}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isNumberVerified: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-100"
              />
              Phone verified
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
