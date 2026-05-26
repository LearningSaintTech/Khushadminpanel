import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiLayers,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Loader2, Search, X } from "lucide-react";
import {
  deleteSection,
  getAllSections,
  toggleSectionStatus,
} from "../../apis/NewsectionApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getSectionDisplayOrders } from "../../utils/sectionDisplay";

const TYPE_TABS = [
  { id: "ALL", label: "All" },
  { id: "MANUAL", label: "Manual" },
  { id: "CATEGORY", label: "Category" },
];

function getBannerUrl(section) {
  return (
    section?.desktopBanner?.[0]?.imageUrl ||
    section?.desktopBanner?.[0]?.url ||
    section?.mobileBanner?.[0]?.imageUrl ||
    section?.mobileBanner?.[0]?.url ||
    null
  );
}

function getTotalPages(pagination) {
  if (!pagination) return 1;
  return (
    pagination.totalPages ||
    pagination.pages ||
    (pagination.total
      ? Math.ceil(pagination.total / (pagination.limit || 10))
      : 1)
  );
}

function parseSectionsList(res) {
  const data = res?.data?.data || res?.data || {};
  const list = data.items || data.sections || [];
  return {
    list: Array.isArray(list) ? list : [],
    pagination: data.pagination || {},
  };
}

function normalizeSectionType(type) {
  return String(type || "").trim().toUpperCase();
}

/** Always applied so Manual / Category tabs show only matching rows */
function filterSectionsByType(sections, typeFilter) {
  if (!typeFilter || typeFilter === "ALL") return sections;
  const want = normalizeSectionType(typeFilter);
  return sections.filter((s) => normalizeSectionType(s.type) === want);
}

function filterSectionsBySearch(sections, searchTerm) {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return sections;
  return sections.filter((s) => {
    const title = (s.title || "").toLowerCase();
    const text = (s.text || "").toLowerCase();
    const nav = (s.navigation?.navigate || "").toLowerCase();
    const type = (s.type || "").toLowerCase();
    return (
      title.includes(q) ||
      text.includes(q) ||
      nav.includes(q) ||
      type.includes(q)
    );
  });
}

const Section = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = useCallback(
    (suffix) =>
      `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/"),
    [basePath],
  );

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filteredTotal, setFilteredTotal] = useState(0);
  const limit = 10;
  const useClientFilter =
    typeFilter !== "ALL" || Boolean(debouncedSearch.trim());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, debouncedSearch]);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllSections({
        page: useClientFilter ? 1 : page,
        limit: useClientFilter ? 500 : limit,
        type: typeFilter,
        search: debouncedSearch,
      });
      let { list, pagination: pag } = parseSectionsList(res);

      list = filterSectionsByType(list, typeFilter);
      if (debouncedSearch.trim()) {
        list = filterSectionsBySearch(list, debouncedSearch);
      }

      if (useClientFilter) {
        const total = list.length;
        const start = (page - 1) * limit;
        setFilteredTotal(total);
        setSections(list.slice(start, start + limit));
        setPagination({
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        });
      } else {
        setFilteredTotal(0);
        setSections(list);
        setPagination(pag);
      }
    } catch (err) {
      console.error(err);
      setSections([]);
      setPagination({});
      setFilteredTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, debouncedSearch, useClientFilter]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const totalPages = getTotalPages(pagination);
  const hasActiveFilters = typeFilter !== "ALL" || debouncedSearch.trim().length > 0;

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim() && typeFilter !== "ALL") {
      return `No ${typeFilter.toLowerCase()} sections match "${debouncedSearch}"`;
    }
    if (debouncedSearch.trim()) {
      return `No sections match "${debouncedSearch}"`;
    }
    if (typeFilter !== "ALL") {
      return `No ${typeFilter.toLowerCase()} sections found`;
    }
    return "No sections yet";
  }, [debouncedSearch, typeFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this section permanently?")) return;
    try {
      setBusyId(id);
      await deleteSection(id);
      await fetchSections();
    } catch (err) {
      console.error(err);
      alert("Failed to delete section");
    } finally {
      setBusyId("");
    }
  };

  const handleToggle = async (id) => {
    try {
      setBusyId(id);
      await toggleSectionStatus(id);
      await fetchSections();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setBusyId("");
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Homepage sections
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Curate product blocks, category rails, and hero banners for your storefront.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(ap("section/create"))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <FiPlus className="h-4 w-4" />
            Create section
          </button>
        </div>

        {/* Search + type filters */}
        <div className="mb-6 space-y-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, description, or path…"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            {hasActiveFilters && !loading && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("ALL");
                  clearSearch();
                }}
                className="ml-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Loading sections…</span>
            </div>
          ) : sections.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FiLayers className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{emptyMessage}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                {hasActiveFilters
                  ? "Try another keyword or switch the type filter."
                  : "Create your first homepage section to showcase products or categories."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("ALL");
                    clearSearch();
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(ap("section/create"))}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <FiPlus />
                  Create section
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Preview
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Section
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Products
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Order
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Platforms
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.map((section) => {
                    const img = getBannerUrl(section);
                    const isBusy = busyId === section._id;
                    const categoryName =
                      section.type === "CATEGORY" && section.categoryId
                        ? typeof section.categoryId === "object"
                          ? section.categoryId.name
                          : null
                        : null;
                    const { appOrder, webOrder } = getSectionDisplayOrders(section);

                    return (
                      <tr
                        key={section._id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="h-14 w-24 rounded-lg border border-slate-200 object-cover shadow-sm"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400">
                              No image
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{section.title}</p>
                          {section.text && (
                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                              {section.text}
                            </p>
                          )}
                          {section.navigation?.navigate && (
                            <p className="mt-1 font-mono text-[10px] text-indigo-600">
                              {section.navigation.navigate}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              section.type === "CATEGORY"
                                ? "bg-violet-100 text-violet-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {section.type || "—"}
                          </span>
                          {categoryName && (
                            <p className="mt-1 max-w-[120px] truncate text-[11px] text-slate-500">
                              {categoryName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-slate-800">
                            {section.products?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            <span>
                              App{" "}
                              <strong className="text-slate-900">
                                {appOrder != null && appOrder !== "" ? appOrder : "—"}
                              </strong>
                            </span>
                            <span>
                              Web{" "}
                              <strong className="text-slate-900">
                                {webOrder != null && webOrder !== "" ? webOrder : "—"}
                              </strong>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {section.isApp && (
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                App
                              </span>
                            )}
                            {section.isWeb && (
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                Web
                              </span>
                            )}
                            {!section.isApp && !section.isWeb && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggle(section._id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              section.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            } disabled:opacity-50`}
                          >
                            {isBusy ? "…" : section.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => navigate(ap(`section/edit/${section._id}`))}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(section._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sections.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row sm:px-6">
              <p className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">{totalPages}</span>
                {(pagination?.total != null || filteredTotal > 0) && (
                  <span className="text-slate-400">
                    {" "}
                    · {useClientFilter ? filteredTotal : pagination.total} total
                  </span>
                )}
                {hasActiveFilters && (
                  <span className="text-slate-400">
                    {" "}
                    · filtered
                    {typeFilter !== "ALL" ? ` · ${typeFilter}` : ""}
                    {debouncedSearch.trim() ? ` · "${debouncedSearch}"` : ""}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Section;
