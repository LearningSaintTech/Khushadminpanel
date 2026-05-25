import React from "react";

export function StatCard({ label, value, sub, accent = "gray" }) {
  const border =
    accent === "indigo"
      ? "border-indigo-200 bg-indigo-50/50"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/50"
        : accent === "violet"
          ? "border-violet-200 bg-violet-50/50"
          : "border-gray-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${border}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

export function Pagination({ page, totalPages, onPage, disabled }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-sm">
      <span className="text-gray-600">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function FlowStep({ n, title, body, apis }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-bold text-indigo-600">Step {n}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-600 leading-relaxed">{body}</p>
      {apis?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {apis.map((a) => (
            <li key={a} className="font-mono text-[10px] text-gray-500 break-all">
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, subtitle, onRefresh, loading, accentClass = "text-indigo-600" }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2`}>
          {Icon && <Icon className={accentClass} />}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : null}
          Refresh
        </button>
      )}
    </div>
  );
}
