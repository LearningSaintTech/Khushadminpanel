import { useState, useEffect, useCallback } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { MessagesSquare } from "lucide-react";
import {
  PageToolbar,
  Alert,
  LoadingBlock,
  EmptyBlock,
  PaginationBar,
  tableScrollShell,
  fieldClass,
  btnOutline,
  inputClass,
} from "./notificationsShared";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" },
];

const STATUS_STYLES = {
  queued: "bg-stone-100 text-stone-700",
  sent: "bg-blue-50 text-blue-800",
  delivered: "bg-emerald-50 text-emerald-800",
  read: "bg-violet-50 text-violet-800",
  failed: "bg-red-50 text-red-800",
};

const EMPTY_FILTERS = {
  status: "",
  templateKey: "",
  orderId: "",
  phone: "",
  from: "",
  to: "",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function StatusPill({ status }) {
  const key = String(status || "queued").toLowerCase();
  const cls = STATUS_STYLES[key] || STATUS_STYLES.queued;
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {key}
    </span>
  );
}

export default function AdminWhatsappMessagesPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.templateKey.trim()) params.templateKey = appliedFilters.templateKey.trim();
      if (appliedFilters.orderId.trim()) params.orderId = appliedFilters.orderId.trim();
      if (appliedFilters.phone.trim()) params.phone = appliedFilters.phone.trim();
      if (appliedFilters.from) params.from = appliedFilters.from;
      if (appliedFilters.to) params.to = appliedFilters.to;
      try {
        const data = await adminNotificationApi.listWhatsappMessages(params);
        const items = data?.list ?? data?.data?.list ?? [];
        const tot = data?.total ?? data?.data?.total ?? 0;
        setList(Array.isArray(items) ? items : []);
        setTotal(Number(tot) || 0);
        setPage(data?.page ?? data?.data?.page ?? pageNum);
      } catch (e) {
        setError(e?.message || "Failed to load WhatsApp messages");
        setList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    loadPage(1);
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div className="min-w-0 p-2 sm:p-3">
      <PageToolbar
        icon={MessagesSquare}
        title="WhatsApp message log"
        subtitle="Per-message tracking with Meta wamid and delivery status (updated via webhook)."
        accentClass="text-emerald-600"
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="mb-2 grid gap-2 rounded-xl border border-border bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Status</label>
          <select
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
            className={fieldClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Template key</label>
          <input
            type="text"
            value={draftFilters.templateKey}
            onChange={(e) => setDraftFilters((f) => ({ ...f, templateKey: e.target.value }))}
            placeholder="ORDER_CONFIRMED"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Order ID</label>
          <input
            type="text"
            value={draftFilters.orderId}
            onChange={(e) => setDraftFilters((f) => ({ ...f, orderId: e.target.value }))}
            placeholder="ORD-…"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Phone</label>
          <input
            type="text"
            value={draftFilters.phone}
            onChange={(e) => setDraftFilters((f) => ({ ...f, phone: e.target.value }))}
            placeholder="91…"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">From</label>
          <input
            type="date"
            value={draftFilters.from}
            onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">To</label>
          <input
            type="date"
            value={draftFilters.to}
            onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="button" onClick={applyFilters} className={btnOutline}>
            Apply filters
          </button>
          <button type="button" onClick={clearFilters} className={btnOutline}>
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyBlock message="No WhatsApp messages logged yet. Sends appear here after order notifications or test WhatsApp." />
      ) : (
        <div className={tableScrollShell}>
          <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-2 py-2">Sent</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2">Template</th>
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">wamid</th>
                <th className="px-2 py-2">Delivered</th>
                <th className="px-2 py-2">Read</th>
                <th className="px-2 py-2">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((row) => (
                <tr key={row._id} className="hover:bg-canvas-muted/50">
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-stone-500">
                    {formatDate(row.sentAt || row.createdAt)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px]">{row.phone || "—"}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-brand-700">{row.templateKey || "—"}</div>
                    {row.metaTemplateName ? (
                      <div className="font-mono text-[9px] text-stone-500">{row.metaTemplateName}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px] text-stone-700">{row.orderId || "—"}</td>
                  <td className="px-2 py-2">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="max-w-[140px] truncate px-2 py-2 font-mono text-[9px] text-stone-600" title={row.wamid}>
                    {row.wamid || "—"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-stone-500">{formatDate(row.deliveredAt)}</td>
                  <td className="px-2 py-2 tabular-nums text-stone-500">{formatDate(row.readAt)}</td>
                  <td className="max-w-[160px] truncate px-2 py-2 text-[10px] text-red-600" title={row.error}>
                    {row.error || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        disabled={loading}
        onPage={(p) => loadPage(p)}
      />
    </div>
  );
}
