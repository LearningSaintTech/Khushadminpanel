import {
  getShippingProviderLabel,
  getStatusLabel,
} from "../context/StatusOptionsContext";

const SECTION_DEFAULTS = {
  orders: {
    title: "Orders",
    subtitle: "Fulfilment queue — confirm, process, ship, and deliver",
  },
  exchange: {
    title: "Exchange",
    subtitle: "Exchange requests and line items",
  },
  returns: {
    title: "Returns",
    subtitle: "Return requests and refund lines",
  },
};

export function buildOrderAgentListPageMeta({
  section = "orders",
  statusOptionsCtx,
  resolvedStatus = "",
  resolvedProvider = "",
  fixedItemStatus = "",
  showProviderFilter = false,
}) {
  if (fixedItemStatus) {
    return {
      title: "Order process",
      subtitle: "PROCESSING queue — pack and manifest",
    };
  }

  const defaults = SECTION_DEFAULTS[section] || SECTION_DEFAULTS.orders;
  const statusLabel = getStatusLabel(section, resolvedStatus, statusOptionsCtx);
  const providerLabel = showProviderFilter
    ? getShippingProviderLabel(resolvedProvider, statusOptionsCtx)
    : "";

  if (providerLabel) {
    return {
      title: providerLabel,
      subtitle: `Orders fulfilled via ${providerLabel}`,
    };
  }

  if (statusLabel) {
    const sectionTitle = defaults.title;
    return {
      title: statusLabel,
      subtitle: `${sectionTitle} in ${statusLabel.toLowerCase()}`,
    };
  }

  return { title: defaults.title, subtitle: defaults.subtitle };
}
