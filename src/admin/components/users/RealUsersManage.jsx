import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "../modals/commonmodal";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../apis/userApi";

const emptyForm = {
  name: "",
  phoneNumber: "",
  countryCode: "+91",
  email: "",
  isActive: true,
  isNumberVerified: false,
  gender: "",
};

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
    setForm(emptyForm);
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
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        gender: form.gender || undefined,
        email: form.email || undefined,
      };
      if (editing?._id) {
        await updateUser(editing._id, payload);
      } else {
        await createUser(payload);
      }
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      setError(err?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete user "${row.name}"?`)) return;
    try {
      await deleteUser(row._id);
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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <form onSubmit={applyFilters} className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            placeholder="Search name, phone, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
          />
          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium"
          >
            Apply
          </button>
        </form>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Verified</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {`${u.countryCode || ""} ${u.phoneNumber || ""}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email || "-"}</td>
                    <td className="px-4 py-3 text-sm">{u.isActive ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-sm">{u.isNumberVerified ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded ml-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit User" : "Add User"}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="+91"
              value={form.countryCode}
              onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
            />
            <input
              className="col-span-2 border rounded-lg px-3 py-2 text-sm"
              placeholder="Phone *"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
            />
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="">Gender (optional)</option>
            <option value="f">Female</option>
            <option value="m">Male</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isNumberVerified}
              onChange={(e) =>
                setForm((f) => ({ ...f, isNumberVerified: e.target.checked }))
              }
            />
            Phone verified
          </label>
        </div>
      </Modal>
    </>
  );
}
