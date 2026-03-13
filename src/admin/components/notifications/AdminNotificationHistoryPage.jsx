import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { History, Filter } from "lucide-react";

const PAGE_SIZE = 20;
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

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    channel: "",
    success: "",
    from: "",
    to: "",
  });

  const loadPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (filters.channel) params.channel = filters.channel;
      if (filters.success) params.success = filters.success;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      try {
        const data = await adminNotificationApi.getHistory(params);
        const items = data?.list ?? data?.data?.list ?? [];
        const tot = data?.total ?? data?.data?.total ?? 0;
        setList(Array.isArray(items) ? items : []);
        setTotal(tot);
        setPage(data?.page ?? data?.data?.page ?? pageNum);
      } catch (e) {
        setError(e?.message || "Failed to load history");
        setList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [filters.channel, filters.success, filters.from, filters.to]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const applyFilters = () => loadPage(1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <History size={24} className="text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {isSentView ? "All send notifications" : "Notification History"}
        </h1>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={18} />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
          <select
            value={filters.channel}
            onChange={(e) => handleFilterChange("channel", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[140px]"
          >
            {CHANNELS.map((c) => (
              <option key={c.value || "all"} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={filters.success}
            onChange={(e) => handleFilterChange("success", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[100px]"
          >
            {SUCCESS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange("from", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange("to", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Apply
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading history...</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No notification history found. Try changing filters or send test notifications.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Channel</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Recipient</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Template</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Error</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium text-gray-800">{row.channel}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-sm">{row.recipient ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{row.templateKey ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            row.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.success ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={row.error}>
                        {row.error ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Showing {list.length} of {total} • Page {page}
          </p>
          {total > PAGE_SIZE && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => loadPage(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => loadPage(page + 1)}
                disabled={list.length < PAGE_SIZE || loading}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
