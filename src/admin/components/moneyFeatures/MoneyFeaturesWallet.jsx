import React, { useCallback, useEffect, useState } from "react";
import {
  getWalletOverview,
  getCashWallets,
  getCashTransactions,
  getRewardWallets,
  getRewardTransactions,
} from "../../apis/MoneyFeaturesapi";
import { RefreshCw, Wallet, Coins, ArrowLeftRight } from "lucide-react";

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

function Pagination({ page, totalPages, onPage, disabled }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-sm">
      <span className="text-gray-600">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
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

  const cashSources = overview?.last30Days?.cashTransactions ?? [];
  const rewardTypes = overview?.last30Days?.rewardTransactions ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" />
            Cash wallet
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            INR balance, recharges, order payments, refunds, and reward redemptions to cash.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadOverview();
            loadTab(1);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && !overview ? (
        <p className="text-gray-500">Loading overview…</p>
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {(cashSources.length > 0 || rewardTypes.length > 0) && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Cash activity (30 days)</h3>
            <ul className="text-xs space-y-1 text-gray-600">
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
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
              <Coins size={14} /> Reward points activity (30 days)
            </h3>
            <ul className="text-xs space-y-1 text-gray-600">
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

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-gray-100 p-2 bg-gray-50">
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
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === key ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          {(tab === "cash-wallets" || tab === "reward-wallets") && (
            <input
              type="search"
              placeholder="Search name, phone, email, user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[220px]"
            />
          )}
          {tab === "cash-tx" && (
            <>
              <select
                value={txSource}
                onChange={(e) => setTxSource(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>

        <div className="overflow-x-auto">
          {listLoading ? (
            <p className="p-8 text-center text-gray-500">Loading…</p>
          ) : tab === "cash-wallets" ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashWallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{row.userPhone || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{fmtInr(row.balance)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "cash-tx" ? (
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Balance after</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashTx.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{row.userName || row.userPhone || "—"}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{row.transaction_source || "—"}</td>
                    <td className="px-3 py-2 font-medium">{fmtInr(row.amount)}</td>
                    <td className="px-3 py-2">{fmtInr(row.balance_after_transaction)}</td>
                    <td className="px-3 py-2">{row.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "reward-wallets" ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Coins (points)</th>
                  <th className="px-3 py-2">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewardWallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2">{row.userPhone || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-indigo-700">
                      {Number(row.points_balance ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Points</th>
                  <th className="px-3 py-2">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewardTx.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{row.source || "—"}</td>
                    <td className="px-3 py-2 font-medium">{row.points}</td>
                    <td className="px-3 py-2">{row.points_balance_after}</td>
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

      <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
        <ArrowLeftRight size={12} />
        Users redeem coins to cash wallet via app; configure slabs and redemption under Redeem coins.
      </p>
    </div>
  );
};

export default MoneyFeaturesWallet;
