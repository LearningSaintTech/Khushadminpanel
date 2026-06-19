import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  getStatusCount,
  getStatusLabel,
  useOrderAgentStatusOptions,
} from "../context/StatusOptionsContext";
import { inputClass, tableShell } from "../orderAgentShared";
import ColumnPicker from "./ColumnPicker";
import FilterSelect from "./FilterSelect";
import {
  defaultVisibleKeysFor,
  loadVisibleColumnsFromStorage,
  persistVisibleColumns,
} from "./columnPickerUtils";
import {
  LINE_CONSISTENCY_TABS,
  PAYMENT_FILTER_TABS,
} from "./listFilterUtils";
import {
  ORDER_AGENT_ITEM_COLUMNS,
  ORDER_AGENT_ITEM_COLUMNS_STORAGE_KEY,
  ORDER_AGENT_ORDER_COLUMNS,
  ORDER_AGENT_ORDER_COLUMNS_STORAGE_KEY,
} from "./orderAgentListColumns";
import { renderItemListCell, renderOrderListCell } from "./renderListCells";
import {
  buildProviderSelectOptions,
  buildStatusSelectOptions,
  isStatusValidForSection,
  resolveProviderFromOptions,
  resolveStatusFromOptions,
} from "./statusUrlSync";
import { formatStatusDisplayLabel, formatStatusWithCount } from "./statusDisplayLabels";
import { buildOrderAgentListPageMeta } from "./orderAgentListPageMeta";
import { useOrderAgentFilterOptions } from "./useOrderAgentFilterOptions";
import { useOrderAgentList } from "./useOrderAgentList";

function PaginationBar({ pagination, page, setPage, loading }) {
  const { total, totalPages } = pagination;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-stone-600">
      <span>
        {loading ? "Loading…" : `${total} row${total === 1 ? "" : "s"}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-border p-1 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-border p-1 disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Live order-agent list — all filters as dropdowns + search/city/dates.
 */
export default function OrderAgentListPage({
  title: titleOverride,
  subtitle: subtitleOverride,
  section = "orders",
  exchangeOnly = false,
  returnOnly = false,
  fixedItemStatus = "",
  showProviderFilter = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const statusOptionsCtx = useOrderAgentStatusOptions();
  const { countsLoading, statusCounts, sectionTotals, orders, exchange, returns } =
    statusOptionsCtx;
  const { statusOptions, statusOptionGroups, providerOptions, optionsLoading } =
    useOrderAgentFilterOptions(section);

  const rawSectionOptions = useMemo(() => {
    const list =
      section === "exchange" ? exchange : section === "returns" ? returns : orders;
    return Array.isArray(list) ? list : [];
  }, [section, orders, exchange, returns]);

  const statusFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("status") || "";
  }, [location.search]);

  const providerFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("provider") || "";
  }, [location.search]);

  const resolvedStatus = useMemo(
    () => fixedItemStatus || resolveStatusFromOptions(statusFromUrl, rawSectionOptions),
    [fixedItemStatus, statusFromUrl, rawSectionOptions],
  );

  const resolvedProvider = useMemo(
    () => resolveProviderFromOptions(providerFromUrl, providerOptions),
    [providerFromUrl, providerOptions],
  );

  const { title, subtitle } = useMemo(
    () =>
      buildOrderAgentListPageMeta({
        section,
        statusOptionsCtx,
        resolvedStatus,
        resolvedProvider,
        fixedItemStatus,
        showProviderFilter,
      }),
    [
      section,
      statusOptionsCtx,
      resolvedStatus,
      resolvedProvider,
      fixedItemStatus,
      showProviderFilter,
    ],
  );

  const pageTitle = titleOverride || title;
  const pageSubtitle = subtitleOverride || subtitle;
  const expectedProviderTotal = useMemo(() => {
    if (!resolvedProvider || countsLoading) return null;
    const key = String(resolvedProvider).toUpperCase();
    return statusOptionsCtx.providerCounts?.get(key) ?? null;
  }, [resolvedProvider, countsLoading, statusOptionsCtx.providerCounts]);

  const setQueryParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  };

  const applyStatusFilter = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("status", value);
      params.delete("provider");
    } else {
      params.delete("status");
    }
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  };

  const applyProviderFilter = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("provider", value);
      params.delete("status");
    } else {
      params.delete("provider");
    }
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  };

  const forceItemView = Boolean(showProviderFilter && resolvedProvider);

  const list = useOrderAgentList({
    exchangeOnly,
    returnOnly,
    statusFilter: resolvedStatus,
    providerFilter: showProviderFilter ? resolvedProvider : "",
    fixedItemStatus,
    forceItemView,
  });

  const { isByOrder } = list;
  const viewLabel = forceItemView ? "By item (carrier lines)" : isByOrder ? "By order" : "By item";
  const allColumns = isByOrder ? ORDER_AGENT_ORDER_COLUMNS : ORDER_AGENT_ITEM_COLUMNS;
  const storageKey = isByOrder
    ? ORDER_AGENT_ORDER_COLUMNS_STORAGE_KEY
    : ORDER_AGENT_ITEM_COLUMNS_STORAGE_KEY;

  const [visibleColumns, setVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(storageKey, allColumns),
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  useEffect(() => {
    setVisibleColumns(loadVisibleColumnsFromStorage(storageKey, allColumns));
  }, [storageKey, allColumns]);

  const activeColumns = useMemo(
    () => allColumns.filter((c) => visibleColumns.includes(c.key)),
    [allColumns, visibleColumns],
  );

  const paymentSelectOptions = useMemo(
    () => PAYMENT_FILTER_TABS.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const lineConsistencyOptions = useMemo(
    () => LINE_CONSISTENCY_TABS.map((t) => ({ value: t.value, label: t.label })),
    [],
  );

  const statusSelectDisabled = Boolean(fixedItemStatus) || optionsLoading;
  const statusSelectOptions = useMemo(() => {
    if (fixedItemStatus) {
      return [{ value: fixedItemStatus, label: formatStatusDisplayLabel(fixedItemStatus) }];
    }
    const countCtx = { statusCounts, sectionTotals, countsLoading };
    const fallbackLabel = formatStatusDisplayLabel(resolvedStatus, getStatusLabel(section, resolvedStatus, statusOptionsCtx));
    const withStatus = buildStatusSelectOptions(statusOptions, resolvedStatus, fallbackLabel);
    if (!resolvedStatus) return withStatus;
    const count = getStatusCount(section, resolvedStatus, countCtx);
    return withStatus.map((opt) => {
      if (opt.value !== resolvedStatus) return opt;
      if (opt.label.includes("(")) return opt;
      return {
        ...opt,
        label: formatStatusWithCount(fallbackLabel || opt.label, count, { loading: countsLoading }),
      };
    });
  }, [
    fixedItemStatus,
    statusOptions,
    resolvedStatus,
    section,
    statusOptionsCtx,
    statusCounts,
    sectionTotals,
    countsLoading,
  ]);

  const statusSelectGroups = useMemo(() => {
    if (fixedItemStatus || !statusOptionGroups) return null;
    if (!resolvedStatus) return statusOptionGroups;
    const inGroups = statusOptionGroups.some((g) =>
      g.options.some((o) => o.value === resolvedStatus),
    );
    if (inGroups) return statusOptionGroups;
    const fallbackLabel = formatStatusDisplayLabel(resolvedStatus);
    const count = getStatusCount(section, resolvedStatus, { statusCounts, sectionTotals, countsLoading });
    const extra = {
      value: resolvedStatus,
      label: formatStatusWithCount(fallbackLabel, count, { loading: countsLoading }),
    };
    return statusOptionGroups.map((g, idx) =>
      idx === statusOptionGroups.length - 1 ? { ...g, options: [...g.options, extra] } : g,
    );
  }, [
    fixedItemStatus,
    statusOptionGroups,
    resolvedStatus,
    section,
    statusCounts,
    sectionTotals,
    countsLoading,
  ]);

  const providerSelectOptions = useMemo(() => {
    const base =
      providerOptions.length > 0
        ? providerOptions
        : [{ value: "", label: "All carriers" }];
    return buildProviderSelectOptions(base, resolvedProvider, resolvedProvider);
  }, [providerOptions, resolvedProvider]);

  useEffect(() => {
    if (fixedItemStatus || optionsLoading || !statusFromUrl) return;
    if (rawSectionOptions.length <= 1) return;
    if (isStatusValidForSection(statusFromUrl, rawSectionOptions)) return;
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  }, [
    fixedItemStatus,
    optionsLoading,
    statusFromUrl,
    rawSectionOptions,
    searchParams,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (fixedItemStatus || optionsLoading) return;
    if (!resolvedStatus || resolvedStatus === statusFromUrl) return;
    const params = new URLSearchParams(searchParams);
    params.set("status", resolvedStatus);
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  }, [
    fixedItemStatus,
    optionsLoading,
    resolvedStatus,
    statusFromUrl,
    searchParams,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (!showProviderFilter || optionsLoading) return;
    if (!resolvedProvider || resolvedProvider === providerFromUrl) return;
    const params = new URLSearchParams(searchParams);
    params.set("provider", resolvedProvider);
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  }, [
    showProviderFilter,
    optionsLoading,
    resolvedProvider,
    providerFromUrl,
    searchParams,
    location.pathname,
    navigate,
  ]);

  const toggleColumn = (key) => {
    const col = allColumns.find((c) => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      persistVisibleColumns(storageKey, next);
      return next;
    });
  };

  const rowKey = (row, idx) =>
    isByOrder
      ? row.orderId || row._id || idx
      : `${row.orderId}-${row.itemId || idx}`;

  const renderCell = (key, row) =>
    isByOrder ? renderOrderListCell(key, row) : renderItemListCell(key, row);

  const hasActiveFilters =
    list.search ||
    list.city ||
    list.dateFrom ||
    list.dateTo ||
    list.paymentFilter ||
    list.lineConsistency ||
    resolvedStatus ||
    resolvedProvider;

  const clearAll = () => {
    list.clearFilters();
    if (!fixedItemStatus) {
      setQueryParam("status", "");
    }
    if (showProviderFilter) {
      setQueryParam("provider", "");
    }
  };

  return (
    <div className="mx-auto max-w-[min(100%,96rem)] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{pageTitle}</h1>
          {pageSubtitle ? (
            <p className="text-[11px] text-stone-500">
              {pageSubtitle}
              {expectedProviderTotal != null && forceItemView ? (
                <span className="text-stone-400">
                  {" "}
                  · sidebar count {expectedProviderTotal}
                </span>
              ) : null}
              <span className="text-stone-400">
                {" "}
                · {viewLabel}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => list.refresh()}
            disabled={list.loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted disabled:opacity-60"
          >
            <RefreshCw size={14} className={list.loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <ColumnPicker
            columns={allColumns}
            visibleKeys={visibleColumns}
            onToggle={toggleColumn}
            onReset={() => {
              const next = defaultVisibleKeysFor(allColumns);
              setVisibleColumns(next);
              persistVisibleColumns(storageKey, next);
            }}
            onSelectAll={() => {
              const next = allColumns.map((c) => c.key);
              setVisibleColumns(next);
              persistVisibleColumns(storageKey, next);
            }}
            open={columnsOpen}
            onOpenChange={setColumnsOpen}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Search
          </label>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="search"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Order ID, SKU, customer, phone, email…"
              className={`${inputClass} w-full pl-8`}
            />
          </div>
        </div>

        <FilterSelect
          key={`status-${section}-${fixedItemStatus || resolvedStatus || "all"}`}
          label={isByOrder ? "Order status" : "Line status"}
          value={fixedItemStatus || resolvedStatus}
          onChange={applyStatusFilter}
          disabled={statusSelectDisabled}
          options={statusSelectGroups ? [] : statusSelectOptions}
          optionGroups={statusSelectGroups}
        />

        {showProviderFilter ? (
          <FilterSelect
            key={`provider-${resolvedProvider || "all"}`}
            label="Shipping provider"
            value={resolvedProvider}
            onChange={applyProviderFilter}
            disabled={optionsLoading}
            options={providerSelectOptions}
          />
        ) : null}

        <FilterSelect
          label="Payment"
          value={list.paymentFilter}
          onChange={list.setPaymentFilter}
          options={paymentSelectOptions}
        />

        {isByOrder ? (
          <FilterSelect
            label="Line consistency"
            value={list.lineConsistency}
            onChange={list.setLineConsistency}
            options={lineConsistencyOptions}
          />
        ) : null}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            City
          </label>
          <input
            type="text"
            value={list.city}
            onChange={(e) => list.setCity(e.target.value)}
            placeholder="Ship-to city"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            From date
          </label>
          <input
            type="date"
            value={list.dateFrom}
            onChange={(e) => list.setDateFrom(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            To date
          </label>
          <input
            type="date"
            value={list.dateTo}
            onChange={(e) => list.setDateTo(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] font-medium text-brand-700 hover:underline"
        >
          Clear all filters
        </button>
      ) : null}

      {list.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {list.error}
        </p>
      ) : null}

      <div className={`${tableShell} flex flex-col`}>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                {activeColumns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-3 py-2">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.loading && list.rows.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-3 py-10 text-center text-stone-500">
                    Loading…
                  </td>
                </tr>
              ) : list.rows.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-3 py-10 text-center text-stone-500">
                    No orders match these filters
                  </td>
                </tr>
              ) : (
                list.rows.map((row, idx) => (
                  <tr key={rowKey(row, idx)} className="hover:bg-canvas-muted/60">
                    {activeColumns.map((col) => (
                      <td key={col.key} className="max-w-56 px-3 py-2.5 text-stone-800">
                        {renderCell(col.key, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          pagination={list.pagination}
          page={list.page}
          setPage={list.setPage}
          loading={list.loading}
        />
      </div>
    </div>
  );
}
