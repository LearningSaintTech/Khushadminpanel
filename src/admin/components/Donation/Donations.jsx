import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { getDonations } from "../../apis/Donationapi";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";

const btnOutline =
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-40";

const btnPrimary =
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50";

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

function paymentStatusBadge(status) {
  const st = String(status || "").toUpperCase();
  if (st === "SUCCESS") return "bg-success-bg text-success";
  if (st === "PENDING") return "bg-warning/15 text-warning";
  if (st === "FAILED") return "bg-danger-bg text-danger";
  return "bg-canvas-muted text-stone-600";
}

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
  });
  const [totalDonated, setTotalDonated] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
  });

  const fetchDonations = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const response = await getDonations({
          page,
          limit: pagination.limit,
          search: filters.search,
          paymentStatus: filters.paymentStatus,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });

        if (response?.data?.success) {
          const data = response.data.data;
          setDonations(data.donations || []);
          setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 });
          setTotalDonated(data.summary?.totalDonated || 0);
        } else {
          toast.error(response?.data?.message || "Failed to load donations");
        }
      } catch (error) {
        console.error("Donation fetch error:", error);
        toast.error(
          error?.response?.data?.message || error?.message || "Failed to load donations",
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    fetchDonations(pagination.page);
  }, [pagination.page]);

  const applyFilters = () => {
    if (page === 1) fetchDonations(1);
    else setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleFilterKeyDown = (e) => {
    if (e.key === "Enter") applyFilters();
  };

  const page = pagination.page || 1;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const total = Number(pagination.total) || 0;
  const limit = Math.max(1, pagination.limit || 20);
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto flex min-w-0 shrink-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          <HandCoins className="h-4 w-4 text-brand-600" aria-hidden />
          Donations
        </h1>
        <button
          type="button"
          onClick={() => fetchDonations(page)}
          disabled={loading}
          className={btnOutline}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </button>
      </div>

      <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Total collected
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-700">
            {formatInr(totalDonated)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Records
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Page
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
            {page}
            <span className="text-base font-medium text-stone-400"> / {totalPages}</span>
          </p>
        </div>
      </div>

      <div className="mb-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-stone-800">Filters</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelClass} htmlFor="donation-search">
              Order ID
            </label>
            <input
              id="donation-search"
              type="text"
              placeholder="Search order ID"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={handleFilterKeyDown}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="donation-status">
              Payment status
            </label>
            <select
              id="donation-status"
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="donation-from">
              From date
            </label>
            <input
              id="donation-from"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="donation-to">
              To date
            </label>
            <input
              id="donation-to"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={applyFilters} disabled={loading} className={`${btnPrimary} w-full`}>
              <Search className="h-3.5 w-3.5" aria-hidden />
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className={tableScrollShell}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
            Loading donations…
          </div>
        ) : (
          <table className="w-full min-w-[56rem] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
              <tr>
                {[
                  "Order ID",
                  "Customer",
                  "Phone",
                  "Donation",
                  "Order total",
                  "Payment mode",
                  "Status",
                  "Date",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.length > 0 ? (
                donations.map((donation) => (
                  <tr
                    key={donation._id}
                    className="border-t border-border/80 hover:bg-brand-50/30"
                  >
                    <td className="px-3 py-2 font-medium text-stone-900">{donation.orderId || "—"}</td>
                    <td className="px-3 py-2 text-stone-800">{donation.user?.name || "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">
                      {[donation.user?.countryCode, donation.user?.phone].filter(Boolean).join("") || "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-brand-700">
                      {formatInr(donation.donationAmount)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-stone-800">
                      {formatInr(donation.orderTotal)}
                    </td>
                    <td className="px-3 py-2 text-stone-700">{donation.paymentMode || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${paymentStatusBadge(donation.paymentStatus)}`}
                      >
                        {donation.paymentStatus || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                      {formatDateTime(donation.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-14 text-center text-stone-500">
                    No donations found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 results"
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, page - 1) }))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPagination((p) => ({ ...p, page: page + 1 }))}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
