import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { getPolicies, deletePolicy } from "../../apis/UspPolicy";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  badgeActive,
  btnIconDelete,
  btnIconEdit,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./policyShared";

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function PolicyManagement() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPolicies, setTotalPolicies] = useState(0);

  const fetchPolicies = async (page = 1, itemsPerPage = limit) => {
    try {
      setLoading(true);
      const res = await getPolicies(page, itemsPerPage);
      if (res?.success) {
        setPolicies(res?.data?.policies || []);
        setTotalPolicies(res?.data?.pagination?.total || 0);
        setTotalPages(Math.max(1, res?.data?.pagination?.totalPages || 1));
        setCurrentPage(res?.data?.pagination?.currentPage || page);
      } else {
        setPolicies([]);
        toast.error(res?.message || "Failed to load policies");
      }
    } catch (error) {
      console.error("Fetch Policies Error:", error);
      setPolicies([]);
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies(currentPage, limit);
  }, [currentPage, limit]);

  const filteredPolicies = useMemo(() => {
    if (!search.trim()) return policies;
    const q = search.trim().toLowerCase();
    return policies.filter(
      (item) =>
        item?.text?.toLowerCase().includes(q) ||
        item?.policyType?.toLowerCase().includes(q),
    );
  }, [policies, search]);

  const handleDelete = async (policyId) => {
    if (!window.confirm("Delete this policy?")) return;
    try {
      const response = await deletePolicy(policyId);
      if (response?.success) {
        toast.success("Policy deleted");
        fetchPolicies(currentPage, limit);
      } else {
        toast.error(response?.message || "Delete failed");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Failed to delete policy");
    }
  };

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-stone-900 sm:text-lg">
          USP policies
        </h1>
        <input
          type="search"
          placeholder="Search on this page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[120px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:min-w-[140px] sm:max-w-[220px]"
        />
        <select
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value, 10) || 20);
            setCurrentPage(1);
          }}
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Items per page"
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt} / page
            </option>
          ))}
        </select>
        <button type="button" onClick={() => navigate(ap("usp/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[800px] w-full divide-y divide-border text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Icon</th>
              <th className={thClass}>Policy</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Order</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} min-w-[90px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && policies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : filteredPolicies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-500">
                  No policies found.
                </td>
              </tr>
            ) : (
              filteredPolicies.map((item, idx) => (
                <tr key={item._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {(currentPage - 1) * limit + idx + 1}
                  </td>
                  <td className="px-2 py-2">
                    {item.iconUrl ? (
                      <img
                        src={item.iconUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas-muted text-[10px] text-stone-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="max-w-md px-2 py-2">
                    <p className="line-clamp-2 font-medium text-stone-800">{item.text}</p>
                  </td>
                  <td className="px-2 py-2 capitalize">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {item.policyType}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-medium tabular-nums text-stone-700">
                    #{item.order}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.isActive ? badgeActive : "bg-danger-bg text-danger"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate(ap(`usp/edit/${item._id}`))}
                      className={btnIconEdit}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
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
          Page {currentPage} of {totalPages}
          {totalPolicies > 0 ? ` (${totalPolicies} total)` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || loading}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
