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

function getPayload(res) {
  const body = res?.data ?? res;
  if (body && typeof body === "object" && body.data != null && typeof body.data === "object") {
    return body.data;
  }
  return body;
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

  mobilePushRegister: (body) =>
    apiConnector("POST", `${BASE}/mobile-push/register`, body).then(getData),

  mobilePushUnregister: (token) =>
    apiConnector("POST", `${BASE}/mobile-push/unregister`, { token }).then(getData),
};

/** Admin-only APIs (send) – may 403 for SubAdmin */
export const adminNotificationApi = {
  broadcast: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/broadcast`, body).then(getPayload),

  getBroadcastStatus: (id) =>
    apiConnector("GET", `${ADMIN_BASE}/broadcast/${id}`).then(getPayload),

  cancelBroadcast: (id) =>
    apiConnector("POST", `${ADMIN_BASE}/broadcast/${id}/cancel`).then(getPayload),

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

  listWhatsappModules: () =>
    apiConnector("GET", `${ADMIN_BASE}/whatsapp/modules`).then(getData),

  listWhatsappVariables: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/whatsapp/variables`, null, {}, params).then(getData),

  registerWhatsappVariable: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/whatsapp/variables`, body).then(getData),

  listWhatsappTemplates: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/whatsapp/templates`, null, {}, params).then(getData),

  updateWhatsappTemplateConfig: (id, body) =>
    apiConnector("PUT", `${ADMIN_BASE}/whatsapp/templates/${id}/config`, body).then(getData),

  syncWhatsappTemplates: () =>
    apiConnector("POST", `${ADMIN_BASE}/whatsapp/templates/sync`).then(getData),

  seedWhatsappEnvMappings: () =>
    apiConnector("POST", `${ADMIN_BASE}/whatsapp/templates/seed-env-mappings`).then(getData),

  linkWhatsappTemplateKey: (id, body) =>
    apiConnector("PUT", `${ADMIN_BASE}/whatsapp/templates/${id}/link`, body).then(getData),

  createWhatsappTemplateOnMeta: (body) =>
    apiConnector("POST", `${ADMIN_BASE}/whatsapp/templates/create`, body).then(getData),

  listWhatsappMessages: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/whatsapp/messages`, null, {}, params).then(getData),

  listNotificationSegments: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/segments`, null, {}, params).then(getData),

  getNotificationSegment: (code) =>
    apiConnector("GET", `${ADMIN_BASE}/segments/${encodeURIComponent(code)}`).then(getData),

  updateNotificationSegmentConfig: (code, body) =>
    apiConnector("PUT", `${ADMIN_BASE}/segments/${encodeURIComponent(code)}/config`, body).then(getData),

  previewNotificationSegment: (code, body = {}) =>
    apiConnector("POST", `${ADMIN_BASE}/segments/${encodeURIComponent(code)}/preview`, body).then(getData),

  sendNotificationSegment: (code, body) =>
    apiConnector("POST", `${ADMIN_BASE}/segments/${encodeURIComponent(code)}/send`, body).then(getData),

  listSegmentSendHistory: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/segments/history/list`, null, {}, params).then(getData),

  getSegmentSendHistoryDetail: (historyId, params = {}) =>
    apiConnector(
      "GET",
      `${ADMIN_BASE}/segments/history/detail/${encodeURIComponent(historyId)}`,
      null,
      {},
      params,
    ).then(getData),

  getSegmentRoiSummary: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/segments/roi/summary`, null, {}, params).then(getData),

  getSegmentRequirementsMap: () =>
    apiConnector("GET", `${ADMIN_BASE}/segments/requirements`).then(getData),

  listSegmentSchedules: (params = {}) =>
    apiConnector("GET", `${ADMIN_BASE}/segments/schedules/list`, null, {}, params).then(getData),

  cancelSegmentSchedule: (scheduleId) =>
    apiConnector("DELETE", `${ADMIN_BASE}/segments/schedules/${encodeURIComponent(scheduleId)}`).then(getData),
};
