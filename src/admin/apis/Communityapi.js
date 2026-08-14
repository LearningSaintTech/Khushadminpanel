import { apiConnector } from "../services/Apiconnector";

/** Community hashtags (admin) + feed/content browse + designer verification */

const HASHTAGS = "/community/admin/hashtags";
const FEED = "/community/feed";
const CONTENT = "/community/content";

// —— Keywords / hashtags ——
export const listCommunityHashtags = (params = {}) =>
  apiConnector("GET", HASHTAGS, null, {}, params);

export const createCommunityHashtag = (body) =>
  apiConnector("POST", HASHTAGS, body);

export const updateCommunityHashtag = (id, body) =>
  apiConnector("PATCH", `${HASHTAGS}/${id}`, body);

export const deleteCommunityHashtag = (id) =>
  apiConnector("DELETE", `${HASHTAGS}/${id}`);

// —— Content browse / moderation ——
export const getCommunityFeed = (params = {}) =>
  apiConnector("GET", FEED, null, {}, params);

export const getCommunityContent = (id) =>
  apiConnector("GET", `${CONTENT}/${id}`);

export const deleteCommunityContent = (id) =>
  apiConnector("DELETE", `${CONTENT}/${id}`);

// Community designer verification lives in CommunityDesignersapi.js
// (/admin/panels/community-designers — not staff /designer)
