import { apiConnector } from "../services/Apiconnector";

/**
 * Community designer verification (end-user isDesigner flag).
 * NOT staff DesignerAuth /admin/designer inventory.
 *
 * GET /api/admin/panels/community-designers/list
 */
const BASE = "/admin/panels/community-designers";

async function loggedDesignerCall(label, method, url, runner) {
  console.log(`[Community designers] ${label} →`, { method, url });
  try {
    const res = await runner();
    console.log(`[Community designers] ${label} ←`, res);
    return res;
  } catch (err) {
    console.error(`[Community designers] ${label} ✕`, err);
    throw err;
  }
}

export const listCommunityDesigners = (params = {}) =>
  loggedDesignerCall("list", "GET", `${BASE}/list`, () =>
    apiConnector("GET", `${BASE}/list`, null, {}, params),
  );

export const getCommunityDesigner = (id) =>
  loggedDesignerCall("get", "GET", `${BASE}/${id}`, () =>
    apiConnector("GET", `${BASE}/${id}`),
  );

/** PATCH — only when designerVerificationStatus === pending */
export const verifyCommunityDesigner = (id) =>
  loggedDesignerCall("verify", "PATCH", `${BASE}/${id}/verify`, () =>
    apiConnector("PATCH", `${BASE}/${id}/verify`),
  );

/** PATCH body: { reason } — required, max 500; only when pending */
export const rejectCommunityDesigner = (id, reason) =>
  loggedDesignerCall("reject", "PATCH", `${BASE}/${id}/reject`, () =>
    apiConnector("PATCH", `${BASE}/${id}/reject`, { reason }),
  );
