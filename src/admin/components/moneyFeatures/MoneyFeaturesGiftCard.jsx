import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Users, ShoppingBag, ExternalLink, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getCouponAnalytics } from "../../apis/Couponapi";
import CouponPage from "../coupon/coupon";
import GiftCardRulesManager from "./GiftCardRulesManager";
import {
  FlowStep,
  PageHeader,
  tableScrollShell,
} from "./moneyFeaturesShared";

const GIFT_FLOW = [
  {
    n: 1,
    title: "Admin creates code",
    body: "Create a coupon (code, % or flat off, dates, min cart). Stored in Coupons collection.",
    apis: ["POST /api/coupons/create", "Admin panel below"],
  },
  {
    n: 2,
    title: "Customer sees & copies",
    body: "Logged-in user opens My Coupons, reveals code, uses at checkout.",
    apis: ["GET /api/coupons/availableCoupons"],
  },
  {
    n: 3,
    title: "Checkout discount",
    body: "Code validated and applied to order total — discount on order, not wallet balance.",
    apis: ["GET /api/coupons/validate/:code", "Cart pricing with couponCode"],
  },
];

const MoneyFeaturesGiftCard = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

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
    <div className="text-stone-900">
      <p className="mb-2 text-[11px] text-stone-500">
        <Link to={ap("money-features")} className="font-medium text-brand-600 hover:underline">
          ← Money features
        </Link>
      </p>

      <PageHeader
        icon={Gift}
        title="Gift card (coupon codes)"
        subtitle="Discount codes at checkout — not a stored ₹ wallet."
        onRefresh={loadAnalytics}
        loading={loading}
        accentClass="text-amber-600"
      />

      <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-950">
        <strong className="text-amber-900">Note:</strong> Cash balance is under{" "}
        <Link to={ap("money-features/cash-wallet")} className="font-medium underline">
          Cash wallet
        </Link>
        ; loyalty points under{" "}
        <Link to={ap("money-features/points-wallet")} className="font-medium underline">
          Points wallet
        </Link>
        .
      </div>

      <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        {GIFT_FLOW.map((s) => (
          <FlowStep key={s.n} {...s} />
        ))}
      </div>

      {summary ? (
        <div className="mb-2 rounded-xl border border-border bg-white p-3 shadow-sm">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Customer redemptions (all codes)
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Active codes", value: summary.activeCoupons ?? 0, accent: true },
              { label: "Users used code", value: summary.totalUniqueUsers ?? 0, icon: Users },
              { label: "Total uses", value: summary.totalUsageCount ?? 0 },
              { label: "Orders with code", value: summary.totalOrdersWithCoupons ?? 0, icon: ShoppingBag },
              {
                label: "Discount given",
                value: `₹${Number(summary.totalDiscountGiven ?? 0).toLocaleString("en-IN")}`,
                success: true,
              },
              {
                label: "Normal / influencer",
                value: `${summary.normalCoupons ?? 0} / ${summary.influencerCoupons ?? 0}`,
              },
            ].map(({ label, value, accent, success }) => (
              <div
                key={label}
                className={`rounded-lg border p-2 ${
                  accent ? "border-amber-200 bg-amber-50/50" : "border-border bg-canvas-muted/30"
                }`}
              >
                <p className="text-[10px] text-stone-500">{label}</p>
                <p
                  className={`text-sm font-bold ${
                    success ? "text-success" : "text-stone-900"
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {analytics?.mostUsedCoupons?.length > 0 ? (
            <div className={`mt-2 ${tableScrollShell} max-h-[40vh]`}>
              <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                  <tr>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">
                      Code
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">
                      Discount
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">
                      Uses
                    </th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-stone-500">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.mostUsedCoupons.slice(0, 10).map((row) => (
                    <tr
                      key={row.couponId}
                      className="border-t border-border/80 hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 font-mono font-medium">{row.couponCode}</td>
                      <td className="px-2 py-2 text-stone-600">
                        {row.discountType} · {row.discountValue}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{row.totalUsage}</td>
                      <td className="px-2 py-2 tabular-nums">{row.uniqueUsersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-2">
            <Link
              to={ap("analytics/events")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
            >
              Full analytics <ExternalLink size={12} />
            </Link>
          </p>
        </div>
      ) : loading ? (
        <div className="mb-2 flex items-center gap-2 py-6 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading analytics…
        </div>
      ) : null}

      <div className="mb-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <h2 className="text-xs font-semibold text-stone-800">Purchase bonus rules</h2>
        <p className="mt-0.5 text-[11px] text-stone-500">
          Pay amount → receive higher gift card redeemable value (app & website).
        </p>
        <div className="mt-2">
          <GiftCardRulesManager />
        </div>
      </div>

      <div className="mb-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <h2 className="text-xs font-semibold text-stone-800">Create & manage coupon codes</h2>
        <p className="mt-0.5 text-[11px] text-stone-500">
          Active codes appear on customer My Coupons when in date range and cart qualifies.
        </p>
      </div>

      <CouponPage />
    </div>
  );
};

export default MoneyFeaturesGiftCard;
