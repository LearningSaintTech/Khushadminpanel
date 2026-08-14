import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { deleteGiftItem, getGiftItems, updateGiftItem } from "../../apis/giftItemsApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const GiftItems = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await getGiftItems(page, limit, statusFilter);
      const list = res?.data?.items || [];
      const pagination = res?.data?.pagination || {};
      setItems(list);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch gift items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, limit, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this gift item?")) return;
    try {
      await deleteGiftItem(id);
      await fetchItems();
    } catch (error) {
      console.error("Delete gift item error:", error);
      alert(error?.message || "Failed to delete gift item");
    }
  };

  const handleToggleActive = async (item) => {
    try {
      setTogglingId(item._id);
      await updateGiftItem(item._id, { isActive: !item.isActive });
      setItems((prev) =>
        prev.map((row) =>
          row._id === item._id ? { ...row, isActive: !item.isActive } : row,
        ),
      );
    } catch (error) {
      console.error("Toggle gift item status error:", error);
      alert(error?.message || "Failed to update gift item status");
    } finally {
      setTogglingId(null);
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Gift Items
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className={`${inputClass} w-full min-w-[120px] max-w-[160px] sm:w-auto`}
          title="Status filter"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(parseInt(e.target.value, 10) || 20);
          }}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("gift-items/create"))}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Create
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                #
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Image
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Name
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                Description
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Sort
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Status
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-stone-500">
                  No gift items found.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="border-t border-border/80 hover:bg-brand-50/30">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-2 font-medium text-stone-900">
                    {item.name}
                  </td>
                  <td className="hidden max-w-[220px] truncate px-2 py-2 text-stone-600 md:table-cell">
                    {item.description || "—"}
                  </td>
                  <td className="px-2 py-2 text-stone-600">{item.sortOrder ?? 0}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.isActive
                          ? "bg-success-bg text-success"
                          : "bg-canvas-muted text-stone-600"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        disabled={togglingId === item._id}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                          item.isActive ? "bg-success" : "bg-stone-300"
                        }`}
                        title={item.isActive ? "Set inactive" : "Set active"}
                        aria-label={item.isActive ? "Set inactive" : "Set active"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            item.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(ap(`gift-items/edit/${item._id}`))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                        title="Edit"
                        aria-label="Edit gift item"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition-colors hover:bg-danger-bg/80"
                        title="Delete"
                        aria-label="Delete gift item"
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

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
          Page {page} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={page === totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default GiftItems;
