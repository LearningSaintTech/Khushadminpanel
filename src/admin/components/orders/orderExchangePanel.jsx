import {
  formatStatusTokenForUi,
  getLatestExchange,
  getUiItemStatus,
  isExchangeLineItem,
} from "./orderStatusUtils";

export const extractExchangeImageUrls = (exchange) => {
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

export const getExchangeReason = (exchange) => {
  if (!exchange || typeof exchange !== "object") return "";
  const reason =
    exchange.reason ||
    exchange.exchangeReason ||
    exchange.requestReason ||
    exchange.note ||
    "";
  return String(reason || "").trim();
};

export const exchangeHasVisibleDetails = (exchange, item) => {
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

export function ExchangeDetailsPanel({ item, onZoomImage, getLineProductDisplayName }) {
  const latestExchange = getLatestExchange(item);
  if (!exchangeHasVisibleDetails(latestExchange, item)) return null;

  const exchangeImageUrls = extractExchangeImageUrls(latestExchange);
  const exchangeReason = getExchangeReason(latestExchange);
  const orderedVariant = item?.variant || latestExchange?.item?.variant || {};
  const replacement = latestExchange?.replacedItem;
  const replacementVariant = replacement?.variant || {};
  const productName =
    getLineProductDisplayName?.(item) ||
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
  const lineStatus = formatStatusTokenForUi(getUiItemStatus(item));

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-canvas-muted/25 px-2 py-1.5 text-[10px] leading-snug">
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
            <span className="shrink-0 rounded bg-brand-50 px-1 py-0.5 text-[8px] font-semibold text-brand-800 ring-1 ring-brand-200">
              {lineStatus}
            </span>
          </div>
          <p className="truncate text-[9px] text-stone-600">
            <span className="text-stone-400">Now</span> {currentVariantLabel || "—"}
            <span className="mx-0.5 text-stone-300">→</span>
            <span className="font-medium text-brand-800">
              {wantedVariantLabel || replacementLabel || replacement?.sku || "—"}
            </span>
            {latestExchange?.quantityToExchange ? (
              <span className="text-stone-400"> · Qty {latestExchange.quantityToExchange}</span>
            ) : null}
          </p>
          {exchangeReason ? (
            <p className="line-clamp-1 text-[9px] text-stone-500" title={exchangeReason}>
              {exchangeReason}
            </p>
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
