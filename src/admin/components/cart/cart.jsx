import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getCartCharges,
  deleteCartCharges,
  toggleCartChargeStatus,
  deleteCartChargeRule,
} from "../../apis/Cartapi";
import toast from "react-hot-toast";
import { Pencil, Trash2, Power } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

function getChargeList(cartCharge) {
  return Array.isArray(cartCharge) ? cartCharge : cartCharge ? [cartCharge] : [];
}

function getChargeSummary(cartCharge) {
  const list = getChargeList(cartCharge);
  if (list.length === 0) return "—";
  return list
    .map((c) => `${c.key || "—"}${c.isCODSpecial ? " (COD)" : ""}`)
    .join(", ");
}

const CartChargesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const listPath = ap("cart-charges");

  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const prevPathRef = useRef(location.pathname);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const fetchCharges = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCartCharges(page, limit);
        const responseData = response?.data || response || {};
        const chargesArray =
          responseData?.data ||
          responseData?.cartCharges ||
          (Array.isArray(responseData) ? responseData : []);
        const total =
          responseData?.total ?? responseData?.pagination?.total ?? chargesArray?.length ?? 0;

        if (Array.isArray(chargesArray)) {
          setCharges(chargesArray);
          const calculatedPages = Math.ceil((total || chargesArray.length) / limit);
          setTotalPages(calculatedPages > 0 ? calculatedPages : 1);
        } else {
          setCharges([]);
          setTotalPages(1);
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            (typeof err === "string" ? err : "Failed to load cart charges"),
        );
        setCharges([]);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  const filteredCharges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return charges.filter((charge) => {
      if (statusFilter === "true" && !charge.isActive) return false;
      if (statusFilter === "false" && charge.isActive) return false;
      if (!q) return true;
      const summary = getChargeSummary(charge.cartCharge).toLowerCase();
      const idTail = (charge._id || "").slice(-8).toLowerCase();
      return summary.includes(q) || idTail.includes(q);
    });
  }, [charges, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, search, statusFilter]);

  useEffect(() => {
    fetchCharges(currentPage);
  }, [currentPage, fetchCharges]);

  useEffect(() => {
    const isListPage =
      location.pathname === listPath || location.pathname === `${listPath}/`;
    const cameFromEdit =
      prevPathRef.current.includes("/edit/") || prevPathRef.current.includes("/create");
    prevPathRef.current = location.pathname;
    if (isListPage && cameFromEdit) {
      fetchCharges(currentPage);
    }
  }, [location.pathname, currentPage, fetchCharges, listPath]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cart charge configuration?")) return;
    try {
      setLoading(true);
      await deleteCartCharges(id);
      await fetchCharges(currentPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete cart charge");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await toggleCartChargeStatus(id);
      await fetchCharges(currentPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id, key) => {
    if (!window.confirm(`Delete rule "${key}"?`)) return;
    try {
      setLoading(true);
      const res = await deleteCartChargeRule(id, key);
      if (res?.data?.success) {
        toast.success(res.data.message || "Rule deleted");
        setCharges((prev) =>
          prev.map((item) => {
            if (item._id !== id) return item;
            const updatedRules = getChargeList(item.cartCharge).filter((rule) => rule.key !== key);
            return { ...item, cartCharge: updatedRules };
          }),
        );
        fetchCharges(currentPage);
      } else {
        toast.error(res?.data?.message || "Failed to delete rule");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Cart Charges
        </h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys…"
          className={`${inputClass} w-full min-w-[120px] max-w-[160px] sm:w-auto`}
          aria-label="Search cart charges"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} min-w-[120px] max-w-[140px]`}
          title="Status filter"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("cart-charges/create"))}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Create
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                #
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                ID
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Charges
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 xl:table-cell">
                Rules
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Status
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                Created
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && charges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : filteredCharges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center">
                  <p className="text-stone-500">No configurations found.</p>
                  <button
                    type="button"
                    onClick={() => navigate(ap("cart-charges/create"))}
                    className="mt-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Create configuration →
                  </button>
                </td>
              </tr>
            ) : (
              filteredCharges.map((charge, idx) => (
                <tr key={charge._id} className="border-t border-border/80 hover:bg-brand-50/30">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px] text-stone-600 whitespace-nowrap">
                    …{charge._id.slice(-8)}
                  </td>
                  <td className="max-w-[200px] px-2 py-2">
                    <p className="truncate font-medium text-stone-800">
                      {getChargeSummary(charge.cartCharge)}
                    </p>
                  </td>
                  <td className="hidden px-2 py-2 xl:table-cell">
                    <div className="flex max-w-md flex-wrap gap-1">
                      {getChargeList(charge.cartCharge).map((rule, ruleIdx) => (
                        <span
                          key={`${rule.key}-${ruleIdx}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-canvas-muted px-1.5 py-0.5 text-[10px] text-stone-700"
                        >
                          <span className="max-w-[140px] truncate">
                            {rule.key}
                            {rule.isCODSpecial ? " [COD]" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(charge._id, rule.key)}
                            className="text-danger hover:opacity-80"
                            title="Delete rule"
                            aria-label={`Delete rule ${rule.key}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        charge.isActive
                          ? "bg-success-bg text-success"
                          : "bg-danger-bg text-danger"
                      }`}
                    >
                      {charge.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 whitespace-nowrap text-stone-600 lg:table-cell">
                    {charge.createdAt
                      ? new Date(charge.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(ap(`cart-charges/edit/${charge._id}`))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                        title="Edit"
                        aria-label="Edit configuration"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(charge._id)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                          charge.isActive
                            ? "border-warning/40 bg-warning-bg text-warning hover:opacity-90"
                            : "border-success/30 bg-success-bg text-success hover:opacity-90"
                        }`}
                        title={charge.isActive ? "Deactivate" : "Activate"}
                        aria-label={charge.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(charge._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition-colors hover:opacity-90"
                        title="Delete"
                        aria-label="Delete configuration"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={currentPage === 1 || loading}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
          Page {currentPage} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages || loading}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default CartChargesPage;
