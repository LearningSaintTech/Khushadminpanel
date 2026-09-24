import React, { useId, useCallback, useRef, useEffect } from "react";

/**
 * Accessible horizontal tabs for order detail.
 */
export default function OrderDetailTabs({
  tabs = [],
  activeId,
  onChange,
  className = "",
  panelClassName = "",
  children,
}) {
  const baseId = useId();
  const listRef = useRef(null);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeId),
  );

  const selectByIndex = useCallback(
    (idx) => {
      const next = tabs[idx];
      if (next && !next.disabled) onChange?.(next.id);
    },
    [tabs, onChange],
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-tab-id="${activeId}"]`);
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  const onKeyDown = (e) => {
    if (!tabs.length) return;
    let next = activeIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (activeIndex + 1) % tabs.length;
      while (tabs[next]?.disabled && next !== activeIndex) {
        next = (next + 1) % tabs.length;
      }
      selectByIndex(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (activeIndex - 1 + tabs.length) % tabs.length;
      while (tabs[next]?.disabled && next !== activeIndex) {
        next = (next - 1 + tabs.length) % tabs.length;
      }
      selectByIndex(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectByIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectByIndex(tabs.length - 1);
    }
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Order detail sections"
        className="flex flex-wrap gap-1 border-b border-border bg-canvas-muted/30 px-2 pt-2"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          const badge =
            tab.count != null && tab.count > 0 ? (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  selected
                    ? "bg-brand-100 text-brand-800"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {tab.count}
              </span>
            ) : null;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange?.(tab.id)}
              className={`inline-flex items-center rounded-t-lg border border-b-0 px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                selected
                  ? "border-border bg-white text-stone-900"
                  : "border-transparent bg-transparent text-stone-500 hover:bg-white/70 hover:text-stone-800"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {tab.label}
              {badge}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeId}`}
        aria-labelledby={`${baseId}-tab-${activeId}`}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}

export function countActiveReturns(items = []) {
  return items.filter((it) => {
    const s = String(it?.status || "").toUpperCase();
    if (s.startsWith("RETURN_") || s === "RETURNED" || s === "REFUNDED") return true;
    if (it?.afterSales?.type === "RETURN") return true;
    return Array.isArray(it?.returns) && it.returns.length > 0;
  }).length;
}

export function countActiveExchanges(items = []) {
  return items.filter((it) => {
    const s = String(it?.status || "").toUpperCase();
    if (s.startsWith("EXCHANGE_")) return true;
    if (it?.afterSales?.type === "EXCHANGE") return true;
    return Array.isArray(it?.exchanges) && it.exchanges.length > 0;
  }).length;
}
