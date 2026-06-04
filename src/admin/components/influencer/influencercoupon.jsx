import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getInfluencers } from "../../apis/Influencer";
import { Search, ChevronRight, ChevronLeft, Loader2, Ticket } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getInfluencerCoupons } from "../../apis/influrncerCouponapi";
import {
  alertDanger,
  btnOutline,
  pageToolbar,
  tableScrollShell,
  inputClass,
} from "./influencerShared";

const LIMIT = 15;
const LIMIT_OPTIONS = [15, 20, 50];

const InfluencerCouponList = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [couponCounts, setCouponCounts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(LIMIT);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * limit, total);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, limit]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getInfluencers(currentPage, limit, debouncedSearch, null);
        const data = res?.data || {};
        setInfluencers(data?.influencers || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setTotal(data?.pagination?.total || 0);
      } catch (err) {
        setError("Failed to load influencers");
        console.error(err);
        setInfluencers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentPage, debouncedSearch, limit]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ids = influencers.map((i) => i?._id).filter(Boolean);
      if (ids.length === 0) {
        setCouponCounts({});
        return;
      }
      try {
        const results = await Promise.all(
          ids.map(async (influencerId) => {
            try {
              const res = await getInfluencerCoupons(influencerId, 1, 1);
              const payload = res?.data?.data ?? res?.data ?? {};
              const totalFromRes =
                payload?.total ??
                payload?.pagination?.total ??
                payload?.pagination?.totalItems ??
                (Array.isArray(payload?.coupons) ? payload.coupons.length : 0) ??
                0;
              return [influencerId, Number(totalFromRes) || 0];
            } catch {
              return [influencerId, 0];
            }
          }),
        );
        if (!cancelled) setCouponCounts(Object.fromEntries(results));
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [influencers]);

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <Ticket className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <div className="mr-auto shrink-0 min-w-0">
          <h1 className="whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
            Influencer coupons
          </h1>
          <p className="whitespace-nowrap text-[10px] text-stone-500">
            Select an influencer to manage attached coupons
          </p>
        </div>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name / email / phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || LIMIT)}
          className={`${inputClass} w-[108px]`}
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </form>

      {error ? <div className={`${alertDanger} mb-2`}>{error}</div> : null}

      <div className={tableScrollShell}>
        <table className="min-w-[640px] w-full text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted/90 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center">#</th>
              <th className="px-2 py-2 text-left">Influencer</th>
              <th className="px-2 py-2 text-right">Coupons</th>
              <th className="px-2 py-2 text-center">Status</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && influencers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : influencers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-stone-500">
                  No influencers found
                </td>
              </tr>
            ) : (
              influencers.map((inf, idx) => (
                <tr
                  key={inf._id}
                  className="cursor-pointer hover:bg-canvas-muted/50"
                  onClick={() => navigate(ap(`influencer/${inf._id}/coupons`))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(ap(`influencer/${inf._id}/coupons`));
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {(currentPage - 1) * limit + idx + 1}
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-stone-900">{inf.name || inf.username || "—"}</p>
                    <p className="text-[10px] text-stone-500">
                      {inf.email || inf.phone || "No contact"}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium text-stone-800">
                    {couponCounts?.[inf._id] ?? 0}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {inf.isActive !== undefined ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inf.isActive
                            ? "bg-success-bg text-success"
                            : "bg-danger-bg text-danger"
                        }`}
                      >
                        {inf.isActive ? "Active" : "Inactive"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2 text-stone-400">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 influencers"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> total · Page{" "}
              <span className="font-medium text-stone-700">{currentPage}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfluencerCouponList;
