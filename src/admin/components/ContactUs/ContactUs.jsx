import { useEffect, useMemo, useState } from "react";
import { Eye, X, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { apiConnector } from "../../services/Apiconnector";

const ContactUs = () => {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [isResolved, setIsResolved] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedMessage, setSelectedMessage] = useState(null);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);

  const fetchRequests = async (pageToLoad = 1, filters = {}) => {
    try {
      setLoading(true);
      const res = await apiConnector("GET", "/contact-us/getAll", null, {}, {
        page: pageToLoad,
        limit,
        name: filters.name ?? search,
        isResolved: filters.isResolved ?? isResolved,
        startDate: filters.startDate ?? startDate,
        endDate: filters.endDate ?? endDate,
      });

      const data = res?.data || res;
      setRequests(data.items || []);
      setPage(data.page || pageToLoad);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("[ContactUs] fetch error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(page);
  }, [page, limit]);

  const applyFilters = () => {
    setPage(1);
    fetchRequests(1);
  };

  const resetFilters = () => {
    setSearch("");
    setIsResolved("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    fetchRequests(1, { name: "", isResolved: "", startDate: "", endDate: "" });
  };

  const toggleResolve = async (id, currentStatus) => {
    try {
      await apiConnector("PATCH", `/contact-us/${id}/resolve`, {
        resolved: !currentStatus,
      });
      fetchRequests(page);
      if (selectedMessage?._id === id) {
        setSelectedMessage((prev) =>
          prev ? { ...prev, isResolved: !currentStatus } : null,
        );
      }
    } catch (err) {
      console.error("[ContactUs] resolve error:", err);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  const btnSecondary =
    "rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition-colors hover:bg-canvas-muted disabled:opacity-50";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Contact Requests
        </h1>
        <input
          type="search"
          placeholder="Search name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          className={`${inputClass} w-full min-w-[120px] max-w-[160px] sm:w-auto`}
          aria-label="Search by name"
        />
        <select
          value={isResolved}
          onChange={(e) => setIsResolved(e.target.value)}
          className={`${inputClass} min-w-[110px] max-w-[130px]`}
          title="Status"
        >
          <option value="">All status</option>
          <option value="true">Resolved</option>
          <option value="false">Pending</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={`${inputClass} min-w-[118px]`}
          title="From date"
          aria-label="From date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={`${inputClass} min-w-[118px]`}
          title="To date"
          aria-label="To date"
        />
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value, 10) || 20);
            setPage(1);
          }}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button type="button" onClick={applyFilters} className={`${btnSecondary} bg-brand-600 text-white hover:bg-brand-700 border-brand-600`}>
          Apply
        </button>
        <button type="button" onClick={resetFilters} className={btnSecondary}>
          Reset
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                #
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Name
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                Email
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                Subject
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Message
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Status
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:table-cell">
                Date
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-stone-500">
                  <Loader2 className="mx-auto mb-1 h-5 w-5 animate-spin text-brand-600" />
                  Loading…
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-stone-500">
                  No contact requests found.
                </td>
              </tr>
            ) : (
              requests.map((item, idx) => (
                <tr key={item._id} className="border-t border-border/80 hover:bg-brand-50/30">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900 whitespace-nowrap">
                    {item.name}
                  </td>
                  <td className="hidden max-w-[160px] truncate px-2 py-2 text-stone-600 md:table-cell">
                    {item.email}
                  </td>
                  <td className="hidden max-w-[140px] truncate px-2 py-2 text-stone-600 lg:table-cell">
                    {item.subject || "—"}
                  </td>
                  <td className="max-w-[200px] px-2 py-2">
                    <p className="line-clamp-2 text-stone-700">{item.message}</p>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.isResolved
                          ? "bg-success-bg text-success"
                          : "bg-warning-bg text-warning"
                      }`}
                    >
                      {item.isResolved ? "Resolved" : "Pending"}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 whitespace-nowrap text-stone-500 sm:table-cell">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedMessage(item)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                        title="View details"
                        aria-label="View details"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleResolve(item._id, item.isResolved)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                          item.isResolved
                            ? "border-border bg-canvas-muted text-stone-600 hover:bg-stone-100"
                            : "border-success/30 bg-success-bg text-success hover:opacity-90"
                        }`}
                        title={item.isResolved ? "Mark pending" : "Mark resolved"}
                        aria-label={item.isResolved ? "Mark pending" : "Mark resolved"}
                      >
                        {item.isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
          Page {page} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {selectedMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
          onClick={() => setSelectedMessage(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-detail-title"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <h2 id="contact-detail-title" className="text-sm font-semibold text-stone-900">
                Contact details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1 text-stone-500 hover:bg-canvas-muted"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-3 py-3 text-[11px]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Name</p>
                  <p className="font-medium text-stone-900">{selectedMessage.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Email</p>
                  <p className="font-medium text-brand-600 break-all">{selectedMessage.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Phone</p>
                  <p className="text-stone-800">{selectedMessage.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Date</p>
                  <p className="text-stone-800">{formatDate(selectedMessage.createdAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Subject</p>
                  <p className="text-stone-800">{selectedMessage.subject || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Message
                  </p>
                  <div className="rounded-lg border border-border bg-canvas-muted/50 p-2.5 whitespace-pre-wrap leading-relaxed text-stone-700">
                    {selectedMessage.message}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      selectedMessage.isResolved
                        ? "bg-success-bg text-success"
                        : "bg-warning-bg text-warning"
                    }`}
                  >
                    {selectedMessage.isResolved ? "Resolved" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => toggleResolve(selectedMessage._id, selectedMessage.isResolved)}
                className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
              >
                {selectedMessage.isResolved ? "Mark pending" : "Mark resolved"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ContactUs;
