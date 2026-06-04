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
import {
  PageHeader,
  StatCard,
  Pagination,
  FlowStep,
  inputClass,
  tableScrollShell,
} from "./moneyFeaturesShared";

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

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
        {POINTS_FLOW.map((s) => (
          <FlowStep key={s.n} {...s} />
        ))}
      </div>

      {overview && (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
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
          to={ap("rewards")}
          className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
        >
          <Settings size={14} />
          Edit reward rules
        </Link>
      </div>

      {reward30.length > 0 && (
        <div className="mb-3 rounded-xl border border-violet-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold text-slate-800">Point activity (30 days)</h3>
          <ul className="space-y-1 text-[11px] text-slate-600">
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

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex gap-1 border-b border-border bg-canvas-muted/50 p-1.5">
          {[
            ["balances", "User point balances"],
            ["tx", "Point transactions"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${
                tab === key ? "bg-brand-600 text-white shadow-sm" : "text-stone-600 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-border p-2">
          {tab === "balances" && (
            <input
              type="search"
              placeholder="Search customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} min-w-[200px] flex-1`}
            />
          )}
          {tab === "tx" && (
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className={inputClass}
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
            className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
          >
            Apply
          </button>
        </div>

        <div className={tableScrollShell}>
          {listLoading ? (
            <p className="p-8 text-center text-[11px] text-stone-500">Loading…</p>
          ) : tab === "balances" ? (
            <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Phone</th>
                  <th className="px-2.5 py-1.5">Points</th>
                  <th className="px-2.5 py-1.5">User ID</th>
                </tr>
              </thead>
              <tbody>
                {wallets.items.map((row) => (
                  <tr key={String(row._id)} className="border-t border-border/80 hover:bg-brand-50/30">
                    <td className="px-2.5 py-1.5">{row.userName || "—"}</td>
                    <td className="px-2.5 py-1.5">{row.userPhone || "—"}</td>
                    <td className="px-2.5 py-1.5 font-semibold text-violet-700">
                      {Number(row.points_balance ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 break-all">{String(row.userId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[860px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="px-2.5 py-1.5">Date</th>
                  <th className="px-2.5 py-1.5">Customer</th>
                  <th className="px-2.5 py-1.5">Type</th>
                  <th className="px-2.5 py-1.5">Source</th>
                  <th className="px-2.5 py-1.5">Points</th>
                  <th className="px-2.5 py-1.5">After</th>
                </tr>
              </thead>
              <tbody>
                {tx.items.map((row) => (
                  <tr key={String(row._id)} className="border-t border-border/80 hover:bg-brand-50/30">
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-[10px] text-slate-600">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-2.5 py-1.5">{row.userName || "—"}</td>
                    <td className="px-2.5 py-1.5">
                      <span
                        className={
                          row.type === "REDEEM" ? "font-semibold text-violet-700" : ""
                        }
                      >
                        {row.type}
                      </span>
                    </td>
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
          page={tab === "balances" ? wallets.page : tx.page}
          totalPages={tab === "balances" ? wallets.totalPages : tx.totalPages}
          onPage={loadTab}
          disabled={listLoading}
        />
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        After <strong>REDEEM</strong>, check cash wallet transactions (source REWARD_REDEEM) under{" "}
        <Link to={ap("money-features/cash-wallet")} className="text-brand-600 hover:underline">
          Cash wallet
        </Link>
        .
      </p>
    </div>
  );
};

export default MoneyFeaturesPointsWallet;
