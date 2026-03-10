// src/influencer/influencercomponents/InfluencerCoupon/InfluencerCouponAnaylitics.jsx
// (or wherever your actual file path is)

import { useState, useEffect, useMemo } from "react";
import {
  getCouponAnalytics,
  getCouponAnalyticsById,
  getCouponHistory,
} from "../../influencerapis/Couponapi"; // adjust path if needed

const ITEMS_PER_PAGE = 10;

export default function InfluencerCouponAnalytics() {
  const [overall, setOverall] = useState(null);
  const [loadingOverall, setLoadingOverall] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // ─────────────────────────────
  // FETCH OVERALL ANALYTICS
  // ─────────────────────────────
  const fetchOverall = async () => {
    try {
      setLoadingOverall(true);
      setError(null);

      const res = await getCouponAnalytics();

      console.log("ANALYTICS RESPONSE:", res);

      // Normalize breakdown to ensure usage & revenue are always numbers
      const normalizedBreakdown = (res.couponBreakdown || []).map((c) => ({
        couponId: c._id || c.couponId || c.id || "",
        code: c.code || c.couponCode || "—",
        usage: Number(c.usageCount ?? c.usage ?? 0),
        revenue: Number(c.revenue ?? 0),
      }));

      setOverall({
        totalCoupons: Number(res.totalCoupons || 0),
        activeCoupons: Number(res.activeCoupons || 0),
        totalUsage: Number(res.totalUsage || 0),
        totalRevenue: Number(res.totalRevenue || 0),
        couponBreakdown: normalizedBreakdown,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingOverall(false);
    }
  };

  // ─────────────────────────────
  // FETCH SINGLE COUPON DETAILS
  // ─────────────────────────────
  const fetchDetail = async (couponId) => {
    if (!couponId) return;

    setLoadingDetail(true);
    setDetail(null);
    setHistory([]); // clear previous history
    setSelectedCouponId(couponId);

    try {
      const res = await getCouponAnalyticsById(couponId);
      if (!res || res.success === false) {
        throw new Error(res?.message || "Failed to load coupon details");
      }

      const { coupon, analytics } = res.data ?? res;

      setDetail({
        couponId: coupon?._id || couponId,
        code: coupon?.code || "—",
        usage: Number(analytics?.usageCount ?? 0),
        revenue: Number(analytics?.revenue ?? 0),
        conversionRate: Number(analytics?.conversionRate ?? 0),
        status: (analytics?.status || "unknown").toLowerCase(),
        attachedAt: analytics?.attachedAt || null,
      });

      await fetchHistory(couponId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─────────────────────────────
  // FETCH ATTACHMENT HISTORY
  // ─────────────────────────────
  const fetchHistory = async (couponId) => {
  if (!couponId) return;

  setLoadingHistory(true);

  try {
    // ✅ Correct API call
    const res = await getCouponHistory(1, 10);

    console.log("HISTORY RAW:", res);

    if (!res || res.success === false) {
      throw new Error(res?.message || "Failed to fetch history");
    }

    // ✅ get history safely
    const historyData =
      res?.data?.history ||
      res?.history ||
      [];

    // ✅ filter by selected coupon
    const filtered = historyData.filter(
      (h) => h.couponId === couponId
    );

    setHistory(
      filtered.map((h) => ({
        attachedAt: h.attachedAt || null,
        detachedAt: h.detachedAt || null,
        revenue: Number(h.revenue ?? 0),
        duration: h.duration || "—",
        isCurrentlyAttached: h.isCurrentlyAttached || false,
      }))
    );

  } catch (err) {
    console.error("History fetch error:", err);
  } finally {
    setLoadingHistory(false);
  }
};

  useEffect(() => {
    fetchOverall();
  }, []);

  // ─────────────────────────────
  // PAGINATION + MEMOIZATION
  // ─────────────────────────────
  const couponList = useMemo(() => overall?.couponBreakdown || [], [overall]);

  const totalPages = Math.ceil(couponList.length / ITEMS_PER_PAGE);

  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return couponList.slice(start, start + ITEMS_PER_PAGE);
  }, [couponList, currentPage]);

  const stats = overall || {};
  const hasData = !loadingOverall && (stats.totalCoupons > 0 || couponList.length > 0);

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-10">

        <h1 className="text-3xl font-bold text-black tracking-tight mb-10">
          Coupon Performance
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {loadingOverall ? (
          <div className="text-center py-16 text-gray-500 text-lg">
            Loading analytics...
          </div>
        ) : !hasData ? (
          <div className="text-center py-16 text-gray-500 text-lg">
            No coupon data available yet.
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard label="Total Coupons" value={stats.totalCoupons} />
              <StatCard label="Active Coupons" value={stats.activeCoupons} />
              <StatCard
                label="Total Uses"
                value={(stats.totalUsage ?? 0).toLocaleString()}
              />
              <StatCard
                label="Total Revenue"
                value={`₹${(stats.totalRevenue ?? 0).toLocaleString("en-IN")}`}
              />
            </div>

            {/* Coupon List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-12">
              <div className="divide-y divide-gray-100">
                {paginatedCoupons.map((c) => (
                  <CouponRow
                    key={c.couponId}
                    coupon={c}
                    isLoading={loadingDetail && selectedCouponId === c.couponId}
                    onView={() => fetchDetail(c.couponId)}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mb-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  Next
                </button>
              </div>
            )}

            {/* Selected Coupon Detail */}
            {detail && (
              <div className="bg-white border border-gray-200 rounded-xl p-7 mb-12 shadow-sm">
                <h2 className="text-xl font-semibold text-black mb-6">
                  Coupon: <span className="font-mono text-gray-800">{detail.code}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <DetailItem
                    label="Uses"
                    value={(detail.usage ?? 0).toLocaleString()}
                  />
                  <DetailItem
                    label="Revenue"
                    value={`₹${(detail.revenue ?? 0).toLocaleString("en-IN")}`}
                  />
                  <DetailItem label="Status" value={detail.status} capitalize />
                </div>
              </div>
            )}

            {/* Attachment History */}
            {detail && (
              <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
                <h2 className="text-xl font-semibold text-black mb-6">
                  Attachment History – {detail.code}
                </h2>

                {loadingHistory ? (
                  <p className="text-gray-500 py-6 text-center">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-gray-500 py-6 text-center">No attachment history available.</p>
                ) : (
                  <div className="space-y-6">
                    {history.map((h, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-2 md:grid-cols-5 gap-6 py-5 border-t border-gray-100 first:border-t-0"
                      >
                        <HistoryItem label="Attached" value={fmt(h.attachedAt)} />
                        <HistoryItem label="Detached" value={fmt(h.detachedAt)} />
                        <HistoryItem label="Duration" value={h.duration} />
                        <HistoryItem
                          label="Revenue"
                          value={`₹${(h.revenue ?? 0).toLocaleString("en-IN")}`}
                        />
                        <HistoryItem
                          label="Status"
                          value={
                            <span
                              className={`inline-flex px-3.5 py-1 text-xs font-medium rounded-full ${
                                h.isCurrentlyAttached
                                  ? "bg-black text-white"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {h.isCurrentlyAttached ? "Active" : "Ended"}
                            </span>
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────── Helper Components ────────────────
function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow transition-shadow">
      <p className="text-sm text-gray-500 font-medium mb-2">{label}</p>
      <p className="text-2xl font-bold text-black">{value}</p>
    </div>
  );
}

function CouponRow({ coupon, isLoading, onView }) {
  return (
    <div className="flex items-center justify-between px-6 py-4.5 hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-medium text-black">{coupon.code || "—"}</p>
        <p className="text-sm text-gray-500 mt-1">
          {(coupon.usage ?? 0).toLocaleString()} uses • ₹
          {(coupon.revenue ?? 0).toLocaleString("en-IN")}
        </p>
      </div>
      <button
        onClick={onView}
        disabled={isLoading}
        className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Loading..." : "View Details"}
      </button>
    </div>
  );
}

function DetailItem({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <p className={`text-lg font-semibold text-black ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function HistoryItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-medium text-black">{value || "—"}</p>
    </div>
  );
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}