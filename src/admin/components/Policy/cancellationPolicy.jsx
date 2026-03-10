// src/pages/admin/CancellationPolicies.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  getAllCancellation,
  deleteCancellation,
  toggleCancellationActive,
} from "../../apis/CancellationPolicyapi";

import {
  Plus,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  PackageCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

const CancellationPolicies = () => {
  const [policies, setPolicies] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllCancellation(
        pagination.page,
        pagination.limit
      );

      const data = res?.data || {};

      setPolicies(data.policies || data.data || []);

      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        totalPages:
          data.totalPages ||
          Math.ceil(data.count / prev.limit) ||
          1,
      }));
    } catch (err) {
      console.error("Failed to load policies:", err);
      setError(
        err?.response?.data?.message ||
          "Could not load cancellation policies."
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleToggleActive = async (id, currentActive) => {
    if (!window.confirm(`Turn ${currentActive ? "OFF" : "ON"} this policy?`))
      return;

    try {
      await toggleCancellationActive(id);

      setPolicies((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, isActive: !currentActive } : p
        )
      );
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cancellation policy permanently?"))
      return;

    try {
      await deleteCancellation(id);

      setPolicies((prev) => prev.filter((p) => p._id !== id));

      if (policies.length === 1 && pagination.page > 1) {
        setPagination((p) => ({
          ...p,
          page: p.page - 1,
        }));
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete policy");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3">
            <PackageCheck className="h-8 w-8 text-indigo-600" />
            Cancellation Policies
          </h1>

          <Link
            to="/admin/cancellation/create"
            className="inline-flex items-center gap-2  bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> Create New Policy
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">

            {/* Table Head */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Name
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Reasons
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Policy Rules
                </th>

                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>

                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-500">
                    Loading policies...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-500">
                    No cancellation policies found
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr
                    key={policy._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {policy.name}
                    </td>

                    {/* Reasons */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {policy.cancellationReasons?.join(", ") || "—"}
                    </td>

                    {/* Dynamic Policies */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {policy.policies ? (
                        <div className="space-y-1">
                          {Object.entries(policy.policies).map(
                            ([key, value]) => (
                              <div key={key}>
                                <span className="font-medium capitalize">
                                  {key.replace(/([A-Z])/g, " $1")}:
                                </span>{" "}
                                {Array.isArray(value)
                                  ? value.join(" → ")
                                  : value}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          policy.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">

                        {/* Edit */}
                        <Link
                          to={`/admin/cancellation/edit/${policy._id}`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </Link>

                        {/* Toggle */}
                        <button
                          onClick={() =>
                            handleToggleActive(policy._id, policy.isActive)
                          }
                          className={`p-2 rounded-lg transition ${
                            policy.isActive
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-green-600 hover:bg-green-50"
                          }`}
                          title={
                            policy.isActive ? "Deactivate" : "Activate"
                          }
                        >
                          <Power size={18} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(policy._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-700">
              Showing page{" "}
              <span className="font-medium">{pagination.page}</span> of{" "}
              <span className="font-medium">{pagination.totalPages}</span>
            </div>

            <div className="flex gap-3">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: p.page - 1,
                  }))
                }
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <button
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: p.page + 1,
                  }))
                }
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicies;