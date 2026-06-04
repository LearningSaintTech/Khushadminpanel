import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Gift, Coins, ArrowRight, HandCoins } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getWalletOverview } from "../../apis/MoneyFeaturesapi";
import { getCouponAnalytics } from "../../apis/Couponapi";
import { StatCard } from "./moneyFeaturesShared";

const MoneyFeaturesHub = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

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
      to: ap("money-features/cash-wallet"),
      icon: Wallet,
      title: "Cash wallet",
      border: "border-brand-200 hover:border-brand-400",
      iconClass: "text-brand-600",
      desc: "Stored INR balance. Recharge via Razorpay, pay orders, refunds. Points convert in as REWARD_REDEEM.",
      stat: walletOv ? fmt(walletOv.cash?.totalBalanceInr) : "—",
      statLabel: "Total INR in wallets",
    },
    {
      to: ap("money-features/gift-card"),
      icon: Gift,
      title: "Gift card (coupons)",
      border: "border-amber-200 hover:border-amber-400",
      iconClass: "text-amber-600",
      desc: "Discount codes at checkout — not a stored ₹ balance. Each use reduces order total once.",
      stat: couponSum ? String(couponSum.activeCoupons ?? 0) : "—",
      statLabel: "Active codes",
    },
    {
      to: ap("money-features/points-wallet"),
      icon: Coins,
      title: "Points wallet",
      border: "border-violet-200 hover:border-violet-400",
      iconClass: "text-violet-600",
      desc: "Reward points from orders. User redeems → credits cash wallet (REWARD_REDEEM).",
      stat: walletOv
        ? Number(walletOv.reward?.totalPoints ?? 0).toLocaleString("en-IN")
        : "—",
      statLabel: "Points in system",
    },
  ];

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          <HandCoins className="h-4 w-4 text-brand-600" />
          Money features
        </h1>
      </div>

      <p className="mb-2 max-w-3xl text-[11px] text-stone-600">
        Khush has <strong>three separate money flows</strong> for customers. They are not
        interchangeable — gift cards do not add to wallet balance; points must be redeemed to
        become cash.
      </p>

      <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        {cards.map(({ to, icon: Icon, title, border, iconClass, desc, stat, statLabel }) => (
          <Link
            key={to}
            to={to}
            className={`block rounded-xl border-2 bg-white p-3 shadow-sm transition hover:bg-brand-50/20 ${border}`}
          >
            <Icon className={`mb-2 h-5 w-5 ${iconClass}`} />
            <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{desc}</p>
            <p className="mt-2 text-base font-bold text-stone-900">{loading ? "…" : stat}</p>
            <p className="text-[10px] text-stone-500">{statLabel}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
              Open <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-stone-800">How they connect</h3>
        <div className="space-y-1.5 text-[11px] text-stone-700">
          <p>
            <strong>Cash wallet</strong> ← recharge, refunds, referral rewards, and{" "}
            <strong>points redeem</strong> (REWARD_REDEEM).
          </p>
          <p>
            <strong>Gift card</strong> → discount on that order only (coupon in cart/checkout).
          </p>
          <p>
            <strong>Points</strong> → earn on delivered orders → user redeems on Coins page →
            moves to cash wallet.
          </p>
        </div>
        <Link
          to={ap("money-features/refer-earn")}
          className="mt-2 inline-block text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          Refer & earn (pays into cash wallet) →
        </Link>
      </div>

      {walletOv && !loading ? (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            label="Cash wallets"
            value={walletOv.cash?.totalWallets ?? 0}
            accent="brand"
          />
          <StatCard
            label="Users with balance"
            value={walletOv.cash?.walletsWithBalance ?? 0}
            accent="brand"
          />
          <StatCard
            label="Users with points"
            value={walletOv.reward?.walletsWithPoints ?? 0}
            accent="violet"
          />
        </div>
      ) : null}
    </div>
  );
};

export default MoneyFeaturesHub;
