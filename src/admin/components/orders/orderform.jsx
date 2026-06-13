import React from "react";
import { Package, RefreshCw, Truck } from "lucide-react";

export const btnDocSm =
  "inline-flex items-center justify-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight whitespace-nowrap transition-colors disabled:opacity-50";
export const btnDocSmLabel =
  "inline-flex items-center justify-center gap-0.5 rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-50";
export const btnDocSmManifest =
  "inline-flex items-center justify-center gap-0.5 rounded border border-border bg-canvas-muted px-1.5 py-0.5 text-[9px] font-medium text-stone-700 transition hover:bg-white disabled:opacity-50";
export const btnDocSmInvoice =
  "inline-flex items-center justify-center gap-0.5 rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-50";
export const btnDocSmReprint =
  "inline-flex items-center justify-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50";

export const orderLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-stone-500";
export const orderSectionTitle = "text-xs font-semibold text-stone-800";
export const orderFormInput =
  "rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60";
export const orderFormSelect = `${orderFormInput} min-w-[10rem]`;
export const orderDetailCard =
  "overflow-hidden rounded-xl border border-border bg-white shadow-sm";
export const orderDetailHeader = "border-b border-border bg-canvas-muted/80 px-3 py-2.5";
export const orderDetailBody = "space-y-3 px-3 py-3 sm:px-4";

const ICON = 10;

export function DocLabelButton({
  loading,
  loadingType,
  disabled,
  onClick,
  title,
  showText = true,
  className = "",
  downloaded = false,
}) {
  const busy = loading && loadingType === "label";
  const btnClass = downloaded ? btnDocSmReprint : btnDocSmLabel;
  const labelText = busy ? "…" : downloaded ? "Reprint" : "Label";
  const defaultTitle = downloaded ? "Reprint shipping label" : "Download shipping label";
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      title={title ?? defaultTitle}
      className={`${btnClass} ${className}`.trim()}
    >
      {busy ? (
        <RefreshCw size={ICON} className="shrink-0 animate-spin" />
      ) : (
        <Truck size={ICON} className="shrink-0" />
      )}
      {showText ? labelText : null}
    </button>
  );
}

export function DocManifestButton({
  loading,
  loadingType,
  disabled,
  onClick,
  title,
  showText = true,
  className = "",
}) {
  const busy = loading && loadingType === "manifest";
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      title={title}
      className={`${btnDocSmManifest} ${className}`.trim()}
    >
      {busy ? (
        <RefreshCw size={ICON} className="shrink-0 animate-spin" />
      ) : (
        <Package size={ICON} className="shrink-0" />
      )}
      {showText ? (busy ? "…" : "Manifest") : null}
    </button>
  );
}
