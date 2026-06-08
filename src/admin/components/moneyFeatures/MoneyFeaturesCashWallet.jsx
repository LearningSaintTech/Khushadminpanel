import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ArrowLeftRight,
  Pencil,
  Plus,
  Minus,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getWalletOverview,
  getCashWallets,
  getCashTransactions,
  adjustWallet,
} from "../../apis/MoneyFeaturesapi";
import {
  PageHeader,
  StatCard,
  Pagination,
  FlowStep,
  inputClass,
  tableScrollShell,
} from "./moneyFeaturesShared";
import { exportCashTransactions } from "./walletTransactionExport";

const CASH_FLOW = [
  {
    n: 1,
    title: "Add money",
    body: "Customer recharges via Razorpay → balance credited.",
    apis: ["POST /wallet/recharge/create-order", "POST /wallet/recharge/verify"],
  },
  {
    n: 2,
    title: "Pay order",
    body: "Checkout can apply wallet → DEBIT ORDER_PAYMENT.",
    apis: ["Cart useWallet=true", "Order confirm"],
  },
  {
    n: 3,
    title: "Credits in",
    body: "Refunds, referral, admin adjustment, points redeem.",
    apis: ["REFUND · REFERRAL · ADMIN_ADJUSTMENT · REWARD_REDEEM"],
  },
];

const DEFAULT_REASON = "Manual adjustment by admin";

function WalletInlineAdjustPanel({
  row,
  fmtInr,
  onClose,
  onSuccess,
}) {
  const [action, setAction] = useState("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const current = Number(row.balance || 0);
  const delta = Number(amount);
  const projected =
    Number.isFinite(delta) && delta > 0
      ? action === "credit"
        ? current + delta
        : Math.max(0, current - delta)
      : null;

  const handleApply = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!reason?.trim()) {
      setError("Reason is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    const payload = {
      userId: String(row.userId),
      walletType: "cash",
      action,
      amount: amt,
      reason: reason.trim(),
    };

    try {
      console.log("Wallet adjust payload:", payload);
      const res = await adjustWallet(payload);
      const data = res?.data ?? res;
      console.log("Wallet adjust response:", data);
      onSuccess({
        userId: String(row.userId),
        newBalance: data?.newBalance,
        previousBalance: data?.previousBalance,
        action: data?.action || action,
        message: res?.message || "Updated",
      });
      onClose();
    } catch (err) {
      console.error("Wallet adjust failed:", err);
      setError(err?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-brand-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-600">
          <span className="font-medium text-slate-900">{row.userName || "Customer"}</span>
          {row.userPhone && <span className="ml-2 text-slate-500">{row.userPhone}</span>}
          <span className="ml-2 tabular-nums font-semibold text-slate-800">
            {fmtInr(current)}
          </span>
          {projected != null && (
            <span className="ml-1 tabular-nums text-indigo-600">→ {fmtInr(projected)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <p className="mb-2 flex items-center gap-1 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            title="Credit (add cashback)"
            onClick={() => setAction("credit")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              action === "credit"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-emerald-700"
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            title="Debit (reduce balance)"
            onClick={() => setAction("debit")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              action === "debit"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-rose-700"
            }`}
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="min-w-[100px] flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Amount (₹)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            autoFocus
            className={`${inputClass} w-full tabular-nums`}
          />
        </div>

        <div className="min-w-[160px] flex-[2]">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={DEFAULT_REASON}
            className={`${inputClass} w-full`}
          />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleApply}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-brand-600 px-3 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          Apply
        </button>
      </div>
    </div>
  );
}

const MoneyFeaturesCashWallet = () => {
  const basePath = useAdminPanelBasePath();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("wallets");
  const [wallets, setWallets] = useState({ items: [], page: 1, totalPages: 1 });
  const [tx, setTx] = useState({ items: [], page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [txSource, setTxSource] = useState("");
  const [txType, setTxType] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [showFlow, setShowFlow] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const fmtInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWalletOverview();
      setOverview(res?.data ?? res);
    } catch (e) {
      console.error(e);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(
    async (page = 1) => {
      setListLoading(true);
      try {
        if (tab === "wallets") {
          const res = await getCashWallets(page, 20, search);
          const d = res?.data ?? res;
          setWallets({
            items: d?.items ?? [],
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 1,
          });
        } else {
          const res = await getCashTransactions(page, 25, {
            source: txSource,
            type: txType,
          });
          const d = res?.data ?? res;
          setTx({
            items: d?.items ?? [],
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 1,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setListLoading(false);
      }
    },
    [tab, search, txSource, txType],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTab(1);
  }, [tab, loadTab]);

  const toggleEditRow = (row) => {
    const uid = String(row.userId || "");
    setEditingUserId((prev) => (prev === uid ? null : uid));
  };

  const handleDownloadTransactions = async () => {
    setExporting(true);
    setExportError("");
    try {
      const { filename, count } = await exportCashTransactions({
        source: txSource,
        type: txType,
      });
      setFlashMessage({
        message: `Downloaded ${count} transaction${count === 1 ? "" : "s"} as ${filename}`,
        previousBalance: null,
        newBalance: null,
        action: "export",
      });
      setTimeout(() => setFlashMessage(null), 5000);
    } catch (err) {
      setExportError(err?.message || "Failed to export transactions");
    } finally {
      setExporting(false);
    }
  };

  const handleInlineSuccess = (result) => {
    setFlashMessage(result);
    setWallets((prev) => ({
      ...prev,
      items: prev.items.map((w) =>
        String(w.userId) === result.userId
          ? { ...w, balance: result.newBalance ?? w.balance }
          : w,
      ),
    }));
    loadOverview();
    setTimeout(() => setFlashMessage(null), 5000);
  };

  const cash30 = overview?.last30Days?.cashTransactions ?? [];
  const redeem30 = overview?.last30Days?.pointsRedeemedToCash ?? 0;

  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  return (
    <div className="text-stone-900">
      <p className="mb-2 text-[11px] text-stone-500">
        <Link to={ap("money-features")} className="font-medium text-brand-600 hover:underline">
          ← Money features
        </Link>
      </p>

      <PageHeader
        icon={Wallet}
        title="Cash wallet"
        subtitle="Manage INR balances. Use the pencil icon on a row to credit or debit."
        onRefresh={() => {
          loadOverview();
          loadTab(tab === "wallets" ? wallets.page : tx.page);
        }}
        loading={loading}
        accentClass="text-brand-600"
      />

      {flashMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>
            {flashMessage.action === "export"
              ? flashMessage.message
              : `${flashMessage.message} — ${fmtInr(flashMessage.previousBalance)} → ${fmtInr(flashMessage.newBalance)} (${flashMessage.action})`}
          </span>
        </div>
      )}

      {exportError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}

      {overview && (
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          <StatCard
            label="Total INR balance"
            value={fmtInr(overview.cash?.totalBalanceInr)}
            sub={`${overview.cash?.walletsWithBalance ?? 0} users with balance`}
            accent="brand"
          />
          <StatCard
            label="Wallets"
            value={overview.cash?.totalWallets ?? 0}
            accent="brand"
          />
          <StatCard
            label="Points → cash (30d)"
            value={redeem30}
            sub="REWARD_REDEEM count"
            accent="brand"
          />
          <StatCard
            label="Avg balance"
            value={fmtInr(overview.cash?.averageBalanceInr)}
            accent="brand"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowFlow((v) => !v)}
        className="mb-2 text-[11px] font-medium text-brand-600 hover:underline"
      >
        {showFlow ? "Hide" : "Show"} how cash wallet works
      </button>
      {showFlow && (
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {CASH_FLOW.map((s) => (
            <FlowStep key={s.n} {...s} />
          ))}
        </div>
      )}

      {cash30.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-800">
            Transaction sources (30 days)
          </h3>
          <ul className="space-y-1 text-[11px] text-slate-600">
            {cash30.map((row, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {row._id?.type} · {row._id?.source || "—"}
                </span>
                <span className="tabular-nums">
                  {row.count} · {fmtInr(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex gap-1 border-b border-border bg-canvas-muted/50 p-1.5">
          {[
            ["wallets", "User balances"],
            ["tx", "Transactions"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setEditingUserId(null);
              }}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                tab === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-border p-2">
          {tab === "wallets" && (
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Search customer
              </label>
              <input
                type="search"
                placeholder="Name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTab(1)}
                className={`${inputClass} w-full`}
              />
            </div>
          )}
          {tab === "tx" && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Source
                </label>
                <select
                  value={txSource}
                  onChange={(e) => setTxSource(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All sources</option>
                  <option value="RECHARGE">Recharge</option>
                  <option value="ORDER_PAYMENT">Order payment</option>
                  <option value="REFUND">Refund</option>
                  <option value="REWARD_REDEEM">Points redeem</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="ADMIN_ADJUSTMENT">Admin adjustment</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Type
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All</option>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </select>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => loadTab(1)}
            className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
          >
            Apply filters
          </button>
          {tab === "tx" && (
            <button
              type="button"
              disabled={exporting || listLoading}
              onClick={handleDownloadTransactions}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Download all matching transactions as CSV"
            >
              {exporting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
              ) : (
                <Download size={14} />
              )}
              {exporting ? "Exporting…" : "Download CSV"}
            </button>
          )}
        </div>

        <div className={tableScrollShell}>
          {listLoading ? (
            <p className="p-8 text-center text-[11px] text-stone-500">Loading…</p>
          ) : tab === "wallets" ? (
            <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2">User ID</th>
                  <th className="w-12 px-2 py-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallets.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No wallets found
                    </td>
                  </tr>
                ) : (
                  wallets.items.map((row) => {
                    const uid = String(row.userId || "");
                    const isEditing = editingUserId === uid;
                    return (
                      <React.Fragment key={String(row._id)}>
                        <tr
                          className={`border-t border-border/80 hover:bg-brand-50/30 ${isEditing ? "bg-brand-50/50" : ""}`}
                        >
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {row.userName || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{row.userPhone || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {fmtInr(row.balance)}
                          </td>
                          <td
                            className="max-w-[140px] truncate px-3 py-2 font-mono text-[10px] text-slate-500"
                            title={uid}
                          >
                            {uid}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleEditRow(row)}
                              title={isEditing ? "Close" : "Edit balance"}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                                isEditing
                                  ? "border-brand-300 bg-brand-100 text-brand-700"
                                  : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                              }`}
                            >
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                        {isEditing && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50/80 px-3 pb-3 pt-0">
                              <WalletInlineAdjustPanel
                                row={row}
                                fmtInr={fmtInr}
                                onClose={() => setEditingUserId(null)}
                                onSuccess={handleInlineSuccess}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Credited</th>
                  <th className="px-3 py-2 text-right">After</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tx.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No transactions
                    </td>
                  </tr>
                ) : (
                  tx.items.map((row) => (
                    <tr key={String(row._id)} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{row.userName || row.userPhone || "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.type === "CREDIT"
                              ? "font-medium text-emerald-700"
                              : "font-medium text-rose-700"
                          }
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.transaction_source === "ADMIN_ADJUSTMENT"
                              ? "font-medium text-indigo-700"
                              : row.transaction_source === "REWARD_REDEEM"
                                ? "text-violet-700"
                                : ""
                          }
                        >
                          {row.transaction_source || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {fmtInr(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-emerald-700">
                        {fmtInr(
                          row.credited_amount != null
                            ? row.credited_amount
                            : row.type === "CREDIT"
                              ? row.amount
                              : 0,
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {fmtInr(row.balance_after_transaction)}
                      </td>
                      <td className="px-3 py-2">{row.status || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          page={tab === "wallets" ? wallets.page : tx.page}
          totalPages={tab === "wallets" ? wallets.totalPages : tx.totalPages}
          onPage={loadTab}
          disabled={listLoading}
        />
      </div>

      <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
        <ArrowLeftRight size={12} />
        Click <Pencil size={11} className="inline" /> to add or remove balance.{" "}
        <Link
          to={ap("money-features/points-wallet")}
          className="text-brand-600 hover:underline"
        >
          Points wallet
        </Link>
      </p>
    </div>
  );
};

export default MoneyFeaturesCashWallet;
