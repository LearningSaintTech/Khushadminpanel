import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getInfluencerCoupons,
  attachCouponToInfluencer,
  detachCouponFromInfluencer,
  getInfluencerCouponHistory,
  getInfluencerAnalytics,
} from "../../apis/influrncerCouponapi";
import { getCoupons } from "../../apis/Couponapi";
import {
  ArrowLeft,
  Plus,
  Unlink,
  Link2,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  btnOutline,
  btnPrimary,
  FormSection,
  formPageWrap,
  formToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
  inputClass,
} from "./influencerShared";

const PAGE_SIZE = 10;
const ATTACH_PAGE_SIZE = 8;

function PaginationBar({ page, totalPages, onPage, disabled }) {
  const total = Math.max(1, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-2 py-2">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className={btnOutline}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
      </button>
      <span className="text-[11px] text-stone-600">
        Page {page} / {total}
      </span>
      <button
        type="button"
        disabled={disabled || page >= total}
        onClick={() => onPage(page + 1)}
        className={btnOutline}
      >
        Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

const InfluencerCouponManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("influencer/coupons"));
  };

  const [attachedCoupons, setAttachedCoupons] = useState([]);
  const [allCoupons, setAllCoupons] = useState([]);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [couponSearch, setCouponSearch] = useState("");
  const [attachBusyId, setAttachBusyId] = useState("");
  const [detachBusyId, setDetachBusyId] = useState("");
  const [attachedPage, setAttachedPage] = useState(1);
  const [attachedTotal, setAttachedTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [attachListPage, setAttachListPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [attachedRes, historyRes, analyticsRes, allCouponsRes] = await Promise.all([
          getInfluencerCoupons(id, attachedPage, PAGE_SIZE),
          getInfluencerCouponHistory(id, historyPage, PAGE_SIZE),
          getInfluencerAnalytics(id),
          getCoupons(1, 300, "", "true"),
        ]);
        setAttachedCoupons(attachedRes?.data?.coupons || []);
        setAttachedTotal(attachedRes?.data?.total || 0);
        setHistory(historyRes?.data?.usages || []);
        setHistoryTotal(historyRes?.data?.total || 0);
        setAnalytics(analyticsRes?.data);
        setAllCoupons(allCouponsRes?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, attachedPage, historyPage]);

  const handleAttach = async (couponId) => {
    try {
      setAttachBusyId(couponId);
      await attachCouponToInfluencer(couponId, id);
      setShowAttach(false);
      setCouponSearch("");
      setAttachListPage(1);
      const res = await getInfluencerCoupons(id, 1, PAGE_SIZE);
      setAttachedCoupons(res?.data?.coupons || []);
      setAttachedTotal(res?.data?.total || 0);
      setAttachedPage(1);
    } catch (err) {
      alert("Failed to attach: " + (err?.response?.data?.message || "Error"));
    } finally {
      setAttachBusyId("");
    }
  };

  const handleDetach = async (couponId) => {
    if (!window.confirm("Really detach this coupon?")) return;
    try {
      setDetachBusyId(couponId);
      await detachCouponFromInfluencer(couponId, id);
      setAttachedCoupons((prev) => prev.filter((c) => (c._id || c.couponId) !== couponId));
    } catch {
      alert("Detach failed");
    } finally {
      setDetachBusyId("");
    }
  };

  const availableCoupons = allCoupons.filter(
    (c) =>
      c.isInfluencer === true &&
      !attachedCoupons.some((ac) => (ac._id || ac.couponId) === c._id) &&
      (!c.influencerId || c.influencerId === id) &&
      (c.code?.toLowerCase().includes(couponSearch.toLowerCase()) ||
        c.description?.toLowerCase().includes(couponSearch.toLowerCase())),
  );

  const attachListTotalPages = Math.ceil(availableCoupons.length / ATTACH_PAGE_SIZE) || 1;
  const paginatedAvailable = availableCoupons.slice(
    (attachListPage - 1) * ATTACH_PAGE_SIZE,
    attachListPage * ATTACH_PAGE_SIZE,
  );

  const attachedTotalPages = Math.ceil(attachedTotal / PAGE_SIZE) || 1;
  const historyTotalPages = Math.ceil(historyTotal / PAGE_SIZE) || 1;

  if (loading) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto text-base font-bold sm:text-lg">Coupon management</h1>
        </div>
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          Coupon management
        </h1>
        <button type="button" onClick={() => navigate(ap("influencer/coupons"))} className={btnOutline}>
          All influencers
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAttach((s) => !s);
            if (!showAttach) setAttachListPage(1);
          }}
          className={showAttach ? btnOutline : btnPrimary}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {showAttach ? "Hide attach" : "Attach"}
        </button>
      </div>

      {analytics ? (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:max-w-md">
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Redemptions
            </p>
            <p className="mt-0.5 text-base font-bold text-stone-900">{analytics.totalUsage ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Discount given
            </p>
            <p className="mt-0.5 text-base font-bold text-success">
              ₹{(analytics.totalDiscount ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      ) : null}

      <FormSection
        title={`Attached coupons (${attachedTotal || attachedCoupons.length})`}
        hint="Coupons linked to this influencer"
      >
        {attachedCoupons.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-stone-500">No coupons attached yet.</p>
        ) : (
          <>
            <div className={tableScrollShell}>
              <table className="min-w-[720px] w-full text-[11px]">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className={`${thClass} w-10`}>#</th>
                    <th className={thClass}>Code</th>
                    <th className={thClass}>Description</th>
                    <th className={thClass}>Discount</th>
                    <th className={`${thClass} text-center`}>Status</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attachedCoupons.map((c, idx) => {
                    const code = c.code || c.coupon?.code;
                    const description = c.description || c.coupon?.description;
                    const discountType = c.discountType || c.coupon?.discountType;
                    const discountValue = c.discountValue || c.coupon?.discountValue;
                    const active = c.isActive ?? c.coupon?.isActive ?? true;
                    const couponId = c._id || c.couponId;
                    return (
                      <tr key={couponId} className="hover:bg-canvas-muted/50">
                        <td className="px-2 py-2 text-[10px] text-stone-500">
                          {(attachedPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-2 py-2 font-semibold text-brand-700">{code}</td>
                        <td className="max-w-xs truncate px-2 py-2 text-stone-700">
                          {description || "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                          {discountType === "PERCENT"
                            ? `${discountValue}% off`
                            : `₹${discountValue}`}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              active ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDetach(couponId)}
                            disabled={detachBusyId === couponId}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-bg px-2 py-1 text-[10px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                          >
                            <Unlink className="h-3 w-3" aria-hidden />
                            {detachBusyId === couponId ? "…" : "Detach"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={attachedPage}
              totalPages={attachedTotalPages}
              onPage={setAttachedPage}
            />
          </>
        )}
      </FormSection>

      {showAttach ? (
        <FormSection title="Attach coupon" hint={`${availableCoupons.length} available`}>
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search code or description…"
              value={couponSearch}
              onChange={(e) => {
                setCouponSearch(e.target.value);
                setAttachListPage(1);
              }}
              className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {paginatedAvailable.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-stone-500">No matching coupons.</p>
            ) : (
              paginatedAvailable.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-canvas-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900">{c.code}</p>
                    <p className="truncate text-[10px] text-stone-500">{c.description || "—"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAttach(c._id)}
                    disabled={attachBusyId === c._id}
                    className={btnPrimary}
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    {attachBusyId === c._id ? "…" : "Attach"}
                  </button>
                </div>
              ))
            )}
          </div>
          {attachListTotalPages > 1 ? (
            <PaginationBar
              page={attachListPage}
              totalPages={attachListTotalPages}
              onPage={setAttachListPage}
            />
          ) : null}
        </FormSection>
      ) : null}

      <FormSection title="Usage history" hint="Redemptions using this influencer's coupons">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-stone-500">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Recent coupon usage
        </div>
        {history.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-stone-500">No usage recorded yet.</p>
        ) : (
          <>
            <div className={tableScrollShell}>
              <table className="min-w-[720px] w-full text-[11px]">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Coupon</th>
                    <th className={`${thClass} text-right`}>Discount</th>
                    <th className={`${thClass} text-right`}>Used at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((u, i) => (
                    <tr key={i} className="hover:bg-canvas-muted/50">
                      <td className="px-2 py-2 font-medium text-stone-900">#{u.orderId}</td>
                      <td className="px-2 py-2">
                        <p className="text-stone-800">{u.userName}</p>
                        <p className="text-[10px] text-stone-500">{u.phoneNumber}</p>
                      </td>
                      <td className="px-2 py-2 text-stone-700">{u.couponCode}</td>
                      <td className="px-2 py-2 text-right font-medium text-success">
                        ₹{Number(u.discountAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-stone-500">
                        {new Date(u.usedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={historyPage}
              totalPages={historyTotalPages}
              onPage={setHistoryPage}
            />
          </>
        )}
      </FormSection>
    </div>
  );
};

export default InfluencerCouponManage;
