import React from "react";

/** Shared stale-order list config (used by StaleOrdersPage). */

export const STALE_COLUMNS_STORAGE_KEY = "khush_admin_stale_order_visible_columns";

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
    cellClass: "font-medium text-slate-900 tabular-nums",
    render: (row) => row.orderId || "—",
  },
  {
    key: "orderStatus",
    label: "Order status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-600",
    render: (row) => row.orderStatus || "—",
  },
  {
    key: "confirmedAt",
    label: "Confirmed at",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-slate-600 whitespace-nowrap text-[10px]",
    render: (row) => formatStaleDate(row.confirmedAt || row.staleSince),
  },
  {
    key: "orderCreatedAt",
    label: "Order placed",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-600 whitespace-nowrap text-[10px]",
    render: (row) => formatStaleDate(row.orderCreatedAt),
  },
  {
    key: "hoursStale",
    label: "Hours stale",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-amber-800 font-semibold tabular-nums",
    render: (row) => (row.hoursStale != null ? Math.floor(row.hoursStale) : "—"),
  },
  {
    key: "sku",
    label: "SKU",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-slate-700 max-w-[120px] truncate",
    render: (row) => row.sku || "—",
  },
  {
    key: "variant",
    label: "Size / color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-700",
    render: (row) => staleVariantLabel(row.variant),
  },
  {
    key: "quantity",
    label: "Qty",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-700 tabular-nums",
    render: (row) => (row.quantity != null ? String(row.quantity) : "—"),
  },
  {
    key: "customerName",
    label: "Customer",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-slate-700 max-w-[140px] truncate",
    render: (row) => row.customerName || "—",
  },
  {
    key: "phone",
    label: "Phone",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-slate-600 tabular-nums",
    render: (row) => row.phone || "—",
  },
  {
    key: "city",
    label: "City",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-700",
    render: (row) => row.city || "—",
  },
  {
    key: "deliveryType",
    label: "Delivery",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-slate-600",
    render: (row) => row.deliveryType || "—",
  },
  {
    key: "finalPayable",
    label: "Order amount",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-800 tabular-nums font-medium",
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
    cellClass: "text-slate-600",
    render: (row) => row.paymentMode || "—",
  },
  {
    key: "paymentStatus",
    label: "Payment status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-600",
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
      if (!url) return <span className="text-[10px] text-slate-400">—</span>;
      return (
        <img
          src={url}
          alt=""
          className="mx-auto h-8 w-8 rounded object-cover border border-slate-200"
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
    cellClass: "text-slate-700 max-w-[120px] truncate font-mono text-[10px]",
    render: (row) => row.variant?.sku || "—",
  },
  {
    key: "size",
    label: "Size",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-700",
    render: (row) => row.variant?.size || "—",
  },
  {
    key: "color",
    label: "Color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-slate-700",
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
