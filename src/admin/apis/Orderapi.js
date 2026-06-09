import { apiConnector } from "../services/Apiconnector";

// ✅ Orders Endpoints
const orderEndpoints = {
  // Get All Orders (with pagination + search + status + date range + sort)
  GET_ORDERS: (page = 1, limit = 10, search = "", status = "", startDate = "", endDate = "", sortBy = "createdAt", sortOrder = "desc", deliveryType = "", paymentStatus = "", paymentMode = "", itemStatusConsistency = "") => {
    let url = `/admin/orders?page=${page}&limit=${limit}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    if (status) {
      url += `&orderStatus=${encodeURIComponent(status)}`;
    }

    if (startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
    }

    if (endDate) {
      url += `&endDate=${encodeURIComponent(endDate)}`;
    }

    if (sortBy) {
      url += `&sortBy=${encodeURIComponent(sortBy)}`;
    }

    if (sortOrder) {
      url += `&sortOrder=${encodeURIComponent(sortOrder)}`;
    }

    if (deliveryType) {
      url += `&deliveryType=${encodeURIComponent(deliveryType)}`;
    }

    if (paymentStatus) {
      url += `&paymentStatus=${encodeURIComponent(paymentStatus)}`;
    }

    if (paymentMode) {
      url += `&paymentMode=${encodeURIComponent(paymentMode)}`;
    }

    if (itemStatusConsistency) {
      url += `&itemStatusConsistency=${encodeURIComponent(itemStatusConsistency)}`;
    }

    return url;
  },
  GET_STATUS_ANALYTICS: ({
    view = "order",
    search = "",
    startDate = "",
    endDate = "",
    deliveryType = "",
    paymentStatus = "",
    paymentMode = "",
    itemStatusConsistency = "",
    exchangeOnly = false,
  } = {}) => {
    const params = new URLSearchParams();
    params.set("view", view || "order");
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (deliveryType) params.set("deliveryType", deliveryType);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (paymentMode) params.set("paymentMode", paymentMode);
    if (itemStatusConsistency) {
      params.set("itemStatusConsistency", itemStatusConsistency);
    }
    if (exchangeOnly) params.set("exchangeOnly", "true");
    return `/admin/orders/analytics/status-counts?${params.toString()}`;
  },
  GET_INVOICE: (orderId, itemId) =>
  `/order/invoice/${orderId}/${itemId}`,

  // Get All Order Items (item-based list for admin)
  GET_ORDER_ITEMS: (page = 1, limit = 20, search = "", orderStatus = "", itemStatus = "", startDate = "", endDate = "", deliveryType = "", paymentStatus = "", paymentMode = "") => {
    let url = `/admin/orders/items?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (orderStatus) url += `&orderStatus=${encodeURIComponent(orderStatus)}`;
    if (itemStatus) url += `&itemStatus=${encodeURIComponent(itemStatus)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (deliveryType) url += `&deliveryType=${encodeURIComponent(deliveryType)}`;
    if (paymentStatus) url += `&paymentStatus=${encodeURIComponent(paymentStatus)}`;
    if (paymentMode) url += `&paymentMode=${encodeURIComponent(paymentMode)}`;
    return url;
  },

  /** POST: filters + allPages (default true) = all matching lines; maxExportRows (≤15000); or allPages false + page + limit */
  MANUFACTURING_SHEET_PDF: `/admin/orders/items/manufacturing-sheet`,

  STALE_ORDERS_LIST: (hours = 24) =>
    `/admin/orders/stale-alert/list?hours=${encodeURIComponent(hours)}`,
  STALE_ORDERS_PDF: (hours = 24) =>
    `/admin/orders/stale-alert/preview?hours=${encodeURIComponent(hours)}`,
  STALE_ORDERS_RUN: `/admin/orders/stale-alert/run`,

  // Get Single Order (with item pagination)
  GET_SINGLE_ORDER: (orderId, itemPage = 1, itemLimit = 10) =>
    `/admin/orders/${orderId}?itemPage=${itemPage}&itemLimit=${itemLimit}`,

  /** Append optional staff note (text + server timestamp); multiple notes allowed */
  APPEND_ORDER_NOTE: (orderId) => `/admin/orders/${orderId}/notes`,

  /** Admin override: mark online payment SUCCESS and confirm order */
  FORCE_SUCCESS_PAYMENT: (orderId) => `/admin/orders/${orderId}/payment/force-success`,

  /** Create one Shiprocket order per shipmentGroupId (NORMAL) */
  CREATE_SHIPROCKET_FOR_SHIPMENTS: (orderId) => `/admin/orders/${orderId}/shiprocket/create`,

  // Update Single Item Status inside Order
  UPDATE_ITEM_STATUS: (orderId, itemId) =>
    `/admin/orders/${orderId}/items/${itemId}/status`,

  // Update whole order status (all items to same status)
  UPDATE_WHOLE_ORDER_STATUS: (orderId) => `/admin/orders/${orderId}/status`,

  // Delivery assignment (orderId + itemId flow before marking SHIPPED)
  ASSIGNMENT_VIEW: (orderId) => `/admin/orders/${orderId}/assignment-view`,
  ASSIGN_WHOLE_ORDER: (orderId) => `/admin/orders/${orderId}/assign`,
  ASSIGN_ITEMS: (orderId) => `/admin/orders/${orderId}/assign-items`,
  UNASSIGN: (orderId) => `/admin/orders/${orderId}/unassign`,

  // Delivery agents list (for driver dropdown)
  DELIVERY_AGENTS_LIST: (page = 1, limit = 100) =>
    `/admin/panels/delivery-agent/list?page=${page}&limit=${limit}`,

  EXCHANGE_DETAILS: (exchangeId) => `/exchangeUser/${exchangeId}`,
  APPROVE_EXCHANGE: (exchangeId) => `/exchangeUser/approve/${exchangeId}`,
  APPROVE_EXCHANGE_ALT: (exchangeId) => `/exchangeUser/${exchangeId}/approve`,


// Shipping Label Download
DOWNLOAD_SHIPPING_LABEL: `/admin/orders/shipping-labels/download`,
 
MANIFEST_DOWNLOAD: `/admin/orders/manifests/download`,

FORWARD_SHIPMENT: (exchangeId) =>
  `/exchangeUser/forward-shipment/${exchangeId}`,
};
// ✅ Download Shipping Label
export const downloadShippingLabel = (shipmentIds) => {
  return apiConnector(
    "POST",
    orderEndpoints.DOWNLOAD_SHIPPING_LABEL,
    {
      shipment_id: shipmentIds, // array required
    },
    {},
    {},
    {}
  );
};
//download Manifest
export const downloadManifest = (shipmentIds) => {
  return apiConnector(
    "POST",
    orderEndpoints.MANIFEST_DOWNLOAD,
    {
      shipment_id: shipmentIds, // must be array
    },
    {},
    {},
    {}
  );
};

/** Manufacturing / fulfilment PDF (blob). Long timeout — full export + many images can exceed 1–2 minutes. */
export const downloadManufacturingSheetPdf = (body = {}) => {
  return apiConnector(
    "POST",
    orderEndpoints.MANUFACTURING_SHEET_PDF,
    body,
    {},
    {},
    { responseType: "blob", timeout: 300000 }
  );
};

/** Stale CONFIRMED lines (no status change for `hours`). */
export const getStaleOrders = (hours = 24) => {
  return apiConnector("GET", orderEndpoints.STALE_ORDERS_LIST(hours));
};

export const downloadStaleOrdersPdf = (hours = 24) => {
  return apiConnector(
    "GET",
    orderEndpoints.STALE_ORDERS_PDF(hours),
    null,
    {},
    {},
    { responseType: "blob", timeout: 120000 }
  );
};

export const runStaleOrderAlertEmail = (hours = 24) => {
  return apiConnector("POST", orderEndpoints.STALE_ORDERS_RUN, { hours });
};
// ✅ Get All Orders
export const getOrders = (page, limit, search, status, startDate, endDate, sortBy, sortOrder, deliveryType, paymentStatus, paymentMode, itemStatusConsistency = "") => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_ORDERS(page, limit, search, status, startDate, endDate, sortBy, sortOrder, deliveryType, paymentStatus, paymentMode, itemStatusConsistency)
  );
};

export const getOrderStatusAnalytics = (params = {}) => {
  return apiConnector("GET", orderEndpoints.GET_STATUS_ANALYTICS(params));
};

// ✅ Get All Order Items (item-based list)
export const getOrderItems = (page, limit, search, orderStatus, itemStatus, startDate, endDate, deliveryType, paymentStatus, paymentMode) => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_ORDER_ITEMS(page, limit, search, orderStatus, itemStatus, startDate, endDate, deliveryType, paymentStatus, paymentMode)
  );
};

// ✅ Get Single Order
export const getSingleOrder = (orderId, itemPage, itemLimit) => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_SINGLE_ORDER(orderId, itemPage, itemLimit)
  );
};

// ✅ Append order note (optional text; saved with date/time on server)
export const appendOrderNote = (orderId, body) => {
  return apiConnector(
    "POST",
    orderEndpoints.APPEND_ORDER_NOTE(orderId),
    body
  );
};

export const forceSuccessPaymentAndConfirm = (orderId, body) => {
  return apiConnector(
    "POST",
    orderEndpoints.FORCE_SUCCESS_PAYMENT(orderId),
    body
  );
};

export const createShiprocketForOrderShipments = (orderId, body = {}) => {
  return apiConnector(
    "POST",
    orderEndpoints.CREATE_SHIPROCKET_FOR_SHIPMENTS(orderId),
    body
  );
};

// ✅ Update Item Status
export const updateOrderItemStatus = (orderId, itemId, data) => {
  return apiConnector(
    "PATCH", // change to PUT if backend uses PUT
    orderEndpoints.UPDATE_ITEM_STATUS(orderId, itemId),
    data
  );
};

// ✅ Update whole order status (all items to same status)
export const updateWholeOrderStatus = (orderId, data) => {
  return apiConnector(
    "PATCH",
    orderEndpoints.UPDATE_WHOLE_ORDER_STATUS(orderId),
    data
  );
};

// ✅ Delivery assignment APIs (run before marking item as SHIPPED)
export const getAssignmentView = (orderId) => {
  return apiConnector("GET", orderEndpoints.ASSIGNMENT_VIEW(orderId));
};

export const assignWholeOrder = (orderId, deliveryAgentId) => {
  return apiConnector("POST", orderEndpoints.ASSIGN_WHOLE_ORDER(orderId), {
    deliveryAgentId,
  });
};

export const assignItems = (orderId, deliveryAgentId, itemIds) => {
  return apiConnector("POST", orderEndpoints.ASSIGN_ITEMS(orderId), {
    deliveryAgentId,
    itemIds,
  });
};

export const unassignOrder = (orderId, body) => {
  return apiConnector("POST", orderEndpoints.UNASSIGN(orderId), body);
};

export const listDeliveryAgents = (page = 1, limit = 100) => {
  return apiConnector("GET", orderEndpoints.DELIVERY_AGENTS_LIST(page, limit));
};


// ===============================
// ADD THIS IN orderEndpoints
// ===============================

// ✅ Create Forward Shipment (Exchange replacement)
export const createForwardShipment = (exchangeId) => {
  const url = orderEndpoints.FORWARD_SHIPMENT(exchangeId);
  return apiConnector("POST", url).catch((postErr) => {
    const postMsg = String(postErr?.message || "").toLowerCase();
    const shouldTryPatch =
      postMsg.includes("method not allowed") ||
      postMsg.includes("not found") ||
      postMsg.includes("cannot") ||
      postMsg.includes("unsupported");
    if (!shouldTryPatch) throw postErr;
    return apiConnector("PATCH", url).catch(() => {
      throw postErr;
    });
  });
};

// ===============================
// ADD THIS FUNCTION
// ===============================
export const getInvoice = (orderId, itemId) => {
  // Default JSON — backend returns { is_invoice_created, invoice_url, ... }.
  // Do NOT use responseType: "blob" for that, or axios wraps JSON in a Blob and the
  // UI opens a blob: URL of JSON text (broken "PDF") instead of the S3 invoice_url.
  return apiConnector("GET", orderEndpoints.GET_INVOICE(orderId, itemId));
};


// ===============================
// ADD THIS IN orderEndpoints
// ===============================



// ===============================
// ADD THIS FUNCTION
// ===============================
export const getExchangeDetails = (exchangeId) => {
  return apiConnector(
    "GET",
    orderEndpoints.EXCHANGE_DETAILS(exchangeId)
  );
};

export const approveExchange = (exchangeId) => {
  const primaryUrl = orderEndpoints.APPROVE_EXCHANGE(exchangeId);
  const fallbackUrl = orderEndpoints.APPROVE_EXCHANGE_ALT(exchangeId);

  return apiConnector("PATCH", primaryUrl).catch((patchErr) => {
    return apiConnector("POST", primaryUrl).catch((postErr) => {
      return apiConnector("PATCH", fallbackUrl).catch(() => {
        return apiConnector("POST", fallbackUrl).catch(() => {
          throw postErr?.response?.data ? postErr : patchErr;
        });
      });
    });
  });
};