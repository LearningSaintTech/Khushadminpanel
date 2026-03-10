import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoupons, toggleCouponStatus } from "../../apis/CouponApi";
import { Plus, Edit } from "lucide-react";

const CouponPage = () => {
  const navigate = useNavigate();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal states
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchCoupons();
  }, [currentPage, debouncedSearchTerm]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getCoupons(currentPage, limit, debouncedSearchTerm);
      const data = response?.data?.data || response?.data || {};
      const couponsList = Array.isArray(data) ? data : data.coupons || data.data || [];

      setCoupons(couponsList);

      const totalCount = data.total || response?.data?.total || 0;
      const apiTotalPages = data.totalPages || data.pages || response?.data?.totalPages || response?.data?.pages;

      let calculatedTotalPages = 1;
      if (apiTotalPages) {
        calculatedTotalPages = apiTotalPages;
      } else if (totalCount > 0) {
        calculatedTotalPages = Math.ceil(totalCount / limit);
      } else if (couponsList.length === limit && currentPage === 1) {
        calculatedTotalPages = 2;
      }

      setTotalPages(calculatedTotalPages);
    } catch (err) {
      console.error("Fetch coupons error:", err);
      setError("Failed to load coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleCouponStatus(id);
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err) {
      console.error("Toggle error:", err);
      setError("Failed to update status");
    }
  };

  const handleViewCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Coupons</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-black focus:ring-2 focus:ring-black/20 transition-all"
                />
              </div>
              <button
                onClick={() => navigate("/admin/coupons/create")}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <Plus size={18} />
                Add Coupon
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="inline-flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              <span>Loading coupons...</span>
            </div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">No coupons found</p>
            <button
              onClick={() => navigate("/admin/coupons/create")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-all duration-200 text-sm font-medium"
            >
              <Plus size={16} />
              Create your first coupon
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Discount</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min Cart</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map((coupon) => (
                      <tr key={coupon._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-3 sm:py-4">
                          <span className="font-semibold text-gray-900 text-sm">{coupon.code}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4 text-sm text-gray-600 max-w-xs truncate">
                          {coupon.description || "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.discountType === "PERCENT"
                              ? `${coupon.discountValue}%`
                              : `₹${coupon.discountValue}`}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4 text-sm text-gray-600">
                          ₹{coupon.minCartValue || "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4">
                          <button
                            onClick={() => handleToggleStatus(coupon._id)}
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-all ${
                              coupon.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewCoupon(coupon)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/admin/coupons/edit/${coupon._id}`)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {coupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {coupon.code}
                      </h3>
                      {coupon.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        coupon.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Discount:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Cart:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        ₹{coupon.minCartValue || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewCoupon(coupon)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/coupons/edit/${coupon._id}`)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {coupons.length > 0 && totalPages > 0 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  Previous
                </button>
                <div className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/*                  DETAIL MODAL                    */}
        {/* ──────────────────────────────────────────────── */}
        {showModal && selectedCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  Coupon: <span className="text-black">{selectedCoupon.code}</span>
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-gray-500 font-medium">Code</dt>
                    <dd className="mt-1 font-semibold">{selectedCoupon.code}</dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Status</dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          selectedCoupon.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedCoupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Discount</dt>
                    <dd className="mt-1 font-medium">
                      {selectedCoupon.discountType === "PERCENT"
                        ? `${selectedCoupon.discountValue}%`
                        : `₹${selectedCoupon.discountValue}`}
                      {selectedCoupon.maxDiscountAmount && (
                        <span className="text-gray-500 ml-2">
                          (max ₹{selectedCoupon.maxDiscountAmount})
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Min Cart Value</dt>
                    <dd className="mt-1">₹{selectedCoupon.minCartValue || "—"}</dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Max Cart Value</dt>
                    <dd className="mt-1">₹{selectedCoupon.maxCartValue || "—"}</dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Usage Limits</dt>
                    <dd className="mt-1 space-y-1">
                      <div>Total: {selectedCoupon.totalUsageLimit || "∞"}</div>
                      <div>Per user: {selectedCoupon.perUserUsageLimit || "∞"}</div>
                      <div>Used: {selectedCoupon.usedCount || 0}</div>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Validity Period</dt>
                    <dd className="mt-1">
                      {new Date(selectedCoupon.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" → "}
                      {new Date(selectedCoupon.expiryDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <dt className="text-gray-500 font-medium">Description</dt>
                    <dd className="mt-1 text-gray-700 whitespace-pre-line">
                      {selectedCoupon.description || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-gray-500 font-medium">Applicable On</dt>
                    <dd className="mt-1 font-medium">{selectedCoupon.applicableOn}</dd>
                  </div>

                  {selectedCoupon.categories?.length > 0 && (
                    <div>
                      <dt className="text-gray-500 font-medium">Categories</dt>
                      <dd className="mt-1">{selectedCoupon.categories.join(", ")}</dd>
                    </div>
                  )}

                  {selectedCoupon.influencerId && (
                    <div>
                      <dt className="text-gray-500 font-medium">Influencer ID</dt>
                      <dd className="mt-1 font-mono text-xs break-all">
                        {selectedCoupon.influencerId}
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CouponPage;