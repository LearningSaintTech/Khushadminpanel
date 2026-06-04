import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  deleteGiftCardRule,
  getGiftCardRules,
  toggleGiftCardRuleStatus,
} from "../../apis/GiftcardApi";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const GiftCardRule = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);

  const fetchGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const isActive =
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
            ? false
            : undefined;
      const response = await getGiftCardRules(page, limit, isActive);
      const data = response?.data || {};
      setGiftCards(data.items || []);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Fetch gift cards:", err);
      setError(
        extractBackendMessages(err).join("; ") || "Failed to load gift cards.",
      );
      setGiftCards([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, limit]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const handleToggleStatus = async (item) => {
    const originalStatus = item.isActive;
    setBusyId(item._id);
    setGiftCards((prev) =>
      prev.map((row) =>
        row._id === item._id ? { ...row, isActive: !row.isActive } : row,
      ),
    );
    try {
      await toggleGiftCardRuleStatus(item._id);
    } catch (err) {
      setGiftCards((prev) =>
        prev.map((row) =>
          row._id === item._id ? { ...row, isActive: originalStatus } : row,
        ),
      );
      setError(
        extractBackendMessages(err).join("; ") || "Failed to update status.",
      );
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this gift card?")) return;
    setBusyId(id);
    try {
      await deleteGiftCardRule(id);
      await fetchGiftCards();
    } catch (err) {
      setError(
        extractBackendMessages(err).join("; ") || "Failed to delete gift card.",
      );
    } finally {
      setBusyId("");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Gift cards
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className={`${inputClass} min-w-[120px]`}
          aria-label="Status filter"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("gift/create"))}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      {loading && giftCards.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
      ) : giftCards.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
          <Gift className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-[11px] font-medium text-stone-600">No gift cards yet</p>
          <button
            type="button"
            onClick={() => navigate(ap("gift/create"))}
            className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Create gift card →
          </button>
        </div>
      ) : (
        <>
          <div className={tableScrollShell}>
            <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Card
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Slabs
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Rules
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((item, idx) => (
                  <tr
                    key={item._id}
                    className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas-muted text-stone-400">
                            <Gift className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900">{item.name}</p>
                          <p className="line-clamp-2 text-[10px] text-stone-500">
                            {item.description || "No description"}
                          </p>
                          <p className="text-[10px] text-stone-400">{item.currency || "INR"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="space-y-1">
                        {Array.isArray(item.slabs) && item.slabs.length > 0 ? (
                          item.slabs.map((slab, slabIdx) => (
                            <div
                              key={slabIdx}
                              className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1"
                            >
                              <p className="text-[10px] font-semibold text-brand-700">
                                ₹{slab.minPrice}–₹{slab.maxPrice} · {slab.percent}%
                              </p>
                              {slab.label ? (
                                <p className="text-[10px] text-stone-500">{slab.label}</p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] text-stone-400">No slabs</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(item.rules || []).length === 0 ? (
                          <span className="text-[10px] text-stone-400">—</span>
                        ) : (
                          item.rules.map((rule, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] text-stone-700"
                            >
                              {rule}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={busyId === item._id}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
                          item.isActive
                            ? "bg-success-bg text-success"
                            : "bg-canvas-muted text-stone-600"
                        }`}
                      >
                        {busyId === item._id ? "…" : item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(ap(`gift/edit/${item._id}`))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="Edit"
                          aria-label="Edit gift card"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={busyId === item._id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete gift card"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
              Page {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GiftCardRule;
