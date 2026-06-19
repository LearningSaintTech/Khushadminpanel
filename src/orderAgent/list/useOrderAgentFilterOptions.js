import { useMemo } from "react";
import { getStatusCount, useOrderAgentStatusOptions } from "../context/StatusOptionsContext";
import {
  defaultAllStatusLabel,
  formatSectionStatusOption,
  formatStatusDisplayLabel,
  formatStatusWithCount,
  stripStatusMetaSuffix,
} from "./statusDisplayLabels";

function mapStatusOption(opt, section, countCtx) {
  if (!opt.value) {
    const total = countCtx.sectionTotals?.[section] ?? 0;
    const base = stripStatusMetaSuffix(opt.label) || defaultAllStatusLabel(section);
    return {
      value: "",
      label: formatStatusWithCount(base, total, { loading: countCtx.countsLoading }),
      kind: opt.kind || "all",
    };
  }
  const count = getStatusCount(section, opt.value, countCtx);
  return {
    value: opt.value,
    label: formatSectionStatusOption(opt, count, section, {
      countsLoading: countCtx.countsLoading,
    }),
    kind: opt.kind || "line",
  };
}

function buildGroupedStatusOptions(section, mapped) {
  if (section !== "exchange" && section !== "returns") return null;

  const all = mapped.filter((o) => !o.value);
  const line = mapped.filter((o) => o.value && o.kind !== "document");
  const request = mapped.filter((o) => o.value && o.kind === "document");

  const groups = [];
  if (all.length) groups.push({ label: "All", options: all });
  if (line.length) groups.push({ label: "Line items", options: line });
  if (request.length) groups.push({ label: "Requests", options: request });
  return groups.length > 1 ? groups : null;
}

/** Status + shipping provider options with live counts for filter dropdowns. */
export function useOrderAgentFilterOptions(section = "orders") {
  const ctx = useOrderAgentStatusOptions();

  const statusOptions = useMemo(() => {
    const list =
      section === "exchange"
        ? ctx.exchange
        : section === "returns"
          ? ctx.returns
          : ctx.orders;
    if (!Array.isArray(list)) return [{ value: "", label: defaultAllStatusLabel(section) }];

    const countCtx = {
      statusCounts: ctx.statusCounts,
      sectionTotals: ctx.sectionTotals,
      countsLoading: ctx.countsLoading,
    };

    return list.map((opt) => mapStatusOption(opt, section, countCtx));
  }, [section, ctx]);

  const statusOptionGroups = useMemo(
    () => buildGroupedStatusOptions(section, statusOptions),
    [section, statusOptions],
  );

  const providerOptions = useMemo(() => {
    const list = Array.isArray(ctx.shippingProviders) ? ctx.shippingProviders : [];
    return list.map((opt) => {
      if (!opt.value) return { value: "", label: opt.label || "All carriers" };
      const count = ctx.countsLoading
        ? null
        : (ctx.providerCounts?.get(String(opt.value).toUpperCase()) ?? 0);
      const suffix = count == null ? "" : ` (${count})`;
      return { value: opt.value, label: `${opt.label}${suffix}` };
    });
  }, [ctx]);

  return {
    statusOptions,
    statusOptionGroups,
    providerOptions,
    countsLoading: ctx.countsLoading,
    optionsLoading: ctx.loading,
  };
}

/** Clean title label for page header (no counts / kind suffixes). */
export function resolveStatusTitleLabel(section, status, rawOptions = []) {
  if (!status) return "";
  const opt = rawOptions.find(
    (o) => o.value === status || String(o.value).toUpperCase() === String(status).toUpperCase(),
  );
  return formatStatusDisplayLabel(status, opt?.label);
}
