import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, LineChart } from "lucide-react";
import {
  getItemsCount,
  getCategoryCount,
  getSubcategoryCount,
  getCouponAnalytics,
  getOrdersCount,
  getActiveUsers,
} from "../../apis/Dashboardapi";
import { getAnalyticsSummary } from "../../apis/analyticsApi";
import { DashboardLineChart } from "../coupon/AnalyticsCharts";
import { tabActive, tabInactive } from "../coupon/analyticsShared";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { FiActivity } from "react-icons/fi";
import {
  FiPackage,
  FiLayers,
  FiTag,
  FiGift,
  FiShoppingCart,
  FiUsers,
} from "react-icons/fi";

const STORAGE_VIEW_KEY = "khush-dashboard-analytics-view";
const STORAGE_METRICS_KEY = "khush-dashboard-analytics-metrics";
const STORAGE_CHANNEL_KEY = "khush-dashboard-analytics-channel";

const ANALYTICS_CHANNELS = [
  { id: "all", label: "All" },
  { id: "website", label: "Website" },
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
];

const DASHBOARD_METRICS = [
  {
    id: "app_installs",
    label: "App Installs (7d)",
    timelineKey: "appInstallTimeline",
    color: "#8b5cf6",
    days: 7,
  },
  {
    id: "android_installs",
    label: "Android Installs (7d)",
    timelineKey: "androidInstallTimeline",
    color: "#22c55e",
    days: 7,
  },
  {
    id: "ios_installs",
    label: "iPhone Installs (7d)",
    timelineKey: "iphoneInstallTimeline",
    color: "#0ea5e9",
    days: 7,
  },
  {
    id: "checkout",
    label: "Checkout Starts (7d)",
    timelineKey: "checkoutTimeline",
    color: "#8b5cf6",
    days: 7,
  },
  {
    id: "delivered",
    label: "Delivered Orders (7d)",
    timelineKey: "deliveredTimeline",
    color: "#22c55e",
    days: 7,
  },
  {
    id: "gmv",
    label: "Ordered Value (7d)",
    timelineKey: "orderedValueTimeline",
    color: "#6366f1",
    days: 7,
    valuePrefix: "Rs ",
  },
  {
    id: "payment_failures",
    label: "Payment Failures (7d)",
    timelineKey: "paymentFailedTimeline",
    color: "#ef4444",
    days: 7,
  },
  {
    id: "payment_success",
    label: "Payment Success (7d)",
    timelineKey: "paymentSuccessTimeline",
    color: "#22c55e",
    days: 7,
  },
  {
    id: "cart_adds",
    label: "Add to Cart (7d)",
    timelineKey: "cartTimeline",
    color: "#f59e0b",
    days: 7,
  },
  {
    id: "signups",
    label: "New Signups (7d)",
    timelineKey: "newSigninTimeline",
    color: "#6366f1",
    days: 7,
  },
  {
    id: "website_users",
    label: "Website Users (7d)",
    timelineKey: "websiteUserTimeline",
    color: "#6366f1",
    days: 7,
  },
  {
    id: "app_users",
    label: "App Users (7d)",
    timelineKey: "appUserTimeline",
    color: "#8b5cf6",
    days: 7,
  },
  {
    id: "payment_rate",
    label: "Payment Success Rate",
    scalar: (m) => (m.paymentSuccessRate != null ? `${m.paymentSuccessRate}%` : "—"),
    color: "#22c55e",
    chartable: false,
  },
  {
    id: "cart_abandonment",
    label: "Cart Abandonment",
    scalar: (m) => (m.cartAbandonmentRate != null ? `${m.cartAbandonmentRate}%` : "—"),
    color: "#f97316",
    chartable: false,
  },
  {
    id: "repeat_orders",
    label: "Repeat Order Users",
    scalar: (m) => Number(m.repeatOrderUsersCount || 0).toLocaleString(),
    color: "#0ea5e9",
    chartable: false,
  },
];

/** Always shown in Cards + Graph view (user-requested core funnel metrics). */
const CORE_GRAPH_METRICS = [
  "checkout",
  "payment_failures",
  "payment_success",
  "cart_adds",
  "signups",
];

const DEFAULT_SELECTED = [...CORE_GRAPH_METRICS];

const ANALYTICS_TZ = "Asia/Kolkata";

function istDayKey(date) {
  return date.toLocaleDateString("en-CA", { timeZone: ANALYTICS_TZ });
}

function sanitizeTimelineRows(rows = []) {
  return (rows || []).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r?.day || "").slice(0, 10)));
}

function last7DayRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Fill missing days so 7d charts align with backend (Asia/Kolkata buckets). */
function fillDayWindow(rows = [], days = 7) {
  const safeRows = sanitizeTimelineRows(rows);
  const byDay = new Map(safeRows.map((r) => [String(r.day).slice(0, 10), Number(r?.value || 0)]));
  const result = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const day = istDayKey(d);
    result.push({ day, value: byDay.get(day) ?? 0 });
  }
  return result;
}

function readStoredView() {
  try {
    const v = localStorage.getItem(STORAGE_VIEW_KEY);
    if (v === "cards" || v === "graph") return v;
    return "graph";
  } catch {
    return "graph";
  }
}

function readStoredMetrics() {
  try {
    const raw = localStorage.getItem(STORAGE_METRICS_KEY);
    const stored = !raw
      ? DEFAULT_SELECTED
      : Array.isArray(JSON.parse(raw))
        ? JSON.parse(raw).filter((id) => DASHBOARD_METRICS.some((m) => m.id === id))
        : DEFAULT_SELECTED;
    return [...new Set([...CORE_GRAPH_METRICS, ...stored])];
  } catch {
    return DEFAULT_SELECTED;
  }
}

function readStoredChannel() {
  try {
    const v = localStorage.getItem(STORAGE_CHANNEL_KEY);
    return ANALYTICS_CHANNELS.some((c) => c.id === v) ? v : "all";
  } catch {
    return "all";
  }
}

function metricsForChannel(channel) {
  const hideByChannel = {
    website: new Set(["app_installs", "android_installs", "ios_installs", "app_users"]),
    android: new Set(["website_users", "ios_installs", "app_installs"]),
    ios: new Set(["website_users", "android_installs", "app_installs"]),
  };
  const hidden = hideByChannel[channel];
  if (!hidden) return DASHBOARD_METRICS;
  return DASHBOARD_METRICS.filter((m) => !hidden.has(m.id));
}

export default function Dashboard() {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) => {
    const t = String(suffix || "").replace(/^\/+/, "");
    return `${basePath}/${t}`.replace(/\/+/g, "/");
  };

  const [counts, setCounts] = useState({});
  const [analyticsMetrics, setAnalyticsMetrics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsView, setAnalyticsView] = useState(readStoredView);
  const [selectedMetricIds, setSelectedMetricIds] = useState(readStoredMetrics);
  const [analyticsChannel, setAnalyticsChannel] = useState(readStoredChannel);
  const navigate = useNavigate();

  const channelMetrics = useMemo(
    () => metricsForChannel(analyticsChannel),
    [analyticsChannel],
  );

  const toNumber = (value) => Number(value || 0);
  const sumLastDays = (rows = [], days = 7) =>
    rows.slice(-days).reduce((sum, row) => sum + toNumber(row?.value), 0);

  const getCardData = (res, key) => {
    const data = res?.data?.[key] || {};

    return {
      total:
        data.total ??
        data.totalItems ??
        data.totalCategories ??
        data.totalSubCategories ??
        res?.data?.summary?.totalCoupons ??
        0,

      active:
        data.active ??
        data.activeItems ??
        data.activeCategories ??
        data.activeSubCategories ??
        res?.data?.summary?.activeCoupons ??
        0,

      inactive:
        data.inactive ??
        data.inactiveItems ??
        data.inactiveCategories ??
        data.inactiveSubCategories ??
        res?.data?.summary?.inactiveCoupons ??
        0,
    };
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [
          itemsRes,
          categoriesRes,
          subcategoriesRes,
          couponsRes,
          ordersRes,
          activeUsersRes,
        ] = await Promise.all([
          getItemsCount(),
          getCategoryCount(),
          getSubcategoryCount(),
          getCouponAnalytics(),
          getOrdersCount(),
          getActiveUsers({ page: 1, limit: 20 }),
        ]);

        setCounts({
          Items: {
            ...getCardData(itemsRes, "items"),
            path: ap("items"),
            icon: <FiPackage className="h-4 w-4 text-brand-500" />,
          },
          Categories: {
            ...getCardData(categoriesRes, "categories"),
            path: ap("inventory/categories"),
            icon: <FiLayers className="h-4 w-4 text-brand-500" />,
          },
          Subcategories: {
            ...getCardData(subcategoriesRes, "subcategories"),
            path: ap("subcategoriess"),
            icon: <FiTag className="h-4 w-4 text-brand-500" />,
          },
          Coupons: {
            ...getCardData(couponsRes, "summary"),
            path: ap("coupons"),
            icon: <FiGift className="h-4 w-4 text-gold-500" />,
          },
          Orders: {
            ...getCardData(ordersRes, "orders"),
            path: ap("orders"),
            icon: <FiShoppingCart className="h-4 w-4 text-brand-500" />,
          },
          ActiveUsers: {
            total: activeUsersRes?.data?.totalUsers ?? 0,
            active: activeUsersRes?.data?.totalActiveUsers ?? 0,
            inactive:
              (activeUsersRes?.data?.totalUsers ?? 0) -
              (activeUsersRes?.data?.totalActiveUsers ?? 0),
            path: ap("users/real"),
            icon: <FiUsers className="h-4 w-4 text-brand-500" />,
          },
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCounts();
  }, [basePath]);

  useEffect(() => {
    const fetchImportantAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      try {
        const range = last7DayRange();
        const res = await getAnalyticsSummary({
          channel: analyticsChannel,
          module: "all",
          from: range.from,
          to: range.to,
        });
        if (!res?.success) {
          throw new Error(res?.message || "Failed to load analytics summary");
        }
        setAnalyticsMetrics(res?.data?.metrics || null);
      } catch (error) {
        console.error("Analytics fetch error:", error);
        setAnalyticsMetrics(null);
        setAnalyticsError(error?.message || "Unable to load analytics at the moment.");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchImportantAnalytics();
  }, [analyticsChannel]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEW_KEY, analyticsView);
    } catch {
      /* ignore */
    }
  }, [analyticsView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_METRICS_KEY, JSON.stringify(selectedMetricIds));
    } catch {
      /* ignore */
    }
  }, [selectedMetricIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHANNEL_KEY, analyticsChannel);
    } catch {
      /* ignore */
    }
  }, [analyticsChannel]);

  const resolvedMetrics = useMemo(() => {
    if (!analyticsMetrics) return [];
    return channelMetrics.map((def) => {
      const dayWindow = def.days || 7;
      const allRows = def.timelineKey ? analyticsMetrics[def.timelineKey] || [] : [];
      const rows = def.timelineKey ? fillDayWindow(allRows, dayWindow) : allRows.slice(-dayWindow);
      const value = def.scalar
        ? def.scalar(analyticsMetrics)
        : def.valuePrefix
          ? `${def.valuePrefix}${sumLastDays(rows, dayWindow).toLocaleString()}`
          : sumLastDays(rows, dayWindow).toLocaleString();
      return {
        ...def,
        rows,
        value,
        chartable: def.chartable !== false && Boolean(def.timelineKey),
        pinned: CORE_GRAPH_METRICS.includes(def.id),
      };
    });
  }, [analyticsMetrics, channelMetrics]);

  const visibleMetricIds = useMemo(
    () => [...new Set([...CORE_GRAPH_METRICS, ...selectedMetricIds])],
    [selectedMetricIds],
  );

  const visibleMetrics = useMemo(
    () => resolvedMetrics.filter((m) => visibleMetricIds.includes(m.id)),
    [resolvedMetrics, visibleMetricIds],
  );

  const graphMetrics = useMemo(
    () => visibleMetrics.filter((m) => m.chartable),
    [visibleMetrics],
  );

  const toggleMetric = (id) => {
    if (CORE_GRAPH_METRICS.includes(id)) return;
    setSelectedMetricIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : [...CORE_GRAPH_METRICS];
      }
      return [...prev, id];
    });
  };

  const selectAllMetrics = () => {
    setSelectedMetricIds(channelMetrics.map((m) => m.id));
  };

  const resetMetrics = () => {
    setSelectedMetricIds(DEFAULT_SELECTED);
  };

  const StatCard = ({ title, data }) => (
    <div
      onClick={() => navigate(data.path)}
      className="group h-full cursor-pointer rounded-xl border border-border bg-white p-3 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50/30"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-stone-700 group-hover:text-stone-900">
          {title}
        </h3>
        {data.icon}
      </div>

      <div className="mb-2 text-xl font-semibold text-stone-900">
        {data.total.toLocaleString()}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-stone-500">Active</span>
          <p className="font-medium text-success">{data.active.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-stone-500">Inactive</span>
          <p className="font-medium text-danger">{data.inactive.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Object.entries(counts).map(([key, value]) => (
          <StatCard key={key} title={key} data={value} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <FiActivity className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-stone-900">
              Important Analytics
              {analyticsChannel !== "all" ? (
                <span className="ml-1.5 font-normal text-stone-500">
                  · {ANALYTICS_CHANNELS.find((c) => c.id === analyticsChannel)?.label}
                </span>
              ) : null}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-canvas-muted/50 p-0.5">
              {ANALYTICS_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setAnalyticsChannel(ch.id)}
                  className={`px-2.5 py-1 text-[10px] font-medium transition ${
                    analyticsChannel === ch.id ? tabActive : tabInactive
                  }`}
                  aria-pressed={analyticsChannel === ch.id}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border border-border bg-canvas-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setAnalyticsView("cards")}
                className={`inline-flex items-center gap-1.5 ${analyticsView === "cards" ? tabActive : tabInactive}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView("graph")}
                className={`inline-flex items-center gap-1.5 ${analyticsView === "graph" ? tabActive : tabInactive}`}
              >
                <LineChart className="h-3.5 w-3.5" aria-hidden />
                Graph
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(ap("analytics/events"))}
              className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Full Analytics →
            </button>
          </div>
        </div>

        <div className="border-b border-border px-3 py-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Select metrics ({visibleMetricIds.filter((id) => channelMetrics.some((m) => m.id === id)).length}/{channelMetrics.length})
            </p>
            <div className="flex gap-2 text-[10px]">
              <button type="button" onClick={selectAllMetrics} className="font-medium text-brand-600 hover:text-brand-700">
                All
              </button>
              <span className="text-stone-300">|</span>
              <button type="button" onClick={resetMetrics} className="font-medium text-stone-500 hover:text-stone-700">
                Reset
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {channelMetrics.map((def) => {
              const pinned = CORE_GRAPH_METRICS.includes(def.id);
              const selected = visibleMetricIds.includes(def.id);
              const chartable = def.chartable !== false && Boolean(def.timelineKey);
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => toggleMetric(def.id)}
                  disabled={pinned}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    selected
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-border bg-white text-stone-600 hover:border-brand-200 hover:bg-canvas-muted/40"
                  } ${pinned ? "cursor-default opacity-90" : ""}`}
                  title={
                    pinned
                      ? "Always visible on dashboard"
                      : chartable
                        ? "Shows in cards and graph"
                        : "Cards only (no timeline)"
                  }
                >
                  {def.label}
                  {pinned ? <span className="ml-1 text-brand-500">●</span> : null}
                  {!chartable && !pinned ? <span className="ml-1 text-stone-400">*</span> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[9px] text-stone-400">* Scalar metrics appear in Cards view only</p>
        </div>

        <div className="p-3">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-20 animate-pulse rounded-lg bg-canvas-muted" />
              ))}
            </div>
          ) : !analyticsMetrics ? (
            <p className="py-6 text-center text-sm text-stone-500">
              {analyticsError || "Unable to load analytics at the moment."}
            </p>
          ) : visibleMetrics.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Select at least one metric above.
            </p>
          ) : analyticsView === "cards" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-lg border border-border p-2.5 transition hover:border-brand-200 hover:bg-brand-50/20"
                  style={{ borderLeftWidth: 3, borderLeftColor: metric.color }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-stone-900">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : graphMetrics.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Graph view needs timeline metrics. Select items without * (e.g. Checkout, GMV).
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CORE_GRAPH_METRICS.map((id) => graphMetrics.find((m) => m.id === id))
                .filter(Boolean)
                .concat(graphMetrics.filter((m) => !CORE_GRAPH_METRICS.includes(m.id)))
                .map((metric) => (
                  <DashboardLineChart
                    key={metric.id}
                    title={metric.label}
                    rows={metric.rows}
                    color={metric.color}
                    valuePrefix={metric.valuePrefix || ""}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
