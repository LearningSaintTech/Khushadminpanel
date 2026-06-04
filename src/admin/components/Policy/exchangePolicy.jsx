import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllExchange,
  deleteExchange,
  toggleExchangeActive,
} from "../../apis/Exchangeapi";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
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

const Exchange = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [exchanges, setExchanges] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchExchanges();
  }, [page, limit]);

  const fetchExchanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllExchange(page, limit);
      if (res?.success) {
        setExchanges(res.data.policies || []);
        setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
        setTotalPolicies(res.data.pagination?.total || res.data.policies?.length || 0);
      } else {
        setExchanges([]);
        setError("Failed to load exchange policies");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setExchanges([]);
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
    const policy = exchanges.find((p) => p._id === id);
    const willActivate = policy && !policy.isActive;
    if (
      willActivate &&
      !window.confirm("Activate this policy? Any other active policy will be deactivated.")
    )
      return;
    try {
      await toggleExchangeActive(id);
      fetchExchanges();
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("Failed to update status");
    }
  };

  return (
    <div className="text-stone-900">
      <div className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}>
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Exchange policies
        </h1>
        <select
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(Number(e.target.value) || 10);
          }}
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button type="button" onClick={() => navigate(ap("exchange/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
      </div>
      <p className="mb-2 text-[10px] text-stone-500">Only one policy can be active at a time.</p>

      {error ? <div className={alertDanger}>{error}</div> : null}

      <div className={tableScrollShell}>
        <table className="min-w-[880px] w-full divide-y divide-border text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Max days</th>
              <th className={thClass}>Max limit (₹)</th>
              <th className={thClass}>Reasons</th>
              <th className={`${thClass} text-center`}>Status</th>
              <th className={`${thClass} min-w-[100px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && exchanges.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : exchanges.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500">
                  No exchange policies found.{" "}
                  <button
                    type="button"
                    onClick={() => navigate(ap("exchange/create"))}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Create one
                  </button>
                </td>
              </tr>
            ) : (
              exchanges.map((policy, idx) => (
                <tr key={policy._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-stone-900">
                    {policy.maxExchangeTimeInDays ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-stone-800">
                    {policy.maxExchangeLimit
                      ? Number(policy.maxExchangeLimit).toLocaleString()
                      : "—"}
                  </td>
                  <td className="max-w-xs truncate px-2 py-2 text-stone-700">
                    {policy.exchangeReasons?.length
                      ? policy.exchangeReasons.join(" • ")
                      : "—"}
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
                      onClick={() => navigate(ap(`exchange/edit/${policy._id}`))}
                      className={btnIconEdit}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(policy._id)}
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
          Page {page} of {totalPages}
          {totalPolicies > 0 ? ` (${totalPolicies} total)` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Exchange;
