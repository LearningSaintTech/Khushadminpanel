import { useState, useEffect, useCallback } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

const PAGE_SIZE = 20;

const initialForm = { key: "", title: "", body: "", module: "", isActive: true };

export default function AdminNotificationTemplatesPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadPage = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const data = await adminNotificationApi.listTemplates({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      const items = data?.list ?? data?.data?.list ?? [];
      const tot = data?.total ?? data?.data?.total ?? 0;
      setList(Array.isArray(items) ? items : []);
      setTotal(tot);
      setPage(data?.page ?? data?.data?.page ?? pageNum);
    } catch (e) {
      setError(e?.message || "Failed to load templates");
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingId(t._id);
    setForm({
      key: t.key ?? "",
      title: t.title ?? "",
      body: t.body ?? "",
      module: t.module ?? "",
      isActive: t.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (editingId) {
        await adminNotificationApi.updateTemplate(editingId, {
          title: form.title,
          body: form.body,
          module: form.module || undefined,
          isActive: form.isActive,
        });
      } else {
        if (!form.key?.trim() || !form.title?.trim()) {
          setError("Key and title are required");
          setSubmitting(false);
          return;
        }
        await adminNotificationApi.createTemplate({
          key: form.key.trim(),
          title: form.title.trim(),
          body: form.body?.trim() ?? "",
          module: form.module?.trim() || undefined,
          isActive: form.isActive,
        });
      }
      closeModal();
      await loadPage(page);
    } catch (e) {
      setError(e?.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminNotificationApi.deleteTemplate(id);
      setDeleteConfirm(null);
      await loadPage(page);
    } catch (e) {
      setError(e?.message || "Failed to delete template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={24} />
          Notification Templates
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
        >
          <Plus size={18} />
          Add template
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading templates...</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No templates yet. Create one to use for in-app notifications (e.g. broadcast or custom events).
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Key</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Module</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Active</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-800">{t.key}</td>
                  <td className="px-4 py-3 text-gray-900">{t.title}</td>
                  <td className="px-4 py-3 text-gray-600">{t.module || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        t.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {t.isActive !== false ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t._id)}
                      className={`p-1.5 rounded ${
                        deleteConfirm === t._id
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                      title={deleteConfirm === t._id ? "Click again to delete" : "Delete"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <p className="mt-3 text-sm text-gray-500">
          Showing {list.length} of {total} templates.
        </p>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? "Edit template" : "Create template"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key (unique)</label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="e.g. OFFER_ALERT"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">Key cannot be changed after creation.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Hello {{customerName}}"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use {"{{placeholder}}"} for dynamic values.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="e.g. Your order {{orderId}} is confirmed."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module (optional)</label>
                <input
                  type="text"
                  value={form.module}
                  onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                  placeholder="e.g. order, broadcast"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              {editingId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
