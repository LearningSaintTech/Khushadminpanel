import React from "react";

/** Shared stale-order list config (used by StaleOrdersPage). */

export const STALE_COLUMNS_STORAGE_KEY = "khush_admin_stale_order_visible_columns";

export const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

export const staleInputClass =
  "w-full rounded-lg border border-border bg-white py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export const staleBtnPrimary =
  "inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50";

export const staleBtnOutline =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-40";

export const staleBtnWarning =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-warning/40 bg-warning px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-50";

export function formatStaleDate(d) {
  if (d == null || d === "") return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(d);
  }
}

function staleVariantLabel(variant) {
  const v = variant || {};
  const parts = [v.size, v.color].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

export const STALE_ORDER_TABLE_COLUMNS = [
  {
    key: "orderId",
    label: "Order ID",
    defaultVisible: true,
    alwaysVisible: true,
    headerClass: "",
    cellClass: "font-medium text-stone-900 tabular-nums",
    render: (row) => row.orderId || "—",
  },
  {
    key: "orderStatus",
    label: "Order status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-600",
    render: (row) => row.orderStatus || "—",
  },
  {
    key: "confirmedAt",
    label: "Confirmed at",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-stone-600 whitespace-nowrap text-[10px]",
    render: (row) => formatStaleDate(row.confirmedAt || row.staleSince),
  },
  {
    key: "orderCreatedAt",
    label: "Order placed",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-600 whitespace-nowrap text-[10px]",
    render: (row) => formatStaleDate(row.orderCreatedAt),
  },
  {
    key: "hoursStale",
    label: "Hours stale",
    defaultVisible: true,
    headerClass: "",
    cellClass: "font-semibold tabular-nums text-warning",
    render: (row) => (row.hoursStale != null ? Math.floor(row.hoursStale) : "—"),
  },
  {
    key: "sku",
    label: "SKU",
    defaultVisible: true,
    headerClass: "",
    cellClass: "max-w-[120px] truncate text-stone-700",
    render: (row) => row.sku || "—",
  },
  {
    key: "variant",
    label: "Size / color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-700",
    render: (row) => staleVariantLabel(row.variant),
  },
  {
    key: "quantity",
    label: "Qty",
    defaultVisible: false,
    headerClass: "",
    cellClass: "tabular-nums text-stone-700",
    render: (row) => (row.quantity != null ? String(row.quantity) : "—"),
  },
  {
    key: "customerName",
    label: "Customer",
    defaultVisible: true,
    headerClass: "",
    cellClass: "max-w-[140px] truncate text-stone-700",
    render: (row) => row.customerName || "—",
  },
  {
    key: "phone",
    label: "Phone",
    defaultVisible: true,
    headerClass: "",
    cellClass: "tabular-nums text-stone-600",
    render: (row) => row.phone || "—",
  },
  {
    key: "city",
    label: "City",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-700",
    render: (row) => row.city || "—",
  },
  {
    key: "deliveryType",
    label: "Delivery",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-stone-600",
    render: (row) => row.deliveryType || "—",
  },
  {
    key: "finalPayable",
    label: "Order amount",
    defaultVisible: false,
    headerClass: "",
    cellClass: "tabular-nums font-medium text-stone-800",
    render: (row) =>
      row.finalPayable != null && row.finalPayable !== ""
        ? `₹${row.finalPayable}`
        : "—",
  },
  {
    key: "paymentMode",
    label: "Payment mode",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-600",
    render: (row) => row.paymentMode || "—",
  },
  {
    key: "paymentStatus",
    label: "Payment status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-600",
    render: (row) => row.paymentStatus || "—",
  },
  {
    key: "image",
    label: "Image",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-center",
    render: (row) => {
      const url = row.variant?.imageUrl;
      if (!url) return <span className="text-[10px] text-stone-400">—</span>;
      return (
        <img
          src={url}
          alt=""
          className="mx-auto h-8 w-8 rounded border border-border object-cover"
          loading="lazy"
        />
      );
    },
  },
  {
    key: "variantSku",
    label: "Variant SKU",
    defaultVisible: false,
    headerClass: "",
    cellClass: "max-w-[120px] truncate font-mono text-[10px] text-stone-700",
    render: (row) => row.variant?.sku || "—",
  },
  {
    key: "size",
    label: "Size",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-700",
    render: (row) => row.variant?.size || "—",
  },
  {
    key: "color",
    label: "Color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-stone-700",
    render: (row) => row.variant?.color || "—",
  },
];

export function defaultStaleVisibleColumnKeys() {
  return STALE_ORDER_TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);
}

export function loadStaleVisibleColumnsFromStorage() {
  const fallback = defaultStaleVisibleColumnKeys();
  try {
    const raw = localStorage.getItem(STALE_COLUMNS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validKeys = new Set(STALE_ORDER_TABLE_COLUMNS.map((c) => c.key));
    const keys = [...new Set(parsed.filter((k) => validKeys.has(k)))];
    STALE_ORDER_TABLE_COLUMNS.filter((c) => c.alwaysVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.unshift(c.key);
    });
    STALE_ORDER_TABLE_COLUMNS.filter((c) => c.defaultVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.push(c.key);
    });
    return keys.length ? keys : fallback;
  } catch {
    return fallback;
  }
}

export function persistStaleVisibleColumns(keys) {
  try {
    localStorage.setItem(STALE_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}
