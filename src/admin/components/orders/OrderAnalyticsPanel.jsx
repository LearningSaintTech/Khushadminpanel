import { RefreshCw } from "lucide-react";

export function OrderAnalyticsPanel({
  ui,
  viewMode,
  lineConsistencyFilter,
  analyticsLoading,
  analyticsError,
  analyticsTotal,
  analyticsStatusCards,
  activeStatus,
  onSelectStatus,
  onRefresh,
}) {
  return (
    <div className={ui.analyticsPanel}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-stone-800">
            Status analytics
            <span className="ml-1.5 font-normal text-stone-500">
              ({viewMode === "order" ? "by order" : "by item"}
              {lineConsistencyFilter === "mixed" && viewMode === "order" ? " · mixed lines" : ""}
              )
            </span>
          </p>
          <p className="text-[10px] text-stone-500">
            Uses current search, dates, delivery & payment filters. Click a card to filter the
            table.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={analyticsLoading}
          className={`${ui.btnOutline} py-1 text-[10px]`}
        >
          {analyticsLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3 w-3" aria-hidden />
          )}
          Refresh
        </button>
      </div>
      {analyticsError ? (
        <p className="mb-2 text-[11px] text-danger">{analyticsError}</p>
      ) : null}
      {analyticsLoading ? (
        <p className="py-4 text-center text-[11px] text-stone-500">Loading counts…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onSelectStatus("")}
            className={`${ui.analyticsCard} ${
              !activeStatus ? ui.analyticsCardActive : ui.analyticsCardIdle
            }`}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">
              All
            </span>
            <span className="mt-0.5 text-lg font-bold tabular-nums text-stone-900">
              {analyticsTotal ?? 0}
            </span>
          </button>
          {analyticsStatusCards.map(({ status, label, count }) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(status)}
              className={`${ui.analyticsCard} ${
                activeStatus === status ? ui.analyticsCardActive : ui.analyticsCardIdle
              }`}
              title={`Show only ${label}`}
            >
              <span className="max-w-[7rem] truncate text-[9px] font-semibold uppercase tracking-wide text-stone-600">
                {label}
              </span>
              <span className="mt-0.5 text-lg font-bold tabular-nums text-stone-900">
                {count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
