import React from "react";
import { Package, RefreshCw, Truck } from "lucide-react";

export const btnDocSm =
  "inline-flex items-center justify-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight whitespace-nowrap disabled:opacity-50 transition-colors";
export const btnDocSmLabel =
  "inline-flex items-center justify-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors";
export const btnDocSmManifest =
  "inline-flex items-center justify-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors";
export const btnDocSmInvoice =
  "inline-flex items-center justify-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors";

export const orderLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
export const orderSectionTitle = "text-xs font-semibold text-slate-800";
export const orderFormInput =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-60";
export const orderFormSelect = `${orderFormInput} min-w-[10rem]`;
export const orderDetailCard =
  "rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden";
export const orderDetailHeader = "border-b border-slate-100 bg-slate-50/80 px-3 py-2.5";
export const orderDetailBody = "px-3 py-3 sm:px-4 space-y-3";

const ICON = 10;

export function DocLabelButton({
  loading,
  loadingType,
  disabled,
  onClick,
  title,
  showText = true,
  className = "",
}) {
  const busy = loading && loadingType === "label";
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      title={title}
      className={`${btnDocSmLabel} ${className}`.trim()}
    >
      {busy ? (
        <RefreshCw size={ICON} className="animate-spin shrink-0" />
      ) : (
        <Truck size={ICON} className="shrink-0" />
      )}
      {showText ? (busy ? "…" : "Label") : null}
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
        <RefreshCw size={ICON} className="animate-spin shrink-0" />
      ) : (
        <Package size={ICON} className="shrink-0" />
      )}
      {showText ? (busy ? "…" : "Manifest") : null}
    </button>
  );
}
