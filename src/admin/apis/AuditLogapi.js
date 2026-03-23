import { apiConnector } from "../services/Apiconnector";

const getData = (res) => res?.data ?? res;

export const auditLogApi = {
  listAuditLogs: (params = {}) =>
    apiConnector("GET", `/admin/audit-logs`, null, {}, params).then(getData),
};

