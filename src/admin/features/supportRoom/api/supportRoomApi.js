import { apiConnector } from "../../../services/Apiconnector";

const supportEndpoints = {
  ACTIONS: (orderId) => `/admin/support/orders/${encodeURIComponent(orderId)}/actions`,
  ADDRESS: (orderId) => `/admin/support/orders/${encodeURIComponent(orderId)}/address`,
  CANCEL: (orderId) => `/admin/support/orders/${encodeURIComponent(orderId)}/cancel`,
  STATUS: (orderId, itemId) =>
    `/admin/support/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/status`,
  CREATE_RETURN: (orderId, itemId) =>
    `/admin/support/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/returns`,
  CREATE_EXCHANGE: (orderId, itemId) =>
    `/admin/support/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/exchanges`,
  PATCH_RETURN: (id) => `/admin/support/returns/${encodeURIComponent(id)}`,
  PATCH_EXCHANGE: (id) => `/admin/support/exchanges/${encodeURIComponent(id)}`,
  SCHEDULE_RETURN: (id) => `/admin/support/returns/${encodeURIComponent(id)}/schedule`,
  SCHEDULE_EXCHANGE: (id) => `/admin/support/exchanges/${encodeURIComponent(id)}/schedule`,
  SYNC_TRACKING: (orderId) =>
    `/admin/support/orders/${encodeURIComponent(orderId)}/sync-tracking`,
  ISSUE_REFUND: (orderId) =>
    `/admin/support/orders/${encodeURIComponent(orderId)}/refunds`,
};

export const listSupportActions = (orderId, page = 1, limit = 50) =>
  apiConnector(
    "GET",
    `${supportEndpoints.ACTIONS(orderId)}?page=${page}&limit=${limit}`
  );

export const patchSupportAddress = (orderId, body) =>
  apiConnector("PATCH", supportEndpoints.ADDRESS(orderId), body);

export const supportCancelItems = (orderId, body) =>
  apiConnector("POST", supportEndpoints.CANCEL(orderId), body);

export const supportCorrectItemStatus = (orderId, itemId, body) =>
  apiConnector("PATCH", supportEndpoints.STATUS(orderId, itemId), body);

export const supportCreateReturn = (orderId, itemId, body) =>
  apiConnector("POST", supportEndpoints.CREATE_RETURN(orderId, itemId), body);

export const supportCreateExchange = (orderId, itemId, body) =>
  apiConnector("POST", supportEndpoints.CREATE_EXCHANGE(orderId, itemId), body);

export const supportPatchReturn = (id, body) =>
  apiConnector("PATCH", supportEndpoints.PATCH_RETURN(id), body);

export const supportPatchExchange = (id, body) =>
  apiConnector("PATCH", supportEndpoints.PATCH_EXCHANGE(id), body);

export const supportScheduleReturn = (id, body) =>
  apiConnector("POST", supportEndpoints.SCHEDULE_RETURN(id), body);

export const supportScheduleExchange = (id, body) =>
  apiConnector("POST", supportEndpoints.SCHEDULE_EXCHANGE(id), body);

export const supportSyncTracking = (orderId, body) =>
  apiConnector("POST", supportEndpoints.SYNC_TRACKING(orderId), body);

export const supportIssueRefund = (orderId, body) =>
  apiConnector("POST", supportEndpoints.ISSUE_REFUND(orderId), body);
