// src/pages/influencer/InfluencerCoupons.jsx
import { useState, useEffect, useMemo } from "react";
import { getAllCoupons, getCouponById } from "../../influencerapis/Couponapi";

const ITEMS_PER_PAGE = 10;

export default function InfluencerCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch coupons
  const fetchCoupons = async (currentPage = page) => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllCoupons(currentPage, ITEMS_PER_PAGE);
      if (!res || !res.coupons) {
        throw new Error("Invalid response format");
      }

      const raw = res.coupons || [];

      const normalized = raw.map((c) => ({
        ...c,
        usageCount: c.usedCount ?? 0,
        maxUses: c.totalUsageLimit ?? null,
        discountType: c.discountType?.toLowerCase() === "percent" ? "percentage" : "fixed",
        uiDiscountSymbol: c.discountType?.toLowerCase() === "percent" ? "%" : "₹",
        uiDiscountType: c.discountType?.toLowerCase() === "percent" ? "Percentage" : "Fixed",
        isActive: !!c.isActive,
      }));

      setCoupons(normalized);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalItems(res.meta?.total || raw.length);
    } catch (err) {
      console.error("Coupons fetch failed:", err);
      setError(err.message || "Failed to load your coupons");
    } finally {
      setLoading(false);
    }
  };

  // Single coupon detail
  const fetchDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setSelectedCoupon(null);

    try {
      const res = await getCouponById(id);
      if (!res?.coupon) throw new Error("Coupon not found");

      const c = res.coupon;
      setSelectedCoupon({
        ...c,
        usageCount: c.usedCount ?? 0,
        maxUses: c.totalUsageLimit ?? null,
        discountType: c.discountType?.toLowerCase() === "percent" ? "percentage" : "fixed",
        uiDiscountSymbol: c.discountType?.toLowerCase() === "percent" ? "%" : "₹",
        uiDiscountType: c.discountType?.toLowerCase() === "percent" ? "Percentage" : "Fixed",
        isActive: !!c.isActive,
      });
    } catch (err) {
      console.error("Detail fetch failed:", err);
      setError("Could not load coupon details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [page]);

  // Client-side search filter
  const filteredCoupons = useMemo(() => {
    if (!searchTerm.trim()) return coupons;

    const term = searchTerm.toLowerCase().trim();
    return coupons.filter(
      (c) =>
        c.code?.toLowerCase().includes(term) ||
        (c.isActive ? "active" : "inactive").includes(term)
    );
  }, [coupons, searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const displayedCoupons = filteredCoupons; // could slice if server-side search

  const totalDisplayedPages = Math.ceil(displayedCoupons.length / ITEMS_PER_PAGE) || 1;

  // For simplicity we're keeping server pagination + client search
  // If you want full client pagination → slice displayedCoupons

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Coupons</h1>
            <p className="mt-1 text-gray-600">
              Manage and track all your discount codes
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code or status..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 transition"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <SkeletonTable />
        ) : displayedCoupons.length === 0 ? (
          <EmptyState searchActive={!!searchTerm} />
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Uses
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {displayedCoupons.map((coupon) => (
                      <tr
                        key={coupon._id}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{coupon.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-900 font-medium">
                            {coupon.discountValue}
                            {coupon.uiDiscountSymbol}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 hidden sm:table-cell capitalize">
                          {coupon.uiDiscountType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {coupon.usageCount} / {coupon.maxUses ?? "∞"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              coupon.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => fetchDetail(coupon._id)}
                            className="text-indigo-600 hover:text-indigo-800 transition"
                          >
                            View
                          </button>
                          {/* You can add Edit / Delete later */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedCoupon && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/5">
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCoupon.code}
                  </h2>
                  <button
                    onClick={() => setSelectedCoupon(null)}
                    className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
                  >
                    ×
                  </button>
                </div>

                {detailLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-gray-800">
                    <DetailField label="Discount" value={`${selectedCoupon.discountValue}${selectedCoupon.uiDiscountSymbol} (${selectedCoupon.uiDiscountType})`} />
                    <DetailField
                      label="Max Discount"
                      value={selectedCoupon.maxDiscountAmount ? `₹${selectedCoupon.maxDiscountAmount.toLocaleString()}` : "No limit"}
                    />
                    <DetailField
                      label="Min Cart Value"
                      value={selectedCoupon.minCartValue ? `₹${selectedCoupon.minCartValue.toLocaleString()}` : "No minimum"}
                    />
                    <DetailField
                      label="Usage"
                      value={`${selectedCoupon.usageCount} / ${selectedCoupon.maxUses ?? "Unlimited"}`}
                    />
                    <DetailField
                      label="Status"
                      value={
                        <span
                          className={`font-medium ${
                            selectedCoupon.isActive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {selectedCoupon.isActive ? "Active" : "Inactive"}
                        </span>
                      }
                    />
                    {selectedCoupon.description && (
                      <DetailField
                        label="Description"
                        value={selectedCoupon.description}
                        fullWidth
                      />
                    )}
                  </dl>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Reusable Components
// ────────────────────────────────────────────────
function DetailField({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <dt className="text-sm text-gray-500 font-medium">{label}</dt>
      <dd className="mt-1.5 text-base font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];
  const maxVisible = 5;

  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
      >
        Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 transition ${
            p === currentPage
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
      >
        Next
      </button>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-6 py-5">
                  <div className="h-4 w-20 bg-gray-300 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[...Array(8)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-5">
                  <div className="h-5 w-28 bg-gray-300 rounded" />
                </td>
                <td className="px-6 py-5">
                  <div className="h-5 w-16 bg-gray-300 rounded" />
                </td>
                <td className="px-6 py-5 hidden sm:table-cell">
                  <div className="h-5 w-20 bg-gray-300 rounded" />
                </td>
                <td className="px-6 py-5">
                  <div className="h-5 w-24 bg-gray-300 rounded" />
                </td>
                <td className="px-6 py-5 hidden md:table-cell">
                  <div className="h-6 w-16 bg-gray-300 rounded-full" />
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="h-5 w-10 bg-gray-300 rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ searchActive }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 px-6 text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="mt-4 text-xl font-medium text-gray-900">
        {searchActive ? "No matching coupons" : "No coupons yet"}
      </h3>
      <p className="mt-2 text-gray-600">
        {searchActive
          ? "Try adjusting your search term"
          : "Create your first coupon to offer discounts to your audience"}
      </p>
    </div>
  );
}