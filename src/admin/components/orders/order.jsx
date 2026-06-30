// src/pages/admin/Orders.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getOrders,
  getOrderItems,
  getAdminOrderSidebarCounts,
  getSingleOrder,
  updateOrderItemStatus,
  updateWholeOrderStatus,
  getAssignmentView,
  assignItems,
  assignWholeOrder,
  unassignOrder,
  listDeliveryAgents,
  approveExchange,
  assignExchangePickup,
  approveReturn,
  bookReturnReversePickup,
  assignReturnPickup,
  createForwardShipment,
  getInvoice,
  downloadShippingLabel,
  downloadSelfShippingLabel,
  downloadShadowfaxLabel,
  downloadSelfShippingInvoice,
  downloadDelhiveryPackingSlip,
  downloadOrderInvoicePdf,
  downloadManifest,
  downloadManufacturingSheetPdf,
  appendOrderNote,
  forceSuccessPaymentAndConfirm,
  createShiprocketForOrderShipments,
  createDelhiveryForOrderShipments,
} from "../../apis/Orderapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { isDebugOrders } from "../../../utils/logLevel.js";
import { getPublicStoreUrl } from "../../../utils/apiConfig.js";
import logger from "../../../utils/logger.js";
import {
  btnDocSmInvoice,
  DocLabelButton,
  DocManifestButton,
  orderDetailCard,
  orderDetailHeader,
  orderFormSelect,
  orderSectionTitle,
} from "./orderform";
import {
  buildAdminAnalyticsCards,
  buildAdminProviderAnalyticsCards,
  getAdminAnalyticsSection,
  getStaleAnalyticsFromPayload,
  getStatusOptionsForSection,
  isSidebarCountsViewReady,
  normalizeStatusToken,
  sectionTotalFromPayload,
  unwrapApiData,
} from "./orderAnalyticsShared";
import {
  describeBindOfferApplicationRow,
  getBindOfferAppliedRows,
  getBindOfferBillLabel,
  getLineBindOfferNote,
  orderHasBindOfferDiscount,
  resolveOrderBindOfferDiscount,
} from "../../utils/bindOffer.util";
import {
  getLineStatusDisplay,
  getLineMilestoneForBadge,
  isExceptionScan,
  formatStatusTokenForUi as formatLineStatusForUi,
  renderLineJourneySummary,
} from "./orderStatusDisplay.jsx";
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
  Loader2,
  AlertCircle,
  User,
  CreditCard,
  MapPin,
  DollarSign,
  ShoppingBag,
  UserCircle,
  UserMinus,
  UserPlus,
  Copy,
  ExternalLink,
  FileDown,
  Info,
  StickyNote,
  AlertTriangle,
  Columns3,
  ChevronDown,
  SlidersHorizontal,
  ListChecks,
  BarChart2,
  RotateCcw,
} from "lucide-react";
import SafeExternalLink from "../../../components/SafeExternalLink.jsx";
import { getSafeHttpHref, openSafeExternalUrl } from "../../../utils/safeUrl.util.js";

const VIEW_ORDER = "order";
const VIEW_ITEM = "item";

/** Fulfilment line statuses — mixed filter uses 2+ distinct values from this set. */
const FULFILMENT_LINE_STATUSES = new Set([
  "CREATED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

const FULFILMENT_STATUS_LABELS = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function normalizeFulfilmentLineStatus(status) {
  const st = String(status ?? "").trim().toUpperCase();
  if (st === "CANCELED") return "CANCELLED";
  return st;
}

function lineStatusMatchesAdminFilter(itemStatus, filterStatus) {
  if (!filterStatus) return true;
  const st = normalizeFulfilmentLineStatus(itemStatus);
  const f = normalizeFulfilmentLineStatus(filterStatus);
  if (f === "EXCHANGE") return st.startsWith("EXCHANGE_");
  if (f === "DELIVERED") return st === "DELIVERED" || st === "EXCHANGE_DELIVERED";
  return st === f;
}

/** Mixed tab: 2+ lines with different statuses; optional Status = present on any line. */
function isOrderMixedLines(order, statusFilter = "") {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length <= 1) return false;
  const statuses = items
    .map((it) => normalizeFulfilmentLineStatus(it?.status))
    .filter(Boolean);
  if (new Set(statuses).size <= 1) return false;
  if (!statusFilter) return true;
  return statuses.some((st) => lineStatusMatchesAdminFilter(st, statusFilter));
}

function getOrderLineStatusSummary(order) {
  const counts = {};
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const it of items) {
    const st = normalizeFulfilmentLineStatus(it?.status);
    if (!st) continue;
    counts[st] = (counts[st] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([st, n]) => `${n}× ${FULFILMENT_STATUS_LABELS[st] || st.replace(/_/g, " ")}`)
    .join(" · ");
}

/** Matches delivery rules + backend `items[].delivery.type` filter (NORMAL, ONE_DAY, 90_MIN) */
const DELIVERY_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "NORMAL", label: "Normal" },
  { value: "ONE_DAY", label: "One day" },
  { value: "90_MIN", label: "90 min" },
];

function getOrdersUiTokens() {
  return {
    btnPrimary:
      "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50",
    btnPrimarySm:
      "inline-flex h-6 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-md bg-brand-600 px-2 text-[10px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50",
    selectToolbar:
      "h-6 w-[6.25rem] shrink-0 rounded-md border border-border bg-white px-1.5 text-[10px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-100 disabled:opacity-50",
    btnOutline:
      "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-40",
    btnAmber:
      "inline-flex items-center justify-center gap-1 rounded-lg border border-warning/40 bg-warning px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-90",
    inputCompact:
      "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
    tableScrollShell:
      "max-h-[calc(100vh-11rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
    tableScrollShellMuted:
      "max-h-[calc(100vh-11rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [scrollbar-width:thin]",
    pageWrap: "text-stone-900",
    outerWrap: "",
    contentWrap: "",
    toolbarCard: "mb-2 rounded-xl border border-border bg-white p-1.5 shadow-sm",
    filterCard: "mb-2 overflow-visible rounded-xl border border-border bg-white shadow-sm",
    tabActive: "bg-brand-600 text-white shadow-sm",
    tabInactive: "border border-border bg-white text-stone-600 hover:bg-canvas-muted",
    deliveryTabActive: "bg-brand-600 text-white shadow-sm",
    deliveryTabInactive: "border border-border bg-white text-stone-600 hover:bg-canvas-muted",
    paymentTabActive: "bg-warning text-white shadow-sm",
    paymentTabInactive: "border border-border bg-canvas-muted text-stone-700 hover:bg-white",
    thead: "sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]",
    th: "text-[10px] font-semibold uppercase tracking-wide text-stone-500",
    rowHover: "hover:bg-brand-50/30",
    checkbox: "h-3.5 w-3.5 rounded border-border accent-brand-600",
    accentText: "text-brand-700",
    errorBox:
      "mb-2 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger",
    bulkBar:
      "mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-[11px] shadow-sm",
    detailItemsToolbar:
      "mb-2 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
    analyticsPanel:
      "mb-2 rounded-xl border border-border bg-white px-2.5 py-2 shadow-sm",
    analyticsCard:
      "inline-flex min-w-[5.5rem] flex-col rounded-lg border px-2 py-1.5 text-left transition",
    analyticsCardActive: "border-brand-500 bg-brand-50 ring-2 ring-brand-200",
    analyticsCardIdle: "border-border bg-canvas-muted/30 hover:border-brand-300 hover:bg-brand-50/40",
    detailDocBtn:
      "inline-flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium transition disabled:opacity-60",
    detailDocBtnBrand:
      "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
    detailDocBtnMuted:
      "border-border bg-canvas-muted text-stone-700 hover:bg-white",
    detailShell: "min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm",
    detailHeader: "border-b border-border bg-canvas-muted/40 px-3 py-2",
    detailOverview: "border-b border-border px-2 pb-2 pt-1.5",
    detailSummaryBox: "overflow-hidden rounded-lg border border-border bg-white",
    detailSummaryHead:
      "flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-canvas-muted/40 px-2.5 py-1.5 text-[11px]",
    detailSummaryCols:
      "grid divide-y border-border/80 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.82fr)_minmax(0,0.82fr)] lg:divide-x lg:divide-y-0",
    detailSummaryCol: "min-w-0 p-2",
    detailSummaryFoot:
      "grid divide-y border-t border-border/80 lg:grid-cols-2 lg:divide-x lg:divide-y-0",
    detailBody: "space-y-3 p-3",
    detailGrid: "grid grid-cols-1 gap-3 sm:grid-cols-3",
    detailSection: "rounded-lg border border-border bg-canvas-muted/25 p-2.5",
    detailSectionTitle:
      "mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500",
    modalOverlay: "fixed inset-0 flex items-center justify-center bg-black/40 px-4",
    modalOverlayDark: "fixed inset-0 flex items-center justify-center bg-black/50 p-4",
    modalShell:
      "flex max-h-[min(90vh,42rem)] w-full flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-xl",
    modalShellMd: "max-w-md",
    modalShellLg: "max-w-lg",
    modalShellWide: "max-w-4xl",
    modalHeader: "shrink-0 border-b border-gray-100 px-5 py-4",
    modalBody: "min-h-0 flex-1 overflow-y-auto px-5 py-4",
    modalFooter: "shrink-0 flex justify-end gap-2 border-t border-gray-100 px-5 py-4",
    modalPanelSimple:
      "w-full max-w-md rounded-none border border-gray-200 bg-white p-6 shadow-xl",
  };
}

function OrderDetailRow({ label, children, className = "", wide = false }) {
  return (
    <>
      <dt className={`shrink-0 text-stone-500 ${className}`}>{label}</dt>
      <dd
        className={`min-w-0 font-medium text-stone-900 ${wide ? "col-span-3" : ""}`}
      >
        {children}
      </dd>
    </>
  );
}

function OrderDetailSectionHead({ title, icon: Icon }) {
  return (
    <div className="mb-1 flex items-center gap-1 border-b border-border/50 pb-0.5">
      {Icon ? <Icon className="h-3 w-3 shrink-0 text-brand-600" aria-hidden /> : null}
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h4>
    </div>
  );
}

function OrderDetailDenseGrid({ children, pairs = 2 }) {
  const cols =
    pairs === 2
      ? "grid-cols-[minmax(3.25rem,auto)_minmax(0,1fr)]"
      : "grid-cols-[minmax(3.25rem,auto)_minmax(0,1fr)_minmax(3.25rem,auto)_minmax(0,1fr)]";
  return (
    <dl className={`grid ${cols} gap-x-2.5 gap-y-0.5 text-[11px] leading-snug`}>
      {children}
    </dl>
  );
}

function OrderDetailBlock({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <OrderDetailSectionHead title={title} icon={Icon} />
      <OrderDetailDenseGrid pairs={1}>{children}</OrderDetailDenseGrid>
    </section>
  );
}

function TableScrollHint() {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
      <span aria-hidden className="select-none text-stone-300">
        ↔
      </span>
      <span>Scroll horizontally to view all columns</span>
    </p>
  );
}

const LIST_PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];

function ListPaginationFooter({
  loading,
  page,
  totalPages,
  total = 0,
  limit,
  onPageChange,
  btnOutline,
  emptyLabel = "0 results",
}) {
  const safeTotal = Number(total) || 0;
  const safeLimit = Math.max(1, Number(limit) || 10);
  const tp = Math.max(1, Number(totalPages) || 1);
  const rangeStart = safeTotal === 0 ? 0 : (page - 1) * safeLimit + 1;
  const rangeEnd = safeTotal === 0 ? 0 : Math.min(page * safeLimit, safeTotal);

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-stone-500">
        {loading ? (
          "Loading…"
        ) : safeTotal === 0 ? (
          emptyLabel
        ) : (
          <>
            Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
            <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
            <span className="font-medium text-stone-700">{safeTotal}</span> total · Page{" "}
            <span className="font-medium text-stone-700">{page}</span> of{" "}
            <span className="font-medium text-stone-700">{tp}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={btnOutline}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
        </button>
        <button
          type="button"
          disabled={page >= tp || loading}
          onClick={() => onPageChange(page + 1)}
          className={btnOutline}
        >
          Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Payment filter dropdown → API `paymentStatus` / `paymentMode` */
const PAYMENT_FILTER_OPTIONS = [
  { value: "", label: "All payments" },
  { value: "cod", label: "COD" },
  { value: "prepaid", label: "Prepaid" },
  { value: "prepaid_pending", label: "Prepaid pending" },
];

const paymentFilterToQuery = (paymentFilter) => {
  switch (paymentFilter) {
    case "cod":
      return { paymentStatus: undefined, paymentMode: "COD" };
    case "prepaid":
      return { paymentStatus: "SUCCESS", paymentMode: "ONLINE" };
    case "prepaid_pending":
    case "pending_online":
      return { paymentStatus: "PENDING", paymentMode: "ONLINE" };
    default:
      return { paymentStatus: undefined, paymentMode: undefined };
  }
};

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

async function copyTextToClipboard(value, label = "Copied") {
  const text = value == null ? "" : String(value);
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    toast.error("Copy failed");
  }
}

/** Admin APIs may attach exchanges on `item.exchanges` or `item.exchange.exchanges`. */
const getItemExchanges = (item) => {
  if (!item || typeof item !== "object") return [];
  if (Array.isArray(item.exchanges) && item.exchanges.length) return item.exchanges;
  const nested = item.exchange;
  if (nested && typeof nested === "object" && Array.isArray(nested.exchanges)) {
    return nested.exchanges;
  }
  return [];
};

const getExchangeRecordId = (exchange) => {
  if (!exchange || typeof exchange !== "object") return null;
  const id = exchange._id ?? exchange.exchangeId ?? exchange.id;
  return id != null && String(id).trim() ? String(id) : null;
};

const getItemExchangeIds = (item) =>
  getItemExchanges(item).map(getExchangeRecordId).filter(Boolean);

const getLatestExchange = (item) => {
  const exchanges = [...getItemExchanges(item)];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0] || null;
};

const getLatestExchangeId = (item) => getExchangeRecordId(getLatestExchange(item));

const formatExchangeSwapSummary = (item) => {
  const ex = getLatestExchange(item);
  if (!ex) return "";
  const orderedVariant = item?.variant || ex?.item?.variant || {};
  const replacement = ex?.replacedItem;
  const replacementVariant = replacement?.variant || {};
  const now = [orderedVariant.color, orderedVariant.size].filter(Boolean).join("/");
  const want =
    [ex.desiredColor, ex.desiredSize].filter(Boolean).join("/") ||
    [replacementVariant.color, replacementVariant.size].filter(Boolean).join("/");
  if (!now && !want) return "";
  return `${now || "—"} → ${want || "—"}`;
};

/** Lines still awaiting fulfilment start — never override with courier/SR/DL hints. */
const PRE_MANIFEST_LINE_STATUSES = new Set(["CREATED", "CONFIRMED"]);

/** Progress order for standard fulfilment lines (courier / Shiprocket outbound). */
const FULFILMENT_FLOW_RANK = {
  CREATED: 5,
  CONFIRMED: 10,
  PROCESSING: 20,
  PICKUP_GENERATED: 28,
  PICKUP_EXCEPTION: 29,
  SHIPPED: 40,
  OUT_FOR_DELIVERY: 50,
  DELIVERED: 60,
  CANCELLED: 90,
  CANCELED: 90,
};

/** Progress order for exchange line items — used when backend `item.status` lags Shiprocket/history. */
const EXCHANGE_FLOW_RANK = {
  EXCHANGE_REQUESTED: 10,
  EXCHANGE_APPROVED: 20,
  EXCHANGE_PICKUP_SCHEDULED: 30,
  EXCHANGE_PICKUP_EXCEPTION: 35,
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

/** Shiprocket *outbound* (normal order) human status → fulfilment item status key */
const mapShiprocketOutboundStatusToItemStatus = (raw) => {
  const u = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!u) return null;
  if (u.includes("CANCEL") || u === "CANCELED") return "CANCELLED";
  if (u.includes("DELIVERED") && !u.includes("OUT FOR")) return "DELIVERED";
  if (u.includes("OUT FOR DELIVERY") || u.includes("OUT_FOR_DELIVERY"))
    return "OUT_FOR_DELIVERY";
  if (
    u.includes("PICKUP EXCEPTION") ||
    u.includes("PICKUP RESCHEDULED") ||
    u.includes("PICKUP_RESCHEDULED")
  )
    return "PICKUP_EXCEPTION";
  if (
    u.includes("PICKUP GENERATED") ||
    u.includes("LABEL GENERATED") ||
    u.includes("AWB GENERATED") ||
    (u.includes("AWB") && u.includes("ASSIGN"))
  )
    return "PICKUP_GENERATED";
  if (
    u.includes("IN TRANSIT") ||
    u.includes("SHIPPED") ||
    u.includes("DISPATCHED") ||
    (u.includes("PICKED UP") && !u.includes("RETURN"))
  )
    return "SHIPPED";
  if (
    u === "NEW" ||
    u.includes("PROCESSING") ||
    u.includes("MANIFEST") ||
    u.includes("BOOKED") ||
    u.includes("READY TO SHIP")
  )
    return "PROCESSING";
  return null;
};

/** Delhivery scan / shipment status → fulfilment item status key */
const mapDelhiveryStatusToItemStatus = (raw) => {
  const u = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!u) return null;
  if (u.includes("CANCEL")) return "CANCELLED";
  if (u.includes("DELIVER")) return "DELIVERED";
  if (u.includes("OUT FOR") || u.includes("OFD")) return "OUT_FOR_DELIVERY";
  if (u.includes("TRANSIT") || u.includes("DISPATCH") || u.includes("SHIPPED")) {
    return "SHIPPED";
  }
  if (u.includes("MANIFEST") || u.includes("BOOK") || u.includes("PICKUP")) {
    return "PROCESSING";
  }
  return null;
};

const canEnrichLineStatusFromCourier = (item) => {
  const base = normalizeItemStatusToken(item?.status);
  return Boolean(base && !PRE_MANIFEST_LINE_STATUSES.has(base));
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
  if (u.includes("PICKUP EXCEPTION") || u.includes("PICKUP RESCHEDULED"))
    return "EXCHANGE_PICKUP_EXCEPTION";
  if (
    u.includes("PICKUP GENERATED") ||
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

const getStatusProgressRank = (key) => {
  const k = normalizeItemStatusToken(key);
  if (!k) return -1;
  if (k.startsWith("EXCHANGE_")) return EXCHANGE_FLOW_RANK[k] ?? 0;
  return FULFILMENT_FLOW_RANK[k] ?? 0;
};

const pickHighestDisplayStatus = (candidates, { exchangeOnly = false } = {}) => {
  let best = null;
  let bestRank = -1;
  for (const c of candidates) {
    if (!c) continue;
    const key = normalizeItemStatusToken(c);
    if (!key) continue;
    if (exchangeOnly && !key.startsWith("EXCHANGE_")) continue;
    const r = getStatusProgressRank(key);
    if (r > bestRank) {
      bestRank = r;
      best = key;
    }
  }
  return bestRank >= 0 ? best : null;
};

const collectItemStatusCandidates = (item) => {
  const candidates = [];
  const add = (s, { mappers = null } = {}) => {
    if (!s) return;
    const mapperList = mappers || [
      mapShiprocketOutboundStatusToItemStatus,
      mapShiprocketReturnStatusToItemStatus,
      mapShiprocketForwardStatusToItemStatus,
      mapDelhiveryStatusToItemStatus,
      mapExchangeDocumentStatusToItemStatus,
    ];
    let mapped = null;
    for (const fn of mapperList) {
      mapped = fn(s);
      if (mapped) break;
    }
    if (mapped) candidates.push(mapped);
    const normalized = normalizeItemStatusToken(s);
    if (normalized) candidates.push(normalized);
  };

  add(item?.status);

  const base = normalizeItemStatusToken(item?.status);
  const allowCourierEnrichment =
    Boolean(base && !PRE_MANIFEST_LINE_STATUSES.has(base));

  if (allowCourierEnrichment && Array.isArray(item?.statusHistory)) {
    for (const h of item.statusHistory) add(h?.status);
  }

  if (isExchangeLineItem(item)) {
    const ex = getLatestExchange(item);
    if (ex) {
      add(ex.status);
      add(ex.shiprocket?.returnOrder?.status);
      add(ex.shiprocket?.forwardOrder?.status);
    }
  } else if (isNormalDeliveryLine(item) && allowCourierEnrichment) {
    const provider = getItemShippingProvider(item);
    if (provider === "SHIPROCKET") {
      add(item?.shiprocket?.status, {
        mappers: [mapShiprocketOutboundStatusToItemStatus],
      });
    } else if (provider === "DELHIVERY") {
      add(item?.delhivery?.status, {
        mappers: [mapDelhiveryStatusToItemStatus],
      });
    } else if (provider === "SHADOWFAX") {
      add(item?.shadowfax?.status);
    }
    // Self shipping: no third-party courier status to merge
  }

  return candidates;
};

/**
 * Display status for admin badges.
 * Uses stored `item.status` for CREATED/CONFIRMED.
 * After PROCESSING, may advance from Shiprocket/Delhivery only (not self shipping).
 */
const getDisplayItemStatus = (item) => {
  if (!item) return "";
  const baseRaw = item?.status || "";
  const base = normalizeItemStatusToken(baseRaw);
  if (base === "EXCHANGE_REJECTED") return "EXCHANGE_REJECTED";
  if (base === "CANCELLED" || base === "CANCELED") return "CANCELLED";
  if (PRE_MANIFEST_LINE_STATUSES.has(base)) return base;

  if (!canEnrichLineStatusFromCourier(item) && !isExchangeLineItem(item)) {
    return base || baseRaw || "";
  }

  const candidates = collectItemStatusCandidates(item);
  const enriched = isExchangeLineItem(item)
    ? pickHighestDisplayStatus(candidates, { exchangeOnly: true }) ||
      pickHighestDisplayStatus(candidates)
    : pickHighestDisplayStatus(candidates);

  if (enriched === "CANCELLED" && base && base !== "CANCELLED") {
    return base;
  }

  const baseRank = getStatusProgressRank(base);
  const enrichedRank = getStatusProgressRank(enriched);
  if (enriched && enrichedRank > baseRank) return enriched;
  return base || enriched || baseRaw || "";
};

const getDisplayOrderStatus = (order) => {
  const base = normalizeItemStatusToken(order?.status || order?.orderStatus || "");
  const items = order?.items;
  if (!Array.isArray(items) || items.length === 0) return base;
  if (items.length === 1) {
    const line = resolveAdminLineStatus(items[0], order);
    return line || base;
  }
  const lineStatuses = items
    .map((it) => resolveAdminLineStatus(it, order))
    .filter(Boolean);
  if (lineStatuses.length > 0 && new Set(lineStatuses).size === 1) {
    return lineStatuses[0];
  }
  return base;
};

const isPrepaidPaymentFailed = (order) => {
  const mode = String(order?.payment?.mode || "").toUpperCase();
  const status = String(order?.payment?.status || "").toUpperCase();
  if (mode === "COD") return false;
  return status === "FAILED";
};

/** When prepaid payment failed, unfulfilled lines should not display as active CONFIRMED. */
const resolveAdminLineStatus = (item, order = null) => {
  const stored = normalizeItemStatusToken(item?.status || "");
  if (
    order &&
    isPrepaidPaymentFailed(order) &&
    ["CREATED", "CONFIRMED", "PROCESSING"].includes(stored)
  ) {
    return "CANCELLED";
  }
  return getDisplayItemStatus(item) || stored;
};

/** Rebuild a line-like object from an admin “order item” list row for display helpers. */
const lineItemFromOrderItemRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const nested = row.item && typeof row.item === "object" ? row.item : {};
  return {
    ...nested,
    status: row.itemStatus ?? nested.status ?? "",
    activeFlow: nested.activeFlow ?? row.activeFlow,
    workflowHistory: nested.workflowHistory ?? row.workflowHistory,
    shipping: nested.shipping ?? row.shipping,
    statusHistory: nested.statusHistory,
    cancellation: nested.cancellation ?? row.cancellation ?? null,
    exchanges: getItemExchanges(nested),
    returns: Array.isArray(nested.returns) ? nested.returns : [],
    shadowfax: nested.shadowfax ?? row.shadowfax,
    shiprocket: nested.shiprocket ?? row.shiprocket,
    courier: nested.courier ?? row.courier,
    shippingProvider: nested.shippingProvider ?? row.shippingProvider,
    trackingId: nested.trackingId ?? row.trackingId,
    delhivery: nested.delhivery ?? row.delhivery,
    selfShipping: nested.selfShipping ?? row.selfShipping,
    delivery:
      nested.delivery ||
      (row.deliveryType ? { type: row.deliveryType } : undefined),
    payment: row.payment ?? nested.payment ?? null,
  };
};

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
  const storeOrigin = getPublicStoreUrl();
  const idStr = itemId != null ? String(itemId) : "";
  if (!idStr) return storeOrigin;
  const label = itemLike?.name || itemLike?.sku || "";
  const slug = slugifyForStoreProduct(label);
  const path = slug ? `/product/${slug}/${idStr}` : `/product/${idStr}`;
  return storeOrigin ? `${storeOrigin}${path}` : path;
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

function orderLineItems(
  order,
  { exchangeLinesOnly = false, returnLinesOnly = false, standardLinesOnly = false } = {},
) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (exchangeLinesOnly) return items.filter((item) => hasActiveExchangeStatus(item));
  if (returnLinesOnly) {
    return items.filter(
      (item) => hasActiveReturnStatus(item) || getItemReturns(item).length > 0,
    );
  }
  if (standardLinesOnly) {
    return items.filter(
      (item) =>
        !hasActiveExchangeStatus(item) &&
        !hasActiveReturnStatus(item) &&
        getItemExchanges(item).length === 0 &&
        getItemReturns(item).length === 0,
    );
  }
  return items;
}

function orderListLineKey(item, idx) {
  return String(item?.itemId || item?._id || `line-${idx}`);
}

/** Stack each order line in one table cell (same column, one row per order). */
function OrderListLineStack({
  order,
  children,
  className = "flex flex-col gap-2 divide-y divide-gray-100",
  exchangeLinesOnly = false,
  returnLinesOnly = false,
  standardLinesOnly = false,
}) {
  const items = orderLineItems(order, {
    exchangeLinesOnly,
    returnLinesOnly,
    standardLinesOnly,
  });
  if (!items.length) return <span className="text-xs text-gray-400">—</span>;
  if (items.length === 1) {
    return <div className="min-w-0">{children(items[0], 0)}</div>;
  }
  return (
    <div className={className}>
      {items.map((item, idx) => (
        <div
          key={orderListLineKey(item, idx)}
          className="flex min-w-0 items-start gap-1.5 first:pt-0"
        >
          <span
            className="mt-0.5 shrink-0 tabular-nums text-[9px] font-semibold text-stone-400"
            title={`Line ${idx + 1}`}
          >
            {idx + 1}.
          </span>
          <div className="min-w-0 flex-1">{children(item, idx)}</div>
        </div>
      ))}
    </div>
  );
}

/** Catalog name, or variant / SKU label when name is not on the order snapshot. */
function getLineProductDisplayName(item) {
  if (!item || typeof item !== "object") return "";
  const name = item.name != null ? String(item.name).trim() : "";
  if (name) return name;
  const v = item.variant || {};
  const variantLabel = [v.color, v.size].filter(Boolean).join(" / ");
  if (variantLabel) return variantLabel;
  return String(item.sku || v.sku || "").trim();
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
    <SafeExternalLink
      href={url}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:text-brand-900"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={12} className="shrink-0" />
      Store
    </SafeExternalLink>
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
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
        <p className="mt-1 break-all font-mono text-[10px] leading-snug text-brand-800">
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
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
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
          <p className="mt-1 break-all font-mono text-[10px] leading-snug text-brand-800">
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

function getOrderWalletUsedAmount(order) {
  if (!order) return 0;
  const raw = order.pricing?.walletUsedAmount ?? order.walletUsedAmount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function OrderLineBindOfferNote({ bindOffer, className = "" }) {
  const note = getLineBindOfferNote(bindOffer);
  if (!note) return null;
  return (
    <p
      className={`mt-0.5 text-[9px] font-medium leading-tight text-violet-700 ${className}`.trim()}
      title={note}
    >
      {note}
    </p>
  );
}

function OrderBindOfferAppliedSummary({ bindOffers }) {
  const rows = getBindOfferAppliedRows(bindOffers);
  if (!rows.length) return null;
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
        Offers applied
      </p>
      {rows.map((row, index) => {
        const text = describeBindOfferApplicationRow(row);
        if (!text) return null;
        return (
          <p key={`${row.sectionId || row.label || "offer"}-${index}`} className="text-[11px] text-violet-900">
            {text}
          </p>
        );
      })}
    </div>
  );
}

function renderOrderLinePriceCell(item) {
  const qty = Number(item.quantity) || 1;
  const unit = Number(item.unitPrice) || 0;
  const gross = unit * qty;
  const net = Number(item.itemSubtotal ?? gross);
  const lineDiscount = Number(item?.bindOffer?.lineDiscount) || 0;
  const hasOfferApplied = lineDiscount > 0 && net < gross - 0.009;

  return (
    <div className="text-right">
      <div className="text-[10px] tabular-nums text-gray-500">@ {formatInr(unit)}</div>
      <div className="text-xs font-medium tabular-nums text-gray-900">
        {hasOfferApplied ? (
          <span className="mr-1 text-[10px] font-normal text-gray-400 line-through">
            {formatInr(gross)}
          </span>
        ) : null}
        {formatInr(net)}
      </div>
      <OrderLineBindOfferNote bindOffer={item?.bindOffer} />
    </div>
  );
}

const ORDER_LIST_COLUMNS_STORAGE_KEY = "khush_admin_order_list_visible_columns";
const ITEM_LIST_COLUMNS_STORAGE_KEY = "khush_admin_item_list_visible_columns";
const ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY = "khush_admin_order_detail_item_visible_columns";

/** By order — main table column config (render fns added inside Orders). */
const ORDER_LIST_TABLE_COLUMNS = [
  { key: "info", label: "Store gallery", defaultVisible: true, alwaysVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Date & time", defaultVisible: true },
  { key: "orderDateTime", label: "Order date & time", defaultVisible: false },
  { key: "customer", label: "Customer name", defaultVisible: true },
  { key: "phone", label: "Customer phone", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: false },
  { key: "notes", label: "Notes", defaultVisible: true },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "productName", label: "Dress / product name", defaultVisible: true },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "lineSku", label: "Line SKU", defaultVisible: false },
  { key: "variantSku", label: "Variant SKU", defaultVisible: false },
  { key: "size", label: "Size", defaultVisible: false },
  { key: "color", label: "Color", defaultVisible: false },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "total", label: "Order amount", defaultVisible: true },
  { key: "walletUsed", label: "Wallet used", defaultVisible: true },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "gatewayOrderId", label: "Gateway order ID", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "courier", label: "Courier / Shiprocket", defaultVisible: true },
  { key: "city", label: "City", defaultVisible: false },
];

/** By item — table view column config. */
const ITEM_LIST_TABLE_COLUMNS = [
  { key: "info", label: "Store gallery", defaultVisible: true, alwaysVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Date & time", defaultVisible: true },
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
  { key: "city", label: "City", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "gatewayOrderId", label: "Gateway order ID", defaultVisible: false },
  { key: "status", label: "Line status", defaultVisible: true },
  { key: "delivery", label: "Delivery", defaultVisible: true },
  { key: "shiprocket", label: "Courier", defaultVisible: false },
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

const ORDER_DETAIL_ITEM_COL_CLASS = {
  image: "w-12",
  productName: "min-w-[7rem] max-w-[10.5rem]",
  productId: "min-w-[4.5rem] max-w-[7rem]",
  itemId: "min-w-[4.5rem] max-w-[7rem]",
  lineSku: "min-w-[6rem] max-w-[9rem]",
  variantSku: "min-w-[6rem] max-w-[9rem]",
  size: "w-9 text-center",
  color: "w-9 text-center",
  qty: "w-8 text-center",
  price: "w-14 text-right",
  pincode: "w-14",
  payment: "w-16",
  customerName: "min-w-[5.5rem] max-w-[8rem]",
  customerPhone: "min-w-[5.5rem] max-w-[8rem]",
  storeLink: "w-14",
};

function orderDetailItemColClass(key) {
  return ORDER_DETAIL_ITEM_COL_CLASS[key] || "min-w-0";
}

/** NORMAL lines that can be included in a new Shiprocket shipment group order. */
function getShiprocketEligibleItems(order) {
  if (!order?.items?.length) return [];
  const shipments = Array.isArray(order.shipments) ? order.shipments : [];
  const groupAlreadyShipped = new Set(
    shipments
      .filter((s) => s?.shiprocket?.orderId)
      .map((s) => String(s.shipmentGroupId)),
  );
  return order.items.filter((item) => {
    if (String(item.delivery?.type || "").toUpperCase() !== "NORMAL") return false;
    if (item.shiprocket?.orderId) return false;
    const gid = String(item.shipmentGroupId || "");
    if (gid && groupAlreadyShipped.has(gid)) return false;
    return true;
  });
}

/** NORMAL lines that can be included in a new Delhivery package (same shipment group). */
function getDelhiveryEligibleItems(order) {
  if (!order?.items?.length) return [];
  const shipments = Array.isArray(order.shipments) ? order.shipments : [];
  const groupAlreadyShipped = new Set(
    shipments
      .filter((s) => s?.delhivery?.waybill)
      .map((s) => String(s.shipmentGroupId)),
  );
  return order.items.filter((item) => {
    if (String(item.delivery?.type || "").toUpperCase() !== "NORMAL") return false;
    if (item.delhivery?.waybill) return false;
    if (item.shiprocket?.orderId) return false;
    const gid = String(item.shipmentGroupId || "");
    if (gid && groupAlreadyShipped.has(gid)) return false;
    return true;
  });
}

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
  badgeClass = "bg-brand-100 text-brand-900",
  /** 'end' = anchor to trigger's right (toolbar on the right); 'start' = anchor left */
  align = "end",
}) {
  const activeCount = columns.filter((c) => visibleKeys.includes(c.key)).length;
  const panelAlignClass =
    align === "start"
      ? "sm:left-0 sm:right-auto"
      : "sm:right-0 sm:left-auto";

  return (
    <div className="relative shrink-0" data-order-column-picker>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Columns3 className="h-3.5 w-3.5 shrink-0" />
        Columns
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
          {activeCount}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-stone-900/25 sm:hidden"
            aria-label="Close column picker"
            onClick={() => onOpenChange(false)}
          />
          <div
            role="dialog"
            aria-label="Choose columns to show"
            className={`fixed z-50 flex max-h-[min(70vh,22rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col rounded-xl border border-border bg-white p-3 shadow-xl ring-1 ring-black/5 left-1/2 top-[max(5rem,12vh)] -translate-x-1/2 sm:absolute sm:top-full sm:mt-1 sm:max-h-[min(calc(100vh-6rem),20rem)] sm:w-[min(20rem,calc(100vw-1.5rem))] sm:translate-x-0 sm:left-auto ${panelAlignClass}`}
          >
            <p className="mb-2 shrink-0 text-[11px] font-semibold text-stone-700">
              Choose columns to show
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 space-y-1">
              {columns.map((col) => {
                const checked = visibleKeys.includes(col.key);
                const locked = !!col.alwaysVisible;
                return (
                  <label
                    key={col.key}
                    className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] leading-snug ${
                      locked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-canvas-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => onToggle(col.key)}
                      className="mt-0.5 shrink-0 rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <span className="min-w-0 flex-1 text-stone-800">{col.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 flex shrink-0 flex-wrap gap-3 border-t border-border/80 pt-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-800"
              >
                Show all
              </button>
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] font-medium text-stone-600 hover:text-stone-800"
              >
                Reset default
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="ml-auto text-[11px] font-medium text-stone-500 hover:text-stone-800 sm:hidden"
              >
                Done
              </button>
            </div>
          </div>
        </>
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
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-700">
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
          <div className="col-span-2 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 lg:col-span-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-900">
              Store link
            </dt>
            <dd className="mt-1">
              <SafeExternalLink
                href={u}
                className="inline-flex items-start gap-1 break-all text-xs font-medium text-brand-700 hover:text-brand-900"
              >
                <span className="min-w-0 flex-1">{u}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </SafeExternalLink>
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

const formatReasonToken = (raw) =>
  String(raw || "")
    .trim()
    .replace(/_/g, " ");

const getCancellationReasonFromItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const cancel = item.cancellation;
  if (cancel?.reason) {
    return {
      label: cancel.reason,
      source: cancel.source || null,
    };
  }
  const history = Array.isArray(item.statusHistory) ? item.statusHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (String(entry.status || "").toUpperCase() !== "CANCELLED") continue;
    const reasons = entry.metadata?.cancellationReasons;
    if (Array.isArray(reasons) && reasons.length > 0) {
      return { label: reasons.join(", "), source: entry.changedByType || "admin" };
    }
    const notes = String(entry.notes || "").trim();
    const userMatch = notes.match(/Cancelled by user\.\s*Reason:\s*(.+)/i);
    if (userMatch?.[1]) return { label: userMatch[1].trim(), source: "user" };
    const adminMatch = notes.match(/Reasons:\s*([^.]+)/i);
    if (adminMatch?.[1]) return { label: adminMatch[1].trim(), source: entry.changedByType || "admin" };
    if (notes) return { label: notes, source: entry.changedByType || "system" };
  }
  return null;
};

const getReturnReasonDisplay = (ret) => {
  if (!ret || typeof ret !== "object") return null;
  const requestParts = [];
  if (ret.reason) requestParts.push(formatReasonToken(ret.reason));
  if (ret.description?.trim()) requestParts.push(ret.description.trim());
  const rejection =
    ret.qualityCheck?.rejectionReason?.trim() ||
    (String(ret.status || "").toLowerCase().includes("reject")
      ? ret.adminRemark?.trim()
      : "");
  return {
    request: requestParts.join(" · ") || null,
    rejection: rejection || null,
  };
};

const getExchangeReasonDisplay = (exchange, item) => {
  const reason = getExchangeReason(exchange);
  const adminRemark = String(exchange?.adminRemark || "").trim();
  const isRejected =
    String(exchange?.status || "").toLowerCase().includes("reject") ||
    String(item?.status || "").toUpperCase() === "EXCHANGE_REJECTED";
  return {
    request: reason || null,
    rejection: isRejected && adminRemark ? adminRemark : null,
    adminRemark: !isRejected && adminRemark ? adminRemark : null,
  };
};

function LineReasonSummary({ item, compact = true }) {
  const cancel = getCancellationReasonFromItem(item);
  const returnInfo = getReturnReasonDisplay(getLatestReturn(item));
  const exchangeInfo = getExchangeReasonDisplay(getLatestExchange(item), item);

  const rows = [];
  if (cancel?.label) {
    rows.push({
      key: "cancel",
      kind: "Cancel",
      text: cancel.label,
      sub: cancel.source ? `By ${cancel.source}` : null,
      tone: "red",
    });
  }
  if (returnInfo?.request) {
    rows.push({
      key: "return-reason",
      kind: "Return",
      text: returnInfo.request,
      tone: "amber",
    });
  }
  if (returnInfo?.rejection) {
    rows.push({
      key: "return-reject",
      kind: "Return rejected",
      text: returnInfo.rejection,
      tone: "red",
    });
  }
  if (exchangeInfo?.request) {
    rows.push({
      key: "exchange-reason",
      kind: "Exchange",
      text: exchangeInfo.request,
      tone: "brand",
    });
  }
  if (exchangeInfo?.rejection) {
    rows.push({
      key: "exchange-reject",
      kind: "Exchange rejected",
      text: exchangeInfo.rejection,
      tone: "red",
    });
  } else if (exchangeInfo?.adminRemark) {
    rows.push({
      key: "exchange-note",
      kind: "Exchange note",
      text: exchangeInfo.adminRemark,
      tone: "stone",
    });
  }

  if (!rows.length) return null;

  const toneClass = {
    red: "text-red-700",
    amber: "text-amber-800",
    brand: "text-brand-800",
    stone: "text-stone-600",
  };

  return (
    <div className={`${compact ? "mt-0.5" : "mt-1"} space-y-0.5`}>
      {rows.map(({ key, kind, text, sub, tone }) => (
        <p
          key={key}
          className={`${compact ? "text-[9px] leading-tight" : "text-[10px] leading-snug"} ${toneClass[tone] || "text-stone-600"}`}
          title={sub ? `${kind}: ${text} (${sub})` : `${kind}: ${text}`}
        >
          <span className="font-semibold uppercase tracking-wide">{kind}:</span>{" "}
          <span className={compact ? "line-clamp-2" : ""}>{text}</span>
          {sub ? <span className="text-stone-400"> · {sub}</span> : null}
        </p>
      ))}
    </div>
  );
}

const formatExchangeDocumentStatusLabel = (status) => {
  const mapped = mapExchangeDocumentStatusToItemStatus(status);
  if (mapped) return formatStatusTokenForUi(mapped);
  return formatStatusTokenForUi(status);
};

const EXCHANGE_MANUAL_PICKUP_METHODS = new Set([
  "DELHIVERY_MANUAL",
  "SHADOWFAX_MANUAL",
  "KHUSH_DRIVER",
  "KHUSH_INTERNAL",
]);

const getExchangeReturnPickupAwb = (exchange, item = null) =>
  item?.shipping?.reversePickup?.awb ||
  exchange?.returnPickup?.manualTrackingId ||
  exchange?.delhivery?.returnPickup?.waybill ||
  exchange?.shadowfax?.returnPickup?.awb ||
  item?.delhivery?.returnPickupWaybill ||
  item?.shadowfax?.returnPickupAwb ||
  null;

const formatExchangePickupMethodLabel = (method) => {
  const key = String(method || "").toUpperCase();
  const map = {
    DELHIVERY_MANUAL: "Delhivery manual",
    SHADOWFAX_MANUAL: "Shadowfax manual",
    KHUSH_DRIVER: "Khush driver",
    KHUSH_INTERNAL: "Khush internal",
    SHIPROCKET_AUTO: "Shiprocket auto",
  };
  return map[key] || method || "—";
};

const canAssignExchangePickup = (item, exchange) => {
  const method = String(exchange?.returnPickupMethod || "").toUpperCase();
  if (!EXCHANGE_MANUAL_PICKUP_METHODS.has(method)) return false;
  const st = String(getLineMilestoneForBadge(item) || "").toUpperCase();
  return [
    "EXCHANGE_PICKUP_SCHEDULED",
    "EXCHANGE_APPROVED",
    "EXCHANGE_OUT_FOR_PICKUP",
  ].includes(st);
};

const exchangeHasVisibleDetails = (exchange, item) => {
  if (isExchangeLineItem(item)) return true;
  if (!exchange || typeof exchange !== "object") return false;
  return Boolean(
    getExchangeReason(exchange) ||
      extractExchangeImageUrls(exchange).length ||
      exchange.desiredColor ||
      exchange.desiredSize ||
      exchange.replacedItem ||
      exchange.item ||
      exchange.status ||
      String(exchange.adminRemark || "").trim() ||
      exchange.quantityToExchange,
  );
};

function ExchangeDetailsPanel({
  item,
  onZoomImage,
  embedded = false,
  onOpenOrder,
  onAssignPickup,
  assignPickupLoading = false,
}) {
  const latestExchange = getLatestExchange(item);
  if (!exchangeHasVisibleDetails(latestExchange, item)) return null;

  const exchangeImageUrls = extractExchangeImageUrls(latestExchange);
  const exchangeReason = getExchangeReason(latestExchange);
  const orderedVariant = item?.variant || latestExchange?.item?.variant || {};
  const replacement = latestExchange?.replacedItem;
  const replacementVariant = replacement?.variant || {};
  const productName =
    getLineProductDisplayName(item) ||
    latestExchange?.item?.name ||
    item?.name ||
    item?.sku ||
    "—";
  const currentVariantLabel = [orderedVariant.color, orderedVariant.size]
    .filter(Boolean)
    .join("/");
  const wantedVariantLabel = [latestExchange?.desiredColor, latestExchange?.desiredSize]
    .filter(Boolean)
    .join("/");
  const replacementLabel = [replacementVariant.color, replacementVariant.size]
    .filter(Boolean)
    .join("/");
  const thumbUrl = item?.variant?.imageUrl || orderedVariant?.imageUrl || null;
  const lineStatus = formatLineStatusForUi(getLineMilestoneForBadge(item));
  const exchangeId = getExchangeRecordId(latestExchange);
  const docStatus = formatExchangeDocumentStatusLabel(latestExchange?.status);

  if (embedded) {
    return (
      <div className="mt-0.5 space-y-0.5 text-[10px] leading-snug text-stone-600">
        <p className="truncate" title={`${currentVariantLabel} → ${wantedVariantLabel || replacementLabel}`}>
          <span className="text-stone-400">Now</span> {currentVariantLabel || "—"}
          <span className="mx-0.5 text-stone-300">→</span>
          <span className="font-medium text-stone-800">
            {wantedVariantLabel || replacementLabel || replacement?.sku || "—"}
          </span>
          {latestExchange?.quantityToExchange ? (
            <span className="text-stone-400"> · Qty {latestExchange.quantityToExchange}</span>
          ) : null}
        </p>
        {exchangeReason ? (
          <p className="line-clamp-1 text-stone-500" title={exchangeReason}>
            <span className="font-semibold text-stone-600">Reason:</span> {exchangeReason}
          </p>
        ) : null}
        {latestExchange?.adminRemark ? (
          <p
            className="line-clamp-1 text-red-700"
            title={latestExchange.adminRemark}
          >
            <span className="font-semibold">
              {String(latestExchange.status || "")
                .toLowerCase()
                .includes("reject")
                ? "Rejection:"
                : "Admin note:"}
            </span>{" "}
            {latestExchange.adminRemark}
          </p>
        ) : null}
        {exchangeId || docStatus ? (
          <p className="truncate text-stone-400">
            {exchangeId ? <span title="Exchange ID">#{exchangeId}</span> : null}
            {exchangeId && docStatus ? " · " : null}
            {docStatus ? <span>{docStatus}</span> : null}
          </p>
        ) : null}
        {latestExchange?.replacementForward?.awb ||
        latestExchange?.replacementOrderId ? (
          <p className="truncate text-stone-500" title="Replacement forward leg">
            Fwd repl
            {latestExchange.replacementForward?.awb
              ? ` · ${latestExchange.replacementForward.awb}`
              : latestExchange.replacementOrderId
                ? ` · #${latestExchange.replacementOrderId}`
                : ""}
          </p>
        ) : null}
        {getExchangeReturnPickupAwb(latestExchange, item) ? (
          <p className="truncate text-stone-500" title={getExchangeReturnPickupAwb(latestExchange, item)}>
            RVP {getExchangeReturnPickupAwb(latestExchange, item)}
          </p>
        ) : null}
        {exchangeImageUrls.length > 0 ? (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
            {exchangeImageUrls.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => onZoomImage?.(url)}
                className="h-6 w-6 shrink-0 overflow-hidden rounded border border-border bg-white hover:ring-1 hover:ring-brand-200"
                title={`Photo ${idx + 1}`}
              >
                <img
                  src={url}
                  alt={`Exchange upload ${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-canvas-muted/25 px-2 py-1.5 text-[10px] leading-snug">
      <div className="flex min-w-0 items-start gap-1.5">
        {thumbUrl ? (
          <button
            type="button"
            onClick={() => onZoomImage?.(thumbUrl)}
            className="h-8 w-8 shrink-0 overflow-hidden rounded border border-border bg-white"
            title="Product image"
          >
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p className="min-w-0 flex-1 truncate font-medium text-stone-900" title={productName}>
              {productName}
            </p>
            <span className="shrink-0 rounded bg-canvas-muted px-1 py-0.5 text-[8px] font-semibold text-stone-700 ring-1 ring-border">
              {lineStatus}
            </span>
          </div>
          <p className="truncate text-[9px] text-stone-600">
            <span className="text-stone-400">Now</span> {currentVariantLabel || "—"}
            <span className="mx-0.5 text-stone-300">→</span>
            <span className="font-medium text-stone-800">
              {wantedVariantLabel || replacementLabel || replacement?.sku || "—"}
            </span>
            {latestExchange?.quantityToExchange ? (
              <span className="text-stone-400"> · Qty {latestExchange.quantityToExchange}</span>
            ) : null}
          </p>
          {exchangeReason ? (
            <p className="line-clamp-1 text-[9px] text-stone-500" title={exchangeReason}>
              <span className="font-semibold text-stone-600">Reason:</span> {exchangeReason}
            </p>
          ) : null}
          {latestExchange?.adminRemark ? (
            <p
              className="line-clamp-2 text-[9px] text-red-700"
              title={latestExchange.adminRemark}
            >
              <span className="font-semibold">
                {String(latestExchange.status || "")
                  .toLowerCase()
                  .includes("reject")
                  ? "Rejection:"
                  : "Admin note:"}
              </span>{" "}
              {latestExchange.adminRemark}
            </p>
          ) : null}
          {exchangeId || docStatus ? (
            <p className="truncate text-[9px] text-stone-400">
              {exchangeId ? <span title="Exchange ID">#{exchangeId}</span> : null}
              {exchangeId && docStatus ? " · " : null}
              {docStatus ? <span>Request: {docStatus}</span> : null}
            </p>
          ) : null}
          {latestExchange?.replacementForward?.orderId ||
          latestExchange?.replacementOrderId ? (
            <p className="truncate text-[9px] text-stone-600">
              Forward replacement:{" "}
              <button
                type="button"
                onClick={() =>
                  onOpenOrder?.(
                    latestExchange.replacementForward?.orderId ||
                      latestExchange.replacementOrderId,
                  )
                }
                className="font-medium text-brand-700 hover:underline"
              >
                #
                {latestExchange.replacementForward?.orderId ||
                  latestExchange.replacementOrderId}
              </button>
              {latestExchange.replacementForward?.awb ? (
                <>
                  {" "}
                  · AWB{" "}
                  <span className="font-mono">
                    {latestExchange.replacementForward.awb}
                  </span>
                </>
              ) : null}
              {latestExchange.replacementForward?.itemStatus ? (
                <>
                  {" "}
                  ·{" "}
                  {formatStatusTokenForUi(latestExchange.replacementForward.itemStatus)}
                </>
              ) : null}
            </p>
          ) : null}
          {latestExchange?.returnPickupMethod ? (
            <p className="truncate text-[9px] text-stone-500">
              Pickup: {formatExchangePickupMethodLabel(latestExchange.returnPickupMethod)}
              {getExchangeReturnPickupAwb(latestExchange, item)
                ? ` · AWB ${getExchangeReturnPickupAwb(latestExchange, item)}`
                : ""}
            </p>
          ) : null}
          {canAssignExchangePickup(item, latestExchange) ? (
            <button
              type="button"
              disabled={assignPickupLoading}
              onClick={() => onAssignPickup?.(latestExchange, item)}
              className="mt-1 inline-flex items-center rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-[9px] font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60"
            >
              {assignPickupLoading ? "Assigning…" : "Assign pickup"}
            </button>
          ) : null}
        </div>
      </div>
      {exchangeImageUrls.length > 0 ? (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {exchangeImageUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => onZoomImage?.(url)}
              className="h-7 w-7 shrink-0 overflow-hidden rounded border border-border bg-white hover:ring-1 hover:ring-brand-200"
              title={`Photo ${idx + 1}`}
            >
              <img
                src={url}
                alt={`Exchange upload ${idx + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const canDownloadInvoice = (item) => {
  const status = String(item?.status || "").toUpperCase();
  // Show invoice for every line state except the earliest pre-fulfillment ones.
  // (Shipped, out for delivery, delivered, exchange*, cancelled, etc. all allowed.)
  return !["CREATED", "CONFIRMED"].includes(status);
};

const isExchangeStatus = (status) =>
  String(status || "").toUpperCase().startsWith("EXCHANGE_");

const hasActiveExchangeStatus = (itemOrStatus) => {
  const st =
    typeof itemOrStatus === "string"
      ? itemOrStatus
      : itemOrStatus?.status ?? itemOrStatus?.itemStatus;
  return isExchangeStatus(st);
};

const isExchangeLineItem = (item) =>
  hasActiveExchangeStatus(item) || getItemExchanges(item).length > 0;

const isExchangeOrderEntry = (order) => {
  if (hasActiveExchangeStatus(order?.status || order?.orderStatus)) return true;
  return (
    Array.isArray(order?.items) &&
    order.items.some((item) => hasActiveExchangeStatus(item))
  );
};

const isExchangeListRow = (row) =>
  hasActiveExchangeStatus(row?.itemStatus ?? row?.item?.status ?? row?.status);

const isExchangeReplacementOrderDoc = (doc, replacementOrderIds = null) => {
  if ((doc?.orderType || "STANDARD") === "EXCHANGE") return true;
  if (doc?.exchangeMeta?.originalOrderId) return true;
  const orderId = doc?.orderId ? String(doc.orderId).trim() : "";
  if (orderId && replacementOrderIds?.has(orderId)) return true;
  const items = Array.isArray(doc?.items)
    ? doc.items
    : doc?.item
      ? [doc.item]
      : [];
  for (const item of items) {
    const payable = Number(item?.finalPayable ?? item?.itemSubtotal ?? NaN);
    const st = String(item?.status ?? doc?.itemStatus ?? doc?.status ?? "").toUpperCase();
    if (item?.exchangeId && payable === 0 && !st.startsWith("EXCHANGE_")) {
      return true;
    }
  }
  return false;
};

function ExchangeReplacementOrderBadge({ compact = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-blue-50 font-semibold uppercase text-blue-700 ring-1 ring-blue-200 ${
        compact ? "px-1.5 py-0.5 text-[9px] tracking-wide" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      Replacement order
    </span>
  );
}

const RETURN_LINE_STATUSES = new Set([
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_PICKUP_SCHEDULED",
  "RETURNED",
  "REFUNDED",
]);

const isReturnStatus = (status) => RETURN_LINE_STATUSES.has(String(status || "").toUpperCase());

const hasActiveReturnStatus = (itemOrStatus) => {
  const st =
    typeof itemOrStatus === "string"
      ? itemOrStatus
      : itemOrStatus?.status ?? itemOrStatus?.itemStatus;
  return isReturnStatus(st);
};

/** Admin APIs attach returns on `item.returns`. */
const getItemReturns = (item) => {
  if (!item || typeof item !== "object") return [];
  return Array.isArray(item.returns) ? item.returns : [];
};

const getLatestReturn = (item) => {
  const returns = [...getItemReturns(item)];
  if (!returns.length) return null;
  returns.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return returns[0];
};

const formatReturnDocumentStatusLabel = (status) => {
  const key = String(status || "").trim();
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
};

const getReturnPickupAwb = (ret, item) =>
  item?.shipping?.reversePickup?.awb ||
  ret?.returnPickup?.manualTrackingId ||
  ret?.delhivery?.returnPickup?.waybill ||
  ret?.shadowfax?.returnPickup?.awb ||
  item?.shadowfax?.returnPickupAwb ||
  item?.delhivery?.returnPickupWaybill ||
  null;

const isReturnOrderEntry = (order) => {
  if (hasActiveReturnStatus(order?.status || order?.orderStatus)) return true;
  return (
    Array.isArray(order?.items) &&
    order.items.some((item) => hasActiveReturnStatus(item) || getItemReturns(item).length > 0)
  );
};

const isReturnListRow = (row) =>
  hasActiveReturnStatus(row?.itemStatus ?? row?.item?.status ?? row?.status) ||
  getItemReturns(row?.item || row).length > 0;

const isStandardOrderEntry = (order) => {
  if (hasActiveExchangeStatus(order?.status || order?.orderStatus)) return false;
  if (hasActiveReturnStatus(order?.status || order?.orderStatus)) return false;
  if (!Array.isArray(order?.items)) return true;
  return !order.items.some(
    (item) =>
      hasActiveExchangeStatus(item) ||
      hasActiveReturnStatus(item) ||
      getItemExchanges(item).length > 0 ||
      getItemReturns(item).length > 0,
  );
};

const getLatestReturnId = (item) => {
  const id = getLatestReturn(item)?._id;
  return id != null && String(id).trim() ? String(id) : null;
};

const returnHasVisibleDetails = (ret, item) => {
  if (hasActiveReturnStatus(item) || getItemReturns(item).length > 0) return true;
  if (!ret || typeof ret !== "object") return false;
  return Boolean(
    ret.reason ||
      ret.description ||
      ret.status ||
      ret.returnPickupMethod ||
      getReturnPickupAwb(ret, item) ||
      ret.refund?.amount,
  );
};

function ReturnDetailsPanel({
  item,
  embedded = false,
  onApproveReturn,
  approveReturnLoading = false,
  onBookReversePickup,
  bookPickupLoading = false,
}) {
  const latestReturn = getLatestReturn(item);
  if (!returnHasVisibleDetails(latestReturn, item)) return null;

  const reason = latestReturn?.reason
    ? formatReasonToken(latestReturn.reason)
    : "";
  const returnReasonInfo = getReturnReasonDisplay(latestReturn);
  const docStatus =
    formatReturnDocumentStatusLabel(latestReturn?.status) ||
    formatStatusTokenForUi(item?.status || "");
  const pickupAwb = getReturnPickupAwb(latestReturn, item);
  const returnId = latestReturn?._id ? String(latestReturn._id) : null;
  const forwardAwb =
    getNormalDeliveryShadowfax(item)?.awb ||
    getNormalDeliveryDelhivery(item)?.waybill ||
    getLineShiprocket(item)?.awb ||
    item?.trackingId ||
    null;
  const refundAmount = latestReturn?.refund?.amount;
  const canApproveReturn =
    latestReturn &&
    !latestReturn.isApproved &&
    String(latestReturn.status || "").toLowerCase() === "returnrequested";
  const canBookReversePickup =
    latestReturn?.isApproved &&
    !pickupAwb &&
    (latestReturn?.returnPickupMethod === "SHADOWFAX_MANUAL" ||
      latestReturn?.originalShippingProvider === "SHADOWFAX" ||
      Boolean(item?.shadowfax?.awb));

  if (embedded) {
    return (
      <div className="mt-0.5 space-y-0.5 text-[10px] leading-snug text-stone-600">
        {reason ? (
          <p className="line-clamp-1 text-stone-600" title={reason}>
            <span className="font-semibold text-stone-700">Reason:</span> {reason}
          </p>
        ) : docStatus ? (
          <p className="line-clamp-1 text-stone-500">{docStatus}</p>
        ) : null}
        {returnId ? (
          <p className="truncate text-stone-400" title={returnId}>
            Return #{returnId.slice(-8)}
          </p>
        ) : null}
        {pickupAwb ? (
          <p className="truncate text-stone-500" title={pickupAwb}>
            RVP {pickupAwb}
          </p>
        ) : forwardAwb ? (
          <p className="truncate text-stone-400" title={forwardAwb}>
            Fwd {forwardAwb}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-amber-200/80 bg-amber-50/40 px-2 py-1.5 text-[10px] leading-snug">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-800">
          Return request
        </p>
        {docStatus ? (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-900">
            {docStatus}
          </span>
        ) : null}
      </div>
      {returnId ? (
        <p className="truncate font-mono text-[9px] text-stone-500" title={returnId}>
          ID {returnId}
        </p>
      ) : null}
      {reason ? (
        <p className="text-stone-700">
          <span className="font-semibold">Customer reason:</span> {reason}
        </p>
      ) : null}
      {latestReturn?.description ? (
        <p className="line-clamp-2 text-stone-600" title={latestReturn.description}>
          <span className="font-semibold text-stone-700">Description:</span>{" "}
          {latestReturn.description}
        </p>
      ) : null}
      {returnReasonInfo?.rejection ? (
        <p className="text-red-700">
          <span className="font-semibold">Rejection:</span> {returnReasonInfo.rejection}
        </p>
      ) : null}
      {latestReturn?.unboxingVideo?.url ? (
        <SafeExternalLink
          href={latestReturn.unboxingVideo.url}
          className="text-[9px] font-medium text-brand-700 hover:underline"
        >
          View unboxing video
        </SafeExternalLink>
      ) : null}
      {latestReturn?.returnPickupMethod ? (
        <p className="text-stone-500">
          Pickup: {formatExchangePickupMethodLabel(latestReturn.returnPickupMethod)}
        </p>
      ) : null}
      {forwardAwb ? (
        <p className="text-stone-500">
          Forward AWB: <span className="font-mono font-medium text-stone-800">{forwardAwb}</span>
        </p>
      ) : null}
      {pickupAwb ? (
        <p className="font-medium text-stone-800">
          Reverse pickup AWB: <span className="font-mono">{pickupAwb}</span>
        </p>
      ) : null}
      {refundAmount != null && Number(refundAmount) > 0 ? (
        <p className="text-stone-600">
          Refund: ₹{Number(refundAmount).toLocaleString("en-IN")}
          {latestReturn?.refund?.status ? ` (${latestReturn.refund.status})` : ""}
        </p>
      ) : null}
      {latestReturn?.adminRemark && !returnReasonInfo?.rejection ? (
        <p className="text-stone-500">
          <span className="font-semibold">Admin note:</span> {latestReturn.adminRemark}
        </p>
      ) : null}
      {!latestReturn && hasActiveReturnStatus(item) ? (
        <p className="text-[9px] text-amber-800">
          Line status is set but no return request document was found. Customer may not have
          submitted a return from the storefront.
        </p>
      ) : null}
      {canApproveReturn && onApproveReturn ? (
        <button
          type="button"
          disabled={approveReturnLoading}
          onClick={() => onApproveReturn(latestReturn, item)}
          className="mt-0.5 inline-flex items-center rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-60"
        >
          {approveReturnLoading ? "Approving…" : "Approve return"}
        </button>
      ) : null}
      {canBookReversePickup && onBookReversePickup ? (
        <button
          type="button"
          disabled={bookPickupLoading}
          onClick={() => onBookReversePickup(latestReturn, item)}
          className="mt-0.5 inline-flex items-center rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-60"
        >
          {bookPickupLoading ? "Booking…" : "Book reverse pickup"}
        </button>
      ) : null}
    </div>
  );
}

const dbgOrders = (label, ...rest) => {
  logger.debugWhen(isDebugOrders(), "Orders", label, ...rest);
};

const dbgOrdersVerbose = (label, ...rest) => {
  logger.debugWhen(isDebugOrders(), "Orders", label, ...rest);
};

const isNormalDeliveryLine = (item, order = null) => {
  const direct = String(item?.delivery?.type || item?.deliveryType || "").toUpperCase();
  if (direct) return direct === "NORMAL";
  const gid = String(item?.shipmentGroupId || "");
  if (!gid || !Array.isArray(order?.shipments)) return false;
  const shipment = order.shipments.find((s) => String(s.shipmentGroupId) === gid);
  return String(shipment?.deliveryType || "").toUpperCase() === "NORMAL";
};

const isLineManifestedOnCarrier = (item, order = null) => {
  const st = String(item?.status || "").toUpperCase();
  if (PRE_MANIFEST_LINE_STATUSES.has(st)) return false;
  if (item?.shiprocket?.orderId || item?.delhivery?.waybill || item?.shadowfax?.awb) return true;
  const gid = String(item?.shipmentGroupId || "");
  if (!gid || !Array.isArray(order?.shipments)) return false;
  const shipment = order.shipments.find((s) => String(s.shipmentGroupId) === gid);
  return Boolean(
    shipment?.shiprocket?.orderId ||
      shipment?.delhivery?.waybill ||
      shipment?.shadowfax?.awb,
  );
};

/** Mirror backend _itemCarrierManifestUnset — for optimistic CONFIRMED UI state. */
const stripItemCarrierManifestFields = (item = {}) => {
  const next = { ...item };
  for (const key of [
    "shiprocket",
    "delhivery",
    "shadowfax",
    "selfShipping",
    "trackingId",
    "courier",
    "shippingProvider",
    "shippingManifestError",
    "shippingManifestFailedAt",
    "shippedAt",
    "deliveredAt",
    "labelDownloadedAt",
  ]) {
    delete next[key];
  }
  return next;
};

const isSelfShippingLine = (item) =>
  isNormalDeliveryLine(item) &&
  String(item?.shippingProvider || "").toUpperCase() === "SELF_SHIPPING";

/** PROCESSING+ NORMAL line with no third-party manifest — treat as internal self-ship for label/invoice. */
const isSelfShippingLineOrUnmanifested = (item) => {
  if (isInternalSelfShippingLine(item)) return true;
  if (isExternalSelfShippingLine(item)) return false;
  if (isSelfShippingLine(item)) return true;
  if (!isNormalDeliveryLine(item)) return false;
  const st = String(item?.status || "").toUpperCase();
  if (st === "CREATED" || st === "CONFIRMED") return false;
  if (item?.shiprocket?.orderId || item?.delhivery?.waybill || item?.shadowfax?.awb) return false;
  return ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(st);
};

const isLikelyShiprocketShipmentId = (id) => {
  const s = String(id ?? "").trim();
  return /^\d+$/.test(s);
};

const SHIPPING_PROVIDER_OPTIONS = [
  { value: "SHIPROCKET", label: "Shiprocket" },
  { value: "DELHIVERY", label: "Delhivery" },
  { value: "SHADOWFAX", label: "Shadowfax" },
  { value: "SELF_SHIPPING", label: "Self Shipping" },
];

const SELF_SHIPPING_MODE_OPTIONS = [
  { value: "INTERNAL", label: "Internal (Khush in-house)" },
  { value: "EXTERNAL", label: "External (manual / other carrier)" },
];

const isExternalSelfShippingLine = (item) =>
  isSelfShippingLine(item) &&
  String(item?.selfShipping?.mode || "INTERNAL").toUpperCase() === "EXTERNAL";

const isInternalSelfShippingLine = (item) =>
  isSelfShippingLine(item) && !isExternalSelfShippingLine(item);

const needsExternalSelfShippingDetails = (item, newStatus) => {
  if (!["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(String(newStatus || "").toUpperCase())) {
    return false;
  }
  if (!isExternalSelfShippingLine(item)) return false;
  const hasCarrier = Boolean(item?.selfShipping?.carrierName || item?.courier);
  const hasTracking = Boolean(item?.selfShipping?.trackingUrl || item?.trackingId);
  return !hasCarrier || !hasTracking;
};

/** Open modal to manually enter / edit external self-shipping carrier fields. */
const buildExternalSelfShipFormFromItem = (item) => ({
  carrierName: item?.selfShipping?.carrierName || item?.courier || "",
  trackingUrl: item?.selfShipping?.trackingUrl || "",
  trackingId: item?.trackingId || "",
  notes: item?.selfShipping?.notes || "",
});

const EMPTY_EXTERNAL_SELF_SHIP_FORM = {
  carrierName: "",
  trackingUrl: "",
  trackingId: "",
  notes: "",
};

const validateExternalSelfShipForm = (form, { requireAll = false } = {}) => {
  const carrierName = String(form?.carrierName || "").trim();
  const trackingUrl = String(form?.trackingUrl || "").trim();
  const trackingId = String(form?.trackingId || "").trim();
  if (!carrierName) {
    return "Courier partner name is required for external self-shipping.";
  }
  if (!trackingUrl && !trackingId) {
    return requireAll
      ? "Tracking URL or AWB number is required."
      : "Enter at least a tracking URL or AWB number.";
  }
  return null;
};

const appendExternalSelfShippingToPayload = (payload, form) => {
  if (!form) return payload;
  const carrierName = String(form.carrierName || "").trim();
  const trackingUrl = String(form.trackingUrl || "").trim();
  const trackingId = String(form.trackingId || "").trim();
  const notes = String(form.notes || "").trim();
  payload.selfShippingMode = "EXTERNAL";
  if (carrierName) payload.selfShippingCarrier = carrierName;
  if (trackingUrl) payload.selfShippingTrackingUrl = trackingUrl;
  if (notes) payload.selfShippingNotes = notes;
  if (trackingId) payload.trackingId = trackingId;
  return payload;
};

const shippingProviderLabel = (value) =>
  SHIPPING_PROVIDER_OPTIONS.find(
    (opt) => opt.value === String(value || "").toUpperCase(),
  )?.label || value || "Carrier";

const extractShippingFallbackEntries = (apiRes, extras = {}) => {
  const data = apiRes?.data ?? apiRes;
  const entries = [];

  const pushIfFallback = (row) => {
    if (!row?.fellBackFrom) return;
    entries.push({
      orderId: row.orderId ?? extras.orderId ?? data?.orderId ?? null,
      itemId: row.itemId ?? extras.itemId ?? data?.itemId ?? null,
      sku: row.sku ?? extras.sku ?? null,
      deliveryPincode:
        row.deliveryPincode ??
        extras.deliveryPincode ??
        data?.deliveryPincode ??
        null,
      fellBackFrom: row.fellBackFrom,
      fallbackReason: row.fallbackReason ?? null,
      provider: row.provider ?? "SELF_SHIPPING",
    });
  };

  pushIfFallback(data?.shippingResult);
  if (Array.isArray(data?.shippingResults)) {
    for (const row of data.shippingResults) {
      pushIfFallback(row);
    }
  }

  return entries;
};

const extractManifestFailures = (apiRes, extras = {}) => {
  const data = apiRes?.data ?? apiRes;
  const failures = [];
  const consider = (row) => {
    if (row?.success === false) {
      failures.push({
        ...row,
        orderId: row.orderId ?? extras.orderId ?? data?.orderId ?? null,
        itemId: row.itemId ?? extras.itemId ?? data?.itemId ?? null,
        sku: row.sku ?? extras.sku ?? null,
      });
    }
  };
  consider(data?.shippingResult);
  if (Array.isArray(data?.shippingResults)) {
    for (const row of data.shippingResults) consider(row);
  }
  return failures;
};

const getItemShippingProvider = (item) => {
  const unified = String(item?.shipping?.provider || "").toUpperCase();
  if (unified === "DELHIVERY" || unified === "SHIPROCKET" || unified === "SHADOWFAX" || unified === "SELF_SHIPPING") {
    return unified;
  }
  const p = String(item?.shippingProvider || "").toUpperCase();
  if (p === "DELHIVERY" || p === "SHIPROCKET" || p === "SHADOWFAX" || p === "SELF_SHIPPING") return p;
  if (item?.delhivery?.waybill) return "DELHIVERY";
  if (item?.shadowfax?.awb) return "SHADOWFAX";
  if (
    item?.shiprocket?.orderId != null ||
    item?.shiprocket?.shipmentId != null ||
    item?.shiprocket?.awbCode
  ) {
    return "SHIPROCKET";
  }
  return null;
};

const isDelhiveryLine = (item) =>
  isNormalDeliveryLine(item) && getItemShippingProvider(item) === "DELHIVERY";

const isShadowfaxLine = (item) =>
  isNormalDeliveryLine(item) && getItemShippingProvider(item) === "SHADOWFAX";

const getShadowfaxAwb = (item) => {
  const awb = item?.shadowfax?.awb;
  if (awb) return String(awb).trim();
  if (getItemShippingProvider(item) === "SHADOWFAX" && item?.trackingId) {
    return String(item.trackingId).trim();
  }
  return null;
};

const SHADOWFAX_TRACKING_URL_BASE = "https://tracker.shadowfax.in";

const buildShadowfaxTrackingUrl = (awb) => {
  if (!awb) return null;
  return `${SHADOWFAX_TRACKING_URL_BASE}/${encodeURIComponent(String(awb).trim())}`;
};

const buildDelhiveryTrackingUrl = (waybill) => {
  if (!waybill) return null;
  return `https://www.delhivery.com/track/package/${encodeURIComponent(String(waybill).trim())}`;
};

const getNormalDeliveryShadowfax = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const sfx = item.shadowfax || {};
  const awb = getShadowfaxAwb(item);
  const hasAny =
    awb ||
    (sfx.status && String(sfx.status).trim()) ||
    sfx.trackingUrl;
  if (!hasAny) return null;
  return {
    provider: "SHADOWFAX",
    awb,
    trackingUrl: sfx.trackingUrl || buildShadowfaxTrackingUrl(awb),
    status: sfx.status || null,
    courier: item.courier || "Shadowfax",
    orderRef: sfx.orderRef || null,
  };
};

const getDelhiveryWaybill = (item) => {
  const wb = item?.delhivery?.waybill;
  if (wb) return String(wb).trim();
  if (getItemShippingProvider(item) === "DELHIVERY" && item?.trackingId) {
    return String(item.trackingId).trim();
  }
  return null;
};

const getNormalDeliveryDelhivery = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const dl = item.delhivery || {};
  const waybill = getDelhiveryWaybill(item);
  const hasAny =
    waybill ||
    (dl.status && String(dl.status).trim()) ||
    dl.trackingUrl;
  if (!hasAny) return null;
  return {
    provider: "DELHIVERY",
    awb: waybill,
    trackingUrl: dl.trackingUrl || buildDelhiveryTrackingUrl(waybill),
    status: dl.status || null,
    courier: item.courier || "Delhivery",
    lrn: dl.lrn || waybill,
  };
};

/** NORMAL line moving to Processing — prompt unless already manifested on a carrier */
const itemNeedsShippingProviderOnProcessing = (item, newStatus, order = null) => {
  if (String(newStatus || "").toUpperCase() !== "PROCESSING") return false;
  if (!isNormalDeliveryLine(item, order)) return false;
  if (isLineManifestedOnCarrier(item, order)) return false;
  return true;
};

const defaultShippingProviderForItem = (item) =>
  getItemShippingProvider(item) || "SHIPROCKET";

const orderHasItemsNeedingShippingProvider = (order, newStatus, itemIds = null) => {
  if (String(newStatus || "").toUpperCase() !== "PROCESSING") return false;
  return (order?.items || []).some((item) => {
    const id = String(item.itemId || item._id);
    if (itemIds?.length && !itemIds.map(String).includes(id)) return false;
    return itemNeedsShippingProviderOnProcessing(item, newStatus, order);
  });
};

const buildStatusPayload = (
  newStatus,
  item,
  shippingProvider,
  selfShippingMode = null,
  externalSelfShipping = null,
) => {
  const payload = { status: newStatus };
  if (
    newStatus === "PROCESSING" &&
    shippingProvider &&
    isNormalDeliveryLine(item)
  ) {
    payload.shippingProvider = shippingProvider;
    if (shippingProvider === "SELF_SHIPPING") {
      const mode = selfShippingMode || "INTERNAL";
      payload.selfShippingMode = mode;
      if (mode === "EXTERNAL" && externalSelfShipping) {
        appendExternalSelfShippingToPayload(payload, externalSelfShipping);
      }
    }
  }
  return payload;
};

const resolveItemDocIds = (orderObj, itemObj) => {
  const orderId =
    orderObj?.orderId || orderObj?._id || orderObj?.id || orderObj?.order_id;
  const itemId =
    itemObj?.itemId || itemObj?._id || itemObj?.id || itemObj?.productItemId;
  return { orderId: orderId ? String(orderId) : null, itemId: itemId ? String(itemId) : null };
};

const openPdfBlob = (blob, filename, fallbackMsg) => {
  if (!blob || !(blob instanceof Blob)) {
    toast.error(fallbackMsg);
    return;
  }
  if (blob.type && blob.type.includes("json")) {
    blob.text().then((text) => {
      let msg = fallbackMsg;
      try {
        const j = JSON.parse(text);
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      toast.error(msg);
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** Shiprocket / tracking for a line item (NORMAL courier shipments). */
const getNormalDeliveryShiprocket = (item) => {
  if (!item || !isNormalDeliveryLine(item)) return null;
  const provider = getItemShippingProvider(item);
  if (provider === "SHADOWFAX" || provider === "DELHIVERY") return null;
  const sr = item.shiprocket || {};
  const awb =
    sr.awbCode ||
    (provider === "SHIPROCKET" && item.trackingId ? item.trackingId : null) ||
    null;
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

const getLineCarrierTracking = (item) => {
  if (!item) return null;
  if (isExchangeStatus(item?.status)) {
    const forward = getExchangeForwardShiprocket(item);
    if (forward) return { kind: "shiprocket", data: forward };
  }
  const provider = getItemShippingProvider(item);
  if (provider === "DELHIVERY") {
    const dl = getNormalDeliveryDelhivery(item);
    return dl ? { kind: "delhivery", data: dl } : null;
  }
  if (provider === "SHADOWFAX") {
    const sfx = getNormalDeliveryShadowfax(item);
    return sfx ? { kind: "shadowfax", data: sfx } : null;
  }
  const sr = getLineShiprocket(item);
  return sr ? { kind: "shiprocket", data: sr } : null;
};

const getOrderCarrierPreview = (order) => {
  const items = order?.items || [];
  const rows = items.map((it) => getLineCarrierTracking(it)).filter(Boolean);
  if (rows.length === 0) return null;
  return { primary: rows[0], count: rows.length };
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
      forward?.shipmentId,
      it?.shipmentId,
      it?.shiprocket?.shipmentId,
      getLatestExchange(it)?.shiprocket?.forwardOrder?.shipmentId,
    ]
      .filter(Boolean)
      .map(String)
      .filter(isLikelyShiprocketShipmentId);
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

const labelItemKey = (orderId, itemId) =>
  `${String(orderId || "")}:${String(itemId || "")}`;

const isLineLabelEligible = (item) => {
  if (!isNormalDeliveryLine(item)) return false;
  if (isInternalSelfShippingLine(item)) return true;
  if (isSelfShippingLineOrUnmanifested(item)) return true;
  if (isDelhiveryLine(item) && getDelhiveryWaybill(item)) return true;
  if (isShadowfaxLine(item) && getShadowfaxAwb(item)) return true;
  if (getLatestExchangeForwardOrder(item)?.labelUrl) return true;
  const ids = [
    getLineShiprocket(item)?.shipmentId,
    getLatestExchangeForwardOrder(item)?.shipmentId,
    item?.shipmentId,
    item?.shiprocket?.shipmentId,
    getLatestExchange(item)?.shiprocket?.forwardOrder?.shipmentId,
  ]
    .filter(Boolean)
    .map(String)
    .filter(isLikelyShiprocketShipmentId);
  return ids.length > 0;
};

const getOrderForwardCreateTarget = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    if (!isNormalDeliveryLine(item)) continue;
    if (!isExchangeStatus(item?.status)) continue;
    const exchangeId = getLatestExchangeId(item);
    if (!exchangeId) continue;
    return { exchangeId, item };
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

const getShipmentIdsFromItemRow = (row) => {
  const line = lineItemFromOrderItemRow(row);
  if (!line) return [];
  const sr = getLineShiprocket(line);
  const forward = getLatestExchangeForwardOrder(line);
  return [
    sr?.shipmentId,
    forward?.shipmentId,
    line?.shipmentId,
    line?.shiprocket?.shipmentId,
    getLatestExchange(line)?.shiprocket?.forwardOrder?.shipmentId,
  ]
    .filter(Boolean)
    .map(String)
    .filter(isLikelyShiprocketShipmentId);
};

function DelhiveryDetails({ dl, compact }) {
  if (!dl) return <span className="text-gray-400">—</span>;
  if (compact) {
    const meta = [dl.status, dl.courier].filter(Boolean).join(" · ");
    return (
      <div className="min-w-0 leading-tight">
        {dl.trackingUrl ? (
          <SafeExternalLink
            href={dl.trackingUrl}
            className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] text-emerald-700 hover:underline"
            title={dl.awb || "Track"}
          >
            <ExternalLink size={9} className="shrink-0" aria-hidden />
            <span className="truncate">{dl.awb || "Track"}</span>
          </SafeExternalLink>
        ) : (
          <span
            className="block truncate font-mono text-[9px] text-gray-800"
            title={dl.awb || undefined}
          >
            {dl.awb || "—"}
          </span>
        )}
        {meta ? (
          <p className="truncate text-[9px] text-stone-500" title={meta}>
            {meta}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold uppercase text-emerald-700">Delhivery</span>
        {dl.status && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            {dl.status}
          </span>
        )}
      </div>
      {dl.awb && (
        <p className="font-mono text-xs">
          Waybill:{" "}
          {dl.trackingUrl ? (
            <SafeExternalLink
              href={dl.trackingUrl}
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
            >
              {dl.awb}
              <ExternalLink size={12} />
            </SafeExternalLink>
          ) : (
            dl.awb
          )}
        </p>
      )}
      {dl.courier && <p className="text-xs text-gray-600">Courier: {dl.courier}</p>}
    </div>
  );
}

function ShadowfaxDetails({ sfx, compact }) {
  if (!sfx) return <span className="text-gray-400">—</span>;
  if (compact) {
    const meta = [sfx.status, sfx.courier].filter(Boolean).join(" · ");
    return (
      <div className="min-w-0 leading-tight">
        {sfx.trackingUrl ? (
          <SafeExternalLink
            href={sfx.trackingUrl}
            className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] text-orange-700 hover:underline"
            title={sfx.awb || "Track"}
          >
            <ExternalLink size={9} className="shrink-0" aria-hidden />
            <span className="truncate">{sfx.awb || "Track"}</span>
          </SafeExternalLink>
        ) : (
          <span
            className="block truncate font-mono text-[9px] text-gray-800"
            title={sfx.awb || undefined}
          >
            {sfx.awb || "—"}
          </span>
        )}
        {meta ? (
          <p className="truncate text-[9px] text-stone-500" title={meta}>
            {meta}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      {sfx.awb && (
        <p className="font-mono text-xs">
          AWB:{" "}
          {sfx.trackingUrl ? (
            <SafeExternalLink
              href={sfx.trackingUrl}
              className="inline-flex items-center gap-1 text-orange-700 hover:underline"
            >
              {sfx.awb}
              <ExternalLink size={12} />
            </SafeExternalLink>
          ) : (
            sfx.awb
          )}
        </p>
      )}
      {sfx.courier && <p className="text-xs text-gray-600">Courier: {sfx.courier}</p>}
      {sfx.status && (
        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
          {sfx.status}
        </span>
      )}
    </div>
  );
}

function CarrierTrackingDetails({ tracking, compact }) {
  if (!tracking) return <span className="text-gray-400">—</span>;
  if (tracking.kind === "delhivery") {
    return <DelhiveryDetails dl={tracking.data} compact={compact} />;
  }
  if (tracking.kind === "shadowfax") {
    return <ShadowfaxDetails sfx={tracking.data} compact={compact} />;
  }
  return <ShiprocketDetails sr={tracking.data} compact={compact} />;
}

function ShiprocketDetails({ sr, compact }) {
  if (!sr) return <span className="text-gray-400">—</span>;
  if (compact) {
    const meta = [sr.courier].filter(Boolean).join(" · ");
    return (
      <div className="min-w-0 leading-tight">
        {sr.trackingUrl ? (
          <SafeExternalLink
            href={sr.trackingUrl}
            className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] text-brand-600 hover:underline"
            title={sr.awb || "Track"}
          >
            <ExternalLink size={9} className="shrink-0" aria-hidden />
            <span className="truncate">{sr.awb || "Track"}</span>
          </SafeExternalLink>
        ) : (
          <span
            className="block truncate font-mono text-[9px] text-gray-800"
            title={sr.awb || undefined}
          >
            {sr.awb || "—"}
          </span>
        )}
        {meta ? (
          <p className="truncate text-[9px] text-stone-500" title={meta}>
            {meta}
          </p>
        ) : null}
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
            <SafeExternalLink
              href={sr.trackingUrl}
              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            >
              {sr.awb}
              <ExternalLink size={12} />
            </SafeExternalLink>
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
            <span className="text-xs font-medium text-brand-600">
              Label ready
            </span>
          )}
          {sr.invoiceUrl && (
            <span className="text-xs font-medium text-brand-600">
              Invoice ready
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const Orders = ({
  exchangeOnly = false,
  returnOnly = false,
  defaultViewMode = VIEW_ORDER,
  pageTitle = null,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = useAdminPanelBasePath();
  const ui = useMemo(() => getOrdersUiTokens(), []);
  const listPageTitle =
    pageTitle ||
    (returnOnly ? "Return orders" : exchangeOnly ? "Exchange orders" : "Orders");
  const lineStackFilterProps = {
    exchangeLinesOnly: exchangeOnly,
    returnLinesOnly: returnOnly,
    standardLinesOnly: false,
  };
  const ap = useMemo(
    () => (suffix) =>
      `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/"),
    [basePath],
  );
  const openedFromQueryRef = useRef(false);
  const docRefreshRef = useRef({ refreshAfterLabel: async () => {} });
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
  const [searchExact, setSearchExact] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  /** By order only: "" | "mixed" | "uniform" */
  const [lineConsistencyFilter, setLineConsistencyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  /** Filters both By order and By item lists (sent as ?deliveryType= to API) */
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  /** COD / prepaid / prepaid pending — shared by By order and By item lists */
  const [paymentFilter, setPaymentFilter] = useState("");
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
  const [shippingProviderFilter, setShippingProviderFilter] = useState("");
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
  // List-level bulk actions (By order / By item lists)
  const [listSelectedOrderIds, setListSelectedOrderIds] = useState([]);
  const [listSelectedItemKeys, setListSelectedItemKeys] = useState([]); // `${orderId}__${itemId}`
  const [listBulkProcessing, setListBulkProcessing] = useState(false);
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
  const [exchangePickupModal, setExchangePickupModal] = useState(null);
  const [exchangePickupForm, setExchangePickupForm] = useState({
    manualTrackingId: "",
    notes: "",
    scheduledAt: "",
    bookDelhivery: false,
    bookShadowfax: false,
  });
  const [exchangePickupLoading, setExchangePickupLoading] = useState(false);
  const [returnApproveLoading, setReturnApproveLoading] = useState(false);
  const [returnBookPickupLoading, setReturnBookPickupLoading] = useState(false);
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
  const [downloadedLabelItemKeys, setDownloadedLabelItemKeys] = useState(
    () => new Set(),
  );
  const [manufacturingPdfLoading, setManufacturingPdfLoading] = useState(false);

  const [orderListVisibleColumns, setOrderListVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(ORDER_LIST_COLUMNS_STORAGE_KEY, ORDER_LIST_TABLE_COLUMNS),
  );
  const [orderListColumnsOpen, setOrderListColumnsOpen] = useState(false);
  const [listFiltersOpen, setListFiltersOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
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

  // When Reassign is used: unassign this assignment first, then assign new driver
  const [reassignAssignmentId, setReassignAssignmentId] = useState(null);
  const [orderNotesModalOpen, setOrderNotesModalOpen] = useState(false);
  const [orderNotesModalOrderId, setOrderNotesModalOrderId] = useState(null);
  const [orderNotesModalLoading, setOrderNotesModalLoading] = useState(false);
  const [orderNotesModalNotes, setOrderNotesModalNotes] = useState([]);
  const [orderNotesModalDraft, setOrderNotesModalDraft] = useState("");
  const [orderNotesModalSaving, setOrderNotesModalSaving] = useState(false);
  // Payment override modal (admin)
  const [paymentOverrideOpen, setPaymentOverrideOpen] = useState(false);
  const [paymentOverridePaymentId, setPaymentOverridePaymentId] = useState("");
  const [paymentOverrideNotes, setPaymentOverrideNotes] = useState("");
  const [paymentOverrideSendNotification, setPaymentOverrideSendNotification] = useState(true);
  const [paymentOverrideSaving, setPaymentOverrideSaving] = useState(false);

  const [createShiprocketLoading, setCreateShiprocketLoading] = useState(false);
  const [shiprocketModalOpen, setShiprocketModalOpen] = useState(false);
  const [shiprocketModalItemIds, setShiprocketModalItemIds] = useState([]);
  const [createDelhiveryLoading, setCreateDelhiveryLoading] = useState(false);
  const [delhiveryModalOpen, setDelhiveryModalOpen] = useState(false);
  const [delhiveryModalItemIds, setDelhiveryModalItemIds] = useState([]);
  const [shippingProviderModalOpen, setShippingProviderModalOpen] = useState(false);
  const [selectedShippingProvider, setSelectedShippingProvider] = useState("SHIPROCKET");
  const [selectedSelfShippingMode, setSelectedSelfShippingMode] = useState("INTERNAL");
  const [externalSelfShipModal, setExternalSelfShipModal] = useState(null);
  const [externalSelfShipForm, setExternalSelfShipForm] = useState(EMPTY_EXTERNAL_SELF_SHIP_FORM);
  const [externalSelfShipSubmitting, setExternalSelfShipSubmitting] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [shippingProviderSubmitting, setShippingProviderSubmitting] = useState(false);
  const [shippingFallbackModal, setShippingFallbackModal] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [sidebarCounts, setSidebarCounts] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  const openShippingProviderModal = (pending, { provider = null } = {}) => {
    if (provider) setSelectedShippingProvider(provider);
    setSelectedSelfShippingMode("INTERNAL");
    setExternalSelfShipForm(EMPTY_EXTERNAL_SELF_SHIP_FORM);
    setPendingStatusUpdate(pending);
    setShippingProviderModalOpen(true);
  };

  const openExternalSelfShippingModalForItem = (orderId, itemId, item, options = {}) => {
    const { newStatus = null, detailsOnly = !newStatus } = options;
    setExternalSelfShipForm(buildExternalSelfShipFormFromItem(item));
    setExternalSelfShipModal({
      orderId,
      itemId: String(itemId),
      newStatus: newStatus || null,
      detailsOnly,
      currentStatus: item?.status || null,
    });
  };

  const submitExternalSelfShippingModal = async () => {
    if (!externalSelfShipModal) return;
    const { orderId, itemId, newStatus, detailsOnly, currentStatus } = externalSelfShipModal;
    const validationError = validateExternalSelfShipForm(externalSelfShipForm, {
      requireAll: !detailsOnly,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setExternalSelfShipSubmitting(true);
    try {
      if (detailsOnly) {
        await updateOrderItemStatus(orderId, itemId, {
          status: currentStatus,
          ...appendExternalSelfShippingToPayload({ status: currentStatus }, externalSelfShipForm),
        });
        toast.success("External shipping details saved.");
        setExternalSelfShipModal(null);
        if (selectedOrder?.orderId === orderId) {
          await fetchSingleOrder(orderId);
        }
        fetchOrderItems();
        return;
      }

      await handleUpdateItemStatus(orderId, itemId, newStatus, {
        skipProviderPrompt: true,
        externalSelfShipping: externalSelfShipForm,
      });
      setExternalSelfShipModal(null);
    } catch (err) {
      toast.error(apiErrMessage(err, "Failed to save external shipping details"));
    } finally {
      setExternalSelfShipSubmitting(false);
    }
  };

  useEffect(() => {
    if (!exchangeOnly) return;
    setViewMode(VIEW_ORDER);
    setStatusFilter("");
    setItemStatusFilter("");
  }, [exchangeOnly]);

  useEffect(() => {
    if (!returnOnly) return;
    setViewMode(VIEW_ORDER);
    setStatusFilter("");
    setItemStatusFilter("");
  }, [returnOnly]);

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
        : getSafeHttpHref(url);
    if (!normalizedUrl) {
      toast.error(fallbackMsg);
      return;
    }
    if (!openSafeExternalUrl(normalizedUrl)) {
      toast.error(fallbackMsg);
      return;
    }
  };

  const handleGetInvoiceClick = async (orderObj, itemObj) => {
    if (!orderObj || !itemObj) return;

    if (isSelfShippingLineOrUnmanifested(itemObj)) {
      const { orderId, itemId } = resolveItemDocIds(orderObj, itemObj);
      if (!orderId || !itemId) {
        toast.error("Order or item ID missing for self-shipping invoice.");
        return;
      }
      setDocActionType("invoice");
      setDocDownloadLoading(true);
      try {
        const blob = await downloadSelfShippingInvoice(orderId, itemId);
        openPdfBlob(
          blob,
          `self-shipping-invoice_${orderId}.pdf`,
          "Failed to download self-shipping invoice",
        );
      } catch (err) {
        toast.error(apiErrMessage(err, "Failed to download self-shipping invoice"));
      } finally {
        setDocDownloadLoading(false);
        setDocActionType(null);
      }
      return;
    }

    if (isDelhiveryLine(itemObj)) {
      const { orderId, itemId } = resolveItemDocIds(orderObj, itemObj);
      if (!orderId || !itemId) {
        toast.error("Order or item ID missing for Delhivery invoice.");
        return;
      }
      setDocActionType("invoice");
      setDocDownloadLoading(true);
      try {
        const blob = await downloadOrderInvoicePdf(orderId, itemId);
        openPdfBlob(
          blob,
          `invoice_${orderId}.pdf`,
          "Failed to download Delhivery invoice",
        );
      } catch (err) {
        toast.error(apiErrMessage(err, "Failed to download Delhivery invoice"));
      } finally {
        setDocDownloadLoading(false);
        setDocActionType(null);
      }
      return;
    }

    const { orderId, itemId } = resolveItemDocIds(orderObj, itemObj);
    if (!orderId || !itemId) {
      toast.error("Order or item ID missing for invoice download.");
      return;
    }

    setDocActionType("invoice");
    setDocDownloadLoading(true);
    try {
      const res = await getInvoice(orderId, itemId);
      let payload = res?.data ?? res;

      if (typeof Blob !== "undefined" && payload instanceof Blob) {
        const mime = (payload.type || "").toLowerCase();
        const maybeJson =
          !mime || mime.includes("json") || mime === "text/plain";
        if (maybeJson) {
          try {
            payload = JSON.parse(await payload.text());
          } catch {
            toast.error("Invalid invoice response from server");
            return;
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

      toast.error(
        apiErrMessage(
          new Error(
            payload?.message ||
              res?.message ||
              "Invoice not available for this delivery line",
          ),
          "Failed to download invoice",
        ),
      );
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error(apiErrMessage(err, "Failed to download invoice"));
    } finally {
      setDocDownloadLoading(false);
      setDocActionType(null);
    }
  };

  const isItemLabelDownloaded = useCallback(
    (item, orderId = null) => {
      const oid = orderId || item?.orderId || selectedOrder?.orderId || "";
      const iid = item?.itemId || item?._id || item?.productItemId || "";
      if (oid && iid && downloadedLabelItemKeys.has(labelItemKey(oid, iid))) {
        return true;
      }
      return Boolean(item?.labelDownloadedAt);
    },
    [downloadedLabelItemKeys, selectedOrder?.orderId],
  );

  const isOrderLabelDownloaded = useCallback(
    (order) => {
      const items = (order?.items || []).filter(isLineLabelEligible);
      return (
        items.length > 0 &&
        items.every((it) => isItemLabelDownloaded(it, order?.orderId))
      );
    },
    [isItemLabelDownloaded],
  );

  const markLabelDownloadedLocally = useCallback(
    (orderId, itemId) => {
      if (!orderId || itemId == null) return;
      const key = labelItemKey(orderId, itemId);
      const stampedAt = new Date().toISOString();
      setDownloadedLabelItemKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setSelectedOrder((prev) => {
        if (!prev || String(prev.orderId) !== String(orderId)) return prev;
        return {
          ...prev,
          items: (prev.items || []).map((it) =>
            String(it.itemId) === String(itemId)
              ? { ...it, labelDownloadedAt: stampedAt }
              : it,
          ),
        };
      });
      setOrders((prev) =>
        (Array.isArray(prev) ? prev : []).map((o) => {
          if (String(o.orderId) !== String(orderId)) return o;
          return {
            ...o,
            items: (o.items || []).map((it) =>
              String(it.itemId) === String(itemId)
                ? { ...it, labelDownloadedAt: stampedAt }
                : it,
            ),
          };
        }),
      );
      setOrderItems((prev) =>
        (Array.isArray(prev) ? prev : []).map((row) => {
          const rowItemId = row.itemId ?? row.productItemId ?? row.item?.itemId;
          if (String(row.orderId) !== String(orderId) || String(rowItemId) !== String(itemId)) {
            return row;
          }
          return {
            ...row,
            labelDownloadedAt: stampedAt,
            item: row.item
              ? { ...row.item, labelDownloadedAt: stampedAt }
              : row.item,
          };
        }),
      );
    },
    [],
  );

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
        await docRefreshRef.current.refreshAfterLabel();
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
      forward?.shipmentId,
      item?.shipmentId,
      item?.shiprocket?.shipmentId,
      getLatestExchange(item)?.shiprocket?.forwardOrder?.shipmentId,
    ]
      .filter(Boolean)
      .map(String)
      .filter(isLikelyShiprocketShipmentId);
    return Array.from(new Set(ids));
  };

  const handleLabelForItem = async (item, orderObj = null) => {
    const forwardLabelUrl = getLatestExchangeForwardOrder(item)?.labelUrl;
    if (forwardLabelUrl) {
      openDocUrl(forwardLabelUrl, "Failed to download shipping label(s)");
      return;
    }

    if (isSelfShippingLineOrUnmanifested(item)) {
      const orderCtx = orderObj || selectedOrder || { orderId: item?.orderId };
      const { orderId: oid, itemId } = resolveItemDocIds(orderCtx, item);
      if (!oid || !itemId) {
        toast.error("Order or item ID missing for self-shipping label.");
        return;
      }
      setDocActionType("label");
      setDocDownloadLoading(true);
      try {
        const blob = await downloadSelfShippingLabel(oid, itemId);
        openPdfBlob(
          blob,
          `self-shipping-label_${oid}.pdf`,
          "Failed to download self-shipping label",
        );
        markLabelDownloadedLocally(oid, itemId);
        await docRefreshRef.current.refreshAfterLabel(oid);
      } catch (err) {
        toast.error(apiErrMessage(err, "Failed to download self-shipping label"));
      } finally {
        setDocDownloadLoading(false);
        setDocActionType(null);
      }
      return;
    }

    if (isShadowfaxLine(item)) {
      const awb = getShadowfaxAwb(item);
      if (!awb) {
        toast.error("Shadowfax AWB not available yet for this item.");
        return;
      }
      const orderCtx = orderObj || selectedOrder || { orderId: item?.orderId };
      const { orderId: oid, itemId } = resolveItemDocIds(orderCtx, item);
      if (!oid || !itemId) {
        toast.error("Order or item ID missing for Shadowfax label.");
        return;
      }
      setDocActionType("label");
      setDocDownloadLoading(true);
      try {
        const blob = await downloadShadowfaxLabel(oid, itemId);
        openPdfBlob(
          blob,
          `shadowfax-label_${awb}.pdf`,
          "Failed to download Shadowfax label",
        );
        markLabelDownloadedLocally(oid, itemId);
        await docRefreshRef.current.refreshAfterLabel(oid);
      } catch (err) {
        toast.error(apiErrMessage(err, "Failed to download Shadowfax label"));
      } finally {
        setDocDownloadLoading(false);
        setDocActionType(null);
      }
      return;
    }

    if (isDelhiveryLine(item)) {
      const waybill = getDelhiveryWaybill(item);
      if (!waybill) {
        toast.error("Delhivery waybill not available yet for this item.");
        return;
      }
      setDocActionType("label");
      setDocDownloadLoading(true);
      try {
        const lrn = item?.delhivery?.lrn || waybill;
        const blob = await downloadDelhiveryPackingSlip([waybill], { lrn });
        openPdfBlob(
          blob,
          `delhivery-label_${waybill}.pdf`,
          "Failed to download Delhivery packing slip",
        );
        const oid =
          orderObj?.orderId ||
          selectedOrder?.orderId ||
          item?.orderId ||
          null;
        if (oid && item?.itemId) {
          markLabelDownloadedLocally(oid, item.itemId);
        }
        await docRefreshRef.current.refreshAfterLabel(oid);
      } catch (err) {
        toast.error(apiErrMessage(err, "Failed to download Delhivery label"));
      } finally {
        setDocDownloadLoading(false);
        setDocActionType(null);
      }
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
    const provider = getItemShippingProvider(item);
    if (provider === "SELF_SHIPPING") {
      toast.error("Manifest is not used for self-shipped items.");
      return;
    }
    if (provider === "DELHIVERY") {
      toast.error("Manifest is not used for Delhivery. Download shipping label instead.");
      return;
    }
    const ids = getShipmentIdsForItem(item);
    if (!ids.length) {
      toast.error("Shipment ID not available yet for this item.");
      return;
    }
    handleDownloadManifestClick(ids);
  };

  const handleLabelForOrder = (order) => {
    const normalItems = (order?.items || []).filter(isNormalDeliveryLine);
    if (!normalItems.length) {
      toast.error("No shippable items in this order.");
      return;
    }

    const selfShipLines = normalItems.filter(isSelfShippingLineOrUnmanifested);
    if (selfShipLines.length === normalItems.length) {
      if (selfShipLines.length === 1) {
        handleLabelForItem(selfShipLines[0], order);
        return;
      }
      toast.error("Download label for each self-shipped line separately.");
      return;
    }

    const delhiveryLines = normalItems.filter(
      (it) => isDelhiveryLine(it) && getDelhiveryWaybill(it),
    );
    if (delhiveryLines.length === normalItems.length) {
      if (delhiveryLines.length === 1) {
        handleLabelForItem(delhiveryLines[0], order);
        return;
      }
      toast.error("Download label for each Delhivery line separately.");
      return;
    }

    const ids = getOrderShipmentIds(order);
    if (!ids.length) {
      const fallback = normalItems.find(isSelfShippingLineOrUnmanifested);
      if (fallback) {
        handleLabelForItem(fallback, order);
        return;
      }
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

  const openOrderById = useCallback(
    (orderId) => {
      if (!orderId) return;
      navigate(ap(`orders?open=${encodeURIComponent(orderId)}`));
    },
    [navigate, ap],
  );

  const handleOpenAssignExchangePickup = (exchange, item) => {
    const exchangeId = getExchangeRecordId(exchange);
    if (!exchangeId) {
      toast.error("Exchange ID not found.");
      return;
    }
    setExchangePickupForm({
      manualTrackingId:
        exchange?.returnPickup?.manualTrackingId ||
        exchange?.delhivery?.returnPickup?.waybill ||
        exchange?.shadowfax?.returnPickup?.awb ||
        "",
      notes: exchange?.returnPickup?.notes || "",
      scheduledAt: "",
      bookDelhivery:
        String(exchange?.returnPickupMethod || "").toUpperCase() === "DELHIVERY_MANUAL" &&
        !exchange?.returnPickup?.manualTrackingId &&
        !exchange?.delhivery?.returnPickup?.waybill &&
        !exchange?.shadowfax?.returnPickup?.awb,
      bookShadowfax:
        String(exchange?.returnPickupMethod || "").toUpperCase() === "SHADOWFAX_MANUAL" &&
        !exchange?.returnPickup?.manualTrackingId &&
        !exchange?.shadowfax?.returnPickup?.awb &&
        !exchange?.delhivery?.returnPickup?.waybill,
    });
    setExchangePickupModal({
      exchangeId,
      orderId: item?.orderId || selectedOrder?.orderId || null,
      item,
      returnPickupMethod: exchange?.returnPickupMethod || null,
    });
  };

  const handleApproveReturn = async (returnDoc, item) => {
    const returnId = returnDoc?._id ? String(returnDoc._id) : getLatestReturnId(item);
    if (!returnId) {
      toast.error("Return request ID not found.");
      return;
    }
    const orderId = item?.orderId || selectedOrder?.orderId;
    setReturnApproveLoading(true);
    try {
      const res = await approveReturn(returnId);
      const payload = res?.data ?? res;
      const pickup = payload?.pickupResult;
      if (pickup?.scheduled) {
        toast.success(pickup.message || "Return approved and reverse pickup booked.");
      } else if (pickup?.error) {
        toast.error(`Return approved but pickup failed: ${pickup.error}`);
      } else if (pickup?.message) {
        toast.success(`Return approved. ${pickup.message}`);
      } else {
        toast.success("Return approved.");
      }
      if (orderId) await fetchSingleOrder(orderId);
    } catch (err) {
      console.error("Approve return failed:", err);
      showBackendErrorsAsToasts(err, "Failed to approve return.");
    } finally {
      setReturnApproveLoading(false);
    }
  };

  const handleBookReturnReversePickup = async (returnDoc, item) => {
    const returnId = returnDoc?._id ? String(returnDoc._id) : getLatestReturnId(item);
    if (!returnId) {
      toast.error("Return request ID not found.");
      return;
    }
    const orderId = item?.orderId || selectedOrder?.orderId;
    setReturnBookPickupLoading(true);
    try {
      const res = await bookReturnReversePickup(returnId);
      const payload = res?.data ?? res;
      const pickup = payload?.pickupResult;
      if (pickup?.scheduled) {
        toast.success(pickup.message || "Reverse pickup booked.");
      } else if (pickup?.error) {
        toast.error(pickup.error);
      } else {
        toast.success(payload?.message || "Reverse pickup booking attempted.");
      }
      if (orderId) await fetchSingleOrder(orderId);
    } catch (err) {
      console.error("Book return pickup failed:", err);
      showBackendErrorsAsToasts(err, "Failed to book reverse pickup.");
    } finally {
      setReturnBookPickupLoading(false);
    }
  };

  const handleSubmitExchangePickup = async () => {
    if (!exchangePickupModal?.exchangeId) return;
    setExchangePickupLoading(true);
    try {
      const body = {
        manualTrackingId: exchangePickupForm.manualTrackingId.trim() || undefined,
        notes: exchangePickupForm.notes.trim() || undefined,
        scheduledAt: exchangePickupForm.scheduledAt || undefined,
        bookDelhivery: exchangePickupForm.bookDelhivery || undefined,
        bookShadowfax: exchangePickupForm.bookShadowfax || undefined,
      };
      await assignExchangePickup(exchangePickupModal.exchangeId, body);
      toast.success("Exchange pickup assigned.");
      setExchangePickupModal(null);
      const refreshOrderId =
        exchangePickupModal.orderId || selectedOrder?.orderId || null;
      if (refreshOrderId) await fetchSingleOrder(refreshOrderId);
      else await fetchOrders();
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to assign exchange pickup.");
    } finally {
      setExchangePickupLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { paymentStatus, paymentMode } = paymentFilterToQuery(paymentFilter);
      const consistencyParam = lineConsistencyFilter || "";
      dbgOrders("getOrders:request", {
        lineConsistencyFilter: consistencyParam || "(all)",
        orderStatus: statusFilter || "(all)",
        page: pagination.page,
        limit: pagination.limit,
      });
      const effectiveOrderStatus = statusFilter;
      const res = await getOrders(
        pagination.page,
        pagination.limit,
        search,
        effectiveOrderStatus,
        dateFrom || undefined,
        dateTo || undefined,
        sortBy,
        sortOrder,
        deliveryTypeFilter || undefined,
        paymentStatus,
        paymentMode,
        consistencyParam,
        cityFilter.trim() || undefined,
        !!exchangeOnly,
        !!returnOnly,
        searchExact,
      );
      // Backend: successResponse → { success, message, data: { orders, pagination } }
      dbgOrders("getOrders:response", res);
      if (consistencyParam && !res?.data?.appliedFilters?.itemStatusConsistency) {
        console.warn(
          "[Orders] itemStatusConsistency filter was not applied by API — set VITE_API_BASE_URL in .env to your local backend or deploy KhushBackend.",
        );
      }
      const payload = res?.data ?? {};
      const rawList = payload.orders ?? payload.data ?? [];
      const list = exchangeOnly
        ? (Array.isArray(rawList)
            ? rawList.filter((row) => isExchangeOrderEntry(row))
            : [])
        : returnOnly
          ? (Array.isArray(rawList)
              ? rawList.filter((row) => isReturnOrderEntry(row))
              : [])
          : Array.isArray(rawList)
            ? rawList
            : [];
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
  }, [pagination.page, pagination.limit, search, searchExact, statusFilter, lineConsistencyFilter, dateFrom, dateTo, sortBy, sortOrder, deliveryTypeFilter, paymentFilter, cityFilter, exchangeOnly, returnOnly]);

  useEffect(() => {
    if (viewMode === VIEW_ORDER && !selectedOrder) {
      fetchOrders();
    }
  }, [fetchOrders, viewMode, selectedOrder]);

  const fetchOrderItems = useCallback(async () => {
    try {
      setItemLoading(true);
      setItemError(null);
      const { paymentStatus, paymentMode } = paymentFilterToQuery(paymentFilter);
      const effectiveItemStatus = itemStatusFilter;
      const res = await getOrderItems(
        itemPagination.page,
        itemPagination.limit,
        itemSearch,
        "",
        effectiveItemStatus,
        dateFrom || undefined,
        dateTo || undefined,
        deliveryTypeFilter || undefined,
        paymentStatus,
        paymentMode,
        cityFilter.trim() || undefined,
        !!exchangeOnly,
        !!returnOnly,
        shippingProviderFilter || undefined,
        searchExact,
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
        ? rawItems.filter((row) => isExchangeListRow(row))
        : returnOnly
          ? rawItems.filter((row) => isReturnListRow(row))
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
  }, [itemPagination.page, itemPagination.limit, itemSearch, searchExact, itemStatusFilter, shippingProviderFilter, deliveryTypeFilter, paymentFilter, cityFilter, exchangeOnly, returnOnly, dateFrom, dateTo]);

  useEffect(() => {
    if (viewMode === VIEW_ITEM) fetchOrderItems();
  }, [viewMode, fetchOrderItems]);

  useEffect(() => {
    const keys = [];
    const collect = (orderId, itemId, labelDownloadedAt) => {
      if (orderId && itemId && labelDownloadedAt) {
        keys.push(labelItemKey(orderId, itemId));
      }
    };

    (Array.isArray(orders) ? orders : []).forEach((order) => {
      (order.items || []).forEach((item) => {
        collect(order.orderId, item.itemId, item.labelDownloadedAt);
      });
    });

    if (selectedOrder?.orderId) {
      (selectedOrder.items || []).forEach((item) => {
        collect(selectedOrder.orderId, item.itemId, item.labelDownloadedAt);
      });
    }

    (Array.isArray(orderItems) ? orderItems : []).forEach((row) => {
      const itemId = row.itemId ?? row.productItemId ?? row.item?.itemId;
      const ts = row.labelDownloadedAt ?? row.item?.labelDownloadedAt;
      collect(row.orderId, itemId, ts);
    });

    if (!keys.length) return;
    setDownloadedLabelItemKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      keys.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [orders, selectedOrder, orderItems]);

  const fetchStatusAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      setSidebarCounts(null);
      const res = await getAdminOrderSidebarCounts({
        view: viewMode === VIEW_ITEM ? "item" : "order",
      });
      setSidebarCounts(unwrapApiData(res));
    } catch (err) {
      console.error("Failed to fetch status analytics:", err);
      setAnalyticsError(apiErrMessage(err, "Failed to load analytics."));
      setSidebarCounts(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!analyticsOpen || selectedOrder) return;
    fetchStatusAnalytics();
  }, [analyticsOpen, selectedOrder, fetchStatusAnalytics]);

  // Clear list selections whenever filters / paging changes
  useEffect(() => {
    setListSelectedOrderIds([]);
  }, [
    viewMode,
    pagination.page,
    search,
    statusFilter,
    dateFrom,
    dateTo,
    cityFilter,
    sortBy,
    sortOrder,
    deliveryTypeFilter,
    paymentFilter,
    exchangeOnly,
    returnOnly,
  ]);

  useEffect(() => {
    setListSelectedItemKeys([]);
  }, [
    viewMode,
    itemPagination.page,
    itemSearch,
    itemStatusFilter,
    shippingProviderFilter,
    dateFrom,
    dateTo,
    cityFilter,
    deliveryTypeFilter,
    paymentFilter,
    exchangeOnly,
    returnOnly,
  ]);

  const handleDownloadManufacturingPdf = async () => {
    try {
      setManufacturingPdfLoading(true);
      const searchVal =
        viewMode === VIEW_ORDER
          ? search?.trim() || undefined
          : itemSearch?.trim() || undefined;
      const { paymentStatus, paymentMode } = paymentFilterToQuery(paymentFilter);
      const body = {
        search: searchVal,
        searchExact: searchExact || undefined,
        itemStatus:
          viewMode === VIEW_ITEM ? itemStatusFilter || undefined : undefined,
        orderStatus:
          viewMode === VIEW_ORDER ? statusFilter || undefined : undefined,
        itemStatusConsistency:
          viewMode === VIEW_ORDER && lineConsistencyFilter
            ? lineConsistencyFilter
            : undefined,
        deliveryType: deliveryTypeFilter || undefined,
        paymentStatus,
        paymentMode,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        city: cityFilter.trim() || undefined,
        allPages: true,
        maxExportRows: 8000,
        ...(exchangeOnly ? { exchangeOnly: true } : {}),
        ...(returnOnly ? { returnOnly: true } : {}),
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
        viewMode === VIEW_ORDER && lineConsistencyFilter
          ? lineConsistencyFilter
          : "all",
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
        const filteredItems = singlePayload.items.filter((it) =>
          hasActiveExchangeStatus(it),
        );
        setSelectedOrder({ ...singlePayload, items: filteredItems });
      } else if (returnOnly && singlePayload?.items) {
        const filteredItems = singlePayload.items.filter(
          (it) => hasActiveReturnStatus(it) || getItemReturns(it).length > 0,
        );
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
        if (isDebugOrders()) logger.warn("Orders", "getAssignmentView failed:", e);
        setOrderAssignments(null);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      setOrderError(apiErrMessage(err, "Could not load order details."));
    } finally {
      setOrderLoading(false);
    }
  };

  docRefreshRef.current.refreshAfterLabel = async (orderId = null) => {
    const oid = orderId || selectedOrder?.orderId || null;
    if (oid && selectedOrder?.orderId === oid) {
      await fetchSingleOrder(oid);
    } else if (selectedOrder?.orderId) {
      await fetchSingleOrder(selectedOrder.orderId);
    }
    if (viewMode === VIEW_ITEM) {
      await fetchOrderItems();
    } else if (viewMode === VIEW_ORDER && !selectedOrder) {
      await fetchOrders();
    }
  };

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || openedFromQueryRef.current) return;
    openedFromQueryRef.current = true;
    setViewMode(VIEW_ORDER);
    setSelectedItemIdFromListView(null);
    setItemPage(1);
    fetchSingleOrder(openId);
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const openPaymentOverrideModal = () => {
    setPaymentOverridePaymentId("");
    setPaymentOverrideNotes("");
    setPaymentOverrideSendNotification(true);
    setPaymentOverrideOpen(true);
  };

  const closePaymentOverrideModal = () => {
    if (paymentOverrideSaving) return;
    setPaymentOverrideOpen(false);
  };

  const handleForcePaymentSuccess = async () => {
    const oid = selectedOrder?.orderId;
    if (!oid) return;
    const paymentId = String(paymentOverridePaymentId || "").trim();
    if (!paymentId) {
      toast.error("Payment ID is required");
      return;
    }
    setPaymentOverrideSaving(true);
    try {
      await forceSuccessPaymentAndConfirm(oid, {
        paymentId,
        notes: String(paymentOverrideNotes || "").trim() || undefined,
        sendNotification: !!paymentOverrideSendNotification,
      });
      toast.success("Payment marked SUCCESS and order confirmed");
      setPaymentOverrideOpen(false);
      await fetchSingleOrder(oid);
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to update payment status");
    } finally {
      setPaymentOverrideSaving(false);
    }
  };

  const openShiprocketItemModal = () => {
    const eligible = getShiprocketEligibleItems(selectedOrder);
    if (!eligible.length) {
      toast.error(
        "No eligible items. Only NORMAL delivery lines without Shiprocket can be selected.",
      );
      return;
    }
    setShiprocketModalItemIds(
      eligible.map((it) => String(it.itemId || it._id)),
    );
    setShiprocketModalOpen(true);
  };

  const closeShiprocketItemModal = () => {
    if (createShiprocketLoading) return;
    setShiprocketModalOpen(false);
    setShiprocketModalItemIds([]);
  };

  const toggleShiprocketModalItem = (itemId) => {
    const id = String(itemId);
    setShiprocketModalItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmitShiprocketModal = async () => {
    const oid = selectedOrder?.orderId;
    if (!oid) return;
    const ids = shiprocketModalItemIds.map(String).filter(Boolean);
    if (!ids.length) {
      toast.error("Select at least one item");
      return;
    }
    const selected = (selectedOrder?.items || []).filter((it) =>
      ids.includes(String(it.itemId || it._id)),
    );
    const groups = [
      ...new Set(selected.map((it) => String(it.shipmentGroupId || "")).filter(Boolean)),
    ];
    if (groups.length !== 1) {
      toast.error("Selected items must be in the same shipment group");
      return;
    }

    setCreateShiprocketLoading(true);
    try {
      await createShiprocketForOrderShipments(oid, { itemIds: ids });
      toast.success(
        `Shiprocket order created for ${ids.length} item${ids.length > 1 ? "s" : ""}`,
      );
      setShiprocketModalOpen(false);
      setShiprocketModalItemIds([]);
      await fetchSingleOrder(oid);
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to create Shiprocket order");
    } finally {
      setCreateShiprocketLoading(false);
    }
  };

  const openDelhiveryItemModal = () => {
    const eligible = getDelhiveryEligibleItems(selectedOrder);
    if (!eligible.length) {
      toast.error(
        "No eligible items. Only NORMAL delivery lines without Delhivery can be selected.",
      );
      return;
    }
    setDelhiveryModalItemIds(
      eligible.map((it) => String(it.itemId || it._id)),
    );
    setDelhiveryModalOpen(true);
  };

  const closeDelhiveryItemModal = () => {
    if (createDelhiveryLoading) return;
    setDelhiveryModalOpen(false);
    setDelhiveryModalItemIds([]);
  };

  const toggleDelhiveryModalItem = (itemId) => {
    const id = String(itemId);
    setDelhiveryModalItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmitDelhiveryModal = async () => {
    const oid = selectedOrder?.orderId;
    if (!oid) return;
    const ids = delhiveryModalItemIds.map(String).filter(Boolean);
    if (!ids.length) {
      toast.error("Select at least one item");
      return;
    }
    const selected = (selectedOrder?.items || []).filter((it) =>
      ids.includes(String(it.itemId || it._id)),
    );
    const groups = [
      ...new Set(selected.map((it) => String(it.shipmentGroupId || "")).filter(Boolean)),
    ];
    if (groups.length !== 1) {
      toast.error("Selected items must be in the same shipment group");
      return;
    }

    setCreateDelhiveryLoading(true);
    try {
      await createDelhiveryForOrderShipments(oid, { itemIds: ids });
      toast.success(
        `Delhivery shipment created for ${ids.length} item${ids.length > 1 ? "s" : ""}`,
      );
      setDelhiveryModalOpen(false);
      setDelhiveryModalItemIds([]);
      await fetchSingleOrder(oid);
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to create Delhivery shipment");
    } finally {
      setCreateDelhiveryLoading(false);
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
        if (isDebugOrders()) logger.warn("Orders", "listDeliveryAgents failed:", e);
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

  const showShippingFallbackModalIfNeeded = (apiRes, extras = {}) => {
    const entries = extractShippingFallbackEntries(apiRes, {
      orderId: selectedOrder?.orderId ?? extras.orderId,
      deliveryPincode: selectedOrder?.address?.pincode ?? extras.deliveryPincode,
      ...extras,
    });
    if (entries.length) {
      setShippingFallbackModal(entries);
    }
    return entries;
  };

  const showManifestFailuresIfNeeded = (apiRes, extras = {}) => {
    const failures = extractManifestFailures(apiRes, extras);
    for (const row of failures) {
      toast.error(
        `Carrier manifest failed${row.sku ? ` (${row.sku})` : ""}: ${row.error || "Unknown error"}. Item reverted to CONFIRMED.`,
      );
    }
    return failures;
  };

  const runWholeOrderStatusUpdate = async (
    newStatus,
    shippingProvider = null,
    selfShippingMode = null,
    externalSelfShipping = null,
  ) => {
    if (!selectedOrder?.orderId || !newStatus) return;
    setUpdatingWholeOrder(true);
    setOrderError(null);
    try {
      if (newStatus === "EXCHANGE_APPROVED") {
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
      if (newStatus === "RETURN_APPROVED") {
        const targetItems = selectedOrder?.items ?? [];
        for (const item of targetItems) {
          const returnId = getLatestReturnId(item);
          if (!returnId) continue;
          dbgOrders("approveReturn:wholeOrder", {
            orderId: selectedOrder?.orderId,
            itemId: item?.itemId || item?._id,
            returnId,
          });
          await approveReturn(returnId);
        }
        toast.success("Return(s) approved.");
        setWholeOrderNewStatus("");
        await fetchSingleOrder(selectedOrder.orderId);
        setUpdatingWholeOrder(false);
        return;
      }
      const body = { status: newStatus };
      if (newStatus === "PROCESSING" && shippingProvider) {
        body.shippingProvider = shippingProvider;
        if (shippingProvider === "SELF_SHIPPING") {
          body.selfShippingMode = selfShippingMode || "INTERNAL";
          if (selfShippingMode === "EXTERNAL" && externalSelfShipping) {
            appendExternalSelfShippingToPayload(body, externalSelfShipping);
          }
        }
      }
      const res = await updateWholeOrderStatus(selectedOrder.orderId, body);
      showShippingFallbackModalIfNeeded(res);
      const manifestFailures = showManifestFailuresIfNeeded(res);
      if (!manifestFailures.length) {
        toast.success(`Order items updated to ${newStatus}.`);
      }
      setWholeOrderNewStatus("");
      await fetchSingleOrder(selectedOrder.orderId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update whole order status.";
      setOrderError(msg);
      showBackendErrorsAsToasts(err, `Failed to set order status to ${newStatus}.`);
      throw err;
    } finally {
      setUpdatingWholeOrder(false);
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

    if (orderHasItemsNeedingShippingProvider(selectedOrder, wholeOrderNewStatus)) {
      const firstNeedingProvider = (selectedOrder?.items || []).find((item) =>
        itemNeedsShippingProviderOnProcessing(item, wholeOrderNewStatus, selectedOrder),
      );
      setSelectedShippingProvider(defaultShippingProviderForItem(firstNeedingProvider));
      openShippingProviderModal({ kind: "whole", newStatus: wholeOrderNewStatus });
      return;
    }

    if (
      !window.confirm(
        `Set all items in this order to "${label}"? (Terminal items like CANCELLED will be skipped.)`,
      )
    ) {
      return;
    }
    await runWholeOrderStatusUpdate(wholeOrderNewStatus);
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

  const runBulkStatusUpdate = async (
    bulkStatusValue,
    shippingProvider = null,
    selfShippingMode = null,
    externalSelfShipping = null,
  ) => {
    if (!selectedOrder?.orderId || selectedItemIds.length === 0 || !bulkStatusValue) {
      return;
    }
    setUpdatingBulk(true);
    setOrderError(null);
    const bulkFallbackEntries = [];
    try {
      for (const itemId of selectedItemIds) {
        const currentItem = selectedOrder?.items?.find(
          (it) => String(it.itemId || it._id) === String(itemId),
        );
        if (bulkStatusValue === "EXCHANGE_APPROVED") {
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
        if (bulkStatusValue === "RETURN_APPROVED") {
          const returnId = getLatestReturnId(currentItem);
          if (returnId) {
            dbgOrders("approveReturn:bulk", {
              orderId: selectedOrder?.orderId,
              itemId,
              returnId,
            });
            await approveReturn(returnId);
            continue;
          }
        }
        const res = await updateOrderItemStatus(
          selectedOrder.orderId,
          itemId,
          buildStatusPayload(
            bulkStatusValue,
            currentItem,
            shippingProvider,
            selfShippingMode,
            externalSelfShipping,
          ),
        );
        bulkFallbackEntries.push(
          ...extractShippingFallbackEntries(res, {
            orderId: selectedOrder.orderId,
            itemId: String(itemId),
            sku: currentItem?.sku,
            deliveryPincode: selectedOrder?.address?.pincode,
          }),
        );
        showManifestFailuresIfNeeded(res, {
          orderId: selectedOrder.orderId,
          itemId: String(itemId),
          sku: currentItem?.sku,
        });
      }
      if (bulkFallbackEntries.length) {
        setShippingFallbackModal(bulkFallbackEntries);
      }
      toast.success(
        `${selectedItemIds.length} item(s) updated to ${bulkStatusValue}.`,
      );
      if (EXCHANGE_STATUSES_REQUIRE_DRIVER.includes(bulkStatusValue)) {
        if (
          window.confirm(
            `Assign a driver for these ${selectedItemIds.length} item(s)?`,
          )
        ) {
          openAssignmentModal(
            selectedOrder.orderId,
            [...selectedItemIds],
            bulkStatusValue,
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
        `Failed to set selected items to ${bulkStatusValue}.`,
      );
      throw err;
    } finally {
      setUpdatingBulk(false);
    }
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

    const bulkNeedsProvider = selectedItemIds.some((id) => {
      const item = selectedOrder?.items?.find(
        (it) => String(it.itemId || it._id) === String(id),
      );
      return itemNeedsShippingProviderOnProcessing(item, bulkStatus, selectedOrder);
    });
    if (bulkNeedsProvider) {
      const firstNeedingProvider = selectedItemIds
        .map((id) =>
          selectedOrder?.items?.find(
            (it) => String(it.itemId || it._id) === String(id),
          ),
        )
        .find((item) =>
          itemNeedsShippingProviderOnProcessing(item, bulkStatus, selectedOrder),
        );
      setSelectedShippingProvider(defaultShippingProviderForItem(firstNeedingProvider));
      openShippingProviderModal({ kind: "bulk", newStatus: bulkStatus });
      return;
    }

    if (
      !window.confirm(
        `Set ${selectedItemIds.length} selected item(s) to "${label}"?`,
      )
    ) {
      return;
    }
    await runBulkStatusUpdate(bulkStatus);
  };

  const executePendingStatusUpdate = async () => {
    const pending = pendingStatusUpdate;
    if (!pending) return;

    const externalDetails =
      selectedShippingProvider === "SELF_SHIPPING" && selectedSelfShippingMode === "EXTERNAL"
        ? externalSelfShipForm
        : null;
    if (externalDetails) {
      const validationError = validateExternalSelfShipForm(externalDetails, { requireAll: true });
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    setShippingProviderSubmitting(true);
    try {
      if (pending.kind === "single") {
        await handleUpdateItemStatus(
          pending.orderId,
          pending.itemId,
          pending.newStatus,
          {
            shippingProvider: selectedShippingProvider,
            selfShippingMode:
              selectedShippingProvider === "SELF_SHIPPING" ? selectedSelfShippingMode : null,
            externalSelfShipping: externalDetails,
            skipProviderPrompt: true,
          },
        );
      } else if (pending.kind === "bulk") {
        await runBulkStatusUpdate(
          pending.newStatus,
          selectedShippingProvider,
          selectedShippingProvider === "SELF_SHIPPING" ? selectedSelfShippingMode : null,
          externalDetails,
        );
      } else if (pending.kind === "whole") {
        await runWholeOrderStatusUpdate(
          pending.newStatus,
          selectedShippingProvider,
          selectedShippingProvider === "SELF_SHIPPING" ? selectedSelfShippingMode : null,
          externalDetails,
        );
      } else if (pending.kind === "listOrders") {
        const ids = pending.orderIds || [];
        setListBulkProcessing(true);
        try {
          const results = await Promise.allSettled(
            ids.map((orderId) => {
              const body = {
                status: "PROCESSING",
                shippingProvider: selectedShippingProvider,
              };
              if (selectedShippingProvider === "SELF_SHIPPING") {
                body.selfShippingMode = selectedSelfShippingMode || "INTERNAL";
                if (selectedSelfShippingMode === "EXTERNAL" && externalDetails) {
                  appendExternalSelfShippingToPayload(body, externalDetails);
                }
              }
              return updateWholeOrderStatus(orderId, body);
            }),
          );
          const failed = results.filter((r) => r.status === "rejected");
          const listFallbackEntries = results
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => extractShippingFallbackEntries(r.value, { orderId: null }));
          if (listFallbackEntries.length) {
            setShippingFallbackModal(listFallbackEntries);
          }
          if (failed.length) {
            toast.error(`${failed.length}/${ids.length} failed to update.`);
          } else {
            toast.success(`Updated ${ids.length} order(s) to PROCESSING.`);
          }
          fetchOrders();
        } finally {
          setListBulkProcessing(false);
        }
      } else if (pending.kind === "listItems") {
        const targets = pending.targets || [];
        setListBulkProcessing(true);
        try {
          const results = await Promise.allSettled(
            targets.map((t) => {
              const body = {
                status: "PROCESSING",
                shippingProvider: selectedShippingProvider,
              };
              if (selectedShippingProvider === "SELF_SHIPPING") {
                body.selfShippingMode = selectedSelfShippingMode || "INTERNAL";
                if (selectedSelfShippingMode === "EXTERNAL" && externalDetails) {
                  appendExternalSelfShippingToPayload(body, externalDetails);
                }
              }
              return updateOrderItemStatus(t.orderId, t.itemId, body);
            }),
          );
          const failed = results.filter((r) => r.status === "rejected");
          const listItemFallbackEntries = results
            .filter((r) => r.status === "fulfilled")
            .flatMap((r, idx) =>
              extractShippingFallbackEntries(r.value, {
                orderId: targets[idx]?.orderId,
                itemId: targets[idx]?.itemId,
              }),
            );
          if (listItemFallbackEntries.length) {
            setShippingFallbackModal(listItemFallbackEntries);
          }
          if (failed.length) {
            toast.error(`${failed.length}/${targets.length} failed to update.`);
          } else {
            toast.success(`Updated ${targets.length} item(s) to PROCESSING.`);
          }
          fetchOrderItems();
        } finally {
          setListBulkProcessing(false);
        }
      }
      setShippingProviderModalOpen(false);
      setPendingStatusUpdate(null);
    } catch (err) {
      showBackendErrorsAsToasts(err, "Failed to update status with carrier");
    } finally {
      setShippingProviderSubmitting(false);
    }
  };

  const handleUpdateItemStatus = async (orderId, itemId, newStatus, options = {}) => {
    if (!orderId || !itemId || !newStatus) return;
    const stringItemId = String(itemId);
    const {
      shippingProvider = null,
      selfShippingMode = null,
      skipProviderPrompt = false,
      externalSelfShipping = null,
    } = options;

    // Exchange rejected: open modal to collect rejection note (required by backend)
    if (newStatus === "EXCHANGE_REJECTED") {
      setPendingRejection({ orderId, itemId: stringItemId });
      setRejectionNote("");
      setRejectionError(null);
      setRejectionModalOpen(true);
      return;
    }

    const prevItem = selectedOrder?.items?.find(
      (it) => String(it.itemId || it._id) === stringItemId,
    );

    if (
      !skipProviderPrompt &&
      itemNeedsShippingProviderOnProcessing(prevItem, newStatus, selectedOrder)
    ) {
      setSelectedShippingProvider(defaultShippingProviderForItem(prevItem));
      openShippingProviderModal({
        kind: "single",
        orderId,
        itemId: stringItemId,
        newStatus,
      });
      return;
    }

    if (
      !skipProviderPrompt &&
      !externalSelfShipping &&
      needsExternalSelfShippingDetails(prevItem, newStatus)
    ) {
      openExternalSelfShippingModalForItem(orderId, stringItemId, prevItem, {
        newStatus,
        detailsOnly: false,
      });
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
    } else if (!skipProviderPrompt) {
      const label =
        statusOptions.find((o) => o.value === newStatus)?.label || newStatus;
      if (!window.confirm(`Update to "${label}"?`)) return;
    }
    setUpdatingItemId(stringItemId);
    const prevStatus = prevItem?.status;
    setSelectedOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => {
          if (String(it.itemId || it._id) !== stringItemId) return it;
          let patched = {
            ...it,
            status: newStatus,
            ...(shippingProvider && newStatus === "PROCESSING"
              ? { shippingProvider }
              : {}),
          };
          if (String(newStatus).toUpperCase() === "CONFIRMED") {
            patched = stripItemCarrierManifestFields(patched);
          }
          return patched;
        }),
      };
    });
    try {
      if (newStatus === "EXCHANGE_APPROVED") {
        const exchangeId = getLatestExchangeId(prevItem);
        if (!exchangeId) {
          throw new Error("No exchange request found for this item.");
        }
        dbgOrders("approveExchange:single", { orderId, itemId, exchangeId });
        await approveExchange(exchangeId);
      }
      if (newStatus === "RETURN_APPROVED") {
        const returnId = getLatestReturnId(prevItem);
        if (returnId) {
          dbgOrders("approveReturn:single", { orderId, itemId, returnId });
          await approveReturn(returnId);
          toast.success(`Return approved for item ${stringItemId}.`);
          await fetchSingleOrder(orderId);
          setUpdatingItemId(null);
          return;
        }
      }
      const payload = buildStatusPayload(
        newStatus,
        prevItem,
        shippingProvider,
        selfShippingMode,
        externalSelfShipping,
      );
      if (externalSelfShipping && !payload.selfShippingMode) {
        appendExternalSelfShippingToPayload(payload, externalSelfShipping);
      }
      const res = await updateOrderItemStatus(orderId, itemId, payload);
      showShippingFallbackModalIfNeeded(res, {
        orderId,
        itemId: stringItemId,
        sku: prevItem?.sku,
      });
      const manifestFailures = showManifestFailuresIfNeeded(res, {
        orderId,
        itemId: stringItemId,
        sku: prevItem?.sku,
      });
      if (!manifestFailures.length) {
        toast.success(`Item ${stringItemId} updated to ${newStatus}.`);
      }
      await fetchSingleOrder(orderId);
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
        bg: "bg-brand-100",
        text: "text-brand-800",
        Icon: RefreshCw,
      },
      "PICKUP GENERATED": {
        bg: "bg-sky-100",
        text: "text-sky-800",
        Icon: Truck,
      },
      "PICKUP EXCEPTION": {
        bg: "bg-orange-100",
        text: "text-orange-800",
        Icon: AlertTriangle,
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
      "EXCHANGE PICKUP EXCEPTION": {
        bg: "bg-orange-100",
        text: "text-orange-800",
        Icon: AlertTriangle,
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

  /** Milestone badge + optional carrier scan subtitle (v2 status model). */
  const renderItemStatusBreakdown = (item, { tableRow = false, order = null } = {}) => {
    const resolvedOrder = order || selectedOrder;
    const display = getLineStatusDisplay(item);
    const milestone =
      resolveAdminLineStatus(item, resolvedOrder) ||
      getLineMilestoneForBadge(item) ||
      display?.milestone ||
      "";
    const titleParts = [display?.milestoneLabel || formatStatusTokenForUi(milestone)];
    if (display?.activeFlow && display.activeFlow !== "FORWARD") {
      titleParts.push(`Flow: ${display.activeFlow}`);
    }
    if (display?.providerLabel) titleParts.push(display.providerLabel);
    if (display?.reverseAwb && display.activeFlow !== "FORWARD") {
      titleParts.push(`RVP ${display.reverseAwb}`);
    } else if (display?.awb) {
      titleParts.push(`AWB ${display.awb}`);
    }
    if (display?.forwardAwb && display.activeFlow !== "FORWARD") {
      titleParts.push(`Fwd ${display.forwardAwb}`);
    }
    if (display?.lastScanLabel) {
      titleParts.push(
        display.scanKind === "EXCEPTION" || display.scanKind === "TERMINAL"
          ? `⚠ ${display.lastScanLabel}`
          : display.lastScanLabel,
      );
    }
    if (display?.selfShippingCarrier) {
      titleParts.push(display.selfShippingCarrier);
    }

    const scanSubtitle =
      display?.lastScanLabel &&
      display.lastScanLabel !== display?.milestoneLabel &&
      display.scanKind !== "MILESTONE"
        ? display.lastScanLabel
        : null;
    const showScanWarning = isExceptionScan(item);

    return (
      <div
        className={`min-w-0 ${tableRow ? "max-w-[9.5rem]" : "max-w-[12rem]"}`}
        title={titleParts.join(" · ")}
      >
        {getStatusBadge(milestone)}
        {item?.shippingManifestError || getLineStatusDisplay(item)?.manifestError ? (
          <p
            className="mt-0.5 truncate text-[9px] leading-tight text-red-600"
            title={item.shippingManifestError || getLineStatusDisplay(item)?.manifestError}
          >
            Manifest: {item.shippingManifestError || getLineStatusDisplay(item)?.manifestError}
          </p>
        ) : null}
        {display?.reverseAwb && display.activeFlow !== "FORWARD" ? (
          <p
            className="mt-0.5 truncate text-[9px] leading-tight text-stone-600"
            title={display.reverseAwb}
          >
            RVP {display.reverseAwb}
          </p>
        ) : null}
        {scanSubtitle ? (
          <p
            className={`mt-0.5 truncate text-[9px] leading-tight ${
              showScanWarning ? "text-orange-600" : "text-stone-500"
            }`}
            title={scanSubtitle}
          >
            {showScanWarning ? "⚠ " : ""}
            {scanSubtitle}
          </p>
        ) : display?.providerLabel && display.provider !== "SELF_SHIPPING" ? (
          <p className="mt-0.5 truncate text-[9px] leading-tight text-stone-500">
            {display.providerLabel}
          </p>
        ) : display?.selfShippingCarrier ? (
          <p className="mt-0.5 truncate text-[9px] leading-tight text-stone-500">
            {display.selfShippingCarrier}
          </p>
        ) : null}
        <LineReasonSummary item={item} compact={tableRow} />
        {resolvedOrder && isPrepaidPaymentFailed(resolvedOrder) ? (
          <p
            className="mt-0.5 truncate text-[9px] font-semibold leading-tight text-red-700"
            title="Prepaid payment failed — line should be cancelled"
          >
            Payment failed
          </p>
        ) : null}
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
    { value: "EXCHANGE_PICKUP_EXCEPTION", label: "Exchange pickup exception" },
    { value: "EXCHANGE_OUT_FOR_PICKUP", label: "Exchange out for pickup" },
    { value: "EXCHANGE_PICKED", label: "Exchange picked" },
    { value: "EXCHANGE_RETURN_IN_TRANSIT", label: "Exchange return in transit" },
    { value: "EXCHANGE_RECEIVED", label: "Exchange received" },
    { value: "EXCHANGE_PROCESSING", label: "Exchange processing" },
    { value: "EXCHANGE_SHIPPED", label: "Exchange shipped" },
    { value: "EXCHANGE_OUT_FOR_DELIVERY", label: "Exchange out for delivery" },
    { value: "EXCHANGE_DELIVERED", label: "Exchange delivered" },
    { value: "EXCHANGE_COMPLETED", label: "Exchange completed" },
    { value: "RETURN_REQUESTED", label: "Return requested" },
    { value: "RETURN_APPROVED", label: "Return approved" },
    { value: "RETURN_PICKUP_SCHEDULED", label: "Return pickup scheduled" },
    { value: "RETURNED", label: "Returned" },
    { value: "REFUNDED", label: "Refunded" },
  ];

  const analyticsSection = useMemo(
    () => getAdminAnalyticsSection({ exchangeOnly, returnOnly }),
    [exchangeOnly, returnOnly],
  );

  const isOrderAnalyticsView = viewMode === VIEW_ORDER;

  const analyticsViewReady = useMemo(
    () => isSidebarCountsViewReady(sidebarCounts, { viewMode }),
    [sidebarCounts, viewMode],
  );

  const statusChangeOptions = useMemo(() => {
    if (exchangeOnly) {
      return statusOptions.filter((opt) => isExchangeStatus(opt.value));
    }
    if (returnOnly) {
      return statusOptions.filter((opt) => isReturnStatus(opt.value));
    }
    return statusOptions.filter(
      (opt) => !isExchangeStatus(opt.value) && !isReturnStatus(opt.value),
    );
  }, [exchangeOnly, returnOnly]);

  const filteredStatusOptions = useMemo(() => {
    const fromBackend = getStatusOptionsForSection(sidebarCounts, analyticsSection);
    if (fromBackend.length) {
      return fromBackend.map((opt) => ({
        value: opt.value,
        label: opt.label || formatStatusTokenForUi(opt.value),
      }));
    }
    return statusChangeOptions;
  }, [sidebarCounts, analyticsSection, statusChangeOptions]);

  const analyticsStatusCards = useMemo(() => {
    if (!analyticsViewReady) return [];
    return buildAdminAnalyticsCards(analyticsSection, sidebarCounts, {
      isOrderView: isOrderAnalyticsView,
    });
  }, [sidebarCounts, analyticsSection, isOrderAnalyticsView, analyticsViewReady]);

  const analyticsTotal = useMemo(() => {
    if (!analyticsViewReady) return 0;
    const section = sidebarCounts?.[analyticsSection];
    if (!section) return 0;
    return sectionTotalFromPayload(section, { isOrderView: isOrderAnalyticsView });
  }, [sidebarCounts, analyticsSection, isOrderAnalyticsView, analyticsViewReady]);

  const analyticsProviderCards = useMemo(() => {
    if (!analyticsViewReady) return [];
    return buildAdminProviderAnalyticsCards(sidebarCounts);
  }, [sidebarCounts, analyticsViewReady]);

  const staleAnalytics = useMemo(() => {
    if (!analyticsViewReady) return null;
    return getStaleAnalyticsFromPayload(sidebarCounts);
  }, [sidebarCounts, analyticsViewReady]);

  const showOpsCarrierCards = !exchangeOnly && !returnOnly;

  const activeAnalyticsStatus = normalizeStatusToken(
    viewMode === VIEW_ORDER ? statusFilter : itemStatusFilter,
  );

  const activeAnalyticsProvider = String(shippingProviderFilter || "").toUpperCase();

  const applyAnalyticsStatus = (status) => {
    setShippingProviderFilter("");
    const next = status || "";
    if (viewMode === VIEW_ORDER) {
      setStatusFilter(next);
      setPagination((p) => ({ ...p, page: 1 }));
    } else {
      setItemStatusFilter(next);
      setItemPagination((p) => ({ ...p, page: 1 }));
    }
  };

  const applyAnalyticsProvider = (provider) => {
    const next = String(provider || "").toUpperCase();
    setShippingProviderFilter(next);
    setStatusFilter("");
    setItemStatusFilter("");
    setViewMode(VIEW_ITEM);
    setItemPagination((p) => ({ ...p, page: 1 }));
  };

  const applyAnalyticsClearAll = () => {
    setShippingProviderFilter("");
    applyAnalyticsStatus("");
  };

  const applyAnalyticsStale = () => {
    navigate(ap("orders/stale"));
  };

  const listBulkSelectedCount =
    viewMode === VIEW_ORDER ? listSelectedOrderIds.length : listSelectedItemKeys.length;

  const hasActiveListFilters = useMemo(
    () =>
      Boolean(
        deliveryTypeFilter ||
          paymentFilter ||
          dateFrom ||
          dateTo ||
          cityFilter ||
          statusFilter ||
          lineConsistencyFilter ||
          itemStatusFilter ||
          shippingProviderFilter ||
          sortOrder !== "desc",
      ),
    [
      deliveryTypeFilter,
      paymentFilter,
      dateFrom,
      dateTo,
      cityFilter,
      statusFilter,
      lineConsistencyFilter,
      itemStatusFilter,
      shippingProviderFilter,
      sortOrder,
    ],
  );

  const replacementOrderIds = useMemo(() => {
    const ids = new Set();
    for (const order of orders) {
      for (const item of order?.items || []) {
        const rid = item?.exchangeReplacementOrderId;
        if (rid) ids.add(String(rid).trim());
      }
    }
    for (const row of orderItems) {
      const rid = row?.item?.exchangeReplacementOrderId;
      if (rid) ids.add(String(rid).trim());
    }
    return ids;
  }, [orders, orderItems]);

  const ListLineStack = (props) => (
    <OrderListLineStack {...lineStackFilterProps} {...props} />
  );

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
      case "image":
        return (
          <ListLineStack
            order={order}
            className="flex flex-col items-center gap-2 divide-y divide-gray-100"
          >
            {(item) => (
              <TableItemImageThumb itemLike={item} onPickImage={setZoomImageUrl} />
            )}
          </ListLineStack>
        );
      case "orderId":
        return (
          <div className="min-w-0 space-y-1">
            <span
              className="block truncate text-xs font-medium text-brand-700"
              title={order.orderId || order._id}
            >
              {order.orderId || order._id?.slice(-8).toUpperCase() || "—"}
            </span>
            {isExchangeReplacementOrderDoc(order, replacementOrderIds) ? (
              <>
                <ExchangeReplacementOrderBadge compact />
                {order.exchangeMeta?.originalOrderId ? (
                  <button
                    type="button"
                    onClick={() => openOrderById(order.exchangeMeta.originalOrderId)}
                    className="block truncate text-left text-[10px] font-semibold text-brand-700 hover:underline"
                    title={`Open original order ${order.exchangeMeta.originalOrderId}`}
                  >
                    Original #{order.exchangeMeta.originalOrderId}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
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
      case "notes": {
        const latestText =
          (order?.latestOrderNote?.text != null
            ? String(order.latestOrderNote.text)
            : "") ||
          // Fallback: order detail view includes full `orderNotes`
          (Array.isArray(order.orderNotes) && order.orderNotes.length
            ? String(order.orderNotes[order.orderNotes.length - 1]?.text || "")
            : "");
        return (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => openOrderNotesModal(order.orderId)}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-700 hover:bg-gray-50"
              title="View all notes"
            >
              <StickyNote size={14} />
            </button>
            <span
              className="block min-w-0 truncate text-xs text-gray-600"
              title={latestText || "No notes"}
            >
              {latestText || "—"}
            </span>
          </div>
        );
      }
      case "qty": {
        const items = orderLineItems(order, lineStackFilterProps);
        if (items.length <= 1) {
          return (
            <span className="tabular-nums">
              {(items[0]?.quantity ??
                order.totalItems ??
                order.totalQuantity ??
                items.length) || "?"}
            </span>
          );
        }
        return (
          <ListLineStack
            order={order}
            className="flex flex-col items-center gap-1.5 divide-y divide-gray-100"
          >
            {(item) => (
              <span className="tabular-nums text-xs text-gray-700">
                {item.quantity ?? "—"}
              </span>
            )}
          </ListLineStack>
        );
      }
      case "total":
        if (isExchangeReplacementOrderDoc(order, replacementOrderIds)) {
          return (
            <div className="flex flex-col gap-0.5">
              <ExchangeReplacementOrderBadge compact />
              <span className="text-[10px] font-medium uppercase text-stone-500">
                No charge
              </span>
            </div>
          );
        }
        return formatInr(
          order.totalAmount ??
            order.pricing?.finalPayableBeforeWallet ??
            order.pricing?.finalPayable ??
            0,
        );
      case "walletUsed": {
        const walletUsed = getOrderWalletUsedAmount(order);
        return walletUsed > 0 ? formatInr(walletUsed) : "—";
      }
      case "status": {
        const items = orderLineItems(order, lineStackFilterProps);
        const orderLevelStatus = order?.status || order?.orderStatus || "";
        if (lineConsistencyFilter === "mixed" && isOrderMixedLines(order, statusFilter)) {
          const summary = getOrderLineStatusSummary(order);
          return (
            <div className="min-w-0 space-y-0.5" title={summary || "Mixed line statuses"}>
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                Mixed
              </span>
              {summary ? (
                <p className="truncate text-[10px] leading-tight text-stone-500">{summary}</p>
              ) : null}
            </div>
          );
        }
        if (items.length > 1) {
          return (
            <ListLineStack order={order} className="flex flex-col gap-2 divide-y divide-gray-100">
              {(item) => renderItemStatusBreakdown(item, { tableRow: true })}
            </ListLineStack>
          );
        }
        const singleLine = items[0];
        return (
          <div className="min-w-0" title="Order status">
            {singleLine
              ? renderItemStatusBreakdown(singleLine, { tableRow: true })
              : getStatusBadge(
                  normalizeItemStatusToken(orderLevelStatus) || orderLevelStatus,
                )}
          </div>
        );
      }
      case "courier": {
        const items = orderLineItems(order, lineStackFilterProps);
        const docButtons = hasNormalDeliveryInOrder(order) ? (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-gray-100 pt-1">
            <DocLabelButton
              className="w-full"
              loading={docDownloadLoading}
              loadingType={docActionType}
              disabled={docDownloadLoading}
              downloaded={isOrderLabelDownloaded(order)}
              onClick={() => handleLabelForOrder(order)}
              showText={items.length <= 1}
            />
            <DocManifestButton
              className="w-full"
              loading={docDownloadLoading}
              loadingType={docActionType}
              disabled={docDownloadLoading}
              onClick={() => handleManifestForOrder(order)}
              showText={items.length <= 1}
            />
          </div>
        ) : null;
        if (items.length <= 1) {
          const prev = getOrderCarrierPreview(order);
          if (!prev) {
            return (
              <div className="space-y-1">
                <span className="text-xs text-gray-400">—</span>
                {docButtons}
              </div>
            );
          }
          return (
            <div className="space-y-0.5">
              <CarrierTrackingDetails tracking={prev.primary} compact />
              {docButtons}
            </div>
          );
        }
        return (
          <div className="min-w-0 space-y-1">
            <ListLineStack order={order} className="flex flex-col gap-2 divide-y divide-gray-100">
              {(item) => {
                const tracking = getLineCarrierTracking(item);
                if (!tracking) return <span className="text-xs text-gray-400">—</span>;
                return <CarrierTrackingDetails tracking={tracking} compact />;
              }}
            </ListLineStack>
            {docButtons}
          </div>
        );
      }
      case "date":
        return formatManufacturingModalDate(order.createdAt);
      case "orderDateTime":
        return formatManufacturingModalDate(order.createdAt);
      case "email":
        return order.user?.email || order.userId?.email || "—";
      case "productName":
        return (
          <ListLineStack order={order}>
            {(item) => {
              const label = getLineProductDisplayName(item);
              const swap = exchangeOnly ? formatExchangeSwapSummary(item) : "";
              return (
                <div className="min-w-0 max-w-[220px]">
                  <span
                    className="block truncate text-xs font-medium leading-snug text-gray-900"
                    title={label}
                  >
                    {label || "—"}
                  </span>
                  {swap ? (
                    <span
                      className="block truncate text-[10px] leading-tight text-stone-500"
                      title={swap}
                    >
                      {swap}
                    </span>
                  ) : null}
                  <OrderLineBindOfferNote bindOffer={item?.bindOffer} />
                </div>
              );
            }}
          </ListLineStack>
        );
      case "productId":
        return (
          <ListLineStack order={order}>
            {(item) => (
              <span className="block text-xs text-gray-700">{item.productId || "—"}</span>
            )}
          </ListLineStack>
        );
      case "lineSku":
        return (
          <ListLineStack order={order}>
            {(item) => {
              const exchangeId = exchangeOnly ? getLatestExchangeId(item) : null;
              return (
                <div className="min-w-0">
                  <span
                    className="block truncate font-mono text-[10px] text-gray-800"
                    title={item.sku || item.variant?.sku}
                  >
                    {item.sku || "—"}
                  </span>
                  {exchangeId ? (
                    <span
                      className="block truncate font-mono text-[10px] text-stone-400"
                      title={`Exchange #${exchangeId}`}
                    >
                      #{exchangeId}
                    </span>
                  ) : null}
                </div>
              );
            }}
          </ListLineStack>
        );
      case "variantSku":
        return (
          <ListLineStack order={order}>
            {(item) => (
              <span
                className="block truncate font-mono text-[10px] text-gray-800"
                title={item.variant?.sku}
              >
                {item.variant?.sku || "—"}
              </span>
            )}
          </ListLineStack>
        );
      case "size":
        return (
          <ListLineStack
            order={order}
            className="flex flex-col items-center gap-1.5 divide-y divide-gray-100"
          >
            {(item) => (
              <span className="text-xs text-gray-700">{item.variant?.size || "—"}</span>
            )}
          </ListLineStack>
        );
      case "color":
        return (
          <ListLineStack
            order={order}
            className="flex flex-col items-center gap-1.5 divide-y divide-gray-100"
          >
            {(item) => (
              <span className="text-xs text-gray-700">{item.variant?.color || "—"}</span>
            )}
          </ListLineStack>
        );
      case "pincode":
        return order.address?.pincode || "—";
      case "storeLink":
        return (
          <ListLineStack order={order}>
            {(item) => (
              <TableStoreLink itemId={item.itemId || item._id} itemLike={item} />
            )}
          </ListLineStack>
        );
      case "payment":
        return manufacturingPaymentLabel(order.payment);
      case "gatewayOrderId": {
        const id = order.payment?.gatewayOrderId || null;
        if (!id) return "—";
        return (
          <div className="flex items-center gap-2">
            <span className="block max-w-[180px] truncate font-mono text-[11px] text-gray-700" title={String(id)}>
              {String(id)}
            </span>
            <button
              type="button"
              onClick={() => copyTextToClipboard(id, "Gateway order ID copied")}
              className="inline-flex items-center justify-center rounded border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50"
              title="Copy gateway order ID"
            >
              <Copy size={14} />
            </button>
          </div>
        );
      }
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
          <div className="min-w-0 space-y-1">
            <span className="font-medium text-brand-600 truncate block" title={row.orderId}>
              {row.orderId || "—"}
            </span>
            {isExchangeReplacementOrderDoc(row, replacementOrderIds) ? (
              <>
                <ExchangeReplacementOrderBadge compact />
                {row.exchangeMeta?.originalOrderId ? (
                  <button
                    type="button"
                    onClick={() => openOrderById(row.exchangeMeta.originalOrderId)}
                    className="block truncate text-left text-[10px] font-semibold text-brand-700 hover:underline"
                    title={`Open original order ${row.exchangeMeta.originalOrderId}`}
                  >
                    Original #{row.exchangeMeta.originalOrderId}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        );
      case "customer":
        return row.user?.name || row.address?.name || "—";
      case "phone":
        return `${row.user?.countryCode || ""}${row.user?.phoneNumber || "—"}`;
      case "product": {
        const line = lineItemFromOrderItemRow(row) || item;
        const label = getLineProductDisplayName(line);
        return (
          <div className="max-w-[240px]">
            <span
              className="block truncate text-xs font-medium text-stone-900"
              title={label}
            >
              {label || "—"}
            </span>
            <OrderLineBindOfferNote bindOffer={line?.bindOffer} />
          </div>
        );
      }
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
      case "city":
        return row.address?.city || "—";
      case "storeLink":
        return <TableStoreLink itemId={itemId} itemLike={item} />;
      case "orderDateTime":
        return formatManufacturingModalDate(row.orderCreatedAt);
      case "qty":
        return row.item?.quantity ?? "—";
      case "status":
        return renderItemStatusBreakdown(
          lineItemFromOrderItemRow(row) || { status: row.itemStatus },
          {
            tableRow: true,
            order: {
              payment: row.payment,
              status: row.orderStatus,
            },
          },
        );
      case "delivery":
        return (
          DELIVERY_TYPE_TABS.find((t) => t.value === row.deliveryType)?.label ??
          String(row.deliveryType || "—").replace(/_/g, " ")
        );
      case "date":
        return formatManufacturingModalDate(row.orderCreatedAt);
      case "shiprocket": {
        const line = lineItemFromOrderItemRow(row);
        if (hasActiveExchangeStatus(line)) {
          const fwd = getExchangeForwardShiprocket(line);
          const retLeg = getLatestExchange(line)?.shiprocket?.returnOrder;
          if (!fwd && !retLeg) {
            return <span className="text-xs text-amber-700">SR pending</span>;
          }
          return (
            <div className="min-w-0 space-y-1">
              {retLeg?.awbCode || retLeg?.status ? (
                <div>
                  <span className="text-[9px] font-semibold uppercase text-stone-500">Return</span>
                  <ShiprocketDetails
                    sr={{
                      awb: retLeg.awbCode || retLeg.awb,
                      status: retLeg.status,
                      trackingUrl: retLeg.trackingUrl,
                      courier: retLeg.courierName,
                    }}
                    compact
                  />
                </div>
              ) : null}
              {fwd ? (
                <div>
                  <span className="text-[9px] font-semibold uppercase text-stone-500">Forward</span>
                  <ShiprocketDetails sr={fwd} compact />
                </div>
              ) : null}
            </div>
          );
        }
        if (String(row.deliveryType || "").toUpperCase() !== "NORMAL") return "—";
        const provider = getItemShippingProvider(line);
        if (provider === "SELF_SHIPPING") {
          const ref = line?.trackingId || "—";
          return (
            <div className="min-w-0 leading-tight">
              <span className="text-[9px] font-semibold uppercase text-violet-700">Self</span>
              <p className="truncate font-mono text-[9px] text-stone-700" title={ref}>
                {ref}
              </p>
            </div>
          );
        }
        if (provider === "DELHIVERY") {
          const dl = getNormalDeliveryDelhivery(line);
          return dl ? (
            <DelhiveryDetails dl={dl} compact />
          ) : (
            <span className="text-xs text-amber-700">DL pending</span>
          );
        }
        if (provider === "SHADOWFAX") {
          const sfx = getNormalDeliveryShadowfax(line);
          return sfx ? (
            <ShadowfaxDetails sfx={sfx} compact />
          ) : (
            <span className="text-xs text-amber-700">SFX pending</span>
          );
        }
        const sr = getLineShiprocket(line);
        return sr ? (
          <ShiprocketDetails sr={sr} compact />
        ) : (
          <span className="text-xs text-amber-700">SR pending</span>
        );
      }
      case "payment":
        return manufacturingPaymentLabel(row.payment);
      case "gatewayOrderId": {
        const id = row.payment?.gatewayOrderId || null;
        if (!id) return "—";
        return (
          <div className="flex items-center gap-2">
            <span className="block max-w-[180px] truncate font-mono text-[11px] text-gray-700" title={String(id)}>
              {String(id)}
            </span>
            <button
              type="button"
              onClick={() => copyTextToClipboard(id, "Gateway order ID copied")}
              className="inline-flex items-center justify-center rounded border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50"
              title="Copy gateway order ID"
            >
              <Copy size={14} />
            </button>
          </div>
        );
      }
      default:
        return "—";
    }
  };

  // +1 for trailing actions col, +1 for selection checkbox col
  const orderListColSpan = orderListActiveColumns.length + 2;
  const itemListColSpan = itemListActiveColumns.length + 2;

  const rowIndexBase = useMemo(
    () => (pagination.page - 1) * pagination.limit,
    [pagination.page, pagination.limit],
  );

  const orderListCellTdClass = (key) => {
    switch (key) {
      case "info":
      case "image":
        return "px-1 py-2 align-middle text-center";
      case "orderId":
        return `min-w-0 px-2 py-2 align-top font-medium text-brand-700`;
      case "qty":
        return "px-2 py-2 align-top text-center text-xs text-gray-600 tabular-nums";
      case "total":
      case "walletUsed":
        return "min-w-0 px-2 py-2 align-top text-xs font-medium text-gray-900 tabular-nums";
      case "date":
        return "min-w-0 px-2 py-2 align-top text-[11px] tabular-nums text-gray-500";
      case "courier":
        return "min-w-0 px-2 py-2 align-top";
      case "productName":
        return "min-w-0 px-2 py-2 align-top max-w-[220px]";
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
      case "productName":
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
        className="rounded-md px-1.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-800"
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
      itemId: row.itemId ?? row.productItemId ?? row.item?.itemId,
      shippingProvider: row.shippingProvider ?? row.item?.shippingProvider,
      trackingId: row.trackingId ?? row.item?.trackingId,
      delhivery: row.delhivery ?? row.item?.delhivery,
      delivery: { type: row.deliveryType || row.item?.delivery?.type },
      shipmentId: row.item?.shipmentId ?? row.shipmentId ?? null,
      shipmentGroupId: row.item?.shipmentGroupId ?? row.shipmentGroupId ?? null,
      shiprocket: {
        ...(row.item?.shiprocket || {}),
        shipmentId: row.item?.shiprocket?.shipmentId ?? row.item?.shipmentId ?? row.shipmentId ?? null,
      },
      labelDownloadedAt: row.item?.labelDownloadedAt ?? row.labelDownloadedAt ?? null,
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
          className="rounded-md px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50"
          title="View & update item status"
        >
          View details
        </button>
        {isNormal && (
          <>
            <DocLabelButton
              loading={docDownloadLoading}
              loadingType={docActionType}
              disabled={docDownloadLoading}
              downloaded={isItemLabelDownloaded(rowItem)}
              onClick={() => handleLabelForItem(rowItem, { orderId: row.orderId })}
            />
            <DocManifestButton
              loading={docDownloadLoading}
              loadingType={docActionType}
              disabled={
                docDownloadLoading ||
                getItemShippingProvider(rowItem) === "SELF_SHIPPING" ||
                getItemShippingProvider(rowItem) === "DELHIVERY" ||
                (() => {
                  const ids = getShipmentIdsForItem(rowItem);
                  return ids.length > 0 && ids.every((id) => downloadedManifestShipments.has(String(id)));
                })()
              }
              onClick={() => handleManifestForItem(rowItem)}
            />
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
        return (
          <TableItemImageThumb
            itemLike={item}
            onPickImage={setZoomImageUrl}
            sizeClass="h-10 w-10"
          />
        );
      case "productName": {
        const label = getLineProductDisplayName(item);
        return (
          <div className="min-w-0">
            <span
              className="block truncate text-[11px] font-medium leading-snug text-gray-900"
              title={label}
            >
              {label || "—"}
            </span>
            <OrderLineBindOfferNote bindOffer={item?.bindOffer} />
          </div>
        );
      }
      case "productId":
        return <span className="text-xs text-gray-700">{item.productId || "—"}</span>;
      case "itemId":
        return <span className="break-all text-[10px] text-gray-600">{itemId || "—"}</span>;
      case "lineSku":
        return (
          <div className="min-w-0 space-y-0.5">
            <div
              className="truncate font-mono text-[10px] font-medium text-gray-900"
              title={item.sku || v.sku}
            >
              {item.sku || v.sku || "—"}
            </div>
            {(() => {
              const exIds = getItemExchangeIds(item);
              const retId = getLatestReturnId(item);
              if (exIds.length === 0 && !retId) return null;
              return (
                <div className="space-y-0.5">
                  {exIds.length > 0 ? (
                    <p className="break-all text-[10px] text-gray-500">
                      Exchange ID{exIds.length > 1 ? "s" : ""}: {exIds.join(", ")}
                    </p>
                  ) : null}
                  {retId ? (
                    <p className="break-all text-[10px] text-amber-800" title={retId}>
                      Return ID: {retId}
                    </p>
                  ) : null}
                </div>
              );
            })()}
          </div>
        );
      case "variantSku":
        return (
          <span className="block truncate font-mono text-[10px] text-gray-800" title={v.sku}>
            {v.sku || "—"}
          </span>
        );
      case "size":
        return <span className="text-[11px] font-medium text-stone-800">{v.size || "—"}</span>;
      case "color":
        return <span className="text-[11px] font-medium text-stone-800">{v.color || "—"}</span>;
      case "qty":
        return <span className="tabular-nums text-xs">{item.quantity ?? "—"}</span>;
      case "price":
        return renderOrderLinePriceCell(item);
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

  const renderOrderDetailShipDocsCell = (item) => {
    const docBtn = `${ui.detailDocBtn}`;
    const brandBtn = `${docBtn} ${ui.detailDocBtnBrand}`;
    const mutedBtn = `${docBtn} ${ui.detailDocBtnMuted}`;
    const invoiceTitle =
      "Invoice is not generated for Created or Confirmed lines";

    const invoiceBtn = canDownloadInvoice(item) ? (
      <button
        type="button"
        disabled={docDownloadLoading}
        onClick={() => handleGetInvoiceClick(selectedOrder, item)}
        className={brandBtn}
        title="Download invoice"
      >
        <CreditCard size={10} className="shrink-0" aria-hidden />
        Inv
      </button>
    ) : (
      <span className="text-[9px] text-amber-700" title={invoiceTitle}>
        No inv
      </span>
    );

    const labelDownloaded = isItemLabelDownloaded(item);
    const labelBtn = (
      <button
        type="button"
        disabled={docDownloadLoading}
        onClick={() => handleLabelForItem(item)}
        className={labelDownloaded ? `${docBtn} ${ui.detailDocBtnMuted}` : brandBtn}
        title={labelDownloaded ? "Reprint shipping label" : "Download shipping label"}
      >
        {docDownloadLoading && docActionType === "label" ? (
          <RefreshCw size={10} className="shrink-0 animate-spin" aria-hidden />
        ) : (
          <Truck size={10} className="shrink-0" aria-hidden />
        )}
        {labelDownloaded ? "Reprint" : "Label"}
      </button>
    );

    const provider = getItemShippingProvider(item);
    const manifestDisabled = (() => {
      if (provider === "DELHIVERY" || provider === "SELF_SHIPPING") return true;
      const ids = getShipmentIdsForItem(item);
      return (
        ids.length > 0 &&
        ids.every((id) => downloadedManifestShipments.has(String(id)))
      );
    })();

    const manifestBtn = (
      <button
        type="button"
        disabled={docDownloadLoading || manifestDisabled}
        onClick={() => handleManifestForItem(item)}
        className={mutedBtn}
        title={
          manifestDisabled
            ? "Manifest already downloaded for this shipment"
            : "Download manifest"
        }
      >
        {docDownloadLoading && docActionType === "manifest" ? (
          <RefreshCw size={10} className="shrink-0 animate-spin" aria-hidden />
        ) : (
          <Package size={10} className="shrink-0" aria-hidden />
        )}
        Mnfst
      </button>
    );

    if (isSelfShippingLineOrUnmanifested(item)) {
      const ref = item?.trackingId || "—";
      return (
        <div className="min-w-[8.5rem] max-w-[11rem]">
          <div className="mb-0.5 min-w-0">
            <span className="text-[9px] font-semibold uppercase text-violet-700">
              Self Shipping
            </span>
            <p className="truncate font-mono text-[9px] text-stone-700" title={ref}>
              Ref: {ref}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            {invoiceBtn}
            {labelBtn}
          </div>
        </div>
      );
    }

    if (isDelhiveryLine(item)) {
      const dl = getNormalDeliveryDelhivery(item);
      return (
        <div className="min-w-[8.5rem] max-w-[11rem]">
          <div className="mb-0.5 min-w-0">
            {dl ? (
              <DelhiveryDetails dl={dl} compact />
            ) : (
              <span className="text-[9px] leading-tight text-amber-800">DL pending</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            {invoiceBtn}
            {labelBtn}
          </div>
        </div>
      );
    }

    if (isShadowfaxLine(item)) {
      const sfx = getNormalDeliveryShadowfax(item);
      return (
        <div className="min-w-[8.5rem] max-w-[11rem]">
          <div className="mb-0.5 min-w-0">
            {sfx ? (
              <ShadowfaxDetails sfx={sfx} compact />
            ) : (
              <span className="text-[9px] leading-tight text-amber-800">SFX pending</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            {invoiceBtn}
            {labelBtn}
          </div>
        </div>
      );
    }

    if (isNormalDeliveryLine(item)) {
      const sr = getLineShiprocket(item);
      return (
        <div className="min-w-[8.5rem] max-w-[11rem]">
          <div className="mb-0.5 min-w-0">
            {sr ? (
              <ShiprocketDetails sr={sr} compact />
            ) : (
              <span className="text-[9px] leading-tight text-amber-800">SR pending</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            {invoiceBtn}
            {labelBtn}
            {manifestBtn}
          </div>
        </div>
      );
    }

    return (
      <div className="min-w-[6rem] max-w-[9rem]">
        <div className="flex flex-wrap items-center gap-0.5">{invoiceBtn}</div>
      </div>
    );
  };

  const clearOrderSelection = () => {
    setSelectedOrder(null);
    setOrderError(null);
    setOrderAssignments(null);
    setSelectedItemIds([]);
    setBulkStatus("");
    setSelectedItemIdFromListView(null);
  };

  const orderDetailFromItemList = Boolean(
    selectedOrder && selectedItemIdFromListView,
  );

  const shiprocketEligibleItems = selectedOrder
    ? getShiprocketEligibleItems(selectedOrder)
    : [];
  const shiprocketModalSelectedItems = shiprocketEligibleItems.filter((it) =>
    shiprocketModalItemIds.includes(String(it.itemId || it._id)),
  );
  const shiprocketModalGroupIds = [
    ...new Set(
      shiprocketModalSelectedItems
        .map((it) => String(it.shipmentGroupId || ""))
        .filter(Boolean),
    ),
  ];
  const shiprocketModalCanSubmit =
    shiprocketModalSelectedItems.length > 0 && shiprocketModalGroupIds.length === 1;

  const delhiveryEligibleItems = selectedOrder
    ? getDelhiveryEligibleItems(selectedOrder)
    : [];
  const delhiveryModalSelectedItems = delhiveryEligibleItems.filter((it) =>
    delhiveryModalItemIds.includes(String(it.itemId || it._id)),
  );
  const delhiveryModalGroupIds = [
    ...new Set(
      delhiveryModalSelectedItems
        .map((it) => String(it.shipmentGroupId || ""))
        .filter(Boolean),
    ),
  ];
  const delhiveryModalCanSubmit =
    delhiveryModalSelectedItems.length > 0 && delhiveryModalGroupIds.length === 1;

  return (
    <div className={ui.pageWrap}>
      <div className={ui.outerWrap}>
        <div className={ui.contentWrap}>
          <div
            className={`${ui.toolbarCard} flex flex-nowrap items-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch]`}
          >
              {selectedOrder ? (
                <button
                  type="button"
                  onClick={clearOrderSelection}
                  className={`${ui.btnOutline} shrink-0 py-1 text-[11px] text-brand-700`}
                  title={
                    viewMode === VIEW_ITEM
                      ? "Back to order items list"
                      : "Back to orders list"
                  }
                >
                  ← Back
                </button>
              ) : null}
              {listPageTitle ? (
                <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
                  {listPageTitle}
                </h1>
              ) : null}
              <div
                className={`relative flex shrink items-center gap-1 ${
                  selectedOrder
                    ? "min-w-[88px] max-w-[200px]"
                    : "min-w-[100px] max-w-[220px] flex-1"
                }`}
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    placeholder={
                      searchExact
                        ? viewMode === VIEW_ORDER
                          ? "Exact order ID, name, or phone…"
                          : "Exact order ID, name, or phone…"
                        : viewMode === VIEW_ORDER
                          ? "Search order ID, customer, product name…"
                          : "Search order ID, product name, SKU…"
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
                    className={`${ui.inputCompact} w-full min-w-0 pl-8 py-1.5 text-[11px]`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchExact((prev) => !prev);
                    if (viewMode === VIEW_ORDER) {
                      setPagination((p) => ({ ...p, page: 1 }));
                    } else {
                      setItemPagination((p) => ({ ...p, page: 1 }));
                    }
                  }}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                    searchExact
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-border bg-white text-stone-600 hover:border-brand-300 hover:bg-brand-50/40"
                  }`}
                  title="Match order ID, customer name, or phone exactly (not partial / product search)"
                >
                  Exact
                </button>
              </div>

              {selectedOrder ? (
                <>
                  {orderDetailFromItemList ? (
                    <>
                      <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-stone-800">
                        Item · {selectedOrder.orderId || "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIdFromListView(null)}
                        className={`${ui.btnOutline} shrink-0 py-1 text-[11px]`}
                      >
                        Full order
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        Actions
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => openOrderNotesModal(selectedOrder?.orderId)}
                    className={`${ui.btnOutline} shrink-0 py-1 text-[11px]`}
                  >
                    <StickyNote className="h-3.5 w-3.5" aria-hidden />
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={openShiprocketItemModal}
                    disabled={createShiprocketLoading}
                    className={`${ui.btnOutline} shrink-0 border-sky-200 py-1 text-[11px] text-sky-800 hover:bg-sky-50`}
                    title="Choose items for one Shiprocket order (NORMAL delivery)"
                  >
                    {createShiprocketLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Truck className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Shiprocket
                  </button>
                  <button
                    type="button"
                    onClick={openDelhiveryItemModal}
                    disabled={createDelhiveryLoading}
                    className={`${ui.btnOutline} shrink-0 border-emerald-200 py-1 text-[11px] text-emerald-800 hover:bg-emerald-50`}
                    title="Choose items for one Delhivery package (NORMAL delivery)"
                  >
                    {createDelhiveryLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Truck className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Delhivery
                  </button>
                  {String(selectedOrder?.payment?.mode || "").toUpperCase() !==
                    "COD" &&
                    String(selectedOrder?.payment?.status || "").toUpperCase() ===
                      "PENDING" && (
                      <button
                        type="button"
                        onClick={openPaymentOverrideModal}
                        className={`${ui.btnAmber} shrink-0 py-1 text-[11px]`}
                        title="Use only if customer has paid but payment is still pending"
                      >
                        Mark paid + Confirm
                      </button>
                    )}
                  {!orderDetailFromItemList ? (
                    <>
                      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
                      <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-stone-600">
                        All items
                      </span>
                      <select
                        value={wholeOrderNewStatus}
                        onChange={(e) => setWholeOrderNewStatus(e.target.value)}
                        disabled={updatingWholeOrder}
                        className={ui.selectToolbar}
                        aria-label="Status for all items"
                      >
                        <option value="">Status…</option>
                        {statusChangeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleUpdateWholeOrderStatus}
                        disabled={updatingWholeOrder || !wholeOrderNewStatus}
                        className={ui.btnPrimarySm}
                        title="Apply status to all items"
                      >
                        {updatingWholeOrder ? (
                          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                        ) : null}
                        Apply
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}

              {!selectedOrder ? (
                <select
                  className="h-[30px] w-11 shrink-0 rounded-lg border border-border bg-white px-0.5 py-1 text-center text-[10px] tabular-nums text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  value={viewMode === VIEW_ORDER ? pagination.limit : itemPagination.limit}
                  disabled={viewMode === VIEW_ORDER ? loading : itemLoading}
                  onChange={(e) => {
                    const lim = parseInt(e.target.value, 10) || 10;
                    if (viewMode === VIEW_ORDER) {
                      setPagination((p) => ({ ...p, limit: lim, page: 1 }));
                    } else {
                      setItemPagination((p) => ({ ...p, limit: lim, page: 1 }));
                    }
                  }}
                  title="Rows per page"
                  aria-label="Rows per page"
                >
                  {LIST_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : null}

              {!exchangeOnly && !selectedOrder ? (
                <div className="inline-flex shrink-0 rounded-lg border border-border bg-canvas-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode(VIEW_ORDER)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      viewMode === VIEW_ORDER
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    By order
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode(VIEW_ITEM)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      viewMode === VIEW_ITEM
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    By item
                  </button>
                </div>
              ) : null}

              {viewMode === VIEW_ORDER && !selectedOrder && !exchangeOnly ? (
                <div
                  className="inline-flex shrink-0 rounded-lg border border-border bg-canvas-muted p-0.5"
                  role="group"
                  aria-label="Line status consistency"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLineConsistencyFilter("");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      lineConsistencyFilter === ""
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                    title="Status dropdown filters order status"
                  >
                    All lines
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLineConsistencyFilter("mixed");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      lineConsistencyFilter === "mixed"
                        ? "bg-amber-100 text-amber-900 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                    title="2+ lines with different statuses; Status dropdown matches any line"
                  >
                    Mixed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLineConsistencyFilter("uniform");
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      lineConsistencyFilter === "uniform"
                        ? "bg-white text-brand-700 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                    title="Same status on every line; Status dropdown filters order status"
                  >
                    Not mixed
                  </button>
                </div>
              ) : null}

              {!selectedOrder ? (
                <>
                    <button
                      type="button"
                      onClick={() => setListFiltersOpen((open) => !open)}
                      className={`${ui.btnOutline} text-[11px] py-1 ${
                        listFiltersOpen ? "ring-2 ring-brand-200" : ""
                      }`}
                      aria-expanded={listFiltersOpen}
                      title={listFiltersOpen ? "Hide filters" : "Show filters"}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                      Filters
                      {hasActiveListFilters ? (
                        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
                          On
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsOpen((open) => !open);
                        if (analyticsOpen) setAnalyticsError(null);
                      }}
                      className={`${ui.btnOutline} text-[11px] py-1 ${
                        analyticsOpen ? "ring-2 ring-brand-200" : ""
                      }`}
                      aria-expanded={analyticsOpen}
                      title={
                        viewMode === VIEW_ORDER
                          ? "Order counts by status — click a card to filter the table"
                          : "Item counts by line status — click a card to filter the table"
                      }
                    >
                      <BarChart2 className="h-3.5 w-3.5" aria-hidden />
                      Analytics
                      {activeAnalyticsStatus ? (
                        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
                          1
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkActionsOpen((open) => !open)}
                      className={`${ui.btnOutline} text-[11px] py-1 ${
                        bulkActionsOpen ? "ring-2 ring-brand-200" : ""
                      }`}
                      aria-expanded={bulkActionsOpen}
                      title={bulkActionsOpen ? "Hide bulk actions" : "Show bulk actions"}
                    >
                      <ListChecks className="h-3.5 w-3.5" aria-hidden />
                      Bulk
                      {listBulkSelectedCount > 0 ? (
                        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
                          {listBulkSelectedCount}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      disabled={manufacturingPdfLoading}
                      onClick={handleDownloadManufacturingPdf}
                      className={`${ui.btnOutline} text-[11px] py-1`}
                      title={
                        exchangeOnly
                          ? "Downloads a PDF of exchange lines matching your current filters (max 8,000 lines per file)."
                          : viewMode === VIEW_ITEM
                            ? "Downloads a PDF of all matching lines (uses dates, delivery, payment, search + line status from By item). Max 8,000 lines per file."
                            : "Downloads a PDF of all matching lines (uses dates, delivery, payment, search). Open By item to filter by line status. Max 8,000 lines per file."
                      }
                    >
                      {manufacturingPdfLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <FileDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Mfg PDF
                    </button>

                  {!exchangeOnly ? (
                    <button
                      type="button"
                      onClick={() => navigate(ap("orders/stale"))}
                      className={`${ui.btnOutline} shrink-0 py-1 text-[11px]`}
                      title="Open the stale orders report (CONFIRMED 24h+ by default)."
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      Stale
                    </button>
                  ) : null}
                </>
              ) : null}
          </div>

        {!selectedOrder && analyticsOpen ? (
          <div className={ui.analyticsPanel}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-stone-800">
                  Status analytics
                  <span className="ml-1.5 font-normal text-stone-500">
                    ({viewMode === VIEW_ORDER ? "by order" : "by item"}
                    {lineConsistencyFilter === "mixed" && viewMode === VIEW_ORDER
                      ? " · mixed lines"
                      : ""}
                    )
                  </span>
                </p>
                <p className="text-[10px] text-stone-500">
                  Live counts from the database. Click a card to filter the table.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchStatusAnalytics()}
                disabled={analyticsLoading}
                className={`${ui.btnOutline} py-1 text-[10px]`}
              >
                {analyticsLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-3 w-3" aria-hidden />
                )}
                Refresh
              </button>
            </div>
            {analyticsError ? (
              <p className="mb-2 text-[11px] text-danger">{analyticsError}</p>
            ) : null}
            {analyticsLoading || !analyticsViewReady ? (
              <p className="py-4 text-center text-[11px] text-stone-500">Loading counts…</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={applyAnalyticsClearAll}
                  className={`${ui.analyticsCard} ${
                    !activeAnalyticsStatus && !activeAnalyticsProvider
                      ? ui.analyticsCardActive
                      : ui.analyticsCardIdle
                  }`}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">
                    All
                  </span>
                  <span className="mt-0.5 text-lg font-bold tabular-nums text-stone-900">
                    {analyticsTotal}
                  </span>
                </button>
                {analyticsStatusCards.map(({ status, label, count }) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => applyAnalyticsStatus(status)}
                    className={`${ui.analyticsCard} ${
                      !activeAnalyticsProvider &&
                      normalizeStatusToken(status) === activeAnalyticsStatus
                        ? ui.analyticsCardActive
                        : ui.analyticsCardIdle
                    }`}
                    title={`Show only ${label}`}
                  >
                    <span className="max-w-[7rem] truncate text-[9px] font-semibold uppercase tracking-wide text-stone-600">
                      {label}
                    </span>
                    <span className="mt-0.5 text-lg font-bold tabular-nums text-stone-900">
                      {count}
                    </span>
                  </button>
                ))}
                {!analyticsLoading && analyticsStatusCards.length === 0 ? (
                  <p className="py-2 text-[11px] text-stone-500">
                    No {viewMode === VIEW_ORDER ? "orders" : "items"} with status counts
                    in this section.
                  </p>
                ) : null}
              </div>
            )}
            {showOpsCarrierCards &&
            (analyticsLoading || staleAnalytics || analyticsProviderCards.length) ? (
              <>
                <p className="mb-1.5 mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Ops &amp; carriers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {staleAnalytics ? (
                    <button
                      type="button"
                      onClick={applyAnalyticsStale}
                      className={`${ui.analyticsCard} border-amber-200 bg-amber-50/80 hover:border-amber-300 hover:bg-amber-50`}
                      title={`CONFIRMED lines older than ${staleAnalytics.thresholdHours}h — open stale report`}
                    >
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden />
                        Stale orders
                      </span>
                      <span className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">
                        {analyticsLoading ? "…" : staleAnalytics.count}
                      </span>
                    </button>
                  ) : null}
                  {analyticsProviderCards.map(({ provider, label, count }) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => applyAnalyticsProvider(provider)}
                      className={`${ui.analyticsCard} ${
                        activeAnalyticsProvider === String(provider).toUpperCase()
                          ? ui.analyticsCardActive
                          : ui.analyticsCardIdle
                      }`}
                      title={`Show ${label} lines (switches to By item)`}
                    >
                      <span className="inline-flex items-center gap-1 max-w-[7rem] truncate text-[9px] font-semibold uppercase tracking-wide text-stone-600">
                        <Truck className="h-3 w-3 shrink-0" aria-hidden />
                        {label}
                      </span>
                      <span className="mt-0.5 text-lg font-bold tabular-nums text-stone-900">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {!selectedOrder && listFiltersOpen ? (
          <div className={`${ui.filterCard} mb-2`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-3 py-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Delivery
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {DELIVERY_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.value || "all"}
                    type="button"
                    onClick={() => {
                      setDeliveryTypeFilter(tab.value);
                      setPagination((p) => ({ ...p, page: 1 }));
                      setItemPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      deliveryTypeFilter === tab.value
                        ? ui.deliveryTabActive
                        : ui.deliveryTabInactive
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span
                className="hidden h-4 w-px shrink-0 bg-border sm:block"
                aria-hidden
              />
              <div className="flex min-w-[9rem] flex-col gap-0.5 sm:min-w-[10.5rem]">
                <label
                  htmlFor="orders-payment-filter"
                  className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  Payment
                </label>
                <select
                  id="orders-payment-filter"
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                    setItemPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`${ui.inputCompact} min-w-[10.5rem]`}
                >
                  {PAYMENT_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || "all-payments"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {error && viewMode === VIEW_ORDER && (
          <div className={ui.errorBox}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {itemError && viewMode === VIEW_ITEM && (
          <div className={ui.errorBox}>
            <AlertCircle size={16} />
            {itemError}
          </div>
        )}

        {!selectedOrder ? (
          viewMode === VIEW_ORDER ? (
            <>
              {/* Filters: By order */}
              {listFiltersOpen ? (
              <div className={ui.filterCard}>
                <div className="flex flex-col gap-2 overflow-visible border-b border-border bg-canvas-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold text-stone-800">Filters</p>
                  <div className="flex flex-wrap items-center gap-2 overflow-visible sm:justify-end">
                    {(dateFrom ||
                      dateTo ||
                      cityFilter ||
                      statusFilter ||
                      lineConsistencyFilter ||
                      paymentFilter ||
                      sortOrder !== "desc") && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setCityFilter("");
                          setStatusFilter("");
                          setLineConsistencyFilter("");
                          setPaymentFilter("");
                          setSortBy("createdAt");
                          setSortOrder("desc");
                          setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
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
                <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="order-filter-from" className="text-[10px] font-semibold text-gray-500">
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
                      className={ui.inputCompact}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="order-filter-to" className="text-[10px] font-semibold text-gray-500">
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
                      className={ui.inputCompact}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="order-filter-status" className="text-[10px] font-semibold text-gray-500">
                      Status
                      {lineConsistencyFilter === "mixed" ? (
                        <span className="font-normal text-stone-400"> (any line)</span>
                      ) : (
                        <span className="font-normal text-stone-400"> (order)</span>
                      )}
                    </label>
                    <select
                      id="order-filter-status"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className={ui.inputCompact}
                    >
                      {exchangeOnly ? (
                        <option value="">All exchange statuses</option>
                      ) : returnOnly ? (
                        <option value="">All return statuses</option>
                      ) : (
                        <option value="">All statuses</option>
                      )}
                      {filteredStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="order-filter-sort" className="text-[10px] font-semibold text-gray-500">
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
                      className={ui.inputCompact}
                    >
                      <option value="createdAt-desc">Latest first</option>
                      <option value="createdAt-asc">Oldest first</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="order-filter-city" className="text-[10px] font-semibold text-gray-500">
                      City
                    </label>
                    <input
                      id="order-filter-city"
                      type="text"
                      value={cityFilter}
                      placeholder="e.g. Mumbai"
                      onChange={(e) => {
                        setCityFilter(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className={ui.inputCompact}
                    />
                  </div>
                </div>
              </div>
              ) : null}

            {!loading && orders.length > 0 && !selectedOrder && bulkActionsOpen && (
              <div className={ui.bulkBar}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">
                    Bulk actions
                  </span>
                  <span className="text-stone-600">
                    Selected:{" "}
                    <span className="font-medium text-stone-900">
                      {listSelectedOrderIds.length}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={listSelectedOrderIds.length === 0 || docDownloadLoading}
                    onClick={() => {
                      const selected = new Set(listSelectedOrderIds.map(String));
                      const shipmentIds = orders
                        .filter((o) => selected.has(String(o?.orderId)))
                        .flatMap((o) => getOrderShipmentIds(o))
                        .filter(Boolean);
                      const uniq = Array.from(new Set(shipmentIds.map(String)));
                      if (uniq.length === 0) {
                        toast.error("No Shiprocket shipment IDs found in selected orders.");
                        return;
                      }
                      handleDownloadLabelsClick(uniq);
                    }}
                    className={`${ui.btnOutline} text-[11px] py-1`}
                    title="Download shipping labels for selected orders (Shiprocket shipment IDs)."
                  >
                    Label(s)
                  </button>
                  <button
                    type="button"
                    disabled={listSelectedOrderIds.length === 0 || docDownloadLoading}
                    onClick={() => {
                      const selected = new Set(listSelectedOrderIds.map(String));
                      const shipmentIds = orders
                        .filter((o) => selected.has(String(o?.orderId)))
                        .flatMap((o) => getOrderShipmentIds(o))
                        .filter(Boolean);
                      const uniq = Array.from(new Set(shipmentIds.map(String)));
                      if (uniq.length === 0) {
                        toast.error("No Shiprocket shipment IDs found in selected orders.");
                        return;
                      }
                      handleDownloadManifestClick(uniq);
                    }}
                    className={`${ui.btnOutline} text-[11px] py-1`}
                    title="Download manifest for selected orders (Shiprocket shipment IDs)."
                  >
                    Manifest
                  </button>
                  <button
                    type="button"
                    disabled={listSelectedOrderIds.length === 0 || listBulkProcessing}
                    onClick={() => {
                      const ids = listSelectedOrderIds.map(String).filter(Boolean);
                      if (ids.length === 0) return;
                      setSelectedShippingProvider("SHIPROCKET");
                      openShippingProviderModal({ kind: "listOrders", orderIds: ids });
                    }}
                    className={`${ui.btnOutline} text-[11px] py-1`}
                    title="Mark selected orders as PROCESSING."
                  >
                    {listBulkProcessing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : null}
                    PROCESSING
                  </button>
                </div>
              </div>
            )}

            <TableScrollHint />
            <div className={ui.tableScrollShell}>
              <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
                <thead className={ui.thead}>
                  <tr>
                    <th className="w-10 px-1.5 py-1.5 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all orders on page"
                        checked={
                          orders.length > 0 &&
                          orders
                            .map((o) => String(o?.orderId || ""))
                            .filter(Boolean)
                            .every((id) => listSelectedOrderIds.includes(id))
                        }
                        onChange={(e) => {
                          const pageIds = orders
                            .map((o) => String(o?.orderId || ""))
                            .filter(Boolean);
                          if (e.target.checked) {
                            setListSelectedOrderIds((prev) =>
                              Array.from(new Set([...prev, ...pageIds])),
                            );
                          } else {
                            setListSelectedOrderIds((prev) =>
                              prev.filter((id) => !pageIds.includes(id)),
                            );
                          }
                        }}
                        className={ui.checkbox}
                      />
                    </th>
                    {orderListActiveColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-1.5 py-1.5 ${ui.th} ${
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
                    <th className={`px-1.5 py-1.5 text-center ${ui.th}`}>Details / notes</th>
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
                        {exchangeOnly ? "No exchange orders found" : "No orders found"}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order._id}
                        className={`border-t border-border/80 transition-colors ${ui.rowHover} ${
                          orderLineItems(order, lineStackFilterProps).length > 1
                            ? "[&>td]:align-top"
                            : ""
                        }`}
                      >
                        <td className="px-1.5 py-2 align-middle text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select order ${order?.orderId || ""}`}
                            checked={listSelectedOrderIds.includes(String(order?.orderId || ""))}
                            onChange={(e) => {
                              const id = String(order?.orderId || "");
                              if (!id) return;
                              setListSelectedOrderIds((prev) =>
                                e.target.checked
                                  ? Array.from(new Set([...prev, id]))
                                  : prev.filter((x) => x !== id),
                              );
                            }}
                            className={ui.checkbox}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
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
            </div>

            <ListPaginationFooter
              loading={loading}
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(nextPage) =>
                setPagination((p) => ({ ...p, page: nextPage }))
              }
              btnOutline={ui.btnOutline}
              emptyLabel="0 orders"
            />
            </>
          ) : (
            <>
              {/* Filters: By item */}
              {listFiltersOpen ? (
              <div className={`${ui.filterCard} mb-2`}>
                <div className="flex flex-col gap-3 overflow-visible border-b border-border bg-canvas-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] font-semibold text-stone-800">Filters</p>
                    <div className="inline-flex rounded-lg border border-border bg-canvas-muted p-0.5">
                      <button
                        type="button"
                        onClick={() => setItemListView("table")}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                          itemListViewMode === "table"
                            ? ui.tabActive
                            : ui.tabInactive
                        }`}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemListView("cards")}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                          itemListViewMode === "cards"
                            ? ui.tabActive
                            : ui.tabInactive
                        }`}
                      >
                        Cards
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 overflow-visible sm:justify-end">
                    {(dateFrom || dateTo || cityFilter || itemStatusFilter || paymentFilter || shippingProviderFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setCityFilter("");
                          setShippingProviderFilter("");
                          setItemStatusFilter("");
                          setPaymentFilter("");
                          setItemPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className={`${ui.btnOutline} py-1 text-[11px]`}
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
                        badgeClass="bg-brand-100 text-brand-900"
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="item-filter-from" className="text-[10px] font-semibold text-stone-500">
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
                      className={ui.inputCompact}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="item-filter-to" className="text-[10px] font-semibold text-stone-500">
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
                      className={ui.inputCompact}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="item-filter-status" className="text-[10px] font-semibold text-stone-500">
                      Line status
                    </label>
                    <select
                      id="item-filter-status"
                      value={itemStatusFilter}
                      onChange={(e) => {
                        setItemStatusFilter(e.target.value);
                        setItemPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className={ui.inputCompact}
                    >
                      {exchangeOnly ? (
                        <option value="">All exchange statuses</option>
                      ) : returnOnly ? (
                        <option value="">All return statuses</option>
                      ) : (
                        <option value="">All statuses</option>
                      )}
                      {filteredStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="item-filter-city" className="text-[10px] font-semibold text-stone-500">
                      City
                    </label>
                    <input
                      id="item-filter-city"
                      type="text"
                      value={cityFilter}
                      placeholder="e.g. Mumbai"
                      onChange={(e) => {
                        setCityFilter(e.target.value);
                        setItemPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className={ui.inputCompact}
                    />
                  </div>
                </div>
                <p className="border-t border-border px-3 py-2.5 text-[11px] text-stone-500 leading-snug">
                  The list is paginated for speed. <span className="font-medium">Mfg PDF</span>{" "}
                  above exports <span className="font-medium">all</span> lines matching dates, city, delivery, payment, status, and
                  search (not only this page).
                </p>
              </div>
              ) : null}
              {itemLoading ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-canvas-muted/30">
                  <RefreshCw className="h-10 w-10 animate-spin text-brand-600 mb-3" />
                  <p className="text-sm font-medium text-stone-600">
                    Loading order items…
                  </p>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-white">
                  <Package className="h-12 w-12 text-stone-300 mb-3" />
                  <p className="text-sm font-medium text-stone-600">
                    {exchangeOnly ? "No exchange order items found" : "No order items found"}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Try changing the status filter or search
                  </p>
                </div>
              ) : itemListViewMode === "table" ? (
                <>
                  {!itemLoading && orderItems.length > 0 && !selectedOrder && bulkActionsOpen && (
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[11px] shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800">Bulk actions</span>
                        <span className="text-stone-600">
                          Selected:{" "}
                          <span className="font-medium text-stone-900">
                            {listSelectedItemKeys.length}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={listSelectedItemKeys.length === 0 || docDownloadLoading}
                          onClick={() => {
                            const selected = new Set(listSelectedItemKeys);
                            const shipmentIds = orderItems
                              .filter((r) =>
                                selected.has(`${String(r?.orderId || "")}__${String(r?.itemId || "")}`),
                              )
                              .flatMap((r) => getShipmentIdsFromItemRow(r));
                            const uniq = Array.from(new Set(shipmentIds));
                            if (uniq.length === 0) {
                              toast.error("No Shiprocket shipment IDs found in selected items.");
                              return;
                            }
                            handleDownloadLabelsClick(uniq);
                          }}
                          className={`${ui.btnOutline} text-[11px] py-1`}
                        >
                          Label(s)
                        </button>
                        <button
                          type="button"
                          disabled={listSelectedItemKeys.length === 0 || docDownloadLoading}
                          onClick={() => {
                            const selected = new Set(listSelectedItemKeys);
                            const shipmentIds = orderItems
                              .filter((r) =>
                                selected.has(`${String(r?.orderId || "")}__${String(r?.itemId || "")}`),
                              )
                              .flatMap((r) => getShipmentIdsFromItemRow(r));
                            const uniq = Array.from(new Set(shipmentIds));
                            if (uniq.length === 0) {
                              toast.error("No Shiprocket shipment IDs found in selected items.");
                              return;
                            }
                            handleDownloadManifestClick(uniq);
                          }}
                          className={`${ui.btnOutline} text-[11px] py-1`}
                        >
                          Manifest
                        </button>
                        <button
                          type="button"
                          disabled={listSelectedItemKeys.length === 0 || listBulkProcessing}
                          onClick={() => {
                            const selected = new Set(listSelectedItemKeys);
                            const targets = orderItems
                              .filter((r) =>
                                selected.has(`${String(r?.orderId || "")}__${String(r?.itemId || "")}`),
                              )
                              .map((r) => ({
                                orderId: String(r?.orderId || ""),
                                itemId: String(r?.itemId || ""),
                              }))
                              .filter((t) => t.orderId && t.itemId);
                            if (targets.length === 0) return;
                            setSelectedShippingProvider("SHIPROCKET");
                            openShippingProviderModal({ kind: "listItems", targets });
                          }}
                          className={`${ui.btnOutline} text-[11px] py-1`}
                        >
                          {listBulkProcessing ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : null}
                          PROCESSING
                        </button>
                      </div>
                    </div>
                  )}
                  <TableScrollHint />
                  <div className={ui.tableScrollShell}>
                  <table className="w-full min-w-[960px] table-auto border-collapse text-left text-xs">
                    <thead className={ui.thead}>
                      <tr>
                        <th className="w-10 px-1.5 py-1.5 text-center">
                          <input
                            type="checkbox"
                            aria-label="Select all items on page"
                            checked={
                              orderItems.length > 0 &&
                              orderItems
                                .map((r) => `${String(r?.orderId || "")}__${String(r?.itemId || "")}`)
                                .filter((k) => !k.startsWith("__"))
                                .every((k) => listSelectedItemKeys.includes(k))
                            }
                            onChange={(e) => {
                              const pageKeys = orderItems
                                .map((r) => `${String(r?.orderId || "")}__${String(r?.itemId || "")}`)
                                .filter((k) => !k.startsWith("__"));
                              if (e.target.checked) {
                                setListSelectedItemKeys((prev) =>
                                  Array.from(new Set([...prev, ...pageKeys])),
                                );
                              } else {
                                setListSelectedItemKeys((prev) =>
                                  prev.filter((k) => !pageKeys.includes(k)),
                                );
                              }
                            }}
                            className={ui.checkbox}
                          />
                        </th>
                        {itemListActiveColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-1.5 py-1.5 ${ui.th} ${
                              col.key === "info" ? "text-center" : ""
                            }`}
                          >
                            {col.key === "info" ? "Info" : col.label}
                          </th>
                        ))}
                        <th className={`px-1.5 py-1.5 text-center ${ui.th}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {orderItems.map((row) => (
                        <tr
                          key={`${row.orderId}-${row.itemId}`}
                          className={`border-t border-border/80 transition-colors ${ui.rowHover}`}
                        >
                          <td className="px-1.5 py-2 align-top text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select item ${row?.itemId || ""}`}
                              checked={listSelectedItemKeys.includes(`${String(row?.orderId || "")}__${String(row?.itemId || "")}`)}
                              onChange={(e) => {
                                const key = `${String(row?.orderId || "")}__${String(row?.itemId || "")}`;
                                if (key.startsWith("__")) return;
                                setListSelectedItemKeys((prev) =>
                                  e.target.checked
                                    ? Array.from(new Set([...prev, key]))
                                    : prev.filter((k) => k !== key),
                                );
                              }}
                              className={ui.checkbox}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          {itemListActiveColumns.map((col) => (
                            <td key={col.key} className={itemListCellTdClass(col.key)}>
                              {renderItemListCell(col.key, row)}
                            </td>
                          ))}
                          <td className="px-1.5 py-2 align-top">{renderItemListActions(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((row) => (
                    <div
                      key={`${row.orderId}-${row.itemId}`}
                      className="group rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:border-brand-200 hover:shadow-md transition-all duration-200 overflow-hidden"
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
                            <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                              Order #{row.orderId}
                            </span>
                            {row.orderType === "EXCHANGE" ||
                            isExchangeReplacementOrderDoc(row, replacementOrderIds) ? (
                              <ExchangeReplacementOrderBadge />
                            ) : null}
                            {row.deliveryType ? (
                              <span className="inline-flex items-center rounded-md bg-canvas-muted px-2 py-0.5 text-xs font-medium text-stone-700">
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
                              {formatManufacturingModalDate(row.orderCreatedAt)}
                            </span>
                          </div>
                          {String(row.deliveryType || "").toUpperCase() === "NORMAL" && (() => {
                            const rowItem = lineItemFromOrderItemRow(row);
                            const provider = getItemShippingProvider(rowItem);
                            const borderTone =
                              provider === "DELHIVERY"
                                ? "border-emerald-200 bg-emerald-50/80"
                                : provider === "SHADOWFAX"
                                  ? "border-orange-200 bg-orange-50/80"
                                : provider === "SELF_SHIPPING"
                                  ? "border-violet-200 bg-violet-50/80"
                                  : "border-sky-200 bg-sky-50/80";
                            const titleTone =
                              provider === "DELHIVERY"
                                ? "text-emerald-900"
                                : provider === "SHADOWFAX"
                                  ? "text-orange-900"
                                : provider === "SELF_SHIPPING"
                                  ? "text-violet-900"
                                  : "text-sky-900";
                            const providerLabel =
                              provider === "DELHIVERY"
                                ? "Delhivery"
                                : provider === "SHADOWFAX"
                                  ? "Shadowfax"
                                : provider === "SELF_SHIPPING"
                                  ? "Self Shipping"
                                  : "Shiprocket";
                            const showManifest =
                              provider !== "DELHIVERY" &&
                              provider !== "SHADOWFAX" &&
                              provider !== "SELF_SHIPPING";
                            return (
                              <div className={`rounded-lg border px-3 py-2 mt-1 ${borderTone}`}>
                                <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${titleTone}`}>
                                  {providerLabel}
                                </p>
                                {provider === "SELF_SHIPPING" ? (
                                  isExternalSelfShippingLine(rowItem) ? (
                                    <div className="text-xs text-stone-700 space-y-1">
                                      <p>
                                        <span className="font-semibold text-violet-900">External</span>
                                        {rowItem?.selfShipping?.carrierName
                                          ? ` · ${rowItem.selfShipping.carrierName}`
                                          : ""}
                                      </p>
                                      {rowItem?.selfShipping?.trackingUrl ? (
                                        <SafeExternalLink
                                          href={rowItem.selfShipping.trackingUrl}
                                          className="text-indigo-600 hover:underline break-all"
                                        >
                                          {rowItem.selfShipping.trackingUrl}
                                        </SafeExternalLink>
                                      ) : rowItem?.trackingId ? (
                                        <p className="font-mono">AWB: {rowItem.trackingId}</p>
                                      ) : (
                                        <p className="text-amber-800">No tracking added yet.</p>
                                      )}
                                      {rowItem?.trackingId && rowItem?.selfShipping?.trackingUrl ? (
                                        <p className="font-mono">AWB: {rowItem.trackingId}</p>
                                      ) : null}
                                      {rowItem?.selfShipping?.notes ? (
                                        <p className="text-stone-500">{rowItem.selfShipping.notes}</p>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openExternalSelfShippingModalForItem(
                                            row.orderId,
                                            rowItem.itemId || row.itemId,
                                            rowItem,
                                            { detailsOnly: true },
                                          )
                                        }
                                        className="mt-1 inline-flex items-center rounded-md border border-violet-300 bg-white px-2 py-1 text-[11px] font-medium text-violet-800 hover:bg-violet-50"
                                      >
                                        {rowItem?.selfShipping?.carrierName
                                          ? "Edit carrier details"
                                          : "Enter carrier details"}
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-stone-700">
                                      {rowItem?.trackingId ? (
                                        <>
                                          Internal · Ref:{" "}
                                          <span className="font-mono font-semibold">{rowItem.trackingId}</span>
                                        </>
                                      ) : (
                                        "Internal — use Khush label or add reference when marking Shipped."
                                      )}
                                    </p>
                                  )
                                ) : provider === "DELHIVERY" ? (
                                  (() => {
                                    const dl = getNormalDeliveryDelhivery(rowItem);
                                    return dl ? (
                                      <DelhiveryDetails dl={dl} />
                                    ) : (
                                      <p className="text-xs text-amber-800">No Delhivery waybill yet.</p>
                                    );
                                  })()
                                ) : provider === "SHADOWFAX" ? (
                                  (() => {
                                    const sfx = getNormalDeliveryShadowfax(rowItem);
                                    return sfx ? (
                                      <ShadowfaxDetails sfx={sfx} />
                                    ) : (
                                      <p className="text-xs text-amber-800">No Shadowfax AWB yet.</p>
                                    );
                                  })()
                                ) : (() => {
                                  const sr = getLineShiprocket(rowItem);
                                  return sr ? (
                                    <ShiprocketDetails sr={sr} />
                                  ) : (
                                    <p className="text-xs text-amber-800">
                                      No AWB yet — choose carrier at Processing.
                                    </p>
                                  );
                                })()}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <DocLabelButton
                                    loading={docDownloadLoading}
                                    loadingType={docActionType}
                                    disabled={docDownloadLoading}
                                    downloaded={isItemLabelDownloaded(rowItem)}
                                    onClick={() => handleLabelForItem(rowItem, { orderId: row.orderId })}
                                  />
                                  {showManifest && (
                                    <DocManifestButton
                                      loading={docDownloadLoading}
                                      loadingType={docActionType}
                                      disabled={
                                        docDownloadLoading ||
                                        (() => {
                                          const ids = getShipmentIdsForItem(rowItem);
                                          return (
                                            ids.length > 0 &&
                                            ids.every((id) =>
                                              downloadedManifestShipments.has(String(id)),
                                            )
                                          );
                                        })()
                                      }
                                      onClick={() => handleManifestForItem(rowItem)}
                                      title={
                                        (() => {
                                          const ids = getShipmentIdsForItem(rowItem);
                                          return ids.length > 0 &&
                                            ids.every((id) =>
                                              downloadedManifestShipments.has(String(id)),
                                            )
                                            ? "Manifest already downloaded"
                                            : "Download manifest";
                                        })()
                                      }
                                    />
                                  )}
                                </div>
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
                              className="rounded-lg p-2.5 text-brand-600 bg-brand-50 hover:bg-brand-100 hover:text-brand-800 transition-colors"
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
              {!selectedOrder ? (
                <ListPaginationFooter
                  loading={itemLoading}
                  page={itemPagination.page}
                  totalPages={itemPagination.totalPages}
                  total={itemPagination.total}
                  limit={itemPagination.limit}
                  onPageChange={(nextPage) =>
                    setItemPagination((p) => ({ ...p, page: nextPage }))
                  }
                  btnOutline={ui.btnOutline}
                  emptyLabel="0 items"
                />
              ) : null}
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
              <div className={ui.detailShell}>
                {paymentOverrideOpen && (
                  <div className={`${ui.modalOverlay} z-50`}>
                    <div className={`${ui.modalShell} ${ui.modalShellLg}`}>
                      <div className={`${ui.modalHeader} flex items-start justify-between gap-4`}>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Mark payment SUCCESS + confirm order
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            This will set payment to <span className="font-medium">SUCCESS</span>, move order to{" "}
                            <span className="font-medium">CONFIRMED</span>, confirm items, and update stock.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closePaymentOverrideModal}
                          disabled={paymentOverrideSaving}
                          className="rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                        >
                          Close
                        </button>
                      </div>
                      <div className={`${ui.modalBody} space-y-4`}>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Payment ID (required)
                          </label>
                          <input
                            value={paymentOverridePaymentId}
                            onChange={(e) => setPaymentOverridePaymentId(e.target.value)}
                            placeholder="e.g. pay_..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Notes (optional)
                          </label>
                          <textarea
                            value={paymentOverrideNotes}
                            onChange={(e) => setPaymentOverrideNotes(e.target.value)}
                            placeholder="Reason / reference"
                            rows={3}
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={paymentOverrideSendNotification}
                            onChange={(e) => setPaymentOverrideSendNotification(e.target.checked)}
                          />
                          Send “order confirmed” notification
                        </label>
                      </div>
                      <div className={ui.modalFooter}>
                        <button
                          type="button"
                          onClick={closePaymentOverrideModal}
                          disabled={paymentOverrideSaving}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleForcePaymentSuccess}
                          disabled={paymentOverrideSaving}
                          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 inline-flex items-center gap-2"
                        >
                          {paymentOverrideSaving ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Updating…
                            </>
                          ) : (
                            "Confirm update"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {shiprocketModalOpen && (
                  <div className={`${ui.modalOverlay} z-50`}>
                    <div className={`${ui.modalShell} ${ui.modalShellLg} border-border`}>
                      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900">
                            Create Shiprocket order
                          </h3>
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            Select NORMAL delivery items to include in one Shiprocket shipment
                            (same shipment group).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeShiprocketItemModal}
                          disabled={createShiprocketLoading}
                          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-canvas-muted disabled:opacity-60"
                        >
                          Close
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                        {shiprocketEligibleItems.length === 0 ? (
                          <p className="py-6 text-center text-[11px] text-stone-500">
                            No eligible items. Lines may already have Shiprocket or are not
                            NORMAL delivery.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {shiprocketEligibleItems.map((it) => {
                              const id = String(it.itemId || it._id);
                              const checked = shiprocketModalItemIds.includes(id);
                              const label = getLineProductDisplayName(it);
                              const sku = it.sku || it.variant?.sku || "—";
                              return (
                                <li key={id}>
                                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-2.5 py-2 hover:bg-brand-50/40 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleShiprocketModalItem(id)}
                                      className={ui.checkbox}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[11px] font-medium text-stone-900">
                                        {label || sku}
                                      </span>
                                      <span className="block truncate font-mono text-[10px] text-stone-500">
                                        {sku}
                                        {it.shipmentGroupId
                                          ? ` · ${it.shipmentGroupId}`
                                          : ""}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[10px] text-stone-500">
                                      ×{it.quantity ?? 1}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {shiprocketModalSelectedItems.length > 0 &&
                        shiprocketModalGroupIds.length > 1 ? (
                          <p className="mt-2 text-[10px] font-medium text-danger">
                            Selected items span multiple shipment groups. Pick items from one
                            group only.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setShiprocketModalItemIds(
                              shiprocketEligibleItems.map((it) =>
                                String(it.itemId || it._id),
                              ),
                            )
                          }
                          disabled={
                            !shiprocketEligibleItems.length || createShiprocketLoading
                          }
                          className={`${ui.btnOutline} py-1 text-[11px]`}
                        >
                          Select all
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={closeShiprocketItemModal}
                            disabled={createShiprocketLoading}
                            className={`${ui.btnOutline} py-1 text-[11px]`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitShiprocketModal}
                            disabled={!shiprocketModalCanSubmit || createShiprocketLoading}
                            className={`${ui.btnPrimary} py-1 text-[11px]`}
                          >
                            {createShiprocketLoading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                Creating…
                              </>
                            ) : (
                              <>
                                <Truck className="h-3.5 w-3.5" aria-hidden />
                                Create (
                                {shiprocketModalSelectedItems.length})
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {delhiveryModalOpen && (
                  <div className={`${ui.modalOverlay} z-50`}>
                    <div className={`${ui.modalShell} ${ui.modalShellLg} border-border`}>
                      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900">
                            Create Delhivery shipment
                          </h3>
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            Select NORMAL delivery items to include in one Delhivery package
                            (same shipment group, one waybill).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeDelhiveryItemModal}
                          disabled={createDelhiveryLoading}
                          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-canvas-muted disabled:opacity-60"
                        >
                          Close
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                        {delhiveryEligibleItems.length === 0 ? (
                          <p className="py-6 text-center text-[11px] text-stone-500">
                            No eligible items. Lines may already have Delhivery or are not
                            NORMAL delivery.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {delhiveryEligibleItems.map((it) => {
                              const id = String(it.itemId || it._id);
                              const checked = delhiveryModalItemIds.includes(id);
                              const label = getLineProductDisplayName(it);
                              const sku = it.sku || it.variant?.sku || "—";
                              return (
                                <li key={id}>
                                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-2.5 py-2 hover:bg-emerald-50/40 has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-50/50">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleDelhiveryModalItem(id)}
                                      className={ui.checkbox}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[11px] font-medium text-stone-900">
                                        {label || sku}
                                      </span>
                                      <span className="block truncate font-mono text-[10px] text-stone-500">
                                        {sku}
                                        {it.shipmentGroupId
                                          ? ` · ${it.shipmentGroupId}`
                                          : ""}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[10px] text-stone-500">
                                      ×{it.quantity ?? 1}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {delhiveryModalSelectedItems.length > 0 &&
                        delhiveryModalGroupIds.length > 1 ? (
                          <p className="mt-2 text-[10px] font-medium text-danger">
                            Selected items span multiple shipment groups. Pick items from one
                            group only.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setDelhiveryModalItemIds(
                              delhiveryEligibleItems.map((it) =>
                                String(it.itemId || it._id),
                              ),
                            )
                          }
                          disabled={
                            !delhiveryEligibleItems.length || createDelhiveryLoading
                          }
                          className={`${ui.btnOutline} py-1 text-[11px]`}
                        >
                          Select all
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={closeDelhiveryItemModal}
                            disabled={createDelhiveryLoading}
                            className={`${ui.btnOutline} py-1 text-[11px]`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitDelhiveryModal}
                            disabled={!delhiveryModalCanSubmit || createDelhiveryLoading}
                            className={`${ui.btnPrimary} border-emerald-600 bg-emerald-600 py-1 text-[11px] hover:bg-emerald-700`}
                          >
                            {createDelhiveryLoading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                Creating…
                              </>
                            ) : (
                              <>
                                <Truck className="h-3.5 w-3.5" aria-hidden />
                                Create (
                                {delhiveryModalSelectedItems.length})
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {orderError && (
                  <div className={`${ui.errorBox} mx-3 mt-3`}>
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                    {orderError}
                  </div>
                )}

            {fromItemList && focusedItem ? (
              <div className={ui.detailBody}>
                <div className="mx-auto max-w-2xl space-y-3">
                  <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-start gap-3">
                      {focusedItem.variant?.imageUrl && (
                        <img
                          src={focusedItem.variant.imageUrl}
                          alt={focusedItem.sku}
                          className="h-20 w-20 rounded-lg border border-border object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                          Order #{selectedOrder?.orderId}
                          {selectedOrder?.orderType === "EXCHANGE" ||
                          isExchangeReplacementOrderDoc(selectedOrder, replacementOrderIds) ? (
                            <ExchangeReplacementOrderBadge compact />
                          ) : null}
                        </p>
                        {(selectedOrder?.orderType === "EXCHANGE" ||
                          isExchangeReplacementOrderDoc(selectedOrder, replacementOrderIds)) &&
                        selectedOrder?.exchangeMeta?.originalOrderId ? (
                          <button
                            type="button"
                            onClick={() =>
                              openOrderById(selectedOrder.exchangeMeta.originalOrderId)
                            }
                            className="mt-1 text-[10px] font-semibold text-brand-700 hover:underline"
                          >
                            Original order #{selectedOrder.exchangeMeta.originalOrderId}
                          </button>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-500 break-all">
                          Item ID: {String(focusedItem.itemId || focusedItem._id || "—")}
                        </p>
                        <ExchangeDetailsPanel
                          item={focusedItem}
                          onZoomImage={setZoomImageUrl}
                          onOpenOrder={openOrderById}
                          onAssignPickup={handleOpenAssignExchangePickup}
                          assignPickupLoading={exchangePickupLoading}
                        />
                        <ReturnDetailsPanel
                          item={focusedItem}
                          onApproveReturn={handleApproveReturn}
                          approveReturnLoading={returnApproveLoading}
                          onBookReversePickup={handleBookReturnReversePickup}
                          bookPickupLoading={returnBookPickupLoading}
                        />
                        {(() => {
                          const cancel = getCancellationReasonFromItem(focusedItem);
                          if (!cancel?.label) return null;
                          return (
                            <p className="mt-2 text-xs text-red-700">
                              <span className="font-semibold uppercase tracking-wide">
                                Cancel reason:
                              </span>{" "}
                              {cancel.label}
                              {cancel.source ? (
                                <span className="text-stone-500"> · By {cancel.source}</span>
                              ) : null}
                            </p>
                          );
                        })()}
                        <h3 className="mt-1 text-sm font-semibold text-stone-900">
                          {getLineProductDisplayName(focusedItem) ||
                            focusedItem.sku ||
                            focusedItem.variant?.sku ||
                            "—"}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-600">
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
                              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
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
                        Status
                      </p>
                      {renderItemStatusBreakdown(focusedItem)}
                      <div className="mt-2">{renderLineJourneySummary(focusedItem, { compact: true })}</div>
                    </div>
                  </div>
                  {(() => {
                    const driver = getDriverPartnerDisplay(focusedItem);
                    return driver ? (
                      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                          <UserCircle className="h-5 w-5 text-brand-600" aria-hidden />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                            Driver
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-stone-900">
                            {driver.name}
                            {driver.phone && <span className="font-normal text-gray-600 ml-1">· {driver.phone}</span>}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {isNormalDeliveryLine(focusedItem) && (() => {
                    const provider = getItemShippingProvider(focusedItem);
                    const borderTone =
                      provider === "DELHIVERY"
                        ? "border-emerald-200 bg-emerald-50/90"
                        : provider === "SHADOWFAX"
                          ? "border-orange-200 bg-orange-50/90"
                        : provider === "SELF_SHIPPING"
                          ? "border-violet-200 bg-violet-50/90"
                          : "border-sky-200 bg-sky-50/90";
                    const titleTone =
                      provider === "DELHIVERY"
                        ? "text-emerald-900"
                        : provider === "SHADOWFAX"
                          ? "text-orange-900"
                        : provider === "SELF_SHIPPING"
                          ? "text-violet-900"
                          : "text-sky-900";
                    const providerLabel =
                      provider === "DELHIVERY"
                        ? "Delhivery"
                        : provider === "SHADOWFAX"
                          ? "Shadowfax"
                        : provider === "SELF_SHIPPING"
                          ? "Self Shipping"
                          : "Shiprocket";
                    const sr = getLineShiprocket(focusedItem);
                    const dl = getNormalDeliveryDelhivery(focusedItem);
                    const sfx = getNormalDeliveryShadowfax(focusedItem);
                    const showManifest =
                      provider !== "DELHIVERY" &&
                      provider !== "SHADOWFAX" &&
                      provider !== "SELF_SHIPPING";
                    return (
                      <div className={`rounded-xl border p-3 ${borderTone}`}>
                        <h4 className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${titleTone}`}>
                          <Truck className="h-3.5 w-3.5" aria-hidden />
                          Courier — {providerLabel}
                        </h4>
                        <div className="space-y-2">
                          {provider === "SELF_SHIPPING" ? (
                            isExternalSelfShippingLine(focusedItem) ? (
                              <div className="text-sm text-stone-700 space-y-1">
                                <p>
                                  <span className="font-semibold text-violet-900">External</span>
                                  {focusedItem?.selfShipping?.carrierName
                                    ? ` · ${focusedItem.selfShipping.carrierName}`
                                    : ""}
                                </p>
                                {focusedItem?.selfShipping?.trackingUrl ? (
                                  <SafeExternalLink
                                    href={focusedItem.selfShipping.trackingUrl}
                                    className="text-indigo-600 hover:underline break-all"
                                  >
                                    {focusedItem.selfShipping.trackingUrl}
                                  </SafeExternalLink>
                                ) : focusedItem?.trackingId ? (
                                  <p className="font-mono text-xs">AWB: {focusedItem.trackingId}</p>
                                ) : (
                                  <p className="text-amber-800 text-xs">No tracking added yet.</p>
                                )}
                                {focusedItem?.trackingId && focusedItem?.selfShipping?.trackingUrl ? (
                                  <p className="font-mono text-xs">AWB: {focusedItem.trackingId}</p>
                                ) : null}
                                {focusedItem?.selfShipping?.notes ? (
                                  <p className="text-xs text-stone-500">{focusedItem.selfShipping.notes}</p>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openExternalSelfShippingModalForItem(
                                      selectedOrder?.orderId,
                                      focusedItem.itemId,
                                      focusedItem,
                                      { detailsOnly: true },
                                    )
                                  }
                                  className="inline-flex items-center rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-50"
                                >
                                  {focusedItem?.selfShipping?.carrierName
                                    ? "Edit carrier details"
                                    : "Enter carrier details"}
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-stone-700">
                                {focusedItem.trackingId ? (
                                  <>
                                    Internal · Ref:{" "}
                                    <span className="font-mono font-semibold">{focusedItem.trackingId}</span>
                                  </>
                                ) : (
                                  "Internal shipment — use Khush label or add reference when marking Shipped."
                                )}
                              </p>
                            )
                          ) : provider === "DELHIVERY" ? (
                            dl ? (
                              <DelhiveryDetails dl={dl} />
                            ) : (
                              <p className="text-sm text-amber-800">
                                No Delhivery waybill yet. Move to Processing with Delhivery to manifest.
                              </p>
                            )
                          ) : provider === "SHADOWFAX" ? (
                            sfx ? (
                              <ShadowfaxDetails sfx={sfx} />
                            ) : (
                              <p className="text-sm text-amber-800">
                                No Shadowfax AWB yet. Move to Processing with Shadowfax to manifest.
                              </p>
                            )
                          ) : sr ? (
                            <ShiprocketDetails sr={sr} />
                          ) : (
                            <p className="text-sm text-amber-800">
                              No Shiprocket shipment linked yet. Choose Shiprocket at Processing to manifest.
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {canDownloadInvoice(focusedItem) ? (
                              <button
                                type="button"
                                disabled={docDownloadLoading}
                                onClick={() =>
                                  handleGetInvoiceClick(selectedOrder, focusedItem)
                                }
                                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 flex items-center gap-2"
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
                              onClick={() => handleLabelForItem(focusedItem, selectedOrder)}
                              className={
                                isItemLabelDownloaded(focusedItem)
                                  ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60 flex items-center gap-2"
                                  : "rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 flex items-center gap-2"
                              }
                              title={
                                isItemLabelDownloaded(focusedItem)
                                  ? "Reprint shipping label"
                                  : "Download shipping label"
                              }
                            >
                              {docDownloadLoading && docActionType === "label" ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Truck size={14} />
                              )}
                              {docDownloadLoading && docActionType === "label"
                                ? "Loading..."
                                : isItemLabelDownloaded(focusedItem)
                                  ? "Reprint label"
                                  : "Download label"}
                            </button>

                            {showManifest && (
                              <button
                                type="button"
                                disabled={
                                  docDownloadLoading ||
                                  (() => {
                                    const ids = getShipmentIdsForItem(focusedItem);
                                    return (
                                      ids.length > 0 &&
                                      ids.every((id) =>
                                        downloadedManifestShipments.has(String(id)),
                                      )
                                    );
                                  })()
                                }
                                onClick={() => handleManifestForItem(focusedItem)}
                                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 flex items-center gap-2"
                              >
                                {docDownloadLoading && docActionType === "manifest" ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Package size={14} />
                                )}
                                Manifest
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Change status card */}
                  <div className={ui.detailSection}>
                    <div className={ui.detailSectionTitle}>
                      <RefreshCw className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                      Update status
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                        className={`${ui.inputCompact} min-w-[12rem] py-1.5`}
                      >
                        {statusChangeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {updatingItemId === String(focusedItem.itemId || focusedItem._id) && (
                        <span className="flex items-center gap-2 text-sm text-brand-600">
                          <RefreshCw size={18} className="animate-spin" />
                          Updating…
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[10px] text-stone-500">Select a new status for this line.</p>
                  </div>
                  {focusedItem.statusHistory && focusedItem.statusHistory.length > 0 && (
                    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                      <div className={ui.detailSectionTitle}>
                        <Clock className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                        Status history
                      </div>
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
              <div className="py-10 text-center text-[11px] text-stone-500">Loading item details…</div>
            ) : fromItemList && !focusedItem ? (
              <div className="py-10 text-center text-[11px] text-stone-500">Item not found in this order.</div>
            ) : !fromItemList ? (
            <>
            <div className={ui.detailOverview}>
              <div className={ui.detailSummaryBox}>
                <div className={ui.detailSummaryHead}>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    Order
                  </span>
                  <span className="font-mono text-xs font-semibold text-stone-900">
                    {selectedOrder?.orderId || "—"}
                  </span>
                  {selectedOrder?.orderType === "EXCHANGE" ||
                  isExchangeReplacementOrderDoc(selectedOrder, replacementOrderIds) ? (
                    <ExchangeReplacementOrderBadge compact />
                  ) : null}
                  {(selectedOrder?.orderType === "EXCHANGE" ||
                    isExchangeReplacementOrderDoc(selectedOrder, replacementOrderIds)) &&
                  selectedOrder?.exchangeMeta?.originalOrderId ? (
                    <button
                      type="button"
                      onClick={() =>
                        openOrderById(selectedOrder.exchangeMeta.originalOrderId)
                      }
                      className="text-[10px] font-semibold text-brand-700 hover:underline"
                    >
                      Original #{selectedOrder.exchangeMeta.originalOrderId}
                    </button>
                  ) : null}
                  <span className="text-stone-300" aria-hidden>
                    ·
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    Placed
                  </span>
                  <span className="text-stone-700">
                    {selectedOrder?.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </span>
                  <div className="ml-auto shrink-0">
                    {getStatusBadge(
                      normalizeItemStatusToken(
                        selectedOrder?.status || selectedOrder?.orderStatus,
                      ) || "",
                    )}
                  </div>
                </div>

                <div className={ui.detailSummaryCols}>
                  <div className={ui.detailSummaryCol}>
                    <OrderDetailSectionHead title="Customer & delivery" icon={MapPin} />
                    <OrderDetailDenseGrid pairs={2}>
                      <OrderDetailRow label="Name">
                        {(() => {
                          const billName =
                            selectedOrder?.user?.name ||
                            selectedOrder?.userId?.name ||
                            "";
                          const shipName = selectedOrder?.address?.name || "";
                          if (!billName && !shipName) return "—";
                          if (
                            billName &&
                            shipName &&
                            billName.trim() !== shipName.trim()
                          ) {
                            return (
                              <span>
                                {billName}{" "}
                                <span className="font-normal text-stone-500">
                                  → {shipName}
                                </span>
                              </span>
                            );
                          }
                          return billName || shipName || "—";
                        })()}
                      </OrderDetailRow>
                      <OrderDetailRow label="Bill ph.">
                        {(() => {
                          const cc =
                            selectedOrder?.user?.countryCode ||
                            selectedOrder?.userId?.countryCode ||
                            "";
                          const ph =
                            selectedOrder?.user?.phoneNumber ||
                            selectedOrder?.userId?.phoneNumber ||
                            "";
                          return cc || ph ? `${cc}${ph}` : "—";
                        })()}
                      </OrderDetailRow>
                      <OrderDetailRow label="Email">
                        {selectedOrder?.user?.email ||
                          selectedOrder?.userId?.email ||
                          "—"}
                      </OrderDetailRow>
                      <OrderDetailRow label="Del. ph.">
                        {selectedOrder?.address?.phone || "—"}
                      </OrderDetailRow>
                      <OrderDetailRow label="Pincode">
                        {selectedOrder?.address?.pincode || "—"}
                      </OrderDetailRow>
                      <OrderDetailRow label="Address" wide>
                        <span className="font-normal text-stone-700">
                          {selectedOrder?.address?.fullAddress || "—"}
                        </span>
                      </OrderDetailRow>
                    </OrderDetailDenseGrid>
                  </div>

                  <div className={ui.detailSummaryCol}>
                    <OrderDetailSectionHead title="Payment" icon={CreditCard} />
                    <OrderDetailDenseGrid pairs={1}>
                      <OrderDetailRow label="Mode">
                        <span
                          className={
                            selectedOrder?.payment?.mode === "COD"
                              ? "text-orange-700"
                              : ""
                          }
                        >
                          {selectedOrder?.payment?.mode || "—"}
                        </span>
                      </OrderDetailRow>
                      <OrderDetailRow label="Status">
                        <span
                          className={
                            selectedOrder?.payment?.status === "SUCCESS"
                              ? "text-green-700"
                              : selectedOrder?.payment?.status === "PENDING"
                                ? "text-amber-700"
                                : "text-red-700"
                          }
                        >
                          {selectedOrder?.payment?.status || "—"}
                        </span>
                      </OrderDetailRow>
                      <OrderDetailRow label="Paid">
                        {formatInr(selectedOrder?.payment?.amount || 0)}
                      </OrderDetailRow>
                    </OrderDetailDenseGrid>
                  </div>

                  <div className={ui.detailSummaryCol}>
                    <OrderDetailSectionHead title="Pricing" icon={DollarSign} />
                    <OrderDetailDenseGrid pairs={1}>
                      <OrderDetailRow label="Subtotal">
                        {formatInr(selectedOrder?.pricing?.subTotal || 0)}
                      </OrderDetailRow>
                      {orderHasBindOfferDiscount(selectedOrder) ? (
                        <OrderDetailRow label={getBindOfferBillLabel(selectedOrder?.pricing?.bindOffers)}>
                          <span className="text-violet-700">
                            −{formatInr(resolveOrderBindOfferDiscount(selectedOrder))}
                          </span>
                        </OrderDetailRow>
                      ) : null}
                      {selectedOrder?.pricing?.coupon?.discountAmount > 0 ? (
                        <OrderDetailRow label="Coupon">
                          <span className="text-emerald-700">
                            −{formatInr(selectedOrder.pricing.coupon.discountAmount)}
                            {selectedOrder.pricing.coupon.code
                              ? ` (${selectedOrder.pricing.coupon.code})`
                              : ""}
                          </span>
                        </OrderDetailRow>
                      ) : null}
                      <OrderDetailRow label="Delivery">
                        {formatInr(selectedOrder?.pricing?.delivery?.totalCharge || 0)}
                      </OrderDetailRow>
                      <OrderDetailRow label="GST">
                        {formatInr(selectedOrder?.pricing?.gst?.totalGst || 0)}
                      </OrderDetailRow>
                      {getOrderWalletUsedAmount(selectedOrder) > 0 ? (
                        <OrderDetailRow label="Wallet">
                          <span className="text-emerald-700">
                            {formatInr(getOrderWalletUsedAmount(selectedOrder))}
                          </span>
                        </OrderDetailRow>
                      ) : null}
                      <OrderDetailRow label="Final">
                        <span className="font-semibold text-stone-900">
                          {formatInr(selectedOrder?.pricing?.finalPayable || 0)}
                        </span>
                      </OrderDetailRow>
                    </OrderDetailDenseGrid>
                    <OrderBindOfferAppliedSummary bindOffers={selectedOrder?.pricing?.bindOffers} />
                  </div>
                </div>

                <div className={ui.detailSummaryFoot}>
                    <div className={ui.detailSummaryCol}>
                      <OrderDetailSectionHead title="Delivery assignments" icon={Truck} />
                      {unassignError && (
                        <div className={`${ui.errorBox} mb-2`}>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {unassignError}
                        </div>
                      )}
                      {orderAssignments == null ? (
                        <p className="flex items-center gap-2 text-[11px] text-stone-500">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          Loading assignments…
                        </p>
                      ) : !orderAssignments.assignments?.length ? (
                        <p className="text-[10px] leading-snug text-stone-500">
                          No driver assigned — select line items below or assign on Shipped /
                          Out for delivery.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
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
                                  className="flex flex-wrap items-start gap-1.5 rounded border border-border bg-canvas-muted/30 px-2 py-1.5"
                                >
                                  <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <UserCircle
                                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                                      aria-hidden
                                    />
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-medium text-stone-900">
                                        {name || "Driver"}
                                        {phone && (
                                          <span className="font-normal text-stone-500">
                                            {" "}
                                            · {phone}
                                          </span>
                                        )}
                                      </p>
                                      <p className="mt-0.5 text-[10px] text-stone-500">
                                        {a.assignmentType === "ORDER"
                                          ? "Whole order"
                                          : `${assignmentItemIds.length} item(s)`}{" "}
                                        · {a.status}
                                      </p>
                                      {itemSkus.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          {itemSkus.map((sku, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex rounded-md bg-canvas-muted px-1.5 py-0.5 text-[10px] font-medium text-stone-700"
                                            >
                                              {String(sku)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReassignDriver(
                                          selectedOrder.orderId,
                                          a,
                                        )
                                      }
                                      disabled={unassignLoading}
                                      className={ui.btnOutline}
                                      title="Assign to a different driver"
                                    >
                                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
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
                                      className={`${ui.btnOutline} border-danger/30 text-danger hover:bg-danger-bg`}
                                      title="Remove driver (unassign)"
                                    >
                                      <UserMinus className="h-3.5 w-3.5" aria-hidden />
                                      Remove
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
                            <p className="text-[11px] text-stone-500">
                              No active assignments.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={ui.detailSummaryCol}>
                      <OrderDetailSectionHead title="Shipments" icon={Package} />
                      {selectedOrder?.shipments?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {selectedOrder.shipments.map((ship, idx) => (
                            <div
                              key={idx}
                              className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded border border-border/80 bg-canvas-muted/35 px-2 py-1 text-[10px] leading-snug"
                            >
                              <span className="font-semibold text-stone-900">
                                {ship.shipmentGroupId || "—"}
                              </span>
                              <span className="text-stone-300" aria-hidden>
                                ·
                              </span>
                              <span className="text-stone-700">
                                {ship.warehouseId?.name || "—"}
                                {ship.warehouseId?.code
                                  ? ` (${ship.warehouseId.code})`
                                  : ""}
                              </span>
                              <span className="text-stone-300" aria-hidden>
                                ·
                              </span>
                              <span className="text-stone-600">
                                {ship.status || "—"} · {ship.deliveryType || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-500">No shipment groups yet.</p>
                      )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/80 bg-canvas-muted/25 px-2.5 py-1.5 text-[10px]">
                  <Truck className="h-3 w-3 shrink-0 text-sky-700" aria-hidden />
                  <span className="font-semibold uppercase tracking-wide text-stone-500">
                    Forward
                  </span>
                  <span className="text-stone-500">NORMAL exchange replacement</span>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={docDownloadLoading}
                      onClick={() => handleCreateForwardShipmentForOrder(selectedOrder)}
                      className={`${ui.btnOutline} border-sky-200 py-1 text-[10px] text-sky-800 hover:bg-sky-50`}
                    >
                      {docDownloadLoading && docActionType === "forward" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <Truck className="h-3 w-3" aria-hidden />
                      )}
                      Create forward
                    </button>
                    {(() => {
                      const forwardPreview = getOrderForwardPreview(selectedOrder);
                      if (!forwardPreview) return null;
                      return (
                        <span className="text-sky-800">
                          Created ·{" "}
                          {forwardPreview.trackingUrl ? (
                            <SafeExternalLink
                              href={forwardPreview.trackingUrl}
                              className="underline"
                            >
                              Track
                            </SafeExternalLink>
                          ) : (
                            <span className="text-stone-600">No tracking URL</span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className={ui.detailBody}>
                    {(() => {
                      const exchangeItems = (selectedOrder?.items || []).filter((it) =>
                        exchangeHasVisibleDetails(getLatestExchange(it), it),
                      );
                      if (!exchangeItems.length) return null;
                        return (
                        <div className="mb-2 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                          <div className="flex items-center gap-1.5 border-b border-border bg-canvas-muted/40 px-2.5 py-1">
                            <RefreshCw
                              className="h-3 w-3 shrink-0 text-brand-600"
                              aria-hidden
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                              Exchanges ({exchangeItems.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 p-1.5">
                            {exchangeItems.map((item) => (
                              <ExchangeDetailsPanel
                                key={String(item.itemId || item._id)}
                                item={item}
                                onZoomImage={setZoomImageUrl}
                                onOpenOrder={openOrderById}
                                onAssignPickup={handleOpenAssignExchangePickup}
                                assignPickupLoading={exchangePickupLoading}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const returnItems = (selectedOrder?.items || []).filter((it) =>
                        returnHasVisibleDetails(getLatestReturn(it), it),
                      );
                      if (!returnItems.length) return null;
                      return (
                        <div className="mb-2 overflow-hidden rounded-xl border border-amber-200/80 bg-white shadow-sm">
                          <div className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-50/60 px-2.5 py-1">
                            <RotateCcw
                              className="h-3 w-3 shrink-0 text-amber-700"
                              aria-hidden
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                              Returns ({returnItems.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 p-1.5">
                            {returnItems.map((item) => (
                              <ReturnDetailsPanel
                                key={String(item.itemId || item._id)}
                                item={item}
                                onApproveReturn={handleApproveReturn}
                                approveReturnLoading={returnApproveLoading}
                                onBookReversePickup={handleBookReturnReversePickup}
                                bookPickupLoading={returnBookPickupLoading}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const cancelledItems = (selectedOrder?.items || []).filter((it) => {
                        if (String(it?.status || "").toUpperCase() !== "CANCELLED") return false;
                        return Boolean(getCancellationReasonFromItem(it)?.label);
                      });
                      if (!cancelledItems.length) return null;
                      return (
                        <div className="mb-2 overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-sm">
                          <div className="flex items-center gap-1.5 border-b border-red-100 bg-red-50/60 px-2.5 py-1">
                            <XCircle
                              className="h-3 w-3 shrink-0 text-red-700"
                              aria-hidden
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-red-900">
                              Cancellations ({cancelledItems.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 p-1.5">
                            {cancelledItems.map((item) => {
                              const cancel = getCancellationReasonFromItem(item);
                              const label =
                                getLineProductDisplayName(item) ||
                                item.sku ||
                                String(item.itemId || item._id || "—");
                              return (
                                <div
                                  key={String(item.itemId || item._id)}
                                  className="rounded-lg border border-red-100 bg-red-50/30 px-2 py-1.5 text-[10px] leading-snug"
                                >
                                  <p className="truncate font-medium text-stone-900" title={label}>
                                    {label}
                                  </p>
                                  <p className="text-red-800">
                                    <span className="font-semibold">Reason:</span> {cancel?.label}
                                    {cancel?.source ? (
                                      <span className="text-stone-500"> · By {cancel.source}</span>
                                    ) : null}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-2">
                      <div className={ui.detailItemsToolbar}>
                        <ShoppingBag
                          className="h-3.5 w-3.5 shrink-0 text-brand-600"
                          aria-hidden
                        />
                        <span className="shrink-0 whitespace-nowrap font-semibold text-stone-800">
                          Line items (
                          {selectedOrder?.totalQuantity ||
                            selectedOrder?.items?.length ||
                            0}
                          )
                        </span>
                        {selectedOrder?.items?.length > 0 ? (
                          <>
                            <span
                              className="mx-0.5 h-4 w-px shrink-0 bg-border"
                              aria-hidden
                            />
                            <ColumnPickerDropdown
                              columns={ORDER_DETAIL_ITEM_DATA_COLUMNS}
                              visibleKeys={orderDetailItemVisibleColumns}
                              onToggle={toggleOrderDetailItemColumn}
                              onReset={resetOrderDetailItemColumns}
                              onSelectAll={selectAllOrderDetailItemColumns}
                              open={orderDetailColumnsOpen}
                              onOpenChange={setOrderDetailColumnsOpen}
                              align="start"
                            />
                            <span className="shrink-0 whitespace-nowrap text-stone-600">
                              {selectedItemIds.length > 0
                                ? `${selectedItemIds.length} selected`
                                : "Bulk"}
                            </span>
                            <select
                              value={bulkStatus}
                              onChange={(e) => setBulkStatus(e.target.value)}
                              disabled={
                                updatingBulk || selectedItemIds.length === 0
                              }
                              className={ui.selectToolbar}
                              aria-label="Update selected items to status"
                            >
                              <option value="">Update to…</option>
                              {statusChangeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleUpdateSelectedItemsStatus}
                              disabled={
                                updatingBulk ||
                                selectedItemIds.length === 0 ||
                                !bulkStatus
                              }
                              className={ui.btnPrimarySm}
                              title="Apply status to selected items"
                            >
                              {updatingBulk ? (
                                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                              ) : null}
                              Apply
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
                              className={`${ui.btnOutline} shrink-0 py-1 text-[11px]`}
                              title="Assign a driver to the selected items"
                            >
                              <UserPlus className="h-3.5 w-3.5" aria-hidden />
                              Assign driver
                            </button>
                          </>
                        ) : null}
                      </div>

                {orderLoading ? (
                  <div className="py-10 text-center text-[11px] text-stone-500">Loading items…</div>
                ) : !selectedOrder?.items?.length ? (
                  <div className="py-10 text-center text-[11px] text-stone-500">No items found</div>
                ) : (
                  <>
                  <TableScrollHint />
                  <div className={ui.tableScrollShellMuted}>
                    <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-xs">
                      <thead className={ui.thead}>
                        <tr>
                          <th className={`${ui.th} w-8 px-1 py-1 text-center`}>
                            <input
                              type="checkbox"
                              checked={
                                selectedOrder.items.length > 0 &&
                                selectedOrder.items.every((it) =>
                                  selectedItemIds.includes(String(it.itemId || it._id))
                                )
                              }
                              onChange={selectAllOnPage}
                              className={ui.checkbox}
                            />
                          </th>
                          {orderDetailItemActiveColumns.map((col) => (
                            <th
                              key={col.key}
                              className={`${ui.th} ${orderDetailItemColClass(col.key)} px-1.5 py-1 text-left`}
                            >
                              <span className="block truncate" title={col.label}>
                                {col.label}
                              </span>
                            </th>
                          ))}
                          <th className={`${ui.th} w-[6.5rem] px-1.5 py-1 text-left`}>
                            Status
                          </th>
                          <th
                            className={`${ui.th} w-[6.75rem] px-1.5 py-1 text-left`}
                            title="Shiprocket — normal delivery only"
                          >
                            Ship / docs
                          </th>
                          <th className={`${ui.th} w-[5.5rem] px-1.5 py-1 text-left`}>
                            Driver
                          </th>
                          <th className={`${ui.th} w-[6.25rem] px-1 py-1 text-center`}>
                            Update
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedOrder.items.map((item) => {
                          const itemId = String(item.itemId || item._id);
                          const isUpdating = updatingItemId === itemId;
                          const isSelected = selectedItemIds.includes(itemId);
                          const driverDisplay = getDriverPartnerDisplay(item);
                          return (
                            <tr
                              key={itemId}
                              className={`border-t border-border/80 ${ui.rowHover} ${
                                isSelected ? "bg-brand-50/40" : ""
                              }`}
                            >
                              <td className="px-1 py-1.5 align-middle text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(itemId)}
                                  className={ui.checkbox}
                                />
                              </td>
                              {orderDetailItemActiveColumns.map((col) => (
                                <td
                                  key={col.key}
                                  className={`min-w-0 px-1.5 py-1.5 align-middle ${orderDetailItemColClass(col.key)}`}
                                >
                                  {renderOrderDetailItemDataCell(col.key, item, selectedOrder)}
                                </td>
                              ))}
                              <td className="min-w-0 px-1.5 py-1.5 align-middle">
                                {renderItemStatusBreakdown(item, { tableRow: true })}
                                {renderLineJourneySummary(item, { compact: true })}
                                <ReturnDetailsPanel
                                  item={item}
                                  embedded
                                  onApproveReturn={handleApproveReturn}
                                  approveReturnLoading={returnApproveLoading}
                                  onBookReversePickup={handleBookReturnReversePickup}
                                  bookPickupLoading={returnBookPickupLoading}
                                />
                                <ExchangeDetailsPanel
                                  item={item}
                                  embedded
                                  onZoomImage={setZoomImageUrl}
                                  onOpenOrder={openOrderById}
                                  onAssignPickup={handleOpenAssignExchangePickup}
                                  assignPickupLoading={exchangePickupLoading}
                                />
                              </td>
                              <td className="min-w-0 px-1.5 py-1.5 align-middle">
                                {renderOrderDetailShipDocsCell(item)}
                              </td>
                              <td className="min-w-0 px-1.5 py-1.5 align-middle text-[11px] text-gray-700">
                                {driverDisplay ? (
                                  <span
                                    className="block min-w-0 truncate font-medium"
                                    title={
                                      driverDisplay.phone
                                        ? `${driverDisplay.name} · ${driverDisplay.phone}`
                                        : driverDisplay.name
                                    }
                                  >
                                    {driverDisplay.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="min-w-0 px-1 py-1.5 align-middle text-center">
                                <div className="relative mx-auto w-full max-w-[6.25rem]">
                                  <select
                                    value={item.status || "CREATED"}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      handleUpdateItemStatus(selectedOrder.orderId, itemId, newVal);
                                    }}
                                    disabled={isUpdating}
                                    className={`${ui.selectToolbar} w-full max-w-[6.25rem] ${
                                      isUpdating ? "cursor-wait opacity-60" : ""
                                    }`}
                                  >
                                    {statusChangeOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  {isUpdating && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded bg-white/60">
                                      <RefreshCw size={14} className="animate-spin text-brand-600" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t border-border bg-canvas-muted/90">
                        <tr>
                          <td
                            colSpan={1 + orderDetailItemActiveColumns.length + 4}
                            className="px-2.5 py-1.5"
                          >
                            <div className="flex flex-nowrap items-center justify-end gap-x-3 overflow-x-auto text-[11px] text-gray-700">
                              <span>
                                Subtotal{" "}
                                <span className="font-medium tabular-nums">
                                  {formatInr(selectedOrder?.pricing?.subTotal)}
                                </span>
                              </span>
                              {orderHasBindOfferDiscount(selectedOrder) ? (
                                <span className="text-violet-700">
                                  {getBindOfferBillLabel(selectedOrder?.pricing?.bindOffers)}{" "}
                                  <span className="font-medium tabular-nums">
                                    −{formatInr(resolveOrderBindOfferDiscount(selectedOrder))}
                                  </span>
                                </span>
                              ) : null}
                              {selectedOrder?.pricing?.coupon?.discountAmount > 0 ? (
                                <span className="text-emerald-700">
                                  Coupon{" "}
                                  <span className="font-medium tabular-nums">
                                    −{formatInr(selectedOrder.pricing.coupon.discountAmount)}
                                  </span>
                                </span>
                              ) : null}
                              {getOrderWalletUsedAmount(selectedOrder) > 0 && (
                                <span className="text-emerald-700">
                                  Wallet{" "}
                                  <span className="font-medium tabular-nums">
                                    {formatInr(getOrderWalletUsedAmount(selectedOrder))}
                                  </span>
                                </span>
                              )}
                              <span>
                                Delivery{" "}
                                <span className="font-medium tabular-nums">
                                  {formatInr(selectedOrder?.pricing?.delivery?.totalCharge)}
                                </span>
                              </span>
                              <span>
                                GST{" "}
                                <span className="font-medium tabular-nums">
                                  {formatInr(selectedOrder?.pricing?.gst?.totalGst)}
                                </span>
                              </span>
                              <span className="font-semibold text-gray-900">
                                Final{" "}
                                <span className="tabular-nums">
                                  {formatInr(selectedOrder?.pricing?.finalPayable)}
                                </span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  </>
                )}

              </div>
            </div>
            </>
            ) : null}

        {/* Assignment Modal */}
        {assignmentModalOpen && (
          <div className={`${ui.modalOverlayDark} z-50`}>
            <div className={ui.modalPanelSimple}>
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
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
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
          <div className={`${ui.modalOverlayDark} z-50`}>
            <div className={ui.modalPanelSimple}>
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
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
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

        {orderNotesModalOpen && orderNotesModalOrderId && (
          <div
            className="fixed inset-0 z-[76] flex items-center justify-center bg-black/50 p-4 sm:p-6"
            onClick={closeOrderNotesModal}
            role="presentation"
          >
            <div
              className={`mx-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-none bg-white shadow-2xl ring-1 ring-gray-200/80 ${ui.modalShellLg}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-notes-modal-title"
            >
              <div className="border-b border-gray-100 bg-canvas-muted px-5 py-3">
                <h3
                  id="order-notes-modal-title"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2"
                >
                  <StickyNote size={16} className="text-brand-600 shrink-0" />
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
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
                      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className={`mx-auto max-h-[90vh] w-full overflow-hidden rounded-none bg-white shadow-2xl ring-1 ring-gray-200/80 ${ui.modalShellWide}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="store-info-modal-title"
            >
              <div className="border-b border-gray-100 bg-canvas-muted px-5 py-3 text-center">
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
              <div className="max-h-[calc(90vh-7.5rem)] overflow-y-auto bg-canvas-muted/60 px-4 py-4 sm:px-6 sm:py-5">
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

        {shippingFallbackModal?.length > 0 && (
          <div className={`${ui.modalOverlay} z-[95]`}>
            <div className={`${ui.modalShell} ${ui.modalShellLg} border-amber-200`}>
              <div className={`${ui.modalHeader} border-amber-100 bg-amber-50`}>
                <h3 className="text-base font-semibold text-amber-950">
                  Switched to Self Shipping
                </h3>
                <p className="text-sm text-amber-900/80 mt-1">
                  The delivery pincode is not serviceable by the carrier you selected.
                  These line(s) were updated to <strong>Self Shipping</strong> instead.
                </p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                {shippingFallbackModal.map((entry, idx) => (
                  <div
                    key={`${entry.orderId || "order"}-${entry.itemId || idx}-${idx}`}
                    className="rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-gray-800"
                  >
                    <p className="font-medium text-gray-900">
                      {shippingProviderLabel(entry.fellBackFrom)} unavailable
                      {entry.sku ? ` · ${entry.sku}` : ""}
                    </p>
                    {entry.orderId && (
                      <p className="text-xs text-gray-600 mt-1">Order: {entry.orderId}</p>
                    )}
                    {entry.deliveryPincode && (
                      <p className="text-xs text-gray-600">
                        Delivery pincode: {entry.deliveryPincode}
                      </p>
                    )}
                    {entry.fallbackReason && (
                      <p className="text-xs text-amber-900 mt-2">{entry.fallbackReason}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className={ui.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShippingFallbackModal(null)}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {shippingProviderModalOpen && (
          <div className={`${ui.modalOverlay} z-[90]`}>
            <div className={`${ui.modalShell} ${ui.modalShellMd}`}>
              <div className={ui.modalHeader}>
                <h3 className="text-base font-semibold text-gray-900">
                  Choose shipping carrier
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Normal delivery items moving to Processing will use the selected method.
                  Self shipping skips third-party APIs — add tracking when marking Shipped.
                </p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                {SHIPPING_PROVIDER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                      selectedShippingProvider === opt.value
                        ? opt.value === "DELHIVERY"
                          ? "border-emerald-400 bg-emerald-50"
                          : opt.value === "SELF_SHIPPING"
                            ? "border-violet-400 bg-violet-50"
                            : "border-sky-400 bg-sky-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingProvider"
                      value={opt.value}
                      checked={selectedShippingProvider === opt.value}
                      onChange={() => setSelectedShippingProvider(opt.value)}
                    />
                    <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  </label>
                ))}
                {selectedShippingProvider === "SELF_SHIPPING" && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold text-violet-900 uppercase tracking-wide">
                      Self shipping type
                    </p>
                    {SELF_SHIPPING_MODE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
                      >
                        <input
                          type="radio"
                          name="selfShippingMode"
                          value={opt.value}
                          checked={selectedSelfShippingMode === opt.value}
                          onChange={() => {
                            setSelectedSelfShippingMode(opt.value);
                            if (opt.value === "INTERNAL") {
                              setExternalSelfShipForm(EMPTY_EXTERNAL_SELF_SHIP_FORM);
                            }
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                    {selectedSelfShippingMode === "EXTERNAL" ? (
                      <div className="mt-2 space-y-3 rounded-lg border border-violet-300 bg-white px-3 py-3">
                        <p className="text-xs font-medium text-violet-900">
                          External courier details
                        </p>
                        <label className="block text-xs font-medium text-gray-700">
                          Courier partner *
                          <input
                            type="text"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            value={externalSelfShipForm.carrierName}
                            onChange={(e) =>
                              setExternalSelfShipForm((prev) => ({
                                ...prev,
                                carrierName: e.target.value,
                              }))
                            }
                            placeholder="e.g. BlueDart, DTDC, India Post"
                          />
                        </label>
                        <label className="block text-xs font-medium text-gray-700">
                          AWB / tracking number *
                          <input
                            type="text"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            value={externalSelfShipForm.trackingId}
                            onChange={(e) =>
                              setExternalSelfShipForm((prev) => ({
                                ...prev,
                                trackingId: e.target.value,
                              }))
                            }
                            placeholder="AWB or reference number"
                          />
                        </label>
                        <label className="block text-xs font-medium text-gray-700">
                          Tracking URL
                          <input
                            type="url"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            value={externalSelfShipForm.trackingUrl}
                            onChange={(e) =>
                              setExternalSelfShipForm((prev) => ({
                                ...prev,
                                trackingUrl: e.target.value,
                              }))
                            }
                            placeholder="https://... (optional if AWB entered)"
                          />
                        </label>
                        <label className="block text-xs font-medium text-gray-700">
                          Notes
                          <textarea
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            value={externalSelfShipForm.notes}
                            onChange={(e) =>
                              setExternalSelfShipForm((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Internal notes (optional)"
                          />
                        </label>
                        <p className="text-[11px] text-violet-800">
                          Courier partner and AWB or tracking URL are required. Details are saved when you confirm.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-violet-800">
                        Internal uses Khush labels and in-house logistics.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className={ui.modalFooter}>
                <button
                  type="button"
                  disabled={shippingProviderSubmitting}
                  onClick={() => {
                    setShippingProviderModalOpen(false);
                    setPendingStatusUpdate(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={shippingProviderSubmitting}
                  onClick={executePendingStatusUpdate}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {shippingProviderSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Confirm & update"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {externalSelfShipModal && (
          <div className={`${ui.modalOverlay} z-[91]`}>
            <div className={`${ui.modalShell} ${ui.modalShellMd}`}>
              <div className={ui.modalHeader}>
                <h3 className="text-base font-semibold text-gray-900">
                  {externalSelfShipModal.detailsOnly
                    ? "External carrier details"
                    : "External self-shipping details"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {externalSelfShipModal.detailsOnly
                    ? "Shipment was booked manually on another carrier or portal. Save tracking info for ops and customer notifications."
                    : "Enter carrier and tracking before updating the item status."}
                </p>
              </div>
              <div className={`${ui.modalBody} space-y-3`}>
                <label className="block text-xs font-medium text-gray-700">
                  Courier partner{externalSelfShipModal.detailsOnly ? "" : " *"}
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={externalSelfShipForm.carrierName}
                    onChange={(e) =>
                      setExternalSelfShipForm((prev) => ({
                        ...prev,
                        carrierName: e.target.value,
                      }))
                    }
                    placeholder="e.g. BlueDart, DTDC, India Post"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  AWB / tracking number{externalSelfShipModal.detailsOnly ? "" : " *"}
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={externalSelfShipForm.trackingId}
                    onChange={(e) =>
                      setExternalSelfShipForm((prev) => ({
                        ...prev,
                        trackingId: e.target.value,
                      }))
                    }
                    placeholder="AWB or reference number"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  Tracking URL
                  <input
                    type="url"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={externalSelfShipForm.trackingUrl}
                    onChange={(e) =>
                      setExternalSelfShipForm((prev) => ({
                        ...prev,
                        trackingUrl: e.target.value,
                      }))
                    }
                    placeholder="https://... (optional if AWB entered)"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  Notes
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={externalSelfShipForm.notes}
                    onChange={(e) =>
                      setExternalSelfShipForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Internal notes about this shipment"
                  />
                </label>
              </div>
              <div className={ui.modalFooter}>
                <button
                  type="button"
                  disabled={externalSelfShipSubmitting}
                  onClick={() => setExternalSelfShipModal(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={externalSelfShipSubmitting}
                  onClick={submitExternalSelfShippingModal}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {externalSelfShipSubmitting
                    ? "Saving…"
                    : externalSelfShipModal.detailsOnly
                      ? "Save details"
                      : "Save & update status"}
                </button>
              </div>
            </div>
          </div>
        )}

        {exchangePickupModal && (
          <div
            className={`${ui.modalOverlayDark} z-[84]`}
            onClick={() => !exchangePickupLoading && setExchangePickupModal(null)}
          >
            <div
              className={`${ui.modalShell} ${ui.modalShellMd} border-border`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`${ui.modalHeader} py-3`}>
                <h3 className="text-sm font-semibold text-stone-900">
                  Assign exchange pickup
                </h3>
                <p className="mt-1 text-[11px] text-stone-600">
                  For Delhivery / Shadowfax manual or Khush driver exchanges. Book reverse pickup via carrier API or enter return AWB manually.
                </p>
              </div>
              <div className={`${ui.modalBody} space-y-3 py-3`}>
                {String(exchangePickupModal?.returnPickupMethod || "").toUpperCase() ===
                "DELHIVERY_MANUAL" ? (
                  <label className="flex items-start gap-2 text-[11px] text-stone-700">
                    <input
                      type="checkbox"
                      checked={Boolean(exchangePickupForm.bookDelhivery)}
                      onChange={(e) =>
                        setExchangePickupForm((prev) => ({
                          ...prev,
                          bookDelhivery: e.target.checked,
                          bookShadowfax: e.target.checked ? false : prev.bookShadowfax,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span>
                      Book reverse pickup with Delhivery API
                      <span className="block text-[10px] text-stone-500">
                        Creates RVP waybill automatically (payment_mode Pickup). Leave AWB empty when checked.
                      </span>
                    </span>
                  </label>
                ) : null}
                {String(exchangePickupModal?.returnPickupMethod || "").toUpperCase() ===
                "SHADOWFAX_MANUAL" ? (
                  <label className="flex items-start gap-2 text-[11px] text-stone-700">
                    <input
                      type="checkbox"
                      checked={Boolean(exchangePickupForm.bookShadowfax)}
                      onChange={(e) =>
                        setExchangePickupForm((prev) => ({
                          ...prev,
                          bookShadowfax: e.target.checked,
                          bookDelhivery: e.target.checked ? false : prev.bookDelhivery,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span>
                      Book reverse pickup with Shadowfax API
                      <span className="block text-[10px] text-stone-500">
                        Creates customer pickup AWB automatically. Leave AWB empty when checked.
                      </span>
                    </span>
                  </label>
                ) : null}
                <label className="block text-[11px] font-medium text-stone-700">
                  Return AWB / tracking ID
                  <input
                    type="text"
                    value={exchangePickupForm.manualTrackingId}
                    onChange={(e) =>
                      setExchangePickupForm((prev) => ({
                        ...prev,
                        manualTrackingId: e.target.value,
                      }))
                    }
                    disabled={
                      exchangePickupForm.bookDelhivery || exchangePickupForm.bookShadowfax
                    }
                    className={`${ui.inputCompact} mt-1 w-full disabled:bg-stone-50`}
                    placeholder={
                      exchangePickupForm.bookDelhivery
                        ? "AWB will be assigned by Delhivery"
                        : exchangePickupForm.bookShadowfax
                          ? "AWB will be assigned by Shadowfax"
                          : "Carrier AWB for return pickup"
                    }
                  />
                </label>
                <label className="block text-[11px] font-medium text-stone-700">
                  Notes
                  <textarea
                    value={exchangePickupForm.notes}
                    onChange={(e) =>
                      setExchangePickupForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className={`${ui.inputCompact} mt-1 w-full resize-y`}
                    placeholder="Pickup instructions (optional)"
                  />
                </label>
                <label className="block text-[11px] font-medium text-stone-700">
                  Scheduled at
                  <input
                    type="datetime-local"
                    value={exchangePickupForm.scheduledAt}
                    onChange={(e) =>
                      setExchangePickupForm((prev) => ({
                        ...prev,
                        scheduledAt: e.target.value,
                      }))
                    }
                    className={`${ui.inputCompact} mt-1 w-full`}
                  />
                </label>
              </div>
              <div className={ui.modalFooter}>
                <button
                  type="button"
                  disabled={exchangePickupLoading}
                  onClick={() => setExchangePickupModal(null)}
                  className={ui.btnOutline}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={exchangePickupLoading}
                  onClick={handleSubmitExchangePickup}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {exchangePickupLoading ? "Saving…" : "Save pickup"}
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
    </div>
  );
};

export default Orders;
