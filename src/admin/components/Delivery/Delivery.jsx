import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getDeliveries,
  deleteDelivery,
  checkDeliveryByPincode,
} from "../../apis/Deliveryapi";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Package,
  X,
} from "lucide-react";
import Deliveryform from "./Deliveryform";

const cleanApiErrorMessage = (err, fallback = "Request failed") => {
  const raw = String(err?.response?.data?.message || err?.message || "");
  const cleaned = raw
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "")
    .replace(/\{\{baseUrl\}\}[\s\S]*/gi, "")
    .trim();
  return cleaned || fallback;
};

const tableScrollShell =
  "max-h-[calc(100vh-18rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function Delivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [pinCode, setPinCode] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const filterDeliveries = (fullList, searchTerm, status) => {
    let list = Array.isArray(fullList) ? fullList : [];
    if (searchTerm?.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((d) => String(d.deliveryType || "").toLowerCase().includes(q));
    }
    if (status === "active") list = list.filter((d) => d.isActive === true);
    else if (status === "inactive") list = list.filter((d) => d.isActive === false);
    return list;
  };

  const setPageFromFullList = (fullList, page, searchTerm, status, pageLimit) => {
    const filtered = filterDeliveries(fullList, searchTerm, status);
    const total = filtered.length;
    const totalPagesCount = total > 0 ? Math.max(1, Math.ceil(total / pageLimit)) : 1;
    const safePage = Math.min(Math.max(1, page), totalPagesCount);
    const start = (safePage - 1) * pageLimit;
    setDeliveries(filtered.slice(start, start + pageLimit));
    setCurrentPage(safePage);
    setTotalPages(totalPagesCount);
    setSelectedIds(new Set());
  };

  const applyPagination = (page) => {
    setPageFromFullList(allDeliveries, page, debouncedSearch, statusFilter, limit);
  };

  const fetchDeliveries = async (page = 1, searchTerm = debouncedSearch) => {
    setLoading(true);
    try {
      const res = await getDeliveries(undefined, undefined, searchTerm, true);
      const data = res?.data ?? res;
      const items = Array.isArray(res)
        ? res
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
      const fullList = Array.isArray(items) ? items : [];
      setAllDeliveries(fullList);
      setPageFromFullList(fullList, page, searchTerm, statusFilter, limit);
    } catch (err) {
      console.error("[Delivery] fetch:error", err);
      toast.error("Could not load delivery options");
      setDeliveries([]);
      setAllDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchDeliveries(1, debouncedSearch);
  }, [debouncedSearch, statusFilter, limit]);

  const toggleSelectAll = () => {
    if (selectedIds.size === deliveries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(deliveries.map((d) => d._id).filter(Boolean)));
  };

  const toggleSelectOne = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error("Select at least one option");
      return;
    }
    if (!window.confirm(`Delete ${ids.length} selected delivery option(s)?`)) return;
    setActionLoading(true);
    let failed = 0;
    try {
      for (const id of ids) {
        try {
          const res = await deleteDelivery(id);
          const success = res?.data?.success ?? res?.success;
          if (!success) throw new Error(res?.data?.message || "Delete failed");
        } catch (err) {
          console.error("[Delivery] bulkDelete:item:error", { id, err });
          failed += 1;
        }
      }
      if (failed > 0) toast.error(`Deleted ${ids.length - failed}; ${failed} failed`);
      else toast.success(`Deleted ${ids.length} option(s)`);
      setSelectedIds(new Set());
      fetchDeliveries(currentPage, debouncedSearch);
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openAddForm = () => {
    setEditId(null);
    setShowForm(true);
  };

  const openEditForm = (id) => {
    setEditId(id);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditId(null);
    fetchDeliveries(currentPage, debouncedSearch);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditId(null);
  };

  const handleCheckDelivery = async () => {
    if (pinCode.length !== 6 || !/^\d{6}$/.test(pinCode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setCheckingPin(true);
    try {
      const res = await checkDeliveryByPincode(pinCode);
      setCheckResult(res?.data ?? res ?? null);
    } catch {
      setCheckResult({ isServiceable: false });
      toast.error("Could not check serviceability");
    } finally {
      setCheckingPin(false);
    }
  };

  const handleRowDelete = async (id) => {
    if (!window.confirm("Delete this delivery option?")) return;
    setActionLoading(true);
    try {
      const res = await deleteDelivery(id);
      const success = res?.data?.success ?? res?.success;
      if (!success) throw new Error(res?.data?.message || "Delete failed");
      toast.success("Deleted");
      await fetchDeliveries(currentPage, debouncedSearch);
    } catch (err) {
      console.error("[Delivery] rowDelete:error", err);
      toast.error(cleanApiErrorMessage(err, "Failed to delete"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Delivery
        </h1>
        {!showForm ? (
          <>
            <div className="relative min-w-[140px] max-w-[200px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search type…"
                className={`${inputClass} w-full pl-8 pr-2`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
              aria-label="Status filter"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={inputClass}
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleFormCancel}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-canvas-muted"
          >
            <X className="h-3.5 w-3.5" />
            Back to list
          </button>
        )}
      </div>

      {showForm ? (
        <div className="mb-3">
          <Deliveryform
            editId={editId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      ) : null}

      {!showForm ? (
        <>
          {selectedIds.size > 0 ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-bg px-3 py-2">
              <span className="text-[11px] font-medium text-warning">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="rounded-lg bg-danger px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Delete selected
              </button>
            </div>
          ) : null}

          {loading && deliveries.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Loading…
            </div>
          ) : deliveries.length === 0 ? (
            <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              <p className="text-[11px] font-medium text-stone-600">No delivery options found</p>
              <button
                type="button"
                onClick={openAddForm}
                className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Add delivery option →
              </button>
            </div>
          ) : (
            <>
              <div className={tableScrollShell}>
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                    <tr>
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={deliveries.length > 0 && selectedIds.size === deliveries.length}
                          onChange={toggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                          aria-label="Select all on page"
                        />
                      </th>
                      <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        #
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Type
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Duration
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Charge
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Discount
                      </th>
                      <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Status
                      </th>
                      <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((item, idx) => (
                      <tr
                        key={item._id}
                        className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                      >
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item._id)}
                            onChange={() => toggleSelectOne(item._id)}
                            className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                          />
                        </td>
                        <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                          {rowIndexBase + idx + 1}
                        </td>
                        <td className="px-2 py-2 font-medium text-stone-900">{item.deliveryType}</td>
                        <td className="px-2 py-2 text-stone-600">
                          {item.deliveryDuration?.min}–{item.deliveryDuration?.max}{" "}
                          {item.deliveryDuration?.unit?.toLowerCase() || "days"}
                        </td>
                        <td className="px-2 py-2 font-medium tabular-nums text-stone-900">
                          ₹{Number(item.deliveryCharge ?? 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-stone-600">
                          {item.discount?.value > 0 ? (
                            <>
                              {item.discount.type === "PERCENT" || item.discount.type === "PERCENTAGE"
                                ? `${item.discount.value}%`
                                : `₹${Number(item.discount.value).toFixed(2)}`}
                              {item.discount.maxDiscountAmount > 0 && (
                                <span className="ml-1 text-stone-400">
                                  (max ₹{item.discount.maxDiscountAmount})
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.isActive
                                ? "bg-success-bg text-success"
                                : "bg-canvas-muted text-stone-600"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(item._id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                              title="Edit"
                              aria-label="Edit delivery"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRowDelete(item._id)}
                              disabled={actionLoading}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10 disabled:opacity-50"
                              title="Delete"
                              aria-label="Delete delivery"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => applyPagination(currentPage - 1)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
                  Page {currentPage} / {Math.max(1, totalPages)}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => applyPagination(currentPage + 1)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}

          <section className="mt-4 rounded-xl border border-border bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold text-stone-900">Check pincode serviceability</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:max-w-md">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit pincode"
                  className={`${inputClass} w-full pl-8`}
                />
              </div>
              <button
                type="button"
                onClick={handleCheckDelivery}
                disabled={checkingPin || pinCode.length !== 6}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkingPin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Check
              </button>
            </div>

            {checkResult ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2.5 ${
                  checkResult.isServiceable
                    ? "border-success/30 bg-success-bg"
                    : "border-danger/30 bg-danger-bg"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {checkResult.isServiceable ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-danger" />
                  )}
                  <h3 className="text-[11px] font-semibold text-stone-900">
                    {checkResult.isServiceable ? "Serviceable" : "Not serviceable"}
                  </h3>
                </div>
                {checkResult.deliveryOptions?.length > 0 ? (
                  <div className="space-y-2">
                    {checkResult.deliveryOptions.map((opt) => (
                      <div
                        key={opt._id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border bg-white px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-stone-900">{opt.deliveryType}</p>
                          <p className="text-[10px] text-stone-500">
                            {opt.deliveryDuration?.min}–{opt.deliveryDuration?.max}{" "}
                            {opt.deliveryDuration?.unit?.toLowerCase()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-bold tabular-nums text-stone-900">
                            ₹{opt.deliveryCharge ?? 0}
                          </p>
                          {opt.discount?.value > 0 ? (
                            <p className="text-[10px] text-success">
                              {opt.discount.type === "PERCENT" || opt.discount.type === "PERCENTAGE"
                                ? `${opt.discount.value}% off`
                                : `Flat ₹${opt.discount.value} off`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-600">No delivery options for this pincode.</p>
                )}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
