import React from "react";

export const inputClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted disabled:text-stone-500";

export const fieldClass = inputClass;

export const fieldErrorClass = "border-danger focus:border-danger focus:ring-danger/20";

export const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

export const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

export const btnPrimary =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50";

export const btnOutline =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-40";

export const btnIconEdit =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50";

export const btnIconDelete =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition-colors hover:bg-danger/10 disabled:opacity-50";

export const tableHeadClass =
  "sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]";

export const tabActive = "rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm";
export const tabInactive =
  "rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-canvas-muted";

export const formPageWrap = "mx-auto max-w-4xl text-stone-900";

/** List / detail page toolbar (title + actions) */
export const pageToolbar =
  "mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm";

/** Create / edit page toolbar (back + title + close) */
export const formToolbar =
  "mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm";

export const formStickyFooter =
  "sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm";

export const thClass =
  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500";

export function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {hint ? <p className="mb-1 text-[10px] text-stone-400">{hint}</p> : null}
      {children}
      {error ? <p className="mt-1 text-[10px] text-danger">{error}</p> : null}
    </div>
  );
}
