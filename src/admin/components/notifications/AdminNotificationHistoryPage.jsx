import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { History, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Alert,
  tableScrollShell,
  inputClass,
  btnOutline,
} from "./notificationsShared";

const DEFAULT_LIMIT = 20;
const LIMIT_OPTIONS = [10, 20, 50, 100];

const CHANNELS = [
  { value: "", label: "All channels" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
];
const SUCCESS_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Success" },
  { value: "false", label: "Failed" },
];

const EMPTY_FILTERS = { channel: "", success: "", from: "", to: "" };

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default function AdminNotificationHistoryPage() {
  const location = useLocation();
  const isSentView = location.pathname.endsWith("/sent");

  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const loadPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      const params = { page: pageNum, limit };
      if (appliedFilters.channel) params.channel = appliedFilters.channel;
      if (appliedFilters.success) params.success = appliedFilters.success;
      if (appliedFilters.from) params.from = appliedFilters.from;
      if (appliedFilters.to) params.to = appliedFilters.to;
      try {
        const data = await adminNotificationApi.getHistory(params);
        const items = data?.list ?? data?.data?.list ?? [];
        const tot = data?.total ?? data?.data?.total ?? 0;
        setList(Array.isArray(items) ? items : []);
        setTotal(Number(tot) || 0);
        setPage(data?.page ?? data?.data?.page ?? pageNum);
      } catch (e) {
        setError(e?.message || "Failed to load history");
        setList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, limit],
  );

  useEffect(() => {
    loadPage(1);
  }, [appliedFilters, limit]);

  const handleFilterChange = (key, value) => {
    setDraftFilters((f) => ({ ...f, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };

  const goToPage = (nextPage) => {
    const safe = Math.max(1, Math.min(totalPages, nextPage));
    if (safe === page) return;
    setPage(safe);
    loadPage(safe);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="text-stone-900">
      <form
        className="mb-2 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border border-border bg-white p-1.5 shadow-sm [-webkit-overflow-scrolling:touch]"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <History className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <div className="mr-auto shrink-0 min-w-0">
          <h1 className="whitespace-nowrap text-base font-bold tracking-tight text-stone-900 sm:text-lg">
            {isSentView ? "All sent notifications" : "Notification history"}
          </h1>
          <p className="whitespace-nowrap text-[10px] text-stone-500">
            Delivery log across channels
          </p>
        </div>
        <select
          value={draftFilters.channel}
          onChange={(e) => handleFilterChange("channel", e.target.value)}
          className={`${inputClass} w-[128px] shrink-0`}
          title="Channel"
          aria-label="Channel"
        >
          {CHANNELS.map((c) => (
            <option key={c.value || "all"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={draftFilters.success}
          onChange={(e) => handleFilterChange("success", e.target.value)}
          className={`${inputClass} w-[100px] shrink-0`}
          title="Status"
          aria-label="Status"
        >
          {SUCCESS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={draftFilters.from}
          onChange={(e) => handleFilterChange("from", e.target.value)}
          className={`${inputClass} w-[132px] shrink-0`}
          title="From date"
          aria-label="From date"
        />
        <input
          type="date"
          value={draftFilters.to}
          onChange={(e) => handleFilterChange("to", e.target.value)}
          className={`${inputClass} w-[132px] shrink-0`}
          title="To date"
          aria-label="To date"
        />
        <select
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value, 10) || DEFAULT_LIMIT);
            setPage(1);
          }}
          className={`${inputClass} w-[108px] shrink-0`}
          title="Items per page"
          aria-label="Items per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Apply
        </button>
      </form>

      {error ? <Alert>{error}</Alert> : null}

      <div className={tableScrollShell}>
        <table className="w-full min-w-[860px] text-left text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted/90 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center">#</th>
              <th className="px-2 py-2">Channel</th>
              <th className="px-2 py-2">Recipient</th>
              <th className="px-2 py-2">Template</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Error</th>
              <th className="px-2 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && list.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-stone-500">
                  No notification history found. Try changing filters or send test notifications.
                </td>
              </tr>
            ) : (
              list.map((row, i) => (
                <tr key={row._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-400">
                    {(page - 1) * limit + i + 1}
                  </td>
                  <td className="px-2 py-2 font-medium capitalize text-stone-800">{row.channel}</td>
                  <td className="px-2 py-2 font-mono text-stone-700">{row.recipient ?? "—"}</td>
                  <td className="px-2 py-2 text-stone-600">{row.templateKey ?? "—"}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        row.success
                          ? "bg-success-bg text-success"
                          : "bg-danger-bg text-danger"
                      }`}
                    >
                      {row.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td
                    className="max-w-[240px] truncate px-2 py-2 text-stone-600"
                    title={row.error}
                  >
                    {row.error ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-500">
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 items"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> total ·{" "}
              Page <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={loading || page <= 1}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={loading || page >= totalPages}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
