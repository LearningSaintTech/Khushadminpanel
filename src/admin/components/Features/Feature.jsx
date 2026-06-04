import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { getFeatures, deleteFeature } from "../../apis/Featureapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const Feature = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);

  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return features;
    return features.filter(
      (f) =>
        (f.featureName || "").toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q),
    );
  }, [features, search]);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await getFeatures(page, limit);
      const featuresArray = res?.data?.features || [];
      const paginationData = res?.data?.pagination;

      setFeatures(Array.isArray(featuresArray) ? featuresArray : []);
      setTotalPages(paginationData?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching features:", err);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [limit, search]);

  useEffect(() => {
    fetchFeatures();
  }, [page, limit]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this feature?")) return;
    try {
      setLoading(true);
      await deleteFeature(id);
      if (features.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchFeatures();
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(err?.response?.data?.message || "Failed to delete feature");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Features
        </h1>
        <div className="relative min-w-[140px] max-w-[220px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or description…"
            className={`${inputClass} w-full pl-8 pr-8`}
            aria-label="Search features"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
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
          onClick={() => navigate(ap("features/create"))}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      {loading && features.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-[11px] font-medium text-stone-600">No features found</p>
          <button
            type="button"
            onClick={() => navigate(ap("features/create"))}
            className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Create feature →
          </button>
        </div>
      ) : (
        <>
          <div className={tableScrollShell}>
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    #
                  </th>
                  <th className="w-14 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Icon
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Name
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Description
                  </th>
                  <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.map((item, idx) => (
                  <tr
                    key={item._id}
                    className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      {item.icon?.imageUrl ? (
                        <img
                          src={item.icon.imageUrl}
                          alt=""
                          className="h-9 w-9 rounded-lg border border-border bg-canvas-muted object-contain p-0.5"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-lg border border-border bg-canvas-muted" />
                      )}
                    </td>
                    <td className="px-2 py-2 font-medium text-stone-900">{item.featureName}</td>
                    <td className="max-w-[320px] px-2 py-2 text-stone-600">
                      <span className="line-clamp-2">{item.description || "—"}</span>
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(ap(`features/edit/${item._id}`))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="Edit"
                          aria-label="Edit feature"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={loading}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete feature"
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
              disabled={page === 1 || loading}
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

export default Feature;
