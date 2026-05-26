import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, ArrowLeftRight } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getWalletOverview,
  getCashWallets,
  getCashTransactions,
} from "../../apis/MoneyFeaturesapi";
import { PageHeader, StatCard, Pagination, FlowStep } from "./moneyFeaturesShared";

const CASH_FLOW = [
  {
    n: 1,
    title: "Add money",
    body: "Customer opens Wallet on website → Razorpay recharge → balance credited.",
    apis: ["POST /api/wallet/recharge/create-order", "POST /api/wallet/recharge/verify"],
  },
  {
    n: 2,
    title: "Pay order (online)",
    body: "At checkout (Razorpay/Nimble), user can apply wallet balance → DEBIT ORDER_PAYMENT.",
    apis: ["Cart/checkout useWallet=true", "Order confirm debits wallet"],
  },
  {
    n: 3,
    title: "Credits in",
    body: "Refunds, referral rewards, admin adjustment, and points redeem all CREDIT cash wallet.",
    apis: [
      "REFUND · REFERRAL · ADMIN_ADJUSTMENT",
      "REWARD_REDEEM (from points wallet)",
    ],
  },
];

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
          setWallets({ items: d?.items ?? [], page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 });
        } else {
          const res = await getCashTransactions(page, 25, {
            source: txSource,
            type: txType,
          });
          const d = res?.data ?? res;
          setTx({ items: d?.items ?? [], page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 });
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

  const cash30 = overview?.last30Days?.cashTransactions ?? [];
  const redeem30 = overview?.last30Days?.pointsRedeemedToCash ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <p className="text-xs text-gray-500 mb-2">
        <Link to={`${basePath}/money-features`} className="text-indigo-600 hover:underline">
          ← Money features
        </Link>
      </p>

      <PageHeader
        icon={Wallet}
        title="Cash wallet (direct INR)"
        subtitle="Real money stored per user (Wallet collection). Separate from gift-card codes and from reward points until redeemed."
        onRefresh={() => {
          loadOverview();
          loadTab(1);
        }}
        loading={loading}
        accentClass="text-indigo-600"
      />

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {CASH_FLOW.map((s) => (
          <FlowStep key={s.n} {...s} />
        ))}
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total INR balance"
            value={fmtInr(overview.cash?.totalBalanceInr)}
            sub={`${overview.cash?.walletsWithBalance ?? 0} users with balance`}
            accent="indigo"
          />
          <StatCard
            label="Wallets created"
            value={overview.cash?.totalWallets ?? 0}
            accent="indigo"
          />
          <StatCard
            label="Points → cash (30d)"
            value={redeem30}
            sub="REWARD_REDEEM tx count"
            accent="indigo"
          />
          <StatCard
            label="Avg balance"
            value={fmtInr(overview.cash?.averageBalanceInr)}
            accent="indigo"
          />
        </div>
      )}

      {cash30.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Transaction sources (30 days)</h3>
          <ul className="text-xs space-y-1 text-gray-600">
            {cash30.map((row, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {row._id?.type} · {row._id?.source || "—"}
                </span>
                <span>
                  {row.count} · {fmtInr(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex gap-1 border-b border-gray-100 p-2 bg-gray-50">
          {[
            ["wallets", "User balances"],
            ["tx", "All transactions"],
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
          {tab === "wallets" && (
            <input
              type="search"
              placeholder="Search customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
            />
          )}
          {tab === "tx" && (
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
                <option value="REWARD_REDEEM">Points redeem → cash</option>
                <option value="REFERRAL">Referral reward</option>
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
          <button
            type="button"
            onClick={() => loadTab(1)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>

        <div className="overflow-x-auto">
          {listLoading ? (
            <p className="p-8 text-center text-gray-500">Loading…</p>
          ) : tab === "wallets" ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">INR balance</th>
                  <th className="px-3 py-2">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2">{row.userPhone || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{fmtInr(row.balance)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Cr/Dr</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Balance after</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tx.items.map((row) => (
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
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.transaction_source === "REWARD_REDEEM"
                            ? "text-violet-700 font-medium"
                            : ""
                        }
                      >
                        {row.transaction_source || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{fmtInr(row.amount)}</td>
                    <td className="px-3 py-2">{fmtInr(row.balance_after_transaction)}</td>
                    <td className="px-3 py-2">{row.status || "—"}</td>
                  </tr>
                ))}
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

      <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
        <ArrowLeftRight size={12} />
        Points wallet redeem appears here as <strong>REWARD_REDEEM</strong>. Manage points under{" "}
        <Link to={`${basePath}/money-features/points-wallet`} className="text-indigo-600 hover:underline">
          Points wallet
        </Link>
        .
      </p>
    </div>
  );
};

export default MoneyFeaturesCashWallet;
