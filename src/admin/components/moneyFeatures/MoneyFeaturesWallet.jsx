import React, { useCallback, useEffect, useState } from "react";
import {
  getWalletOverview,
  getCashWallets,
  getCashTransactions,
  getRewardWallets,
  getRewardTransactions,
} from "../../apis/MoneyFeaturesapi";
import { RefreshCw, Wallet, Coins, ArrowLeftRight, Download, AlertCircle } from "lucide-react";
import {
  exportCashTransactions,
  exportRewardTransactions,
} from "./walletTransactionExport";

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Pagination({ page, totalPages, onPage, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <span className="text-slate-600">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const MoneyFeaturesWallet = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("cash-wallets");

  const [cashWallets, setCashWallets] = useState({ items: [], page: 1, totalPages: 1 });
  const [cashTx, setCashTx] = useState({ items: [], page: 1, totalPages: 1 });
  const [rewardWallets, setRewardWallets] = useState({ items: [], page: 1, totalPages: 1 });
  const [rewardTx, setRewardTx] = useState({ items: [], page: 1, totalPages: 1 });

  const [search, setSearch] = useState("");
  const [txSource, setTxSource] = useState("");
  const [txType, setTxType] = useState("");
  const [rewardTxType, setRewardTxType] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

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
        if (tab === "cash-wallets") {
          const res = await getCashWallets(page, 20, search);
          const d = res?.data ?? res;
          setCashWallets({
            items: d?.items ?? [],
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 1,
          });
        } else if (tab === "cash-tx") {
          const res = await getCashTransactions(page, 25, {
            source: txSource,
            type: txType,
          });
          const d = res?.data ?? res;
          setCashTx({
            items: d?.items ?? [],
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 1,
          });
        } else if (tab === "reward-wallets") {
          const res = await getRewardWallets(page, 20, search);
          const d = res?.data ?? res;
          setRewardWallets({
            items: d?.items ?? [],
            page: d?.page ?? 1,
            totalPages: d?.totalPages ?? 1,
          });
        } else if (tab === "reward-tx") {
          const res = await getRewardTransactions(page, 25, { type: rewardTxType });
          const d = res?.data ?? res;
          setRewardTx({
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
    [tab, search, txSource, txType, rewardTxType],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTab(1);
  }, [tab, loadTab]);

  const fmtInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const handleDownloadTransactions = async () => {
    setExporting(true);
    setExportError("");
    setExportMessage("");
    try {
      if (tab === "cash-tx") {
        const { filename, count } = await exportCashTransactions({
          source: txSource,
          type: txType,
        });
        setExportMessage(
          `Downloaded ${count} cash transaction${count === 1 ? "" : "s"} as ${filename}`,
        );
      } else if (tab === "reward-tx") {
        const { filename, count } = await exportRewardTransactions({
          type: rewardTxType,
        });
        setExportMessage(
          `Downloaded ${count} coin transaction${count === 1 ? "" : "s"} as ${filename}`,
        );
      }
      setTimeout(() => setExportMessage(""), 5000);
    } catch (err) {
      setExportError(err?.message || "Failed to export transactions");
    } finally {
      setExporting(false);
    }
  };

  const cashSources = overview?.last30Days?.cashTransactions ?? [];
  const rewardTypes = overview?.last30Days?.rewardTransactions ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-3 pb-4 pt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
            <Wallet className="h-4 w-4 text-indigo-600" />
            Wallets & coins
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            INR wallets + reward points balances and transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadOverview();
            loadTab(1);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && !overview ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm">
          Loading overview…
        </div>
      ) : overview ? (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          <StatCard
            label="Total cash in wallets"
            value={fmtInr(overview.cash?.totalBalanceInr)}
            sub={`${overview.cash?.walletsWithBalance ?? 0} with balance · ${overview.cash?.totalWallets ?? 0} total`}
          />
          <StatCard
            label="Reward points (coins)"
            value={Number(overview.reward?.totalPoints ?? 0).toLocaleString("en-IN")}
            sub={`${overview.reward?.walletsWithPoints ?? 0} users with points`}
          />
          <StatCard
            label="Redeems to cash (30d)"
            value={overview.last30Days?.pointsRedeemedToCash ?? 0}
            sub="Points → wallet conversions"
          />
          <StatCard
            label="Redemption rate"
            value={
              overview.redemptionPolicy?.pointValueInCurrency != null
                ? `₹${overview.redemptionPolicy.pointValueInCurrency} / point`
                : "—"
            }
            sub={
              overview.redemptionPolicy?.minPointsRequired != null
                ? `Min ${overview.redemptionPolicy.minPointsRequired} points`
                : "Set in reward rules"
            }
          />
        </div>
      ) : null}

      {exportMessage && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {exportMessage}
        </div>
      )}

      {exportError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}

      {(cashSources.length > 0 || rewardTypes.length > 0) && (
        <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Cash activity (30 days)</h3>
            <ul className="space-y-1 text-[11px] text-slate-600">
              {cashSources.map((row, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {row._id?.type} · {row._id?.source || "—"}
                  </span>
                  <span>
                    {row.count} tx · {fmtInr(row.amount)}
                  </span>
                </li>
              ))}
              {cashSources.length === 0 && <li>—</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-800">
              <Coins size={14} /> Reward points activity (30 days)
            </h3>
            <ul className="space-y-1 text-[11px] text-slate-600">
              {rewardTypes.map((row, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {row._id?.type} · {row._id?.source || "—"}
                  </span>
                  <span>
                    {row.count} · {row.points} pts
                  </span>
                </li>
              ))}
              {rewardTypes.length === 0 && <li>—</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-1.5 bg-slate-50/80">
          {[
            ["cash-wallets", "Cash wallets"],
            ["cash-tx", "Cash transactions"],
            ["reward-wallets", "Coin balances"],
            ["reward-tx", "Coin transactions"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 p-3 border-b border-slate-100">
          {(tab === "cash-wallets" || tab === "reward-wallets") && (
            <input
              type="search"
              placeholder="Search name, phone, email, user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          )}
          {tab === "cash-tx" && (
            <>
              <select
                value={txSource}
                onChange={(e) => setTxSource(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              >
                <option value="">All sources</option>
                <option value="RECHARGE">Recharge</option>
                <option value="ORDER_PAYMENT">Order payment</option>
                <option value="REFUND">Refund</option>
                <option value="REWARD_REDEEM">Reward redeem</option>
                <option value="REFERRAL">Referral</option>
                <option value="ADMIN_ADJUSTMENT">Admin adjustment</option>
              </select>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              >
                <option value="">Credit & debit</option>
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
            </>
          )}
          {tab === "reward-tx" && (
            <select
              value={rewardTxType}
              onChange={(e) => setRewardTxType(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">All types</option>
              <option value="EARN">Earn</option>
              <option value="REDEEM">Redeem</option>
              <option value="BONUS">Bonus</option>
              <option value="REVERSAL">Reversal</option>
              <option value="EXPIRE">Expire</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => loadTab(1)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Apply
          </button>
          {(tab === "cash-tx" || tab === "reward-tx") && (
            <button
              type="button"
              disabled={exporting || listLoading}
              onClick={handleDownloadTransactions}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Download all matching transactions as CSV"
            >
              {exporting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
              ) : (
                <Download size={14} />
              )}
              {exporting ? "Exporting…" : "Download CSV"}
            </button>
          )}
        </div>

        <div className="max-h-[66vh] overflow-auto">
          {listLoading ? (
            <p className="p-8 text-center text-xs text-slate-500">Loading…</p>
          ) : tab === "cash-wallets" ? (
            <table className="w-full min-w-[820px] text-[11px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Phone</th>
                  <th className="px-2.5 py-1.5">Balance</th>
                  <th className="px-2.5 py-1.5">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashWallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-slate-50/80">
                    <td className="px-2.5 py-1.5">{row.userName || "—"}</td>
                    <td className="px-2.5 py-1.5 tabular-nums">{row.userPhone || "—"}</td>
                    <td className="px-2.5 py-1.5 font-semibold tabular-nums">{fmtInr(row.balance)}</td>
                    <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "cash-tx" ? (
            <table className="w-full min-w-[980px] text-[11px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-1.5">Date</th>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Type</th>
                  <th className="px-2.5 py-1.5">Source</th>
                  <th className="px-2.5 py-1.5">Amount</th>
                  <th className="px-2.5 py-1.5">Credited</th>
                  <th className="px-2.5 py-1.5">After</th>
                  <th className="px-2.5 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashTx.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-slate-50/80">
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-[10px] text-slate-600">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-2.5 py-1.5">{row.userName || row.userPhone || "—"}</td>
                    <td className="px-2.5 py-1.5">{row.type}</td>
                    <td className="px-2.5 py-1.5">{row.transaction_source || "—"}</td>
                    <td className="px-2.5 py-1.5 font-medium tabular-nums">{fmtInr(row.amount)}</td>
                    <td className="px-2.5 py-1.5 font-medium tabular-nums text-emerald-700">
                      {fmtInr(
                        row.credited_amount != null
                          ? row.credited_amount
                          : row.type === "CREDIT"
                            ? row.amount
                            : 0,
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 tabular-nums text-slate-600">{fmtInr(row.balance_after_transaction)}</td>
                    <td className="px-2.5 py-1.5">{row.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "reward-wallets" ? (
            <table className="w-full min-w-[820px] text-[11px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Phone</th>
                  <th className="px-2.5 py-1.5">Coins</th>
                  <th className="px-2.5 py-1.5">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewardWallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-slate-50/80">
                    <td className="px-2.5 py-1.5">{row.userName || "—"}</td>
                    <td className="px-2.5 py-1.5">{row.userPhone || "—"}</td>
                    <td className="px-2.5 py-1.5 font-semibold text-indigo-700 tabular-nums">
                      {Number(row.points_balance ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[900px] text-[11px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-1.5">Date</th>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Type</th>
                  <th className="px-2.5 py-1.5">Source</th>
                  <th className="px-2.5 py-1.5">Points</th>
                  <th className="px-2.5 py-1.5">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewardTx.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-slate-50/80">
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-[10px] text-slate-600">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-2.5 py-1.5">{row.userName || "—"}</td>
                    <td className="px-2.5 py-1.5">{row.type}</td>
                    <td className="px-2.5 py-1.5">{row.source || "—"}</td>
                    <td className="px-2.5 py-1.5 font-medium tabular-nums">{row.points}</td>
                    <td className="px-2.5 py-1.5 tabular-nums text-slate-600">{row.points_balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          page={
            tab === "cash-wallets"
              ? cashWallets.page
              : tab === "cash-tx"
                ? cashTx.page
                : tab === "reward-wallets"
                  ? rewardWallets.page
                  : rewardTx.page
          }
          totalPages={
            tab === "cash-wallets"
              ? cashWallets.totalPages
              : tab === "cash-tx"
                ? cashTx.totalPages
                : tab === "reward-wallets"
                  ? rewardWallets.totalPages
                  : rewardTx.totalPages
          }
          onPage={loadTab}
          disabled={listLoading}
        />
      </div>

      <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
        <ArrowLeftRight size={12} />
        Users redeem coins to cash wallet via app; configure slabs and redemption under Redeem coins.
      </p>
      </div>
    </div>
  );
};

export default MoneyFeaturesWallet;
