import { useCallback, useEffect, useMemo, useState } from "react";
import { auditLogApi } from "../../apis/AuditLogapi";
import { Shield, Search, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  alertDanger,
  btnOutline,
  btnPrimary,
  inputClass,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./auditShared";

const LIMIT_OPTIONS = [20, 50, 100, 200];
const EMPTY_FILTERS = {
  role: "",
  moduleKey: "",
  operation: "",
  statusCode: "",
  from: "",
  to: "",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyJson(val) {
  if (val === undefined) return "—";
  if (val === null) return "null";
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

function describeTask(row) {
  const moduleKey = row?.moduleKey || "unknown-module";
  const method = (row?.method || "").toUpperCase();
  const routeLower = String(row?.routePath || row?.path || "").toLowerCase();

  let action = "Access";
  if (method === "GET") action = "Read";
  else if (method === "POST") action = "Create";
  else if (method === "PUT" || method === "PATCH") action = "Update";
  else if (method === "DELETE") action = "Delete";

  if (routeLower.includes("audit-logs")) action = "View";
  if (routeLower.includes("module-access")) action = "Manage module access";
  if (routeLower.includes("toggle")) action = "Toggle status";
  if (routeLower.includes("read-all") || routeLower.includes("read/")) action = "Mark as read";
  if (routeLower.includes("webhook")) action = "Webhook";

  const specific =
    action === "Manage module access" ||
    action === "Toggle status" ||
    action === "Mark as read" ||
    action === "Webhook" ||
    action === "View";

  return specific ? `${action} (${moduleKey})` : `${action} (${moduleKey})`;
}

function displayTask(row) {
  const d = row?.description;
  if (d && String(d).trim()) return String(d).trim();
  return describeTask(row);
}

export default function AuditLogsPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedDetailsTab, setSelectedDetailsTab] = useState("summary");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const roleOptions = useMemo(
    () => [
      { value: "", label: "All roles" },
      { value: "admin", label: "Admin" },
      { value: "subadmin", label: "Subadmin" },
      { value: "super_subadmin", label: "Super subadmin" },
    ],
    [],
  );

  const crudOptions = useMemo(
    () => [
      { value: "", label: "All operations" },
      { value: "read", label: "Read" },
      { value: "create", label: "Create" },
      { value: "update", label: "Update" },
      { value: "delete", label: "Delete" },
    ],
    [],
  );

  const loadPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      const params = { page: pageNum, limit };
      if (appliedFilters.role) params.role = appliedFilters.role;
      if (appliedFilters.moduleKey) params.moduleKey = appliedFilters.moduleKey;
      if (appliedFilters.operation) params.operation = appliedFilters.operation;
      if (appliedFilters.statusCode) params.statusCode = appliedFilters.statusCode;
      if (appliedFilters.from) params.from = appliedFilters.from;
      if (appliedFilters.to) params.to = appliedFilters.to;

      try {
        const data = await auditLogApi.listAuditLogs(params);
        const items = data?.data ?? [];
        const p = data?.pagination ?? {};
        setList(items);
        setTotal(p.total ?? 0);
        setPage(p.page ?? pageNum);
        setTotalPages(p.totalPages ?? 1);
      } catch (e) {
        setError(e?.message || "Failed to load audit logs");
        setList([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, limit],
  );

  useEffect(() => {
    loadPage(1);
  }, [appliedFilters, limit]);

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const goToPage = (next) => {
    const safe = Math.max(1, Math.min(totalPages, next));
    if (safe === page) return;
    setPage(safe);
    loadPage(safe);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const tabActive = "rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white";
  const tabInactive =
    "rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-canvas-muted";

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <Shield className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <div className="mr-auto shrink-0 min-w-0">
          <h1 className="whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
            Audit logs
          </h1>
          <p className="whitespace-nowrap text-[10px] text-stone-500">
            Admin activity across modules
          </p>
        </div>
        <select
          value={draftFilters.role}
          onChange={(e) => setDraftFilters((f) => ({ ...f, role: e.target.value }))}
          className={`${inputClass} w-[120px]`}
          title="Role"
          aria-label="Role"
        >
          {roleOptions.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="relative w-[120px] shrink-0">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            value={draftFilters.moduleKey}
            onChange={(e) => setDraftFilters((f) => ({ ...f, moduleKey: e.target.value }))}
            placeholder="Module"
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            title="Module"
          />
        </div>
        <select
          value={draftFilters.operation}
          onChange={(e) => setDraftFilters((f) => ({ ...f, operation: e.target.value }))}
          className={`${inputClass} w-[108px]`}
          title="Operation"
          aria-label="Operation"
        >
          {crudOptions.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={draftFilters.statusCode}
          onChange={(e) => setDraftFilters((f) => ({ ...f, statusCode: e.target.value }))}
          placeholder="Status"
          className={`${inputClass} w-[72px]`}
          title="HTTP status"
        />
        <input
          type="date"
          value={draftFilters.from}
          onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
          className={`${inputClass} w-[132px]`}
          title="From"
          aria-label="From date"
        />
        <input
          type="date"
          value={draftFilters.to}
          onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
          className={`${inputClass} w-[132px]`}
          title="To"
          aria-label="To date"
        />
        <select
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value, 10) || 20);
            setPage(1);
          }}
          className={`${inputClass} w-[108px]`}
          title="Per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          Apply
        </button>
        <button type="button" onClick={resetFilters} className={btnOutline}>
          Reset
        </button>
      </form>

      {error ? <div className={`${alertDanger} mb-2`}>{error}</div> : null}

      <div className={tableScrollShell}>
        <table className="min-w-[920px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Date</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Module</th>
              <th className={thClass}>Method</th>
              <th className={thClass}>Task</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
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
                <td colSpan={7} className="py-10 text-center text-stone-500">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr
                  key={row._id}
                  className="cursor-pointer hover:bg-canvas-muted/50"
                  onClick={() => {
                    setSelectedLog(row);
                    setSelectedDetailsTab("summary");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedLog(row);
                      setSelectedDetailsTab("summary");
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td className="whitespace-nowrap px-2 py-2 text-stone-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{row.role || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">{row.moduleKey || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">{row.method || "—"}</td>
                  <td
                    className="max-w-[360px] truncate px-2 py-2 text-stone-700"
                    title={displayTask(row)}
                  >
                    {displayTask(row)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-stone-700">
                    {row.statusCode ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-600">{row.ip || "—"}</td>
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
            "0 logs"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> total · Page{" "}
              <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => goToPage(page - 1)}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {selectedLog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedLog(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Audit log details"
          >
            <div className="sticky top-0 z-10 border-b border-border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-stone-900">Audit log details</h2>
                  <p className="truncate text-[11px] font-medium text-stone-700">
                    {displayTask(selectedLog)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-canvas-muted"
                  onClick={() => setSelectedLog(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-2 inline-flex rounded-lg border border-border bg-canvas-muted/50 p-0.5">
                {[
                  { key: "summary", label: "Summary" },
                  { key: "meta", label: "Meta" },
                  { key: "request", label: "Request" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedDetailsTab(t.key)}
                    className={
                      selectedDetailsTab === t.key ? tabActive : tabInactive
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-auto p-3 text-[11px]">
              {selectedDetailsTab === "summary" ? (
                <>
                  {selectedLog.description ? (
                    <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-brand-700">
                        Plain summary
                      </p>
                      <p className="mt-1 font-medium text-stone-900">{selectedLog.description}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-500">
                      Technical summary (no plain-language description stored).
                    </p>
                  )}
                  <div className="rounded-lg border border-border bg-canvas-muted/30 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-stone-500">Task</p>
                    <p className="font-medium text-stone-900">{displayTask(selectedLog)}</p>
                  </div>
                </>
              ) : null}

              {selectedDetailsTab === "meta" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { label: "Role", value: selectedLog.role || "—" },
                    { label: "Module", value: selectedLog.moduleKey || "—" },
                    { label: "Method", value: selectedLog.method || "—" },
                    { label: "Status", value: selectedLog.statusCode ?? "—" },
                    { label: "IP", value: selectedLog.ip || "—" },
                    {
                      label: "Duration",
                      value:
                        selectedLog.durationMs != null
                          ? `${selectedLog.durationMs} ms`
                          : "—",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="rounded-lg border border-border bg-white px-3 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase text-stone-500">
                        {f.label}
                      </p>
                      <p className="font-medium text-stone-900">{f.value}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border bg-white px-3 py-2 sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase text-stone-500">
                      User agent
                    </p>
                    <p className="break-all font-medium text-stone-900">
                      {selectedLog.userAgent || "—"}
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedDetailsTab === "request" ? (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-stone-500">
                      Route path
                    </p>
                    <p className="break-all rounded-lg border border-border bg-canvas-muted px-2 py-1.5 font-mono text-[10px]">
                      {selectedLog.routePath || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-stone-500">
                      Full path
                    </p>
                    <p className="break-all rounded-lg border border-border bg-canvas-muted px-2 py-1.5 font-mono text-[10px]">
                      {selectedLog.path || "—"}
                    </p>
                  </div>
                  {["query", "params", "requestBody"].map((key) => (
                    <div key={key}>
                      <p className="mb-1 text-[10px] font-semibold uppercase text-stone-500">
                        {key === "requestBody" ? "Request body" : key}
                      </p>
                      <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-canvas-muted p-2 font-mono text-[10px]">
                        {prettyJson(selectedLog[key])}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
