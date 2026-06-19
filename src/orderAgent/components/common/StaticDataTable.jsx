import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { VIEW_ORDER, useViewMode } from "../../context/ViewModeContext";
import {
  StaticPreviewBanner,
  StatusBadge,
  formatDt,
  groupRowsByOrder,
  inputClass,
  tableShell,
} from "../../orderAgentShared";

const DEFAULT_ORDER_COLUMNS = [
  { key: "orderId", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "city", label: "City" },
  {
    key: "itemCount",
    label: "Items",
    render: (row) => (
      <span className="tabular-nums font-medium text-stone-800">{row.itemCount ?? "—"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: "payment", label: "Payment" },
  {
    key: "updatedAt",
    label: "Updated",
    render: (row) => formatDt(row.updatedAt),
  },
];

/**
 * Reusable static list — search + optional status filter from sidebar context.
 * Respects global by-order / by-item toggle from layout header.
 */
export default function StaticDataTable({
  title,
  subtitle,
  statusFilter = "",
  providerFilter = "",
  rows = [],
  columns = [],
  orderColumns = DEFAULT_ORDER_COLUMNS,
  statusField = "status",
  providerField = "shippingProvider",
  searchFields = ["orderId", "sku", "customer"],
  orderSearchFields = ["orderId", "customer", "city"],
  groupExtraKeys = [],
}) {
  const [search, setSearch] = useState("");
  const { viewMode } = useViewMode();
  const isByOrder = viewMode === VIEW_ORDER;

  const sourceRows = useMemo(() => {
    if (!isByOrder) return rows;
    return groupRowsByOrder(rows, {
      statusField,
      extraKeys: groupExtraKeys,
    });
  }, [rows, isByOrder, statusField, groupExtraKeys]);

  const activeColumns = isByOrder ? orderColumns : columns;
  const activeSearchFields = isByOrder ? orderSearchFields : searchFields;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceRows.filter((row) => {
      if (!isByOrder && statusFilter && String(row[statusField]) !== statusFilter) {
        return false;
      }
      if (!isByOrder && providerFilter && String(row[providerField] || "") !== providerFilter) {
        return false;
      }
      if (isByOrder && statusFilter) {
        const matchesStatus =
          String(row.status) === statusFilter ||
          (row._lineItems || []).some((line) => String(line[statusField]) === statusFilter);
        if (!matchesStatus) return false;
      }
      if (isByOrder && providerFilter) {
        const matchesProvider = (row._lineItems || []).some(
          (line) => String(line[providerField] || "") === providerFilter,
        );
        if (!matchesProvider) return false;
      }
      if (!q) return true;
      return activeSearchFields.some((field) =>
        String(row[field] || "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [
    sourceRows,
    statusFilter,
    providerFilter,
    search,
    statusField,
    providerField,
    activeSearchFields,
    isByOrder,
  ]);

  const viewHint = isByOrder ? "Grouped by order" : "One row per line item";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">{title}</h1>
        {subtitle ? (
          <p className="text-[11px] text-stone-500">
            {subtitle}
            <span className="text-stone-400"> · {viewHint}</span>
          </p>
        ) : (
          <p className="text-[11px] text-stone-500">{viewHint}</p>
        )}
      </div>

      <StaticPreviewBanner />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Search
          </label>
          <div className="relative mt-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isByOrder ? "Order ID, customer, city…" : "Order ID, SKU, customer…"
              }
              className={`${inputClass} w-full pl-8`}
            />
          </div>
        </div>
        <p className="pb-1 text-[11px] text-stone-500">
          {filtered.length} {isByOrder ? "order" : "row"}
          {filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className={tableShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              {activeColumns.map((col) => (
                <th key={col.key} className="px-3 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length}
                  className="px-3 py-10 text-center text-stone-500"
                >
                  No {isByOrder ? "orders" : "rows"} match this filter
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-canvas-muted/60">
                  {activeColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2.5 text-stone-800">
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StatusBadge, formatDt };
