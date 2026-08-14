import React, { useMemo, useState } from "react";
import { Activity, Smartphone, Store, Users, Trash2, Eye } from "lucide-react";
import {
  CardSection,
  EmptyState,
  KpiTile,
  PaginationFooter,
  StatusPill,
  SummaryStat,
  TimelineTable,
} from "./AnalyticsUiParts";
import {
  btnIconEdit,
  btnOutline,
  btnPrimary,
  filterInputClass,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./analyticsShared";

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
      if (source === "iphone" || source === "ios") return "ios";
      return "other";
    };

    const baseRows = events.filter((ev) => isInstallEvent(ev));
    const androidRows = baseRows.filter((ev) => normalizePlatform(ev) === "android");
    const iosRows = baseRows.filter((ev) => normalizePlatform(ev) === "ios");

    const inRange = (ev, from, to) => {
      const t = new Date(ev?.timestamp || ev?.createdAt || 0);
      return !Number.isNaN(t.getTime()) && t >= from && t <= to;
    };

    return {
      androidTodayRows: androidRows.filter((ev) => inRange(ev, startOfToday, now)),
      iosTodayRows: iosRows.filter((ev) => inRange(ev, startOfToday, now)),
      androidLast7Rows: androidRows.filter((ev) => inRange(ev, startOfLast7, now)),
      iosLast7Rows: iosRows.filter((ev) => inRange(ev, startOfLast7, now)),
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
        .filter((ev) => ["android", "ios"].includes(String(ev?.channel || "").toLowerCase()))
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
                ? installsByPlatform.iosTodayRows.slice(0, 25).map(toRow)
                : selectedKpi === "android_installs_7d"
                  ? installsByPlatform.androidLast7Rows.slice(0, 25).map(toRow)
                  : selectedKpi === "iphone_installs_7d"
                    ? installsByPlatform.iosLast7Rows.slice(0, 25).map(toRow)
          : appRows;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
          value={platformCounts.ios.toLocaleString()}
          subtitle="Current page"
          onClick={() => setSelectedKpi("iphone_events")}
          active={selectedKpi === "iphone_events"}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
          value={installsByPlatform.iosTodayRows.length.toLocaleString()}
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
          value={installsByPlatform.iosLast7Rows.length.toLocaleString()}
          subtitle="Install events in current page"
          onClick={() => setSelectedKpi("iphone_installs_7d")}
          active={selectedKpi === "iphone_installs_7d"}
        />
      </div>

      <CardSection title={selectedTitle}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-row-${idx}`} className="h-8 animate-pulse rounded-lg bg-canvas-muted" />
            ))}
          </div>
        ) : selectedRows.length === 0 ? (
          <EmptyState title="No rows available" description="Apply filters and refresh to see analytics rows." />
        ) : (
          <div className={tableScrollShell}>
            <table className="min-w-full text-[11px]">
              <thead className={tableHeadClass}>
                <tr>
                  {selectedKpi === "unique_users" ? (
                    <>
                      <th className={thClass}>User</th>
                      <th className={thClass}>User ID</th>
                      <th className={thClass}>Latest event</th>
                      <th className={`${thClass} text-right`}>Timestamp</th>
                    </>
                  ) : (
                    <>
                      <th className={thClass}>Event</th>
                      <th className={thClass}>User</th>
                      <th className={thClass}>Path / source</th>
                      <th className={`${thClass} text-right`}>Timestamp</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {selectedRows.map((row, idx) => (
                  <tr key={`${selectedKpi}-${idx}`} className="hover:bg-canvas-muted/50">
                    {selectedKpi === "unique_users" ? (
                      <>
                        <td className="px-2 py-1.5 text-stone-700">{row.user}</td>
                        <td className="px-2 py-1.5 text-stone-500">{row.userId}</td>
                        <td className="px-2 py-1.5 text-stone-700">{row.latestEventType}</td>
                        <td className="px-2 py-1.5 text-right text-stone-600">
                          {row.latestTimestamp ? new Date(row.latestTimestamp).toLocaleString("en-IN") : "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-stone-700">{row.eventType}</td>
                        <td className="px-2 py-1.5 text-stone-700">{row.user}</td>
                        <td className="px-2 py-1.5 text-stone-500">{row.path || row.channel || "-"}</td>
                        <td className="px-2 py-1.5 text-right text-stone-600">
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

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        total={pagination?.total}
        loading={loading}
        onPrev={() => fetchEvents(currentPage - 1)}
        onNext={() => fetchEvents(currentPage + 1)}
      />
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
      { id: "cartTimeline", title: "Add to cart by day", rows: m.cartTimeline || [] },
      { id: "cartViewTimeline", title: "Cart views by day", rows: m.cartViewTimeline || [] },
      { id: "removeFromCartTimeline", title: "Remove from cart by day", rows: m.removeFromCartTimeline || [] },
      { id: "orderPlacedTimeline", title: "Orders placed (events) by day", rows: m.orderPlacedTimeline || [] },
      { id: "orderCancelledTimeline", title: "Order cancellations by day", rows: m.orderCancelledTimeline || [] },
      { id: "refundRequestedTimeline", title: "Refund requests by day", rows: m.refundRequestedTimeline || [] },
      { id: "orderTrackingViewTimeline", title: "Order tracking views by day", rows: m.orderTrackingViewTimeline || [] },
      { id: "rewardsEarnedTimeline", title: "Rewards earned by day", rows: m.rewardsEarnedTimeline || [] },
      { id: "rewardsRedeemedTimeline", title: "Rewards redeemed by day", rows: m.rewardsRedeemedTimeline || [] },
      { id: "couponAppliedTimeline", title: "Coupon applied by day", rows: m.couponAppliedTimeline || [] },
      { id: "couponUsageTimeline", title: "Coupon usage by day", rows: m.couponUsageTimeline || [] },
      { id: "wishlistAddTimeline", title: "Wishlist add by day", rows: m.wishlistAddTimeline || [] },
      { id: "checkoutTimeline", title: "Checkout by day", rows: m.checkoutTimeline || [] },
      { id: "failedTimeline", title: "Failed events by day", rows: m.failedTimeline || [] },
      { id: "successTimeline", title: "Success events by day", rows: m.successTimeline || [] },
      { id: "deliveredTimeline", title: "Delivered orders by day", rows: m.deliveredTimeline || [] },
      { id: "paymentFailedTimeline", title: "Payment failures by day", rows: m.paymentFailedTimeline || [] },
      { id: "paymentSuccessTimeline", title: "Payment success by day", rows: m.paymentSuccessTimeline || [] },
      { id: "paymentInitiatedTimeline", title: "Payment initiated by day", rows: m.paymentInitiatedTimeline || [] },
      { id: "authFailedTimeline", title: "Auth failures by day", rows: m.authFailedTimeline || [] },
      { id: "authSuccessTimeline", title: "Auth success by day", rows: m.authSuccessTimeline || [] },
      { id: "productViewTimeline", title: "Product views by day", rows: m.productViewTimeline || [] },
      { id: "searchTimeline", title: "Search events by day", rows: m.searchTimeline || [] },
      { id: "categoryViewTimeline", title: "Category views by day", rows: m.categoryViewTimeline || [] },
      { id: "recommendationTimeline", title: "Recommendations by day", rows: m.recommendationTimeline || [] },
      { id: "sessionTimeline", title: "Sessions by day", rows: m.sessionTimeline || [] },
      { id: "notificationOpenedTimeline", title: "Notification opens by day", rows: m.notificationOpenedTimeline || [] },
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
    <div className="space-y-3">
      <CardSection title="Insights" actions={<StatusPill status={dashboardStatus} />}>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={insightQuery}
              onChange={(e) => setInsightQuery(e.target.value)}
              className={`${filterInputClass} w-full sm:max-w-md`}
            >
              {INSIGHT_QUERY_OPTIONS.map((opt) => (
                <option key={opt.id || "none"} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={runInsightQuery} disabled={insightLoading} className={btnPrimary}>
              {insightLoading ? "Running…" : "Run query"}
            </button>
          </div>

          {insightError ? (
            <div className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
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
              {(summaryData.metrics.checkoutStartsCount > 0 ||
                summaryData.metrics.paymentSuccessRate != null) && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {summaryData.metrics.checkoutStartsCount > 0 ? (
                    <>
                      <SummaryStat
                        title="Checkout starts"
                        value={Number(summaryData.metrics.checkoutStartsCount || 0).toLocaleString()}
                      />
                      <SummaryStat
                        title="Orders placed (events)"
                        value={Number(summaryData.metrics.orderPlacedEventsCount || 0).toLocaleString()}
                      />
                      <SummaryStat
                        title="Cart abandonment"
                        value={
                          summaryData.metrics.cartAbandonmentRate != null
                            ? `${summaryData.metrics.cartAbandonmentRate}%`
                            : "—"
                        }
                      />
                    </>
                  ) : null}
                  {summaryData.metrics.paymentSuccessRate != null ? (
                    <SummaryStat
                      title="Payment success rate"
                      value={`${summaryData.metrics.paymentSuccessRate}%`}
                    />
                  ) : null}
                </div>
              )}
              {summaryData.metrics.repeatPaymentFailureUsers > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <SummaryStat
                    title="Repeat payment failures"
                    value={Number(summaryData.metrics.repeatPaymentFailureUsers || 0).toLocaleString()}
                  />
                  <SummaryStat
                    title="Payment successes"
                    value={Number(summaryData.metrics.paymentSuccessCount || 0).toLocaleString()}
                  />
                  <SummaryStat
                    title="Payment failures"
                    value={Number(summaryData.metrics.paymentFailedCount || 0).toLocaleString()}
                  />
                </div>
              ) : null}
              {(summaryData.metrics.engagementActiveUsers30d > 0 ||
                summaryData.metrics.notificationTotals?.totalSends > 0) && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {summaryData.metrics.engagementActiveUsers30d > 0 ? (
                    <SummaryStat
                      title="Active users (30d)"
                      value={Number(summaryData.metrics.engagementActiveUsers30d || 0).toLocaleString()}
                    />
                  ) : null}
                  {summaryData.metrics.notificationTotals?.totalSends > 0 ? (
                    <>
                      <SummaryStat
                        title="Segment sends"
                        value={Number(summaryData.metrics.notificationTotals.totalSends || 0).toLocaleString()}
                      />
                      <SummaryStat
                        title="Messages sent"
                        value={Number(summaryData.metrics.notificationTotals.totalSent || 0).toLocaleString()}
                      />
                      {summaryData.metrics.notificationSegmentAttribution?.ordersWithinWindow > 0 ? (
                        <SummaryStat
                          title="Orders after sends (48h)"
                          value={Number(
                            summaryData.metrics.notificationSegmentAttribution.ordersWithinWindow || 0,
                          ).toLocaleString()}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
              {(summaryData.metrics.notificationSegmentStats || []).length > 0 ? (
                <CardSection title="Notification segment performance">
                  <div className={tableScrollShell}>
                    <table className="min-w-full text-[11px]">
                      <thead className={tableHeadClass}>
                        <tr>
                          <th className={thClass}>Segment</th>
                          <th className={`${thClass} text-right`}>Sends</th>
                          <th className={`${thClass} text-right`}>Audience</th>
                          <th className={`${thClass} text-right`}>Sent</th>
                          <th className={`${thClass} text-right`}>Orders (48h)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {summaryData.metrics.notificationSegmentStats.map((row) => (
                          <tr key={row.segmentCode} className="hover:bg-canvas-muted/50">
                            <td className="px-2 py-1.5 font-medium text-stone-700">{row.segmentCode}</td>
                            <td className="px-2 py-1.5 text-right text-stone-600">{Number(row.sends || 0).toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right text-stone-600">{Number(row.audienceCount || 0).toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right text-stone-600">{Number(row.sentCount || 0).toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right font-medium text-emerald-700">
                              {Number(row.ordersWithinWindow || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardSection>
              ) : null}
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
            <div className={tableScrollShell}>
              <table className="min-w-full text-[11px]">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className={thClass}>Rank</th>
                    <th className={thClass}>Name</th>
                    <th className={`${thClass} text-right`}>Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {insightRows.map((row, idx) => (
                    <tr key={row.key} className="hover:bg-canvas-muted/50">
                      <td className="px-2 py-1.5 font-medium text-stone-900">#{idx + 1}</td>
                      <td className="px-2 py-1.5 text-stone-700">{row.label}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-brand-700">{row.count}</td>
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
    <div className="space-y-3">
      <CardSection title="Event hotspots (current page)">
        {Object.keys(eventTypeCounts).length === 0 ? (
          <EmptyState title="No event counts available" description="Try broadening your filters to inspect top event types." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventTypeCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([eventType, count]) => (
                <span key={eventType} className="inline-flex items-center rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] font-medium text-stone-700">
                  {eventType}: {count}
                </span>
              ))}
          </div>
        )}
      </CardSection>

      <div className={tableScrollShell}>
          <table className="min-w-[900px] w-full text-[11px]">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Event</th>
                <th className={thClass}>Source</th>
                <th className={thClass}>Platform</th>
                <th className={thClass}>User</th>
                <th className={thClass}>Session</th>
                <th className={thClass}>Path</th>
                <th className={`${thClass} text-right`}>Timestamp</th>
                <th className={`${thClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`explorer-skeleton-${idx}`}>
                    <td colSpan={8} className="px-2 py-2">
                      <div className="h-6 animate-pulse rounded-md bg-canvas-muted" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[11px] text-stone-500">
                    No events found for selected filters.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isExpanded = expandedEventId === ev._id;
                  return (
                    <React.Fragment key={ev._id}>
                      <tr className="hover:bg-canvas-muted/50">
                        <td className="whitespace-nowrap px-2 py-1.5 font-medium text-stone-900">{ev.eventType}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-stone-700">{ev.channel || "-"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[10px]">{renderPlatformBadge(ev.sourcePlatform)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-stone-600">
                          {ev.userId?.name || ev.userId?._id || ev.userId || "Guest"}
                        </td>
                        <td className="max-w-[200px] truncate px-2 py-1.5 text-stone-600">{ev.sessionId || "-"}</td>
                        <td className="max-w-[300px] truncate px-2 py-1.5 text-stone-600">{ev.path || "-"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right text-stone-600">
                          {new Date(ev.timestamp || ev.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedEventId((prev) => (prev === ev._id ? null : ev._id))}
                              className={btnIconEdit}
                              title={isExpanded ? "Hide" : "View"}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev._id)}
                              disabled={isDeleting}
                              className={`${btnOutline} !px-2 !py-1 !text-[10px] !text-danger`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={8} className="bg-canvas-muted/40 px-3 py-2">
                            <div className="grid grid-cols-1 gap-2 text-[11px] text-stone-700 md:grid-cols-2">
                              <div>
                                <div className="font-semibold text-stone-900">Source platform</div>
                                <div>{ev.sourcePlatform || "unknown"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-stone-900">Event ID</div>
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
                                <pre className="mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-white p-2 text-[10px] text-stone-600">
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

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        loading={loading}
        onPrev={() => fetchEvents(currentPage - 1)}
        onNext={() => fetchEvents(currentPage + 1)}
      />
    </div>
  );
}
