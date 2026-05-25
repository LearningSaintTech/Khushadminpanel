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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="text-violet-600" />
            Redeem coins (reward points)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Points earned on orders and recharges; users redeem to cash wallet at the rate below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to={`${basePath}/rewards`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Settings size={16} />
            Edit reward rules
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Redemption rules</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Min points to redeem</dt>
                    <dd className="font-medium">{redemption?.min_points_required ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Point value (INR)</dt>
                    <dd className="font-medium">₹{redemption?.point_value_in_currency ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Earning & expiry</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Earning type</dt>
                    <dd className="font-medium">{earning?.type ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Earning slabs</dt>
                    <dd className="font-medium">{earning?.slabs?.length ?? 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expiry days</dt>
                    <dd className="font-medium">{expiry?.expiry_days ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Max points / order</dt>
                    <dd className="font-medium">{limits?.max_points_earned_per_order ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              {recharge.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Wallet recharge bonus slabs</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-gray-500 border-b">
                        <tr>
                          <th className="text-left py-2">Min amount</th>
                          <th className="text-left py-2">Max amount</th>
                          <th className="text-left py-2">Cash bonus</th>
                          <th className="text-left py-2">Bonus %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recharge.map((b, i) => (
                          <tr key={i} className="border-b border-gray-50">
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
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Order earning slabs</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-gray-500 border-b">
                        <tr>
                          <th className="text-left py-2">Order value min</th>
                          <th className="text-left py-2">Order value max</th>
                          <th className="text-left py-2">Fixed points</th>
                          <th className="text-left py-2">% points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earning.slabs.map((s, i) => (
                          <tr key={i} className="border-b border-gray-50">
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
