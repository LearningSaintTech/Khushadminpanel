import { Link } from "react-router-dom";
import {
  ArrowRight,
  IndianRupee,
  Settings2,
  ScrollText,
  Banknote,
  Search,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const EarningsHub = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const cards = [
    {
      to: ap("earnings/policy"),
      icon: Settings2,
      title: "Policy",
      border: "border-brand-200 hover:border-brand-400",
      iconClass: "text-brand-600",
      desc: "Creator / designer commission rates, min payout, return window.",
    },
    {
      to: ap("earnings/commissions"),
      icon: ScrollText,
      title: "Commissions",
      border: "border-violet-200 hover:border-violet-400",
      iconClass: "text-violet-600",
      desc: "Monitor ledger — pending_return_window → available → paid_out / cancelled.",
    },
    {
      to: ap("earnings/payouts"),
      icon: Banknote,
      title: "Payouts",
      border: "border-amber-200 hover:border-amber-400",
      iconClass: "text-amber-600",
      desc: "Mark NEFT/UPI paid or reject (restores available balance).",
    },
    {
      to: ap("earnings/attribution"),
      icon: Search,
      title: "Attribution",
      border: "border-emerald-200 hover:border-emerald-400",
      iconClass: "text-emerald-600",
      desc: "Lookup order line → contentId → author for support.",
    },
  ];

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          <IndianRupee className="h-4 w-4 text-brand-600" />
          Earnings
        </h1>
      </div>

      <p className="mb-2 max-w-3xl text-[11px] text-stone-600">
        Creator commission (post/reel shop CTA) and designer commission
        (designedById) settle after delivery + return window. Payouts leave the
        earnings wallet (separate from cash wallet).
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ to, icon: Icon, title, border, iconClass, desc }) => (
          <Link
            key={to}
            to={to}
            className={`block rounded-xl border-2 bg-white p-3 shadow-sm transition hover:bg-brand-50/20 ${border}`}
          >
            <Icon className={`mb-2 h-5 w-5 ${iconClass}`} />
            <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
              {desc}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
              Open <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default EarningsHub;
