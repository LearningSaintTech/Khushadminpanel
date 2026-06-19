import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import {
  buildAnalyticsCardsForSection,
  useOrderAgentStatusOptions,
} from "../../context/StatusOptionsContext";
import { ORDER_AGENT_SECTION_PATHS } from "../../constants";
import { useViewMode } from "../../context/ViewModeContext";
import { logOrderAgentDebug } from "../../orderAgentShared";

const TABS = [
  { key: "orders", label: "Orders", path: ORDER_AGENT_SECTION_PATHS.orders },
  { key: "exchange", label: "Exchange", path: ORDER_AGENT_SECTION_PATHS.exchange },
  { key: "returns", label: "Returns", path: ORDER_AGENT_SECTION_PATHS.returns },
];

function MetricCard({ label, count, status, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-stone-300 hover:shadow"
    >
      <p className="text-2xl font-bold text-stone-900">{count}</p>
      <p className="mt-1 text-[11px] font-medium text-stone-600">{label}</p>
      {status ? (
        <p className="mt-2 font-mono text-[9px] uppercase text-stone-400">{status}</p>
      ) : null}
    </button>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { isByOrder } = useViewMode();
  const {
    countsLoading,
    countsError,
    countsView,
    statusCounts,
    sectionTotals,
    staleCount,
    staleThresholdHours,
    refreshSidebarCounts,
    orders,
    exchange,
    returns,
  } = useOrderAgentStatusOptions();

  const [tab, setTab] = useState("orders");

  const statusOptions = useMemo(
    () => ({ orders, exchange, returns }),
    [orders, exchange, returns],
  );

  const cards = useMemo(
    () => buildAnalyticsCardsForSection(tab, { statusCounts, statusOptions }),
    [tab, statusCounts, statusOptions],
  );

  const activeTab = TABS.find((t) => t.key === tab);
  const sectionTotal = sectionTotals[tab] ?? 0;
  const viewLabel = isByOrder ? "by order" : "by item";

  useEffect(() => {
    logOrderAgentDebug("analytics-page", {
      tab,
      viewLabel: isByOrder ? "order" : "item",
      countsView,
      countsLoading,
      countsError,
      sectionTotal,
      cards,
      staleCount,
    });
  }, [
    tab,
    isByOrder,
    countsView,
    countsLoading,
    countsError,
    sectionTotal,
    cards,
    staleCount,
  ]);

  const handleCardClick = (status) => {
    if (!status || !activeTab) return;
    navigate({
      pathname: activeTab.path,
      search: `?status=${encodeURIComponent(status)}`,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Analytics</h1>
          <p className="text-[11px] text-stone-500">
            Live DB statuses — same counts as sidebar badges
            <span className="text-stone-400"> · {viewLabel}</span>
            {countsView && countsView !== (isByOrder ? "order" : "item") ? (
              <span className="text-amber-700"> · updating…</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshSidebarCounts()}
          disabled={countsLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-60"
        >
          <RefreshCw size={14} className={countsLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {countsError ? <p className="text-[11px] text-red-600">{countsError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Stale alert
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {countsLoading ? "…" : (staleCount ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            CONFIRMED &gt; {staleThresholdHours ?? 24}h
            <span className="text-amber-700/80"> · line items</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            {activeTab?.label} total
          </p>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {countsLoading ? "…" : sectionTotal}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">{viewLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              tab === t.key
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 ring-1 ring-border hover:bg-canvas-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {countsLoading ? (
        <p className="text-[11px] text-stone-500">Loading analytics…</p>
      ) : cards.length === 0 ? (
        <p className="text-[11px] text-stone-500">No status counts for this view.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <MetricCard
              key={card.status}
              label={card.label}
              count={card.count}
              status={card.status}
              onClick={() => handleCardClick(card.status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
