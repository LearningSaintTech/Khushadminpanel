import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileDown,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  getStaleOrders,
  downloadStaleOrdersPdf,
  runStaleOrderAlertEmail,
} from "../../apis/Orderapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  STALE_ORDER_TABLE_COLUMNS,
  defaultStaleVisibleColumnKeys,
  loadStaleVisibleColumnsFromStorage,
  persistStaleVisibleColumns,
  tableScrollShell,
  staleInputClass,
  staleBtnOutline,
  staleBtnWarning,
} from "./staleOrdersShared";

const getBackendErrorMessages = (err, fallback) => {
  const data = err?.response?.data ?? {};
  const messages = [];
  const push = (value) => {
    if (!value) return;
    const str = String(value).trim();
    if (str && !messages.includes(str)) messages.push(str);
  };
  if (typeof err === "string") push(err);
  push(data?.message);
  push(err?.message);
  if (messages.length === 0 && fallback) push(fallback);
  return messages;
};

const STALE_PAGE_SIZE = 20;

export default function StaleOrdersPage() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = useCallback(
    (suffix) =>
      `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/"),
    [basePath],
  );

  const [staleOrders, setStaleOrders] = useState([]);
  const [staleMeta, setStaleMeta] = useState({
    totalMatched: 0,
    truncated: false,
    olderThanHours: 24,
  });
  const [staleLoading, setStaleLoading] = useState(true);
  const [stalePdfLoading, setStalePdfLoading] = useState(false);
  const [staleEmailLoading, setStaleEmailLoading] = useState(false);
  const [staleHours, setStaleHours] = useState(24);
  const [staleSearch, setStaleSearch] = useState("");
  const [staleVisibleColumns, setStaleVisibleColumns] = useState(
    loadStaleVisibleColumnsFromStorage,
  );
  const [staleColumnsOpen, setStaleColumnsOpen] = useState(false);
  const [stalePage, setStalePage] = useState(1);

  const staleActiveColumns = useMemo(
    () => STALE_ORDER_TABLE_COLUMNS.filter((col) => staleVisibleColumns.includes(col.key)),
    [staleVisibleColumns],
  );

  const fetchStaleOrdersList = useCallback(async (hours = staleHours) => {
    try {
      setStaleLoading(true);
      const res = await getStaleOrders(hours);
      const payload = res?.data?.data ?? res?.data ?? res;
      setStaleOrders(Array.isArray(payload?.rows) ? payload.rows : []);
      setStaleMeta({
        totalMatched: payload?.totalMatched ?? payload?.rows?.length ?? 0,
        truncated: !!payload?.truncated,
        olderThanHours: payload?.olderThanHours ?? hours,
      });
    } catch (err) {
      toast.error(getBackendErrorMessages(err, "Failed to load stale orders")[0]);
      setStaleOrders([]);
    } finally {
      setStaleLoading(false);
    }
  }, [staleHours]);

  useEffect(() => {
    fetchStaleOrdersList(staleHours);
  }, [fetchStaleOrdersList, staleHours]);

  useEffect(() => {
    setStalePage(1);
  }, [staleSearch, staleHours]);

  const filteredStaleOrders = staleSearch.trim()
    ? staleOrders.filter((row) => {
        const q = staleSearch.trim().toLowerCase();
        return (
          String(row.orderId || "").toLowerCase().includes(q) ||
          String(row.sku || "").toLowerCase().includes(q) ||
          String(row.customerName || "").toLowerCase().includes(q) ||
          String(row.phone || "").toLowerCase().includes(q) ||
          String(row.city || "").toLowerCase().includes(q) ||
          String(row.deliveryType || "").toLowerCase().includes(q)
        );
      })
    : staleOrders;

  const staleTotalPages = Math.max(
    1,
    Math.ceil(filteredStaleOrders.length / STALE_PAGE_SIZE) || 1,
  );

  const paginatedStaleRows = useMemo(() => {
    const start = (stalePage - 1) * STALE_PAGE_SIZE;
    return filteredStaleOrders.slice(start, start + STALE_PAGE_SIZE);
  }, [filteredStaleOrders, stalePage]);

  const toggleStaleColumn = (key) => {
    const def = STALE_ORDER_TABLE_COLUMNS.find((c) => c.key === key);
    if (def?.alwaysVisible) return;
    setStaleVisibleColumns((prev) => {
      const has = prev.includes(key);
      const without = has ? prev.filter((k) => k !== key) : [...prev, key];
      const always = STALE_ORDER_TABLE_COLUMNS.filter((c) => c.alwaysVisible).map(
        (c) => c.key,
      );
      const next = [...new Set([...always, ...without])];
      if (next.length <= always.length && has) return prev;
      persistStaleVisibleColumns(next);
      return next;
    });
  };

  const resetStaleColumns = () => {
    const next = defaultStaleVisibleColumnKeys();
    setStaleVisibleColumns(next);
    persistStaleVisibleColumns(next);
  };

  const selectAllStaleColumns = () => {
    const next = STALE_ORDER_TABLE_COLUMNS.map((c) => c.key);
    setStaleVisibleColumns(next);
    persistStaleVisibleColumns(next);
  };

  const handleDownloadStalePdf = async () => {
    try {
      setStalePdfLoading(true);
      const blob = await downloadStaleOrdersPdf(staleHours);
      if (blob && typeof blob.type === "string" && blob.type.includes("json")) {
        const text = await blob.text();
        let msg = "Could not generate stale orders PDF";
        try {
          const j = JSON.parse(text);
          if (j?.message) msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      if (!(blob instanceof Blob)) {
        toast.error("Could not generate stale orders PDF");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stale-orders-${staleHours}h.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Stale orders PDF downloaded");
    } catch (err) {
      toast.error(getBackendErrorMessages(err, "Could not download stale orders PDF")[0]);
    } finally {
      setStalePdfLoading(false);
    }
  };

  const handleSendStaleAlertEmail = async () => {
    try {
      setStaleEmailLoading(true);
      const res = await runStaleOrderAlertEmail(staleHours);
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.emailSent) {
        toast.success("Stale order alert email sent");
      } else if (data?.skippedReason === "no_stale_orders") {
        toast.success("No stale orders — email not sent");
      } else {
        toast.error(data?.emailError || "Set STALE_ORDER_ALERT_EMAIL_TO on the server");
      }
    } catch (err) {
      toast.error(getBackendErrorMessages(err, "Could not send stale order alert email")[0]);
    } finally {
      setStaleEmailLoading(false);
    }
  };

  const openOrder = (orderId) => {
    if (!orderId) return;
    navigate(`${ap("orders")}?open=${encodeURIComponent(orderId)}`);
  };

  return (
    <div className="text-stone-900">
      <Link
        to={ap("orders")}
        className="mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>

      <div className="mb-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-stone-800">
        <p className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          What counts as stale?
        </p>
        <p className="mt-0.5 text-stone-600">
          Order lines still in <strong>CONFIRMED</strong> without moving to PROCESSING or shipped
          within the threshold. Use PDF export or email for ops reports; open a row to fix it in
          order details.
        </p>
      </div>

      <div className="mb-2 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          Stale orders
        </h1>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Threshold
          </label>
          <select
            value={staleHours}
            onChange={(e) => setStaleHours(parseInt(e.target.value, 10) || 24)}
            className={`${staleInputClass} w-auto min-w-[5rem]`}
          >
            <option value={24}>24h</option>
            <option value={48}>48h</option>
            <option value={72}>72h</option>
          </select>
        </div>
        <div className="relative min-w-[140px] flex-1 max-w-xs">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Search
          </label>
          <Search className="pointer-events-none absolute left-2.5 top-[1.65rem] h-3.5 w-3.5 text-stone-400" />
          <input
            type="search"
            value={staleSearch}
            onChange={(e) => setStaleSearch(e.target.value)}
            placeholder="Order ID, SKU, customer…"
            className={`${staleInputClass} pl-8`}
          />
        </div>
        <div className="relative flex flex-wrap items-end gap-1.5">
          <button
            type="button"
            onClick={() => setStaleColumnsOpen((o) => !o)}
            className={staleBtnOutline}
            aria-expanded={staleColumnsOpen}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns
            <span className="rounded-full bg-warning/15 px-1 py-0.5 text-[10px] font-semibold text-warning">
              {staleActiveColumns.length}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${staleColumnsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {staleColumnsOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-2rem,20rem)] rounded-xl border border-border bg-white p-2.5 shadow-lg">
              <p className="mb-1.5 text-[10px] font-semibold text-stone-700">Visible columns</p>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {STALE_ORDER_TABLE_COLUMNS.map((col) => {
                  const checked = staleVisibleColumns.includes(col.key);
                  const locked = !!col.alwaysVisible;
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 rounded px-1.5 py-1 text-[11px] ${
                        locked
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-brand-50/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleStaleColumn(col.key)}
                        className="rounded border-border accent-brand-600"
                      />
                      {col.label}
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={selectAllStaleColumns}
                  className="text-[10px] font-medium text-brand-600 hover:text-brand-800"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={resetStaleColumns}
                  className="text-[10px] font-medium text-stone-600 hover:text-stone-800"
                >
                  Reset default
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={staleLoading}
            onClick={() => fetchStaleOrdersList(staleHours)}
            className={staleBtnOutline}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${staleLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            disabled={stalePdfLoading || staleLoading}
            onClick={handleDownloadStalePdf}
            className={staleBtnOutline}
          >
            {stalePdfLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            PDF
          </button>
          <button
            type="button"
            disabled={staleEmailLoading || staleLoading}
            onClick={handleSendStaleAlertEmail}
            className={staleBtnWarning}
            title="Sends to STALE_ORDER_ALERT_EMAIL_TO on server"
          >
            {staleEmailLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Email report
          </button>
        </div>
      </div>

      <p className="mb-2 text-[10px] text-stone-500">
        {staleLoading ? (
          "Loading…"
        ) : (
          <>
            <span className="font-medium text-stone-800">{staleMeta.totalMatched}</span> line(s)
            matched
            {staleMeta.truncated ? " · list capped — use PDF for full export" : ""}
            {staleSearch.trim() ? ` · ${filteredStaleOrders.length} after search` : ""}
            {!staleLoading && filteredStaleOrders.length > 0
              ? ` · page ${stalePage}/${staleTotalPages}`
              : ""}
          </>
        )}
      </p>

      {staleLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white py-16 text-stone-500">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
          <p className="text-[11px]">Loading stale orders…</p>
        </div>
      ) : filteredStaleOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white py-16 text-stone-500">
          <CheckCircle className="mb-2 h-8 w-8 text-success" />
          <p className="text-sm font-medium text-stone-700">No stale orders</p>
          <p className="mt-1 text-[11px]">
            {staleSearch.trim()
              ? "No matches for your search"
              : `All clear for ${staleHours}+ hour threshold`}
          </p>
        </div>
      ) : (
        <>
          <div className={tableScrollShell}>
            <table className="w-full min-w-[880px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    #
                  </th>
                  {staleActiveColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 ${col.headerClass || ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaleRows.map((row, idx) => (
                  <tr
                    key={`${row.orderId}-${row.sku}-${idx}`}
                    className="border-t border-border/80 transition-colors hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-1.5 text-[10px] text-stone-400">
                      {(stalePage - 1) * STALE_PAGE_SIZE + idx + 1}
                    </td>
                    {staleActiveColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-2 py-1 text-[10px] ${col.cellClass || ""}`}
                        title={
                          col.key === "sku" || col.key === "customerName"
                            ? String(col.render(row) ?? "")
                            : undefined
                        }
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => openOrder(row.orderId)}
                        className="rounded px-1 py-0.5 text-[10px] font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-600">
            <span>
              Showing{" "}
              <span className="font-medium text-stone-800">
                {filteredStaleOrders.length === 0
                  ? 0
                  : (stalePage - 1) * STALE_PAGE_SIZE + 1}
              </span>
              –
              <span className="font-medium text-stone-800">
                {Math.min(stalePage * STALE_PAGE_SIZE, filteredStaleOrders.length)}
              </span>{" "}
              of <span className="font-medium text-stone-800">{filteredStaleOrders.length}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={stalePage <= 1}
                onClick={() => setStalePage((p) => Math.max(1, p - 1))}
                className={staleBtnOutline}
              >
                <ChevronLeft className="h-3 w-3" />
                Prev
              </button>
              <span className="rounded-lg bg-canvas-muted px-2 py-1 tabular-nums">
                {stalePage} / {staleTotalPages}
              </span>
              <button
                type="button"
                disabled={stalePage >= staleTotalPages}
                onClick={() => setStalePage((p) => p + 1)}
                className={staleBtnOutline}
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
