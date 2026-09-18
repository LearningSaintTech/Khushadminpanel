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

/**
 * Promote community designer → staff Designers panel using the same userId
 * (avoids createDesigner which would mint a new id and break inventory / earnings links).
 * POST (fallback PATCH) /admin/panels/community-designers/:userId/grant-panel-access
 */
export const grantCommunityDesignerPanelAccess = async (userId) => {
  if (!userId) throw new Error("userId is required");
  const path = `${BASE}/${userId}/grant-panel-access`;
  return loggedDesignerCall("grant-panel-access", "POST", path, async () => {
    try {
      return await apiConnector("POST", path);
    } catch (err) {
      if (
        err?.status === 404 ||
        /route not found|Cannot POST/i.test(String(err?.message || ""))
      ) {
        console.warn(
          "[Community designers] POST grant-panel-access 404 — retrying PATCH",
          err?.message,
        );
        return apiConnector("PATCH", path);
      }
      throw err;
    }
  });
};
