import { apiConnector } from "../services/Apiconnector";

// ✅ Orders Endpoints
const orderEndpoints = {
  // Get All Orders (with pagination + search + status)
  GET_ORDERS: (page = 1, limit = 10, search = "", status = "") => {
    let url = `/admin/orders?page=${page}&limit=${limit}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    if (status) {
      url += `&orderStatus=${status}`;
    }

    return url;
  },

  // Get All Order Items (item-based list for admin)
  GET_ORDER_ITEMS: (page = 1, limit = 20, search = "", orderStatus = "", itemStatus = "", startDate = "", endDate = "") => {
    let url = `/admin/orders/items?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (orderStatus) url += `&orderStatus=${encodeURIComponent(orderStatus)}`;
    if (itemStatus) url += `&itemStatus=${encodeURIComponent(itemStatus)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    return url;
  },

  // Get Single Order (with item pagination)
  GET_SINGLE_ORDER: (orderId, itemPage = 1, itemLimit = 10) =>
    `/admin/orders/${orderId}?itemPage=${itemPage}&itemLimit=${itemLimit}`,

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
};

// ✅ Get All Orders
export const getOrders = (page, limit, search, status) => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_ORDERS(page, limit, search, status)
  );
};

// ✅ Get All Order Items (item-based list)
export const getOrderItems = (page, limit, search, orderStatus, itemStatus, startDate, endDate) => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_ORDER_ITEMS(page, limit, search, orderStatus, itemStatus, startDate, endDate)
  );
};

// ✅ Get Single Order
export const getSingleOrder = (orderId, itemPage, itemLimit) => {
  return apiConnector(
    "GET",
    orderEndpoints.GET_SINGLE_ORDER(orderId, itemPage, itemLimit)
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