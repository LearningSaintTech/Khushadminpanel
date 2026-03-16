import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getDeliveries,
  deleteDelivery,
  checkDeliveryByPincode,
} from "../../apis/Deliveryapi";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2, Search, Package } from "lucide-react";
import Deliveryform from "./Deliveryform";

const LIMIT = 10;

export default function Delivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [pinCode, setPinCode] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  const applyPagination = (page, searchTerm) => {
    const filtered =
      searchTerm?.trim()
        ? allDeliveries.filter((d) =>
            String(d.deliveryType || "").toLowerCase().includes(searchTerm.trim().toLowerCase())
          )
        : allDeliveries;
    const total = filtered.length;
    const totalPagesCount = total > 0 ? Math.max(1, Math.ceil(total / LIMIT)) : 1;
    const start = (page - 1) * LIMIT;
    setDeliveries(filtered.slice(start, start + LIMIT));
    setCurrentPage(page);
    setTotalPages(totalPagesCount);
    setSelectedIds(new Set());
  };

  const fetchDeliveries = async (page = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const res = await getDeliveries(undefined, undefined, searchTerm, true);
      const data = res?.data ?? res;
      const items = Array.isArray(res) ? res : Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const fullList = Array.isArray(items) ? items : [];
      setAllDeliveries(fullList);
      const filtered =
        searchTerm?.trim()
          ? fullList.filter((d) =>
              String(d.deliveryType || "").toLowerCase().includes(searchTerm.trim().toLowerCase())
            )
          : fullList;
      const total = filtered.length;
      const totalPagesCount = total > 0 ? Math.max(1, Math.ceil(total / LIMIT)) : 1;
      setTotalPages(totalPagesCount);
      const start = (page - 1) * LIMIT;
      setDeliveries(filtered.slice(start, start + LIMIT));
      setCurrentPage(page);
      setSelectedIds(new Set());
    } catch {
      toast.error("Could not load delivery options");
      setDeliveries([]);
      setAllDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries(1, "");
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    setDeliverySearch(searchInput.trim());
    fetchDeliveries(1, searchInput.trim());
  };

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
          await deleteDelivery(id);
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) toast.error(`Deleted ${ids.length - failed}; ${failed} failed`);
      else toast.success(`Deleted ${ids.length} option(s)`);
      setSelectedIds(new Set());
      fetchDeliveries(currentPage, deliverySearch);
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
    fetchDeliveries(currentPage, deliverySearch);
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

  return (
    <div className="min-h-screen bg-slate-50/80 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-lg">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Delivery Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                View and manage delivery options
              </p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white font-medium text-sm hover:bg-slate-900 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Add delivery option
            </button>
          )}
        </div>

        {showForm ? (
          <div className="mb-10">
            <Deliveryform
              editId={editId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        ) : null}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800">Delivery options</h2>
              <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by type..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-slate-400" />
              <p className="text-sm">Loading delivery options...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No delivery options found</p>
              <p className="text-sm text-slate-400 mt-1">Try a different search or add one above</p>
              <button
                onClick={openAddForm}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
              >
                <Plus size={18} />
                Add delivery option
              </button>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">{selectedIds.size} selected</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete selected
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={deliveries.length > 0 && selectedIds.size === deliveries.length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                        />
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Charge</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {deliveries.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item._id)}
                            onChange={() => toggleSelectOne(item._id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                          />
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{item.deliveryType}</td>
                        <td className="px-6 py-3.5 text-sm text-slate-600">
                          {item.deliveryDuration?.min}–{item.deliveryDuration?.max}{" "}
                          {item.deliveryDuration?.unit?.toLowerCase() || "days"}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          ₹{Number(item.deliveryCharge ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-600">
                          {item.discount?.value > 0 ? (
                            <>
                              {(item.discount.type === "PERCENT" || item.discount.type === "PERCENTAGE")
                                ? `${item.discount.value}%`
                                : `₹${Number(item.discount.value).toFixed(2)}`}
                              {item.discount.maxDiscountAmount > 0 && (
                                <span className="text-slate-400 ml-1">(max ₹{item.discount.maxDiscountAmount})</span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditForm(item._id)}
                              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this delivery option?")) {
                                  setActionLoading(true);
                                  deleteDelivery(item._id)
                                    .then(() => {
                                      toast.success("Deleted");
                                      fetchDeliveries(currentPage, deliverySearch);
                                    })
                                    .catch(() => toast.error("Failed to delete"))
                                    .finally(() => setActionLoading(false));
                                }
                              }}
                              disabled={actionLoading}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
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

              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-sm text-slate-600">
                  Page <strong>{currentPage}</strong> of <strong>{Math.max(1, totalPages)}</strong>
                  {deliveries.length > 0 && (
                    <span className="ml-2 text-slate-400">({deliveries.length} on this page)</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => applyPagination(currentPage - 1, deliverySearch)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => applyPagination(currentPage + 1, deliverySearch)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-10 bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Check pincode serviceability</h2>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit pincode"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none"
              />
            </div>
            <button
              onClick={handleCheckDelivery}
              disabled={checkingPin || pinCode.length !== 6}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 min-w-[140px]"
            >
              {checkingPin && <Loader2 size={18} className="animate-spin" />}
              Check
            </button>
          </div>

          {checkResult && (
            <div
              className={`mt-6 p-5 rounded-2xl border ${
                checkResult.isServiceable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {checkResult.isServiceable ? (
                  <CheckCircle className="text-emerald-600 shrink-0" size={24} />
                ) : (
                  <XCircle className="text-red-600 shrink-0" size={24} />
                )}
                <h3 className="text-lg font-semibold text-slate-800">
                  {checkResult.isServiceable ? "Serviceable" : "Not serviceable"}
                </h3>
              </div>
              {checkResult.deliveryOptions?.length > 0 ? (
                <div className="space-y-3">
                  {checkResult.deliveryOptions.map((opt) => (
                    <div key={opt._id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-900">{opt.deliveryType}</p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {opt.deliveryDuration?.min}–{opt.deliveryDuration?.max}{" "}
                            {opt.deliveryDuration?.unit?.toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">₹{opt.deliveryCharge ?? 0}</p>
                          {opt.discount?.value > 0 && (
                            <p className="text-sm text-emerald-600">
                              {(opt.discount.type === "PERCENT" || opt.discount.type === "PERCENTAGE")
                                ? `${opt.discount.value}% off`
                                : `Flat ₹${opt.discount.value} off`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm">No delivery options for this pincode.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
