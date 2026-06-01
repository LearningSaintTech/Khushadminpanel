import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiLayers,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
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

const LOG = "[SectionList]";

function sectionListLog(event, data) {
  const time = new Date().toISOString();
  console.log(`${LOG} ${event}`, { time, ...data });
}

function snapshotListRow(section) {
  if (!section) return null;
  const orders = getSectionDisplayOrders(section);
  const discountValue = section.discount?.value;
  const hasActiveDiscount =
    section.discount != null &&
    discountValue !== "" &&
    discountValue != null &&
    Number(discountValue) > 0;
  return {
    _id: section._id,
    title: section.title,
    type: section.type,
    discount: section.discount ?? null,
    hasActiveDiscount,
    discountWillBeSentOnListActions: false,
    note: "List view does not send discount — only SectionForm submit sends discount when user consents",
    appOrder: orders.appOrder,
    webOrder: orders.webOrder,
    rawAppOrder: section.appOrder ?? section.apporder,
    rawWebOrder: section.webOrder ?? section.weborder,
    isApp: section.isApp ?? section.isapp,
    isWeb: section.isWeb ?? section.isweb,
    isActive: section.isActive,
    productsCount: section.products?.length ?? 0,
  };
}

function formatSectionDiscount(section) {
  const d = section?.discount;
  if (!d || d.value == null || d.value === "" || Number(d.value) <= 0) {
    return "None";
  }
  return d.type === "PERCENT" ? `${d.value}%` : `₹${d.value}`;
}

function buildStatusToggleOverview(section) {
  const currentActive = !!section?.isActive;
  const nextActive = !currentActive;
  const orders = getSectionDisplayOrders(section);
  return {
    action: nextActive ? "ACTIVATE" : "DEACTIVATE",
    sectionId: section._id,
    title: section.title || "—",
    type: section.type || "—",
    currentStatus: currentActive ? "Active" : "Inactive",
    newStatus: nextActive ? "Active" : "Inactive",
    discountSummary: formatSectionDiscount(section),
    discountWillBeSentToApi: false,
    productCount: section.products?.length ?? 0,
    appOrder: orders.appOrder,
    webOrder: orders.webOrder,
    isApp: !!(section.isApp ?? section.isapp),
    isWeb: !!(section.isWeb ?? section.isweb),
    apiRequest: {
      method: "PATCH",
      endpoint: `/sections/activeStatus/${section._id}`,
      body: null,
      note: "No FormData body — only toggles isActive on the server",
    },
  };
}

function StatusTogglePreviewModal({
  open,
  overview,
  loading,
  btnPrimary,
  btnOutline,
  onClose,
  onConfirm,
}) {
  if (!open || !overview) return null;

  const isActivating = overview.action === "ACTIVATE";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-status-preview-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 id="section-status-preview-title" className="text-sm font-semibold text-slate-900">
              Review status change
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Confirm before {isActivating ? "activating" : "deactivating"} this section
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs">
          <div
            className={`rounded-lg border px-3 py-2 ${
              isActivating
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide">Action</p>
            <p className="mt-1 font-medium">
              {overview.currentStatus} → {overview.newStatus}
            </p>
            <p className="mt-1 text-[10px] opacity-90">
              {isActivating
                ? "Section will be visible on configured platforms after activation."
                : "Section will be hidden from the storefront after deactivation."}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide">Discount</p>
            <p className="mt-1 font-medium">NOT SENT — status toggle does not change discount</p>
            <p className="mt-1 text-[10px] opacity-90">
              Existing section discount on server: {overview.discountSummary}
            </p>
          </div>

          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Section</dt>
              <dd className="font-medium text-slate-900">{overview.title}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Type</dt>
              <dd className="font-medium text-slate-900">{overview.type}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Section ID</dt>
              <dd className="break-all font-mono text-[10px] text-slate-700">{overview.sectionId}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Products</dt>
              <dd className="tabular-nums text-slate-900">{overview.productCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Order</dt>
              <dd className="text-slate-900">
                App {overview.appOrder ?? "—"} · Web {overview.webOrder ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-slate-500">Platforms</dt>
              <dd className="text-slate-900">
                {overview.isApp ? "App" : ""}
                {overview.isApp && overview.isWeb ? " · " : ""}
                {overview.isWeb ? "Web" : ""}
                {!overview.isApp && !overview.isWeb ? "—" : ""}
              </dd>
            </div>
          </dl>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
              API request (what will be sent)
            </p>
            <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-800">
              {JSON.stringify(overview.apiRequest, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" onClick={onClose} disabled={loading} className={`${btnOutline} flex-1 py-2`}>
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${btnPrimary} flex-1 py-2 ${
              !isActivating ? "!bg-amber-600 hover:!bg-amber-700" : ""
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? "Updating…"
              : isActivating
                ? "Confirm activate"
                : "Confirm deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [showStatusPreview, setShowStatusPreview] = useState(false);
  const [statusPreview, setStatusPreview] = useState(null);
  const [statusPreviewSection, setStatusPreviewSection] = useState(null);
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
      const requestParams = {
        page: useClientFilter ? 1 : page,
        limit: useClientFilter ? 500 : limit,
        type: typeFilter,
        search: debouncedSearch,
      };
      sectionListLog("FETCH list start", { requestParams, useClientFilter });
      const res = await getAllSections(requestParams);
      sectionListLog("FETCH list raw API response", {
        success: res?.success,
        message: res?.message,
        topLevelData: res?.data,
      });
      let { list, pagination: pag } = parseSectionsList(res);

      list = filterSectionsByType(list, typeFilter);
      if (debouncedSearch.trim()) {
        list = filterSectionsBySearch(list, debouncedSearch);
      }

      sectionListLog("FETCH list rows (discount + app/web order per section)", {
        count: list.length,
        rows: list.map(snapshotListRow),
      });

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
      console.error(`${LOG} FETCH list error`, err);
      sectionListLog("FETCH list failed", {
        message: err?.message,
        response: err?.response?.data,
      });
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
    const row = sections.find((s) => s._id === id);
    sectionListLog("DELETE start", { sectionId: id, rowBeforeDelete: snapshotListRow(row) });
    try {
      setBusyId(id);
      const res = await deleteSection(id);
      sectionListLog("DELETE API response", { sectionId: id, res });
      await fetchSections();
    } catch (err) {
      console.error(`${LOG} DELETE error`, err);
      sectionListLog("DELETE failed", { sectionId: id, err });
      alert("Failed to delete section");
    } finally {
      setBusyId("");
    }
  };

  const handleToggleClick = (section) => {
    const overview = buildStatusToggleOverview(section);
    setStatusPreviewSection(section);
    setStatusPreview(overview);
    setShowStatusPreview(true);

    sectionListLog("TOGGLE preview ready (not sent yet)", {
      sectionId: section._id,
      action: overview.action,
      currentStatus: overview.currentStatus,
      newStatus: overview.newStatus,
      discountWillBeSentToApi: false,
      overview,
      rowSnapshot: snapshotListRow(section),
    });
  };

  const handleConfirmToggle = async () => {
    const section = statusPreviewSection;
    if (!section?._id) return;

    const overview = buildStatusToggleOverview(section);
    const id = section._id;

    sectionListLog("TOGGLE confirmed — sending to API", {
      sectionId: id,
      action: overview.action,
      discountWillBeSentToApi: false,
      apiRequest: overview.apiRequest,
      rowSnapshot: snapshotListRow(section),
    });

    try {
      setBusyId(id);
      const res = await toggleSectionStatus(id);
      sectionListLog("TOGGLE status API response", {
        sectionId: id,
        action: overview.action,
        success: res?.success,
        message: res?.message,
        data: res?.data,
        discountWasSent: false,
        fullResponse: res,
      });
      setShowStatusPreview(false);
      setStatusPreview(null);
      setStatusPreviewSection(null);
      await fetchSections();
    } catch (err) {
      console.error(`${LOG} TOGGLE error`, err);
      sectionListLog("TOGGLE failed", {
        sectionId: id,
        action: overview.action,
        discountWasSent: false,
        err,
      });
      alert("Failed to update status");
    } finally {
      setBusyId("");
    }
  };

  const closeStatusPreview = () => {
    if (busyId) return;
    setShowStatusPreview(false);
    setStatusPreview(null);
    setStatusPreviewSection(null);
    sectionListLog("TOGGLE preview closed — no API call", {
      discountWillBeSentToApi: false,
    });
  };

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  const btnPrimary =
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors";
  const btnOutline =
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors";

  return (
    <div>
      <div className="mx-auto max-w-[1600px] pb-4">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              sectionListLog("CREATE navigate — new section (no payload yet)", {
                discountWillBeSentToApi: false,
                note: "Discount is only sent after user checks Add discount and confirms review on form",
              });
              navigate(ap("section/create"));
            }}
            className={btnPrimary}
          >
            <FiPlus className="h-3.5 w-3.5" />
            Create section
          </button>
        </div>

        <div className="mb-3 space-y-3">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, description, path…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
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

          <div className="flex flex-wrap items-center gap-1.5">
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading && sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading sections…</span>
            </div>
          ) : sections.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FiLayers className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">{emptyMessage}</h2>
              <p className="mx-auto mt-1 max-w-sm text-[11px] text-slate-500">
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
                  className={`${btnOutline} mt-4`}
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sectionListLog("CREATE navigate — new section (no payload yet)", {
                      discountWillBeSentToApi: false,
                    });
                    navigate(ap("section/create"));
                  }}
                  className={`${btnPrimary} mt-4`}
                >
                  <FiPlus />
                  Create section
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Preview
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Section
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Products
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Discount
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Order
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Platforms
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
                        className="border-t border-slate-100 transition-colors hover:bg-indigo-50/30"
                      >
                        <td className="px-2 py-1.5">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="h-10 w-16 rounded-md border border-slate-200 object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-400">
                              No image
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <p className="font-medium text-slate-900 line-clamp-2">{section.title}</p>
                          {section.text && (
                            <p className="mt-0.5 max-w-[200px] truncate text-[10px] text-slate-500">
                              {section.text}
                            </p>
                          )}
                          {section.navigation?.navigate && (
                            <p className="mt-1 font-mono text-[10px] text-indigo-600">
                              {section.navigation.navigate}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              section.type === "CATEGORY"
                                ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60"
                                : "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60"
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
                        <td className="px-2 py-1.5 tabular-nums text-slate-700">
                          {section.products?.length ?? 0}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              formatSectionDiscount(section) === "None"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60"
                            }`}
                          >
                            {formatSectionDiscount(section)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-slate-600 tabular-nums">
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
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-1">
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
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleClick(section)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                              section.isActive
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 hover:opacity-80"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            } disabled:opacity-50`}
                          >
                            {isBusy ? "…" : section.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                sectionListLog("EDIT navigate — row data from list", {
                                  sectionId: section._id,
                                  row: snapshotListRow(section),
                                  existingDiscountOnServer: formatSectionDiscount(section),
                                  discountWillBeSentOnSave:
                                    "Only if user keeps Add discount checked with value > 0 on edit form",
                                  note: "Compare with SectionForm LOAD and SUBMIT preview logs",
                                });
                                navigate(ap(`section/edit/${section._id}`));
                              }}
                              className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                              title="Edit"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(section._id)}
                              className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
              <span>
                Page <span className="font-medium text-slate-800">{page}</span> /{" "}
                <span className="font-medium text-slate-800">{totalPages}</span>
                {(pagination?.total != null || filteredTotal > 0) && (
                  <span className="text-slate-400">
                    {" "}
                    · {useClientFilter ? filteredTotal : pagination.total} total
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={btnOutline}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className={btnOutline}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusTogglePreviewModal
        open={showStatusPreview}
        overview={statusPreview}
        loading={Boolean(busyId && statusPreviewSection?._id === busyId)}
        btnPrimary={btnPrimary}
        btnOutline={btnOutline}
        onClose={closeStatusPreview}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
};

export default Section;
