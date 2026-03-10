// src/admin/pages/Exchange.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllExchange,
  deleteExchange,
  toggleExchangeActive,
} from "../../apis/Exchangeapi";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const Exchange = () => {
  const navigate = useNavigate();

  const [exchanges, setExchanges] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPolicies, setTotalPolicies] = useState(0); // optional - if your API returns total count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExchanges();
  }, [page]);

  const fetchExchanges = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllExchange(page, 10);
      if (res?.success) {
        setExchanges(res.data.policies || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        // If your API returns total count, uncomment and use:
        // setTotalPolicies(res.data.pagination?.total || 0);
      } else {
        setError("Failed to load exchange policies");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exchange policy?")) return;
    try {
      await deleteExchange(id);
      fetchExchanges();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete policy");
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleExchangeActive(id);
      fetchExchanges();
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("Failed to update status");
    }
  };

  // Generate page numbers to show (with ellipsis)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if few
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Show first + last + around current
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Exchange Policies
            {totalPolicies > 0 && <span className="text-gray-500 text-xl ml-3">({totalPolicies})</span>}
          </h1>

          <button
            onClick={() => navigate("/admin/exchange/create")}
            className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Policy
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading policies...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-5 rounded-lg text-center">
            {error}
          </div>
        ) : exchanges.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600 text-lg mb-2">No exchange policies found.</p>
            <p className="text-gray-500">
              Click "Create New Policy" to add your first exchange rule.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Max Days
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Max Limit (₹)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reasons
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-100">
                  {exchanges.map((policy) => (
                    <tr key={policy._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {policy.maxExchangeTimeInDays ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {policy.maxExchangeLimit
                          ? Number(policy.maxExchangeLimit).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {policy.exchangeReasons?.length
                          ? policy.exchangeReasons.join(" • ")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(policy._id)}
                          className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            policy.isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {policy.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        <button
                          onClick={() => navigate(`/admin/exchange/edit/${policy._id}`)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy._id)}
                          className="text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            { (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50 gap-4">
                <div className="text-sm text-gray-600">
                  Showing <strong>{exchanges.length}</strong> of{" "}
                  <strong>{totalPolicies || "many"}</strong> policies
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </button>

                  {getPageNumbers().map((num, idx) => (
                    <React.Fragment key={idx}>
                      {num === "..." ? (
                        <span className="px-3 py-2 text-gray-500">...</span>
                      ) : (
                        <button
                          onClick={() => setPage(Number(num))}
                          className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                            page === num
                              ? "bg-gray-900 text-white"
                              : "text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {num}
                        </button>
                      )}
                    </React.Fragment>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>

                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Exchange;