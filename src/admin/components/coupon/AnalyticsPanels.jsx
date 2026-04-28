import React, { useMemo, useState } from "react";
import { Activity, Smartphone, Store, Users, ChevronLeft, ChevronRight, Trash2, Eye } from "lucide-react";
import { CardSection, EmptyState, KpiTile, StatusPill, SummaryStat, TimelineTable } from "./AnalyticsUiParts";

export function OverviewPanel({
  pagination,
  loading,
  uniqueUsers,
  platformCounts,
  events,
  currentPage,
  totalPages,
  fetchEvents,
}) {
  const [selectedKpi, setSelectedKpi] = useState("events_filtered");
  const INSTALL_EVENT_TYPES = ["app_install", "app_first_open"];
  const toRow = (ev) => ({
    eventType: ev?.eventType || "-",
    user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
    path: ev?.path || "-",
    timestamp: ev?.timestamp || ev?.createdAt || "",
  });

  const installsByPlatform = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const now = new Date();
    const startOfLast7 = new Date();
    startOfLast7.setDate(now.getDate() - 6);
    startOfLast7.setHours(0, 0, 0, 0);

    const isInstallEvent = (ev) => INSTALL_EVENT_TYPES.includes(String(ev?.eventType || "").toLowerCase());
    const normalizePlatform = (ev) => {
      const source = String(ev?.sourcePlatform || "").toLowerCase();
      if (source === "android") return "android";
      if (source === "iphone" || source === "ios") return "iphone";
      return "other";
    };

    const baseRows = events.filter((ev) => isInstallEvent(ev));
    const androidRows = baseRows.filter((ev) => normalizePlatform(ev) === "android");
    const iphoneRows = baseRows.filter((ev) => normalizePlatform(ev) === "iphone");

    const inRange = (ev, from, to) => {
      const t = new Date(ev?.timestamp || ev?.createdAt || 0);
      return !Number.isNaN(t.getTime()) && t >= from && t <= to;
    };

    return {
      androidTodayRows: androidRows.filter((ev) => inRange(ev, startOfToday, now)),
      iphoneTodayRows: iphoneRows.filter((ev) => inRange(ev, startOfToday, now)),
      androidLast7Rows: androidRows.filter((ev) => inRange(ev, startOfLast7, now)),
      iphoneLast7Rows: iphoneRows.filter((ev) => inRange(ev, startOfLast7, now)),
    };
  }, [events]);

  const uniqueUserRows = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const uid = ev?.userId?._id || ev?.userId;
      if (!uid) return;
      if (!map.has(String(uid))) {
        map.set(String(uid), {
          user: ev?.userId?.name || String(uid),
          userId: String(uid),
          latestEventType: ev?.eventType || "-",
          latestTimestamp: ev?.timestamp || ev?.createdAt || "",
        });
      }
    });
    return Array.from(map.values()).slice(0, 25);
  }, [events]);

  const websiteRows = useMemo(
    () =>
      events
        .filter((ev) => ev?.channel === "website")
        .slice(0, 25)
        .map((ev) => ({
          eventType: ev?.eventType || "-",
          user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
          path: ev?.path || "-",
          timestamp: ev?.timestamp || ev?.createdAt || "",
        })),
    [events]
  );

  const appRows = useMemo(
    () =>
      events
        .filter((ev) => ev?.channel === "app")
        .slice(0, 25)
        .map((ev) => ({
          eventType: ev?.eventType || "-",
          user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
          path: ev?.path || "-",
          timestamp: ev?.timestamp || ev?.createdAt || "",
        })),
    [events]
  );

  const eventRows = useMemo(
    () =>
      events.slice(0, 25).map((ev) => ({
        eventType: ev?.eventType || "-",
        channel: ev?.channel || "-",
        user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
        timestamp: ev?.timestamp || ev?.createdAt || "",
      })),
    [events]
  );

  const selectedTitle =
    selectedKpi === "events_filtered"
      ? "Events (filtered) list"
      : selectedKpi === "unique_users"
        ? "Unique users list"
        : selectedKpi === "website_events"
          ? "Website events list"
          : selectedKpi === "android_events"
            ? "Android events list"
            : selectedKpi === "iphone_events"
              ? "iPhone events list"
              : selectedKpi === "android_installs_today"
                ? "Android installs today (current page)"
                : selectedKpi === "iphone_installs_today"
                  ? "iPhone installs today (current page)"
                  : selectedKpi === "android_installs_7d"
                    ? "Android installs last 7 days (current page)"
                    : selectedKpi === "iphone_installs_7d"
                      ? "iPhone installs last 7 days (current page)"
              : "App events list";

  const selectedRows =
    selectedKpi === "events_filtered"
      ? eventRows
      : selectedKpi === "unique_users"
        ? uniqueUserRows
        : selectedKpi === "website_events"
          ? websiteRows
        : selectedKpi === "android_events"
          ? events
              .filter((ev) => String(ev?.sourcePlatform || "").toLowerCase() === "android")
              .slice(0, 25)
              .map((ev) => ({
                eventType: ev?.eventType || "-",
                user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
                path: ev?.path || "-",
                timestamp: ev?.timestamp || ev?.createdAt || "",
              }))
          : selectedKpi === "iphone_events"
            ? events
                .filter((ev) => ["iphone", "ios"].includes(String(ev?.sourcePlatform || "").toLowerCase()))
                .slice(0, 25)
                .map((ev) => ({
                  eventType: ev?.eventType || "-",
                  user: ev?.userId?.name || ev?.userId?._id || ev?.userId || "Guest",
                  path: ev?.path || "-",
                  timestamp: ev?.timestamp || ev?.createdAt || "",
                }))
            : selectedKpi === "android_installs_today"
              ? installsByPlatform.androidTodayRows.slice(0, 25).map(toRow)
              : selectedKpi === "iphone_installs_today"
                ? installsByPlatform.iphoneTodayRows.slice(0, 25).map(toRow)
                : selectedKpi === "android_installs_7d"
                  ? installsByPlatform.androidLast7Rows.slice(0, 25).map(toRow)
                  : selectedKpi === "iphone_installs_7d"
                    ? installsByPlatform.iphoneLast7Rows.slice(0, 25).map(toRow)
          : appRows;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          icon={<Activity className="h-5 w-5 text-indigo-600" />}
          title="Events (filtered)"
          value={Number(pagination?.total || 0).toLocaleString()}
          subtitle="Total matching events"
          onClick={() => setSelectedKpi("events_filtered")}
          active={selectedKpi === "events_filtered"}
        />
        <KpiTile
          icon={<Users className="h-5 w-5 text-violet-600" />}
          title="Unique users (page)"
          value={uniqueUsers.toLocaleString()}
          subtitle="Distinct users in current page"
          onClick={() => setSelectedKpi("unique_users")}
          active={selectedKpi === "unique_users"}
        />
        <KpiTile
          icon={<Store className="h-5 w-5 text-emerald-600" />}
          title="Website events"
          value={platformCounts.website.toLocaleString()}
          subtitle="Current page"
          onClick={() => setSelectedKpi("website_events")}
          active={selectedKpi === "website_events"}
        />
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-green-600" />}
          title="Android events"
          value={platformCounts.android.toLocaleString()}
          subtitle="Current page"
          onClick={() => setSelectedKpi("android_events")}
          active={selectedKpi === "android_events"}
        />
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-amber-600" />}
          title="iPhone events"
          value={platformCounts.iphone.toLocaleString()}
          subtitle="Current page"
          onClick={() => setSelectedKpi("iphone_events")}
          active={selectedKpi === "iphone_events"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-green-600" />}
          title="Android installs (today)"
          value={installsByPlatform.androidTodayRows.length.toLocaleString()}
          subtitle="Install events in current page"
          onClick={() => setSelectedKpi("android_installs_today")}
          active={selectedKpi === "android_installs_today"}
        />
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-violet-600" />}
          title="iPhone installs (today)"
          value={installsByPlatform.iphoneTodayRows.length.toLocaleString()}
          subtitle="Install events in current page"
          onClick={() => setSelectedKpi("iphone_installs_today")}
          active={selectedKpi === "iphone_installs_today"}
        />
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-green-600" />}
          title="Android installs (7d)"
          value={installsByPlatform.androidLast7Rows.length.toLocaleString()}
          subtitle="Install events in current page"
          onClick={() => setSelectedKpi("android_installs_7d")}
          active={selectedKpi === "android_installs_7d"}
        />
        <KpiTile
          icon={<Smartphone className="h-5 w-5 text-violet-600" />}
          title="iPhone installs (7d)"
          value={installsByPlatform.iphoneLast7Rows.length.toLocaleString()}
          subtitle="Install events in current page"
          onClick={() => setSelectedKpi("iphone_installs_7d")}
          active={selectedKpi === "iphone_installs_7d"}
        />
      </div>

      <CardSection title={selectedTitle}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-row-${idx}`} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : selectedRows.length === 0 ? (
          <EmptyState title="No rows available" description="Apply filters and refresh to see analytics rows." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {selectedKpi === "unique_users" ? (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Event</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Event</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Path / Source</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedRows.map((row, idx) => (
                  <tr key={`${selectedKpi}-${idx}`}>
                    {selectedKpi === "unique_users" ? (
                      <>
                        <td className="px-3 py-2 text-xs text-slate-700">{row.user}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{row.userId}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{row.latestEventType}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-600">
                          {row.latestTimestamp ? new Date(row.latestTimestamp).toLocaleString("en-IN") : "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-xs text-slate-700">{row.eventType}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{row.user}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{row.path || row.channel || "-"}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-600">
                          {row.timestamp ? new Date(row.timestamp).toLocaleString("en-IN") : "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardSection>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-600">
          Page {currentPage} of {totalPages} <span className="text-slate-400">| Total rows: {Number(pagination?.total || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => fetchEvents(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function InsightPanel({
  dashboardStatus,
  insightQuery,
  setInsightQuery,
  insightLoading,
  runInsightQuery,
  INSIGHT_QUERY_OPTIONS,
  insightError,
  summaryData,
  insightMeta,
  insightRows,
}) {
  const [showAllSummaryMetrics, setShowAllSummaryMetrics] = useState(false);
  const [showMetricSources, setShowMetricSources] = useState(false);

  const summaryTimelines = useMemo(() => {
    if (!summaryData?.metrics) return [];
    const m = summaryData.metrics;
    return [
      { id: "websiteUserTimeline", title: "Website users by day", rows: m.websiteUserTimeline || [] },
      { id: "appUserTimeline", title: "App users by day", rows: m.appUserTimeline || [] },
      { id: "walletAddedTimeline", title: "Wallet added value by day", rows: m.walletAddedTimeline || [], valuePrefix: "Rs " },
      { id: "orderedValueTimeline", title: "Ordered value by day", rows: m.orderedValueTimeline || [], valuePrefix: "Rs " },
      { id: "newSigninTimeline", title: "New signins by day", rows: m.newSigninTimeline || [] },
      { id: "appInstallTimeline", title: "App installs by day", rows: m.appInstallTimeline || [] },
      { id: "androidInstallTimeline", title: "Android installs by day", rows: m.androidInstallTimeline || [] },
      { id: "iphoneInstallTimeline", title: "iPhone installs by day", rows: m.iphoneInstallTimeline || [] },
      { id: "cartTimeline", title: "Cart events by day", rows: m.cartTimeline || [] },
      { id: "rewardsEarnedTimeline", title: "Rewards earned by day", rows: m.rewardsEarnedTimeline || [] },
      { id: "rewardsRedeemedTimeline", title: "Rewards redeemed by day", rows: m.rewardsRedeemedTimeline || [] },
      { id: "couponAppliedTimeline", title: "Coupon applied by day", rows: m.couponAppliedTimeline || [] },
      { id: "couponUsageTimeline", title: "Coupon usage by day", rows: m.couponUsageTimeline || [] },
      { id: "wishlistAddTimeline", title: "Wishlist add by day", rows: m.wishlistAddTimeline || [] },
      { id: "checkoutTimeline", title: "Checkout by day", rows: m.checkoutTimeline || [] },
      { id: "failedTimeline", title: "Failed events by day", rows: m.failedTimeline || [] },
      { id: "successTimeline", title: "Success events by day", rows: m.successTimeline || [] },
      { id: "deliveredTimeline", title: "Delivered orders by day", rows: m.deliveredTimeline || [] },
    ];
  }, [summaryData]);

  const nonEmptySummaryTimelines = useMemo(
    () => summaryTimelines.filter((x) => (x.rows || []).length > 0),
    [summaryTimelines]
  );

  const timelinesToRender = showAllSummaryMetrics
    ? summaryTimelines
    : nonEmptySummaryTimelines;

  return (
    <div className="space-y-5">

      <CardSection
        title="Insights Lab"
        actions={<StatusPill status={dashboardStatus} />}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={insightQuery}
              onChange={(e) => setInsightQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-md"
            >
              {INSIGHT_QUERY_OPTIONS.map((opt) => (
                <option key={opt.id || "none"} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={runInsightQuery}
              disabled={insightLoading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {insightLoading ? "Running..." : "Run Query"}
            </button>
          </div>

          {insightError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Query error: {insightError}
            </div>
          ) : null}

          {summaryData?.metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SummaryStat title="Repeat Order Users" value={Number(summaryData.metrics.repeatOrderUsersCount || 0).toLocaleString()} />
                <SummaryStat title="Wishlist Current Count" value={Number(summaryData.metrics.wishlistCurrentCount || 0).toLocaleString()} />
                <SummaryStat title="Most Ordered Pincodes" value={Number(summaryData.metrics.mostOrderedPincode?.length || 0).toLocaleString()} />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold">Backend compatibility notes</div>
                {(summaryData?.compatibility?.notes || []).map((n) => (
                  <div key={n}>- {n}</div>
                ))}
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
                <div className="font-semibold">Summary meta</div>
                <div>Generated at: {summaryData?.generatedAt || "-"}</div>
                <div>Query time: {Number(summaryData?.queryTimeMs || 0)} ms</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Metric sources</div>
                  <button
                    type="button"
                    onClick={() => setShowMetricSources((v) => !v)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium hover:bg-slate-50"
                  >
                    {showMetricSources ? "Hide" : "Show"}
                  </button>
                </div>
                {showMetricSources ? (
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {Object.entries(summaryData?.sources || {}).map(([metric, source]) => (
                      <div key={metric} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                        <span>{metric}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium">{source}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Expand when you need to audit backend source mapping.</div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <div className="text-slate-700">
                  Showing <span className="font-semibold">{timelinesToRender.length}</span> metric blocks
                  {!showAllSummaryMetrics ? <span> (only non-empty for current filters)</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllSummaryMetrics((v) => !v)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium hover:bg-slate-100"
                >
                  {showAllSummaryMetrics ? "Show only relevant" : "Show all"}
                </button>
              </div>
              {timelinesToRender.map((block) => (
                <TimelineTable key={block.id} title={block.title} rows={block.rows} valuePrefix={block.valuePrefix || ""} />
              ))}
            </div>
          ) : null}

          {insightMeta.eventTypesScanned.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                Source: {insightMeta.source === "orders" ? "orders" : "analytics events"}
              </span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                Event types scanned: {insightMeta.eventTypesScanned.join(", ")}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
                Total rows scanned: {insightMeta.totalEventsScanned.toLocaleString()}
              </span>
            </div>
          ) : null}

          {!summaryData?.metrics && insightRows.length === 0 ? (
            <EmptyState
              title="No insight output yet"
              description={
                insightQuery === "phase1_summary"
                  ? "Select filters and run query to generate the phase summary."
                  : "No ranked data found for this query in the current filters."
              }
            />
          ) : null}

          {!summaryData?.metrics && insightRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {insightRows.map((row, idx) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">#{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.label}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </CardSection>
    </div>
  );
}

export function ExplorerPanel({
  eventTypeCounts,
  loading,
  events,
  isDeleting,
  handleDeleteEvent,
  currentPage,
  totalPages,
  fetchEvents,
}) {
  const [expandedEventId, setExpandedEventId] = useState(null);
  const renderPlatformBadge = (platform) => {
    const value = String(platform || "unknown").toLowerCase();
    const label =
      value === "iphone" ? "iPhone" : value === "android" ? "Android" : value === "website" ? "Website" : value === "app" ? "App" : "Unknown";
    const tone =
      value === "iphone"
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : value === "android"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : value === "website"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-slate-50 text-slate-700 border-slate-200";
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
  };

  return (
    <div className="space-y-5">
      <CardSection title="Event Hotspots (current page)">
        {Object.keys(eventTypeCounts).length === 0 ? (
          <EmptyState title="No event counts available" description="Try broadening your filters to inspect top event types." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventTypeCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([eventType, count]) => (
                <span key={eventType} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {eventType}: {count}
                </span>
              ))}
          </div>
        )}
      </CardSection>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Session</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Path</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`explorer-skeleton-${idx}`}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No events found for selected filters.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isExpanded = expandedEventId === ev._id;
                  return (
                    <React.Fragment key={ev._id}>
                      <tr className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{ev.eventType}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{ev.channel || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{renderPlatformBadge(ev.sourcePlatform)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {ev.userId?.name || ev.userId?._id || ev.userId || "Guest"}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-600">{ev.sessionId || "-"}</td>
                        <td className="max-w-[300px] truncate px-4 py-3 text-xs text-slate-600">{ev.path || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600">
                          {new Date(ev.timestamp || ev.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedEventId((prev) => (prev === ev._id ? null : ev._id))}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <Eye size={12} />
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev._id)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 text-xs text-slate-700 md:grid-cols-2">
                              <div>
                                <div className="font-semibold text-slate-900">Source Platform</div>
                                <div>{ev.sourcePlatform || "unknown"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Event ID</div>
                                <div className="break-all">{ev._id || "-"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">User ID</div>
                                <div className="break-all">{ev.userId?._id || ev.userId || "Guest"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Session</div>
                                <div className="break-all">{ev.sessionId || "-"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Timestamp</div>
                                <div>{new Date(ev.timestamp || ev.createdAt).toLocaleString("en-IN")}</div>
                              </div>
                              <div className="md:col-span-2">
                                <div className="font-semibold text-slate-900">Meta Payload</div>
                                <pre className="mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
                                  {JSON.stringify(ev?.meta || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEvents(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => fetchEvents(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
