import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, RefreshCw, Settings } from "lucide-react";
import { getRewardRules } from "../../apis/Rewardapi";
import { getWalletOverview } from "../../apis/MoneyFeaturesapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const MoneyFeaturesRedeemCoins = () => {
  const basePath = useAdminPanelBasePath();
  const [rules, setRules] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [rulesRes, ovRes] = await Promise.all([
        getRewardRules(),
        getWalletOverview(),
      ]);
      const r = rulesRes?.data ?? rulesRes;
      setRules(Array.isArray(r) ? r[0] : r);
      setOverview(ovRes?.data ?? ovRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const redemption = rules?.redemption_rules;
  const earning = rules?.earning_rules;
  const expiry = rules?.expiry_rules;
  const limits = rules?.limits;
  const recharge = rules?.recharge_bonus_rules ?? [];

  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  return (
    <div className="text-stone-900">
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
          <h1 className="mr-auto flex min-w-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
              <Coins className="h-4 w-4 text-violet-600 shrink-0" />
              Redeem coins
          </h1>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              to={ap("rewards")}
              className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
            >
              <Settings size={14} />
              Edit rules
            </Link>
        </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-[11px] text-stone-500 shadow-sm">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase text-violet-800">Total coins in system</p>
              <p className="text-2xl font-bold text-violet-950 mt-1">
                {Number(overview?.reward?.totalPoints ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Users with balance</p>
              <p className="text-2xl font-bold mt-1">{overview?.reward?.walletsWithPoints ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Redeems to cash (30d)</p>
              <p className="text-2xl font-bold mt-1">
                {overview?.last30Days?.pointsRedeemedToCash ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">₹ per point</p>
              <p className="text-2xl font-bold mt-1">
                {redemption?.point_value_in_currency != null
                  ? `₹${redemption.point_value_in_currency}`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Min redeem: {redemption?.min_points_required ?? "—"} pts
              </p>
            </div>
          </div>

          {!rules ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-gray-600">No reward rules configured yet.</p>
              <Link
                to={`${basePath}/rewards/create`}
                className="mt-3 inline-block text-indigo-600 font-medium hover:underline"
              >
                Create reward policy
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-xs font-semibold text-slate-900">Redemption rules</h2>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Min points to redeem</dt>
                    <dd className="font-semibold text-slate-900">{redemption?.min_points_required ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Point value (INR)</dt>
                    <dd className="font-semibold text-slate-900">₹{redemption?.point_value_in_currency ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-xs font-semibold text-slate-900">Earning & expiry</h2>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Earning type</dt>
                    <dd className="font-semibold text-slate-900">{earning?.type ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Earning slabs</dt>
                    <dd className="font-semibold text-slate-900">{earning?.slabs?.length ?? 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Expiry days</dt>
                    <dd className="font-semibold text-slate-900">{expiry?.expiry_days ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Max points / order</dt>
                    <dd className="font-semibold text-slate-900">{limits?.max_points_earned_per_order ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              {recharge.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="mb-2 text-xs font-semibold text-slate-900">Wallet recharge bonus slabs</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="text-left py-2">Min</th>
                          <th className="text-left py-2">Max</th>
                          <th className="text-left py-2">Cash bonus</th>
                          <th className="text-left py-2">Bonus %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recharge.map((b, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2">₹{b.min_amount}</td>
                            <td className="py-2">₹{b.max_amount}</td>
                            <td className="py-2">₹{b.cashToAdd ?? 0}</td>
                            <td className="py-2">{b.bonus_percentage ?? 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {earning?.slabs?.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="mb-2 text-xs font-semibold text-slate-900">Order earning slabs</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="text-left py-2">Min</th>
                          <th className="text-left py-2">Max</th>
                          <th className="text-left py-2">Fixed</th>
                          <th className="text-left py-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earning.slabs.map((s, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2">₹{s.min_price}</td>
                            <td className="py-2">₹{s.max_price}</td>
                            <td className="py-2">{s.points ?? 0}</td>
                            <td className="py-2">{s.points_percentage ?? 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MoneyFeaturesRedeemCoins;
