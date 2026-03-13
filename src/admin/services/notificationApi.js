/**
 * Notification API – list, unread count, mark read, push subscribe (all flows).
 * Admin-only: broadcast, templates CRUD.
 * Uses apiConnector (token from localStorage).
 */
import { apiConnector } from "./Apiconnector.js";

const BASE = "/notification";
const ADMIN_BASE = "/admin/notification";

function getData(res) {
  return res?.data ?? res;
}

/** User APIs – Admin, SubAdmin, Driver (receive) */
export const notificationApi = {
  getList: (params = {}) =>
    apiConnector("GET", `${BASE}/list`, null, {}, params).then(getData),

  getUnreadCount: () =>
    apiConnector("GET", `${BASE}/unread-count`).then(getData),

  markRead: (id) =>
    apiConnector("PATCH", `${BASE}/${id}/read`).then(getData),

  markAllRead: () =>
    apiConnector("PATCH", `${BASE}/read-all`).then(getData),

  pushSubscribe: (subscription, deviceLabel) =>
    apiConnector("POST", `${BASE}/push-subscribe`, {
      subscription,
      deviceLabel,
    }).then(getData),

  pushUnsubscribe: (endpoint) =>
    apiConnector("POST", `${BASE}/push-unsubscribe`, { endpoint }).then(getData),
};

/** Admin-only APIs (send) – may 403 for SubAdmin */
export const adminNotificationApi = {
  broadcast: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/broadcast`, body).then(getData),

  listTemplates: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/templates`, null, {}, params).then(getData),

  createTemplate: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/templates`, body).then(getData),

  updateTemplate: (id, body) =>
    apiConnector("PUT", `${ADMIN_BASE}/templates/${id}`, body).then(getData),

  deleteTemplate: (id) =>
    apiConnector("DELETE", `${ADMIN_BASE}/templates/${id}`).then(getData),

  listEmailTemplates: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/email-templates`, null, {}, params).then(getData),

  createEmailTemplate: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/email-templates`, body).then(getData),

  updateEmailTemplate: (id, body) =>
    apiConnector("PUT", `${ADMIN_BASE}/email-templates/${id}`, body).then(getData),

  deleteEmailTemplate: (id) =>
    apiConnector("DELETE", `${ADMIN_BASE}/email-templates/${id}`).then(getData),

  getHistory: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/history`, null, {}, params).then(getData),

  testEmail: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/test-email`, body).then(getData),

  testSms: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/test-sms`, body).then(getData),

  testWhatsApp: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/test-whatsapp`, body).then(getData),
};
