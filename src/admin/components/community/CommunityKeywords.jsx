import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Hash, Pencil, Plus, Trash2, X, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  listCommunityHashtags,
  createCommunityHashtag,
  updateCommunityHashtag,
  deleteCommunityHashtag,
} from "../../apis/Communityapi";
import {
  PageHeader,
  fieldClass,
  tableScrollShell,
  btnPrimary,
  btnOutline,
  FormSection,
  Field,
  pageToolbar,
  tableHeadClass,
  thClass,
} from "./communityShared";

const emptyForm = { keyword: "", label: "" };

const CommunityKeywords = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCommunityHashtags();
      const data = res?.data ?? res;
      const list =
        data?.items ||
        data?.hashtags ||
        data?.keywords ||
        (Array.isArray(data) ? data : []) ||
        [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load keywords");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.keyword.trim()) {
      toast.error("Keyword is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        keyword: form.keyword.trim(),
        ...(form.label.trim() ? { label: form.label.trim() } : {}),
      };
      if (editing?._id) {
        await updateCommunityHashtag(editing._id, body);
        toast.success("Keyword updated");
      } else {
        await createCommunityHashtag(body);
        toast.success("Keyword created");
      }
      reset();
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditing(row);
    setForm({
      keyword: row.keyword || row.name || "",
      label: row.label || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this keyword?")) return;
    try {
      await deleteCommunityHashtag(id);
      toast.success("Deleted");
      if (editing?._id === id) reset();
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Hash}
        title="Community keywords"
        subtitle="Admin curated explore chips — /community/admin/hashtags"
        onRefresh={fetchList}
        loading={loading}
        backLink={
          <Link
            to={ap("community")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Community
          </Link>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,320px)_1fr]">
        <FormSection
          title={editing ? "Edit keyword" : "Add keyword"}
          hint='Body: { "keyword": "summer vibes", "label": "…" }'
        >
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <Field label="Keyword" required>
              <input
                className={fieldClass}
                value={form.keyword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, keyword: e.target.value }))
                }
                placeholder="e.g. summer vibes"
              />
            </Field>
            <Field label="Label" hint="Optional display label">
              <input
                className={fieldClass}
                value={form.label}
                onChange={(e) =>
                  setForm((p) => ({ ...p, label: e.target.value }))
                }
                placeholder="Optional label"
              />
            </Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editing ? (
                  <Pencil className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {editing ? "Update" : "Create"}
              </button>
              {editing ? (
                <button type="button" onClick={reset} className={btnOutline}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </FormSection>

        <div>
          <div className={pageToolbar}>
            <h2 className="mr-auto text-xs font-semibold text-stone-900">
              All keywords ({items.length})
            </h2>
          </div>
          <div className={tableScrollShell}>
            <table className="w-full text-[11px]">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Keyword</th>
                  <th className={thClass}>Label</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-stone-500">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-stone-500">
                      No keywords yet
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr
                      key={row._id || idx}
                      className="border-t border-border/80 hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-stone-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium text-stone-900">
                        {row.keyword || row.name || "—"}
                      </td>
                      <td className="px-2 py-2 text-stone-600">
                        {row.label || "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row._id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">
            Users search via{" "}
            <code className="rounded bg-canvas-muted px-1">
              GET /community/feed?scope=explore&amp;q=…
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityKeywords;
