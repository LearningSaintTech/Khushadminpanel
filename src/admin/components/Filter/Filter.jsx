import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFilters,
  deleteFilter,
  toggleFilterStatus,
} from "../../apis/Filterapi";

import { Plus, Trash2, Edit } from "lucide-react";

const FilterPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // Fixed limit: 10 filters per page
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchFilters();
  }, [currentPage, debouncedSearchTerm]);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getFilters(
        currentPage,
        limit,
        debouncedSearchTerm,
      );

      console.log("API Response:", response);

      // Correctly get filters and pagination
      const filtersData = response?.data?.filters || [];
      const paginationData = response?.data?.pagination || {};

      setFilters(filtersData);
      setTotalPages(paginationData.totalPages || 1);
    } catch (err) {
      console.error("Fetch filters error:", err);
      setError("Failed to load filters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this filter?")) return;

    try {
      setLoading(true);
      await deleteFilter(id);
      await fetchFilters();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete filter");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (filter) => {
    const originalStatus = filter.isActive;

    // Optimistic UI update
    setFilters((prev) =>
      prev.map((item) =>
        item._id === filter._id ? { ...item, isActive: !item.isActive } : item,
      ),
    );

    try {
      await toggleFilterStatus(filter._id);
    } catch (err) {
      // Revert if API fails
      setFilters((prev) =>
        prev.map((item) =>
          item._id === filter._id
            ? { ...item, isActive: originalStatus }
            : item,
        ),
      );
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Product Filters
            </h1>
            {/* Search Bar and Create Button - Side by Side */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search filters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-black focus:ring-2 focus:ring-black/20 transition-all"
                />
              </div>
              <button
                onClick={() => navigate("/admin/filters/create")}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <Plus size={18} />
                Add New Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading filters...
          </div>
        ) : filters.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 mb-4">No filters found</p>
            <button
              onClick={() => navigate("/admin/filters/create")}
              className="text-black hover:underline font-medium"
            >
              Create your first filter →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Key
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Label
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Values
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filters.map((filter, idx) => (
                    <tr
                      key={filter._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {filter.key}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {filter.label}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {filter.description || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {filter.values?.length || 0} values
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(filter)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            filter.isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              filter.isActive
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/admin/filters/edit/${filter._id}`)
                            }
                            className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(filter._id)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filters.length > 0 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FilterPage;
