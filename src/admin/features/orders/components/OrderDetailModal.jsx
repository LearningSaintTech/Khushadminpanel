import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal shell for line / return / tracking deep-dives.
 */
export default function OrderDetailModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer = null,
  size = "lg",
  labelledById,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    prevFocus.current = document.activeElement;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector("[data-modal-close]")?.focus?.() ||
        dialogRef.current?.focus?.();
    }, 0);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (prevFocus.current && typeof prevFocus.current.focus === "function") {
        prevFocus.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "xl"
      ? "max-w-4xl"
      : size === "md"
        ? "max-w-lg"
        : "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById || titleId}
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-white shadow-xl sm:rounded-2xl ${width}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2
              id={labelledById || titleId}
              className="truncate text-base font-semibold text-stone-900"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-stone-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-canvas-muted/40 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
