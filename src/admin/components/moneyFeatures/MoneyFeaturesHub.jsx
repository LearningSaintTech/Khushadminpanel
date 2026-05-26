import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Gift, Coins, ArrowRight, HandCoins } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getWalletOverview } from "../../apis/MoneyFeaturesapi";
import { getCouponAnalytics } from "../../apis/Couponapi";
import { StatCard } from "./moneyFeaturesShared";

const MoneyFeaturesHub = () => {
  const basePath = useAdminPanelBasePath();
  const [walletOv, setWalletOv] = useState(null);
  const [couponSum, setCouponSum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [w, c] = await Promise.all([
          getWalletOverview().catch(() => null),
          getCouponAnalytics().catch(() => null),
        ]);
        setWalletOv(w?.data ?? w);
        setCouponSum(c?.data?.summary ?? c?.summary);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const cards = [
    {
      to: `${basePath}/money-features/cash-wallet`,
      icon: Wallet,
      title: "1. Cash wallet (direct)",
      color: "border-indigo-200 hover:border-indigo-400",
      desc: "Stored INR balance. Users recharge via Razorpay, pay online orders, get refunds. Points can convert in as REWARD_REDEEM.",
      stat: walletOv ? fmt(walletOv.cash?.totalBalanceInr) : "—",
      statLabel: "Total INR in wallets",
    },
    {
      to: `${basePath}/money-features/gift-card`,
      icon: Gift,
      title: "2. Gift card (coupon codes)",
      color: "border-amber-200 hover:border-amber-400",
      desc: "Not a ₹ balance — discount codes at checkout & My Coupons. Each use reduces order total once.",
      stat: couponSum ? String(couponSum.activeCoupons ?? 0) : "—",
      statLabel: "Active codes",
    },
    {
      to: `${basePath}/money-features/points-wallet`,
      icon: Coins,
      title: "3. Points wallet (coins)",
      color: "border-violet-200 hover:border-violet-400",
      desc: "Reward points from orders/recharge. User redeems all coins → credits cash wallet (REDEEM transaction).",
      stat: walletOv
        ? Number(walletOv.reward?.totalPoints ?? 0).toLocaleString("en-IN")
        : "—",
      statLabel: "Points in system",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <HandCoins className="text-gray-800" />
        Money features — overview
      </h1>
      <p className="text-sm text-gray-600 mt-2 max-w-3xl">
        Khush has <strong>three separate money flows</strong> for customers. They are not interchangeable —
        gift cards do not add to wallet balance; points must be redeemed to become cash.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, title, color, desc, stat, statLabel }) => (
          <Link
            key={to}
            to={to}
            className={`block rounded-xl border-2 bg-white p-5 shadow-sm transition ${color}`}
          >
            <Icon className="h-8 w-8 text-gray-700 mb-3" />
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">{desc}</p>
            <p className="mt-4 text-2xl font-bold text-gray-900">{loading ? "…" : stat}</p>
            <p className="text-xs text-gray-500">{statLabel}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
              Open <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">How they connect</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Cash wallet</strong> ← recharge, refunds, referral rewards, and{" "}
            <strong>points redeem</strong> (REWARD_REDEEM).
          </p>
          <p>
            <strong>Gift card</strong> → discount on that order only (coupon in cart/checkout APIs).
          </p>
          <p>
            <strong>Points</strong> → earn on delivered orders → user taps redeem on Coins page → moves to cash
            wallet.
          </p>
        </div>
        <Link
          to={`${basePath}/money-features/refer-earn`}
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          Refer & earn (separate — pays into cash wallet) →
        </Link>
      </div>
    </div>
  );
};

export default MoneyFeaturesHub;
