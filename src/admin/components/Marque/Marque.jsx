import { useEffect, useMemo, useState } from "react";
import {
  createMarqueHeading,
  deleteMarqueHeading,
  getAllMarqueHeadings,
  updateMarqueHeadingItem,
} from "../../apis/Marqueapi";
import {
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  Save,
  X,
  Image as ImageIcon,
  Megaphone,
} from "lucide-react";
import toast from "react-hot-toast";

const initialForm = {
  order: "",
  text: "",
  icon: null,
};

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function Marque() {
  const [marqueHeadings, setMarqueHeadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [editingItem, setEditingItem] = useState(null);
  const [orderFilter, setOrderFilter] = useState("");

  const tableRows = useMemo(() => {
    const rows = [];
    marqueHeadings.forEach((group) => {
      const headings = group?.headings || [];
      headings.forEach((headingItem, headingIndex) => {
        rows.push({
          groupId: group._id,
          order: group?.order,
          headingItem,
          headingIndex,
          isFirstInGroup: headingIndex === 0,
          groupSize: headings.length,
        });
      });
      if (headings.length === 0) {
        rows.push({
          groupId: group._id,
          order: group?.order,
          headingItem: null,
          headingIndex: 0,
          isFirstInGroup: true,
          groupSize: 0,
        });
      }
    });
    return rows;
  }, [marqueHeadings]);

  const fetchMarqueHeadings = async () => {
    try {
      setLoading(true);
      const response = await getAllMarqueHeadings(orderFilter);
      const data = response?.data?.headings || [];
      setMarqueHeadings(data);
    } catch (error) {
      console.error("FETCH ERROR:", error);
      toast.error(
        error?.response?.data?.message || "Failed to fetch marque headings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarqueHeadings();
  }, [orderFilter]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("order", formData.order);
      formDataToSend.append(
        "headings",
        JSON.stringify([{ text: formData.text }]),
      );
      if (formData.icon) {
        formDataToSend.append("icons", formData.icon);
      }
      await createMarqueHeading(formDataToSend);
      toast.success("Marque heading created");
      setFormData(initialForm);
      fetchMarqueHeadings();
    } catch (error) {
      console.error("CREATE ERROR:", error);
      toast.error(error?.response?.data?.message || "Create failed");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClick = (item, documentId, order) => {
    setEditingItem({ documentId });
    setFormData({
      order: order || "",
      text: item?.text || "",
      icon: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("text", formData.text);
      formDataToSend.append("order", formData.order);
      if (formData.icon) {
        formDataToSend.append("icon", formData.icon);
      }
      await updateMarqueHeadingItem(editingItem.documentId, formDataToSend);
      toast.success("Marque heading updated");
      setEditingItem(null);
      setFormData(initialForm);
      fetchMarqueHeadings();
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      toast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this marque heading group?")) return;
    try {
      setDeleteLoading(id);
      await deleteMarqueHeading(id);
      toast.success("Deleted");
      if (editingItem?.documentId === id) {
        setEditingItem(null);
        setFormData(initialForm);
      }
      fetchMarqueHeadings();
    } catch (error) {
      console.error("DELETE ERROR:", error);
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData(initialForm);
  };

  const busy = createLoading || editLoading;

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto flex min-w-0 shrink-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          <Megaphone className="h-4 w-4 text-brand-600" />
          Marquee headings
        </h1>
        <select
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
          className={`${inputClass} min-w-[130px]`}
          aria-label="Sort order"
        >
          <option value="">Default order</option>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <button
          type="button"
          onClick={fetchMarqueHeadings}
          disabled={loading}
          className={`${inputClass} inline-flex items-center gap-1 disabled:opacity-50`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-600">
          {marqueHeadings.length} group{marqueHeadings.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid w-full gap-2 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <FormSection
          title={editingItem ? "Update heading" : "Create heading"}
          hint="Order, text, and optional icon for the ticker"
        >
          <form
            onSubmit={editingItem ? handleUpdate : handleCreate}
            className="space-y-2.5"
          >
            <Field label="Order" required>
              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                placeholder="1"
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Heading text" required>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                placeholder="Free shipping on orders above ₹999"
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Icon (optional)">
              <input
                type="file"
                name="icon"
                accept="image/*"
                onChange={handleChange}
                className="block w-full text-[11px] text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
            </Field>

            {(formData.text || formData.icon) && (
              <div className="rounded-lg border border-border bg-canvas-muted/50 p-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Preview
                </p>
                <div className="flex items-center gap-2">
                  {formData.icon ? (
                    <img
                      src={URL.createObjectURL(formData.icon)}
                      alt=""
                      className="h-9 w-9 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white">
                      <ImageIcon className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  )}
                  <p className="line-clamp-2 text-[11px] font-medium text-stone-900">
                    {formData.text || "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editingItem ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {editingItem ? "Save" : "Create"}
              </button>
              {editingItem ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </FormSection>

        <div>
          {loading && tableRows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Loading…
            </div>
          ) : tableRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
              <Megaphone className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              <p className="text-[11px] font-medium text-stone-600">
                No marquee headings yet
              </p>
              <p className="mt-1 text-[10px] text-stone-500">
                Use the form to create your first heading
              </p>
            </div>
          ) : (
            <div className={tableScrollShell}>
              <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                  <tr>
                    <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      #
                    </th>
                    <th className="w-16 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Order
                    </th>
                    <th className="w-14 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Icon
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Text
                    </th>
                    <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => {
                    const { groupId, order, headingItem, isFirstInGroup } = row;
                    const isEditing =
                      editingItem?.documentId === groupId && headingItem;

                    return (
                      <tr
                        key={`${groupId}-${row.headingIndex}`}
                        className={`group border-t border-border/80 transition-colors hover:bg-brand-50/30 ${
                          isEditing ? "bg-brand-50/50" : ""
                        }`}
                      >
                        <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2 text-[10px] font-medium tabular-nums text-stone-700">
                          {isFirstInGroup ? (order ?? "—") : ""}
                        </td>
                        <td className="px-2 py-2">
                          {headingItem?.icon ? (
                            <img
                              src={headingItem.icon}
                              alt=""
                              className="h-9 w-9 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-canvas-muted">
                              <ImageIcon className="h-3.5 w-3.5 text-stone-400" />
                            </div>
                          )}
                        </td>
                        <td className="max-w-[280px] px-2 py-2">
                          <p className="line-clamp-2 font-medium text-stone-900">
                            {headingItem?.text || "—"}
                          </p>
                          {isFirstInGroup && row.groupSize > 1 ? (
                            <p className="mt-0.5 text-[10px] text-stone-500">
                              {row.groupSize} items in group
                            </p>
                          ) : null}
                        </td>
                        <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                          <div className="inline-flex items-center gap-1">
                            {headingItem ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditClick(headingItem, groupId, order)
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                                title="Edit"
                                aria-label="Edit heading"
                              >
                                <Pencil size={13} />
                              </button>
                            ) : null}
                            {isFirstInGroup ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(groupId)}
                                disabled={deleteLoading === groupId}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-50"
                                title="Delete group"
                                aria-label="Delete group"
                              >
                                {deleteLoading === groupId ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
