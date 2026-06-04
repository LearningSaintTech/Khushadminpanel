import { Loader2 } from "lucide-react";

export {
  btnOutline,
  btnPrimary,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "../Section/sectionShared";

export const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

export const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";

export const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

export function Alert({ variant = "danger", children }) {
  const styles =
    variant === "success"
      ? "border-success/30 bg-success-bg text-success"
      : "border-danger/30 bg-danger-bg text-danger";
  return (
    <div className={`mb-2 rounded-xl border px-3 py-2 text-[11px] ${styles}`}>
      {children}
    </div>
  );
}

export function PageToolbar({ icon: Icon, title, subtitle, children, accentClass = "text-brand-600" }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
      {Icon ? <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} /> : null}
      <div className="mr-auto min-w-0">
        <h1 className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[11px] text-stone-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

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

export function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {hint ? <p className="mb-1 text-[10px] text-stone-400">{hint}</p> : null}
      {children}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      Loading…
    </div>
  );
}

export function EmptyBlock({ message }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
      <p className="text-[11px] font-medium text-stone-600">{message}</p>
    </div>
  );
}

export function PaginationBar({ page, totalPages, onPage, disabled }) {
  const total = totalPages || 1;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:opacity-50"
      >
        Prev
      </button>
      <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
        Page {page} / {total}
      </span>
      <button
        type="button"
        disabled={disabled || page >= total}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export function TableActionBtn({ onClick, title, variant = "edit", disabled, children }) {
  const cls =
    variant === "delete"
      ? "border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
      : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${cls} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
