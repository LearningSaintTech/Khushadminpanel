export {
  BackToHub,
  FlowStep,
  PageHeader,
  Pagination,
  StatCard,
  fieldClass,
  inputClass,
  labelClass,
  tableScrollShell,
} from "../moneyFeatures/moneyFeaturesShared";

export {
  btnOutline,
  btnPrimary,
  Field,
  FormSection,
  pageToolbar,
  tabActive,
  tabInactive,
  thClass,
  tableHeadClass,
} from "../Section/sectionShared";

export function fmtInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export function shortId(id) {
  const s = String(id || "");
  if (s.length <= 10) return s || "—";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function statusPill(status) {
  const s = String(status || "").toLowerCase();
  if (["available", "paid", "verified", "published", "active", "approved"].some((k) => s.includes(k))) {
    return "rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success";
  }
  if (["pending", "pending_return_window"].some((k) => s.includes(k))) {
    return "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800";
  }
  if (["reject", "cancel", "inactive"].some((k) => s.includes(k))) {
    return "rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-medium text-danger";
  }
  return "rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] font-medium text-stone-700";
}

export function communityRowId(row) {
  return (
    row?.payoutId ||
    row?.id ||
    row?._id ||
    row?.projectId ||
    row?.projectCategoryId ||
    ""
  );
}

export function extractCommunityList(res, extraKeys = []) {
  const root = res && typeof res === "object" ? res : {};
  const nested = root.data && typeof root.data === "object" ? root.data : null;
  const keys = ["items", "projects", "categories", ...extraKeys];
  const layers = [nested, nested?.data, root];
  for (const layer of layers) {
    if (!layer) continue;
    if (Array.isArray(layer)) return layer;
    for (const key of keys) {
      if (Array.isArray(layer[key])) return layer[key];
    }
  }
  return [];
}

export function extractCommunityRecord(res) {
  const root = res && typeof res === "object" ? res : {};
  const nested = root.data && typeof root.data === "object" ? root.data : null;
  if (nested?.project && typeof nested.project === "object") return nested.project;
  if (nested?.category && typeof nested.category === "object") return nested.category;
  if (nested && !Array.isArray(nested) && (nested._id || nested.id || nested.name)) {
    return nested;
  }
  if (root._id || root.id) return root;
  return nested || root;
}
