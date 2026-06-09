import { ChevronDown, ChevronLeft, ChevronRight, Columns3, ExternalLink, Info } from "lucide-react";
import toast from "react-hot-toast";

export const DELIVERY_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "NORMAL", label: "Normal" },
  { value: "ONE_DAY", label: "One day" },
  { value: "90_MIN", label: "90 min" },
];

export function getOrdersUiTokens() {
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
  };
}

export function OrderDetailRow({ label, children, className = "", wide = false }) {
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

export function OrderDetailSectionHead({ title, icon: Icon }) {
  return (
    <div className="mb-1 flex items-center gap-1 border-b border-border/50 pb-0.5">
      {Icon ? <Icon className="h-3 w-3 shrink-0 text-brand-600" aria-hidden /> : null}
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h4>
    </div>
  );
}

export function OrderDetailDenseGrid({ children, pairs = 2 }) {
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

export function OrderDetailBlock({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <OrderDetailSectionHead title={title} icon={Icon} />
      <OrderDetailDenseGrid pairs={1}>{children}</OrderDetailDenseGrid>
    </section>
  );
}

export function TableScrollHint() {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
      <span aria-hidden className="select-none text-stone-300">
        ↔
      </span>
      <span>Scroll horizontally to view all columns</span>
    </p>
  );
}

export const LIST_PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];

export function ListPaginationFooter({
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

/** Maps UI tab → API query (pending Razorpay/Nimble, not COD) */
export const PAYMENT_FILTER_TABS = [
  { value: "", label: "All payments" },
  { value: "pending_online", label: "Pending online (not COD)" },
];

export const paymentFilterToQuery = (paymentFilter) => {
  if (paymentFilter === "pending_online") {
    return { paymentStatus: "PENDING", paymentMode: "ONLINE" };
  }
  return { paymentStatus: undefined, paymentMode: undefined };
};

/** apiConnector rejects with a string message; success body is { success, message, data } */
export const apiErrMessage = (err, fallback) =>
  typeof err === "string" ? err : err?.response?.data?.message || err?.message || fallback;

export const getBackendErrorMessages = (err, fallback) => {
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

export const showBackendErrorsAsToasts = (err, fallback) => {
  const msgs = getBackendErrorMessages(err, fallback);
  msgs.slice(0, 6).forEach((m) => toast.error(m, { duration: 5500 }));
  return msgs[0] || fallback;
};

export async function copyTextToClipboard(value, label = "Copied") {
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

export function getStorefrontProductUrl(itemId, itemLike) {
  const idStr = itemId != null ? String(itemId) : "";
  if (!idStr) return STORE_PUBLIC_ORIGIN;
  const label = itemLike?.name || itemLike?.sku || "";
  const slug = slugifyForStoreProduct(label);
  const path = slug ? `/product/${slug}/${idStr}` : `/product/${idStr}`;
  return `${STORE_PUBLIC_ORIGIN}${path}`;
}

export function collectItemLikeImageUrls(itemLike) {
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

export function firstOrderLineItem(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items[0] || null;
}

export function orderLineItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

export function orderListLineKey(item, idx) {
  return String(item?.itemId || item?._id || `line-${idx}`);
}

/** Stack each order line in one table cell (same column, one row per order). */
export function OrderListLineStack({ order, children, className = "flex flex-col gap-2 divide-y divide-gray-100" }) {
  const items = orderLineItems(order);
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
export function getLineProductDisplayName(item) {
  if (!item || typeof item !== "object") return "";
  const name = item.name != null ? String(item.name).trim() : "";
  if (name) return name;
  const v = item.variant || {};
  const variantLabel = [v.color, v.size].filter(Boolean).join(" / ");
  if (variantLabel) return variantLabel;
  return String(item.sku || v.sku || "").trim();
}

export function itemLikeFromListRow(row) {
  return row?.item && typeof row.item === "object" ? row.item : {};
}

export function TableItemImageThumb({ itemLike, onPickImage, sizeClass = "h-10 w-10" }) {
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

export function TableStoreLink({ itemId, itemLike }) {
  const url = getStorefrontProductUrl(itemId, itemLike);
  if (!itemId) return <span className="text-xs text-gray-400">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:text-brand-900"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={12} className="shrink-0" />
      Store
    </a>
  );
}

export function StoreItemInfoTrigger({ itemId, itemLike, quantity, onOpenDetails }) {
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

export function StoreOrderInfoTrigger({ order, onOpenDetails }) {
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
export function formatManufacturingModalDate(d) {
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

export function getOrderWalletUsedAmount(order) {
  if (!order) return 0;
  const raw = order.pricing?.walletUsedAmount ?? order.walletUsedAmount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export const ORDER_LIST_COLUMNS_STORAGE_KEY = "khush_admin_order_list_visible_columns";
export const ITEM_LIST_COLUMNS_STORAGE_KEY = "khush_admin_item_list_visible_columns";
export const ORDER_DETAIL_ITEM_COLUMNS_STORAGE_KEY = "khush_admin_order_detail_item_visible_columns";

/** By order — main table column config (render fns added inside Orders). */
export const ORDER_LIST_TABLE_COLUMNS = [
  { key: "info", label: "Store gallery", defaultVisible: true, alwaysVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Order date", defaultVisible: true },
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
export const ITEM_LIST_TABLE_COLUMNS = [
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
  { key: "gatewayOrderId", label: "Gateway order ID", defaultVisible: false },
  { key: "status", label: "Line status", defaultVisible: true },
  { key: "delivery", label: "Delivery", defaultVisible: true },
  { key: "shiprocket", label: "Shiprocket", defaultVisible: false },
];

/** Order detail — line items table (data columns; status/ship/driver/update stay fixed). */
export const ORDER_DETAIL_ITEM_DATA_COLUMNS = [
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

export const ORDER_DETAIL_ITEM_COL_CLASS = {
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

export function orderDetailItemColClass(key) {
  return ORDER_DETAIL_ITEM_COL_CLASS[key] || "min-w-0";
}

/** NORMAL lines that can be included in a new Shiprocket shipment group order. */
export function getShiprocketEligibleItems(order) {
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

export function defaultVisibleKeysFor(columns) {
  return columns.filter((c) => c.defaultVisible).map((c) => c.key);
}

export function loadVisibleColumnsFromStorage(storageKey, columns) {
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

export function persistVisibleColumns(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

export function ColumnPickerDropdown({
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

export function manufacturingPaymentLabel(payment) {
  if (!payment || typeof payment !== "object") return "—";
  const mode = payment.mode != null ? String(payment.mode) : "";
  const status = payment.status != null ? String(payment.status) : "";
  if (mode && status) return `${mode} / ${status}`;
  if (mode) return mode;
  if (status) return status;
  return "—";
}

export function ManufacturingLineCard({ line, lineIndex, totalLines, onPickImage }) {
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
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1 break-all text-xs font-medium text-brand-700 hover:text-brand-900"
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
