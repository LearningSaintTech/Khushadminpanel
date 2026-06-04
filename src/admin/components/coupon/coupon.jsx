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
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

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
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-medium text-stone-700 shadow-sm hover:bg-canvas-muted sm:w-auto"
        aria-expanded={open}
      >
        <Columns3 className="h-3.5 w-3.5 shrink-0" />
        Columns
        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
          {activeCount}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-1.5rem,20rem)] rounded-lg border border-border bg-white p-2.5 shadow-lg sm:left-auto sm:right-0">
          <p className="mb-2 text-[11px] font-semibold text-stone-700">Choose columns to show</p>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              const locked = !!col.alwaysVisible;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-canvas-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(col.key)}
                    className="accent-brand-600 rounded border-border"
                  />
                  <span className="text-stone-800">{col.label}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[10px] font-medium text-brand-600 hover:text-brand-700"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-medium text-stone-600 hover:text-stone-800"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-canvas-muted text-stone-700",
    green: "bg-success-bg text-success",
    red: "bg-danger-bg text-danger",
    purple: "bg-brand-100 text-brand-700",
    blue: "bg-info-bg text-info",
    indigo: "bg-brand-50 text-brand-700",
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
  const [limit, setLimit] = useState(20);
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
  }, [debouncedSearchTerm, influencerFilter, autoIncludedFilter, limit]);

  useEffect(() => {
    fetchCoupons();
  }, [currentPage, debouncedSearchTerm, influencerFilter, autoIncludedFilter, limit]);

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
          <span className="font-mono text-[10px] text-stone-500" title={coupon._id}>
            {String(coupon._id || "").slice(-8) || "—"}
          </span>
        );
      case "code":
        return (
          <span className="font-mono text-[11px] font-semibold text-brand-700 whitespace-nowrap">
            {coupon.code}
          </span>
        );
      case "description":
        return (
          <span className="block max-w-[200px] truncate text-[11px] text-stone-600" title={coupon.description || ""}>
            {coupon.description || "—"}
          </span>
        );
      case "discount":
        return (
          <span className="whitespace-nowrap text-[11px] font-medium text-stone-800">
            {formatDiscount(coupon)}
          </span>
        );
      case "discountType":
        return (
          <Badge tone="slate">{coupon.discountType === "FIXED" ? "Flat ₹" : "Percent"}</Badge>
        );
      case "maxDiscount":
        return (
          <span className="whitespace-nowrap text-[11px] text-stone-600">
            {coupon.maxDiscountAmount != null ? `₹${coupon.maxDiscountAmount}` : "—"}
          </span>
        );
      case "minCart":
        return (
          <span className="whitespace-nowrap text-[11px] text-stone-600">
            {coupon.minCartValue != null ? `₹${coupon.minCartValue}` : "—"}
          </span>
        );
      case "maxCart":
        return (
          <span className="whitespace-nowrap text-[11px] text-stone-600">
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
        return <span className="whitespace-nowrap text-[11px] text-stone-600">{formatDate(coupon.startDate)}</span>;
      case "expiryDate":
        return <span className="whitespace-nowrap text-[11px] text-stone-600">{formatDate(coupon.expiryDate)}</span>;
      case "usage":
        return (
          <span className="whitespace-nowrap text-[10px] text-stone-600">
            Total {coupon.totalUsageLimit || "∞"} · Per user {coupon.perUserUsageLimit || "∞"}
          </span>
        );
      case "usedCount":
        return (
          <span className="whitespace-nowrap text-[11px] tabular-nums text-stone-700">
            {coupon.usedCount ?? 0}
          </span>
        );
      case "applicableOn":
        return (
          <span className="whitespace-nowrap text-[11px] text-stone-600">
            {coupon.applicableOn || "—"}
          </span>
        );
      default:
        return "—";
    }
  };

  const tableMinWidth = Math.max(480, activeColumns.length * 110 + 72);

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Coupons
        </h1>
        <div className="relative min-w-[140px] max-w-[200px] flex-1 sm:flex-none sm:w-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search code…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} w-full pl-8 pr-8`}
            aria-label="Search coupons"
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
          value={influencerFilter}
          onChange={(e) => setInfluencerFilter(e.target.value)}
          className={`${inputClass} min-w-[120px] max-w-[140px]`}
          title="Coupon type"
        >
          <option value="all">All types</option>
          <option value="normal">Normal</option>
          <option value="influencer">Influencer</option>
        </select>
        <select
          value={autoIncludedFilter}
          onChange={(e) => setAutoIncludedFilter(e.target.value)}
          className={`${inputClass} min-w-[120px] max-w-[140px]`}
          title="Inclusion"
        >
          <option value="all">All inclusion</option>
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
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
        <button
          type="button"
          onClick={() => navigate(ap("coupons/create"))}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      <main className="mx-auto w-full min-w-0">
        {error ? (
          <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
            {error}
          </div>
        ) : null}

        {loading && coupons.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading…
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
            <Ticket className="mx-auto mb-2 h-8 w-8 text-stone-300" />
            <p className="text-[11px] font-medium text-stone-600">No coupons found</p>
            <button
              type="button"
              onClick={() => navigate(ap("coupons/create"))}
              className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Create coupon →
            </button>
          </div>
        ) : (
          <>
            <p className="mb-1 text-[10px] text-stone-500">
              {activeColumns.length} columns · scroll horizontally for more
            </p>
            <div className={tableScrollShell}>
              <table
                className="w-full border-collapse text-left text-[11px]"
                style={{ minWidth: `${tableMinWidth + 40}px` }}
              >
                <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                  <tr>
                    <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      #
                    </th>
                    {activeColumns.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon, idx) => (
                    <tr
                      key={coupon._id}
                      className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                        {rowIndexBase + idx + 1}
                      </td>
                      {activeColumns.map((col) => (
                        <td key={col.key} className="px-2 py-2 align-top">
                          {renderCouponCell(col.key, coupon)}
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setShowModal(true);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="View"
                            aria-label="View coupon"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(ap(`coupons/edit/${coupon._id}`))}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="Edit"
                            aria-label="Edit coupon"
                          >
                            <Edit size={13} />
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
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
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
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Detail modal */}
        {showModal && selectedCoupon ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
            onClick={() => setShowModal(false)}
            role="presentation"
          >
            <div
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Coupon details
                  </p>
                  <h2 className="truncate font-mono text-sm font-semibold text-brand-700">
                    {selectedCoupon.code}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1 text-stone-500 hover:bg-canvas-muted"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-3 py-2.5">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  <div>
                    <dt className="text-[10px] text-stone-400">Status</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isActive ? "green" : "red"}>
                        {selectedCoupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-stone-400">Discount</dt>
                    <dd className="mt-0.5 font-medium text-stone-800">
                      {formatDiscount(selectedCoupon)}
                      {selectedCoupon.maxDiscountAmount && (
                        <span className="ml-1 font-normal text-stone-500">
                          (max ₹{selectedCoupon.maxDiscountAmount})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-stone-400">Type</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isInfluencer ? "purple" : "slate"}>
                        {selectedCoupon.isInfluencer ? "Influencer" : "Normal"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-stone-400">Inclusion</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isAutoIncluded ? "blue" : "slate"}>
                        {selectedCoupon.isAutoIncluded ? "Auto" : "Manual"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-stone-400">Min cart</dt>
                    <dd className="mt-0.5 text-stone-800">
                      ₹{selectedCoupon.minCartValue ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-stone-400">Max cart</dt>
                    <dd className="mt-0.5 text-stone-800">
                      ₹{selectedCoupon.maxCartValue ?? "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-stone-400">Usage</dt>
                    <dd className="mt-0.5 text-stone-700">
                      Total {selectedCoupon.totalUsageLimit || "∞"} · Per user{" "}
                      {selectedCoupon.perUserUsageLimit || "∞"} · Used{" "}
                      {selectedCoupon.usedCount || 0}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-stone-400">Validity</dt>
                    <dd className="mt-0.5 text-stone-700">
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
                      <dt className="text-[10px] text-stone-400">Description</dt>
                      <dd className="mt-0.5 text-stone-700 whitespace-pre-line">
                        {selectedCoupon.description}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] text-stone-400">Applicable on</dt>
                    <dd className="mt-0.5 text-stone-800">
                      {selectedCoupon.applicableOn || "—"}
                    </dd>
                  </div>
                  {selectedCoupon.categories?.length > 0 && (
                    <div>
                      <dt className="text-[10px] text-stone-400">Categories</dt>
                      <dd className="mt-0.5 text-stone-700 truncate">
                        {selectedCoupon.categories.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate(ap(`coupons/edit/${selectedCoupon._id}`));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default CouponPage;
