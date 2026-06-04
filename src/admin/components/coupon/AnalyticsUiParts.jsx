import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  btnOutline,
  btnPrimary,
  filterInputClass,
  tableHeadClass,
  tableScrollShell,
  tabActive,
  tabInactive,
  thClass,
} from "./analyticsShared";

export function StatusPill({ status }) {
  const tone =
    status === "Loaded"
      ? "border-success/30 bg-success-bg text-success"
      : status === "Error"
        ? "border-danger/30 bg-danger-bg text-danger"
        : status === "Loading"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-border bg-canvas-muted text-stone-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function SegmentedTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-border bg-canvas-muted/50 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={activeTab === tab.id ? tabActive : tabInactive}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FilterField({ label, children }) {
  return (
    <label className="flex min-w-[120px] shrink-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
      {label}
      {children}
    </label>
  );
}

export function KpiTile({ title, value, subtitle, icon, active = false, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left shadow-sm transition ${
        active
          ? "border-brand-300 bg-brand-50 ring-2 ring-brand-100"
          : "border-border bg-white hover:border-brand-200 hover:bg-canvas-muted/30"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{title}</div>
          <div className="mt-1 text-xl font-bold text-stone-900">{value}</div>
          {subtitle ? <div className="mt-0.5 text-[10px] text-stone-500">{subtitle}</div> : null}
        </div>
        <div className="shrink-0 rounded-lg border border-border bg-white p-2">{icon}</div>
      </div>
    </Wrapper>
  );
}

export function CardSection({ title, actions, children }) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold text-stone-900">{title}</h3>
        {actions || null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-canvas-muted/40 px-3 py-6 text-center">
      <p className="text-[11px] font-semibold text-stone-700">{title}</p>
      <p className="mt-1 text-[10px] text-stone-500">{description}</p>
    </div>
  );
}

export function SummaryStat({ title, value }) {
  return (
    <div className="rounded-lg border border-border bg-canvas-muted/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-1 text-base font-bold text-stone-900">{value}</p>
    </div>
  );
}

export function PaginationFooter({
  currentPage,
  totalPages,
  total = 0,
  loading = false,
  onPrev,
  onNext,
}) {
  const safeTotal = Number(total) || 0;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-stone-500">
        {loading ? (
          "Loading…"
        ) : (
          <>
            Page <span className="font-medium text-stone-700">{currentPage}</span> of{" "}
            <span className="font-medium text-stone-700">{totalPages}</span>
            {safeTotal > 0 ? (
              <>
                {" "}
                · <span className="font-medium text-stone-700">{safeTotal.toLocaleString()}</span> total
              </>
            ) : null}
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={currentPage <= 1 || loading} onClick={onPrev} className={btnOutline}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages || loading}
          onClick={onNext}
          className={btnOutline}
        >
          Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function TimelineTable({ title, rows = [], valuePrefix = "" }) {
  return (
    <CardSection title={title}>
      {rows.length === 0 ? (
        <EmptyState title="No timeline points" description="Adjust filters and run the query again." />
      ) : (
        <div className={tableScrollShell}>
          <table className="min-w-full text-[11px]">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Day</th>
                <th className={`${thClass} text-right`}>Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.slice(-14).map((row) => (
                <tr key={`${title}-${row.day}`} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-1.5 text-stone-700">{row.day}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-brand-700">
                    {valuePrefix}
                    {Number(row.value || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardSection>
  );
}
