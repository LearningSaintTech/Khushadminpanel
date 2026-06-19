/**
 * Admin orders analytics — same shape as Order Agent sidebar-counts API.
 * Kept under admin/ so Order Agent can be removed without coupling.
 */

export function unwrapApiData(response) {
  return response?.data ?? response ?? {};
}

function normalizeStatusToken(status) {
  const upper = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!upper) return "";
  if (upper === "CANCELED") return "CANCELLED";
  return upper;
}

/** Human label — mirrors backend orderStatusMeta.util.js */
export function formatStatusDisplayLabel(value, fallbackLabel = "") {
  const key = normalizeStatusToken(value) || String(value || "").trim();
  if (!key) return "";
  if (fallbackLabel && fallbackLabel !== key) return String(fallbackLabel).trim();
  if (/^[A-Z0-9_]+$/.test(key)) {
    return key
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  return key;
}

export function toStatusCountMap(counts = []) {
  const map = new Map();
  for (const row of counts) {
    const status = row?.status;
    if (!status) continue;
    map.set(String(status), row.count ?? 0);
  }
  return map;
}

export function sectionTotalFromPayload(section, { isOrderView = false } = {}) {
  const lineTotal = section?.total ?? 0;
  if (isOrderView) return lineTotal;
  const documentTotal = section?.documentTotal ?? 0;
  return lineTotal + documentTotal;
}

/**
 * Build analytics cards from sidebar-counts payload (live DB + backend labels).
 * @param {"orders"|"exchange"|"returns"} section
 */
export function buildAdminAnalyticsCards(section, sidebarPayload, { isOrderView = false } = {}) {
  if (!sidebarPayload || !section) return [];

  const sectionData = sidebarPayload[section];
  const countMap = toStatusCountMap(sectionData?.counts);
  const options = sidebarPayload.statusOptions?.[section] || [];

  const labelByValue = new Map();
  for (const opt of options) {
    if (!opt?.value) continue;
    labelByValue.set(
      String(opt.value),
      formatStatusDisplayLabel(opt.value, opt.label),
    );
  }

  const cards = [];
  for (const [status, count] of countMap.entries()) {
    if (count <= 0) continue;
    cards.push({
      status,
      label: labelByValue.get(status) || formatStatusDisplayLabel(status),
      count,
    });
  }

  return cards.sort((a, b) => b.count - a.count);
}

export function getAdminAnalyticsSection({ exchangeOnly = false, returnOnly = false } = {}) {
  if (returnOnly) return "returns";
  if (exchangeOnly) return "exchange";
  return "orders";
}

export function getStatusOptionsForSection(sidebarPayload, section) {
  const list = sidebarPayload?.statusOptions?.[section];
  if (!Array.isArray(list)) return [];
  return list.filter((opt) => opt?.value);
}

export function toProviderCountMap(counts = []) {
  const map = new Map();
  for (const row of counts) {
    const provider = row?.provider;
    if (!provider) continue;
    map.set(String(provider).toUpperCase(), row.count ?? 0);
  }
  return map;
}

const PROVIDER_CARD_ORDER = ["SHIPROCKET", "DELHIVERY", "SHADOWFAX", "SELF_SHIPPING"];

/** Carrier analytics cards from sidebar-counts shippingProviders section. */
export function buildAdminProviderAnalyticsCards(sidebarPayload) {
  if (!sidebarPayload) return [];

  const countMap = toProviderCountMap(sidebarPayload.shippingProviders?.counts);
  const options = sidebarPayload.statusOptions?.shippingProviders || [];
  const labelByValue = new Map();
  for (const opt of options) {
    if (!opt?.value) continue;
    labelByValue.set(
      String(opt.value).toUpperCase(),
      formatStatusDisplayLabel(opt.value, opt.label),
    );
  }

  const cards = [];
  const seen = new Set();

  for (const provider of PROVIDER_CARD_ORDER) {
    const count = countMap.get(provider) ?? 0;
    if (count <= 0) continue;
    seen.add(provider);
    cards.push({
      provider,
      label: labelByValue.get(provider) || formatStatusDisplayLabel(provider),
      count,
    });
  }

  for (const [provider, count] of countMap.entries()) {
    if (seen.has(provider) || count <= 0) continue;
    cards.push({
      provider,
      label: labelByValue.get(provider) || formatStatusDisplayLabel(provider),
      count,
    });
  }

  return cards;
}

export function getStaleAnalyticsFromPayload(sidebarPayload) {
  const stale = sidebarPayload?.stale;
  if (!stale) return null;
  return {
    count: stale.count ?? 0,
    thresholdHours: stale.thresholdHours ?? 24,
  };
}

export { normalizeStatusToken };
