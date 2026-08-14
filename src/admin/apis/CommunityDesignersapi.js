import { apiConnector } from "../services/Apiconnector";

/**
 * Community designer verification (end-user isDesigner flag).
 * NOT staff DesignerAuth /admin/designer inventory.
 *
 * Base: /api/admin/panels/community-designers
 */
const BASE = "/admin/panels/community-designers";

export const listCommunityDesigners = (params = {}) =>
  apiConnector("GET", `${BASE}/list`, null, {}, params);

export const getCommunityDesigner = (id) =>
  apiConnector("GET", `${BASE}/${id}`);

/** PATCH — only when designerVerificationStatus === pending */
export const verifyCommunityDesigner = (id) =>
  apiConnector("PATCH", `${BASE}/${id}/verify`);

/** PATCH body: { reason } — required, max 500; only when pending */
export const rejectCommunityDesigner = (id, reason) =>
  apiConnector("PATCH", `${BASE}/${id}/reject`, { reason });
