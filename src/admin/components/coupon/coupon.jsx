import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCoupons, toggleCouponStatus } from "../../apis/Couponapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  Plus,
  Edit,
  Eye,
  Loader2,
  Search,
  X,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ChevronDown,
} from "lucide-react";

const COUPON_LIST_COLUMNS_STORAGE_KEY = "khush_admin_coupon_list_visible_columns";

const COUPON_LIST_TABLE_COLUMNS = [
  { key: "id", label: "Coupon ID", defaultVisible: false },
  { key: "code", label: "Code", defaultVisible: true, alwaysVisible: true },
  { key: "description", label: "Description", defaultVisible: true },
  { key: "discount", label: "Discount", defaultVisible: true },
  { key: "discountType", label: "Discount type", defaultVisible: false },
  { key: "maxDiscount", label: "Max discount (₹)", defaultVisible: false },
  { key: "minCart", label: "Min cart", defaultVisible: true },
  { key: "maxCart", label: "Max cart", defaultVisible: false },
  { key: "type", label: "Type", defaultVisible: true },
  { key: "include", label: "Inclusion", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "startDate", label: "Start date", defaultVisible: false },
  { key: "expiryDate", label: "Expiry date", defaultVisible: false },
  { key: "usage", label: "Usage limits", defaultVisible: false },
  { key: "usedCount", label: "Times used", defaultVisible: false },
  { key: "applicableOn", label: "Applicable on", defaultVisible: false },
];

const tableScrollShell =
  "w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 bg-white shadow-sm [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(248_250_252)]";

function defaultVisibleKeysFor(columns) {
  return columns.filter((c) => c.defaultVisible).map((c) => c.key);
}

function loadVisibleColumnsFromStorage(storageKey, columns) {
  const fallback = defaultVisibleKeysFor(columns);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validKeys = new Set(columns.map((c) => c.key));
    const keys = [...new Set(parsed.filter((k) => validKeys.has(k)))];
    columns.filter((c) => c.alwaysVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.unshift(c.key);
    });
    columns.filter((c) => c.defaultVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.push(c.key);
    });
    return keys.length ? keys : fallback;
  } catch {
    return fallback;
  }
}

function persistVisibleColumns(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

function ColumnPickerDropdown({
  columns,
  visibleKeys,
  onToggle,
  onReset,
  onSelectAll,
  open,
  onOpenChange,
}) {
  const activeCount = columns.filter((c) => visibleKeys.includes(c.key)).length;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
        aria-expanded={open}
      >
        <Columns3 className="h-3.5 w-3.5 shrink-0" />
        Columns
        <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
          {activeCount}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-1.5rem,20rem)] rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg ring-1 ring-black/5 sm:left-auto sm:right-0">
          <p className="mb-2 text-[11px] font-semibold text-slate-700">Choose columns to show</p>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              const locked = !!col.alwaysVisible;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(col.key)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-800">{col.label}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-medium text-slate-600 hover:text-slate-800"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TableScrollHint() {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
      <span aria-hidden className="select-none text-slate-300">
        ↔
      </span>
      <span>Scroll horizontally to view all columns</span>
    </p>
  );
}

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
    blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${tones[tone] || tones.slate}`}
    >
      {children}
    </span>
  );
};

const CouponPage = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [influencerFilter, setInfluencerFilter] = useState("all");
  const [autoIncludedFilter, setAutoIncludedFilter] = useState("all");
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(COUPON_LIST_COLUMNS_STORAGE_KEY, COUPON_LIST_TABLE_COLUMNS),
  );

  const activeColumns = useMemo(
    () => COUPON_LIST_TABLE_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns],
  );

  const toggleColumn = useCallback((key) => {
    const def = COUPON_LIST_TABLE_COLUMNS.find((c) => c.key === key);
    if (def?.alwaysVisible) return;
    setVisibleColumns((prev) => {
      const has = prev.includes(key);
      const without = has ? prev.filter((k) => k !== key) : [...prev, key];
      const always = COUPON_LIST_TABLE_COLUMNS.filter((c) => c.alwaysVisible).map((c) => c.key);
      const next = [...new Set([...always, ...without])];
      if (next.length <= always.length && has) return prev;
      persistVisibleColumns(COUPON_LIST_COLUMNS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    const next = defaultVisibleKeysFor(COUPON_LIST_TABLE_COLUMNS);
    setVisibleColumns(next);
    persistVisibleColumns(COUPON_LIST_COLUMNS_STORAGE_KEY, next);
  }, []);

  const selectAllColumns = useCallback(() => {
    const next = COUPON_LIST_TABLE_COLUMNS.map((c) => c.key);
    setVisibleColumns(next);
    persistVisibleColumns(COUPON_LIST_COLUMNS_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (!columnsOpen) return;
    const onDocClick = (e) => {
      if (!e.target.closest?.("[data-coupon-column-picker]")) setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [columnsOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, influencerFilter, autoIncludedFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [currentPage, debouncedSearchTerm, influencerFilter, autoIncludedFilter]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      let isInfluencerParam;
      if (influencerFilter === "influencer") isInfluencerParam = "true";
      else if (influencerFilter === "normal") isInfluencerParam = "false";
      else isInfluencerParam = undefined;

      let isAutoIncludedParam;
      if (autoIncludedFilter === "auto") isAutoIncludedParam = "true";
      else if (autoIncludedFilter === "manual") isAutoIncludedParam = "false";
      else isAutoIncludedParam = undefined;

      const response = await getCoupons(
        currentPage,
        limit,
        debouncedSearchTerm,
        isInfluencerParam,
        isAutoIncludedParam,
      );
      const data = response?.data?.data || response?.data || {};
      const couponsList = Array.isArray(data) ? data : data.coupons || data.data || [];

      setCoupons(couponsList);

      const totalCount = data.total || response?.data?.total || 0;
      const apiTotalPages =
        data.totalPages || data.pages || response?.data?.totalPages || response?.data?.pages;

      let calculatedTotalPages = 1;
      if (apiTotalPages) calculatedTotalPages = apiTotalPages;
      else if (totalCount > 0) calculatedTotalPages = Math.ceil(totalCount / limit);
      else if (couponsList.length === limit && currentPage === 1) calculatedTotalPages = 2;

      setTotalPages(calculatedTotalPages);
    } catch (err) {
      console.error("Fetch coupons error:", err);
      setError("Failed to load coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleCouponStatus(id);
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (err) {
      console.error("Toggle error:", err);
      setError("Failed to update status");
    }
  };

  const formatDiscount = (coupon) =>
    coupon.discountType === "PERCENT"
      ? `${coupon.discountValue}%`
      : `₹${coupon.discountValue}`;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const renderCouponCell = (key, coupon) => {
    switch (key) {
      case "id":
        return (
          <span className="font-mono text-[10px] text-slate-500" title={coupon._id}>
            {String(coupon._id || "").slice(-8) || "—"}
          </span>
        );
      case "code":
        return (
          <span className="font-mono text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
            {coupon.code}
          </span>
        );
      case "description":
        return (
          <span className="block max-w-[200px] truncate text-[11px] text-slate-600" title={coupon.description || ""}>
            {coupon.description || "—"}
          </span>
        );
      case "discount":
        return (
          <span className="whitespace-nowrap text-[11px] font-medium text-slate-800">
            {formatDiscount(coupon)}
          </span>
        );
      case "discountType":
        return (
          <Badge tone="slate">{coupon.discountType === "FIXED" ? "Flat ₹" : "Percent"}</Badge>
        );
      case "maxDiscount":
        return (
          <span className="whitespace-nowrap text-[11px] text-slate-600">
            {coupon.maxDiscountAmount != null ? `₹${coupon.maxDiscountAmount}` : "—"}
          </span>
        );
      case "minCart":
        return (
          <span className="whitespace-nowrap text-[11px] text-slate-600">
            {coupon.minCartValue != null ? `₹${coupon.minCartValue}` : "—"}
          </span>
        );
      case "maxCart":
        return (
          <span className="whitespace-nowrap text-[11px] text-slate-600">
            {coupon.maxCartValue != null ? `₹${coupon.maxCartValue}` : "—"}
          </span>
        );
      case "type":
        return (
          <Badge tone={coupon.isInfluencer ? "purple" : "slate"}>
            {coupon.isInfluencer ? "Influencer" : "Normal"}
          </Badge>
        );
      case "include":
        return (
          <Badge tone={coupon.isAutoIncluded ? "blue" : "slate"}>
            {coupon.isAutoIncluded ? "Auto" : "Manual"}
          </Badge>
        );
      case "status":
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(coupon._id)}
            className="rounded transition-opacity hover:opacity-80"
            title="Toggle status"
          >
            <Badge tone={coupon.isActive ? "green" : "red"}>
              {coupon.isActive ? "Active" : "Inactive"}
            </Badge>
          </button>
        );
      case "startDate":
        return <span className="whitespace-nowrap text-[11px] text-slate-600">{formatDate(coupon.startDate)}</span>;
      case "expiryDate":
        return <span className="whitespace-nowrap text-[11px] text-slate-600">{formatDate(coupon.expiryDate)}</span>;
      case "usage":
        return (
          <span className="whitespace-nowrap text-[10px] text-slate-600">
            Total {coupon.totalUsageLimit || "∞"} · Per user {coupon.perUserUsageLimit || "∞"}
          </span>
        );
      case "usedCount":
        return (
          <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-700">
            {coupon.usedCount ?? 0}
          </span>
        );
      case "applicableOn":
        return (
          <span className="whitespace-nowrap text-[11px] text-slate-600">
            {coupon.applicableOn || "—"}
          </span>
        );
      default:
        return "—";
    }
  };

  const tableMinWidth = Math.max(480, activeColumns.length * 110 + 72);

  const inputClass =
    "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition";

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate(ap("coupons/create"))}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors sm:ml-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add coupon
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by code or description…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-8 pr-8`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={influencerFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setInfluencerFilter(e.target.value);
              }}
              className={`${inputClass} lg:w-44`}
            >
              <option value="all">All types</option>
              <option value="normal">Normal only</option>
              <option value="influencer">Influencer only</option>
            </select>
            <select
              value={autoIncludedFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setAutoIncludedFilter(e.target.value);
              }}
              className={`${inputClass} lg:w-44`}
            >
              <option value="all">All inclusion</option>
              <option value="auto">Auto included</option>
              <option value="manual">Manual apply</option>
            </select>
          </div>

      <main className="mx-auto w-full max-w-[1600px] min-w-0">
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading coupons…
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Ticket className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-600">No coupons found</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Try adjusting filters or create a new coupon
            </p>
            <button
              type="button"
              onClick={() => navigate(ap("coupons/create"))}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create coupon
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-slate-500">
                {activeColumns.length} column{activeColumns.length === 1 ? "" : "s"} visible
              </p>
              <div data-coupon-column-picker>
                <ColumnPickerDropdown
                  columns={COUPON_LIST_TABLE_COLUMNS}
                  visibleKeys={visibleColumns}
                  onToggle={toggleColumn}
                  onReset={resetColumns}
                  onSelectAll={selectAllColumns}
                  open={columnsOpen}
                  onOpenChange={setColumnsOpen}
                />
              </div>
            </div>

            <TableScrollHint />
            <div className={tableScrollShell}>
              <table
                className="w-full border-collapse text-left"
                style={{ minWidth: `${tableMinWidth}px` }}
              >
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/95">
                    {activeColumns.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="sticky right-0 bg-slate-50/95 px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((coupon) => (
                    <tr
                      key={coupon._id}
                      className="group transition-colors hover:bg-indigo-50/30"
                    >
                      {activeColumns.map((col) => (
                        <td key={col.key} className="px-2 py-1.5 align-top">
                          {renderCouponCell(col.key, coupon)}
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white px-2 py-1.5 text-right group-hover:bg-indigo-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setShowModal(true);
                            }}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(ap(`coupons/edit/${coupon._id}`))}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    currentPage < totalPages && setCurrentPage(currentPage + 1)
                  }
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Detail modal */}
        {showModal && selectedCoupon && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[2px]"
            onClick={() => setShowModal(false)}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Coupon details
                  </p>
                  <h2 className="truncate font-mono text-sm font-semibold text-indigo-700">
                    {selectedCoupon.code}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-3 py-2.5">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  <div>
                    <dt className="text-[10px] text-slate-400">Status</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isActive ? "green" : "red"}>
                        {selectedCoupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Discount</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {formatDiscount(selectedCoupon)}
                      {selectedCoupon.maxDiscountAmount && (
                        <span className="ml-1 font-normal text-slate-500">
                          (max ₹{selectedCoupon.maxDiscountAmount})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Type</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isInfluencer ? "purple" : "slate"}>
                        {selectedCoupon.isInfluencer ? "Influencer" : "Normal"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Inclusion</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isAutoIncluded ? "blue" : "slate"}>
                        {selectedCoupon.isAutoIncluded ? "Auto" : "Manual"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Min cart</dt>
                    <dd className="mt-0.5 text-slate-800">
                      ₹{selectedCoupon.minCartValue ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Max cart</dt>
                    <dd className="mt-0.5 text-slate-800">
                      ₹{selectedCoupon.maxCartValue ?? "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-slate-400">Usage</dt>
                    <dd className="mt-0.5 text-slate-700">
                      Total {selectedCoupon.totalUsageLimit || "∞"} · Per user{" "}
                      {selectedCoupon.perUserUsageLimit || "∞"} · Used{" "}
                      {selectedCoupon.usedCount || 0}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-slate-400">Validity</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {selectedCoupon.startDate
                        ? new Date(selectedCoupon.startDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                      {" → "}
                      {selectedCoupon.expiryDate
                        ? new Date(selectedCoupon.expiryDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </dd>
                  </div>
                  {selectedCoupon.description && (
                    <div className="col-span-2">
                      <dt className="text-[10px] text-slate-400">Description</dt>
                      <dd className="mt-0.5 text-slate-700 whitespace-pre-line">
                        {selectedCoupon.description}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] text-slate-400">Applicable on</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {selectedCoupon.applicableOn || "—"}
                    </dd>
                  </div>
                  {selectedCoupon.categories?.length > 0 && (
                    <div>
                      <dt className="text-[10px] text-slate-400">Categories</dt>
                      <dd className="mt-0.5 text-slate-700 truncate">
                        {selectedCoupon.categories.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate(ap(`coupons/edit/${selectedCoupon._id}`));
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CouponPage;
