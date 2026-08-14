import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  deleteEventById,
  deleteEventsByFilters,
  getAnalyticsSummary,
  getEventAnalytics,
} from "../../apis/analyticsApi";
import { getOrders } from "../../apis/Orderapi";
import { ChartsPanel } from "./AnalyticsCharts";
import { ExplorerPanel, InsightPanel, OverviewPanel } from "./AnalyticsPanels";
import { FilterField, SegmentedTabs } from "./AnalyticsUiParts";
import {
  alertDanger,
  btnOutline,
  btnPrimary,
  filterInputClass,
  pageToolbar,
} from "./analyticsShared";

const PAGE_SIZE = 25;

const SOURCE_OPTIONS = ["all", "website", "android", "ios", "app"];
const PLATFORM_OPTIONS = ["all", "website", "android", "ios"];
const SUMMARY_MODULE_OPTIONS = [
  { id: "all", label: "All modules" },
  { id: "users", label: "Users" },
  { id: "wallet", label: "Wallet" },
  { id: "orders", label: "Orders" },
  { id: "signin", label: "Signin" },
  { id: "cart", label: "Cart" },
  { id: "rewards", label: "Rewards" },
  { id: "coupon", label: "Coupons" },
  { id: "wishlist", label: "Wishlist" },
  { id: "checkout", label: "Checkout" },
  { id: "failed", label: "Failed" },
  { id: "success", label: "Success" },
  { id: "delivered", label: "Delivered" },
  { id: "pincode", label: "Most Ordered Pincode" },
  { id: "browse", label: "Browse & Search" },
  { id: "engagement", label: "Engagement" },
  { id: "notifications", label: "Notifications ROI" },
  { id: "payment", label: "Payment" },
  { id: "auth", label: "Auth" },
];
const EVENT_TYPE_OPTIONS = [
  "all",
  "session_start",
  "session_end",
  "page_view",
  "route_change",
  "search",
  "search_click",
  "search_no_results",
  "search_filter_applied",
  "search_sort_changed",
  "category_view",
  "subcategory_view",
  "section_view",
  "product_view",
  "product_image_swipe",
  "size_select",
  "color_select",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "cart_quantity_increase",
  "cart_quantity_decrease",
  "checkout_started",
  "begin_checkout",
  "checkout_address_selected",
  "checkout_address_added",
  "checkout_delivery_option_selected",
  "payment_mode_selected",
  "payment_initiated",
  "payment_success",
  "payment_failed",
  "order_placed",
  "order_confirmed",
  "order_tracking_view",
  "order_cancelled",
  "refund_requested",
  "bounce",
  "wishlist_add",
  "wishlist_remove",
  "share_click",
  "coupon_apply_attempt",
  "coupon_applied",
  "coupon_removed",
  "auth_login_started",
  "auth_login_success",
  "auth_login_failed",
  "auth_signup_started",
  "auth_signup_success",
  "auth_logout",
  "profile_updated",
  "address_added",
  "address_updated",
  "address_deleted",
  "notification_opened",
  "app_install",
  "app_first_open",
  "app_session_start",
  "app_screen_view",
  "app_route_change",
  "app_backgrounded",
  "app_foregrounded",
  "recommendation_click",
  "recommendation_shown",
  "api_error",
  "validation_error",
  "network_error",
  "ui_exception",
];

const INSIGHT_QUERY_OPTIONS = [
  { id: "", label: "Select insight query" },
  { id: "phase1_summary", label: "Dashboard summary (all modules)" },
  { id: "top_search_terms", label: "Most searched keywords (Top 10)" },
  { id: "most_visited_products", label: "Most visited products" },
  { id: "most_added_to_cart", label: "Most add-to-cart products" },
  { id: "top_selling_products", label: "Top selling products" },
  { id: "top_visited_webpages", label: "Top visited webpages" },
];

const INSIGHT_EVENT_TYPES = {
  top_search_terms: ["search"],
  most_visited_products: ["product_view"],
  most_added_to_cart: ["add_to_cart"],
  top_selling_products: ["order_placed", "payment_success"],
  top_visited_webpages: ["page_view"],
};

const EXPLORER_FILTER_PRESETS = [
  { id: "all", label: "All Events", value: { eventType: "", channel: "all" } },
  { id: "checkout_funnel", label: "Checkout Funnel", value: { eventType: "checkout_started", channel: "all" } },
  { id: "payment_failures", label: "Payment Failures", value: { eventType: "payment_failed", channel: "all" } },
  { id: "auth_failures", label: "Auth Failures", value: { eventType: "auth_login_failed", channel: "all" } },
];

const EventAnalyticsTab = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState({
    channel: "all",
    platform: "all",
    eventType: "",
    from: "",
    to: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [insightQuery, setInsightQuery] = useState("phase1_summary");
  const [insightRows, setInsightRows] = useState([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightMeta, setInsightMeta] = useState({
    source: "analytics_events",
    eventTypesScanned: [],
    totalEventsScanned: 0,
  });
  const [summaryData, setSummaryData] = useState(null);
  const [insightError, setInsightError] = useState("");
  const [activePreset, setActivePreset] = useState("all");
  const [summaryModule, setSummaryModule] = useState("all");
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsError, setChartsError] = useState("");

  const toDateInput = (value) => value.toISOString().slice(0, 10);
  const applyDatePreset = (days) => {
    if (!Number.isFinite(days) || days < 0) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFilters((prev) => ({
      ...prev,
      from: toDateInput(start),
      to: toDateInput(end),
    }));
  };

  const buildEventQueryParams = (page = 1, limit = pageSize) => {
    const params = { page, limit };
    // Raw event query accepts channel: website/android/ios.
    // Treat "app" as aggregate only (summary mode), so do not send it to events query.
    if (filters.platform !== "all") params.channel = filters.platform;
    else if (filters.channel !== "all" && filters.channel !== "app") params.channel = filters.channel;
    if (filters.eventType.trim()) params.eventType = filters.eventType.trim();
    if (filters.from) params.from = new Date(filters.from).toISOString();
    if (filters.to) params.to = new Date(filters.to).toISOString();
    return params;
  };

  const fetchEvents = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await getEventAnalytics(buildEventQueryParams(page, pageSize));
      if (!res?.success) {
        setError(res?.message || "Failed to load analytics events.");
        return;
      }
      setEvents(Array.isArray(res.data) ? res.data : []);
      setPagination(res.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err?.message || "Failed to load analytics events.");
    } finally {
      setLoading(false);
    }
  };

  const buildActiveFilterParams = () => {
    const params = {};
    if (filters.platform !== "all") params.channel = filters.platform;
    else if (filters.channel !== "all" && filters.channel !== "app") params.channel = filters.channel;
    if (filters.eventType.trim()) params.eventType = filters.eventType.trim();
    if (filters.from) params.from = new Date(filters.from).toISOString();
    if (filters.to) params.to = new Date(filters.to).toISOString();
    return params;
  };

  const applyExplorerPreset = (presetId) => {
    const preset = EXPLORER_FILTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setFilters((prev) => ({
      ...prev,
      channel: preset.value.channel ?? prev.channel,
      eventType: preset.value.eventType ?? prev.eventType,
    }));
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId || isDeleting) return;
    const ok = window.confirm("Delete this event permanently?");
    if (!ok) return;
    setIsDeleting(true);
    try {
      const res = await deleteEventById(eventId);
      if (!res?.success) {
        setError(res?.message || "Failed to delete event.");
      } else {
        await fetchEvents(currentPage);
      }
    } catch (err) {
      setError(err?.message || "Failed to delete event.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFiltered = async () => {
    if (isDeleting) return;
    const params = buildActiveFilterParams();
    if (Object.keys(params).length === 0) {
      setError("Apply at least one filter before bulk delete.");
      return;
    }
    const confirmText = window.prompt(
      "Type DELETE to confirm bulk deletion for current explorer filters."
    );
    if (confirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await deleteEventsByFilters(params);
      if (!res?.success) {
        setError(res?.message || "Failed to delete filtered events.");
      } else {
        await fetchEvents(1);
      }
    } catch (err) {
      setError(err?.message || "Failed to delete filtered events.");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportExplorerCsv = () => {
    if (!events.length) {
      setError("No events to export for current page.");
      return;
    }
    const headers = ["eventType", "channel", "sourcePlatform", "user", "sessionId", "path", "timestamp"];
    const rows = events.map((ev) => [
      ev?.eventType || "",
      ev?.channel || "",
      ev?.sourcePlatform || "",
      ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
      ev?.sessionId || "",
      ev?.path || "",
      ev?.timestamp || ev?.createdAt || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_explorer_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildSummaryParams = () => {
    const params = {};
    if (filters.channel !== "all") params.channel = filters.channel;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (summaryModule !== "all") params.module = summaryModule;
    if (filters.eventType.trim()) params.eventType = filters.eventType.trim();
    return params;
  };

  const loadChartsSummary = async (dateOverride = null) => {
    setChartsLoading(true);
    setChartsError("");
    setError("");
    try {
      const params = buildSummaryParams();
      if (dateOverride?.from) params.from = new Date(dateOverride.from).toISOString();
      if (dateOverride?.to) params.to = new Date(dateOverride.to).toISOString();
      const res = await getAnalyticsSummary(params);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load analytics summary.");
      }
      setSummaryData(res?.data || null);
    } catch (err) {
      const message = err?.message || "Failed to load chart data.";
      setChartsError(message);
      setError(message);
      setSummaryData(null);
    } finally {
      setChartsLoading(false);
    }
  };

  const runInsightQuery = async () => {
    if (!insightQuery) {
      setError("Please select an insight query.");
      return;
    }

    setInsightLoading(true);
    setError("");
    setInsightError("");
    try {
      if (insightQuery === "phase1_summary") {
        const res = await getAnalyticsSummary(buildSummaryParams());
        if (!res?.success) {
          throw new Error(res?.message || "Failed to load analytics summary.");
        }
        setSummaryData(res?.data || null);
        setInsightRows([]);
        setInsightMeta({
          source: "analytics_events",
          eventTypesScanned: filters.eventType.trim() ? [filters.eventType.trim()] : ["phase1_summary"],
          totalEventsScanned: 0,
        });
        return;
      }
      setSummaryData(null);

      const eventTypes = INSIGHT_EVENT_TYPES[insightQuery] || [];
      if (eventTypes.length === 0) {
        setInsightRows([]);
        setInsightMeta({
          source: "analytics_events",
          eventTypesScanned: [],
          totalEventsScanned: 0,
        });
        setInsightLoading(false);
        return;
      }

      if (insightQuery === "most_added_to_cart") {
        // Primary source: analytics add_to_cart events
      const baseParams = { limit: 200 };
      if (filters.platform !== "all") baseParams.channel = filters.platform;
      else if (filters.channel !== "all" && filters.channel !== "app") baseParams.channel = filters.channel;
        if (filters.from) baseParams.from = new Date(filters.from).toISOString();
        if (filters.to) baseParams.to = new Date(filters.to).toISOString();

        const collected = [];
        let page = 1;
        let totalPages = 1;
        const maxPages = 20;
        while (page <= totalPages && page <= maxPages) {
          const res = await getEventAnalytics({
            ...baseParams,
            eventType: "add_to_cart",
            page,
          });
          if (!res?.success) {
            throw new Error(res?.message || "Failed to run insight query.");
          }
          const pageRows = Array.isArray(res.data) ? res.data : [];
          collected.push(...pageRows);
          totalPages = Number(res?.pagination?.totalPages || 1);
          page += 1;
        }

        const counts = new Map();
        const upsertCount = (key, label, inc = 1) => {
          const normalizedKey = String(key || "unknown");
          const current = counts.get(normalizedKey) || { key: normalizedKey, label, count: 0 };
          current.count += inc;
          counts.set(normalizedKey, current);
        };

        const getEventProductLabel = (ev) => {
          const itemObj = ev?.itemId && typeof ev.itemId === "object" ? ev.itemId : null;
          const itemId = itemObj?._id || ev?.itemId || ev?.meta?.itemId || ev?.meta?.productId || ev?.sku;
          const itemName =
            itemObj?.name || ev?.meta?.itemName || ev?.meta?.productName || ev?.sku || null;
          if (!itemId) return null;
          const key = String(itemId);
          const label = itemName ? `${itemName} (${key})` : key;
          return { key, label };
        };

        collected.forEach((ev) => {
          const product = getEventProductLabel(ev);
          if (!product) return;
          const quantity = Number(ev?.quantity || ev?.meta?.quantity || 1);
          upsertCount(
            product.key,
            product.label,
            Number.isFinite(quantity) && quantity > 0 ? quantity : 1
          );
        });

        let topRows = Array.from(counts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        let source = "analytics_events";
        let scanned = collected.length;

        // Fallback source: orders (when add_to_cart analytics is sparse/empty)
        if (topRows.length === 0) {
          const statusesToScan = ["CONFIRMED", "DELIVERED"];
          const maxOrderPages = 20;
          const allOrders = [];

          for (const orderStatus of statusesToScan) {
            let oPage = 1;
            let oTotalPages = 1;
            while (oPage <= oTotalPages && oPage <= maxOrderPages) {
              const res = await getOrders(
                oPage,
                100,
                "",
                orderStatus,
                filters.from || undefined,
                filters.to || undefined,
                "createdAt",
                "desc"
              );
              const payload = res?.data ?? {};
              const orders = Array.isArray(payload?.orders) ? payload.orders : [];
              allOrders.push(...orders);
              oTotalPages = Number(payload?.pagination?.totalPages || 1);
              oPage += 1;
            }
          }

          const fallbackCounts = new Map();
          const upsertFallback = (key, label, inc = 1) => {
            const normalizedKey = String(key || "unknown");
            const current = fallbackCounts.get(normalizedKey) || { key: normalizedKey, label, count: 0 };
            current.count += inc;
            fallbackCounts.set(normalizedKey, current);
          };

          allOrders.forEach((order) => {
            const orderItems = Array.isArray(order?.items) ? order.items : [];
            orderItems.forEach((item) => {
              const productId =
                item?.itemId?._id ||
                item?.itemId ||
                item?.productItemId ||
                item?.productId ||
                item?.sku;
              if (!productId) return;
              const productName =
                item?.name || item?.itemName || item?.productName || item?.sku || null;
              const quantity = Number(item?.quantity || 1);
              const label = productName ? `${productName} (${productId})` : String(productId);
              upsertFallback(productId, label, Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
            });
          });

          topRows = Array.from(fallbackCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          source = "orders";
          scanned = allOrders.length;
          setInsightMeta({
            source,
            eventTypesScanned: statusesToScan.map((s) => `order_status:${s}`),
            totalEventsScanned: scanned,
          });
        } else {
          setInsightMeta({
            source,
            eventTypesScanned: ["add_to_cart"],
            totalEventsScanned: scanned,
          });
        }

        setInsightRows(topRows);
        return;
      }

      if (insightQuery === "top_selling_products") {
        const statusesToScan = ["CONFIRMED", "DELIVERED"];
        const maxPages = 20; // Safety cap
        const allOrders = [];

        for (const orderStatus of statusesToScan) {
          let page = 1;
          let totalPages = 1;
          while (page <= totalPages && page <= maxPages) {
            const res = await getOrders(
              page,
              100,
              "",
              orderStatus,
              filters.from || undefined,
              filters.to || undefined,
              "createdAt",
              "desc"
            );
            const payload = res?.data ?? {};
            const orders = Array.isArray(payload?.orders) ? payload.orders : [];
            allOrders.push(...orders);
            totalPages = Number(payload?.pagination?.totalPages || 1);
            page += 1;
          }
        }

        const counts = new Map();
        const upsertCount = (key, label, inc = 1) => {
          const normalizedKey = String(key || "unknown");
          const current = counts.get(normalizedKey) || { key: normalizedKey, label, count: 0 };
          current.count += inc;
          counts.set(normalizedKey, current);
        };

        allOrders.forEach((order) => {
          const orderItems = Array.isArray(order?.items) ? order.items : [];
          orderItems.forEach((item) => {
            const productId =
              item?.itemId?._id ||
              item?.itemId ||
              item?.productItemId ||
              item?.productId ||
              item?.sku;
            if (!productId) return;
            const productName =
              item?.name || item?.itemName || item?.productName || item?.sku || null;
            const quantity = Number(item?.quantity || 1);
            const label = productName ? `${productName} (${productId})` : String(productId);
            upsertCount(productId, label, Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
          });
        });

        const topRows = Array.from(counts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setInsightRows(topRows);
        setInsightMeta({
          source: "orders",
          eventTypesScanned: statusesToScan.map((s) => `order_status:${s}`),
          totalEventsScanned: allOrders.length,
        });
        return;
      }

      const baseParams = {
        limit: 200,
      };
      if (filters.platform !== "all") baseParams.channel = filters.platform;
      else if (filters.channel !== "all" && filters.channel !== "app") baseParams.channel = filters.channel;
      if (filters.from) baseParams.from = new Date(filters.from).toISOString();
      if (filters.to) baseParams.to = new Date(filters.to).toISOString();

      // Pull multiple pages to avoid missing data beyond the first page.
      const fetchEventsForType = async (eventType) => {
        const collected = [];
        let page = 1;
        let totalPages = 1;
        const maxPages = 20; // Safety cap: 20 * 200 = 4000 events per event type.

        while (page <= totalPages && page <= maxPages) {
          const res = await getEventAnalytics({
            ...baseParams,
            eventType,
            page,
          });
          if (!res?.success) {
            throw new Error(res?.message || "Failed to run insight query.");
          }
          const pageRows = Array.isArray(res.data) ? res.data : [];
          collected.push(...pageRows);
          totalPages = Number(res?.pagination?.totalPages || 1);
          page += 1;
        }
        return collected;
      };

      const rowsByType = await Promise.all(eventTypes.map((et) => fetchEventsForType(et)));
      const rows = rowsByType.flat();
      setInsightMeta({
        source: "analytics_events",
        eventTypesScanned: eventTypes,
        totalEventsScanned: rows.length,
      });
      const counts = new Map();

      const upsertCount = (key, label, inc = 1) => {
        const normalizedKey = String(key || "unknown");
        const current = counts.get(normalizedKey) || { key: normalizedKey, label, count: 0 };
        current.count += inc;
        counts.set(normalizedKey, current);
      };

      const getEventProductLabel = (ev) => {
        const itemObj = ev?.itemId && typeof ev.itemId === "object" ? ev.itemId : null;
        const itemId = itemObj?._id || ev?.itemId || ev?.meta?.itemId || ev?.meta?.productId || ev?.sku;
        const itemName =
          itemObj?.name ||
          ev?.meta?.itemName ||
          ev?.meta?.productName ||
          ev?.sku ||
          null;
        if (!itemId) return null;
        const key = String(itemId);
        const label = itemName ? `${itemName} (${key})` : key;
        return { key, label };
      };

      rows.forEach((ev) => {
        if (insightQuery === "top_search_terms") {
          const term =
            (ev.searchQuery || ev?.meta?.searchQuery || ev?.meta?.query || "").trim() || "Unknown search";
          upsertCount(term, term, 1);
        } else if (
          insightQuery === "most_visited_products" ||
          insightQuery === "most_added_to_cart" ||
          insightQuery === "top_selling_products"
        ) {
          // Handle either single product fields or multi-item order payloads.
          const orderItems = Array.isArray(ev?.meta?.items) ? ev.meta.items : [];
          if (orderItems.length > 0) {
            orderItems.forEach((item) => {
              const productId = item?.itemId || item?.productId || item?.sku;
              if (!productId) return;
              const productName = item?.name || item?.itemName || item?.productName || item?.sku || null;
              const quantity = Number(item?.quantity || 1);
              const label = productName ? `${productName} (${productId})` : String(productId);
              upsertCount(productId, label, Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
            });
          } else {
            const product = getEventProductLabel(ev);
            if (product) {
              const quantity =
                insightQuery === "top_selling_products"
                  ? Number(ev?.quantity || ev?.meta?.quantity || 1)
                  : 1;
              upsertCount(
                product.key,
                product.label,
                Number.isFinite(quantity) && quantity > 0 ? quantity : 1
              );
            }
          }
        } else if (insightQuery === "top_visited_webpages") {
          const path = ev.path || ev?.meta?.path || "Unknown path";
          upsertCount(path, path, 1);
        }
      });

      const topRows = Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setInsightRows(topRows);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to run insight query.";
      setError(message);
      setInsightError(message);
      const eventTypes = INSIGHT_EVENT_TYPES[insightQuery] || [];
      setInsightRows([]);
      setInsightMeta({
        source: "analytics_events",
        eventTypesScanned: eventTypes,
        totalEventsScanned: 0,
      });
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    if (activeTab !== "charts") return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    const defaultFrom = toDateInput(start);
    const defaultTo = toDateInput(end);
    const from = filters.from || defaultFrom;
    const to = filters.to || defaultTo;
    if (!filters.from || !filters.to) {
      setFilters((prev) => ({ ...prev, from, to }));
    }
    loadChartsSummary({ from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const eventTypeCounts = useMemo(() => {
    return events.reduce((acc, ev) => {
      const key = ev?.eventType || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [events]);

  const uniqueUsers = useMemo(() => {
    const ids = new Set();
    events.forEach((ev) => {
      const uid = ev?.userId?._id || ev?.userId;
      if (uid) ids.add(String(uid));
    });
    return ids.size;
  }, [events]);

  const platformCounts = useMemo(() => {
    return events.reduce(
      (acc, ev) => {
        const source = String(ev?.sourcePlatform || "").toLowerCase();
        const channel = String(ev?.channel || "").toLowerCase();
        if (source === "website" || channel === "website") acc.website += 1;
        else if (source === "android") acc.android += 1;
        else if (source === "iphone" || source === "ios" || channel === "ios") acc.ios += 1;
        return acc;
      },
      { website: 0, android: 0, ios: 0 }
    );
  }, [events]);

  const totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  const isPhase1SummaryMode =
    (activeTab === "insight" && insightQuery === "phase1_summary") || activeTab === "charts";
  const chartsDashboardStatus = chartsLoading
    ? "Loading"
    : chartsError || error
      ? "Error"
      : summaryData?.metrics
        ? "Loaded"
        : "Empty";
  const hasActiveFilters =
    filters.channel !== "all" ||
    filters.platform !== "all" ||
    Boolean(filters.eventType.trim()) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    summaryModule !== "all";
  const dashboardStatus = insightLoading
    ? "Loading"
    : insightError || error
      ? "Error"
      : summaryData?.metrics || insightRows.length > 0
        ? "Loaded"
        : "Empty";

  return (
    <div className="text-stone-900">
      <div className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}>
        <h1 className="mr-auto shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Analytics
        </h1>
        <SegmentedTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "charts", label: "Charts" },
            { id: "insight", label: "Insight" },
            { id: "event", label: "Event" },
          ]}
        />
        <button type="button" onClick={() => fetchEvents(currentPage)} className={btnOutline}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      <div className={`${pageToolbar} mb-2 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap`}>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="rounded-full bg-canvas-muted px-2 py-0.5 font-medium text-stone-700">
            {activeTab === "overview"
              ? "Overview"
              : activeTab === "charts"
                ? "Charts"
                : activeTab === "insight"
                  ? "Insight"
                  : "Event"}
          </span>
          {isPhase1SummaryMode ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
              Dashboard summary
            </span>
          ) : null}
          {!hasActiveFilters ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning">
              No filters
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5">
            <FilterField label="Source">
              <select
                value={filters.channel}
                onChange={(e) => setFilters((p) => ({ ...p, channel: e.target.value }))}
                className={filterInputClass}
              >
                {(isPhase1SummaryMode ? SOURCE_OPTIONS : SOURCE_OPTIONS.filter((opt) => opt !== "app")).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "All sources" : opt}
                  </option>
                ))}
              </select>
            </FilterField>

            {!isPhase1SummaryMode ? (
              <FilterField label="Platform">
                <select
                  value={filters.platform}
                  onChange={(e) => setFilters((p) => ({ ...p, platform: e.target.value }))}
                  className={filterInputClass}
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "all" ? "All platforms" : opt}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : null}

            {!isPhase1SummaryMode ? (
              <FilterField label="Event type">
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters((p) => ({ ...p, eventType: e.target.value }))}
                  className={filterInputClass}
                >
                  {EVENT_TYPE_OPTIONS.map((eventType) => (
                    <option key={eventType} value={eventType === "all" ? "" : eventType}>
                      {eventType === "all" ? "All event types" : eventType}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : (
              <FilterField label="Module">
                <select
                  value={summaryModule}
                  onChange={(e) => setSummaryModule(e.target.value)}
                  className={filterInputClass}
                >
                  {SUMMARY_MODULE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FilterField>
            )}

            <FilterField label="From">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                className={filterInputClass}
              />
            </FilterField>

            <FilterField label="To">
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                className={filterInputClass}
              />
            </FilterField>

            {!isPhase1SummaryMode ? (
              <FilterField label="Summary module">
                <select
                  value={summaryModule}
                  onChange={(e) => setSummaryModule(e.target.value)}
                  className={filterInputClass}
                >
                  {SUMMARY_MODULE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : null}
          </div>

        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-2">
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-canvas-muted/40 px-2 py-1">
              <span className="text-[10px] font-semibold text-stone-500">Rows/page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || PAGE_SIZE)}
                className={`${filterInputClass} !w-[72px] !py-1`}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-stone-500">Presets</span>
              <button type="button" onClick={() => applyDatePreset(6)} className={btnOutline}>
                7d
              </button>
              <button type="button" onClick={() => applyDatePreset(29)} className={btnOutline}>
                30d
              </button>
              <button type="button" onClick={() => applyDatePreset(89)} className={btnOutline}>
                90d
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                await fetchEvents(1);
                if (activeTab === "charts") {
                  await loadChartsSummary();
                } else if (activeTab === "insight" && insightQuery) {
                  await runInsightQuery();
                }
              }}
              className={btnPrimary}
            >
              Apply
            </button>

            {activeTab === "event" ? (
              <select
                value={activePreset}
                onChange={(e) => applyExplorerPreset(e.target.value)}
                className={filterInputClass}
              >
                {EXPLORER_FILTER_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    Preset: {preset.label}
                  </option>
                ))}
              </select>
            ) : null}

            {activeTab === "event" ? (
              <button
                onClick={exportExplorerCsv}
                className={btnOutline}
              >
                Export CSV
              </button>
            ) : null}

            {activeTab === "event" ? (
              <button
                onClick={handleDeleteFiltered}
                disabled={isDeleting}
                className={`${btnOutline} !text-danger`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete filtered
              </button>
            ) : null}

            <button
              onClick={() => {
                setFilters({ channel: "all", platform: "all", eventType: "", from: "", to: "" });
                setInsightRows([]);
                setSummaryData(null);
                setInsightError("");
                setActivePreset("all");
                setSummaryModule("all");
                setInsightMeta({ source: "analytics_events", eventTypesScanned: [], totalEventsScanned: 0 });
                setTimeout(() => fetchEvents(1), 0);
              }}
              className={btnOutline}
            >
              Reset
            </button>
        </div>
      </div>

        {error ? (
          <div className={`${alertDanger} mb-2 flex items-center gap-2`}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <OverviewPanel
            pagination={pagination}
            loading={loading}
            uniqueUsers={uniqueUsers}
            platformCounts={platformCounts}
            events={events}
            currentPage={currentPage}
            totalPages={totalPages}
            fetchEvents={fetchEvents}
          />
        ) : null}

        {activeTab === "charts" ? (
          <ChartsPanel
            summaryData={summaryData}
            insightRows={insightRows}
            summaryModule={summaryModule}
            loading={chartsLoading}
            error={chartsError}
            onRefresh={loadChartsSummary}
            dashboardStatus={chartsDashboardStatus}
          />
        ) : null}

        {activeTab === "insight" ? (
          <InsightPanel
            dashboardStatus={dashboardStatus}
            insightQuery={insightQuery}
            setInsightQuery={setInsightQuery}
            insightLoading={insightLoading}
            runInsightQuery={runInsightQuery}
            INSIGHT_QUERY_OPTIONS={INSIGHT_QUERY_OPTIONS}
            insightError={insightError}
            summaryData={summaryData}
            insightMeta={insightMeta}
            insightRows={insightRows}
          />
        ) : null}

        {activeTab === "event" ? (
          <ExplorerPanel
            eventTypeCounts={eventTypeCounts}
            loading={loading}
            events={events}
            isDeleting={isDeleting}
            handleDeleteEvent={handleDeleteEvent}
            currentPage={currentPage}
            totalPages={totalPages}
            fetchEvents={fetchEvents}
          />
        ) : null}
    </div>
  );
};

export default EventAnalyticsTab;