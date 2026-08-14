import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardSection, EmptyState, StatusPill, SummaryStat } from "./AnalyticsUiParts";
import { btnOutline, btnPrimary } from "./analyticsShared";
import {
  buildChannelSplit,
  buildFunnelSteps,
  buildPaymentSplit,
  formatChartDay,
  getModuleChartSeries,
  mergeTimelines,
  sumTimeline,
  toRankedBarData,
} from "./analyticsChartUtils";

const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 0 };

function ChartTooltip({ active, payload, label, valuePrefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-2 text-[10px] shadow-md">
      <p className="mb-1 font-semibold text-stone-800">{formatChartDay(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {valuePrefix}
          {Number(entry.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function FunnelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-2 text-[10px] shadow-md">
      <p className="font-semibold text-stone-800">{row.name}</p>
      <p className="text-stone-600">Count: {Number(row.value || 0).toLocaleString()}</p>
      {row.convFromPrev != null ? (
        <p className="text-stone-500">From previous: {row.convFromPrev}%</p>
      ) : null}
      {row.convFromTop != null ? (
        <p className="text-stone-500">From top: {row.convFromTop}%</p>
      ) : null}
    </div>
  );
}

function MultiLineChart({ title, data, series, height = 280, valuePrefix = "" }) {
  const hasData = data.length > 0 && series.some((s) => data.some((d) => Number(d[s.key]) > 0));
  return (
    <CardSection title={title}>
      {!hasData ? (
        <EmptyState title="No data in range" description="Adjust date filters and reload charts." />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={48} />
            <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

function StackedAreaChart({ title, data, series, height = 280 }) {
  const hasData = data.length > 0;
  return (
    <CardSection title={title}>
      {!hasData ? (
        <EmptyState title="No data in range" description="Adjust date filters and reload charts." />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={48} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="1"
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.35}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

function RevenueComposedChart({ title, data, height = 300 }) {
  const hasData = data.some((d) => Number(d.gmv) > 0 || Number(d.orders) > 0);
  return (
    <CardSection title={title}>
      {!hasData ? (
        <EmptyState title="No revenue data" description="Try a wider date range." />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              stroke="#a8a29e"
              width={56}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
            />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#a8a29e" width={40} />
            <Tooltip content={<ChartTooltip valuePrefix="Rs " />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="gmv"
              name="GMV (Rs)"
              fill="#6366f1"
              fillOpacity={0.2}
              stroke="#6366f1"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="Delivered orders"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

function HorizontalBarChart({ title, data, height, color = "#6366f1" }) {
  const chartHeight = height || Math.max(220, data.length * 28);
  return (
    <CardSection title={title}>
      {data.length === 0 ? (
        <EmptyState title="No ranked data" description="Nothing to plot for current filters." />
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} stroke="#a8a29e" />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString(), "Count"]}
              contentStyle={{ fontSize: 10 }}
            />
            <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} fill={color}>
              {data.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={entry.fill || color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

function DonutChart({ title, data, height = 260 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <CardSection title={title}>
      {total === 0 ? (
        <EmptyState title="No split data" description="Channel activity is empty for this range." />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => Number(value).toLocaleString()} contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

function FunnelChart({ title, steps }) {
  const hasData = steps.some((s) => s.value > 0);
  return (
    <CardSection title={title}>
      {!hasData ? (
        <EmptyState title="No funnel data" description="Checkout and cart events needed for funnel." />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, steps.length * 44)}>
          <BarChart data={steps} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} stroke="#a8a29e" />
            <Tooltip content={<FunnelTooltip />} />
            <Bar dataKey="value" name="Users/events" radius={[0, 4, 4, 0]}>
              {steps.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardSection>
  );
}

export function ChartsPanel({
  summaryData,
  insightRows = [],
  summaryModule = "all",
  loading = false,
  error = "",
  onRefresh,
  dashboardStatus = "Empty",
}) {
  const metrics = summaryData?.metrics || {};

  const funnelSteps = useMemo(() => buildFunnelSteps(metrics), [metrics]);

  const checkoutTrend = useMemo(
    () =>
      mergeTimelines([
        { key: "checkout", label: "Checkout", rows: metrics.checkoutTimeline, color: "#8b5cf6" },
        { key: "paymentInitiated", label: "Pay initiated", rows: metrics.paymentInitiatedTimeline, color: "#a855f7" },
        { key: "paymentSuccess", label: "Pay success", rows: metrics.paymentSuccessTimeline, color: "#22c55e" },
        { key: "orderPlaced", label: "Order placed", rows: metrics.orderPlacedTimeline, color: "#0ea5e9" },
      ]),
    [metrics],
  );

  const paymentTrend = useMemo(
    () =>
      mergeTimelines([
        { key: "success", label: "Success", rows: metrics.paymentSuccessTimeline, color: "#22c55e" },
        { key: "failed", label: "Failed", rows: metrics.paymentFailedTimeline, color: "#ef4444" },
      ]),
    [metrics],
  );

  const userTrend = useMemo(
    () =>
      mergeTimelines([
        { key: "website", label: "Website", rows: metrics.websiteUserTimeline, color: "#6366f1" },
        { key: "app", label: "App", rows: metrics.appUserTimeline, color: "#8b5cf6" },
      ]),
    [metrics],
  );

  const installTrend = useMemo(
    () =>
      mergeTimelines([
        { key: "android", label: "Android", rows: metrics.androidInstallTimeline, color: "#22c55e" },
        { key: "ios", label: "iOS", rows: metrics.iphoneInstallTimeline, color: "#0ea5e9" },
      ]),
    [metrics],
  );

  const revenueTrend = useMemo(() => {
    const gmv = metrics.orderedValueTimeline || [];
    const delivered = metrics.deliveredTimeline || [];
    const merged = mergeTimelines([
      { key: "gmv", rows: gmv },
      { key: "orders", rows: delivered },
    ]);
    return merged;
  }, [metrics]);

  const browseTrend = useMemo(
    () =>
      mergeTimelines([
        { key: "productView", label: "Product views", rows: metrics.productViewTimeline, color: "#6366f1" },
        { key: "search", label: "Search", rows: metrics.searchTimeline, color: "#8b5cf6" },
        { key: "category", label: "Categories", rows: metrics.categoryViewTimeline, color: "#0ea5e9" },
      ]),
    [metrics],
  );

  const moduleSeries = useMemo(() => getModuleChartSeries(summaryModule, metrics), [summaryModule, metrics]);
  const moduleTrend = useMemo(
    () =>
      mergeTimelines(
        moduleSeries.map((s) => ({
          key: s.id,
          label: s.label,
          rows: s.rows,
          color: s.color,
        })),
      ),
    [moduleSeries],
  );

  const channelSplit = useMemo(() => buildChannelSplit(metrics), [metrics]);
  const paymentSplit = useMemo(() => buildPaymentSplit(metrics), [metrics]);

  const pincodeRank = useMemo(
    () =>
      toRankedBarData(metrics.mostOrderedPincode || [], {
        labelKey: "pincode",
        valueKey: "orders",
      }).map((row, idx) => ({
        ...row,
        fill: ["#6366f1", "#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b"][idx % 5],
      })),
    [metrics],
  );

  const segmentRank = useMemo(
    () =>
      toRankedBarData(metrics.notificationSegmentStats || [], {
        labelKey: "segmentCode",
        valueKey: "sentCount",
      }),
    [metrics],
  );

  const insightRank = useMemo(
    () =>
      toRankedBarData(insightRows, { labelKey: "label", valueKey: "count" }).map((row, idx) => ({
        ...row,
        fill: ["#6366f1", "#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b"][idx % 5],
      })),
    [insightRows],
  );

  const cartAdds = sumTimeline(metrics.cartTimeline);

  return (
    <div className="space-y-3">
      <CardSection
        title="Analytics charts"
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={dashboardStatus} />
            <button type="button" onClick={onRefresh} disabled={loading} className={btnPrimary}>
              {loading ? "Loading…" : "Load charts"}
            </button>
          </div>
        }
      >
        <p className="text-[11px] text-stone-500">
          Visual trends from the summary API. Set date range and module filter above, then load charts.
          {summaryData?.generatedAt ? (
            <span className="ml-1 text-stone-400">
              Last loaded {new Date(summaryData.generatedAt).toLocaleString("en-IN")}
            </span>
          ) : null}
        </p>
        {error ? (
          <p className="mt-2 rounded-lg border border-danger/30 bg-danger-bg px-2 py-1.5 text-[11px] text-danger">
            {error}
          </p>
        ) : null}
      </CardSection>

      {!summaryData?.metrics && !loading ? (
        <EmptyState
          title="Charts not loaded"
          description="Choose filters (e.g. 30d preset) and click Load charts."
        />
      ) : null}

      {summaryData?.metrics ? (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <SummaryStat title="Add to cart" value={cartAdds.toLocaleString()} />
            <SummaryStat
              title="Checkout starts"
              value={Number(metrics.checkoutStartsCount || sumTimeline(metrics.checkoutTimeline)).toLocaleString()}
            />
            <SummaryStat
              title="Payment success"
              value={Number(metrics.paymentSuccessCount || sumTimeline(metrics.paymentSuccessTimeline)).toLocaleString()}
            />
            <SummaryStat
              title="Success rate"
              value={metrics.paymentSuccessRate != null ? `${metrics.paymentSuccessRate}%` : "—"}
            />
            <SummaryStat
              title="Abandonment"
              value={metrics.cartAbandonmentRate != null ? `${metrics.cartAbandonmentRate}%` : "—"}
            />
            <SummaryStat
              title="GMV (range)"
              value={`Rs ${sumTimeline(metrics.orderedValueTimeline).toLocaleString()}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <FunnelChart title="Conversion funnel (range totals)" steps={funnelSteps} />
            <RevenueComposedChart title="Revenue & delivered orders" data={revenueTrend} />
          </div>

          <MultiLineChart
            title="Checkout → payment → order (daily)"
            data={checkoutTrend}
            series={[
              { key: "checkout", label: "Checkout", color: "#8b5cf6" },
              { key: "paymentInitiated", label: "Pay initiated", color: "#a855f7" },
              { key: "paymentSuccess", label: "Pay success", color: "#22c55e" },
              { key: "orderPlaced", label: "Order placed", color: "#0ea5e9" },
            ]}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <MultiLineChart
              title="Payment success vs failure"
              data={paymentTrend}
              series={[
                { key: "success", label: "Success", color: "#22c55e" },
                { key: "failed", label: "Failed", color: "#ef4444" },
              ]}
            />
            <StackedAreaChart
              title="Daily active users (website vs app)"
              data={userTrend}
              series={[
                { key: "website", label: "Website", color: "#6366f1" },
                { key: "app", label: "App", color: "#8b5cf6" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <MultiLineChart
              title="App installs by platform"
              data={installTrend}
              series={[
                { key: "android", label: "Android", color: "#22c55e" },
                { key: "ios", label: "iOS", color: "#0ea5e9" },
              ]}
            />
            <MultiLineChart
              title="Browse & discovery"
              data={browseTrend}
              series={[
                { key: "productView", label: "Product views", color: "#6366f1" },
                { key: "search", label: "Search", color: "#8b5cf6" },
                { key: "category", label: "Categories", color: "#0ea5e9" },
              ]}
            />
          </div>

          {summaryModule !== "all" ? (
            <MultiLineChart
              title={`Module focus: ${summaryModule}`}
              data={moduleTrend}
              series={moduleSeries.map((s) => ({
                key: s.id,
                label: s.label,
                color: s.color,
              }))}
              valuePrefix={moduleSeries[0]?.valuePrefix || ""}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <DonutChart title="User activity split" data={channelSplit} />
            <DonutChart title="Payment outcomes split" data={paymentSplit} />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <HorizontalBarChart title="Top ordered pincodes" data={pincodeRank} color="#6366f1" />
            <HorizontalBarChart title="WhatsApp segment sends" data={segmentRank} color="#8b5cf6" />
          </div>

          {insightRank.length > 0 ? (
            <HorizontalBarChart title="Insight ranking" data={insightRank} color="#0ea5e9" />
          ) : null}
        </>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`chart-skel-${idx}`} className="h-64 animate-pulse rounded-xl border border-border bg-canvas-muted" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Single-metric line chart for dashboard graph view */
export function DashboardLineChart({
  title,
  rows = [],
  color = "#6366f1",
  height = 200,
  valuePrefix = "",
}) {
  const data = (rows || []).map((r) => ({
    day: r.day,
    value: Number(r?.value || 0),
  }));
  const hasData = data.length > 0;

  return (
    <div className="rounded-lg border border-border bg-white p-2.5 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">{title}</p>
      {!hasData ? (
        <p className="py-8 text-center text-[11px] text-stone-400">No data for this period</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="day" tickFormatter={formatChartDay} tick={{ fontSize: 9 }} stroke="#a8a29e" />
            <YAxis tick={{ fontSize: 9 }} stroke="#a8a29e" width={40} />
            <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Compact sparkline for dashboard KPI cards */
export function MiniSparkline({ rows = [], color = "#6366f1", height = 44 }) {
  const data = (rows || []).slice(-14).map((r) => ({ value: Number(r?.value || 0) }));
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default ChartsPanel;
