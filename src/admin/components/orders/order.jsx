// src/pages/admin/Orders.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getOrders,
  getOrderItems,
  getSingleOrder,
  updateOrderItemStatus,
  updateWholeOrderStatus,
  getAssignmentView,
  assignItems,
  assignWholeOrder,
  unassignOrder,
  listDeliveryAgents,
  approveExchange,
  createForwardShipment,
  getInvoice,
  downloadShippingLabel,
  downloadManifest,
  downloadManufacturingSheetPdf,
  getStaleOrders,
  downloadStaleOrdersPdf,
  runStaleOrderAlertEmail,
  appendOrderNote,
} from "../../apis/Orderapi";
import toast from "react-hot-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  RefreshCw,
  AlertCircle,
  User,
  CreditCard,
  MapPin,
  DollarSign,
  ShoppingBag,
  UserCircle,
  UserMinus,
  UserPlus,
  ExternalLink,
  FileDown,
  Info,
  StickyNote,
  AlertTriangle,
  Mail,
  Columns3,
  ChevronDown,
} from "lucide-react";

const VIEW_ORDER = "order";
const VIEW_ITEM = "item";

/** Matches delivery rules + backend `items[].delivery.type` filter (NORMAL, ONE_DAY, 90_MIN) */
const DELIVERY_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "NORMAL", label: "Normal" },
  { value: "ONE_DAY", label: "One day" },
  { value: "90_MIN", label: "90 min" },
];

/** apiConnector rejects with a string message; success body is { success, message, data } */
const apiErrMessage = (err, fallback) =>
  typeof err === "string" ? err : err?.response?.data?.message || err?.message || fallback;

const getBackendErrorMessages = (err, fallback) => {
  const data = err?.response?.data ?? {};
  const messages = [];
  const push = (value) => {
    if (!value) return;
    const str = String(value).trim();
    if (!str) return;
    if (!messages.includes(str)) messages.push(str);
  };

  if (typeof err === "string") push(err);
  push(data?.message);
  push(data?.error);
  push(err?.message);

  const errors = data?.errors;
  if (Array.isArray(errors)) {
    errors.forEach((entry) => {
      if (typeof entry === "string") {
        push(entry);
        return;
      }
      push(entry?.msg || entry?.message || entry?.error);
      if (entry?.path && (entry?.msg || entry?.message)) {
        push(`${entry.path}: ${entry.msg || entry.message}`);
      }
    });
  } else if (errors && typeof errors === "object") {
    Object.entries(errors).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => push(`${key}: ${v}`));
      } else if (value && typeof value === "object") {
        push(value?.message || value?.msg || `${key}: ${JSON.stringify(value)}`);
      } else {
        push(`${key}: ${value}`);
      }
    });
  }

  if (messages.length === 0 && fallback) push(fallback);
  return messages;
};

const showBackendErrorsAsToasts = (err, fallback) => {
  const msgs = getBackendErrorMessages(err, fallback);
  msgs.slice(0, 6).forEach((m) => toast.error(m, { duration: 5500 }));
  return msgs[0] || fallback;
};

const getItemExchangeIds = (item) =>
  Array.isArray(item?.exchanges)
    ? item.exchanges.map((ex) => ex?._id).filter(Boolean).map(String)
    : [];

const getLatestExchangeId = (item) => {
  const exchanges = Array.isArray(item?.exchanges) ? [...item.exchanges] : [];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0]?._id ? String(exchanges[0]._id) : null;
};

const getLatestExchange = (item) => {
  const exchanges = Array.isArray(item?.exchanges) ? [...item.exchanges] : [];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0] || null;
};

/** Progress order for exchange line items — used when backend `item.status` lags Shiprocket/history. */
const EXCHANGE_FLOW_RANK = {
  EXCHANGE_REQUESTED: 10,
  EXCHANGE_APPROVED: 20,
  EXCHANGE_PICKUP_SCHEDULED: 30,
  EXCHANGE_OUT_FOR_PICKUP: 40,
  EXCHANGE_PICKED: 50,
  /** Return leg in transit to hub (Shiprocket reverse) */
  EXCHANGE_RETURN_IN_TRANSIT: 55,
  EXCHANGE_RECEIVED: 60,
  EXCHANGE_PROCESSING: 70,
  EXCHANGE_SHIPPED: 80,
  EXCHANGE_OUT_FOR_DELIVERY: 90,
  EXCHANGE_DELIVERED: 100,
  EXCHANGE_COMPLETED: 110,
};

const normalizeItemStatusToken = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const mapExchangeDocumentStatusToItemStatus = (raw) => {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const map = {
    requested: "EXCHANGE_REQUESTED",
    pending: "EXCHANGE_REQUESTED",
    approved: "EXCHANGE_APPROVED",
    rejected: "EXCHANGE_REJECTED",
    pickupscheduled: "EXCHANGE_PICKUP_SCHEDULED",
    outforpickup: "EXCHANGE_OUT_FOR_PICKUP",
    pickedup: "EXCHANGE_PICKED",
    picked: "EXCHANGE_PICKED",
    received: "EXCHANGE_RECEIVED",
    processing: "EXCHANGE_PROCESSING",
    shipped: "EXCHANGE_SHIPPED",
    outfordelivery: "EXCHANGE_OUT_FOR_DELIVERY",
    delivered: "EXCHANGE_DELIVERED",
    completed: "EXCHANGE_COMPLETED",
  };
  return map[k] ? normalizeItemStatusToken(map[k]) : null;
};

/** Shiprocket *return* shipment human status → order item status key */
const mapShiprocketReturnStatusToItemStatus = (raw) => {
  const u = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!u) return null;
  if (u.includes("RETURN PICKED UP") || u === "PICKED UP" || u.includes("RIDER PICKED"))
    return "EXCHANGE_PICKED";
  if (u.includes("RETURN IN TRANSIT") || (u.includes("IN TRANSIT") && u.includes("RETURN")))
    return "EXCHANGE_RETURN_IN_TRANSIT";
  if (u.includes("OUT FOR PICKUP") || u.includes("OUT_FOR_PICKUP") || u.includes("PICKUP ASSIGNED"))
    return "EXCHANGE_OUT_FOR_PICKUP";
  if (
    u.includes("SCHEDULED") ||
    u.includes("MANIFEST") ||
    u === "NEW" ||
    u.includes("LABEL GENERATED")
  )
    return "EXCHANGE_PICKUP_SCHEDULED";
  if (u.includes("DELIVERED") && (u.includes("RETURN") || u.includes("REVERSE") || u.includes("SELLER")))
    return "EXCHANGE_RECEIVED";
  return null;
};

/** Shiprocket *forward* replacement shipment — takes priority once return is created / in parallel */
const mapShiprocketForwardStatusToItemStatus = (raw) => {
  const u = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!u) return null;
  if (u.includes("DELIVERED")) return "EXCHANGE_DELIVERED";
  if (u.includes("OUT FOR DELIVERY") || u.includes("OUT_FOR_DELIVERY"))
    return "EXCHANGE_OUT_FOR_DELIVERY";
  if (
    u.includes("SHIPPED") ||
    u.includes("IN TRANSIT") ||
    u.includes("PICKED UP") ||
    u.includes("DISPATCHED")
  )
    return "EXCHANGE_SHIPPED";
  if (
    u.includes("NEW") ||
    u.includes("PROCESSING") ||
    u.includes("LABEL") ||
    u.includes("MANIFEST") ||
    u.includes("BOOKED")
  )
    return "EXCHANGE_PROCESSING";
  return null;
};

const pickHighestExchangeStatus = (candidates) => {
  let best = null;
  let bestRank = -1;
  for (const c of candidates) {
    if (!c) continue;
    const key = normalizeItemStatusToken(c);
    if (!key.startsWith("EXCHANGE_")) continue;
    const r = EXCHANGE_FLOW_RANK[key] ?? 0;
    if (r > bestRank) {
      bestRank = r;
      best = key;
    }
  }
  return bestRank >= 0 ? best : null;
};

/**
 * Status to show in the UI for an order line. Uses the max of: `item.status`,
 * `EXCHANGE_*` rows in `statusHistory`, and the latest `exchanges[]` sub-doc +
 * Shiprocket return/forward statuses (backend often leaves `item.status` stale).
 */
const getDisplayItemStatus = (item) => {
  const baseRaw = item?.status || "";
  const base = normalizeItemStatusToken(baseRaw);
  if (!item) return "";
  if (base === "EXCHANGE_REJECTED") return "EXCHANGE_REJECTED";
  if (!isExchangeLineItem(item)) return baseRaw || "";

  const candidates = [];

  const add = (s) => {
    const n = normalizeItemStatusToken(s);
    if (n.startsWith("EXCHANGE_")) candidates.push(n);
  };

  add(baseRaw);
  if (Array.isArray(item.statusHistory)) {
    for (const h of item.statusHistory) add(h?.status);
  }

  const ex = getLatestExchange(item);
  if (ex) {
    add(mapExchangeDocumentStatusToItemStatus(ex.status));
    add(
      mapShiprocketReturnStatusToItemStatus(
        ex.shiprocket?.returnOrder?.status,
      ),
    );
    add(
      mapShiprocketForwardStatusToItemStatus(
        ex.shiprocket?.forwardOrder?.status,
      ),
    );
  }

  const best = pickHighestExchangeStatus(candidates);
  return best || baseRaw || "";
};

const getDisplayOrderStatus = (order) => {
  const base = order?.status || order?.orderStatus || "";
  const items = order?.items;
  if (!Array.isArray(items) || items.length === 0) return base;
  if (items.length === 1) return getDisplayItemStatus(items[0]) || base;
  const exchangeItems = items.filter((it) => isExchangeLineItem(it));
  if (exchangeItems.length === 0) return base;
  const shown = exchangeItems
    .map((it) => getDisplayItemStatus(it))
    .filter(Boolean);
  if (shown.length === 0) return base;
  const ranked = pickHighestExchangeStatus(shown);
  return ranked || base;
};

/** Rebuild a line-like object from an admin “order item” list row for display helpers. */
const lineItemFromOrderItemRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const nested = row.item && typeof row.item === "object" ? row.item : {};
  return {
    ...nested,
    status: row.itemStatus ?? nested.status ?? "",
    statusHistory: nested.statusHistory,
    exchanges: nested.exchanges,
  };
};

const STORE_PUBLIC_ORIGIN =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_STORE_URL
    ? String(import.meta.env.VITE_PUBLIC_STORE_URL).trim().replace(/\/$/, "")
    : "https://khushpehno.com";

function slugifyForStoreProduct(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/['".,!?()[\]{}:;@#$%^&*+=~`|\\/<>]/g, " ")
    .replace(/&/g, " and ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getStorefrontProductUrl(itemId, itemLike) {
  const idStr = itemId != null ? String(itemId) : "";
  if (!idStr) return STORE_PUBLIC_ORIGIN;
  const label = itemLike?.name || itemLike?.sku || "";
  const slug = slugifyForStoreProduct(label);
  const path = slug ? `/product/${slug}/${idStr}` : `/product/${idStr}`;
  return `${STORE_PUBLIC_ORIGIN}${path}`;
}

function collectItemLikeImageUrls(itemLike) {
  const urls = [];
  const push = (u) => {
    if (typeof u !== "string") return;
    const t = u.trim();
    if (t && !urls.includes(t)) urls.push(t);
  };
  if (!itemLike || typeof itemLike !== "object") return urls;
  push(itemLike.variant?.imageUrl);
  if (Array.isArray(itemLike.variant?.images)) {
    itemLike.variant.images.forEach((x) => {
      if (typeof x === "string") push(x);
      else if (x?.url) push(x.url);
    });
  }
  if (Array.isArray(itemLike.images)) {
    itemLike.images.forEach((x) => {
      if (typeof x === "string") push(x);
      else if (x?.url) push(x.url);
    });
  }
  if (Array.isArray(itemLike.variants)) {
    itemLike.variants.forEach((v) => {
      push(v?.imageUrl);
      if (Array.isArray(v?.images)) {
        v.images.forEach((img) => {
          if (typeof img === "string") push(img);
          else if (img?.url) push(img.url);
        });
      }
    });
  }
  return urls;
}

function firstOrderLineItem(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items[0] || null;
}

function itemLikeFromListRow(row) {
  return row?.item && typeof row.item === "object" ? row.item : {};
}

function TableItemImageThumb({ itemLike, onPickImage, sizeClass = "h-10 w-10" }) {
  const imgs = collectItemLikeImageUrls(itemLike);
  if (!imgs[0]) {
    return (
      <div
        className={`flex ${sizeClass} items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-[9px] text-gray-400`}
      >
        —
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onPickImage?.(imgs[0])}
      className={`${sizeClass} shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50`}
      title="View image"
    >
      <img src={imgs[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
    </button>
  );
}

function TableStoreLink({ itemId, itemLike }) {
  const url = getStorefrontProductUrl(itemId, itemLike);
  if (!itemId) return <span className="text-xs text-gray-400">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-700 hover:text-indigo-900"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={12} className="shrink-0" />
      Store
    </a>
  );
}

function StoreItemInfoTrigger({ itemId, itemLike, quantity, onOpenDetails }) {
  const url = getStorefrontProductUrl(itemId, itemLike);
  const qtyLabel =
    quantity != null && quantity !== "" ? String(quantity) : "—";
  return (
    <div className="relative flex shrink-0 self-start pt-0.5 group">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails?.();
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label="Store product link and images"
      >
        <Info className="h-4 w-4" strokeWidth={2} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-[80] mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-2.5 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
      >
        <p className="text-[11px] font-semibold text-gray-900">
          Quantity: {qtyLabel}
        </p>
        <p className="mt-1 break-all font-mono text-[10px] leading-snug text-indigo-800">
          {url}
        </p>
        <p className="mt-1 text-[10px] text-gray-500">Click icon for images</p>
      </div>
    </div>
  );
}

function StoreOrderInfoTrigger({ order, onOpenDetails }) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const totalQty = items.reduce((s, it) => s + Number(it?.quantity ?? 0), 0);
  const single = items.length === 1;
  const first = single ? items[0] : null;
  const url = first ? getStorefrontProductUrl(first.itemId, first) : null;
  return (
    <div className="relative flex shrink-0 justify-center group">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails?.();
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label="Store links and images for order lines"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-[80] mt-1 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2.5 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
      >
        <p className="text-[11px] font-semibold text-gray-900">
          {items.length} line{items.length === 1 ? "" : "s"} · Qty total:{" "}
          {totalQty || "—"}
        </p>
        {single && url ? (
          <p className="mt-1 break-all font-mono text-[10px] leading-snug text-indigo-800">
            {url}
          </p>
        ) : (
          <p className="mt-1 text-[10px] text-gray-600">
            Multiple products — click for links and images
          </p>
        )}
        <p className="mt-1 text-[10px] text-gray-500">Click icon for gallery</p>
      </div>
    </div>
  );
}

/** Same idea as manufacturing PDF (Asia/Kolkata, en-IN). */
function formatManufacturingModalDate(d) {
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

const STALE_COLUMNS_STORAGE_KEY = "khush_admin_stale_order_visible_columns";

function staleVariantLabel(variant) {
  const v = variant || {};
  const parts = [v.size, v.color].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

/** Configurable stale-order table columns (admin picks visible fields). */
const STALE_ORDER_TABLE_COLUMNS = [
  {
    key: "orderId",
    label: "Order ID",
    defaultVisible: true,
    alwaysVisible: true,
    headerClass: "",
    cellClass: "font-medium text-gray-900 tabular-nums",
    render: (row) => row.orderId || "—",
  },
  {
    key: "orderStatus",
    label: "Order status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-600",
    render: (row) => row.orderStatus || "—",
  },
  {
    key: "confirmedAt",
    label: "Confirmed at",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-gray-600 whitespace-nowrap text-xs",
    render: (row) => formatManufacturingModalDate(row.confirmedAt || row.staleSince),
  },
  {
    key: "orderCreatedAt",
    label: "Order placed",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-600 whitespace-nowrap text-xs",
    render: (row) => formatManufacturingModalDate(row.orderCreatedAt),
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
    cellClass: "text-gray-700 max-w-[140px] truncate",
    render: (row) => row.sku || "—",
  },
  {
    key: "variant",
    label: "Size / color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700",
    render: (row) => staleVariantLabel(row.variant),
  },
  {
    key: "quantity",
    label: "Qty",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700 tabular-nums",
    render: (row) => (row.quantity != null ? String(row.quantity) : "—"),
  },
  {
    key: "customerName",
    label: "Customer",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-gray-700 max-w-[160px] truncate",
    render: (row) => row.customerName || "—",
  },
  {
    key: "phone",
    label: "Phone",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-gray-600 tabular-nums",
    render: (row) => row.phone || "—",
  },
  {
    key: "city",
    label: "City",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700",
    render: (row) => row.city || "—",
  },
  {
    key: "deliveryType",
    label: "Delivery",
    defaultVisible: true,
    headerClass: "",
    cellClass: "text-gray-600",
    render: (row) => row.deliveryType || "—",
  },
  {
    key: "finalPayable",
    label: "Order amount",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-800 tabular-nums font-medium",
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
    cellClass: "text-gray-600",
    render: (row) => row.paymentMode || "—",
  },
  {
    key: "paymentStatus",
    label: "Payment status",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-600",
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
      if (!url) return <span className="text-xs text-gray-400">—</span>;
      return (
        <img src={url} alt="" className="mx-auto h-10 w-10 rounded object-cover border border-gray-200" loading="lazy" />
      );
    },
  },
  {
    key: "variantSku",
    label: "Variant SKU",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700 max-w-[140px] truncate font-mono text-xs",
    render: (row) => row.variant?.sku || "—",
  },
  {
    key: "size",
    label: "Size",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700",
    render: (row) => row.variant?.size || "—",
  },
  {
    key: "color",
    label: "Color",
    defaultVisible: false,
    headerClass: "",
    cellClass: "text-gray-700",
    render: (row) => row.variant?.color || "—",
  },
];

function defaultStaleVisibleColumnKeys() {
  return STALE_ORDER_TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);
}

function loadStaleVisibleColumnsFromStorage() {
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

function persistStaleVisibleColumns(keys) {
  try {
    localStorage.setItem(STALE_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}

const ORDER_LIST_COLUMNS_STORAGE_KEY = "khush_admin_order_list_visible_columns";
const ITEM_LIST_COLUMNS_STORAGE_KEY = "khush_admin_item_list_visible_columns";
const ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY = "khush_admin_order_detail_item_visible_columns";

/** By order — main table column config (render fns added inside Orders). */
const ORDER_LIST_TABLE_COLUMNS = [
  { key: "info", label: "Store gallery", defaultVisible: true, alwaysVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Order date", defaultVisible: true },
  { key: "orderDateTime", label: "Order date & time", defaultVisible: false },
  { key: "customer", label: "Customer name", defaultVisible: true },
  { key: "phone", label: "Customer phone", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: false },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "productName", label: "Dress / product name", defaultVisible: false },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "lineSku", label: "Line SKU", defaultVisible: false },
  { key: "variantSku", label: "Variant SKU", defaultVisible: false },
  { key: "size", label: "Size", defaultVisible: false },
  { key: "color", label: "Color", defaultVisible: false },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "total", label: "Order amount", defaultVisible: true },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "courier", label: "Courier / Shiprocket", defaultVisible: true },
  { key: "city", label: "City", defaultVisible: false },
];

/** By item — table view column config. */
const ITEM_LIST_TABLE_COLUMNS = [
  { key: "info", label: "Store gallery", defaultVisible: true, alwaysVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Order date", defaultVisible: true },
  { key: "orderDateTime", label: "Order date & time", defaultVisible: false },
  { key: "customer", label: "Customer name", defaultVisible: true },
  { key: "phone", label: "Customer phone", defaultVisible: true },
  { key: "product", label: "Dress / product name", defaultVisible: true },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "itemId", label: "Item ID", defaultVisible: false },
  { key: "sku", label: "Line SKU", defaultVisible: true },
  { key: "variantSku", label: "Variant SKU", defaultVisible: false },
  { key: "size", label: "Size", defaultVisible: true },
  { key: "color", label: "Color", defaultVisible: true },
  { key: "variant", label: "Size / color (combined)", defaultVisible: false },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "status", label: "Line status", defaultVisible: true },
  { key: "delivery", label: "Delivery", defaultVisible: true },
  { key: "shiprocket", label: "Shiprocket", defaultVisible: false },
];

/** Order detail — line items table (data columns; status/ship/driver/update stay fixed). */
const ORDER_DETAIL_ITEM_DATA_COLUMNS = [
  { key: "image", label: "Image", defaultVisible: true },
  { key: "productName", label: "Dress / product name", defaultVisible: true },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "itemId", label: "Item ID", defaultVisible: false },
  { key: "lineSku", label: "Line SKU", defaultVisible: true },
  { key: "variantSku", label: "Variant SKU", defaultVisible: true },
  { key: "size", label: "Size", defaultVisible: true },
  { key: "color", label: "Color", defaultVisible: true },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "price", label: "Price", defaultVisible: true },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "customerName", label: "Customer name", defaultVisible: false },
  { key: "customerPhone", label: "Customer phone", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
];

function defaultVisibleKeysFor(columns) {
  return columns.filter((c) => c.defaultVisible).map((c) => c.key);
}

function loadVisibleColumnsFromStorage(storageKey, columns) {
  const fallback = defaultVisibleKeysFor(columns);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validKeys = new Set(columns.map((c) => c.key));
    const keys = [...new Set(parsed.filter((k) => validKeys.has(k)))];
    columns.filter((c) => c.alwaysVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.unshift(c.key);
    });
    columns.filter((c) => c.defaultVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.push(c.key);
    });
    return keys.length ? keys : fallback;
  } catch {
    return fallback;
  }
}

function persistVisibleColumns(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

function ColumnPickerDropdown({
  columns,
  visibleKeys,
  onToggle,
  onReset,
  onSelectAll,
  open,
  onOpenChange,
  badgeClass = "bg-indigo-100 text-indigo-900",
}) {
  const activeCount = columns.filter((c) => visibleKeys.includes(c.key)).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-expanded={open}
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {activeCount}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-700 mb-2">Choose columns to show</p>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              const locked = !!col.alwaysVisible;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    locked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(col.key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-800">{col.label}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function manufacturingPaymentLabel(payment) {
  if (!payment || typeof payment !== "object") return "—";
  const mode = payment.mode != null ? String(payment.mode) : "";
  const status = payment.status != null ? String(payment.status) : "";
  if (mode && status) return `${mode} / ${status}`;
  if (mode) return mode;
  if (status) return status;
  return "—";
}

function ManufacturingLineCard({ line, lineIndex, totalLines, onPickImage }) {
  const item = line.itemLike && typeof line.itemLike === "object" ? line.itemLike : {};
  const variant = item.variant && typeof item.variant === "object" ? item.variant : {};
  const ctx = line.ctx && typeof line.ctx === "object" ? line.ctx : {};
  const u = getStorefrontProductUrl(line.itemId, item);
  const imgs = collectItemLikeImageUrls(item);
  const qtyStr =
    line.quantity != null && line.quantity !== ""
      ? String(line.quantity)
      : item.quantity != null
        ? String(item.quantity)
        : "—";
  const custName = ctx.user?.name || ctx.address?.name || "—";
  const phone =
    [ctx.user?.countryCode, ctx.user?.phoneNumber].filter(Boolean).join("") ||
    (ctx.address?.phone ? String(ctx.address.phone) : "") ||
    "—";
  const pay = manufacturingPaymentLabel(ctx.payment);

  const field = (label, value, colClass = "") => (
    <div className={`min-w-0 ${colClass}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-xs font-medium leading-snug text-gray-900">
        {value != null && value !== "" ? String(value) : "—"}
      </dd>
    </div>
  );

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${lineIndex > 0 ? "mt-4" : ""}`}
    >
      {totalLines > 1 ? (
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          Line {lineIndex + 1} of {totalLines}
        </p>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className="mx-auto flex w-full max-w-[10rem] shrink-0 flex-col items-center lg:mx-0">
          {imgs[0] ? (
            <button
              type="button"
              onClick={() => onPickImage?.(imgs[0])}
              className="h-36 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm lg:h-40"
            >
              <img
                src={imgs[0]}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center text-[10px] text-gray-400 lg:h-40">
              No image
            </div>
          )}
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2.5 text-left sm:gap-x-5 lg:grid-cols-3">
          {field("Order ID", ctx.orderId)}
          {field("Order date", formatManufacturingModalDate(ctx.orderCreatedAt))}
          {field("Quantity", qtyStr)}
          {field("Dress / product name", item.name, "col-span-2 lg:col-span-3")}
          {field("Catalog product ID", item.productId)}
          {field("Line SKU", item.sku)}
          {field("Variant SKU", variant.sku)}
          {field("Size", variant.size)}
          {field("Color", variant.color)}
          {field("Payment (order)", pay, "col-span-2 lg:col-span-3")}
          {field("Ship-to pincode", ctx.address?.pincode)}
          {field("Customer name", custName)}
          {field("Customer phone", phone)}
          <div className="col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 lg:col-span-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-indigo-900">
              Store link
            </dt>
            <dd className="mt-1">
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1 break-all text-xs font-medium text-indigo-700 hover:text-indigo-900"
              >
                <span className="min-w-0 flex-1">{u}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </a>
            </dd>
          </div>
        </dl>
      </div>
      {imgs.length > 1 ? (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            More images
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {imgs.slice(1).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => onPickImage?.(src)}
                className="overflow-hidden rounded-md border border-gray-200 bg-white"
              >
                <img
                  src={src}
                  alt=""
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Latest timeline entry (by createdAt) — shows previous → current transition */
const getLatestStatusHistoryEntry = (item) => {
  const arr = Array.isArray(item?.statusHistory) ? [...item.statusHistory] : [];
  if (arr.length === 0) return null;
  arr.sort(
    (a, b) =>
      new Date(a?.createdAt || 0).getTime() -
      new Date(b?.createdAt || 0).getTime(),
  );
  return arr[arr.length - 1];
};

const formatStatusTokenForUi = (token) => {
  if (token == null || token === "") return "—";
  const s = String(token).trim();
  if (!s) return "—";
  const t = s.toUpperCase().replace(/_/g, " ");
  return t.charAt(0) + t.slice(1).toLowerCase();
};

const getLatestExchangeForwardOrder = (item) => {
  const latest = getLatestExchange(item);
  const forward = latest?.shiprocket?.forwardOrder;
  if (!forward || typeof forward !== "object") return null;
  return forward;
};


const extractExchangeImageUrls = (exchange) => {
  if (!exchange || typeof exchange !== "object") return [];
  const candidates = [
    exchange.images,
    exchange.imageUrls,
    exchange.uploadedImages,
    exchange.exchangeImages,
    exchange.proofImages,
    exchange.media,
    exchange.mediaUrls,
    exchange.photos,
  ];
  const urls = [];
  candidates.forEach((entry) => {
    if (!entry) return;
    const list = Array.isArray(entry) ? entry : [entry];
    list.forEach((v) => {
      const value =
        typeof v === "string"
          ? v
          : v?.url || v?.secure_url || v?.imageUrl || v?.src || null;
      if (value) urls.push(String(value));
    });
  });
  return Array.from(new Set(urls.filter(Boolean)));
};

const getExchangeReason = (exchange) => {
  if (!exchange || typeof exchange !== "object") return "";
  const reason =
    exchange.reason ||
    exchange.exchangeReason ||
    exchange.requestReason ||
    exchange.note ||
    "";
  return String(reason || "").trim();
};

const canDownloadInvoice = (item) => {
  const status = String(item?.status || "").toUpperCase();
  // Show invoice for every line state except the earliest pre-fulfillment ones.
  // (Shipped, out for delivery, delivered, exchange*, cancelled, etc. all allowed.)
  return !["CREATED", "CONFIRMED"].includes(status);
};

const isExchangeStatus = (status) =>
  String(status || "").toUpperCase().startsWith("EXCHANGE_");

const isExchangeLineItem = (item) =>
  isExchangeStatus(item?.status) || (Array.isArray(item?.exchanges) && item.exchanges.length > 0);

const isExchangeOrderEntry = (order) => {
  if (isExchangeStatus(order?.status || order?.orderStatus)) return true;
  return Array.isArray(order?.items) && order.items.some((item) => isExchangeLineItem(item));
};

/** Logs in dev, or when `VITE_DEBUG_ORDERS=true` in `.env` (then rebuild). */
const ORDERS_DEBUG =
  import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_ORDERS ?? "") === "true";

const dbgOrders = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  if (rest.length === 0) console.log(`[Orders] ${label}`);
  else console.log(`[Orders] ${label}`, ...rest);
};

const dbgOrdersVerbose = (label, ...rest) => {
  if (!ORDERS_DEBUG) return;
  console.debug(`[Orders] ${label}`, ...rest);
};

const isNormalDeliveryLine = (item) =>
  String(item?.delivery?.type || "").toUpperCase() === "NORMAL";

/** Shiprocket / tracking for a line item (NORMAL courier shipments). */
const getNormalDeliveryShiprocket = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const sr = item.shiprocket || {};
  const awb = sr.awbCode || item.trackingId || null;
  const hasAny =
    awb ||
    sr.orderId != null ||
    sr.shipmentId != null ||
    (sr.status && String(sr.status).trim()) ||
    (item.courier && String(item.courier).trim());
  if (!hasAny) return null;
  return {
    awb,
    trackingUrl:
      sr.trackingUrl ||
      (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : null),
    status: sr.status || null,
    shiprocketOrderId: sr.orderId ?? null,
    // Backend download endpoints often expect shipment group id.
    shipmentId: sr.shipmentId ?? item.shipmentId ?? null,
    shipmentGroupId:
      sr.shipmentGroupId ??
      item.shipmentGroupId ??
      sr.shipment_group_id ??
      item.shipment_group_id ??
      null,
    courier: item.courier || null,
    labelUrl: sr.labelUrl || null,
    invoiceUrl: sr.invoiceUrl || null,
  };
};

const getExchangeForwardShiprocket = (item) => {
  const fwd = getLatestExchangeForwardOrder(item);
  if (!fwd) return null;
  const awb = fwd.awbCode || item?.trackingId || null;
  const hasAny =
    awb ||
    fwd.orderId != null ||
    fwd.shipmentId != null ||
    (fwd.status && String(fwd.status).trim()) ||
    (fwd.courierName && String(fwd.courierName).trim());
  if (!hasAny) return null;
  return {
    awb,
    trackingUrl:
      fwd.trackingUrl ||
      (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : null),
    status: fwd.status || null,
    shiprocketOrderId: fwd.orderId ?? null,
    shipmentId: fwd.shipmentId ?? null,
    shipmentGroupId: null,
    courier: fwd.courierName || item?.courier || null,
    labelUrl: fwd.labelUrl || null,
    invoiceUrl: fwd.invoiceUrl || null,
  };
};

const getLineShiprocket = (item) => {
  if (!item) return null;
  if (isExchangeStatus(item?.status)) {
    const forward = getExchangeForwardShiprocket(item);
    if (forward) return forward;
  }
  return getNormalDeliveryShiprocket(item);
};

const getOrderNormalShiprocketPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getNormalDeliveryShiprocket(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
};

const getOrderShiprocketPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getLineShiprocket(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
};

const getOrderShipmentIds = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const ids = items.flatMap((it) => {
    const sr = getLineShiprocket(it);
    const forward = getLatestExchangeForwardOrder(it);
    return [
      sr?.shipmentId,
      sr?.shipmentGroupId,
      forward?.shipmentId,
      it?.shipmentId,
      it?.shipmentGroupId,
      it?.shiprocket?.shipmentId,
      it?.shiprocket?.shipmentGroupId,
      it?.exchanges?.[0]?.shiprocket?.forwardOrder?.shipmentId,
    ]
      .filter(Boolean)
      .map(String);
  });
  return Array.from(new Set(ids));
};

const getOrderForwardPreview = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    const forward = getLatestExchangeForwardOrder(item);
    if (forward?.shipmentId || forward?.trackingUrl || forward?.awbCode) {
      return forward;
    }
  }
  return null;
};

const hasNormalDeliveryInOrder = (order) =>
  Array.isArray(order?.items) &&
  order.items.some((item) => isNormalDeliveryLine(item));

const getOrderForwardCreateTarget = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    if (!isNormalDeliveryLine(item)) continue;
    if (!isExchangeStatus(item?.status)) continue;
    const latestExchange = getLatestExchange(item);
    if (!latestExchange?._id) continue;
    return { exchangeId: String(latestExchange._id), item };
  }
  return null;
};

/** Merge admin item-row shape (deliveryType + nested item) into a line for shiprocket helpers */
const shiprocketFromItemRow = (row) => {
  if (!row) return null;
  const line = {
    ...(row.item && typeof row.item === "object" ? row.item : {}),
    delivery: { type: row.deliveryType || row.item?.delivery?.type },
  };
  return getLineShiprocket(line);
};

function ShiprocketDetails({ sr, compact }) {
  if (!sr) return <span className="text-gray-400">—</span>;
  if (compact) {
    return (
      <div className="min-w-0 w-full space-y-0.5">
        {sr.trackingUrl ? (
          <a
            href={sr.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-0.5 text-[11px] font-mono text-indigo-600 hover:underline truncate"
            title={sr.awb || "Track"}
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">{sr.awb || "Track"}</span>
          </a>
        ) : (
          <span className="block truncate font-mono text-[11px] text-gray-800" title={sr.awb || undefined}>
            {sr.awb || "—"}
          </span>
        )}
        {sr.status && (
          <p className="truncate text-[10px] leading-tight text-gray-500" title={sr.status}>
            {sr.status}
          </p>
        )}
        {sr.courier && (
          <p className="truncate text-[10px] leading-tight text-gray-400" title={sr.courier}>
            {sr.courier}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold uppercase text-sky-700">Shiprocket</span>
        {sr.status && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">{sr.status}</span>
        )}
      </div>
      {sr.awb && (
        <p className="font-mono text-xs">
          AWB:{" "}
          {sr.trackingUrl ? (
            <a
              href={sr.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
            >
              {sr.awb}
              <ExternalLink size={12} />
            </a>
          ) : (
            sr.awb
          )}
        </p>
      )}
      {sr.courier && <p className="text-xs text-gray-600">Courier: {sr.courier}</p>}
      {(sr.shiprocketOrderId != null || sr.shipmentId != null) && (
        <p className="text-xs text-gray-500">
          {sr.shiprocketOrderId != null && <>SR order: {sr.shiprocketOrderId}</>}
          {sr.shiprocketOrderId != null && sr.shipmentId != null && " · "}
          {sr.shipmentId != null && <>Shipment: {sr.shipmentId}</>}
        </p>
      )}
      {(sr.labelUrl || sr.invoiceUrl) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {sr.labelUrl && (
            <span className="text-xs font-medium text-indigo-600">
              Label ready
            </span>
          )}
          {sr.invoiceUrl && (
            <span className="text-xs font-medium text-indigo-600">
              Invoice ready
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const Orders = ({ exchangeOnly = false, defaultViewMode = VIEW_ORDER }) => {
  const [viewMode, setViewMode] = useState(
    defaultViewMode === VIEW_ITEM ? VIEW_ITEM : VIEW_ORDER,
  ); // "order" | "item"
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  /** Filters both By order and By item lists (sent as ?deliveryType= to API) */
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Item-based view state
  const [orderItems, setOrderItems] = useState([]);
  const [itemPagination, setItemPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [updatingWholeOrder, setUpdatingWholeOrder] = useState(false);
  const [wholeOrderNewStatus, setWholeOrderNewStatus] = useState("");
  const [itemPage, setItemPage] = useState(1);
  // Load all items when viewing order details (no per-order item pagination)
  const itemLimit = 100;
  // Multi-select items for bulk status update
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [updatingBulk, setUpdatingBulk] = useState(false);
  // Delivery assignment modal
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentOrderId, setAssignmentOrderId] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState("whole");
  const [assignmentItemIds, setAssignmentItemIds] = useState([]);
  const [assignmentItemId, setAssignmentItemId] = useState(null);
  const [pendingNewStatus, setPendingNewStatus] = useState(null);
  const [deliveryAgentsList, setDeliveryAgentsList] = useState([]);
  const [selectedDeliveryAgentId, setSelectedDeliveryAgentId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState(null);
  // Exchange rejection: require note before updating to EXCHANGE_REJECTED
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [pendingRejection, setPendingRejection] = useState(null); // { orderId, itemId }
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);
  const [rejectionError, setRejectionError] = useState(null);
  // When true, assignment modal only assigns driver (no status update) - used after exchange status change
  const [assignmentAssignOnly, setAssignmentAssignOnly] = useState(false);
  // When set, we opened from "By item" view: show only this item's details (item-based flow), not full order
  const [selectedItemIdFromListView, setSelectedItemIdFromListView] =
    useState(null);
  // Assignment view for current order (for Reassign / Remove driver)
  const [orderAssignments, setOrderAssignments] = useState(null);
  const [unassignLoading, setUnassignLoading] = useState(false);
  const [unassignError, setUnassignError] = useState(null);
  const [docDownloadLoading, setDocDownloadLoading] = useState(false);
  const [docActionType, setDocActionType] = useState(null); // "label" | "manifest" | "invoice" | "forward"
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const [storeInfoModal, setStoreInfoModal] = useState(null);
  const [downloadedManifestShipments, setDownloadedManifestShipments] = useState(
    () => new Set(),
  );
  const [manufacturingPdfLoading, setManufacturingPdfLoading] = useState(false);
  const [staleModalOpen, setStaleModalOpen] = useState(false);
  const [staleOrders, setStaleOrders] = useState([]);
  const [staleMeta, setStaleMeta] = useState({
    totalMatched: 0,
    truncated: false,
    olderThanHours: 24,
  });
  const [staleLoading, setStaleLoading] = useState(false);
  const [stalePdfLoading, setStalePdfLoading] = useState(false);
  const [staleEmailLoading, setStaleEmailLoading] = useState(false);
  const [staleHours, setStaleHours] = useState(24);
  const [staleSearch, setStaleSearch] = useState("");
  const [staleVisibleColumns, setStaleVisibleColumns] = useState(
    loadStaleVisibleColumnsFromStorage,
  );
  const [staleColumnsOpen, setStaleColumnsOpen] = useState(false);

  const [orderListVisibleColumns, setOrderListVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(ORDER_LIST_COLUMNS_STORAGE_KEY, ORDER_LIST_TABLE_COLUMNS),
  );
  const [orderListColumnsOpen, setOrderListColumnsOpen] = useState(false);
  const [itemListVisibleColumns, setItemListVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(ITEM_LIST_COLUMNS_STORAGE_KEY, ITEM_LIST_TABLE_COLUMNS),
  );
  const [itemListColumnsOpen, setItemListColumnsOpen] = useState(false);
  const [itemListViewMode, setItemListViewMode] = useState(() => {
    try {
      return localStorage.getItem("khush_admin_item_list_view_mode") === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });
  const [orderDetailItemVisibleColumns, setOrderDetailItemVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(
      ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY,
      ORDER_DETAIL_ITEM_DATA_COLUMNS,
    ),
  );
  const [orderDetailColumnsOpen, setOrderDetailColumnsOpen] = useState(false);

  const staleActiveColumns = useMemo(
    () =>
      STALE_ORDER_TABLE_COLUMNS.filter((col) => staleVisibleColumns.includes(col.key)),
    [staleVisibleColumns],
  );
  // When Reassign is used: unassign this assignment first, then assign new driver
  const [reassignAssignmentId, setReassignAssignmentId] = useState(null);
  const [orderNotesModalOpen, setOrderNotesModalOpen] = useState(false);
  const [orderNotesModalOrderId, setOrderNotesModalOrderId] = useState(null);
  const [orderNotesModalLoading, setOrderNotesModalLoading] = useState(false);
  const [orderNotesModalNotes, setOrderNotesModalNotes] = useState([]);
  const [orderNotesModalDraft, setOrderNotesModalDraft] = useState("");
  const [orderNotesModalSaving, setOrderNotesModalSaving] = useState(false);

  useEffect(() => {
    if (exchangeOnly && viewMode !== VIEW_ORDER) {
      setViewMode(VIEW_ORDER);
    }
  }, [exchangeOnly, viewMode]);

  const resolveDocUrl = (res) => {
    if (!res) return null;
    if (typeof res === "string") return res;
    if (res instanceof Blob) return null; // handled in openDocUrl
    const data = res?.data ?? res;
    return (
      res?.url ||
      res?.data?.url ||
      data?.url ||
      data?.invoice_url ||
      data?.label_url ||
      data?.manifest_url ||
      data?.manifestUrl ||
      res?.invoice_url ||
      res?.label_url ||
      res?.manifest_url ||
      data?.fileUrl ||
      data?.downloadUrl ||
      data?.invoiceUrl ||
      data?.labelUrl ||
      res?.invoiceUrl ||
      res?.labelUrl ||
      null
    );
  };

  const openDocUrl = (urlOrBlob, fallbackMsg) => {
    if (!urlOrBlob) {
      toast.error(fallbackMsg);
      return;
    }
    if (urlOrBlob instanceof Blob) {
      const objectUrl = URL.createObjectURL(urlOrBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      return;
    }

    const url = typeof urlOrBlob === "string" ? urlOrBlob : null;
    if (!url) {
      toast.error(fallbackMsg);
      return;
    }
    const normalizedUrl =
      typeof url === "string" && url.startsWith("/")
        ? new URL(url, window.location.origin).href
        : url;
    // Use a temporary anchor click to let the browser decide (download vs open).
    const a = document.createElement("a");
    a.href = normalizedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleGetInvoiceClick = async (orderObj, itemObj) => {
    if (!orderObj || !itemObj) return;
    setDocDownloadLoading(true);
    try {
      const orderIds = [
        orderObj?.orderId,
        orderObj?._id,
        orderObj?.id,
        orderObj?.order_id,
      ]
        .filter(Boolean)
        .map(String);
      const itemIds = [
        itemObj?.itemId,
        itemObj?._id,
        itemObj?.id,
        itemObj?.productItemId,
        itemObj?.item_id,
      ]
        .filter(Boolean)
        .map(String);

      const uniqueOrderIds = Array.from(new Set(orderIds));
      const uniqueItemIds = Array.from(new Set(itemIds));

      let lastErr = null;

      for (const oid of uniqueOrderIds) {
        for (const iid of uniqueItemIds) {
          try {
            const res = await getInvoice(oid, iid);
            // apiConnector returns response.data — usually JSON:
            // { is_invoice_created: true, invoice_url: "https://...pdf" }
            let payload = res?.data ?? res;

            if (typeof Blob !== "undefined" && payload instanceof Blob) {
              const mime = (payload.type || "").toLowerCase();
              const maybeJson =
                !mime ||
                mime.includes("json") ||
                mime === "text/plain";
              if (maybeJson) {
                try {
                  payload = JSON.parse(await payload.text());
                } catch {
                  lastErr = new Error("Invalid invoice response from server");
                  continue;
                }
              } else {
                openDocUrl(payload, "Failed to download invoice");
                return;
              }
            }

            const url =
              payload?.invoice_url ||
              payload?.invoiceUrl ||
              payload?.url ||
              res?.invoice_url ||
              res?.invoiceUrl ||
              resolveDocUrl(res) ||
              resolveDocUrl(payload);

            if (url) {
              openDocUrl(url, "Failed to download invoice");
              return;
            }

            lastErr = new Error(
              payload?.message ||
                res?.message ||
                "Invoice not available for this delivery line"
            );
          } catch (err) {
            lastErr = err;
          }
        }
      }

      toast.error(
        apiErrMessage(lastErr, "Failed to download invoice (404/Not Found)")
      );
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error(apiErrMessage(err, "Failed to download invoice"));
    } finally {
      setDocDownloadLoading(false);
    }
  };

  const handleDownloadLabelsClick = async (shipmentIds) => {
    const ids = Array.isArray(shipmentIds) ? shipmentIds.filter(Boolean) : [];
    if (!ids.length) return;
    setDocActionType("label");
    setDocDownloadLoading(true);
    try {
      const numericIds = ids
        .map((id) => {
          const n = Number(id);
          return Number.isFinite(n) ? n : null;
        })
        .filter((v) => v !== null);

      const getLabelUrlFromResponse = (res) => {
        const data = res?.data ?? res;
        return (
          data?.label_url ||
          data?.labelUrl ||
          resolveDocUrl(res)
        );
      };

      let res = await downloadShippingLabel(ids);
      let data = res?.data ?? res;
      let labelUrl = getLabelUrlFromResponse(res);

      // Some backends expect numeric shipment ids; retry once with numbers.
      if (!labelUrl && numericIds.length) {
        res = await downloadShippingLabel(numericIds);
        data = res?.data ?? res;
        labelUrl = getLabelUrlFromResponse(res);
      }

      if (labelUrl) {
        openDocUrl(labelUrl, "Failed to download shipping label(s)");
        return;
      }

      const msg = data?.message || "Failed to download shipping label(s)";
      const checkIds = Array.isArray(data?.check_ids)
        ? data.check_ids.join(", ")
        : null;
      toast.error(checkIds ? `${msg} (check_ids: ${checkIds})` : msg);
    } catch (err) {
      console.error("Shipping label download failed:", err);
      toast.error(apiErrMessage(err, "Failed to download shipping label(s)"));
    } finally {
      setDocDownloadLoading(false);
      setDocActionType(null);
    }
  };

  const handleDownloadManifestClick = async (shipmentIds) => {
    const ids = Array.isArray(shipmentIds) ? shipmentIds.filter(Boolean) : [];
    if (!ids.length) return;

    const alreadyDownloaded = ids.filter((id) =>
      downloadedManifestShipments.has(String(id)),
    );
    const pendingIds = ids.filter(
      (id) => !downloadedManifestShipments.has(String(id)),
    );

    if (!pendingIds.length) {
      toast.error("Manifest already downloaded for this shipment.");
      return;
    }
    if (alreadyDownloaded.length) {
      toast.error(
        "Manifest already downloaded for some shipments. Downloading for remaining ones.",
      );
    }

    setDocActionType("manifest");
    setDocDownloadLoading(true);
    try {
      const numericPendingIds = pendingIds
        .map((id) => {
          const n = Number(id);
          return Number.isFinite(n) ? n : null;
        })
        .filter((v) => v !== null);

      const getManifestUrlFromResponse = (res) => {
        const data = res?.data ?? res;
        return (
          data?.manifest_url ||
          data?.manifestUrl ||
          resolveDocUrl(res)
        );
      };

      let res = await downloadManifest(pendingIds);
      let data = res?.data ?? res;
      let manifestUrl = getManifestUrlFromResponse(res);

      // Backend sometimes expects shipment_id as numeric array; retry once with numbers.
      const backendSaysNotGenerated = String(data?.message || "")
        .toLowerCase()
        .includes("manifest not generated");
      if (!manifestUrl && backendSaysNotGenerated && numericPendingIds.length) {
        res = await downloadManifest(numericPendingIds);
        data = res?.data ?? res;
        manifestUrl = getManifestUrlFromResponse(res);
      }

      if (!manifestUrl) {
        const msg = data?.message || "Failed to generate manifest PDF";
        const checkIds = Array.isArray(data?.check_ids)
          ? data.check_ids.join(", ")
          : null;
        toast.error(
          checkIds
            ? `${msg} (check_ids: ${checkIds}). Label may exist, but manifest is not generated by backend yet.`
            : `${msg}. Label may exist, but manifest is not generated by backend yet.`,
        );
        return;
      }
      openDocUrl(manifestUrl, "Failed to download manifest(s)");
      setDownloadedManifestShipments((prev) => {
        const next = new Set(prev);
        pendingIds.forEach((id) => next.add(String(id)));
        return next;
      });
    } catch (err) {
      console.error("Manifest download failed:", err);
      toast.error(apiErrMessage(err, "Failed to download manifest(s)"));
    } finally {
      setDocDownloadLoading(false);
      setDocActionType(null);
    }
  };

  const getShipmentIdsForItem = (item) => {
    const sr = getLineShiprocket(item);
    const forward = getLatestExchangeForwardOrder(item);
    const ids = [
      sr?.shipmentId,
      sr?.shipmentGroupId,
      forward?.shipmentId,
      item?.shipmentId,
      item?.shipmentGroupId,
      item?.shiprocket?.shipmentId,
      item?.shiprocket?.shipmentGroupId,
      item?.exchanges?.[0]?.shiprocket?.forwardOrder?.shipmentId,
    ]
      .filter(Boolean)
      .map(String);
    return Array.from(new Set(ids));
  };

  const handleLabelForItem = (item) => {
    const forwardLabelUrl = getLatestExchangeForwardOrder(item)?.labelUrl;
    if (forwardLabelUrl) {
      openDocUrl(forwardLabelUrl, "Failed to download shipping label(s)");
      return;
    }
    const ids = getShipmentIdsForItem(item);
    if (!ids.length) {
      toast.error("Shipment ID not available yet for this item.");
      return;
    }
    handleDownloadLabelsClick(ids);
  };

  const handleManifestForItem = (item) => {
    const ids = getShipmentIdsForItem(item);
    if (!ids.length) {
      toast.error("Shipment ID not available yet for this item.");
      return;
    }
    handleDownloadManifestClick(ids);
  };

  const handleLabelForOrder = (order) => {
    const ids = getOrderShipmentIds(order);
    if (!ids.length) {
      toast.error("Shipment ID not available yet for this order.");
      return;
    }
    handleDownloadLabelsClick(ids);
  };

  const handleManifestForOrder = (order) => {
    const ids = getOrderShipmentIds(order);
    if (!ids.length) {
      toast.error("Shipment ID not available yet for this order.");
      return;
    }
    handleDownloadManifestClick(ids);
  };

  const handleCreateForwardShipmentForOrder = async (order) => {
    setDocActionType("forward");
    setDocDownloadLoading(true);
    try {
      let target = getOrderForwardCreateTarget(order);
      // List API can omit nested exchanges; refetch single order to get exact exchangeId.
      if (!target?.exchangeId && order?.orderId) {
        const freshRes = await getSingleOrder(order.orderId, 1, itemLimit);
        const freshOrder = freshRes?.data ?? freshRes;
        target = getOrderForwardCreateTarget(freshOrder);
      }
      if (!target?.exchangeId) {
        toast.error("Exchange ID not found for forward shipment creation.");
        return;
      }
      dbgOrders("createForwardShipment:start", {
        orderId: order?.orderId || order?._id,
        exchangeId: target.exchangeId,
      });
      const res = await createForwardShipment(target.exchangeId);
      const msg =
        res?.message ||
        res?.data?.message ||
        "Forward shipment created successfully.";
      toast.success(msg);
      await fetchOrders();
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to create forward shipment.");
    } finally {
      setDocDownloadLoading(false);
      setDocActionType(null);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrders(
        pagination.page,
        pagination.limit,
        search,
        statusFilter,
        dateFrom || undefined,
        dateTo || undefined,
        sortBy,
        sortOrder,
        deliveryTypeFilter || undefined
      );
      // Backend: successResponse → { success, message, data: { orders, pagination } }
      dbgOrders("getOrders:response", res);
      const payload = res?.data ?? {};
      const rawList = payload.orders ?? payload.data ?? [];
      const list = exchangeOnly
        ? (Array.isArray(rawList)
            ? rawList.filter((row) => isExchangeOrderEntry(row))
            : [])
        : rawList;
      dbgOrdersVerbose("getOrders:payload", payload);
      dbgOrders("getOrders:summary", {
        rowCount: Array.isArray(list) ? list.length : 0,
        pagination: payload.pagination,
      });
      setOrders(Array.isArray(list) ? list : []);
      setPagination((prev) => {
        const total = payload.pagination?.total ?? payload.total ?? 0;
        const limit = prev.limit || 10;
        const totalPages =
          payload.pagination?.totalPages ??
          (total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
        return {
          ...prev,
          total,
          totalPages: Math.max(1, totalPages),
        };
      });
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(apiErrMessage(err, "Failed to load orders. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, dateFrom, dateTo, sortBy, sortOrder, deliveryTypeFilter, exchangeOnly]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchOrderItems = useCallback(async () => {
    try {
      setItemLoading(true);
      setItemError(null);
      const res = await getOrderItems(
        itemPagination.page,
        itemPagination.limit,
        itemSearch,
        "",
        itemStatusFilter,
        dateFrom || undefined,
        dateTo || undefined,
        deliveryTypeFilter || undefined
      );
      dbgOrders("getOrderItems:response", res);
      const payload = res?.data ?? {};
      dbgOrdersVerbose("getOrderItems:payload", payload);
      dbgOrders("getOrderItems:summary", {
        rowCount: Array.isArray(payload.items) ? payload.items.length : 0,
        pagination: payload.pagination,
      });
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      const list = exchangeOnly
        ? rawItems.filter((row) => isExchangeLineItem(row?.item || row))
        : rawItems;
      setOrderItems(list);
      setItemPagination((prev) => ({
        ...prev,
        total: payload.pagination?.total ?? 0,
        totalPages: Math.max(1, payload.pagination?.totalPages ?? 1),
      }));
    } catch (err) {
      console.error("Failed to fetch order items:", err);
      setItemError(apiErrMessage(err, "Failed to load order items."));
    } finally {
      setItemLoading(false);
    }
  }, [itemPagination.page, itemPagination.limit, itemSearch, itemStatusFilter, deliveryTypeFilter, exchangeOnly, dateFrom, dateTo]);

  useEffect(() => {
    if (viewMode === VIEW_ITEM) fetchOrderItems();
  }, [viewMode, fetchOrderItems]);

  const handleDownloadManufacturingPdf = async () => {
    try {
      setManufacturingPdfLoading(true);
      const searchVal =
        viewMode === VIEW_ORDER
          ? search?.trim() || undefined
          : itemSearch?.trim() || undefined;
      const body = {
        search: searchVal,
        itemStatus: itemStatusFilter || undefined,
        deliveryType: deliveryTypeFilter || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        allPages: true,
        maxExportRows: 8000,
        ...(exchangeOnly ? { exchangeOnly: true } : {}),
      };
      const blob = await downloadManufacturingSheetPdf(body);
      if (blob && typeof blob.type === "string" && blob.type.includes("json")) {
        const text = await blob.text();
        let msg = "Could not generate manufacturing PDF";
        try {
          const j = JSON.parse(text);
          if (j?.message) msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nameParts = [
        "full",
        dateFrom ? `from${dateFrom}` : null,
        dateTo ? `to${dateTo}` : null,
      ].filter(Boolean);
      a.download = `manufacturing-sheet-${nameParts.join("-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Manufacturing PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error(
        getBackendErrorMessages(err, "Could not generate manufacturing PDF"),
      );
    } finally {
      setManufacturingPdfLoading(false);
    }
  };

  const fetchStaleOrdersList = useCallback(async (hours = staleHours) => {
    try {
      setStaleLoading(true);
      const res = await getStaleOrders(hours);
      const payload = res?.data ?? res;
      setStaleOrders(Array.isArray(payload?.rows) ? payload.rows : []);
      setStaleMeta({
        totalMatched: payload?.totalMatched ?? 0,
        truncated: !!payload?.truncated,
        olderThanHours: payload?.olderThanHours ?? hours,
      });
    } catch (err) {
      console.error(err);
      toast.error(getBackendErrorMessages(err, "Failed to load stale orders"));
      setStaleOrders([]);
    } finally {
      setStaleLoading(false);
    }
  }, [staleHours]);

  const openStaleOrdersModal = () => {
    setStaleModalOpen(true);
    setStaleSearch("");
    fetchStaleOrdersList(staleHours);
  };

  const closeStaleOrdersModal = () => {
    setStaleModalOpen(false);
    setStaleSearch("");
    setStaleColumnsOpen(false);
  };

  const handleDownloadStalePdf = async () => {
    try {
      setStalePdfLoading(true);
      const blob = await downloadStaleOrdersPdf(staleHours);
      if (blob && typeof blob.type === "string" && blob.type.includes("json")) {
        const text = await blob.text();
        let msg = "Could not generate stale orders PDF";
        try {
          const j = JSON.parse(text);
          if (j?.message) msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stale-orders-${staleHours}h.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Stale orders PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error(getBackendErrorMessages(err, "Could not download stale orders PDF"));
    } finally {
      setStalePdfLoading(false);
    }
  };

  const handleSendStaleAlertEmail = async () => {
    try {
      setStaleEmailLoading(true);
      const res = await runStaleOrderAlertEmail(staleHours);
      const data = res?.data ?? res;
      if (data?.emailSent) {
        toast.success(`Alert email sent (${data.rowCount ?? 0} lines)`);
      } else if (data?.skippedReason === "no_stale_orders") {
        toast.success("No stale orders — email not sent");
      } else if (data?.skippedReason === "no_recipients") {
        toast.error(data?.emailError || "Set STALE_ORDER_ALERT_EMAIL_TO on the server");
      } else {
        toast.success(res?.message || "Report processed");
      }
    } catch (err) {
      console.error(err);
      toast.error(getBackendErrorMessages(err, "Could not send stale order alert email"));
    } finally {
      setStaleEmailLoading(false);
    }
  };

  const handleOpenStaleOrder = async (orderId) => {
    if (!orderId) return;
    closeStaleOrdersModal();
    setViewMode(VIEW_ORDER);
    await fetchSingleOrder(orderId);
  };

  const filteredStaleOrders = staleSearch.trim()
    ? staleOrders.filter((row) => {
        const q = staleSearch.trim().toLowerCase();
        return (
          String(row.orderId || "").toLowerCase().includes(q) ||
          String(row.sku || "").toLowerCase().includes(q) ||
          String(row.customerName || "").toLowerCase().includes(q) ||
          String(row.phone || "").toLowerCase().includes(q) ||
          String(row.city || "").toLowerCase().includes(q) ||
          String(row.deliveryType || "").toLowerCase().includes(q)
        );
      })
    : staleOrders;

  const toggleStaleColumn = (key) => {
    const def = STALE_ORDER_TABLE_COLUMNS.find((c) => c.key === key);
    if (def?.alwaysVisible) return;
    setStaleVisibleColumns((prev) => {
      const has = prev.includes(key);
      const without = has ? prev.filter((k) => k !== key) : [...prev, key];
      const always = STALE_ORDER_TABLE_COLUMNS.filter((c) => c.alwaysVisible).map(
        (c) => c.key,
      );
      const next = [...new Set([...always, ...without])];
      if (next.length <= always.length && has) return prev;
      persistStaleVisibleColumns(next);
      return next;
    });
  };

  const resetStaleColumns = () => {
    const next = defaultStaleVisibleColumnKeys();
    setStaleVisibleColumns(next);
    persistStaleVisibleColumns(next);
  };

  const selectAllStaleColumns = () => {
    const next = STALE_ORDER_TABLE_COLUMNS.map((c) => c.key);
    setStaleVisibleColumns(next);
    persistStaleVisibleColumns(next);
  };

  const orderListActiveColumns = useMemo(
    () => ORDER_LIST_TABLE_COLUMNS.filter((c) => orderListVisibleColumns.includes(c.key)),
    [orderListVisibleColumns],
  );

  const itemListActiveColumns = useMemo(
    () => ITEM_LIST_TABLE_COLUMNS.filter((c) => itemListVisibleColumns.includes(c.key)),
    [itemListVisibleColumns],
  );

  const orderDetailItemActiveColumns = useMemo(
    () =>
      ORDER_DETAIL_ITEM_DATA_COLUMNS.filter((c) =>
        orderDetailItemVisibleColumns.includes(c.key),
      ),
    [orderDetailItemVisibleColumns],
  );

  const makeColumnToggle = (columns, storageKey, setter) => (key) => {
    const def = columns.find((c) => c.key === key);
    if (def?.alwaysVisible) return;
    setter((prev) => {
      const has = prev.includes(key);
      const without = has ? prev.filter((k) => k !== key) : [...prev, key];
      const always = columns.filter((c) => c.alwaysVisible).map((c) => c.key);
      const next = [...new Set([...always, ...without])];
      if (next.length <= always.length && has) return prev;
      persistVisibleColumns(storageKey, next);
      return next;
    });
  };

  const toggleOrderListColumn = makeColumnToggle(
    ORDER_LIST_TABLE_COLUMNS,
    ORDER_LIST_COLUMNS_STORAGE_KEY,
    setOrderListVisibleColumns,
  );
  const toggleItemListColumn = makeColumnToggle(
    ITEM_LIST_TABLE_COLUMNS,
    ITEM_LIST_COLUMNS_STORAGE_KEY,
    setItemListVisibleColumns,
  );
  const toggleOrderDetailItemColumn = makeColumnToggle(
    ORDER_DETAIL_ITEM_DATA_COLUMNS,
    ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY,
    setOrderDetailItemVisibleColumns,
  );

  const setItemListView = (mode) => {
    setItemListViewMode(mode);
    try {
      localStorage.setItem("khush_admin_item_list_view_mode", mode);
    } catch {
      /* ignore */
    }
  };

  const fetchSingleOrder = async (orderId) => {
    if (!orderId) return;
    try {
      setOrderLoading(true);
      setOrderError(null);
      setUnassignError(null);
      setOrderAssignments(null);
      // Fetch with page 1 and high limit so all items in the order are returned
      const res = await getSingleOrder(orderId, 1, itemLimit);
      dbgOrders("getSingleOrder:response", { orderId, res });
      const singlePayload = res?.data ?? res;
      dbgOrdersVerbose("getSingleOrder:order", singlePayload);
      if (exchangeOnly && singlePayload?.items) {
        const filteredItems = singlePayload.items.filter((it) => isExchangeLineItem(it));
        setSelectedOrder({ ...singlePayload, items: filteredItems });
      } else {
        setSelectedOrder(singlePayload || null);
      }
      // Fetch assignment view for Reassign / Remove driver
      try {
        const assignRes = await getAssignmentView(orderId);
        dbgOrders("getAssignmentView:response", { orderId, assignRes });
        const assignData = assignRes?.data ?? assignRes;
        dbgOrdersVerbose("getAssignmentView:data", assignData);
        setOrderAssignments(assignData || null);
      } catch (e) {
        if (ORDERS_DEBUG) console.warn("[Orders] getAssignmentView failed:", e);
        setOrderAssignments(null);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      setOrderError(apiErrMessage(err, "Could not load order details."));
    } finally {
      setOrderLoading(false);
    }
  };

  const openOrderNotesModal = async (orderId) => {
    if (!orderId) return;
    setOrderNotesModalOpen(true);
    setOrderNotesModalOrderId(orderId);
    setOrderNotesModalDraft("");
    setOrderNotesModalNotes([]);
    setOrderNotesModalLoading(true);
    try {
      const res = await getSingleOrder(orderId, 1, itemLimit);
      const o = res?.data ?? res;
      setOrderNotesModalNotes(Array.isArray(o?.orderNotes) ? o.orderNotes : []);
    } catch (err) {
      showBackendErrorsAsToasts(err, "Could not load order notes");
      setOrderNotesModalOpen(false);
      setOrderNotesModalOrderId(null);
    } finally {
      setOrderNotesModalLoading(false);
    }
  };

  const closeOrderNotesModal = () => {
    setOrderNotesModalOpen(false);
    setOrderNotesModalOrderId(null);
    setOrderNotesModalNotes([]);
    setOrderNotesModalDraft("");
    setOrderNotesModalLoading(false);
    setOrderNotesModalSaving(false);
  };

  const handleSaveOrderNoteFromModal = async () => {
    const oid = orderNotesModalOrderId;
    const text = String(orderNotesModalDraft || "").trim();
    if (!oid || !text) return;
    setOrderNotesModalSaving(true);
    try {
      const res = await appendOrderNote(oid, { text });
      const payload = res?.data ?? res;
      let notes = payload?.orderNotes;
      if (!Array.isArray(notes)) {
        const r2 = await getSingleOrder(oid, 1, itemLimit);
        const o2 = r2?.data ?? r2;
        notes = Array.isArray(o2?.orderNotes) ? o2.orderNotes : [];
      }
      setOrderNotesModalNotes(notes);
      setOrderNotesModalDraft("");
      setSelectedOrder((prev) =>
        prev?.orderId === oid ? { ...prev, orderNotes: notes } : prev,
      );
      toast.success("Note saved");
    } catch (err) {
      showBackendErrorsAsToasts(err, "Could not save note");
    } finally {
      setOrderNotesModalSaving(false);
    }
  };

  // Statuses that require a driver to be assigned before changing to this status
  const STATUS_REQUIRES_ASSIGNMENT = ["SHIPPED", "OUT_FOR_DELIVERY"];
  // After updating to these statuses, we open assignment modal so admin can assign a driver
  const EXCHANGE_STATUSES_REQUIRE_DRIVER = [
    "EXCHANGE_PICKUP_SCHEDULED",
    "EXCHANGE_SHIPPED",
  ];
  const WHOLE_ORDER_SENTINEL = "WHOLE_ORDER";

  const isItemAssigned = (assignments, itemId) => {
    if (!Array.isArray(assignments) || !itemId) return false;
    const idStr = String(itemId);
    return assignments.some(
      (a) =>
        !["CANCELLED", "REJECTED", "DELIVERED"].includes(a.status) &&
        (a.itemIds || []).some((id) => String(id?._id ?? id) === idStr),
    );
  };

  const handleRemoveDriver = async (orderId, assignmentId) => {
    if (
      !orderId ||
      !assignmentId ||
      !window.confirm(
        "Remove this driver from the assignment? The items will be unassigned and you can assign another driver later.",
      )
    )
      return;
    setUnassignLoading(true);
    setUnassignError(null);
    try {
      await unassignOrder(orderId, { assignmentId });
      toast.success(`Driver removed from assignment ${assignmentId}`);
      await fetchSingleOrder(orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to remove driver.";
      setUnassignError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to remove driver for assignment ${assignmentId}.`,
      );
    } finally {
      setUnassignLoading(false);
    }
  };

  const handleReassignDriver = (orderId, assignment) => {
    if (!orderId || !assignment) return;
    const itemIdsOrWhole =
      assignment.assignmentType === "ORDER"
        ? WHOLE_ORDER_SENTINEL
        : (assignment.itemIds || []).map((id) => (id?._id ?? id).toString());
    if (assignment.assignmentType !== "ORDER" && itemIdsOrWhole.length === 0)
      return;
    openAssignmentModal(orderId, itemIdsOrWhole, null, true, assignment._id);
  };

  const openAssignmentModal = (
    orderId,
    itemIdsOrWhole,
    newStatus,
    assignOnly = false,
    replaceAssignmentId = null,
  ) => {
    setAssignmentOrderId(orderId);
    setPendingNewStatus(newStatus);
    setAssignmentAssignOnly(assignOnly);
    setReassignAssignmentId(replaceAssignmentId || null);
    setSelectedDeliveryAgentId("");
    setAssignError(null);
    if (itemIdsOrWhole === WHOLE_ORDER_SENTINEL) {
      setAssignmentMode("whole");
      setAssignmentItemIds([]);
      setAssignmentItemId(WHOLE_ORDER_SENTINEL);
    } else if (Array.isArray(itemIdsOrWhole)) {
      setAssignmentMode("items");
      setAssignmentItemIds(itemIdsOrWhole.map(String));
      setAssignmentItemId(null);
    } else {
      setAssignmentMode("items");
      setAssignmentItemIds([String(itemIdsOrWhole)]);
      setAssignmentItemId(itemIdsOrWhole);
    }
    setAssignmentModalOpen(true);
    listDeliveryAgents(1, 100)
      .then((res) => {
        dbgOrders("listDeliveryAgents:response", res);
        const data = res?.data ?? res;
        const list = data?.deliveryAgents ?? data?.data ?? [];
        dbgOrders("listDeliveryAgents:summary", { count: Array.isArray(list) ? list.length : 0 });
        setDeliveryAgentsList(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (ORDERS_DEBUG) console.warn("[Orders] listDeliveryAgents failed:", e);
        setDeliveryAgentsList([]);
      });
  };

  const handleAssignmentSubmit = async () => {
    if (!assignmentOrderId || !selectedDeliveryAgentId) {
      setAssignError("Please select a delivery agent.");
      return;
    }
    if (!assignmentAssignOnly && !pendingNewStatus) {
      setAssignError("Status is required.");
      return;
    }
    if (assignmentMode === "items" && assignmentItemIds.length === 0) {
      setAssignError("No items to assign.");
      return;
    }
    setAssignLoading(true);
    setAssignError(null);
    try {
      if (reassignAssignmentId) {
        await unassignOrder(assignmentOrderId, {
          assignmentId: reassignAssignmentId,
        });
      }
      if (assignmentMode === "whole") {
        await assignWholeOrder(assignmentOrderId, selectedDeliveryAgentId);
        if (!assignmentAssignOnly) {
          await updateWholeOrderStatus(assignmentOrderId, {
            status: pendingNewStatus,
          });
        }
      } else {
        await assignItems(
          assignmentOrderId,
          selectedDeliveryAgentId,
          assignmentItemIds,
        );
        if (!assignmentAssignOnly) {
          for (const itemId of assignmentItemIds) {
            await updateOrderItemStatus(assignmentOrderId, itemId, {
              status: pendingNewStatus,
            });
          }
        }
      }
      toast.success(
        assignmentAssignOnly
          ? "Driver assigned successfully."
          : `Driver assigned and status updated to ${pendingNewStatus}.`,
      );
      setAssignmentModalOpen(false);
      setAssignmentAssignOnly(false);
      setReassignAssignmentId(null);
      setWholeOrderNewStatus("");
      setSelectedItemIds([]);
      setBulkStatus("");
      fetchSingleOrder(assignmentOrderId);
    } catch (err) {
      const msg = showBackendErrorsAsToasts(
        err,
        "Assign failed.",
      );
      setAssignError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdateWholeOrderStatus = async () => {
    if (!selectedOrder?.orderId || !wholeOrderNewStatus) return;
    const label =
      statusOptions.find((o) => o.value === wholeOrderNewStatus)?.label ||
      wholeOrderNewStatus;
    const requiresAssignment =
      STATUS_REQUIRES_ASSIGNMENT.includes(wholeOrderNewStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(selectedOrder.orderId);
        const data = res?.data ?? res;
        const orderFromView = data?.order;
        const assignments = data?.assignments ?? [];
        const orderItems = orderFromView?.items ?? selectedOrder?.items ?? [];
        const allAssigned =
          orderItems.length > 0 &&
          orderItems.every((item) =>
            isItemAssigned(assignments, item.itemId ?? item._id),
          );
        if (!allAssigned) {
          openAssignmentModal(
            selectedOrder.orderId,
            WHOLE_ORDER_SENTINEL,
            wholeOrderNewStatus,
          );
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        const msg = showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        setOrderError(msg);
        return;
      }
    }
    if (
      !window.confirm(
        `Set all items in this order to "${label}"? (Terminal items like CANCELLED will be skipped.)`,
      )
    )
      return;
    setUpdatingWholeOrder(true);
    setOrderError(null);
    try {
      if (wholeOrderNewStatus === "EXCHANGE_APPROVED") {
        const targetItems = selectedOrder?.items ?? [];
        for (const item of targetItems) {
          const exchangeId = getLatestExchangeId(item);
          if (!exchangeId) continue;
          dbgOrders("approveExchange:wholeOrder", {
            orderId: selectedOrder?.orderId,
            itemId: item?.itemId || item?._id,
            exchangeId,
          });
          await approveExchange(exchangeId);
        }
      }
      await updateWholeOrderStatus(selectedOrder.orderId, {
        status: wholeOrderNewStatus,
      });
      toast.success(`Order items updated to ${wholeOrderNewStatus}.`);
      setWholeOrderNewStatus("");
      await fetchSingleOrder(selectedOrder.orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update whole order status.";
      setOrderError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to set order status to ${wholeOrderNewStatus}.`,
      );
    } finally {
      setUpdatingWholeOrder(false);
    }
  };

  const toggleItemSelection = (itemId) => {
    const idStr = String(itemId);
    setSelectedItemIds((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr],
    );
  };

  const selectAllOnPage = () => {
    const pageIds = (selectedOrder?.items ?? []).map((it) =>
      String(it.itemId || it._id),
    );
    setSelectedItemIds((prev) => {
      const combined = [...new Set([...prev, ...pageIds])];
      return combined.length === prev.length &&
        pageIds.every((id) => prev.includes(id))
        ? prev.filter((id) => !pageIds.includes(id))
        : combined;
    });
  };

  const handleUpdateSelectedItemsStatus = async () => {
    if (!selectedOrder?.orderId || selectedItemIds.length === 0 || !bulkStatus)
      return;
    const label =
      statusOptions.find((o) => o.value === bulkStatus)?.label || bulkStatus;

    if (bulkStatus === "EXCHANGE_REJECTED") {
      setPendingRejection({
        orderId: selectedOrder.orderId,
        itemIds: [...selectedItemIds],
      });
      setRejectionNote("");
      setRejectionError(null);
      setRejectionModalOpen(true);
      return;
    }

    const requiresAssignment = STATUS_REQUIRES_ASSIGNMENT.includes(bulkStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(selectedOrder.orderId);
        const data = res?.data ?? res;
        const assignments = data?.assignments ?? [];
        const allAssigned = selectedItemIds.every((id) =>
          isItemAssigned(assignments, id),
        );
        if (!allAssigned) {
          openAssignmentModal(
            selectedOrder.orderId,
            selectedItemIds,
            bulkStatus,
          );
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        const msg = showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        setOrderError(msg);
        return;
      }
    }
    if (
      !window.confirm(
        `Set ${selectedItemIds.length} selected item(s) to "${label}"?`,
      )
    )
      return;
    setUpdatingBulk(true);
    setOrderError(null);
    try {
      for (const itemId of selectedItemIds) {
        const currentItem = selectedOrder?.items?.find(
          (it) => String(it.itemId || it._id) === String(itemId),
        );
        if (bulkStatus === "EXCHANGE_APPROVED") {
          const exchangeId = getLatestExchangeId(currentItem);
          if (!exchangeId) {
            throw new Error(
              `No exchange found for item ${String(itemId)} to approve.`,
            );
          }
          dbgOrders("approveExchange:bulk", {
            orderId: selectedOrder?.orderId,
            itemId,
            exchangeId,
          });
          await approveExchange(exchangeId);
        }
        await updateOrderItemStatus(selectedOrder.orderId, itemId, {
          status: bulkStatus,
        });
      }
      toast.success(
        `${selectedItemIds.length} item(s) updated to ${bulkStatus}.`,
      );
      if (EXCHANGE_STATUSES_REQUIRE_DRIVER.includes(bulkStatus)) {
        if (
          window.confirm(
            `Assign a driver for these ${selectedItemIds.length} item(s)?`,
          )
        ) {
          openAssignmentModal(
            selectedOrder.orderId,
            [...selectedItemIds],
            bulkStatus,
            true,
          );
        }
      }
      setSelectedItemIds([]);
      setBulkStatus("");
      await fetchSingleOrder(selectedOrder.orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update selected items.";
      setOrderError(msg);
      showBackendErrorsAsToasts(
        err,
        `Failed to set selected items to ${bulkStatus}.`,
      );
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleUpdateItemStatus = async (orderId, itemId, newStatus) => {
    if (!orderId || !itemId || !newStatus) return;
    const stringItemId = String(itemId);

    // Exchange rejected: open modal to collect rejection note (required by backend)
    if (newStatus === "EXCHANGE_REJECTED") {
      setPendingRejection({ orderId, itemId: stringItemId });
      setRejectionNote("");
      setRejectionError(null);
      setRejectionModalOpen(true);
      return;
    }

    const requiresAssignment = STATUS_REQUIRES_ASSIGNMENT.includes(newStatus);
    if (requiresAssignment) {
      try {
        const res = await getAssignmentView(orderId);
        const data = res?.data ?? res;
        const assignments = data?.assignments ?? [];
        if (!isItemAssigned(assignments, itemId)) {
          const label =
            statusOptions.find((o) => o.value === newStatus)?.label ||
            newStatus;
          if (
            window.confirm(
              `This item is not assigned to a driver. Assign a driver first, then mark as "${label}". Open assignment?`,
            )
          ) {
            openAssignmentModal(orderId, itemId, newStatus);
          }
          return;
        }
      } catch (err) {
        console.error("Assignment view failed:", err);
        showBackendErrorsAsToasts(
          err,
          "Could not check assignment.",
        );
        return;
      }
    } else {
      const label =
        statusOptions.find((o) => o.value === newStatus)?.label || newStatus;
      if (!window.confirm(`Update to "${label}"?`)) return;
    }
    setUpdatingItemId(stringItemId);
    const prevItem = selectedOrder?.items?.find(
      (it) => String(it.itemId || it._id) === stringItemId,
    );
    const prevStatus = prevItem?.status;
    setSelectedOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          String(it.itemId || it._id) === stringItemId
            ? { ...it, status: newStatus }
            : it,
        ),
      };
    });
    try {
      const payload = { status: newStatus };
      if (newStatus === "EXCHANGE_APPROVED") {
        const exchangeId = getLatestExchangeId(prevItem);
        if (!exchangeId) {
          throw new Error("No exchange request found for this item.");
        }
        dbgOrders("approveExchange:single", { orderId, itemId, exchangeId });
        await approveExchange(exchangeId);
      }
      await updateOrderItemStatus(orderId, itemId, payload);
      toast.success(`Item ${stringItemId} updated to ${newStatus}.`);
      // After setting exchange pickup/delivery status, open assignment modal to assign driver
      if (EXCHANGE_STATUSES_REQUIRE_DRIVER.includes(newStatus)) {
        const label =
          statusOptions.find((o) => o.value === newStatus)?.label || newStatus;
        if (window.confirm(`Assign a driver for this item (${label})?`)) {
          openAssignmentModal(orderId, itemId, newStatus, true);
        }
      }
    } catch (err) {
      console.error("Status update failed:", err);
      showBackendErrorsAsToasts(
        err,
        `Failed to update item ${stringItemId} to ${newStatus}.`,
      );
      if (prevStatus) {
        setSelectedOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((it) =>
              String(it.itemId || it._id) === stringItemId
                ? { ...it, status: prevStatus }
                : it,
            ),
          };
        });
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!pendingRejection?.orderId) return;
    const note = (rejectionNote || "").trim();
    if (!note) {
      setRejectionError("Rejection note is required.");
      return;
    }
    setRejectionSubmitting(true);
    setRejectionError(null);
    try {
      const orderId = pendingRejection.orderId;
      if (pendingRejection.itemIds && pendingRejection.itemIds.length > 0) {
        for (const itemId of pendingRejection.itemIds) {
          await updateOrderItemStatus(orderId, itemId, {
            status: "EXCHANGE_REJECTED",
            notes: note,
          });
        }
      } else if (pendingRejection.itemId) {
        await updateOrderItemStatus(orderId, pendingRejection.itemId, {
          status: "EXCHANGE_REJECTED",
          notes: note,
        });
      }
      setRejectionModalOpen(false);
      setPendingRejection(null);
      setRejectionNote("");
      setSelectedItemIds([]);
      setBulkStatus("");
      fetchSingleOrder(orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reject exchange.";
      setRejectionError(msg);
      showBackendErrorsAsToasts(
        err,
        "Failed to reject exchange.",
      );
    } finally {
      setRejectionSubmitting(false);
    }
  };

  const getDriverPartnerDisplay = (item) => {
    const agent = item?.deliveryAgentId;
    if (!agent) return null;
    const name = typeof agent === "object" ? agent.name : null;
    const phone = typeof agent === "object" ? agent.phoneNumber : null;
    if (!name && !phone) return null;
    return { name: name || "—", phone: phone || "" };
  };

  const getStatusBadge = (status = "pending") => {
    let s = (status || "pending").toUpperCase().replace(/_/g, " ").trim();
    const statusStyles = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
      CREATED: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
      PROCESSING: { bg: "bg-blue-100", text: "text-blue-800", Icon: RefreshCw },
      CONFIRMED: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        Icon: RefreshCw,
      },
      SHIPPED: { bg: "bg-purple-100", text: "text-purple-800", Icon: Truck },
      DELIVERED: {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
      CANCELLED: { bg: "bg-red-100", text: "text-red-800", Icon: XCircle },
      "OUT FOR DELIVERY": {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        Icon: Truck,
      },
      "EXCHANGE REQUESTED": {
        bg: "bg-orange-100",
        text: "text-orange-800",
        Icon: RefreshCw,
      },
      "EXCHANGE APPROVED": {
        bg: "bg-teal-100",
        text: "text-teal-800",
        Icon: CheckCircle,
      },
      "EXCHANGE REJECTED": {
        bg: "bg-pink-100",
        text: "text-pink-800",
        Icon: XCircle,
      },
      "EXCHANGE PICKUP SCHEDULED": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE OUT FOR PICKUP": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE PICKED": {
        bg: "bg-amber-100",
        text: "text-amber-800",
        Icon: Truck,
      },
      "EXCHANGE RETURN IN TRANSIT": {
        bg: "bg-amber-100",
        text: "text-amber-900",
        Icon: Truck,
      },
      "EXCHANGE RECEIVED": {
        bg: "bg-teal-100",
        text: "text-teal-800",
        Icon: Package,
      },
      "EXCHANGE PROCESSING": {
        bg: "bg-blue-100",
        text: "text-blue-800",
        Icon: RefreshCw,
      },
      "EXCHANGE SHIPPED": {
        bg: "bg-purple-100",
        text: "text-purple-800",
        Icon: Truck,
      },
      "EXCHANGE OUT FOR DELIVERY": {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        Icon: Truck,
      },
      "EXCHANGE DELIVERED": {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
      "EXCHANGE COMPLETED": {
        bg: "bg-green-100",
        text: "text-green-800",
        Icon: CheckCircle,
      },
    };
    const {
      bg = "bg-gray-100",
      text = "text-gray-800",
      Icon = Clock,
    } = statusStyles[s] || statusStyles.PENDING;
    let displayText = s.charAt(0) + s.slice(1).toLowerCase();
    if (displayText.length > 24) {
      displayText = displayText
        .replace("Exchange ", "Ex. ")
        .replace("Pickup Scheduled", "Pickup Sch.")
        .replace("Return In Transit", "Ret. in transit")
        .replace("Out For Delivery", "Out for Del.");
    }
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${bg} ${text} truncate`}
        title={displayText}
      >
        <Icon size={12} className="shrink-0" />
        <span className="truncate">{displayText}</span>
      </span>
    );
  };

  /** Effective badge + line API / history / Shiprocket return & forward (exchange) or outbound SR */
  const renderItemStatusBreakdown = (item, { compact = false } = {}) => {
    const ex = getLatestExchange(item);
    const last = getLatestStatusHistoryEntry(item);
    const ret = ex?.shiprocket?.returnOrder;
    const fwd = ex?.shiprocket?.forwardOrder;
    const effective = getDisplayItemStatus(item);
    const lineStatus = item?.status;
    const textCls = compact ? "text-[9px]" : "text-[11px]";
    const boxCls = compact
      ? "rounded border border-gray-100 bg-gray-50/90 px-1 py-0.5"
      : "rounded-lg border border-gray-200 bg-gray-50/90 px-2 py-1.5";

    return (
      <div className={`min-w-0 space-y-1 ${compact ? "max-w-[14rem]" : ""}`}>
        <div className="flex flex-wrap items-center gap-1">
          {getStatusBadge(effective)}
          <span
            className={`${compact ? "text-[8px]" : "text-[9px]"} font-semibold uppercase tracking-wide text-gray-400`}
          >
            Effective
          </span>
        </div>
        <div className={`${boxCls} space-y-0.5 ${textCls} leading-snug text-gray-800`}>
          <p className="break-words">
            <span className="text-gray-500">Line (API):</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatStatusTokenForUi(lineStatus)}
            </span>
          </p>
          {last ? (
            <p className="break-words" title={last.notes || undefined}>
              <span className="text-gray-500">Last change:</span>{" "}
              <span className="font-medium">
                {formatStatusTokenForUi(last.previousStatus)} →{" "}
                {formatStatusTokenForUi(last.status)}
              </span>
              {last.createdAt ? (
                <span className="text-gray-400">
                  {" "}
                  ·{" "}
                  {new Date(last.createdAt).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              ) : null}
            </p>
          ) : null}
          {isExchangeLineItem(item) ? (
            <>
              <p className="break-words">
                <span className="text-gray-500">Return (Shiprocket):</span>{" "}
                <span className="font-semibold text-amber-950">
                  {ret?.status || "—"}
                </span>
                {ret?.awbCode ? (
                  <span className="text-gray-500"> · AWB {ret.awbCode}</span>
                ) : null}
              </p>
              <p className="break-words">
                <span className="text-gray-500">Forward (Shiprocket):</span>{" "}
                <span className="font-semibold text-sky-950">
                  {fwd?.status ||
                    (fwd?.awbCode || fwd?.shipmentId || fwd?.orderId
                      ? "Pending / created"
                      : "—")}
                </span>
                {fwd?.awbCode ? (
                  <span className="text-gray-500"> · AWB {fwd.awbCode}</span>
                ) : null}
              </p>
            </>
          ) : isNormalDeliveryLine(item) && item?.shiprocket?.status ? (
            <p className="break-words">
              <span className="text-gray-500">Outbound (Shiprocket):</span>{" "}
              <span className="font-medium">{item.shiprocket.status}</span>
              {item.shiprocket?.awbCode ? (
                <span className="text-gray-500"> · AWB {item.shiprocket.awbCode}</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  const statusOptions = [
    { value: "CREATED", label: "Created" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "EXCHANGE_REQUESTED", label: "Exchange requested" },
    { value: "EXCHANGE_APPROVED", label: "Exchange approved" },
    { value: "EXCHANGE_REJECTED", label: "Exchange rejected" },
    { value: "EXCHANGE_PICKUP_SCHEDULED", label: "Exchange pickup scheduled" },
    { value: "EXCHANGE_OUT_FOR_PICKUP", label: "Exchange out for pickup" },
    { value: "EXCHANGE_PICKED", label: "Exchange picked" },
    { value: "EXCHANGE_RECEIVED", label: "Exchange received" },
    { value: "EXCHANGE_PROCESSING", label: "Exchange processing" },
    { value: "EXCHANGE_SHIPPED", label: "Exchange shipped" },
    { value: "EXCHANGE_OUT_FOR_DELIVERY", label: "Exchange out for delivery" },
    { value: "EXCHANGE_DELIVERED", label: "Exchange delivered" },
    { value: "EXCHANGE_COMPLETED", label: "Exchange completed" },
  ];
  const filteredStatusOptions = exchangeOnly
    ? statusOptions.filter((opt) => isExchangeStatus(opt.value))
    : statusOptions;

  const renderOrderListCell = (key, order) => {
    switch (key) {
      case "info":
        return (
          <StoreOrderInfoTrigger
            order={order}
            onOpenDetails={() =>
              setStoreInfoModal({
                title: `Order #${order.orderId || order._id?.slice(-8) || ""}`,
                lines: (Array.isArray(order.items) ? order.items : []).map((it) => ({
                  itemId: it.itemId,
                  itemLike: it,
                  quantity: it.quantity,
                  ctx: {
                    orderId: order.orderId,
                    orderCreatedAt: order.createdAt,
                    payment: order.payment,
                    address: order.address,
                    user: order.user,
                  },
                })),
              })
            }
          />
        );
      case "image": {
        const first = firstOrderLineItem(order);
        return (
          <TableItemImageThumb itemLike={first} onPickImage={setZoomImageUrl} />
        );
      }
      case "orderId":
        return (
          <span className="block truncate text-xs font-medium text-indigo-600" title={order.orderId || order._id}>
            {order.orderId || order._id?.slice(-8).toUpperCase() || "—"}
          </span>
        );
      case "customer":
        return (
          <div className="truncate text-xs font-medium text-gray-900" title={order.user?.name || order.address?.name || "—"}>
            {order.user?.name || order.address?.name || "—"}
          </div>
        );
      case "phone":
        return (
          <span
            className="block truncate text-xs"
            title={`${order.user?.countryCode || ""}${order.user?.phoneNumber || order.address?.phone || "—"}`}
          >
            {order.user?.countryCode || ""}
            {order.user?.phoneNumber || order.address?.phone || "—"}
          </span>
        );
      case "qty":
        return order.totalItems || order.totalQuantity || order.items?.length || "?";
      case "total":
        return `₹${(order.totalAmount || order.pricing?.finalPayable || 0).toLocaleString("en-IN")}`;
      case "status":
        return getStatusBadge(getDisplayOrderStatus(order));
      case "courier": {
        const prev = getOrderShiprocketPreview(order);
        if (!prev) {
          return (
            <div className="space-y-1">
              <span className="text-xs text-gray-400">—</span>
              {hasNormalDeliveryInOrder(order) && (
                <>
                  <button
                    type="button"
                    disabled={docDownloadLoading}
                    onClick={() => handleLabelForOrder(order)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {docDownloadLoading && docActionType === "label" ? (
                      <RefreshCw size={11} className="shrink-0 animate-spin" />
                    ) : (
                      <Truck size={11} className="shrink-0" />
                    )}
                    {docDownloadLoading && docActionType === "label" ? "Loading..." : "Label"}
                  </button>
                  <button
                    type="button"
                    disabled={docDownloadLoading}
                    onClick={() => handleManifestForOrder(order)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                  >
                    {docDownloadLoading && docActionType === "manifest" ? (
                      <RefreshCw size={11} className="shrink-0 animate-spin" />
                    ) : (
                      <Package size={11} className="shrink-0" />
                    )}
                    {docDownloadLoading && docActionType === "manifest" ? "Loading..." : "Manifest"}
                  </button>
                </>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-1">
            <ShiprocketDetails sr={prev.primary} compact />
            {prev.count > 1 && (
              <p className="mt-0.5 text-[10px] leading-tight text-gray-400">{prev.count} lines</p>
            )}
            {hasNormalDeliveryInOrder(order) && (
              <>
                <button
                  type="button"
                  disabled={docDownloadLoading}
                  onClick={() => handleLabelForOrder(order)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {docDownloadLoading && docActionType === "label" ? (
                    <RefreshCw size={11} className="shrink-0 animate-spin" />
                  ) : (
                    <Truck size={11} className="shrink-0" />
                  )}
                  {docDownloadLoading && docActionType === "label" ? "Loading..." : "Label"}
                </button>
                <button
                  type="button"
                  disabled={docDownloadLoading}
                  onClick={() => handleManifestForOrder(order)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                >
                  {docDownloadLoading && docActionType === "manifest" ? (
                    <RefreshCw size={11} className="shrink-0 animate-spin" />
                  ) : (
                    <Package size={11} className="shrink-0" />
                  )}
                  {docDownloadLoading && docActionType === "manifest" ? "Loading..." : "Manifest"}
                </button>
              </>
            )}
          </div>
        );
      }
      case "date":
        return order.createdAt
          ? new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })
          : "—";
      case "orderDateTime":
        return formatManufacturingModalDate(order.createdAt);
      case "email":
        return order.user?.email || order.userId?.email || "—";
      case "productName": {
        const first = firstOrderLineItem(order);
        const n = first?.name;
        const count = order.items?.length || 0;
        if (!n && count > 1) return `${count} items`;
        return n || (count > 1 ? `${count} items` : "—");
      }
      case "productId":
        return firstOrderLineItem(order)?.productId || "—";
      case "lineSku":
        return firstOrderLineItem(order)?.sku || "—";
      case "variantSku":
        return firstOrderLineItem(order)?.variant?.sku || "—";
      case "size":
        return firstOrderLineItem(order)?.variant?.size || "—";
      case "color":
        return firstOrderLineItem(order)?.variant?.color || "—";
      case "pincode":
        return order.address?.pincode || "—";
      case "storeLink": {
        const first = firstOrderLineItem(order);
        return first ? (
          <TableStoreLink itemId={first.itemId || first._id} itemLike={first} />
        ) : (
          "—"
        );
      }
      case "payment":
        return manufacturingPaymentLabel(order.payment);
      case "city":
        return order.address?.city || "—";
      default:
        return "—";
    }
  };

  const renderItemListCell = (key, row) => {
    const item = itemLikeFromListRow(row);
    const itemId = row.itemId ?? item.itemId ?? item._id;
    switch (key) {
      case "image":
        return <TableItemImageThumb itemLike={item} onPickImage={setZoomImageUrl} />;
      case "info":
        return (
          <StoreItemInfoTrigger
            itemId={row.itemId}
            itemLike={row.item}
            quantity={row.item?.quantity}
            onOpenDetails={() =>
              setStoreInfoModal({
                title: `Order #${row.orderId || ""}`,
                lines: [
                  {
                    itemId: row.itemId,
                    itemLike: row.item,
                    quantity: row.item?.quantity,
                    ctx: {
                      orderId: row.orderId,
                      orderCreatedAt: row.orderCreatedAt,
                      payment: row.payment,
                      address: row.address,
                      user: row.user,
                    },
                  },
                ],
              })
            }
          />
        );
      case "orderId":
        return (
          <span className="font-medium text-indigo-600 truncate block" title={row.orderId}>
            {row.orderId || "—"}
          </span>
        );
      case "customer":
        return row.user?.name || row.address?.name || "—";
      case "phone":
        return `${row.user?.countryCode || ""}${row.user?.phoneNumber || "—"}`;
      case "product":
        return (
          <span className="font-medium text-gray-900 truncate block max-w-[200px]" title={row.item?.name}>
            {row.item?.name || row.item?.sku || "—"}
          </span>
        );
      case "productId":
        return item.productId || "—";
      case "itemId":
        return String(itemId || "—");
      case "sku":
        return item.sku ?? itemId ?? "—";
      case "variantSku":
        return item.variant?.sku || "—";
      case "size":
        return item.variant?.size || "—";
      case "color":
        return item.variant?.color || "—";
      case "variant": {
        const v = item.variant || {};
        return [v.size, v.color].filter(Boolean).join(" / ") || "—";
      }
      case "pincode":
        return row.address?.pincode || "—";
      case "storeLink":
        return <TableStoreLink itemId={itemId} itemLike={item} />;
      case "orderDateTime":
        return formatManufacturingModalDate(row.orderCreatedAt);
      case "qty":
        return row.item?.quantity ?? "—";
      case "status":
        return renderItemStatusBreakdown(
          lineItemFromOrderItemRow(row) || { status: row.itemStatus },
          { compact: true },
        );
      case "delivery":
        return (
          DELIVERY_TYPE_TABS.find((t) => t.value === row.deliveryType)?.label ??
          String(row.deliveryType || "—").replace(/_/g, " ")
        );
      case "date":
        return row.orderCreatedAt
          ? new Date(row.orderCreatedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";
      case "shiprocket": {
        if (String(row.deliveryType || "").toUpperCase() !== "NORMAL") return "—";
        const sr = shiprocketFromItemRow(row);
        return sr ? <ShiprocketDetails sr={sr} compact /> : <span className="text-xs text-amber-700">No AWB yet</span>;
      }
      case "payment":
        return manufacturingPaymentLabel(row.payment);
      default:
        return "—";
    }
  };

  const orderListColSpan = orderListActiveColumns.length + 1;
  const itemListColSpan = itemListActiveColumns.length + 1;

  const orderListCellTdClass = (key) => {
    switch (key) {
      case "info":
      case "image":
        return "px-1 py-2 align-middle text-center";
      case "orderId":
        return "min-w-0 px-2 py-2 align-top font-medium text-indigo-600";
      case "qty":
        return "px-2 py-2 align-top text-center text-xs text-gray-600 tabular-nums";
      case "total":
        return "min-w-0 px-2 py-2 align-top text-xs font-medium text-gray-900 tabular-nums";
      case "date":
        return "min-w-0 px-2 py-2 align-top text-[11px] tabular-nums text-gray-500";
      case "courier":
        return "min-w-0 px-2 py-2 align-top";
      default:
        return "min-w-0 px-2 py-2 align-top text-xs text-gray-700";
    }
  };

  const itemListCellTdClass = (key) => {
    switch (key) {
      case "info":
      case "image":
        return "px-2 py-2 align-middle text-center";
      case "orderId":
        return "px-2 py-2 align-top text-xs";
      case "product":
        return "px-2 py-2 align-top max-w-[220px]";
      case "qty":
        return "px-2 py-2 align-top text-center text-xs tabular-nums";
      case "status":
        return "px-2 py-2 align-top min-w-[10rem]";
      default:
        return "px-2 py-2 align-top text-xs text-gray-700";
    }
  };

  const renderOrderListActions = (order) => (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => {
          const customOrderId = order.orderId;
          if (!customOrderId) {
            setError("Order is missing valid orderId");
            return;
          }
          setSelectedItemIdFromListView(null);
          setItemPage(1);
          fetchSingleOrder(customOrderId);
        }}
        className="rounded-md px-1.5 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition"
        title="View order details"
        type="button"
      >
        Details
      </button>
      <button
        type="button"
        onClick={() => openOrderNotesModal(order.orderId)}
        className="rounded-md px-1.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition"
        title="Order notes"
      >
        Notes
      </button>
    </div>
  );

  const renderItemListActions = (row) => {
    const rowItem = {
      ...(row.item && typeof row.item === "object" ? row.item : {}),
      delivery: { type: row.deliveryType || row.item?.delivery?.type },
      shipmentId: row.item?.shipmentId ?? row.shipmentId ?? null,
      shipmentGroupId: row.item?.shipmentGroupId ?? row.shipmentGroupId ?? null,
      shiprocket: {
        ...(row.item?.shiprocket || {}),
        shipmentId: row.item?.shiprocket?.shipmentId ?? row.item?.shipmentId ?? row.shipmentId ?? null,
      },
    };
    const isNormal = String(row.deliveryType || "").toUpperCase() === "NORMAL";
    return (
      <div className="flex flex-col items-stretch gap-1 min-w-[7rem]">
        <button
          type="button"
          onClick={() => {
            if (!row.orderId) return;
            setSelectedItemIdFromListView(String(row.itemId ?? row.productItemId ?? ""));
            setItemPage(1);
            fetchSingleOrder(row.orderId);
          }}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
          title="View & update item status"
        >
          View details
        </button>
        {isNormal && (
          <>
            <button
              type="button"
              disabled={docDownloadLoading}
              onClick={() => handleLabelForItem(rowItem)}
              className="inline-flex items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              {docDownloadLoading && docActionType === "label" ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Truck size={11} />
              )}
              Label
            </button>
            <button
              type="button"
              disabled={
                docDownloadLoading ||
                (() => {
                  const ids = getShipmentIdsForItem(rowItem);
                  return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                })()
              }
              onClick={() => handleManifestForItem(rowItem)}
              className="inline-flex items-center justify-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              {docDownloadLoading && docActionType === "manifest" ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Package size={11} />
              )}
              Manifest
            </button>
          </>
        )}
      </div>
    );
  };

  const resetOrderListColumns = () => {
    const next = defaultVisibleKeysFor(ORDER_LIST_TABLE_COLUMNS);
    setOrderListVisibleColumns(next);
    persistVisibleColumns(ORDER_LIST_COLUMNS_STORAGE_KEY, next);
  };

  const selectAllOrderListColumns = () => {
    const next = ORDER_LIST_TABLE_COLUMNS.map((c) => c.key);
    setOrderListVisibleColumns(next);
    persistVisibleColumns(ORDER_LIST_COLUMNS_STORAGE_KEY, next);
  };

  const resetItemListColumns = () => {
    const next = defaultVisibleKeysFor(ITEM_LIST_TABLE_COLUMNS);
    setItemListVisibleColumns(next);
    persistVisibleColumns(ITEM_LIST_COLUMNS_STORAGE_KEY, next);
  };

  const selectAllItemListColumns = () => {
    const next = ITEM_LIST_TABLE_COLUMNS.map((c) => c.key);
    setItemListVisibleColumns(next);
    persistVisibleColumns(ITEM_LIST_COLUMNS_STORAGE_KEY, next);
  };

  const resetOrderDetailItemColumns = () => {
    const next = defaultVisibleKeysFor(ORDER_DETAIL_ITEM_DATA_COLUMNS);
    setOrderDetailItemVisibleColumns(next);
    persistVisibleColumns(ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY, next);
  };

  const selectAllOrderDetailItemColumns = () => {
    const next = ORDER_DETAIL_ITEM_DATA_COLUMNS.map((c) => c.key);
    setOrderDetailItemVisibleColumns(next);
    persistVisibleColumns(ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY, next);
  };

  const renderOrderDetailItemDataCell = (key, item, order) => {
    const itemId = String(item.itemId || item._id || "");
    const v = item.variant || {};
    switch (key) {
      case "image":
        return <TableItemImageThumb itemLike={item} onPickImage={setZoomImageUrl} sizeClass="h-12 w-12" />;
      case "productName":
        return (
          <span className="text-xs font-medium text-gray-900" title={item.name}>
            {item.name || "—"}
          </span>
        );
      case "productId":
        return <span className="text-xs text-gray-700">{item.productId || "—"}</span>;
      case "itemId":
        return <span className="break-all text-[10px] text-gray-600">{itemId || "—"}</span>;
      case "lineSku":
        return (
          <div className="min-w-0 space-y-1">
            <div className="truncate text-xs font-medium text-gray-900" title={item.sku || v.sku}>
              {item.sku || v.sku || "—"}
            </div>
            {(() => {
              const exIds = getItemExchangeIds(item);
              if (exIds.length === 0) return null;
              return (
                <p className="break-all text-[10px] text-gray-500">
                  Exchange ID{exIds.length > 1 ? "s" : ""}: {exIds.join(", ")}
                </p>
              );
            })()}
          </div>
        );
      case "variantSku":
        return <span className="font-mono text-xs text-gray-800">{v.sku || "—"}</span>;
      case "size":
        return v.size || "—";
      case "color":
        return v.color || "—";
      case "qty":
        return <span className="tabular-nums text-xs">{item.quantity ?? "—"}</span>;
      case "price":
        return (
          <span className="text-xs font-medium tabular-nums text-gray-900">
            ₹{(item.unitPrice || 0).toLocaleString("en-IN")}
          </span>
        );
      case "pincode":
        return order?.address?.pincode || "—";
      case "payment":
        return manufacturingPaymentLabel(order?.payment);
      case "customerName":
        return order?.userId?.name || order?.address?.name || "—";
      case "customerPhone":
        return `${order?.userId?.countryCode || ""}${order?.userId?.phoneNumber || order?.address?.phone || "—"}`;
      case "storeLink":
        return <TableStoreLink itemId={itemId} itemLike={item} />;
      default:
        return "—";
    }
  };

  return (
    <div className="min-h-screen w-full min-w-0 px-3 py-5 sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-[1920px] min-w-0">
        {/* Header + Search */}
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-600" />
            {exchangeOnly ? "Exchange Orders" : "Order Management"}
          </h1>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={
                viewMode === VIEW_ORDER
                  ? "Search by ID, name, phone..."
                  : "Search by order ID, SKU, customer..."
              }
              value={viewMode === VIEW_ORDER ? search : itemSearch}
              onChange={(e) => {
                if (viewMode === VIEW_ORDER) {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                } else {
                  setItemSearch(e.target.value);
                  setItemPagination((p) => ({ ...p, page: 1 }));
                }
              }}
              className="w-full rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* View mode tabs: By order | By item */}
        {!exchangeOnly ? (
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode(VIEW_ORDER)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewMode === VIEW_ORDER
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              By order
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_ITEM)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewMode === VIEW_ITEM
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              By item
            </button>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
            Exchange Orders are shown in By order mode.
          </div>
        )}

        {/* Delivery type — filters both list APIs on the backend */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery type</p>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_TYPE_TABS.map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => {
                  setDeliveryTypeFilter(tab.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                  setItemPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  deliveryTypeFilter === tab.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!selectedOrder && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-950">
                Manufacturing & fulfilment PDF
              </p>
              <p className="text-xs text-indigo-900/80 mt-1 max-w-xl">
                Exports <span className="font-medium">every line</span> that matches your current filters (up to 8,000
                lines per file — the PDF header says if the export was capped). Uses{" "}
                <span className="font-medium">order date range</span>, <span className="font-medium">delivery type</span>
                , search
                {exchangeOnly ? (
                  <>, and <span className="font-medium">exchange</span> lines only.</>
                ) : viewMode === VIEW_ITEM ? (
                  <>
                    , plus <span className="font-medium">line status</span> from the By item tab. The table below is
                    paginated for browsing; the PDF still includes all matching lines.
                  </>
                ) : (
                  <>
                    . Open <span className="font-medium">By item</span> to set line status for the export; dates and
                    delivery apply from here too.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={manufacturingPdfLoading}
              onClick={handleDownloadManufacturingPdf}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              title="Downloads one PDF with all order lines matching your filters (max 8,000 per download). Large exports may take a minute."
            >
              {manufacturingPdfLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Download manufacturing PDF
            </button>
          </div>
        )}

        {!selectedOrder && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                Stale orders (CONFIRMED 24h+)
              </p>
              <p className="text-xs text-amber-900/80 mt-1 max-w-xl">
                Lines still in <span className="font-medium">CONFIRMED</span> with no move to PROCESSING or
                shipped for at least 24 hours. Review in the list, download PDF, or email the daily report.
              </p>
            </div>
            <button
              type="button"
              onClick={openStaleOrdersModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <Clock className="h-4 w-4" aria-hidden />
              View stale orders
            </button>
          </div>
        )}

        {error && viewMode === VIEW_ORDER && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        {itemError && viewMode === VIEW_ITEM && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            {itemError}
          </div>
        )}

        {!selectedOrder ? (
          viewMode === VIEW_ORDER ? (
            <>
              {/* Filters: By order */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-gray-800">Filters</p>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {(dateFrom ||
                      dateTo ||
                      statusFilter ||
                      sortOrder !== "desc") && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setStatusFilter("");
                          setSortBy("createdAt");
                          setSortOrder("desc");
                          setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Clear all
                      </button>
                    )}
                    <ColumnPickerDropdown
                      columns={ORDER_LIST_TABLE_COLUMNS}
                      visibleKeys={orderListVisibleColumns}
                      onToggle={toggleOrderListColumn}
                      onReset={resetOrderListColumns}
                      onSelectAll={selectAllOrderListColumns}
                      open={orderListColumnsOpen}
                      onOpenChange={setOrderListColumnsOpen}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="order-filter-from" className="text-xs font-semibold text-gray-500">
                      From date
                    </label>
                    <input
                      id="order-filter-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="order-filter-to" className="text-xs font-semibold text-gray-500">
                      To date
                    </label>
                    <input
                      id="order-filter-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="order-filter-status" className="text-xs font-semibold text-gray-500">
                      Status
                    </label>
                    <select
                      id="order-filter-status"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">All statuses</option>
                      {filteredStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="order-filter-sort" className="text-xs font-semibold text-gray-500">
                      Sort
                    </label>
                    <select
                      id="order-filter-sort"
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        const [by, order] = v.split("-");
                        setSortBy(by || "createdAt");
                        setSortOrder(order || "desc");
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="createdAt-desc">Latest first</option>
                      <option value="createdAt-asc">Oldest first</option>
                    </select>
                  </div>
                </div>
              </div>

            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] table-auto border-collapse text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {orderListActiveColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 ${
                          col.key === "info" ? "px-1 text-center" : ""
                        }`}
                        title={
                          col.key === "info"
                            ? "Store link"
                            : col.key === "courier"
                              ? "Shiprocket (normal delivery)"
                              : undefined
                        }
                      >
                        {col.key === "info" ? "Info" : col.key === "orderId" ? "Order" : col.key === "courier" ? "Courier / SR" : col.label}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      Details / notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={orderListColSpan} className="py-16 text-center text-gray-500">
                        Loading orders…
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={orderListColSpan} className="py-16 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50/70 transition-colors">
                        {orderListActiveColumns.map((col) => (
                          <td key={col.key} className={orderListCellTdClass(col.key)}>
                            {renderOrderListCell(col.key, order)}
                          </td>
                        ))}
                        <td className="px-1 py-2 align-middle text-center">
                          {renderOrderListActions(order)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-3">
                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{pagination.page}</span> of{" "}
                  <span className="font-medium">{pagination.totalPages || 1}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            </>
          ) : (
            <>
              {/* Filters: By item */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-gray-800">Filters</p>
                    <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-100">
                      <button
                        type="button"
                        onClick={() => setItemListView("table")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          itemListViewMode === "table"
                            ? "bg-white text-indigo-700 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemListView("cards")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          itemListViewMode === "cards"
                            ? "bg-white text-indigo-700 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Cards
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {(dateFrom || dateTo || itemStatusFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setItemStatusFilter("");
                          setItemPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Clear all
                      </button>
                    )}
                    {itemListViewMode === "table" && (
                      <ColumnPickerDropdown
                        columns={ITEM_LIST_TABLE_COLUMNS}
                        visibleKeys={itemListVisibleColumns}
                        onToggle={toggleItemListColumn}
                        onReset={resetItemListColumns}
                        onSelectAll={selectAllItemListColumns}
                        open={itemListColumnsOpen}
                        onOpenChange={setItemListColumnsOpen}
                        badgeClass="bg-violet-100 text-violet-900"
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="item-filter-from" className="text-xs font-semibold text-gray-500">
                      From date
                    </label>
                    <input
                      id="item-filter-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setItemPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="item-filter-to" className="text-xs font-semibold text-gray-500">
                      To date
                    </label>
                    <input
                      id="item-filter-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setItemPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                    <label htmlFor="item-filter-status" className="text-xs font-semibold text-gray-500">
                      Line status
                    </label>
                    <select
                      id="item-filter-status"
                      value={itemStatusFilter}
                      onChange={(e) => {
                        setItemStatusFilter(e.target.value);
                        setItemPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">All statuses</option>
                      {filteredStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                  The list is paginated for speed. <span className="font-medium">Download manufacturing PDF</span>{" "}
                  above exports <span className="font-medium">all</span> lines matching dates, delivery, status, and
                  search (not only this page).
                </p>
              </div>
              {itemLoading ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <RefreshCw className="h-10 w-10 animate-spin text-indigo-500 mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    Loading order items…
                  </p>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-gray-200 bg-white">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    No order items found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try changing the status filter or search
                  </p>
                </div>
              ) : itemListViewMode === "table" ? (
                <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full min-w-[800px] table-auto border-collapse text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {itemListActiveColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 ${
                              col.key === "info" ? "text-center" : ""
                            }`}
                          >
                            {col.key === "info" ? "Info" : col.label}
                          </th>
                        ))}
                        <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {orderItems.map((row) => (
                        <tr
                          key={`${row.orderId}-${row.itemId}`}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          {itemListActiveColumns.map((col) => (
                            <td key={col.key} className={itemListCellTdClass(col.key)}>
                              {renderItemListCell(col.key, row)}
                            </td>
                          ))}
                          <td className="px-2 py-2 align-top">{renderItemListActions(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((row) => (
                    <div
                      key={`${row.orderId}-${row.itemId}`}
                      className="group rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-5 flex flex-wrap items-center gap-4 sm:gap-6">
                        <TableItemImageThumb
                          itemLike={itemLikeFromListRow(row)}
                          onPickImage={setZoomImageUrl}
                          sizeClass="h-16 w-16"
                        />
                        <StoreItemInfoTrigger
                          itemId={row.itemId}
                          itemLike={row.item}
                          quantity={row.item?.quantity}
                          onOpenDetails={() =>
                            setStoreInfoModal({
                              title: `Order #${row.orderId || ""}`,
                              lines: [
                                {
                                  itemId: row.itemId,
                                  itemLike: row.item,
                                  quantity: row.item?.quantity,
                                  ctx: {
                                    orderId: row.orderId,
                                    orderCreatedAt: row.orderCreatedAt,
                                    payment: row.payment,
                                    address: row.address,
                                    user: row.user,
                                  },
                                },
                              ],
                            })
                          }
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              Order #{row.orderId}
                            </span>
                            {row.deliveryType ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {DELIVERY_TYPE_TABS.find((t) => t.value === row.deliveryType)?.label ??
                                  String(row.deliveryType).replace(/_/g, " ")}
                              </span>
                            ) : null}
                            <span className="text-sm font-medium text-gray-700">
                              {row.user?.name || row.address?.name || "—"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {row.user?.countryCode || ""}
                              {row.user?.phoneNumber || "—"}
                            </span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {row.item?.name || row.item?.sku || "—"}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            <span>
                              SKU: {row.item?.sku ?? row.itemId ?? "—"}
                            </span>
                            {row.item?.variant?.color && (
                              <span>{row.item.variant.color}</span>
                            )}
                            {row.item?.variant?.size && (
                              <span>Size: {row.item.variant.size}</span>
                            )}
                            <span>
                              {row.orderCreatedAt
                                ? new Date(
                                    row.orderCreatedAt,
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                          {String(row.deliveryType || "").toUpperCase() === "NORMAL" && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 mt-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900 mb-1.5">
                                Shiprocket
                              </p>
                              {(() => {
                                const sr = shiprocketFromItemRow(row);
                                return sr ? (
                                  <ShiprocketDetails sr={sr} />
                                ) : (
                                  <p className="text-xs text-amber-800">
                                    No AWB / tracking yet (normal delivery — create shipment when ready).
                                  </p>
                                );
                              })()}
                            </div>
                          )}
                          {(() => {
                            const rowItem = {
                              ...(row.item && typeof row.item === "object" ? row.item : {}),
                              delivery: {
                                type: row.deliveryType || row.item?.delivery?.type,
                              },
                              shipmentId:
                                row.item?.shipmentId ?? row.shipmentId ?? null,
                              shipmentGroupId:
                                row.item?.shipmentGroupId ??
                                row.shipmentGroupId ??
                                null,
                              shiprocket: {
                                ...(row.item?.shiprocket || {}),
                                shipmentId:
                                  row.item?.shiprocket?.shipmentId ??
                                  row.item?.shipmentId ??
                                  row.shipmentId ??
                                  null,
                                shipmentGroupId:
                                  row.item?.shiprocket?.shipmentGroupId ??
                                  row.item?.shipmentGroupId ??
                                  row.shipmentGroupId ??
                                  null,
                              },
                            };
                            if (String(row.deliveryType || "").toUpperCase() !== "NORMAL") {
                              return null;
                            }
                            return (
                              <div className="mt-1 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={docDownloadLoading}
                                  onClick={() => handleLabelForItem(rowItem)}
                                  className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                >
                                  {docDownloadLoading && docActionType === "label" ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Truck size={12} className="shrink-0" />
                                  )}
                                  {docDownloadLoading && docActionType === "label"
                                    ? "Loading..."
                                    : "Download label"}
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    docDownloadLoading ||
                                    (() => {
                                      const ids = getShipmentIdsForItem(rowItem);
                                      return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                                    })()
                                  }
                                  onClick={() => handleManifestForItem(rowItem)}
                                  className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                  title={
                                    (() => {
                                      const ids = getShipmentIdsForItem(rowItem);
                                      return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)))
                                        ? "Manifest already downloaded for this shipment"
                                        : "Download manifest";
                                    })()
                                  }
                                >
                                  {docDownloadLoading && docActionType === "manifest" ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Package size={12} className="shrink-0" />
                                  )}
                                  {docDownloadLoading && docActionType === "manifest"
                                    ? "Loading..."
                                    : "Manifest"}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Qty
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {row.item?.quantity ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="min-w-0 max-w-[13rem]">
                              {renderItemStatusBreakdown(
                                lineItemFromOrderItemRow(row) || {
                                  status: row.itemStatus,
                                },
                                { compact: true },
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (!row.orderId) return;
                                setSelectedItemIdFromListView(
                                  String(row.itemId ?? row.productItemId ?? ""),
                                );
                                setItemPage(1);
                                fetchSingleOrder(row.orderId);
                              }}
                              className="rounded-lg p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                              title="View & update item status"
                            >
                              <span className="text-sm font-medium">View details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!itemLoading && orderItems.length > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-700">
                    Page{" "}
                    <span className="font-medium">{itemPagination.page}</span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {itemPagination.totalPages || 1}
                    </span>
                    {itemPagination.total != null && (
                      <span className="ml-2 text-gray-500">
                        ({itemPagination.total} item
                        {itemPagination.total !== 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page</label>
                      <select
                        value={itemPagination.limit}
                        disabled={itemLoading}
                        onChange={(e) => {
                          const lim = Math.min(100, Math.max(10, Number(e.target.value) || 20));
                          setItemPagination((p) => ({ ...p, limit: lim, page: 1 }));
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={itemPagination.page <= 1 || itemLoading}
                        onClick={() => {
                          setItemPagination((p) => ({
                            ...p,
                            page: Math.max(1, p.page - 1),
                          }));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <button
                        type="button"
                        disabled={
                          itemPagination.page >= itemPagination.totalPages ||
                          itemLoading
                        }
                        onClick={() => {
                          setItemPagination((p) => ({ ...p, page: p.page + 1 }));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          (() => {
            const fromItemList = Boolean(selectedItemIdFromListView);
            const focusedItem =
              fromItemList && selectedOrder?.items
                ? selectedOrder.items.find(
                    (it) =>
                      String(it.itemId || it._id) ===
                      selectedItemIdFromListView,
                  )
                : null;

            return (
              <div className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="border-b bg-gray-50 px-6 py-5">
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderError(null);
                      setOrderAssignments(null);
                      setSelectedItemIds([]);
                      setBulkStatus("");
                      setSelectedItemIdFromListView(null);
                    }}
                    className="mb-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                  >
                    ← Back to{" "}
                    {viewMode === VIEW_ITEM ? "order items" : "orders list"}
                  </button>

                  {fromItemList ? (
                    /* Item-based flow: minimal header, no order status */
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Item details · Order #{selectedOrder?.orderId || "—"}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {selectedOrder?.userId?.name ||
                            selectedOrder?.address?.name ||
                            "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIdFromListView(null)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View full order (all items)
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Order #{selectedOrder?.orderId || "—"}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                          <Clock size={16} />
                          {new Date(selectedOrder?.createdAt).toLocaleString(
                            "en-IN",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {getStatusBadge(getDisplayOrderStatus(selectedOrder))}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-sm text-gray-700 whitespace-nowrap">
                            Update all items:
                          </label>
                          <select
                            value={wholeOrderNewStatus}
                            onChange={(e) =>
                              setWholeOrderNewStatus(e.target.value)
                            }
                            disabled={updatingWholeOrder}
                            className="min-w-[160px] rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-60"
                          >
                            <option value="">Select status…</option>
                            {filteredStatusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleUpdateWholeOrderStatus}
                            disabled={
                              updatingWholeOrder || !wholeOrderNewStatus
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                          >
                            {updatingWholeOrder ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Applying…
                              </>
                            ) : (
                              "Apply to all"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {orderError && (
                  <div className="mx-6 mt-5 rounded-lg bg-red-50 p-4 text-red-700 flex items-center gap-3">
                    <AlertCircle size={20} />
                    {orderError}
                  </div>
                )}

            {fromItemList && focusedItem ? (
              /* Item-based flow: only this item's status and details */
              <div className="p-6">
                <div className="max-w-2xl space-y-6">
                  {/* Product card */}
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start gap-6">
                      {focusedItem.variant?.imageUrl && (
                        <img
                          src={focusedItem.variant.imageUrl}
                          alt={focusedItem.sku}
                          className="h-28 w-28 rounded-xl object-cover border-2 border-gray-100 shadow-inner"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Order #{selectedOrder?.orderId}</p>
                        <p className="mt-1 text-xs text-gray-500 break-all">
                          Item ID: {String(focusedItem.itemId || focusedItem._id || "—")}
                        </p>
                        {(() => {
                          const exIds = getItemExchangeIds(focusedItem);
                          if (exIds.length === 0) return null;
                          return (
                            <p className="mt-0.5 text-xs text-gray-500 break-all">
                              Exchange ID{exIds.length > 1 ? "s" : ""}: {exIds.join(", ")}
                            </p>
                          );
                        })()}
                        {(() => {
                          const latestExchange = getLatestExchange(focusedItem);
                          const exchangeImageUrls = extractExchangeImageUrls(latestExchange);
                          const exchangeReason = getExchangeReason(latestExchange);
                          if (!exchangeReason && exchangeImageUrls.length === 0) return null;
                          return (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                Exchange details
                              </p>
                              {exchangeReason ? (
                                <p className="mt-1 break-all text-xs text-amber-900">
                                  Reason: {exchangeReason}
                                </p>
                              ) : null}
                              {latestExchange?.desiredColor || latestExchange?.desiredSize ? (
                                <p className="mt-1 text-lg font-bold text-amber-900">
                                  Requested:{" "}
                                  {[latestExchange?.desiredColor, latestExchange?.desiredSize]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </p>
                              ) : null}
                              {latestExchange?.replacedItem ? (
                                <div className="mt-1 rounded border border-amber-200 bg-white px-2 py-1">
                                  <p className="text-[11px] font-semibold text-amber-900">
                                    Replacement item
                                  </p>
                                  <p className="text-[11px] text-amber-800">
                                    {latestExchange.replacedItem?.sku || "—"}
                                    {latestExchange.replacedItem?.variant?.color
                                      ? ` · ${latestExchange.replacedItem.variant.color}`
                                      : ""}
                                    {latestExchange.replacedItem?.variant?.size
                                      ? ` · ${latestExchange.replacedItem.variant.size}`
                                      : ""}
                                  </p>
                                  {latestExchange.replacedItem?.variant?.imageUrl ? (
                                    <div className="mt-1">
                                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                        Desired replacement image
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setZoomImageUrl(
                                            latestExchange.replacedItem.variant.imageUrl,
                                          )
                                        }
                                        className="block overflow-hidden rounded border border-amber-200 bg-white"
                                        title="Open desired replacement image"
                                      >
                                        <img
                                          src={latestExchange.replacedItem.variant.imageUrl}
                                          alt="Desired replacement item"
                                          className="h-16 w-16 object-cover"
                                          loading="lazy"
                                        />
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {exchangeImageUrls.length > 0 ? (
                                <>
                                  <p className="mb-2 mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    User uploaded exchange pics
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {exchangeImageUrls.map((url, idx) => (
                                      <button
                                        key={`${url}-${idx}`}
                                        type="button"
                                        onClick={() => setZoomImageUrl(url)}
                                        className="group block overflow-hidden rounded-lg border border-gray-200 bg-white text-left"
                                        title="Open full image"
                                      >
                                        <img
                                          src={url}
                                          alt={`Exchange upload ${idx + 1}`}
                                          className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                          loading="lazy"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="mt-1 text-xs text-amber-700">No exchange images uploaded.</p>
                              )}
                            </div>
                          );
                        })()}
                        <h3 className="text-xl font-bold text-gray-900 mt-1">
                          {focusedItem.sku || focusedItem.variant?.sku || "—"}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
                          {focusedItem.variant?.color && <span>Color: {focusedItem.variant.color}</span>}
                          {focusedItem.variant?.size && <span>Size: {focusedItem.variant.size}</span>}
                        </div>
                        <div className="mt-3 flex items-baseline gap-4 text-sm">
                          <span className="font-semibold text-gray-800">Qty: {focusedItem.quantity}</span>
                          <span className="text-gray-600">₹{(focusedItem.unitPrice || 0).toLocaleString("en-IN")} each</span>
                        </div>
                      {!isNormalDeliveryLine(focusedItem) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {canDownloadInvoice(focusedItem) ? (
                            <button
                              type="button"
                              disabled={docDownloadLoading}
                              onClick={() =>
                                handleGetInvoiceClick(
                                  selectedOrder,
                                  focusedItem,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                            >
                              <CreditCard size={14} />
                              Download invoice
                            </button>
                          ) : (
                            <p className="text-xs text-amber-700">
                              Invoice is not available when status is{" "}
                              <span className="font-semibold">Created</span> or{" "}
                              <span className="font-semibold">Confirmed</span>.
                            </p>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                    <div className="mt-4 w-full border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Status (line, history & Shiprocket)
                      </p>
                      {renderItemStatusBreakdown(focusedItem)}
                    </div>
                  </div>
                  {(() => {
                    const driver = getDriverPartnerDisplay(focusedItem);
                    return driver ? (
                      <div className="flex items-center gap-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/80 px-5 py-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                          <UserCircle size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Driver partner</p>
                          <p className="text-base font-semibold text-gray-900 mt-0.5">
                            {driver.name}
                            {driver.phone && <span className="font-normal text-gray-600 ml-1">· {driver.phone}</span>}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {isNormalDeliveryLine(focusedItem) && (
                    <div className="rounded-xl border-2 border-sky-200 bg-sky-50/90 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold text-sky-900 mb-3 flex items-center gap-2">
                        <Truck size={16} className="text-sky-700" />
                        Shiprocket (normal delivery)
                      </h4>
                      {(() => {
                        const sr = getLineShiprocket(focusedItem);
                        return (
                          <div className="space-y-2">
                            {sr ? (
                              <ShiprocketDetails sr={sr} />
                            ) : (
                              <p className="text-sm text-amber-800">
                                No Shiprocket shipment linked yet. After you create the shipment, AWB and tracking will
                                appear here.
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {canDownloadInvoice(focusedItem) ? (
                                <button
                                  type="button"
                                  disabled={docDownloadLoading}
                                  onClick={() =>
                                    handleGetInvoiceClick(
                                      selectedOrder,
                                      focusedItem
                                    )
                                  }
                                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 flex items-center gap-2"
                                >
                                  <CreditCard size={14} />
                                  Download invoice
                                </button>
                              ) : (
                                <p className="text-xs text-amber-700">
                                  Invoice is not available when status is{" "}
                                  <span className="font-semibold">Created</span> or{" "}
                                  <span className="font-semibold">Confirmed</span>.
                                </p>
                              )}

                              <button
                                type="button"
                                disabled={docDownloadLoading}
                                onClick={() => handleLabelForItem(focusedItem)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 flex items-center gap-2"
                              >
                                {docDownloadLoading && docActionType === "label" ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Truck size={14} />
                                )}
                                {docDownloadLoading && docActionType === "label"
                                  ? "Loading..."
                                  : "Download label"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  docDownloadLoading ||
                                  (() => {
                                    const ids = getShipmentIdsForItem(focusedItem);
                                    return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                                  })()
                                }
                                onClick={() => handleManifestForItem(focusedItem)}
                                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 flex items-center gap-2"
                                title={
                                  (() => {
                                    const ids = getShipmentIdsForItem(focusedItem);
                                    return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)))
                                      ? "Manifest already downloaded for this shipment"
                                      : "Download manifest";
                                  })()
                                }
                              >
                                {docDownloadLoading && docActionType === "manifest" ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Package size={14} />
                                )}
                                {docDownloadLoading && docActionType === "manifest"
                                  ? "Loading..."
                                  : "Manifest"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Change status card */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gray-50/50 p-6">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <RefreshCw size={16} className="text-indigo-600" />
                      Update item status
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={focusedItem.status || "CREATED"}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          handleUpdateItemStatus(
                            selectedOrder.orderId,
                            focusedItem.itemId || focusedItem._id,
                            newVal,
                          );
                        }}
                        disabled={updatingItemId === String(focusedItem.itemId || focusedItem._id)}
                        className="min-w-[220px] rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                      >
                        {filteredStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {updatingItemId === String(focusedItem.itemId || focusedItem._id) && (
                        <span className="flex items-center gap-2 text-sm text-indigo-600">
                          <RefreshCw size={18} className="animate-spin" />
                          Updating…
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Select a new status to update this line item.</p>
                  </div>
                  {/* Status history */}
                  {focusedItem.statusHistory && focusedItem.statusHistory.length > 0 && (
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
                      <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-gray-500" />
                        Status history
                      </h4>
                      <ul className="space-y-0">
                        {focusedItem.statusHistory.map((h, i) => (
                          <li
                            key={i}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm border-b border-gray-100 last:border-0 last:pb-0 first:pt-0"
                          >
                            <span className="font-semibold text-gray-900 min-w-[140px]">{h.status}</span>
                            {h.previousStatus && <span className="text-blue-700">← {h.previousStatus}</span>}
                            {h.notes && <span className="text-gray-500 italic">"{h.notes}"</span>}
                            {h.createdAt && (
                              <span className="ml-auto text-xs text-gray-500 tabular-nums">
                                {new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : fromItemList && orderLoading ? (
              <div className="p-12 text-center text-gray-500">Loading item details…</div>
            ) : fromItemList && !focusedItem ? (
              <div className="p-6 text-center text-gray-500">Item not found in this order.</div>
            ) : !fromItemList ? (
            <div className="p-6 space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={18} className="text-indigo-600" />
                    <h4 className="text-sm font-semibold text-gray-700">Customer</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedOrder?.userId?.name || "—"}</p>
                    <p><strong>Phone:</strong> {selectedOrder?.userId?.countryCode || ""}{selectedOrder?.userId?.phoneNumber || "—"}</p>
                    <p><strong>Email:</strong> {selectedOrder?.userId?.email || "—"}</p>
                  </div>
                </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Payment
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Mode:</strong>{" "}
                            <span
                              className={
                                selectedOrder?.payment?.mode === "COD"
                                  ? "text-orange-700 font-medium"
                                  : ""
                              }
                            >
                              {selectedOrder?.payment?.mode || "—"}
                            </span>
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={
                                selectedOrder?.payment?.status === "SUCCESS"
                                  ? "text-green-700 font-medium"
                                  : selectedOrder?.payment?.status === "PENDING"
                                    ? "text-amber-700 font-medium"
                                    : "text-red-700 font-medium"
                              }
                            >
                              {selectedOrder?.payment?.status || "—"}
                            </span>
                          </p>
                          <p>
                            <strong>Amount:</strong> ₹
                            {(
                              selectedOrder?.payment?.amount || 0
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Delivery Address
                          </h4>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">
                            {selectedOrder?.address?.name || "—"}
                          </p>
                          <p>{selectedOrder?.address?.fullAddress || "—"}</p>
                          <p>
                            Pincode: {selectedOrder?.address?.pincode || "—"}
                          </p>
                          <p>Phone: {selectedOrder?.address?.phone || "—"}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Pricing
                          </h4>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            Subtotal: ₹
                            {(
                              selectedOrder?.pricing?.subTotal || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p>
                            Delivery: ₹
                            {(
                              selectedOrder?.pricing?.delivery?.totalCharge || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p>
                            GST: ₹
                            {(
                              selectedOrder?.pricing?.gst?.totalGst || 0
                            ).toLocaleString("en-IN")}
                          </p>
                          <p className="font-bold text-base pt-2 border-t mt-2">
                            Final Payable: ₹
                            {(
                              selectedOrder?.pricing?.finalPayable || 0
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery assignments: Reassign / Remove driver */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck size={18} className="text-indigo-600" />
                        <h4 className="text-sm font-semibold text-gray-700">
                          Delivery assignments
                        </h4>
                      </div>
                      {unassignError && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle size={16} />
                          {unassignError}
                        </div>
                      )}
                      {orderAssignments == null ? (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Loading assignments…
                        </p>
                      ) : !orderAssignments.assignments?.length ? (
                        <p className="text-sm text-gray-500">
                          No delivery assignments yet. Select items in the table
                          below and click "Assign driver to selected", or assign
                          when updating status to Shipped / Out for delivery.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {orderAssignments.assignments
                            .filter(
                              (a) =>
                                ![
                                  "CANCELLED",
                                  "REJECTED",
                                  "DELIVERED",
                                ].includes(a.status),
                            )
                            .map((a) => {
                              const driver = a.deliveryAgentId;
                              const name =
                                typeof driver === "object"
                                  ? driver?.name
                                  : null;
                              const phone =
                                typeof driver === "object"
                                  ? driver?.phoneNumber
                                  : null;
                              const assignmentItemIds = Array.isArray(a.itemIds)
                                ? a.itemIds
                                : [];
                              const idSet = new Set(
                                assignmentItemIds.map((id) =>
                                  (id?._id ?? id).toString(),
                                ),
                              );
                              const assignedItems = (
                                selectedOrder?.items ?? []
                              ).filter((it) =>
                                idSet.has(String(it.itemId ?? it._id)),
                              );
                              const itemSkus = assignedItems.map(
                                (it) =>
                                  it.sku ||
                                  it.variant?.sku ||
                                  it.itemId ||
                                  it._id ||
                                  "—",
                              );
                              return (
                                <div
                                  key={a._id}
                                  className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <UserCircle
                                      size={20}
                                      className="text-indigo-600 shrink-0 mt-0.5"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {name || "Driver"}
                                        {phone && (
                                          <span className="text-gray-500 font-normal ml-1">
                                            · {phone}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {a.assignmentType === "ORDER"
                                          ? "Whole order"
                                          : `${assignmentItemIds.length} item(s)`}{" "}
                                        · {a.status}
                                      </p>
                                      {itemSkus.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {itemSkus.map((sku, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                            >
                                              {String(sku)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReassignDriver(
                                          selectedOrder.orderId,
                                          a,
                                        )
                                      }
                                      disabled={unassignLoading}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                      title="Assign to a different driver"
                                    >
                                      <UserPlus size={14} />
                                      Reassign
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveDriver(
                                          selectedOrder.orderId,
                                          a._id,
                                        )
                                      }
                                      disabled={unassignLoading}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                      title="Remove driver (unassign)"
                                    >
                                      <UserMinus size={14} />
                                      Remove driver
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          {orderAssignments.assignments.filter(
                            (a) =>
                              !["CANCELLED", "REJECTED", "DELIVERED"].includes(
                                a.status,
                              ),
                          ).length === 0 && (
                            <p className="text-sm text-gray-500">
                              No active assignments. Select items below and
                              click "Assign driver to selected", or assign when
                              updating status to Shipped / Out for delivery.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedOrder?.shipments?.length > 0 && (
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Truck size={18} className="text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Shipments / Warehouses
                          </h4>
                        </div>

                        {(() => {
                          const normalShips = (selectedOrder?.shipments || []).filter(
                            (s) => String(s?.deliveryType || "").toUpperCase() === "NORMAL"
                          );
                          const shipmentIds = normalShips
                            .map((s) => s?.shipmentId ?? s?.shipmentGroupId ?? s?.shipment_id ?? s?._id ?? null)
                            .filter(Boolean)
                            .map(String);
                          const uniqueIds = Array.from(new Set(shipmentIds));

                          if (uniqueIds.length === 0) return null;

                          return (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {/* <button
                                type="button"
                                disabled={docDownloadLoading}
                                onClick={() => handleDownloadLabelsClick(uniqueIds)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                              >
                                <Truck size={14} />
                                Download labels
                              </button> */}
                              {/* <button
                                type="button"
                                disabled={docDownloadLoading}
                                onClick={() => handleDownloadManifestClick(uniqueIds)}
                                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2"
                              >
                                <Package size={14} />
                                Download manifest
                              </button> */}
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {selectedOrder.shipments.map((ship, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-white rounded border shadow-sm"
                            >
                              <p className="font-medium mb-1">
                                {ship.shipmentGroupId}
                              </p>
                              <p>
                                Warehouse: {ship.warehouseId?.name || "—"} (
                                {ship.warehouseId?.code || "—"})
                              </p>
                              <p>
                                Status:{" "}
                                <span className="font-medium">
                                  {ship.status}
                                </span>
                              </p>
                              <p>Type: {ship.deliveryType}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700">
                            Forward shipment
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Create replacement forward shipment for NORMAL exchange orders.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={docDownloadLoading}
                          onClick={() => handleCreateForwardShipmentForOrder(selectedOrder)}
                          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                        >
                          {docDownloadLoading && docActionType === "forward" ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Truck size={14} />
                          )}
                          {docDownloadLoading && docActionType === "forward"
                            ? "Creating..."
                            : "Create Forward Shipment"}
                        </button>
                      </div>
                      {(() => {
                        const forwardPreview = getOrderForwardPreview(selectedOrder);
                        if (!forwardPreview) return null;
                        return (
                          <div className="mt-3 rounded border border-sky-200 bg-white px-3 py-2 text-xs">
                            <p className="font-medium text-sky-700">Forward shipment created</p>
                            {forwardPreview.trackingUrl ? (
                              <a
                                href={forwardPreview.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 underline"
                              >
                                Track forward
                              </a>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <ShoppingBag size={20} />
                          Order Items (
                          {selectedOrder?.totalQuantity ||
                            selectedOrder?.items?.length ||
                            0}
                          )
                        </h3>

                        {selectedOrder?.items?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-3">
                            <ColumnPickerDropdown
                              columns={ORDER_DETAIL_ITEM_DATA_COLUMNS}
                              visibleKeys={orderDetailItemVisibleColumns}
                              onToggle={toggleOrderDetailItemColumn}
                              onReset={resetOrderDetailItemColumns}
                              onSelectAll={selectAllOrderDetailItemColumns}
                              open={orderDetailColumnsOpen}
                              onOpenChange={setOrderDetailColumnsOpen}
                              badgeClass="bg-emerald-100 text-emerald-900"
                            />
                            <span className="text-sm text-gray-600">
                              {selectedItemIds.length > 0
                                ? `${selectedItemIds.length} selected`
                                : "Bulk actions"}
                            </span>
                            <select
                              value={bulkStatus}
                              onChange={(e) => setBulkStatus(e.target.value)}
                              disabled={
                                updatingBulk || selectedItemIds.length === 0
                              }
                              className="min-w-[180px] rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-60"
                            >
                              <option value="">Update selected to…</option>
                              {filteredStatusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleUpdateSelectedItemsStatus}
                              disabled={
                                updatingBulk ||
                                selectedItemIds.length === 0 ||
                                !bulkStatus
                              }
                              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                            >
                              {updatingBulk ? (
                                <>
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                  Updating…
                                </>
                              ) : (
                                "Apply bulk"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openAssignmentModal(
                                  selectedOrder.orderId,
                                  [...selectedItemIds],
                                  null,
                                  true,
                                )
                              }
                              disabled={
                                selectedItemIds.length === 0 || assignLoading
                              }
                              className="rounded-lg border-2 border-indigo-600 px-4 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2"
                              title="Assign a driver to the selected items (e.g. after removing a driver)"
                            >
                              <UserPlus size={14} />
                              Assign driver to selected
                            </button>
                          </div>
                        )}
                      </div>

                {orderLoading ? (
                  <div className="py-12 text-center text-gray-500">Loading items…</div>
                ) : !selectedOrder?.items?.length ? (
                  <div className="py-12 text-center text-gray-500">No items found</div>
                ) : (
                  <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[960px] table-auto border-collapse text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1.5 py-2 text-left align-middle">
                            <input
                              type="checkbox"
                              checked={
                                selectedOrder.items.length > 0 &&
                                selectedOrder.items.every((it) =>
                                  selectedItemIds.includes(String(it.itemId || it._id))
                                )
                              }
                              onChange={selectAllOnPage}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          {orderDetailItemActiveColumns.map((col) => (
                            <th
                              key={col.key}
                              className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                            Status
                          </th>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600" title="Shiprocket — normal delivery only">
                            Ship / docs
                          </th>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600">Driver</th>
                          <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedOrder.items.map((item) => {
                          const itemId = String(item.itemId || item._id);
                          const isUpdating = updatingItemId === itemId;
                          const isSelected = selectedItemIds.includes(itemId);
                          const driverDisplay = getDriverPartnerDisplay(item);
                          return (
                            <tr key={itemId} className={`hover:bg-gray-50/60 ${isSelected ? "bg-indigo-50/50" : ""}`}>
                              <td className="px-1.5 py-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(itemId)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              {orderDetailItemActiveColumns.map((col) => (
                                <td key={col.key} className="min-w-0 px-2 py-2 align-top">
                                  {renderOrderDetailItemDataCell(col.key, item, selectedOrder)}
                                </td>
                              ))}
                              <td className="min-w-0 px-2 py-2 align-top">
                                {renderItemStatusBreakdown(item, { compact: true })}
                              </td>
                              <td className="min-w-0 px-2 py-2 align-top text-xs">
                                <div className="space-y-1.5">
                                  {isNormalDeliveryLine(item) ? (
                                    (() => {
                                      const sr = getLineShiprocket(item);
                                      return (
                                        <>
                                          {sr ? (
                                            <ShiprocketDetails sr={sr} compact />
                                          ) : (
                                            <p className="text-[10px] leading-snug text-amber-800">
                                              Normal — SR pending
                                            </p>
                                          )}
                                          <div className="flex flex-col gap-1">
                                            {canDownloadInvoice(item) ? (
                                              <button
                                                type="button"
                                                disabled={docDownloadLoading}
                                                onClick={() =>
                                                  handleGetInvoiceClick(
                                                    selectedOrder,
                                                    item,
                                                  )
                                                }
                                                className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                                title="Download invoice"
                                              >
                                                <CreditCard size={11} className="shrink-0" />
                                                Invoice
                                              </button>
                                            ) : (
                                              <p className="text-[10px] text-amber-700">
                                                Invoice not for{" "}
                                                <span className="font-semibold">Created</span> /{" "}
                                                <span className="font-semibold">Confirmed</span>.
                                              </p>
                                            )}

                                            <button
                                              type="button"
                                              disabled={docDownloadLoading}
                                              onClick={() => handleLabelForItem(item)}
                                              className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                              title="Download shipping label"
                                            >
                                              {docDownloadLoading && docActionType === "label" ? (
                                                <RefreshCw size={11} className="shrink-0 animate-spin" />
                                              ) : (
                                                <Truck size={11} className="shrink-0" />
                                              )}
                                              {docDownloadLoading && docActionType === "label"
                                                ? "Loading..."
                                                : "Label"}
                                            </button>
                                            <button
                                              type="button"
                                              disabled={
                                                docDownloadLoading ||
                                                (() => {
                                                  const ids = getShipmentIdsForItem(item);
                                                  return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                                                })()
                                              }
                                              onClick={() => handleManifestForItem(item)}
                                              className="inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                              title={
                                                (() => {
                                                  const ids = getShipmentIdsForItem(item);
                                                  return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)))
                                                    ? "Manifest already downloaded for this shipment"
                                                    : "Download manifest";
                                                })()
                                              }
                                            >
                                              {docDownloadLoading && docActionType === "manifest" ? (
                                                <RefreshCw size={11} className="shrink-0 animate-spin" />
                                              ) : (
                                                <Package size={11} className="shrink-0" />
                                              )}
                                              {docDownloadLoading && docActionType === "manifest"
                                                ? "Loading..."
                                                : "Manifest"}
                                            </button>
                                          </div>
                                        </>
                                      );
                                    })()
                                  ) : canDownloadInvoice(item) ? (
                                    <button
                                      type="button"
                                      disabled={docDownloadLoading}
                                      onClick={() =>
                                        handleGetInvoiceClick(
                                          selectedOrder,
                                          item,
                                        )
                                      }
                                      className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                      title="Download invoice"
                                    >
                                      <CreditCard size={11} className="shrink-0" />
                                      Invoice
                                    </button>
                                  ) : (
                                    <p className="text-[10px] text-amber-700">
                                      Invoice not for{" "}
                                      <span className="font-semibold">Created</span> /{" "}
                                      <span className="font-semibold">Confirmed</span>.
                                    </p>
                                  )}
                                  {/* <button
                                    type="button"
                                    disabled={docDownloadLoading}
                                    onClick={() => handleLabelForItem(item)}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                    title="Download shipping label"
                                  >
                                    <Truck size={11} className="shrink-0" />
                                    Label
                                  </button> */}
                                  {/* <button
                                    type="button"
                                    disabled={
                                      docDownloadLoading ||
                                      (() => {
                                        const ids = getShipmentIdsForItem(item);
                                        return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                                      })()
                                    }
                                    onClick={() => handleManifestForItem(item)}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                    title={
                                      (() => {
                                        const ids = getShipmentIdsForItem(item);
                                        return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)))
                                          ? "Manifest already downloaded for this shipment"
                                          : "Download manifest";
                                      })()
                                    }
                                  >
                                    <Package size={11} className="shrink-0" />
                                    Manifest
                                  </button> */}
                                </div>
                              </td>
                              <td className="min-w-0 px-2 py-2 align-top text-xs text-gray-700">
                                {driverDisplay ? (
                                  <span className="flex min-w-0 flex-col gap-0.5">
                                    <span className="inline-flex min-w-0 items-center gap-1">
                                      <UserCircle size={12} className="shrink-0 text-indigo-600" />
                                      <span className="truncate font-medium" title={driverDisplay.name}>
                                        {driverDisplay.name}
                                      </span>
                                    </span>
                                    {driverDisplay.phone && (
                                      <span className="truncate pl-5 text-[10px] text-gray-500 tabular-nums" title={driverDisplay.phone}>
                                        {driverDisplay.phone}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="min-w-0 px-1 py-2 align-top text-center">
                                <div className="relative mx-auto w-full max-w-[160px]">
                                  <select
                                    value={item.status || "CREATED"}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      handleUpdateItemStatus(selectedOrder.orderId, itemId, newVal);
                                    }}
                                    disabled={isUpdating}
                                    className={`w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500 ${
                                      isUpdating ? "opacity-60 cursor-wait" : ""
                                    }`}
                                  >
                                    {filteredStatusOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  {isUpdating && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded bg-white/60">
                                      <RefreshCw size={14} className="animate-spin text-indigo-600" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>
            ) : null}

        {/* Assignment Modal */}
        {assignmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {reassignAssignmentId
                  ? "Reassign driver"
                  : assignmentAssignOnly
                    ? "Assign driver"
                    : "Assign delivery driver"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {reassignAssignmentId
                  ? "The current driver will be removed and the selected driver will be assigned to these items."
                  : assignmentAssignOnly
                    ? assignmentItemIds.length === 1
                      ? `Assign a driver to this item (${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}).`
                      : `Assign a driver to these ${assignmentItemIds.length} items (${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}).`
                    : assignmentMode === "whole"
                      ? `Assign a driver to this order before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`
                      : assignmentItemIds.length === 1
                        ? `Assign a driver to this item before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`
                        : `Assign a driver to these ${assignmentItemIds.length} items before marking as ${statusOptions.find((o) => o.value === pendingNewStatus)?.label || pendingNewStatus}.`}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery agent
                </label>
                <select
                  value={selectedDeliveryAgentId}
                  onChange={(e) => setSelectedDeliveryAgentId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select driver</option>
                  {deliveryAgentsList
                    .filter((a) => a.isActive !== false)
                    .map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name || "Driver"}{" "}
                        {agent.phoneNumber ? ` – ${agent.phoneNumber}` : ""}
                      </option>
                    ))}
                </select>
              </div>
              {assignError && (
                <p className="text-sm text-red-600 mb-3">{assignError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!assignLoading) {
                      setAssignmentModalOpen(false);
                      setReassignAssignmentId(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignmentSubmit}
                  disabled={assignLoading || !selectedDeliveryAgentId}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {assignLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      {reassignAssignmentId ? "Reassigning…" : "Assigning…"}
                    </>
                  ) : reassignAssignmentId ? (
                    "Reassign driver"
                  ) : assignmentAssignOnly ? (
                    "Assign driver"
                  ) : (
                    "Assign & update status"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exchange rejection note modal */}
        {rejectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Reject exchange request
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {pendingRejection?.itemIds?.length
                  ? `A rejection note is required for ${pendingRejection.itemIds.length} selected item(s). It will be shown to the customer.`
                  : "A rejection note is required. It will be shown to the customer."}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection note *
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. Item does not meet exchange policy criteria."
                  rows={4}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {rejectionError && (
                <p className="text-sm text-red-600 mb-3">{rejectionError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!rejectionSubmitting) {
                      setRejectionModalOpen(false);
                      setPendingRejection(null);
                      setRejectionNote("");
                      setRejectionError(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectionSubmit}
                  disabled={rejectionSubmitting || !rejectionNote.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {rejectionSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    "Reject exchange"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
              </div>
            );
          })()
        )}

        {staleModalOpen && (
          <div
            className="fixed inset-0 z-[74] flex items-center justify-center bg-black/50 p-4 sm:p-6"
            onClick={closeStaleOrdersModal}
            role="presentation"
          >
            <div
              className="mx-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="stale-orders-modal-title"
            >
              <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3
                    id="stale-orders-modal-title"
                    className="text-base font-semibold text-amber-950 flex items-center gap-2"
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    Stale orders
                  </h3>
                  <p className="text-xs text-amber-900/90 mt-1">
                    {staleLoading
                      ? "Loading…"
                      : `${staleMeta.totalMatched} line(s) · CONFIRMED for ${staleMeta.olderThanHours}+ hours`}
                    {staleMeta.truncated ? " (list capped — see PDF for full export)" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeStaleOrdersModal}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white/80"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3 bg-white">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Hours</label>
                  <select
                    value={staleHours}
                    onChange={(e) => {
                      const h = parseInt(e.target.value, 10) || 24;
                      setStaleHours(h);
                      fetchStaleOrdersList(h);
                    }}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={72}>72</option>
                  </select>
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    value={staleSearch}
                    onChange={(e) => setStaleSearch(e.target.value)}
                    placeholder="Search order, SKU, customer…"
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStaleColumnsOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    aria-expanded={staleColumnsOpen}
                  >
                    <Columns3 className="h-4 w-4" />
                    Columns
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                      {staleActiveColumns.length}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${staleColumnsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {staleColumnsOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Choose columns to show
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {STALE_ORDER_TABLE_COLUMNS.map((col) => {
                          const checked = staleVisibleColumns.includes(col.key);
                          const locked = !!col.alwaysVisible;
                          return (
                            <label
                              key={col.key}
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                                locked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={locked}
                                onChange={() => toggleStaleColumn(col.key)}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-gray-800">{col.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
                        <button
                          type="button"
                          onClick={selectAllStaleColumns}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Show all
                        </button>
                        <button
                          type="button"
                          onClick={resetStaleColumns}
                          className="text-xs font-medium text-gray-600 hover:text-gray-800"
                        >
                          Reset default
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={staleLoading}
                  onClick={() => fetchStaleOrdersList(staleHours)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${staleLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={stalePdfLoading || staleLoading}
                  onClick={handleDownloadStalePdf}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                >
                  {stalePdfLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  PDF
                </button>
                <button
                  type="button"
                  disabled={staleEmailLoading || staleLoading}
                  onClick={handleSendStaleAlertEmail}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  title="Sends email to addresses in server STALE_ORDER_ALERT_EMAIL_TO"
                >
                  {staleEmailLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Email report
                </button>
              </div>

              {staleColumnsOpen && (
                <p className="border-b border-amber-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-900/90">
                  Showing:{" "}
                  <span className="font-medium">
                    {staleActiveColumns.map((c) => c.label).join(" · ")}
                  </span>
                  <span className="text-amber-800/70"> — saved in this browser</span>
                </p>
              )}

              <div className="min-h-0 flex-1 overflow-auto">
                {staleLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mb-2" />
                    <p className="text-sm">Loading stale orders…</p>
                  </div>
                ) : filteredStaleOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
                    <p className="text-sm font-medium text-gray-700">No stale orders</p>
                    <p className="text-xs mt-1">
                      {staleSearch.trim()
                        ? "No matches for your search"
                        : `All clear for ${staleHours}+ hour threshold`}
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide z-10">
                      <tr>
                        {staleActiveColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-4 py-2.5 whitespace-nowrap ${col.headerClass || ""} ${
                              col.key === "orderId" ? "" : ""
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStaleOrders.map((row, idx) => (
                        <tr key={`${row.orderId}-${row.sku}-${idx}`} className="hover:bg-amber-50/50">
                          {staleActiveColumns.map((col) => (
                            <td
                              key={col.key}
                              className={`px-4 py-2 ${col.cellClass || ""}`}
                              title={
                                col.key === "sku" || col.key === "customerName"
                                  ? String(col.render(row) ?? "")
                                  : undefined
                              }
                            >
                              {col.render(row)}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenStaleOrder(row.orderId)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Open order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {orderNotesModalOpen && orderNotesModalOrderId && (
          <div
            className="fixed inset-0 z-[76] flex items-center justify-center bg-black/50 p-4 sm:p-6"
            onClick={closeOrderNotesModal}
            role="presentation"
          >
            <div
              className="mx-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-notes-modal-title"
            >
              <div className="border-b border-gray-100 bg-slate-50 px-5 py-3">
                <h3
                  id="order-notes-modal-title"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <StickyNote size={16} className="text-indigo-600 shrink-0" />
                  Order notes
                </h3>
                <p className="mt-0.5 text-xs text-gray-600 truncate" title={orderNotesModalOrderId}>
                  #{orderNotesModalOrderId}
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="max-h-[38vh] min-h-[120px] overflow-y-auto border-b border-gray-100 px-4 py-3">
                  {orderNotesModalLoading ? (
                    <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                      <RefreshCw size={16} className="animate-spin" />
                      Loading notes…
                    </p>
                  ) : orderNotesModalNotes.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">No notes yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {[...orderNotesModalNotes].map((n, idx) => (
                        <li
                          key={n._id ?? `modal-note-${idx}`}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
                        >
                          <p className="whitespace-pre-wrap text-gray-800 wrap-break-word">{n.text}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                            <span className="tabular-nums">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleString("en-IN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </span>
                            {n.authorRole ? (
                              <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 capitalize">
                                {n.authorRole}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 space-y-2 px-4 py-3 bg-white">
                  <label className="text-xs font-medium text-gray-600">Add a note</label>
                  <textarea
                    value={orderNotesModalDraft}
                    onChange={(e) => setOrderNotesModalDraft(e.target.value)}
                    placeholder="e.g. Order moved to processed…"
                    rows={3}
                    maxLength={5000}
                    disabled={orderNotesModalSaving || orderNotesModalLoading}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeOrderNotesModal}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrderNoteFromModal}
                      disabled={
                        orderNotesModalSaving ||
                        orderNotesModalLoading ||
                        !String(orderNotesModalDraft || "").trim()
                      }
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderNotesModalSaving ? "Saving…" : "Save note"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {storeInfoModal && Array.isArray(storeInfoModal.lines) && (
          <div
            className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4 sm:p-6"
            onClick={() => setStoreInfoModal(null)}
            role="presentation"
          >
            <div
              className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="store-info-modal-title"
            >
              <div className="border-b border-gray-100 bg-slate-50 px-5 py-3 text-center">
                <h3
                  id="store-info-modal-title"
                  className="text-sm font-semibold text-gray-900"
                >
                  Manufacturing summary
                </h3>
                {storeInfoModal.title ? (
                  <p className="mt-0.5 text-xs text-gray-600">{storeInfoModal.title}</p>
                ) : null}
              </div>
              <div className="max-h-[calc(90vh-7.5rem)] overflow-y-auto bg-slate-100/60 px-4 py-4 sm:px-6 sm:py-5">
                {storeInfoModal.lines.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">No line items.</p>
                ) : (
                  storeInfoModal.lines.map((line, idx) => (
                    <ManufacturingLineCard
                      key={`${String(line.itemId)}-${idx}`}
                      line={line}
                      lineIndex={idx}
                      totalLines={storeInfoModal.lines.length}
                      onPickImage={(src) => setZoomImageUrl(src)}
                    />
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 bg-white px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setStoreInfoModal(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {zoomImageUrl && (
          <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setZoomImageUrl(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute -top-10 right-0 rounded bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-white"
                onClick={() => setZoomImageUrl(null)}
              >
                Close
              </button>
              <img
                src={zoomImageUrl}
                alt="Zoomed exchange upload"
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
