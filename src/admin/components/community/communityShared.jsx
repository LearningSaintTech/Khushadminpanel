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
  if (["available", "paid", "verified", "published", "active"].some((k) => s.includes(k))) {
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
