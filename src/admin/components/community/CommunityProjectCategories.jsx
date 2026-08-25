import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FolderKanban, Pencil, Plus, Trash2, X, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  listCommunityProjectCategories,
  createCommunityProjectCategory,
  updateCommunityProjectCategory,
  deleteCommunityProjectCategory,
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
  communityRowId,
  extractCommunityList,
} from "./communityShared";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CommunityProjectCategories = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCommunityProjectCategories({ limit: 50 });
      const list = extractCommunityList(res, ["projectCategories"]);
      console.log("[Community] parsed project categories", list);
      setItems(list);
    } catch (err) {
      toast.error(err?.message || "Failed to load project categories");
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
    setName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    try {
      const body = { name: trimmed };
      const editingId = communityRowId(editing);
      if (editingId) {
        await updateCommunityProjectCategory(editingId, body);
        toast.success("Category updated");
      } else {
        await createCommunityProjectCategory(body);
        toast.success("Category created");
      }
      reset();
      await fetchList();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditing(row);
    setName(row.name || row.label || row.title || "");
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this project category?")) return;
    try {
      await deleteCommunityProjectCategory(id);
      toast.success("Deleted");
      if (communityRowId(editing) === id) reset();
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={FolderKanban}
        title="Project categories"
        subtitle="POST / GET / PATCH / DELETE /community/admin/project-categories"
        onRefresh={fetchList}
        loading={loading}
        accentClass="text-teal-600"
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
          title={editing ? "Edit category" : "Add category"}
          hint='Body: { "name": "UI/UX" }'
        >
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <Field label="Name" required>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UI/UX"
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
              All categories ({items.length})
            </h2>
            <Link
              to={ap("community/projects")}
              className={btnOutline}
            >
              View projects
            </Link>
          </div>
          <div className={tableScrollShell}>
            <table className="w-full text-[11px]">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Created</th>
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
                      No project categories yet
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr
                      key={communityRowId(row) || idx}
                      className="border-t border-border/80 hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-stone-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium text-stone-900">
                        {row.name || row.label || "—"}
                      </td>
                      <td className="px-2 py-2 text-stone-500">
                        {fmtDate(row.createdAt)}
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
                            onClick={() => handleDelete(communityRowId(row))}
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
        </div>
      </div>
    </div>
  );
};

export default CommunityProjectCategories;
