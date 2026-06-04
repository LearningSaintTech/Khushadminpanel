import { useState, useEffect, useCallback } from "react";
import {
  getAllCancellation,
  deleteCancellation,
  toggleCancellationActive,
} from "../../apis/CancellationPolicyapi";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  btnIconDelete,
  btnIconEdit,
  btnOutline,
  btnPrimary,
  badgeActive,
  badgeInactive,
  alertDanger,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./policyShared";

const LIMIT_OPTIONS = [10, 20, 50];

const CancellationPolicies = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

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
      const res = await getAllCancellation(pagination.page, pagination.limit);
      const data = res?.data || {};
      setPolicies(data.policies || data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || Math.ceil((data.count || 0) / prev.limit) || 1,
      }));
    } catch (err) {
      console.error("Failed to load policies:", err);
      setPolicies([]);
      setError(err?.response?.data?.message || "Could not load cancellation policies.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleToggleActive = async (id, currentActive) => {
    if (
      !window.confirm(
        `Turn ${currentActive ? "OFF" : "ON"} this policy?${!currentActive ? " Any other active policy will be deactivated." : ""}`,
      )
    )
      return;
    try {
      await toggleCancellationActive(id);
      fetchPolicies();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cancellation policy permanently?")) return;
    try {
      await deleteCancellation(id);
      setPolicies((prev) => prev.filter((p) => p._id !== id));
      if (policies.length === 1 && pagination.page > 1) {
        setPagination((p) => ({ ...p, page: p.page - 1 }));
      } else {
        fetchPolicies();
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete policy");
    }
  };

  return (
    <div className="text-stone-900">
      <div className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}>
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Cancellation policies
        </h1>
        <select
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={pagination.limit}
          onChange={(e) => {
            const n = Number(e.target.value) || 10;
            setPagination((p) => ({ ...p, page: 1, limit: n }));
          }}
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("cancellation/create"))}
          className={btnPrimary}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Create
        </button>
      </div>
      <p className="mb-2 text-[10px] text-stone-500">Only one policy can be active at a time.</p>

      {error ? (
        <div className={`${alertDanger} mb-2 flex items-center gap-2`}>
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <div className={tableScrollShell}>
        <table className="min-w-[1000px] w-full divide-y divide-border text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Reasons</th>
              <th className={thClass}>Policy rules</th>
              <th className={`${thClass} text-center`}>Status</th>
              <th className={`${thClass} min-w-[100px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && policies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  No cancellation policies found.
                </td>
              </tr>
            ) : (
              policies.map((policy, idx) => (
                <tr key={policy._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(pagination.page - 1) * pagination.limit + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{policy.name}</td>
                  <td className="max-w-[200px] truncate px-2 py-2 text-stone-600">
                    {policy.cancellationReasons?.join(", ") || "—"}
                  </td>
                  <td className="px-2 py-2 text-stone-700">
                    {policy.policies ? (
                      <div className="space-y-0.5">
                        {Object.entries(policy.policies).map(([key, value]) => (
                          <div key={key} className="text-[10px]">
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1")}:
                            </span>{" "}
                            {Array.isArray(value) ? value.join(" → ") : value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        policy.isActive ? badgeActive : badgeInactive
                      }`}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(ap(`cancellation/edit/${policy._id}`))}
                      className={btnIconEdit}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(policy._id, policy.isActive)}
                      className={`ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border transition ${
                        policy.isActive
                          ? "text-warning hover:bg-warning/10"
                          : "text-success hover:bg-success-bg"
                      }`}
                      title={policy.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy._id)}
                      className={`${btnIconDelete} ml-1.5`}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          Page {pagination.page} of {pagination.totalPages}
          {pagination.total > 0 ? ` (${pagination.total} total)` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicies;
