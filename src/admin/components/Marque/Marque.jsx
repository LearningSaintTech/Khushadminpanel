import React, { useEffect, useState } from "react";
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

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition disabled:opacity-50";
const labelClass = "mb-1 block text-[11px] font-medium text-slate-700";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

export default function Marque() {
  const [marqueHeadings, setMarqueHeadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [editingItem, setEditingItem] = useState(null);
  const [orderFilter, setOrderFilter] = useState("");

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

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className={`${inputClass} w-full sm:w-36`}
            >
              <option value="">Default order</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button
              type="button"
              onClick={fetchMarqueHeadings}
              disabled={loading}
              className={btnOutline}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
      </div>

      <main className="mx-auto grid w-full max-w-[1400px] gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-1 lg:sticky lg:top-[4.5rem] lg:self-start">
          <h2 className="text-xs font-semibold text-slate-800">
            {editingItem ? "Update heading" : "Create heading"}
          </h2>
          <p className="mt-0.5 mb-3 text-[10px] text-slate-500">
            Order, text, and optional icon for the ticker
          </p>

          <form
            onSubmit={editingItem ? handleUpdate : handleCreate}
            className="space-y-3"
          >
            <div>
              <label className={labelClass}>Order *</label>
              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                placeholder="1"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Heading text *</label>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                placeholder="Free shipping on orders above ₹999"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Icon (optional)</label>
              <input
                type="file"
                name="icon"
                accept="image/*"
                onChange={handleChange}
                className={`${inputClass} file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-indigo-700`}
              />
            </div>

            {(formData.text || formData.icon) && (
              <div className="rounded-md border border-slate-100 bg-slate-50/80 p-2.5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Preview
                </p>
                <div className="flex items-center gap-2">
                  {formData.icon ? (
                    <img
                      src={URL.createObjectURL(formData.icon)}
                      alt=""
                      className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white">
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  <p className="text-[11px] font-medium text-slate-800 line-clamp-2">
                    {formData.text || "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editingItem ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {editingItem ? "Update" : "Create"}
              </button>
              {editingItem && (
                <button type="button" onClick={handleCancelEdit} className={btnOutline}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
            <p className="text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">{marqueHeadings.length}</span>{" "}
              group{marqueHeadings.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-16 text-xs text-slate-500 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Loading…
            </div>
          ) : marqueHeadings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-xs text-slate-500 shadow-sm">
              No marquee headings yet
            </div>
          ) : (
            marqueHeadings.map((item, index) => {
              const documentId = item?._id;
              const headings = item?.headings || [];
              return (
                <article
                  key={documentId}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-800">
                        Group #{index + 1}
                      </h3>
                      <p className="text-[10px] text-slate-500 tabular-nums">
                        Order: {item?.order ?? "—"} · {headings.length} item
                        {headings.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(documentId)}
                      disabled={deleteLoading === documentId}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deleteLoading === documentId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Delete group
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {headings.map((headingItem, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {headingItem?.icon ? (
                            <img
                              src={headingItem.icon}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                              <ImageIcon className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <p className="text-[11px] font-medium text-slate-900 leading-snug">
                            {headingItem?.text || "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleEditClick(headingItem, documentId, item?.order)
                          }
                          className={btnOutline}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
