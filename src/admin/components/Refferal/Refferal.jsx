import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Loader2, Settings } from "lucide-react";
import {
  getReferralAnalytics,
  getReferrals,
  updateReferralStatus,
} from "../../apis/Refferalapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { StatCard } from "../moneyFeatures/moneyFeaturesShared";
import {
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./referralShared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "REWARDED", label: "Rewarded" },
  { value: "REJECTED", label: "Rejected" },
];

function statusPillClass(status) {
  if (status === "REWARDED") return "bg-success-bg text-success";
  if (status === "REJECTED") return "bg-danger-bg text-danger";
  return "bg-warning/15 text-warning";
}

function fmtDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function Referral() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, limit]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await getReferralAnalytics();
      if (response?.success) setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getReferrals(page, limit, statusFilter, debouncedSearch);
      if (response?.success) {
        const data = response.data || {};
        setReferrals(data.items || []);
        setTotalPages(Math.max(1, data.totalPages || 1));
        setTotalItems(data.totalItems ?? data.total ?? data.items?.length ?? 0);
      } else {
        setReferrals([]);
        toast.error(response?.message || "Failed to load referrals");
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
      setReferrals([]);
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleStatusUpdate = async (id) => {
    const note = prompt("Enter rejection note");
    if (note === null) return;
    try {
      await updateReferralStatus(id, {
        status: "REJECTED",
        note: note.trim() || "Rejected by admin",
      });
      toast.success("Referral rejected");
      fetchReferrals();
      fetchAnalytics();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error?.response?.data?.message || "Failed to update referral status");
    }
  };

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-stone-900 sm:text-lg">
          Refer & earn
        </h1>
        <input
          type="search"
          placeholder="Search code or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[120px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:min-w-[140px] sm:max-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[120px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Status filter"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) || 20)}
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("money-features/refer-earn/config"))}
          className={btnPrimary}
        >
          <Settings className="h-3.5 w-3.5" aria-hidden />
          Configuration
        </button>
      </form>

      {analytics ? (
        <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatCard label="Total referrals" value={analytics.totalReferrals ?? 0} accent="brand" />
          <StatCard
            label="Rewarded"
            value={analytics.byStatus?.REWARDED ?? 0}
            accent="success"
          />
          <StatCard label="Pending" value={analytics.byStatus?.PENDING ?? 0} accent="amber" />
          <StatCard label="Rejected" value={analytics.byStatus?.REJECTED ?? 0} accent="violet" />
        </div>
      ) : null}

      <div className={tableScrollShell}>
        <table className="min-w-[860px] w-full divide-y divide-border text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Code</th>
              <th className={thClass}>Referred user</th>
              <th className={`${thClass} text-right`}>Reward</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Created</th>
              <th className={`${thClass} min-w-[90px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && referrals.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : referrals.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  No referrals found.
                </td>
              </tr>
            ) : (
              referrals.map((item, idx) => (
                <tr key={item._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{item.referralCode || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">
                    {item.referredUser?.name || item.referredUserSnapshot?.name || "—"}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-stone-900">
                    ₹{Number(item.rewardAmount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(
                        item.status,
                      )}`}
                    >
                      {item.status || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-stone-600">
                    {fmtDate(item.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {item.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(item._id)}
                        className="rounded-lg border border-danger/30 bg-danger-bg px-2.5 py-1 text-[10px] font-semibold text-danger hover:bg-danger/10"
                      >
                        Reject
                      </button>
                    ) : (
                      <span className="text-[10px] text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          Page {page} of {totalPages}
          {totalItems > 0 ? ` (${totalItems} referrals)` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
