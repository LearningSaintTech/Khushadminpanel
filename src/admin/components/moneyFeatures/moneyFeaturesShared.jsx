import { Loader2 } from "lucide-react";

export const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

export const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";

export const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

export function StatCard({ label, value, sub, accent = "default" }) {
  const border =
    accent === "brand"
      ? "border-brand-200 bg-brand-50/50"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/50"
        : accent === "violet"
          ? "border-violet-200 bg-violet-50/50"
          : accent === "success"
            ? "border-success/30 bg-success-bg/50"
            : "border-border bg-white";
  return (
    <div className={`rounded-xl border p-2.5 shadow-sm ${border}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold text-stone-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-stone-500">{sub}</p> : null}
    </div>
  );
}

export function Pagination({ page, totalPages, onPage, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-canvas-muted/50 px-2 py-1.5">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>
      <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-stone-700">
        Page {page} / {totalPages || 1}
      </span>
      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export function FlowStep({ n, title, body, apis }) {
  return (
    <div className="rounded-xl border border-border bg-white p-2.5 shadow-sm">
      <p className="text-[10px] font-bold text-brand-600">Step {n}</p>
      <p className="mt-0.5 text-xs font-semibold text-stone-900">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">{body}</p>
      {apis?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {apis.map((a) => (
            <li key={a} className="break-all font-mono text-[10px] text-stone-500">
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  onRefresh,
  loading,
  accentClass = "text-brand-600",
  backLink,
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
      {backLink}
      <div className="mr-auto min-w-0">
        <h1 className="flex items-center gap-2 truncate text-base font-bold tracking-tight text-stone-900 sm:text-lg">
          {Icon && <Icon className={`${accentClass} h-4 w-4 shrink-0`} />}
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 max-w-3xl truncate text-[11px] text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={`${inputClass} inline-flex items-center gap-1`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
          ) : null}
          Refresh
        </button>
      )}
    </div>
  );
}

export function BackToHub({ basePath }) {
  if (!basePath) return null;
  return (
    <p className="mb-2 text-[11px] text-stone-500">
      <a
        href={`${basePath}/money-features`}
        className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
      >
        ← Money features
      </a>
    </p>
  );
}
