// src/pages/admin/CouponAnalytics.jsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Percent,
  Ticket, Clock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getCouponAnalytics } from '../../apis/couponapi';

const CouponAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCouponAnalytics();
      if (res?.success) {
        setData(res.data);
        setCurrentPage(1);
      } else {
        setError(res?.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="text-lg font-medium text-gray-700">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto h-14 w-14 text-red-500 mb-5" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium shadow-sm"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { summary, mostUsedCoupons, performanceByType, recentUsage } = data;

  // Pagination logic
  const totalPages = Math.ceil(recentUsage.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedUsage = recentUsage.slice(start, start + rowsPerPage);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">

        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
              Coupon Analytics
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Track performance, redemptions & business impact
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Ticket className="h-7 w-7 text-indigo-600" />}
            title="Total Coupons"
            value={summary.totalCoupons.toLocaleString()}
            accent="indigo"
          />
          <KpiCard
            icon={<TrendingUp className="h-7 w-7 text-emerald-600" />}
            title="Active Coupons"
            value={summary.activeCoupons.toLocaleString()}
            accent="emerald"
          />
          <KpiCard
            icon={<Users className="h-7 w-7 text-violet-600" />}
            title="Unique Users"
            value={summary.totalUniqueUsers.toLocaleString()}
            accent="violet"
          />
          <KpiCard
             icon={<DollarSign className="h-4 w-4 text-amber-600" />}
            title="Total Discount"
            value={`₹${Number(summary.totalDiscountGiven).toLocaleString('en-IN')}`}
            accent="amber"
          />
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Top Coupons */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="flex items-center gap-2.5 text-xl font-semibold text-gray-900">
                <Percent className="h-5 w-5 text-indigo-600" />
                Top Performing Coupons
              </h2>
            </div>
            <div className="p-6">
              {mostUsedCoupons.length === 0 ? (
                <p className="py-12 text-center text-gray-500 italic">
                  No redemptions recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {mostUsedCoupons.slice(0, 5).map((c) => (
                    <div
                      key={c.couponId}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-5 py-4 hover:bg-gray-100 transition"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{c.couponCode}</div>
                        <div className="mt-0.5 text-sm text-gray-600">
                          {c.discountType} • ₹{c.discountValue}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-700">{c.totalUsage}</div>
                        <div className="text-xs text-gray-500">uses</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart – Usage by Type */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="flex items-center gap-2.5 text-xl font-semibold text-gray-900">
                <BarChart className="h-5 w-5 text-indigo-600" strokeWidth={2.5} />
                Usage by Discount Type
              </h2>
            </div>
            <div className="h-80 p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceByType} margin={{ top: 10, right: 30, left: -20, bottom: 30 }}>
                  <XAxis
                    dataKey="type"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 13 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 13 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(79, 70, 229, 0.08)' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    }}
                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                    formatter={(val) => [`${val} redemptions`, '']}
                  />
                  <Bar dataKey="totalUsage" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Usage Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="flex items-center gap-2.5 text-xl font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-indigo-600" />
              Recent Redemptions
            </h2>
          </div>

          {recentUsage.length === 0 ? (
            <div className="py-20 text-center text-gray-500 italic">
              No recent coupon usage
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Order</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Coupon</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Discount</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Used At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedUsage.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          #{u.orderId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{u.userName}</div>
                          <div className="text-xs text-gray-500">{u.phoneNumber}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {u.couponCode}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-emerald-700">
                          ₹{Number(u.discountAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                          {new Date(u.usedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm">
                  <div className="text-gray-600">
                    Showing <span className="font-medium text-gray-900">{start + 1}–{Math.min(start + rowsPerPage, recentUsage.length)}</span> of {recentUsage.length}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changePage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-300 p-2 disabled:opacity-40 hover:bg-gray-100 transition"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-1 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => changePage(p)}
                            className={`min-w-[2.5rem] rounded-lg border px-3 py-1.5 font-medium transition ${
                              p === currentPage
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      onClick={() => changePage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-300 p-2 disabled:opacity-40 hover:bg-gray-100 transition"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function KpiCard({ icon, title, value, accent }) {
  const bgClass = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  }[accent];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-xl p-4 ${bgClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default CouponAnalytics;