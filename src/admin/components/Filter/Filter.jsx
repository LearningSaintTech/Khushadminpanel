import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFilters,
  deleteFilter,
  toggleFilterStatus,
} from "../../apis/Filterapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { Plus, Trash2, Edit, Loader2, Search, X, SlidersHorizontal } from "lucide-react";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const FilterPage = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, limit]);

  useEffect(() => {
    fetchFilters();
  }, [currentPage, debouncedSearchTerm, limit]);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getFilters(currentPage, limit, debouncedSearchTerm);
      const filtersData = response?.data?.filters || [];
      const paginationData = response?.data?.pagination || {};

      setFilters(filtersData);
      setTotalPages(paginationData.totalPages || 1);
    } catch (err) {
      console.error("Fetch filters error:", err);
      setError("Failed to load filters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this filter?")) return;

    try {
      setLoading(true);
      await deleteFilter(id);
      await fetchFilters();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete filter");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (filter) => {
    const originalStatus = filter.isActive;

    setFilters((prev) =>
      prev.map((item) =>
        item._id === filter._id ? { ...item, isActive: !item.isActive } : item,
      ),
    );

    try {
      await toggleFilterStatus(filter._id);
    } catch (err) {
      setFilters((prev) =>
        prev.map((item) =>
          item._id === filter._id ? { ...item, isActive: originalStatus } : item,
        ),
      );
      setError("Failed to update status");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Product filters
        </h1>
        <div className="relative min-w-[140px] max-w-[220px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search filters…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} w-full pl-8 pr-8`}
            aria-label="Search filters"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
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
          onClick={() => navigate(ap("filters/create"))}
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

      {loading && filters.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
      ) : filters.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
          <SlidersHorizontal className="mx-auto mb-2 h-8 w-8 text-stone-300" />
          <p className="text-[11px] font-medium text-stone-600">No filters found</p>
          <button
            type="button"
            onClick={() => navigate(ap("filters/create"))}
            className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Create filter →
          </button>
        </div>
      ) : (
        <>
          <div className={tableScrollShell}>
            <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    #
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Key
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Label
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Values
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filters.map((filter, idx) => (
                  <tr
                    key={filter._id}
                    className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px] font-medium text-brand-700">
                      {filter.key}
                    </td>
                    <td className="px-2 py-2 font-medium text-stone-900">{filter.label}</td>
                    <td className="max-w-[200px] px-2 py-2 text-stone-600">
                      <span className="line-clamp-2">{filter.description || "—"}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-600">
                      {filter.values?.length || 0} values
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(filter)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          filter.isActive ? "bg-success" : "bg-stone-300"
                        }`}
                        aria-label={filter.isActive ? "Deactivate filter" : "Activate filter"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            filter.isActive ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(ap(`filters/edit/${filter._id}`))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="Edit"
                          aria-label="Edit filter"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(filter._id)}
                          disabled={loading}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete filter"
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
              Page {currentPage} / {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
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

export default FilterPage;
