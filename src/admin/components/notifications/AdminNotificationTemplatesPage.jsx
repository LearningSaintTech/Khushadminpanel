import { useState, useEffect, useCallback } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageToolbar,
  Alert,
  LoadingBlock,
  EmptyBlock,
  TableActionBtn,
  tableScrollShell,
  fieldClass,
  labelClass,
} from "./notificationsShared";

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
    <div className="text-stone-900">
      <PageToolbar icon={FileText} title="Notification templates" subtitle="In-app notification copy">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </PageToolbar>

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyBlock message="No templates yet. Create one for in-app notifications (broadcast or custom events)." />
      ) : (
        <div className={tableScrollShell}>
          <table className="w-full min-w-[760px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="w-8 px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Key</th>
                <th className="px-2 py-1.5">Title</th>
                <th className="px-2 py-1.5">Module</th>
                <th className="px-2 py-1.5">Active</th>
                <th className="w-20 px-2 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((t, i) => (
                <tr key={t._id} className="hover:bg-brand-50/20">
                  <td className="px-2 py-1.5 text-stone-400">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-stone-800">{t.key}</td>
                  <td className="px-2 py-1.5 text-stone-900">{t.title}</td>
                  <td className="px-2 py-1.5 text-stone-600">{t.module || "—"}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        t.isActive !== false
                          ? "bg-success-bg text-success"
                          : "bg-canvas-muted text-stone-600"
                      }`}
                    >
                      {t.isActive !== false ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <TableActionBtn onClick={() => openEdit(t)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </TableActionBtn>
                      <TableActionBtn
                        variant="delete"
                        onClick={() => handleDelete(t._id)}
                        title={deleteConfirm === t._id ? "Click again to delete" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </TableActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="mt-1 text-[10px] text-stone-500">
          Showing {list.length} of {total} templates
        </p>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-white p-3 shadow-xl">
            <h2 className="mb-2 text-sm font-semibold text-stone-900">
              {editingId ? "Edit template" : "Create template"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label className={labelClass}>Key (unique)</label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="e.g. OFFER_ALERT"
                  className={`${fieldClass} font-mono`}
                  disabled={!!editingId}
                />
                {editingId ? (
                  <p className="mt-1 text-[10px] text-stone-500">Key cannot be changed after creation.</p>
                ) : null}
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Hello {{customerName}}"
                  className={fieldClass}
                  required
                />
                <p className="mt-1 text-[10px] text-stone-500">Use {"{{placeholder}}"} for dynamic values.</p>
              </div>
              <div>
                <label className={labelClass}>Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="e.g. Your order {{orderId}} is confirmed."
                  rows={3}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Module (optional)</label>
                <input
                  type="text"
                  value={form.module}
                  onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                  placeholder="e.g. order, broadcast"
                  className={fieldClass}
                />
              </div>
              {editingId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="isActive" className="text-[11px] text-stone-700">
                    Active
                  </label>
                </div>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-border py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-600 py-1.5 text-[11px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
