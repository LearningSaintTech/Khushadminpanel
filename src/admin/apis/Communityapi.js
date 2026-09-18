import { apiConnector } from "../services/Apiconnector";

/** Community hashtags, project categories, projects, feed/content */

const HASHTAGS = "/community/admin/hashtags";
const PROJECT_CATEGORIES = "/community/admin/project-categories";
const PROJECTS = "/community/admin/projects";
const REPORTS = "/community/admin/reports";
const FEED = "/community/feed";
const CONTENT = "/community/content";

async function loggedCommunityCall(label, method, url, runner) {
  console.log(`[Community] ${label} →`, { method, url });
  try {
    const res = await runner();
    console.log(`[Community] ${label} ←`, res);
    return res;
  } catch (err) {
    console.error(`[Community] ${label} ✕`, err);
    throw err;
  }
}

// —— Keywords / hashtags ——
export const listCommunityHashtags = (params = {}) =>
  apiConnector("GET", HASHTAGS, null, {}, params);

export const createCommunityHashtag = (body) =>
  apiConnector("POST", HASHTAGS, body);

export const updateCommunityHashtag = (id, body) =>
  apiConnector("PATCH", `${HASHTAGS}/${id}`, body);

export const deleteCommunityHashtag = (id) =>
  apiConnector("DELETE", `${HASHTAGS}/${id}`);

// —— Project categories ——
export const listCommunityProjectCategories = (params = { limit: 50 }) =>
  loggedCommunityCall("list project categories", "GET", PROJECT_CATEGORIES, () =>
    apiConnector("GET", PROJECT_CATEGORIES, null, {}, params),
  );

export const getCommunityProjectCategory = (id) =>
  loggedCommunityCall("get project category", "GET", `${PROJECT_CATEGORIES}/${id}`, () =>
    apiConnector("GET", `${PROJECT_CATEGORIES}/${id}`),
  );

export const createCommunityProjectCategory = (body) =>
  loggedCommunityCall("create project category", "POST", PROJECT_CATEGORIES, () =>
    apiConnector("POST", PROJECT_CATEGORIES, body),
  );

export const updateCommunityProjectCategory = (id, body) =>
  loggedCommunityCall("update project category", "PATCH", `${PROJECT_CATEGORIES}/${id}`, () =>
    apiConnector("PATCH", `${PROJECT_CATEGORIES}/${id}`, body),
  );

export const deleteCommunityProjectCategory = (id) =>
  loggedCommunityCall("delete project category", "DELETE", `${PROJECT_CATEGORIES}/${id}`, () =>
    apiConnector("DELETE", `${PROJECT_CATEGORIES}/${id}`),
  );

// —— Projects (approve / reject) ——
export const listCommunityProjects = (params = {}) =>
  loggedCommunityCall("list projects", "GET", PROJECTS, () =>
    apiConnector("GET", PROJECTS, null, {}, params),
  );

export const getCommunityProject = (projectId) =>
  loggedCommunityCall("get project", "GET", `${PROJECTS}/${projectId}`, () =>
    apiConnector("GET", `${PROJECTS}/${projectId}`),
  );

export const approveCommunityProject = (projectId) =>
  loggedCommunityCall("approve project", "PATCH", `${PROJECTS}/${projectId}/approve`, () =>
    apiConnector("PATCH", `${PROJECTS}/${projectId}/approve`),
  );

export const rejectCommunityProject = (projectId, reason) =>
  loggedCommunityCall("reject project", "PATCH", `${PROJECTS}/${projectId}/reject`, () =>
    apiConnector(
      "PATCH",
      `${PROJECTS}/${projectId}/reject`,
      reason ? { reason } : {},
    ),
  );

// —— Reports (moderation) ——
/** GET /community/admin/reports?status=open&limit=20&cursor=… */
export const listCommunityReports = (params = {}) =>
  loggedCommunityCall("list reports", "GET", REPORTS, () =>
    apiConnector("GET", REPORTS, null, {}, params),
  );

/** GET /community/admin/reports/:reportId */
export const getCommunityReport = (reportId) =>
  loggedCommunityCall("get report", "GET", `${REPORTS}/${reportId}`, () =>
    apiConnector("GET", `${REPORTS}/${reportId}`),
  );

/**
 * PATCH /community/admin/reports/:reportId/resolve
 * Body examples:
 *   { status: "dismissed", adminNote: "…", action: "none" }
 *   { status: "actioned", adminNote: "…", action: "hide_content" }
 */
export const resolveCommunityReport = (reportId, body = {}) =>
  loggedCommunityCall(
    "resolve report",
    "PATCH",
    `${REPORTS}/${reportId}/resolve`,
    () => apiConnector("PATCH", `${REPORTS}/${reportId}/resolve`, body),
  );

// —— Content browse / moderation ——
export const getCommunityFeed = (params = {}) =>
  apiConnector("GET", FEED, null, {}, params);

export const getCommunityContent = (id) =>
  apiConnector("GET", `${CONTENT}/${id}`);

export const deleteCommunityContent = (id) =>
  apiConnector("DELETE", `${CONTENT}/${id}`);

// Community designer verification lives in CommunityDesignersapi.js
// (/admin/panels/community-designers — not staff /designer)
