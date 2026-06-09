export const getItemExchangeIds = (item) =>
  Array.isArray(item?.exchanges)
    ? item.exchanges.map((ex) => ex?._id).filter(Boolean).map(String)
    : [];

export const getLatestExchangeId = (item) => {
  const exchanges = Array.isArray(item?.exchanges) ? [...item.exchanges] : [];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0]?._id ? String(exchanges[0]._id) : null;
};

export const getLatestExchange = (item) => {
  const exchanges = Array.isArray(item?.exchanges) ? [...item.exchanges] : [];
  if (exchanges.length === 0) return null;
  exchanges.sort((a, b) => {
    const aTs = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTs = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTs - aTs;
  });
  return exchanges[0] || null;
};

export const isExchangeStatus = (status) =>
  String(status || "").toUpperCase().startsWith("EXCHANGE_");

export const isExchangeLineItem = (item) => {
  if (!item) return false;
  if (isExchangeStatus(item?.status)) return true;
  if (Array.isArray(item?.exchanges) && item.exchanges.length > 0) return true;
  const ex = getLatestExchange(item);
  if (!ex) return false;
  if (ex.isExchangeRequested === true) return true;
  if (ex.status && mapExchangeDocumentStatusToItemStatus(ex.status)) return true;
  return Boolean(ex.reason || ex.replacedItem || ex.desiredSize || ex.desiredColor);
};

export const isExchangeOrderEntry = (order) => {
  if (isExchangeStatus(order?.status || order?.orderStatus)) return true;
  return Array.isArray(order?.items) && order.items.some((item) => isExchangeLineItem(item));
};

export const isNormalDeliveryLine = (item) =>
  String(item?.delivery?.type || "").toUpperCase() === "NORMAL";

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

const EXCHANGE_FLOW_RANK = {
  EXCHANGE_REQUESTED: 10,
  EXCHANGE_APPROVED: 20,
  EXCHANGE_PICKUP_SCHEDULED: 30,
  EXCHANGE_PICKUP_EXCEPTION: 35,
  EXCHANGE_OUT_FOR_PICKUP: 40,
  EXCHANGE_PICKED: 50,
  EXCHANGE_RETURN_IN_TRANSIT: 55,
  EXCHANGE_RECEIVED: 60,
  EXCHANGE_PROCESSING: 70,
  EXCHANGE_SHIPPED: 80,
  EXCHANGE_OUT_FOR_DELIVERY: 90,
  EXCHANGE_DELIVERED: 100,
  EXCHANGE_COMPLETED: 110,
};

export const normalizeItemStatusToken = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

export const mapExchangeDocumentStatusToItemStatus = (raw) => {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!k) return null;
  if (k.startsWith("exchange")) {
    const mapped = mapExchangeDocumentStatusToItemStatus(k.replace(/^exchange/, ""));
    if (mapped) return mapped;
  }
  const map = {
    requested: "EXCHANGE_REQUESTED",
    pending: "EXCHANGE_REQUESTED",
    exchangerequested: "EXCHANGE_REQUESTED",
    approved: "EXCHANGE_APPROVED",
    rejected: "EXCHANGE_REJECTED",
    pickupscheduled: "EXCHANGE_PICKUP_SCHEDULED",
    pickupexception: "EXCHANGE_PICKUP_EXCEPTION",
    pickuprescheduled: "EXCHANGE_PICKUP_EXCEPTION",
    outforpickup: "EXCHANGE_OUT_FOR_PICKUP",
    exchangeforpickup: "EXCHANGE_OUT_FOR_PICKUP",
    exchangeoutforpickup: "EXCHANGE_OUT_FOR_PICKUP",
    outforexchangepickup: "EXCHANGE_OUT_FOR_PICKUP",
    forpickup: "EXCHANGE_OUT_FOR_PICKUP",
    exchangepicked: "EXCHANGE_PICKED",
    pickedup: "EXCHANGE_PICKED",
    picked: "EXCHANGE_PICKED",
    returnintransit: "EXCHANGE_RETURN_IN_TRANSIT",
    returnpickedup: "EXCHANGE_PICKED",
    exchangereceived: "EXCHANGE_RECEIVED",
    exchangeprocessing: "EXCHANGE_PROCESSING",
    exchangeshipped: "EXCHANGE_SHIPPED",
    exchangeoutfordelivery: "EXCHANGE_OUT_FOR_DELIVERY",
    exchangedelivered: "EXCHANGE_DELIVERED",
    exchangecompleted: "EXCHANGE_COMPLETED",
  };
  if (map[k]) return normalizeItemStatusToken(map[k]);
  const upper = normalizeItemStatusToken(raw);
  if (upper.startsWith("EXCHANGE_")) return upper;
  return null;
};

/** Best exchange status from exchange doc + Shiprocket legs. */
export const resolveExchangeStatusFromDocument = (exchange) => {
  if (!exchange || typeof exchange !== "object") return null;
  const candidates = [
    exchange.status,
    exchange.exchangeStatus,
    exchange.state,
    exchange.shiprocket?.returnOrder?.status,
    exchange.shiprocket?.forwardOrder?.status,
  ];
  for (const raw of candidates) {
    const mapped =
      mapExchangeDocumentStatusToItemStatus(raw) ||
      mapShiprocketReturnStatusToItemStatus(raw) ||
      mapShiprocketForwardStatusToItemStatus(raw);
    if (mapped) return mapped;
  }
  if (exchange.isExchangeRequested === true) return "EXCHANGE_REQUESTED";
  return null;
};

export const mapShiprocketOutboundStatusToItemStatus = (raw) => {
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

export const mapShiprocketReturnStatusToItemStatus = (raw) => {
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

export const mapShiprocketForwardStatusToItemStatus = (raw) => {
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
  const add = (s, { exchange = false } = {}) => {
    if (!s) return;
    const mapped =
      mapShiprocketOutboundStatusToItemStatus(s) ||
      mapShiprocketReturnStatusToItemStatus(s) ||
      mapShiprocketForwardStatusToItemStatus(s) ||
      (exchange ? mapExchangeDocumentStatusToItemStatus(s) : null);
    if (mapped) candidates.push(mapped);
    const normalized = normalizeItemStatusToken(s);
    if (normalized) candidates.push(normalized);
  };

  add(item?.status);
  if (Array.isArray(item?.statusHistory)) {
    for (const h of item.statusHistory) add(h?.status);
  }

  if (isExchangeLineItem(item)) {
    const ex = getLatestExchange(item);
    if (ex) {
      add(ex.status, { exchange: true });
      add(ex.exchangeStatus, { exchange: true });
      add(ex.state, { exchange: true });
      add(ex.shiprocket?.returnOrder?.status);
      add(ex.shiprocket?.forwardOrder?.status);
      const resolved = resolveExchangeStatusFromDocument(ex);
      if (resolved) candidates.push(resolved);
    }
  } else if (isNormalDeliveryLine(item)) {
    add(item?.shiprocket?.status);
  }

  return candidates;
};

export const getDisplayItemStatus = (item) => {
  if (!item) return "";
  const baseRaw = item?.status || "";
  const base = normalizeItemStatusToken(baseRaw);
  if (base === "EXCHANGE_REJECTED") return "EXCHANGE_REJECTED";
  if (base === "CANCELLED" || base === "CANCELED") return "CANCELLED";
  if (isExchangeStatus(base)) return base;

  const candidates = collectItemStatusCandidates(item);

  if (isExchangeLineItem(item)) {
    const exBest = pickHighestDisplayStatus(candidates, { exchangeOnly: true });
    if (exBest) return exBest;
    const fromDoc = resolveExchangeStatusFromDocument(getLatestExchange(item));
    if (fromDoc) return fromDoc;
    if (Array.isArray(item?.exchanges) && item.exchanges.length > 0) {
      return "EXCHANGE_REQUESTED";
    }
  }

  const best = pickHighestDisplayStatus(candidates);
  return best || baseRaw || "";
};

export const getDisplayOrderStatus = (order) => {
  const items = order?.items;
  if (Array.isArray(items) && items.length > 0) {
    if (items.length === 1) {
      return getDisplayItemStatus(items[0]) || order?.status || order?.orderStatus || "";
    }
    const shown = items.map((it) => getDisplayItemStatus(it)).filter(Boolean);
    if (shown.length > 0) {
      const exchangeStatuses = shown.filter((s) => isExchangeStatus(s));
      if (exchangeStatuses.length > 0) {
        return pickHighestDisplayStatus(exchangeStatuses) || pickHighestDisplayStatus(shown);
      }
      return pickHighestDisplayStatus(shown) || order?.status || order?.orderStatus || "";
    }
  }
  return order?.status || order?.orderStatus || "";
};

/** Status shown in badges, selects, and filters — one source of truth. */
export const getUiItemStatus = (item) =>
  getDisplayItemStatus(item) || normalizeItemStatusToken(item?.status || "") || "";

export const formatStatusTokenForUi = (token) => {
  if (token == null || token === "") return "—";
  const s = String(token).trim();
  if (!s) return "—";
  const t = s.toUpperCase().replace(/_/g, " ");
  return t.charAt(0) + t.slice(1).toLowerCase();
};

export const getLatestExchangeForwardOrder = (item) => {
  const latest = getLatestExchange(item);
  const forward = latest?.shiprocket?.forwardOrder;
  if (!forward || typeof forward !== "object") return null;
  return forward;
};

export const lineItemFromOrderItemRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const nested = row.item && typeof row.item === "object" ? row.item : {};
  return {
    ...nested,
    status: row.itemStatus ?? nested.status ?? "",
    statusHistory: nested.statusHistory,
    exchanges: nested.exchanges,
    shiprocket: nested.shiprocket ?? row.shiprocket,
    courier: nested.courier ?? row.courier,
    delivery:
      nested.delivery ||
      (row.deliveryType ? { type: row.deliveryType } : undefined),
  };
};
