import React, { useCallback, useEffect, useState } from "react";
import { getActiveUsers } from "../../apis/userApi";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" />
            Active Users
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Total Users: {pagination.totalUsers} | Total Active Users:{" "}
            {pagination.totalActiveUsers}
          </p>
        </div>

        <form
          onSubmit={applyFilters}
          className="mb-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Search by name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            Apply
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Verified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-gray-500">
                      No active users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {u.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {`${u.countryCode || ""} ${u.phoneNumber || ""}`.trim() ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {u.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {u.role || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {u.isNumberVerified ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= totalPages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
