import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInfluencers, toggleInfluencerStatus } from "../../apis/Influencer";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Pencil,
  Power,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Columns3,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  btnIconEdit,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./influencerShared";

const INFLUENCER_COLUMNS_STORAGE_KEY = "admin.influencers.visibleColumns.v1";
const ALL_COLUMN_KEYS = ["name", "email", "city", "followers", "status", "actions"];
const LIMIT_OPTIONS = [10, 20, 50, 100];

const Influencer = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [influencers, setInfluencers] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    try {
      const raw = localStorage.getItem(INFLUENCER_COLUMNS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const keys = Array.isArray(parsed) ? parsed.filter((k) => ALL_COLUMN_KEYS.includes(k)) : null;
      return keys?.length ? keys : ALL_COLUMN_KEYS;
    } catch {
      return ALL_COLUMN_KEYS;
    }
  });

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);
  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const rangeStart = total === 0 ? 0 : rowIndexBase + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    try {
      localStorage.setItem(INFLUENCER_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumnKeys));
    } catch {
      // ignore
    }
  }, [visibleColumnKeys]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, isActive, limit]);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const res = await getInfluencers(page, limit, debouncedSearch, isActive);
      if (res?.success) {
        setInfluencers(res.data.influencers || []);
        setPagination(res.data.pagination || { totalPages: 1, total: 0 });
      } else {
        toast.error(res?.message || "Failed to fetch influencers");
        setInfluencers([]);
      }
    } catch (err) {
      console.error("Fetch Influencers Error:", err);
      toast.error(err?.response?.data?.message || "Something went wrong while fetching");
      setInfluencers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, [page, limit, debouncedSearch, isActive]);

  const handleToggle = async (id) => {
    try {
      const res = await toggleInfluencerStatus(id);
      if (res?.success) {
        toast.success(res?.message || "Status updated");
        fetchInfluencers();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Toggle Error:", err);
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const col = (key) => visibleColumnKeys.includes(key);

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Influencers
        </h1>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name / email / city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={String(isActive)}
          onChange={(e) => setIsActive(e.target.value === "true")}
          className="w-[120px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Status"
          aria-label="Status"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsColumnMenuOpen((s) => !s)}
            className={btnOutline}
            title="Columns"
          >
            <Columns3 className="h-3.5 w-3.5" aria-hidden />
          </button>
          {isColumnMenuOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-border bg-white p-2 shadow-lg">
              {[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "city", label: "City" },
                { key: "followers", label: "Followers" },
                { key: "status", label: "Status" },
                { key: "actions", label: "Actions" },
              ].map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] hover:bg-canvas-muted"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumnKeys.includes(c.key)}
                    onChange={(e) => {
                      setVisibleColumnKeys((prev) => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(c.key);
                        else set.delete(c.key);
                        const next = Array.from(set).filter((k) => ALL_COLUMN_KEYS.includes(k));
                        return next.length > 0 ? next : prev;
                      });
                    }}
                  />
                  {c.label}
                </label>
              ))}
              <button
                type="button"
                className="mt-1 w-full rounded-lg bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white"
                onClick={() => setIsColumnMenuOpen(false)}
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => navigate(ap("influencer/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[720px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              {col("name") ? <th className={thClass}>Name</th> : null}
              {col("email") ? <th className={thClass}>Email</th> : null}
              {col("city") ? <th className={thClass}>City</th> : null}
              {col("followers") ? <th className={thClass}>Followers</th> : null}
              {col("status") ? <th className={`${thClass} text-center`}>Status</th> : null}
              {col("actions") ? <th className={`${thClass} min-w-[100px] text-right`}>Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && influencers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : influencers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                  No influencers found.{" "}
                  <button
                    type="button"
                    onClick={() => navigate(ap("influencer/create"))}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Create one
                  </button>
                </td>
              </tr>
            ) : (
              influencers.map((item, idx) => {
                const totalFollowers =
                  item.digitalSources?.reduce((sum, src) => sum + (src.followers || 0), 0) || 0;
                return (
                  <tr key={item._id} className="hover:bg-canvas-muted/50">
                    <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    {col("name") ? (
                      <td className="whitespace-nowrap px-2 py-2 font-medium text-stone-900">
                        {item.name || "—"}
                      </td>
                    ) : null}
                    {col("email") ? (
                      <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                        {item.email || "—"}
                      </td>
                    ) : null}
                    {col("city") ? (
                      <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                        {item.city || "—"}
                      </td>
                    ) : null}
                    {col("followers") ? (
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-stone-700">
                        {totalFollowers.toLocaleString()}
                      </td>
                    ) : null}
                    {col("status") ? (
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.isActive
                              ? "bg-success-bg text-success"
                              : "bg-danger-bg text-danger"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    ) : null}
                    {col("actions") ? (
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(ap(`influencer/${item._id}/coupons`))}
                          className={btnIconEdit}
                          title="Coupons"
                          aria-label="Coupons"
                        >
                          <Ticket className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(ap(`influencer/edit/${item._id}`))}
                          className={`${btnIconEdit} ml-1.5`}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(item._id)}
                          className={`ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border transition ${
                            item.isActive
                              ? "text-warning hover:bg-warning/10"
                              : "text-success hover:bg-success-bg"
                          }`}
                          title={item.isActive ? "Deactivate" : "Activate"}
                          aria-label={item.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
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
              <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
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
};

export default Influencer;
