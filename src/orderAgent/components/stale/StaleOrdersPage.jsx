import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { getStaleOrdersList } from "../../apis/orderAgentApi";
import { useOrderAgentStatusOptions } from "../../context/StatusOptionsContext";
import ColumnPicker from "../../list/ColumnPicker";
import {
  defaultVisibleKeysFor,
  loadVisibleColumnsFromStorage,
  persistVisibleColumns,
} from "../../list/columnPickerUtils";
import FilterSelect from "../../list/FilterSelect";
import { apiErrMessage, unwrapApiData } from "../../list/listFilterUtils";
import { ORDER_AGENT_STALE_COLUMNS } from "../../list/orderAgentListColumns";
import { renderStaleCell } from "../../list/renderListCells";
import { inputClass, tableShell } from "../../orderAgentShared";

const STALE_COLUMNS_STORAGE_KEY = "khush_order_agent_stale_visible_columns";

const HOURS_OPTIONS = [
  { value: "24", label: "24 hours" },
  { value: "36", label: "36 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

export default function StaleOrdersPage() {
  const { staleCount, staleThresholdHours, countsLoading } = useOrderAgentStatusOptions();
  const defaultHours = staleThresholdHours ?? 24;
  const [hoursThreshold, setHoursThreshold] = useState(defaultHours);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [totalMatched, setTotalMatched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(STALE_COLUMNS_STORAGE_KEY, ORDER_AGENT_STALE_COLUMNS),
  );

  useEffect(() => {
    if (defaultHours && hoursThreshold === 24 && defaultHours !== 24) {
      setHoursThreshold(defaultHours);
    }
  }, [defaultHours, hoursThreshold]);

  const activeColumns = useMemo(
    () => ORDER_AGENT_STALE_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns],
  );

  const fetchStale = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStaleOrdersList({ hours: hoursThreshold });
      const payload = unwrapApiData(res);
      const list = Array.isArray(payload.rows) ? payload.rows : [];
      setRows(list);
      setTotalMatched(payload.totalMatched ?? list.length);
    } catch (err) {
      setError(apiErrMessage(err, "Failed to load stale orders"));
      setRows([]);
      setTotalMatched(0);
    } finally {
      setLoading(false);
    }
  }, [hoursThreshold]);

  useEffect(() => {
    fetchStale();
  }, [fetchStale]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      ["orderId", "sku", "customerName", "city"].some((f) =>
        String(row[f] || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  const sidebarMatch =
    hoursThreshold === defaultHours && !countsLoading && staleCount != null
      ? staleCount === totalMatched
      : null;

  const toggleColumn = (key) => {
    const col = ORDER_AGENT_STALE_COLUMNS.find((c) => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      persistVisibleColumns(STALE_COLUMNS_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Stale orders</h1>
          <p className="text-[11px] text-stone-500">
            CONFIRMED lines older than {hoursThreshold}h · {totalMatched} matched
            {sidebarMatch === true ? (
              <span className="text-stone-400"> · matches sidebar ({staleCount})</span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchStale}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <ColumnPicker
            columns={ORDER_AGENT_STALE_COLUMNS}
            visibleKeys={visibleColumns}
            onToggle={toggleColumn}
            onReset={() => {
              const next = defaultVisibleKeysFor(ORDER_AGENT_STALE_COLUMNS);
              setVisibleColumns(next);
              persistVisibleColumns(STALE_COLUMNS_STORAGE_KEY, next);
            }}
            onSelectAll={() => {
              const next = ORDER_AGENT_STALE_COLUMNS.map((c) => c.key);
              setVisibleColumns(next);
              persistVisibleColumns(STALE_COLUMNS_STORAGE_KEY, next);
            }}
            open={columnsOpen}
            onOpenChange={setColumnsOpen}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>
          Lines in <strong>CONFIRMED</strong> longer than the threshold with no processing update.
          Sidebar badge uses the same {defaultHours}h threshold.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Older than"
          value={String(hoursThreshold)}
          onChange={(v) => setHoursThreshold(Number(v))}
          options={HOURS_OPTIONS}
        />
        <div className="relative">
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
              placeholder="Order ID, SKU, customer, city…"
              className={`${inputClass} w-full pl-8`}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className={`${tableShell} flex flex-col`}>
        <div className="overflow-auto">
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
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-3 py-10 text-center text-stone-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-3 py-10 text-center text-stone-500">
                    No stale lines match
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={`${row.orderId}-${row.sku}-${idx}`}
                    className="hover:bg-canvas-muted/60"
                  >
                    {activeColumns.map((col) => (
                      <td key={col.key} className="px-3 py-2.5 text-stone-800">
                        {renderStaleCell(col.key, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-3 py-2 text-[11px] text-stone-600">
          {loading
            ? "Loading…"
            : search.trim()
              ? `${filtered.length} of ${totalMatched} row${totalMatched === 1 ? "" : "s"}`
              : `${totalMatched} row${totalMatched === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
}
