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

const emptyForm = {
  keyword: "",
  label: "",
  sortOrder: 1,
};

function keywordId(row) {
  return row?.id || row?._id || "";
}

function extractKeywordItems(res) {
  const root = res && typeof res === "object" ? res : {};
  const nested = root.data && typeof root.data === "object" ? root.data : null;
  const candidates = [
    nested?.items,
    root?.items,
    nested?.data?.items,
    nested?.hashtags,
    nested?.keywords,
    root?.hashtags,
    root?.keywords,
    Array.isArray(nested) ? nested : null,
    Array.isArray(root) ? root : null,
  ];
  const list = candidates.find((value) => Array.isArray(value));
  return Array.isArray(list) ? list : [];
}

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
      setItems(extractKeywordItems(res));
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
      label: form.label.trim(),
      sortOrder: Number(form.sortOrder) || 1,
    };

    console.log("HASHTAG BODY:", body);

    const editingId = keywordId(editing);
    if (editingId) {
      const id = editingId;

      console.log("Updating hashtag:", id, body);

      await updateCommunityHashtag(id, body);
      toast.success("Keyword updated");
    } else {
      console.log("Creating hashtag:", body);

      await createCommunityHashtag(body);
      toast.success("Keyword created");
    }

    reset();
    await fetchList();
  } catch (err) {
    console.error("Hashtag save error:", err);
    console.error("Response:", err?.response?.data);

    toast.error(
      err?.response?.data?.message ||
      err?.message ||
      "Save failed"
    );
  } finally {
    setSaving(false);
  }
};

  const handleEdit = (row) => {
    setEditing(row);
    setForm({
      keyword: row.keyword || row.tag || row.name || "",
      label: row.label || "",
      sortOrder: Number(row.sortOrder) || 1,
    });
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this keyword?")) return;
    try {
      await deleteCommunityHashtag(id);
      toast.success("Deleted");
      if (keywordId(editing) === id) reset();
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

            <Field label="Sort Order" hint="Lower number appears first">
  <input
    type="number"
    min="0"
    className={fieldClass}
    value={form.sortOrder}
    onChange={(e) =>
      setForm((p) => ({
        ...p,
        sortOrder: Number(e.target.value),
      }))
    }
    placeholder="1"
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
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-stone-500">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-stone-500">
                      No keywords yet
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr
                      key={keywordId(row) || idx}
                      className="border-t border-border/80 hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-stone-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium text-stone-900">
                        {row.keyword || row.tag || row.name || "—"}
                      </td>
                      <td className="px-2 py-2 text-stone-600">
                        {row.label || "—"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            row.isActive === false
                              ? "rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-medium text-danger"
                              : "rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success"
                          }
                        >
                          {row.isActive === false ? "Inactive" : "Active"}
                        </span>
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
                            onClick={() => handleDelete(keywordId(row))}
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
