import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Search,
  Wallet,
  CreditCard,
  HandCoins,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  listRefundRequests,
  processRefundRequest,
  approveRefundRequest,
  markRefundManualComplete,
} from "../api/refundApi.js";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import { useModuleAccess } from "../../../../hooks/useModuleAccess";
import {
  PageToolbar,
  LoadingBlock,
  EmptyBlock,
  PaginationBar,
  tableScrollShell,
  fieldClass,
  labelClass,
  btnPrimary,
  btnOutline,
} from "../../../components/notifications/notificationsShared";

function getErr(err, fallback) {
  return (
    err?.response?.data?.message ||
    (typeof err?.message === "string" ? err.message : null) ||
    fallback
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const map = {
    REQUESTED: "bg-sky-50 text-sky-800 border-sky-200",
    PROCESSING: "bg-amber-50 text-amber-800 border-amber-200",
    COMPLETED: "bg-success-bg text-success border-success/30",
    FAILED: "bg-danger-bg text-danger border-danger/30",
    NEEDS_MANUAL: "bg-violet-50 text-violet-800 border-violet-200",
    CANCELLED: "bg-canvas-muted text-stone-600 border-border",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        map[s] || "bg-canvas-muted text-stone-700 border-border"
      }`}
    >
      {s || "—"}
    </span>
  );
}

function DestIcon({ dest }) {
  const d = String(dest || "").toUpperCase();
  if (d === "RAZORPAY") return <CreditCard size={12} className="text-brand-600" />;
  if (d === "WALLET") return <Wallet size={12} className="text-success" />;
  if (d === "OTHER") return <HandCoins size={12} className="text-violet-600" />;
  return null;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function RefundsPage() {
  const basePath = useAdminPanelBasePath();
  const { canMutate } = useModuleAccess();
  const canAct = canMutate(["refunds"]);
  const ap = useCallback(
    (suffix) =>
      `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/"),
    [basePath]
  );

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [destination, setDestination] = useState("");
  const [orderId, setOrderId] = useState("");
  const [actionId, setActionId] = useState(null);

  const fetchList = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await listRefundRequests({
          page,
          limit: pagination.limit || 20,
          status,
          destination,
          orderId: orderId.trim(),
        });
        const data = res?.data?.data ?? res?.data ?? {};
        setItems(Array.isArray(data.items) ? data.items : []);
        setPagination(
          data.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (err) {
        toast.error(getErr(err, "Failed to load refunds"));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [status, destination, orderId, pagination.limit]
  );

  useEffect(() => {
    fetchList(1);
  }, [status, destination]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => {
    e.preventDefault();
    fetchList(1);
  };

  const approve = async (id) => {
    if (
      !window.confirm(
        "Approve this refund? Razorpay/wallet will process now; other source will wait for Mark done."
      )
    ) {
      return;
    }
    setActionId(id);
    try {
      const res = await approveRefundRequest(id);
      const data = res?.data?.data ?? res?.data ?? {};
      if (data.processed) {
        toast.success(`Approved — refunded via ${data.channel || "channel"}`);
      } else if (data.needsManual) {
        toast.success("Approved — complete other-source payout, then Mark done");
      } else if (data.error) {
        toast.error(`Approved but payout failed: ${data.error}`);
      } else {
        toast.success(res?.data?.message || "Approved");
      }
      await fetchList(pagination.page || 1);
    } catch (err) {
      toast.error(getErr(err, "Approve failed"));
      await fetchList(pagination.page || 1);
    } finally {
      setActionId(null);
    }
  };

  const retryProcess = async (id) => {
    setActionId(id);
    try {
      await processRefundRequest(id, { force: false });
      toast.success("Refund processed");
      await fetchList(pagination.page || 1);
    } catch (err) {
      toast.error(getErr(err, "Process failed"));
      await fetchList(pagination.page || 1);
    } finally {
      setActionId(null);
    }
  };

  const markManual = async (id) => {
    const notes = window.prompt(
      "Optional note for other-source refund (bank transfer, UPI, etc.)"
    );
    if (notes === null) return;
    setActionId(id);
    try {
      await markRefundManualComplete(id, { notes });
      toast.success("Marked completed (other source)");
      await fetchList(pagination.page || 1);
    } catch (err) {
      toast.error(getErr(err, "Update failed"));
    } finally {
      setActionId(null);
    }
  };

  const summary = useMemo(() => {
    const counts = { COMPLETED: 0, FAILED: 0, NEEDS_MANUAL: 0, REQUESTED: 0 };
    for (const row of items) {
      const s = String(row.status || "").toUpperCase();
      if (counts[s] != null) counts[s] += 1;
    }
    return counts;
  }, [items]);

  return (
    <div className="text-stone-900">
      <PageToolbar
        icon={HandCoins}
        title="Refunds"
        subtitle="Support requests land as REQUESTED. Approve for Razorpay/wallet auto-pay, or Other source then Mark done."
      >
        <button
          type="button"
          className={btnOutline}
          onClick={() => fetchList(pagination.page || 1)}
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </PageToolbar>

      {!canAct ? (
        <div className="mb-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-stone-800">
          View-only Refunds — Approve / Mark done are disabled.
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] text-stone-600">
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5">
          Pending: {summary.REQUESTED}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success-bg px-2 py-0.5 text-success">
          <CheckCircle2 size={10} /> Done: {summary.COMPLETED}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5">
          Manual: {summary.NEEDS_MANUAL}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger-bg px-2 py-0.5 text-danger">
          <AlertCircle size={10} /> Failed: {summary.FAILED}
        </span>
      </div>

      <form
        onSubmit={onSearch}
        className="mb-2 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm"
      >
        <div>
          <label className={labelClass}>Order ID</label>
          <input
            className={`${fieldClass} w-44`}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ORD-…"
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={fieldClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="NEEDS_MANUAL">NEEDS_MANUAL</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Destination</label>
          <select
            className={fieldClass}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">All</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="WALLET">Wallet</option>
            <option value="OTHER">Other source</option>
          </select>
        </div>
        <button type="submit" className={btnPrimary}>
          <Search size={12} />
          Search
        </button>
      </form>

      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyBlock message="No refund requests yet. Send one from Support Room → Refund." />
      ) : (
        <div className={tableScrollShell}>
          <table className="w-full min-w-[860px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-2 py-1.5">Created</th>
                <th className="px-2 py-1.5">Order</th>
                <th className="px-2 py-1.5">Amount</th>
                <th className="px-2 py-1.5">Channel</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5">Reason</th>
                <th className="px-2 py-1.5">Refs</th>
                <th className="px-2 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((row) => {
                const dest = row.resolvedDestination || row.destination || "—";
                const st = String(row.status || "").toUpperCase();
                const busy = actionId === String(row._id);
                const canApprove = st === "REQUESTED" || st === "FAILED";
                const canRetry =
                  st === "FAILED" &&
                  ["RAZORPAY", "WALLET"].includes(String(dest).toUpperCase());
                const canManual =
                  String(dest).toUpperCase() === "OTHER" && st === "NEEDS_MANUAL";
                return (
                  <tr key={row._id} className="align-top hover:bg-brand-50/20">
                    <td className="whitespace-nowrap px-2 py-1.5 text-[10px] text-stone-600">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-2 py-1.5">
                      <Link
                        to={ap(
                          `orders?search=${encodeURIComponent(row.orderId || "")}`
                        )}
                        className="font-mono text-[11px] text-brand-700 hover:underline"
                      >
                        {row.orderId}
                      </Link>
                      <div className="mt-0.5 text-[10px] text-stone-400">
                        {row.source || "—"} · pay {row.paymentMode || "—"}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-medium text-stone-900">
                      ₹{Number(row.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700">
                        <DestIcon dest={dest} />
                        {dest}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusBadge status={row.status} />
                      {row.failureReason ? (
                        <p className="mt-1 max-w-[160px] text-[10px] text-danger">
                          {row.failureReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="max-w-[200px] px-2 py-1.5 text-stone-600">
                      <span className="line-clamp-3">{row.reason}</span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-stone-500">
                      {row.razorpayRefundId ? <div>rz: {row.razorpayRefundId}</div> : null}
                      {row.razorpayPaymentId ? <div>pay: {row.razorpayPaymentId}</div> : null}
                      {row.walletTransactionId ? (
                        <div>wallet: …{String(row.walletTransactionId).slice(-8)}</div>
                      ) : null}
                      {!row.razorpayRefundId &&
                      !row.walletTransactionId &&
                      !row.razorpayPaymentId
                        ? "—"
                        : null}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-1">
                        {canApprove ? (
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={busy || !canAct}
                            onClick={() => approve(row._id)}
                          >
                            {busy ? "…" : st === "FAILED" ? "Re-approve" : "Approve"}
                          </button>
                        ) : null}
                        {canRetry ? (
                          <button
                            type="button"
                            className={btnOutline}
                            disabled={busy || !canAct}
                            onClick={() => retryProcess(row._id)}
                          >
                            {busy ? "…" : "Retry"}
                          </button>
                        ) : null}
                        {canManual ? (
                          <button
                            type="button"
                            className={btnOutline}
                            disabled={busy || !canAct}
                            onClick={() => markManual(row._id)}
                          >
                            Mark done
                          </button>
                        ) : null}
                        {!canApprove && !canRetry && !canManual ? (
                          <span className="text-[10px] text-stone-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        disabled={loading}
        onPage={(p) => fetchList(p)}
      />
    </div>
  );
}
