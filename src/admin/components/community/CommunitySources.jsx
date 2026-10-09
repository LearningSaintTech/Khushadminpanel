import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Library, Loader2, Pencil } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  createCommunitySource,
  disableCommunitySource,
  listCommunitySources,
  updateCommunitySource,
} from "../../apis/Communityapi";
import {
  CommunityBackLink,
  Field,
  FormSection,
  PageHeader,
  apiMessage,
  btnOutline,
  btnPrimary,
  communityPageMeta,
  fieldClass,
  pageToolbar,
  statusPill,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./communityShared";

const emptyForm = { name: "", description: "", isActive: true };

const CommunitySources = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) => `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async (search = q) => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 100 };
      if (search) params.q = search;
      const res = await listCommunitySources(params);
      setItems(communityPageMeta(res).items);
    } catch (err) {
      toast.error(apiMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCommunitySource(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          isActive: form.isActive,
        });
        toast.success("Source updated");
      } else {
        await createCommunitySource({
          name: form.name.trim(),
          description: form.description.trim(),
        });
        toast.success("Source created");
      }
      reset();
      await load();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const disable = async (row) => {
    const id = row.id || row._id;
    setSaving(true);
    try {
      await disableCommunitySource(id);
      toast.success("Source hidden from the app. Existing posts keep the label.");
      await load();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Library}
        title="Sources"
        subtitle="Users pick one source when they publish. Disabling hides it from new posts."
        onRefresh={() => load()}
        loading={loading}
        backLink={<CommunityBackLink to={ap("community")} />}
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[18rem_1fr]">
        <form onSubmit={onSubmit}>
          <FormSection title={editingId ? "Edit source" : "New source"}>
            <Field label="Name" required>
              <input className={fieldClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea className={fieldClass} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            {editingId ? (
              <label className="flex items-center gap-2 text-[11px]">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Active in the app
              </label>
            ) : null}
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editingId ? "Save" : "Create"}
              </button>
              {editingId ? (
                <button type="button" className={btnOutline} onClick={reset}>Cancel</button>
              ) : null}
            </div>
          </FormSection>
        </form>

        <div>
          <form
            className={pageToolbar}
            onSubmit={(e) => {
              e.preventDefault();
              load(q);
            }}
          >
            <input className={`${fieldClass} max-w-xs`} value={q} placeholder="Search name" onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className={btnOutline}>Search</button>
          </form>
          <div className={tableScrollShell}>
            <table className="min-w-full text-left text-[11px]">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>Source</th>
                  <th className={thClass}>Posts</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}> </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-stone-500">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-stone-500">No sources</td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const id = row.id || row._id;
                    return (
                      <tr key={id} className="border-b border-border/70">
                        <td className="px-3 py-2">
                          <p className="font-medium text-stone-800">{row.name}</p>
                          <p className="text-[10px] text-stone-500">{row.description || row.slug || "—"}</p>
                        </td>
                        <td className="px-3 py-2">{row.contentCount ?? 0}</td>
                        <td className="px-3 py-2">
                          <span className={statusPill(row.isActive ? "active" : "inactive")}>
                            {row.isActive ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className={btnOutline}
                            onClick={() => {
                              setEditingId(id);
                              setForm({
                                name: row.name || "",
                                description: row.description || "",
                                isActive: row.isActive !== false,
                              });
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          {row.isActive ? (
                            <button type="button" className={`${btnOutline} ml-1`} disabled={saving} onClick={() => disable(row)}>
                              Disable
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunitySources;
