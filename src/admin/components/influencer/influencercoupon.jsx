// src/pages/admin/influencers/InfluencerCouponList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getInfluencers } from "../../apis/Influencer";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";

const InfluencerCouponList = () => {
  const navigate = useNavigate();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch influencers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await getInfluencers(
          currentPage,
          limit,
          debouncedSearch,
          null
        );

        const data = res?.data || {};

        setInfluencers(data?.influencers || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setTotal(data?.pagination?.total || 0);
      } catch (err) {
        setError("Failed to load influencers");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, debouncedSearch]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Influencer Coupon Management
          </h1>
          <p className="mt-2 text-gray-600">
            Select an influencer to manage attached coupons
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-black focus:ring-1 focus:ring-black/20"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">Loading influencers...</div>
        ) : influencers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No influencers found
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {influencers.map((inf) => (
                <div
                  key={inf._id}
                  onClick={() =>
                    navigate(`/admin/influencer/${inf._id}/coupons`)
                  }
                  className="p-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {inf.name || inf.username || "—"}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {inf.email || inf.phone || "No contact"}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {inf.couponCount || 0} coupons
                      </div>
                      <div className="text-xs text-gray-500">attached</div>
                    </div>

                    {inf.isActive !== undefined && (
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          inf.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {inf.isActive ? "Active" : "Inactive"}
                      </span>
                    )}

                    <ChevronRight className="text-gray-400 group-hover:text-gray-700 transition" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm">
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span>
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Optional count display */}
        {!loading && total > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {(currentPage - 1) * limit + 1} –{" "}
            {Math.min(currentPage * limit, total)} of {total} influencers
          </div>
        )}
      </div>
    </div>
  );
};

export default InfluencerCouponList;