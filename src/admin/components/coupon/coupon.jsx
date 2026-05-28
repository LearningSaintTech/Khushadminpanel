import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCoupons, toggleCouponStatus } from "../../apis/Couponapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  Plus,
  Edit,
  Eye,
  Loader2,
  Search,
  X,
  Ticket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
    blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${tones[tone] || tones.slate}`}
    >
      {children}
    </span>
  );
};

const CouponPage = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [influencerFilter, setInfluencerFilter] = useState("all");
  const [autoIncludedFilter, setAutoIncludedFilter] = useState("all");
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, influencerFilter, autoIncludedFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [currentPage, debouncedSearchTerm, influencerFilter, autoIncludedFilter]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      let isInfluencerParam;
      if (influencerFilter === "influencer") isInfluencerParam = "true";
      else if (influencerFilter === "normal") isInfluencerParam = "false";
      else isInfluencerParam = undefined;

      let isAutoIncludedParam;
      if (autoIncludedFilter === "auto") isAutoIncludedParam = "true";
      else if (autoIncludedFilter === "manual") isAutoIncludedParam = "false";
      else isAutoIncludedParam = undefined;

      const response = await getCoupons(
        currentPage,
        limit,
        debouncedSearchTerm,
        isInfluencerParam,
        isAutoIncludedParam,
      );
      const data = response?.data?.data || response?.data || {};
      const couponsList = Array.isArray(data) ? data : data.coupons || data.data || [];

      setCoupons(couponsList);

      const totalCount = data.total || response?.data?.total || 0;
      const apiTotalPages =
        data.totalPages || data.pages || response?.data?.totalPages || response?.data?.pages;

      let calculatedTotalPages = 1;
      if (apiTotalPages) calculatedTotalPages = apiTotalPages;
      else if (totalCount > 0) calculatedTotalPages = Math.ceil(totalCount / limit);
      else if (couponsList.length === limit && currentPage === 1) calculatedTotalPages = 2;

      setTotalPages(calculatedTotalPages);
    } catch (err) {
      console.error("Fetch coupons error:", err);
      setError("Failed to load coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleCouponStatus(id);
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (err) {
      console.error("Toggle error:", err);
      setError("Failed to update status");
    }
  };

  const formatDiscount = (coupon) =>
    coupon.discountType === "PERCENT"
      ? `${coupon.discountValue}%`
      : `₹${coupon.discountValue}`;

  const inputClass =
    "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition";

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-3 py-2.5 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Ticket className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-900 truncate">
                  Coupons
                </h1>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  Manage discount codes & offers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ap("coupons/create"))}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add coupon
            </button>
          </div>

          <div className="mt-2.5 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by code or description…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-8 pr-8`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={influencerFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setInfluencerFilter(e.target.value);
              }}
              className={`${inputClass} lg:w-44`}
            >
              <option value="all">All types</option>
              <option value="normal">Normal only</option>
              <option value="influencer">Influencer only</option>
            </select>
            <select
              value={autoIncludedFilter}
              onChange={(e) => {
                setCurrentPage(1);
                setAutoIncludedFilter(e.target.value);
              }}
              className={`${inputClass} lg:w-44`}
            >
              <option value="all">All inclusion</option>
              <option value="auto">Auto included</option>
              <option value="manual">Manual apply</option>
            </select>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4">
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading coupons…
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Ticket className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-600">No coupons found</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Try adjusting filters or create a new coupon
            </p>
            <button
              type="button"
              onClick={() => navigate(ap("coupons/create"))}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create coupon
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      {[
                        "Code",
                        "Description",
                        "Discount",
                        "Min cart",
                        "Type",
                        "Include",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h || "actions"}
                          className={`px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ${
                            h === "" ? "text-right" : ""
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map((coupon) => (
                      <tr
                        key={coupon._id}
                        className="group transition-colors hover:bg-indigo-50/30"
                      >
                        <td className="px-2 py-1.5">
                          <span className="font-mono text-[11px] font-semibold text-indigo-700">
                            {coupon.code}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-2 py-1.5">
                          <span
                            className="block truncate text-[11px] text-slate-600"
                            title={coupon.description || ""}
                          >
                            {coupon.description || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11px] font-medium text-slate-800">
                          {formatDiscount(coupon)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-600">
                          {coupon.minCartValue != null ? `₹${coupon.minCartValue}` : "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge tone={coupon.isInfluencer ? "purple" : "slate"}>
                            {coupon.isInfluencer ? "Influencer" : "Normal"}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge tone={coupon.isAutoIncluded ? "blue" : "slate"}>
                            {coupon.isAutoIncluded ? "Auto" : "Manual"}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(coupon._id)}
                            className="rounded transition-opacity hover:opacity-80"
                            title="Toggle status"
                          >
                            <Badge tone={coupon.isActive ? "green" : "red"}>
                              {coupon.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setShowModal(true);
                              }}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(ap(`coupons/edit/${coupon._id}`))}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {coupons.map((coupon) => (
                <article
                  key={coupon._id}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold text-indigo-700 truncate">
                        {coupon.code}
                      </p>
                      {coupon.description && (
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon._id)}
                    >
                      <Badge tone={coupon.isActive ? "green" : "red"}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="indigo">{formatDiscount(coupon)}</Badge>
                    <Badge tone="slate">
                      Min ₹{coupon.minCartValue ?? "—"}
                    </Badge>
                    <Badge tone={coupon.isInfluencer ? "purple" : "slate"}>
                      {coupon.isInfluencer ? "Influencer" : "Normal"}
                    </Badge>
                    <Badge tone={coupon.isAutoIncluded ? "blue" : "slate"}>
                      {coupon.isAutoIncluded ? "Auto" : "Manual"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex justify-end gap-0.5 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setShowModal(true);
                      }}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ap(`coupons/edit/${coupon._id}`))}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    currentPage < totalPages && setCurrentPage(currentPage + 1)
                  }
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Detail modal */}
        {showModal && selectedCoupon && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[2px]"
            onClick={() => setShowModal(false)}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Coupon details
                  </p>
                  <h2 className="truncate font-mono text-sm font-semibold text-indigo-700">
                    {selectedCoupon.code}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-3 py-2.5">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  <div>
                    <dt className="text-[10px] text-slate-400">Status</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isActive ? "green" : "red"}>
                        {selectedCoupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Discount</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {formatDiscount(selectedCoupon)}
                      {selectedCoupon.maxDiscountAmount && (
                        <span className="ml-1 font-normal text-slate-500">
                          (max ₹{selectedCoupon.maxDiscountAmount})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Type</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isInfluencer ? "purple" : "slate"}>
                        {selectedCoupon.isInfluencer ? "Influencer" : "Normal"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Inclusion</dt>
                    <dd className="mt-0.5">
                      <Badge tone={selectedCoupon.isAutoIncluded ? "blue" : "slate"}>
                        {selectedCoupon.isAutoIncluded ? "Auto" : "Manual"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Min cart</dt>
                    <dd className="mt-0.5 text-slate-800">
                      ₹{selectedCoupon.minCartValue ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400">Max cart</dt>
                    <dd className="mt-0.5 text-slate-800">
                      ₹{selectedCoupon.maxCartValue ?? "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-slate-400">Usage</dt>
                    <dd className="mt-0.5 text-slate-700">
                      Total {selectedCoupon.totalUsageLimit || "∞"} · Per user{" "}
                      {selectedCoupon.perUserUsageLimit || "∞"} · Used{" "}
                      {selectedCoupon.usedCount || 0}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-slate-400">Validity</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {selectedCoupon.startDate
                        ? new Date(selectedCoupon.startDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                      {" → "}
                      {selectedCoupon.expiryDate
                        ? new Date(selectedCoupon.expiryDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </dd>
                  </div>
                  {selectedCoupon.description && (
                    <div className="col-span-2">
                      <dt className="text-[10px] text-slate-400">Description</dt>
                      <dd className="mt-0.5 text-slate-700 whitespace-pre-line">
                        {selectedCoupon.description}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] text-slate-400">Applicable on</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {selectedCoupon.applicableOn || "—"}
                    </dd>
                  </div>
                  {selectedCoupon.categories?.length > 0 && (
                    <div>
                      <dt className="text-[10px] text-slate-400">Categories</dt>
                      <dd className="mt-0.5 text-slate-700 truncate">
                        {selectedCoupon.categories.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate(ap(`coupons/edit/${selectedCoupon._id}`));
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CouponPage;
