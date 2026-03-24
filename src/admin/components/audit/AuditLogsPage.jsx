import { useCallback, useEffect, useMemo, useState } from "react";
import { auditLogApi } from "../../apis/AuditLogapi";
import { Filter, Shield, Search, X } from "lucide-react";

const PAGE_SIZE_DEFAULT = 20;

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
  const routePath = row?.routePath || row?.path || "";
  const routeLower = String(routePath).toLowerCase();

  let action = "Access";
  if (method === "GET") action = "Read";
  else if (method === "POST") action = "Create";
  else if (method === "PUT" || method === "PATCH") action = "Update";
  else if (method === "DELETE") action = "Delete";

  // Human-friendly overrides for common patterns
  if (routeLower.includes("audit-logs")) action = "View";
  if (routeLower.includes("module-access")) action = "Manage module access";
  if (routeLower.includes("toggle")) action = "Toggle status";
  if (routeLower.includes("read-all") || routeLower.includes("read/")) action = "Mark as read";
  if (routeLower.includes("webhook")) action = "Webhook";

  // If we already have a specific override, don't append redundant action verbs.
  const specific =
    action === "Manage module access" ||
    action === "Toggle status" ||
    action === "Mark as read" ||
    action === "Webhook" ||
    action === "View";

  return specific
    ? `${action} (${moduleKey})`
    : `${action} (${moduleKey})`;
}

/** Prefer server-stored plain-language text; older rows fall back to technical summary. */
function displayTask(row) {
  const d = row?.description;
  if (d && String(d).trim()) return String(d).trim();
  return describeTask(row);
}

export default function AuditLogsPage() {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE_DEFAULT,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    role: "",
    moduleKey: "",
    operation: "",
    statusCode: "",
    from: "",
    to: "",
  });

  const roleOptions = useMemo(
    () => [
      { value: "", label: "All roles" },
      { value: "admin", label: "Admin" },
      { value: "subadmin", label: "Subadmin" },
      { value: "super_subadmin", label: "Super Subadmin" },
    ],
    []
  );

  const crudOptions = useMemo(
    () => [
      { value: "", label: "All operations" },
      { value: "read", label: "Read (GET)" },
      { value: "create", label: "Create (POST)" },
      { value: "update", label: "Update (PUT/PATCH)" },
      { value: "delete", label: "Delete (DELETE)" },
    ],
    []
  );

  const loadPage = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      setError("");

      const params = {
        page: pageNum,
        limit: pagination.limit || PAGE_SIZE_DEFAULT,
      };

      if (filters.role) params.role = filters.role;
      if (filters.moduleKey) params.moduleKey = filters.moduleKey;
      if (filters.operation) params.operation = filters.operation;
      if (filters.statusCode) params.statusCode = filters.statusCode;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      try {
        const data = await auditLogApi.listAuditLogs(params);
        const items = data?.data ?? [];
        const p = data?.pagination ?? {};

        setList((prev) => (append ? [...prev, ...items] : items));
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? pageNum,
          limit: p.limit ?? params.limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (e) {
        setError(e?.message || "Failed to load audit logs");
        setList([]);
        setPagination((p) => ({ ...p, total: 0, totalPages: 1 }));
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const applyFilters = () => loadPage(1, false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={22} className="text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
      </div>

      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={18} />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {roleOptions.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Module Key</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.moduleKey}
                onChange={(e) => setFilters((f) => ({ ...f, moduleKey: e.target.value }))}
                placeholder="e.g. order"
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CRUD / operation</label>
            <select
              value={filters.operation}
              onChange={(e) => setFilters((f) => ({ ...f, operation: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
            >
              {crudOptions.map((o) => (
                <option key={o.value || "all-crud"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status Code</label>
            <input
              value={filters.statusCode}
              onChange={(e) => setFilters((f) => ({ ...f, statusCode: e.target.value }))}
              placeholder="e.g. 403"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={applyFilters}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() =>
              setFilters({
                role: "",
                moduleKey: "",
                operation: "",
                statusCode: "",
                from: "",
                to: "",
              })
            }
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500 py-8">No audit logs found.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[920px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Module</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Method</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">What happened</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((row) => (
                  <tr
                    key={row._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedLog(row);
                    }}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.role || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.moduleKey || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {row.method || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[420px] truncate" title={displayTask(row)}>
                      {displayTask(row)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {row.statusCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {row.ip || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Showing {list.length} • Total {pagination.total} • Page {pagination.page} of{" "}
              {pagination.totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => loadPage(pagination.page - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadPage(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Audit Log Details
                </h2>
                <p className="text-sm text-gray-800 font-medium leading-snug">
                  {displayTask(selectedLog)}
                </p>
                {!selectedLog?.description ? (
                  <p className="text-xs text-gray-500 mt-1">Technical summary (older log — no plain summary stored).</p>
                ) : null}
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-auto">
              {selectedLog.description ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3">
                  <div className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">
                    Plain summary
                  </div>
                  <p className="text-sm text-gray-900">{selectedLog.description}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Role</div>
                  <div className="font-medium text-gray-900">{selectedLog.role || "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Module</div>
                  <div className="font-medium text-gray-900">{selectedLog.moduleKey || "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Method</div>
                  <div className="font-medium text-gray-900">{selectedLog.method || "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium text-gray-900">{selectedLog.statusCode ?? "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">IP</div>
                  <div className="font-medium text-gray-900">{selectedLog.ip || "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="font-medium text-gray-900">
                    {selectedLog.durationMs != null ? `${selectedLog.durationMs} ms` : "—"}
                  </div>
                </div>
                <div className="text-sm sm:col-span-2">
                  <div className="text-xs text-gray-500">User Agent</div>
                  <div className="font-medium text-gray-900 break-all">
                    {selectedLog.userAgent || "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Route Path Pattern</div>
                <div className="text-sm text-gray-900 break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {selectedLog.routePath || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Full Request Path</div>
                <div className="text-sm text-gray-900 break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {selectedLog.path || "—"}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Query</div>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-auto">
                    {prettyJson(selectedLog.query)}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Params</div>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-auto">
                    {prettyJson(selectedLog.params)}
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Request Body</div>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-auto">
                    {prettyJson(selectedLog.requestBody)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

