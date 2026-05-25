import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Settings } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getRewardRules } from "../../apis/Rewardapi";
import {
  getWalletOverview,
  getRewardWallets,
  getRewardTransactions,
} from "../../apis/MoneyFeaturesapi";
import { PageHeader, StatCard, Pagination, FlowStep } from "./moneyFeaturesShared";

const POINTS_FLOW = [
  {
    n: 1,
    title: "Earn points",
    body: "After order delivery (and recharge bonuses per rules), points CREDIT to RewardWallet.",
    apis: ["Order service credits EARN", "GET /api/reward-wallet/get-coins"],
  },
  {
    n: 2,
    title: "User redeems",
    body: "On website Coins page user redeems all points → DEBIT reward + CREDIT cash wallet.",
    apis: ["POST /api/wallet/redeem-points"],
  },
  {
    n: 3,
    title: "Cancel / reversal",
    body: "Full order cancel can REVERSAL earned points per order rules.",
    apis: ["Admin cancel → reverseEarnedPointsForFullyCancelledOrder"],
  },
];

const MoneyFeaturesPointsWallet = () => {
  const basePath = useAdminPanelBasePath();
  const [rules, setRules] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("balances");
  const [wallets, setWallets] = useState({ items: [], page: 1, totalPages: 1 });
  const [tx, setTx] = useState({ items: [], page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, ovRes] = await Promise.all([getRewardRules(), getWalletOverview()]);
      const r = rulesRes?.data ?? rulesRes;
      setRules(Array.isArray(r) ? r[0] : r);
      setOverview(ovRes?.data ?? ovRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(
    async (page = 1) => {
      setListLoading(true);
      try {
        if (tab === "balances") {
          const res = await getRewardWallets(page, 20, search);
          const d = res?.data ?? res;
          setWallets({ items: d?.items ?? [], page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 });
        } else {
          const res = await getRewardTransactions(page, 25, { type: txType });
          const d = res?.data ?? res;
          setTx({ items: d?.items ?? [], page: d?.page ?? 1, totalPages: d?.totalPages ?? 1 });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setListLoading(false);
      }
    },
    [tab, search, txType],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTab(1);
  }, [tab, loadTab]);

  const redemption = rules?.redemption_rules;
  const earning = rules?.earning_rules;
  const reward30 = overview?.last30Days?.rewardTransactions ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <p className="text-xs text-gray-500 mb-2">
        <Link to={`${basePath}/money-features`} className="text-indigo-600 hover:underline">
          ← Money features
        </Link>
      </p>

      <PageHeader
        icon={Coins}
        title="Points wallet (coins)"
        subtitle="RewardWallet + RewardTransaction collections. Points are not INR until user redeems — then cash wallet gets REWARD_REDEEM."
        onRefresh={() => {
          load();
          loadTab(1);
        }}
        loading={loading}
        accentClass="text-violet-600"
      />

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {POINTS_FLOW.map((s) => (
          <FlowStep key={s.n} {...s} />
        ))}
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total points"
            value={Number(overview.reward?.totalPoints ?? 0).toLocaleString("en-IN")}
            sub={`${overview.reward?.walletsWithPoints ?? 0} users holding points`}
            accent="violet"
          />
          <StatCard
            label="Redeems → cash (30d)"
            value={overview.last30Days?.pointsRedeemedToCash ?? 0}
            sub="Successful REWARD_REDEEM on cash wallet"
            accent="violet"
          />
          <StatCard
            label="₹ per point"
            value={
              redemption?.point_value_in_currency != null
                ? `₹${redemption.point_value_in_currency}`
                : "—"
            }
            sub={`Min redeem: ${redemption?.min_points_required ?? "—"} pts`}
            accent="violet"
          />
          <StatCard
            label="Earning slabs"
            value={earning?.slabs?.length ?? 0}
            sub={earning?.type || "—"}
            accent="violet"
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          to={`${basePath}/rewards`}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Settings size={16} />
          Edit reward rules
        </Link>
      </div>

      {reward30.length > 0 && (
        <div className="mb-6 rounded-xl border border-violet-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Point activity (30 days)</h3>
          <ul className="text-xs space-y-1 text-gray-600">
            {reward30.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {row._id?.type} · {row._id?.source || "—"}
                </span>
                <span>
                  {row.count} tx · {row.points} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex gap-1 border-b border-gray-100 p-2 bg-gray-50">
          {[
            ["balances", "User point balances"],
            ["tx", "Point transactions"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === key ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          {tab === "balances" && (
            <input
              type="search"
              placeholder="Search customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
            />
          )}
          {tab === "tx" && (
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              <option value="EARN">Earn</option>
              <option value="REDEEM">Redeem (→ cash)</option>
              <option value="BONUS">Bonus</option>
              <option value="REVERSAL">Reversal</option>
              <option value="EXPIRE">Expire</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => loadTab(1)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>

        <div className="overflow-x-auto">
          {listLoading ? (
            <p className="p-8 text-center text-gray-500">Loading…</p>
          ) : tab === "balances" ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Points</th>
                  <th className="px-3 py-2">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.items.map((row) => (
                  <tr key={String(row._id)} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2">{row.userPhone || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-violet-700">
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
                    <td className="px-3 py-2">{row.userName || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.type === "REDEEM" ? "font-semibold text-violet-700" : ""
                        }
                      >
                        {row.type}
                      </span>
                    </td>
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
          page={tab === "balances" ? wallets.page : tx.page}
          totalPages={tab === "balances" ? wallets.totalPages : tx.totalPages}
          onPage={loadTab}
          disabled={listLoading}
        />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        After <strong>REDEEM</strong>, check cash wallet transactions (source REWARD_REDEEM) under{" "}
        <Link to={`${basePath}/money-features/cash-wallet`} className="text-indigo-600 hover:underline">
          Cash wallet
        </Link>
        .
      </p>
    </div>
  );
};

export default MoneyFeaturesPointsWallet;
