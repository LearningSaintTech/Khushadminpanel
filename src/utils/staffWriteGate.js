let viewOnlyWritesBlocked = false;

export function setViewOnlyWritesBlocked(blocked) {
  viewOnlyWritesBlocked = Boolean(blocked);
}

export function areViewOnlyWritesBlocked() {
  return viewOnlyWritesBlocked;
}

export function isSafeHttpMethod(method) {
  return ["get", "head", "options"].includes(String(method || "get").toLowerCase());
}
