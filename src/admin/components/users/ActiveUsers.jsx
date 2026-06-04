import React, { useCallback, useEffect, useState } from "react";
import { getActiveUsers } from "../../apis/userApi";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  btnOutline,
  btnPrimary,
  inputClass,
  tableScrollShell,
  thClass,
} from "./usersShared";

export default function ActiveUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalUsers: 0,
    totalActiveUsers: 0,
  });

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getActiveUsers({
        name: name?.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      const data = res?.data ?? {};
      setRows(data?.users ?? []);
      setPagination((p) => ({
        ...p,
        total: data?.total ?? 0,
        totalUsers: data?.totalUsers ?? 0,
        totalActiveUsers: data?.totalActiveUsers ?? 0,
        page: data?.page ?? p.page,
        limit: data?.limit ?? p.limit,
      }));
    } catch (err) {
      console.error("Active users fetch error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [name, fromDate, toDate, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const totalPages = Math.max(
    1,
    Math.ceil((pagination.total || 0) / (pagination.limit || 20))
  );

  return (
    <div>
      <form
        onSubmit={applyFilters}
        className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm"
      >
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Active users
        </h1>
        <span className="hidden shrink-0 text-[11px] text-stone-500 sm:inline">
          Total {pagination.totalUsers} · Active {pagination.totalActiveUsers}
        </span>
        <input
          type="text"
          placeholder="Search by name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} min-w-[140px] flex-1 max-w-[200px]`}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className={`${inputClass} shrink-0`}
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className={`${inputClass} shrink-0`}
          title="To date"
        />
        <select
          value={pagination.limit}
          onChange={(e) =>
            setPagination((p) => ({ ...p, page: 1, limit: parseInt(e.target.value, 10) || 20 }))
          }
          className={`${inputClass} shrink-0 min-w-[108px]`}
          title="Rows per page"
        >
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button type="submit" className={btnPrimary}>
          Apply
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[920px] w-full divide-y divide-border text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Verified</th>
              <th className={thClass}>Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-stone-500">
                  No active users found.
                </td>
              </tr>
            ) : (
              rows.map((u, idx) => (
                <tr key={u._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(pagination.page - 1) * pagination.limit + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-semibold text-stone-900">{u.name || "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-stone-700">
                    {`${u.countryCode || ""} ${u.phoneNumber || ""}`.trim() || "—"}
                  </td>
                  <td className="px-2 py-2 text-stone-700">{u.email || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">{u.role || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">
                    {u.isNumberVerified ? "Yes" : "No"}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-stone-700">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          Page {pagination.page} of {totalPages} ({pagination.total} total)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
