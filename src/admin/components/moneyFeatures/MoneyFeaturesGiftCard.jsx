import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Users, ShoppingBag, Percent, ExternalLink } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getCouponAnalytics } from "../../apis/Couponapi";
import CouponPage from "../coupon/coupon";
import { FlowStep } from "./moneyFeaturesShared";

const GIFT_FLOW = [
  {
    n: 1,
    title: "Admin creates code",
    body: "You create a coupon (code, % or flat off, dates, min cart). Stored in Coupons collection.",
    apis: ["POST /api/coupons/create", "Admin panel below"],
  },
  {
    n: 2,
    title: "Customer sees & copies",
    body: "Logged-in user opens My Coupons on website, reveals code, uses at checkout.",
    apis: ["GET /api/coupons/availableCoupons"],
  },
  {
    n: 3,
    title: "Checkout discount",
    body: "Code validated and applied to order total — discount saved on order, not added to wallet.",
    apis: ["GET /api/coupons/validate/:code", "Cart pricing with couponCode"],
  },
];

/**
 * Gift cards for customers = coupon codes (one-time discount per order).
 * There is no GiftCardWallet balance in the backend — do not confuse with cash wallet.
 */
const MoneyFeaturesGiftCard = () => {
  const basePath = useAdminPanelBasePath();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCouponAnalytics();
      setAnalytics(res?.data ?? res);
    } catch (e) {
      console.error(e);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5">
        <p className="text-xs text-gray-500 mb-2">
          <Link to={`${basePath}/money-features`} className="text-indigo-600 hover:underline">
            ← Money features
          </Link>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="text-amber-600 shrink-0" />
              Gift card (coupon codes)
            </h1>
            <p className="text-sm text-amber-950/90 mt-2 leading-relaxed">
              <strong className="text-amber-900">Important:</strong> This is not a stored ₹ wallet.
              Customers use gift-style <strong>codes</strong> for a discount on that order only. Cash
              balance lives under{" "}
              <Link to={`${basePath}/money-features/cash-wallet`} className="underline font-medium">
                Cash wallet
              </Link>
              ; loyalty points under{" "}
              <Link to={`${basePath}/money-features/points-wallet`} className="underline font-medium">
                Points wallet
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh usage"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {GIFT_FLOW.map((s) => (
            <FlowStep key={s.n} {...s} />
          ))}
        </div>
      </div>

      {summary && (
        <div className="px-6 py-5 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Customer redemptions (all codes)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-xs text-gray-500">Active codes</p>
              <p className="text-xl font-bold">{summary.activeCoupons ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Users size={12} /> Users used a code
              </p>
              <p className="text-xl font-bold">{summary.totalUniqueUsers ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Total code uses</p>
              <p className="text-xl font-bold">{summary.totalUsageCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShoppingBag size={12} /> Orders with code
              </p>
              <p className="text-xl font-bold">{summary.totalOrdersWithCoupons ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Percent size={12} /> Discount given
              </p>
              <p className="text-xl font-bold text-emerald-700">
                ₹{Number(summary.totalDiscountGiven ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Normal / influencer</p>
              <p className="text-sm font-bold mt-1">
                {summary.normalCoupons ?? 0} / {summary.influencerCoupons ?? 0}
              </p>
            </div>
          </div>

          {analytics?.mostUsedCoupons?.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left min-w-[480px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Code (gift card)</th>
                    <th className="px-3 py-2">Discount</th>
                    <th className="px-3 py-2">Times used</th>
                    <th className="px-3 py-2">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.mostUsedCoupons.slice(0, 10).map((row) => (
                    <tr key={row.couponId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-medium">{row.couponCode}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.discountType} · {row.discountValue}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.totalUsage}</td>
                      <td className="px-3 py-2 tabular-nums">{row.uniqueUsersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {analytics?.recentUsage?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Recent orders with gift/coupon code</h3>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Order</th>
                      <th className="px-2 py-1.5 text-left">Customer</th>
                      <th className="px-2 py-1.5 text-left">Code</th>
                      <th className="px-2 py-1.5 text-right">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentUsage.slice(0, 15).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">{row.orderId}</td>
                        <td className="px-2 py-1.5">{row.userName || row.phoneNumber}</td>
                        <td className="px-2 py-1.5 font-mono">{row.couponCode}</td>
                        <td className="px-2 py-1.5 text-right text-emerald-700">
                          ₹{Number(row.discountAmount ?? 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            <Link
              to={`${basePath}/analytics/events`}
              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
            >
              Full analytics <ExternalLink size={12} />
            </Link>
          </p>
        </div>
      )}

      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Create & manage gift / coupon codes</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          New codes show on customer My Coupons when active, in date range, and cart qualifies.
        </p>
      </div>

      <CouponPage />
    </div>
  );
};

export default MoneyFeaturesGiftCard;
