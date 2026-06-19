import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getOrderAgentSidebarCounts } from "../apis/orderAgentApi";
import { formatStatusDisplayLabel } from "../list/statusDisplayLabels";
import { useViewMode } from "./ViewModeContext";
import { logOrderAgentDebug } from "../orderAgentShared";

const StatusOptionsContext = createContext({
  loading: true,
  countsLoading: true,
  countsView: "item",
  error: null,
  countsError: null,
  orders: [],
  exchange: [],
  returns: [],
  shippingProviders: [],
  statusCounts: { orders: new Map(), exchange: new Map(), returns: new Map() },
  providerCounts: new Map(),
  sectionTotals: { orders: 0, exchange: 0, returns: 0 },
  staleCount: null,
  staleThresholdHours: 24,
  refreshSidebarCounts: () => {},
});

function parseApiPayload(response) {
  return response?.data ?? response ?? {};
}

function logSidebarAnalytics(event, payload) {
  logOrderAgentDebug(event, payload);
}

function toStatusCountMap(counts = []) {
  const map = new Map();
  for (const row of counts) {
    const status = row?.status;
    if (!status) continue;
    map.set(String(status), row.count ?? 0);
  }
  return map;
}

function toProviderCountMap(counts = []) {
  const map = new Map();
  for (const row of counts) {
    const provider = row?.provider;
    if (!provider) continue;
    map.set(String(provider).toUpperCase(), row.count ?? 0);
  }
  return map;
}

function sectionTotalFromPayload(section, { isOrderView = false } = {}) {
  const lineTotal = section?.total ?? 0;
  if (isOrderView) return lineTotal;
  const documentTotal = section?.documentTotal ?? 0;
  return lineTotal + documentTotal;
}

function applySidebarCountsPayload(data, isOrderView = false) {
  const statusOptions = data.statusOptions || {};
  return {
    countsView: data.view === "order" ? "order" : "item",
    options: {
      orders: Array.isArray(statusOptions.orders) ? statusOptions.orders : [],
      exchange: Array.isArray(statusOptions.exchange) ? statusOptions.exchange : [],
      returns: Array.isArray(statusOptions.returns) ? statusOptions.returns : [],
      shippingProviders: Array.isArray(statusOptions.shippingProviders)
        ? statusOptions.shippingProviders
        : [],
    },
    statusCounts: {
      orders: toStatusCountMap(data.orders?.counts),
      exchange: toStatusCountMap(data.exchange?.counts),
      returns: toStatusCountMap(data.returns?.counts),
    },
    providerCounts: toProviderCountMap(data.shippingProviders?.counts),
    sectionTotals: {
      orders: data.orders?.total ?? 0,
      exchange: sectionTotalFromPayload(data.exchange, { isOrderView }),
      returns: sectionTotalFromPayload(data.returns, { isOrderView }),
    },
    staleCount: data.stale?.count ?? 0,
    staleThresholdHours: data.stale?.thresholdHours ?? 24,
  };
}

/** Build analytics cards from live DB status counts (same source as sidebar badges). */
export function buildAnalyticsCardsForSection(section, { statusCounts, statusOptions }) {
  const map = statusCounts?.[section];
  if (!map) return [];

  const labelByValue = new Map();
  for (const opt of statusOptions?.[section] || []) {
    if (opt.value) {
      labelByValue.set(String(opt.value), formatStatusDisplayLabel(opt.value, opt.label));
    }
  }

  const cards = [];
  for (const [status, count] of map.entries()) {
    if (count <= 0) continue;
    cards.push({
      status,
      label: labelByValue.get(status) || status,
      count,
    });
  }

  return cards.sort((a, b) => b.count - a.count);
}

export function StatusOptionsProvider({ children }) {
  const { viewMode } = useViewMode();
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsView, setCountsView] = useState("item");
  const [error, setError] = useState(null);
  const [countsError, setCountsError] = useState(null);
  const [options, setOptions] = useState({
    orders: [],
    exchange: [],
    returns: [],
    shippingProviders: [],
  });
  const [statusCounts, setStatusCounts] = useState({
    orders: new Map(),
    exchange: new Map(),
    returns: new Map(),
  });
  const [providerCounts, setProviderCounts] = useState(new Map());
  const [sectionTotals, setSectionTotals] = useState({
    orders: 0,
    exchange: 0,
    returns: 0,
  });
  const [staleCount, setStaleCount] = useState(null);
  const [staleThresholdHours, setStaleThresholdHours] = useState(24);

  const refreshSidebarCounts = useCallback(
    async ({ silent = false, view = viewMode } = {}) => {
      if (!silent) setCountsLoading(true);

      try {
        const response = await getOrderAgentSidebarCounts({ view });
        const data = parseApiPayload(response);
        const isOrderView = view === "order";
        const next = applySidebarCountsPayload(data, isOrderView);

        logSidebarAnalytics("sidebar-counts:raw", { view, data });
        logSidebarAnalytics("sidebar-counts:parsed", {
          view,
          countsView: next.countsView,
          data,
          sectionTotals: next.sectionTotals,
          staleCount: next.staleCount,
          staleThresholdHours: next.staleThresholdHours,
        });

        setCountsView(next.countsView);
        setOptions(next.options);
        setStatusCounts(next.statusCounts);
        setProviderCounts(next.providerCounts);
        setSectionTotals(next.sectionTotals);
        setStaleCount(next.staleCount);
        setStaleThresholdHours(next.staleThresholdHours);
        setCountsError(null);
        setError(null);
      } catch (err) {
        logSidebarAnalytics("sidebar-counts:error", {
          view,
          message: err?.message || "Failed to load sidebar counts",
          err,
        });
        setCountsError(err?.message || "Failed to load sidebar counts");
        setError(err?.message || "Failed to load status options");
      } finally {
        setCountsLoading(false);
        setLoading(false);
      }
    },
    [viewMode],
  );

  useEffect(() => {
    refreshSidebarCounts();
  }, [refreshSidebarCounts]);

  useEffect(() => {
    const onFocus = () => refreshSidebarCounts({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSidebarCounts]);

  const value = useMemo(
    () => ({
      loading,
      countsLoading,
      countsView,
      error,
      countsError,
      orders: options.orders,
      exchange: options.exchange,
      returns: options.returns,
      shippingProviders: options.shippingProviders,
      statusCounts,
      providerCounts,
      sectionTotals,
      staleCount,
      staleThresholdHours,
      refreshSidebarCounts,
    }),
    [
      loading,
      countsLoading,
      countsView,
      error,
      countsError,
      options,
      statusCounts,
      providerCounts,
      sectionTotals,
      staleCount,
      staleThresholdHours,
      refreshSidebarCounts,
    ],
  );

  return (
    <StatusOptionsContext.Provider value={value}>{children}</StatusOptionsContext.Provider>
  );
}

export function useOrderAgentStatusOptions() {
  return useContext(StatusOptionsContext);
}

/** Count for a status value within orders / exchange / returns sidebar section. */
export function getStatusCount(section, statusValue, { statusCounts, sectionTotals, countsLoading }) {
  if (countsLoading) return null;
  if (!statusValue) return sectionTotals?.[section] ?? 0;
  const map = statusCounts?.[section];
  if (!map) return 0;
  const key = String(statusValue);
  if (map.has(key)) return map.get(key);
  const upper = key.toUpperCase();
  if (map.has(upper)) return map.get(upper);
  for (const [status, count] of map.entries()) {
    if (String(status).toUpperCase() === upper) return count;
  }
  return 0;
}

export function getProviderCount(provider, { providerCounts, countsLoading }) {
  if (countsLoading || !provider) return null;
  return providerCounts?.get(String(provider).toUpperCase()) ?? 0;
}

export function getStatusLabel(section, status, options) {
  if (!status) return "";
  const list = options?.[section] || [];
  const exact = list.find((opt) => opt.value === status);
  if (exact) return formatStatusDisplayLabel(status, exact.label);
  const upper = String(status).toUpperCase();
  const match = list.find(
    (opt) => opt.value && String(opt.value).toUpperCase() === upper,
  );
  if (match) return formatStatusDisplayLabel(status, match.label);
  return formatStatusDisplayLabel(status, status);
}

export function getShippingProviderLabel(provider, options) {
  if (!provider) return "";
  const list = options?.shippingProviders || [];
  return list.find((opt) => opt.value === provider)?.label || provider;
}
