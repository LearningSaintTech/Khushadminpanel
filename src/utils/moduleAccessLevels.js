export const ACCESS_LEVEL_VIEW = "view";
export const ACCESS_LEVEL_FULL = "full";

export function normalizeAccessLevel(level) {
  return String(level || "").trim().toLowerCase() === ACCESS_LEVEL_VIEW
    ? ACCESS_LEVEL_VIEW
    : ACCESS_LEVEL_FULL;
}

export function parseModuleAccessResponse(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
  const data =
    Array.isArray(root.allowedModules) || Array.isArray(root.moduleAccess)
      ? root
      : nested || root;
  const keys = Array.isArray(data.allowedModules) ? data.allowedModules.filter(Boolean) : [];
  const levels = {};

  if (Array.isArray(data.moduleAccess)) {
    for (const item of data.moduleAccess) {
      if (typeof item === "string") {
        levels[item] = ACCESS_LEVEL_FULL;
        continue;
      }
      const key = item?.moduleKey || item?.key;
      if (!key) continue;
      levels[key] = normalizeAccessLevel(item.accessLevel || item.level);
    }
  }

  for (const key of keys) {
    if (!levels[key]) levels[key] = ACCESS_LEVEL_FULL;
  }

  const allowedModules = keys.length > 0 ? keys : Object.keys(levels);
  return { allowedModules, moduleLevels: levels, source: data.source || null };
}

export function toModuleAccessPayload(selectedModules, moduleLevels = {}) {
  return (selectedModules || []).map((moduleKey) => ({
    moduleKey,
    accessLevel: normalizeAccessLevel(moduleLevels[moduleKey]),
  }));
}

const MUTATING_LABEL =
  /^(create|add|new|edit|update|save|delete|remove|toggle|publish|unpublish|approve|reject|block|unblock|assign|unassign|cancel|refund|restore|duplicate|activate|deactivate|enable|disable|upload|import|replace)\b/i;

const SAFE_LABEL =
  /^(search|filter|apply|reset|clear|back|close|cancel|next|previous|prev|export|download|print|view|refresh|reload)$/i;

export function isMutatingControl(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest("[data-view-safe]")) return false;

  const href = el.getAttribute?.("href") || "";
  if (/\/(create|edit|add|new|delete|remove)(\/|$)/i.test(href)) return true;

  const tag = el.tagName;
  if (tag === "BUTTON" || el.getAttribute("role") === "button") {
    const type = String(el.getAttribute("type") || "submit").toLowerCase();
    const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
    if (SAFE_LABEL.test(text)) return false;
    if (type === "submit") return true;
    if (MUTATING_LABEL.test(text) || /\b(create|add new|save changes|delete)\b/i.test(text)) {
      return true;
    }
  }

  return false;
}
