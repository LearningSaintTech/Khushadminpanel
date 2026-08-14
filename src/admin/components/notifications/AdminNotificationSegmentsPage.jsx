import { useState, useEffect, useCallback, useMemo } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Users, Send, Settings2, Eye, Loader2, CheckCircle2, Clock, History, CalendarClock, X } from "lucide-react";
import {
  PageToolbar,
  Alert,
  LoadingBlock,
  EmptyBlock,
  TableActionBtn,
  tableScrollShell,
  fieldClass,
  btnPrimary,
  btnOutline,
  FormSection,
  Field,
} from "./notificationsShared";

const MODULE_LABELS = {
  cart: "Cart",
  payment: "Payment",
  order: "Order",
  wishlist: "Wishlist",
  auth: "Auth",
  marketing: "Marketing",
  general: "General",
};

/** Per-segment audience tuning — keys stored in notification_segments.config */
const SEGMENT_CONFIG_FIELDS = {
  A2: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  A3: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  A4: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  A5: [
    { key: "withinHours", label: "Coupon applied within (hours)", type: "number", min: 1 },
    { key: "staleCartHours", label: "Stale cart (hours)", type: "number", min: 1 },
  ],
  A6: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  A7: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  B2: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  B4: [
    { key: "withinDays", label: "Within days", type: "number", min: 1 },
    { key: "minFailures", label: "Min failures", type: "number", min: 2 },
  ],
  B5: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  C7: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  D2: [{ key: "afterDays", label: "Days after delivery", type: "number", min: 1 }],
  D7: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  E2: [{ key: "minDiscountPercent", label: "Min discount %", type: "number", min: 1 }],
  F1: [{ key: "minBalance", label: "Min wallet balance (₹)", type: "number", min: 0 }],
  F2: [{ key: "withinDays", label: "Expiry within days", type: "number", min: 1 }],
  F6: [
    { key: "expiryDays", label: "Card lifetime (days)", type: "number", min: 30 },
    { key: "warningDays", label: "Warn before expiry (days)", type: "number", min: 1 },
  ],
  G2: [
    { key: "couponCode", label: "Default coupon code", type: "text" },
    { key: "discountPercent", label: "Discount %", type: "number", min: 0, max: 100 },
  ],
  G4: [
    { key: "minOrders", label: "Min orders", type: "number", min: 2 },
    { key: "couponCode", label: "Default coupon code", type: "text" },
    { key: "discountPercent", label: "Discount %", type: "number", min: 0, max: 100 },
  ],
  H3: [{ key: "withinDays", label: "Signed up within days", type: "number", min: 1 }],
  H6: [
    { key: "withinDays", label: "Within days", type: "number", min: 1 },
    { key: "minFailures", label: "Min login failures", type: "number", min: 2 },
  ],
  I1: [{ key: "inactiveDays", label: "Inactive days", type: "number", min: 7 }],
  I2: [{ key: "withinDays", label: "Signed up within days", type: "number", min: 1 }],
  I3: [{ key: "inactiveOrderDays", label: "No order in days", type: "number", min: 30 }],
  I5: [{ key: "minOrders", label: "Min orders", type: "number", min: 2 }],
  I6: [{ key: "withinDays", label: "Install within days", type: "number", min: 1 }],
  I7: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  K1: [
    { key: "withinDays", label: "Within days", type: "number", min: 1 },
    { key: "minViews", label: "Min product views", type: "number", min: 2 },
  ],
  K2: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  K3: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  K4: [{ key: "withinHours", label: "Within hours", type: "number", min: 1 }],
  L1: [{ key: "withinDays", label: "Active within days", type: "number", min: 1 }],
  L2: [{ key: "withinDays", label: "Active within days", type: "number", min: 1 }],
  L3: [{ key: "withinDays", label: "Active within days", type: "number", min: 1 }],
};

const CHANNEL_OPTIONS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "in_app", label: "In-app" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "mobile_push", label: "Mobile push" },
];

function PhaseBadge({ phase, implemented }) {
  if (implemented) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
      <Clock className="h-3 w-3" />
      Phase {phase}
    </span>
  );
}

function TriggerBadge({ triggerType, cronEnabled }) {
  const colors = {
    batch: "border-sky-200 bg-sky-50 text-sky-800",
    cron: "border-violet-200 bg-violet-50 text-violet-800",
    realtime: "border-stone-200 bg-stone-100 text-stone-700",
  };
  const cls = colors[triggerType] || colors.batch;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize ${cls}`}>
      {triggerType || "batch"}
      {triggerType === "cron" && cronEnabled === false ? " · cron off" : null}
    </span>
  );
}

function canBatchSend(row) {
  if (row?.canBatchSend != null) return row.canBatchSend;
  return Boolean(row?.implemented && row?.isActive !== false && row?.triggerType !== "realtime");
}

function batchSendTitle(row) {
  if (canBatchSend(row)) return "Send segment";
  return row?.batchSendBlockedReason || "Not available for batch send";
}

function AnalyticsRequirementsBlock({ requirements, note }) {
  if (!requirements && !note) return null;
  return (
    <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] text-indigo-900 space-y-0.5">
      {note ? <p className="font-medium">{note}</p> : null}
      {requirements?.includeEvents?.length ? (
        <p>
          <span className="font-semibold">Requires events:</span> {requirements.includeEvents.join(", ")}
        </p>
      ) : null}
      {requirements?.excludeEvents?.length ? (
        <p>
          <span className="font-semibold">Excludes:</span> {requirements.excludeEvents.join(", ")}
        </p>
      ) : null}
      {requirements?.alsoUses?.length ? (
        <p>
          <span className="font-semibold">Also uses:</span> {requirements.alsoUses.join(", ")}
        </p>
      ) : null}
      {requirements?.cooldownHours ? (
        <p>
          <span className="font-semibold">Send cooldown:</span> {requirements.cooldownHours}h per user
        </p>
      ) : null}
      {requirements?.analyticsInverse ? (
        <p className="italic">Inverse audience — users without the listed events.</p>
      ) : null}
    </div>
  );
}

export default function AdminNotificationSegmentsPage() {
  const [list, setList] = useState([]);
  const [waTemplates, setWaTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [viewMode, setViewMode] = useState("segments");
  const [history, setHistory] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDetailOpen, setHistoryDetailOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const [audienceOpen, setAudienceOpen] = useState(false);
  const [audienceRow, setAudienceRow] = useState(null);
  const [audienceData, setAudienceData] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceLimitInput, setAudienceLimitInput] = useState("500");

  const clampAudienceLimit = (value, fallback = 500) => {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
  };

  const resolveAudienceLimit = (override) => {
    if (override != null && override !== "") return clampAudienceLimit(override);
    return clampAudienceLimit(audienceLimitInput);
  };

  const [configOpen, setConfigOpen] = useState(false);
  const [configRow, setConfigRow] = useState(null);
  const [configForm, setConfigForm] = useState({
    templateKey: "",
    whatsappTemplateId: "",
    channels: ["whatsapp", "in_app"],
    isActive: true,
    cronEnabled: false,
    config: {},
  });

  const [sendOpen, setSendOpen] = useState(false);
  const [sendRow, setSendRow] = useState(null);
  const [sendForm, setSendForm] = useState({
    title: "",
    body: "",
    limit: 500,
    couponCode: "",
    discountPercent: 10,
    scheduleMode: false,
    scheduledFor: "",
  });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (moduleFilter) params.module = moduleFilter;
      if (readyOnly) params.implemented = "true";
      const data = await adminNotificationApi.listNotificationSegments(params);
      const items = data?.list ?? data?.data?.list ?? [];
      setList(Array.isArray(items) ? items : []);
    } catch (e) {
      setError(e?.message || "Failed to load segments");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, readyOnly]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError("");
    try {
      const data = await adminNotificationApi.listSegmentSendHistory({ limit: 50 });
      setHistory(data?.list ?? data?.data?.list ?? []);
    } catch (e) {
      setError(e?.message || "Failed to load history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    setHistoryLoading(true);
    setError("");
    try {
      const data = await adminNotificationApi.listSegmentSchedules({ status: "pending", limit: 50 });
      setSchedules(data?.list ?? data?.data?.list ?? []);
    } catch (e) {
      setError(e?.message || "Failed to load schedules");
      setSchedules([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "history") loadHistory();
    if (viewMode === "schedules") loadSchedules();
  }, [viewMode, loadHistory, loadSchedules]);

  useEffect(() => {
    adminNotificationApi
      .listWhatsappTemplates({ status: "APPROVED", limit: 100 })
      .then((data) => {
        const items = data?.list ?? data?.data?.list ?? [];
        setWaTemplates(Array.isArray(items) ? items : []);
      })
      .catch(() => setWaTemplates([]));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of list) {
      const mod = row.module || "general";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod).push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [list]);

  const configFieldsFor = (row) => SEGMENT_CONFIG_FIELDS[row?.code] || [];

  const openConfig = (row) => {
    setConfigRow(row);
    setConfigForm({
      templateKey: row.templateKey || row.defaultTemplateKey || "",
      whatsappTemplateId: row.whatsappTemplateId || "",
      channels: row.channels?.length ? row.channels : ["whatsapp", "in_app"],
      isActive: row.isActive !== false,
      cronEnabled: row.cronEnabled === true,
      config: { ...(row.config || {}) },
    });
    setConfigOpen(true);
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    if (!configRow?.code) return;
    setSubmitting(true);
    setError("");
    try {
      const selectedWa = waTemplates.find((t) => t._id === configForm.whatsappTemplateId);
      await adminNotificationApi.updateNotificationSegmentConfig(configRow.code, {
        templateKey: configForm.templateKey || selectedWa?.templateKey || configRow.defaultTemplateKey,
        whatsappTemplateId: configForm.whatsappTemplateId || null,
        channels: configForm.channels,
        isActive: configForm.isActive,
        cronEnabled: configForm.cronEnabled,
        config: configForm.config,
      });
      setSuccess(`Segment ${configRow.code} configuration saved.`);
      setConfigOpen(false);
      await loadList();
    } catch (err) {
      setError(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const openSend = (row) => {
    setSendRow(row);
    setSendForm({
      title: "",
      body: "",
      limit: 500,
      couponCode: row.config?.couponCode || "",
      discountPercent: row.config?.discountPercent ?? 10,
      scheduleMode: false,
      scheduledFor: "",
    });
    setPreview(null);
    setSendOpen(true);
  };

  const sendPayload = () => ({
    limit: clampAudienceLimit(sendForm.limit),
    title: sendForm.title,
    body: sendForm.body,
    couponCode: sendForm.couponCode,
    discountPercent: sendForm.discountPercent,
    config: {
      couponCode: sendForm.couponCode,
      discountPercent: sendForm.discountPercent,
    },
  });

  const fetchSegmentAudience = async (row, { limit, recordHistory = false } = {}) => {
    const mergedConfig = { ...(row.config || {}) };
    return adminNotificationApi.previewNotificationSegment(row.code, {
      limit: limit ?? resolveAudienceLimit(),
      includeUsers: true,
      recordHistory,
      config: mergedConfig,
      couponCode: mergedConfig.couponCode,
      discountPercent: mergedConfig.discountPercent,
    });
  };

  const openAudience = async (row) => {
    setAudienceRow(row);
    setAudienceData(null);
    setAudienceOpen(true);
    setAudienceLoading(true);
    setError("");
    try {
      const data = await fetchSegmentAudience(row, { limit: resolveAudienceLimit(), recordHistory: false });
      setAudienceData(data?.data ?? data);
    } catch (e) {
      setError(e?.message || "Failed to load audience");
    } finally {
      setAudienceLoading(false);
    }
  };

  const reloadAudience = async () => {
    if (!audienceRow?.code) return;
    setAudienceLoading(true);
    setError("");
    try {
      const data = await fetchSegmentAudience(audienceRow, { limit: resolveAudienceLimit(), recordHistory: false });
      setAudienceData(data?.data ?? data);
    } catch (e) {
      setError(e?.message || "Failed to reload audience");
    } finally {
      setAudienceLoading(false);
    }
  };

  const runPreview = async () => {
    if (!sendRow?.code) return;
    setPreviewLoading(true);
    setError("");
    try {
      const data = await adminNotificationApi.previewNotificationSegment(sendRow.code, {
        ...sendPayload(),
        includeUsers: true,
        recordHistory: true,
      });
      setPreview(data?.data ?? data);
    } catch (e) {
      setError(e?.message || "Preview failed");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runSend = async () => {
    if (!sendRow?.code) return;
    const isSchedule = sendForm.scheduleMode && sendForm.scheduledFor;
    const confirmMsg = isSchedule
      ? `Schedule segment ${sendRow.code} for ${new Date(sendForm.scheduledFor).toLocaleString()}?`
      : `Send to segment ${sendRow.code} — ${sendRow.name}?`;
    if (!window.confirm(confirmMsg)) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const body = {
        ...sendPayload(),
        templateKey: sendRow.templateKey || sendRow.defaultTemplateKey,
      };
      if (isSchedule) {
        body.scheduledFor = new Date(sendForm.scheduledFor).toISOString();
      }
      const data = await adminNotificationApi.sendNotificationSegment(sendRow.code, body);
      if (isSchedule) {
        const when = data?.schedule?.scheduledFor ?? data?.data?.schedule?.scheduledFor;
        setSuccess(`Segment ${sendRow.code} scheduled${when ? ` for ${new Date(when).toLocaleString()}` : ""}.`);
      } else {
        const sent = data?.sent ?? data?.data?.sent ?? 0;
        const total = data?.total ?? data?.data?.total ?? 0;
        setSuccess(`Queued notifications for ${sent} of ${total} user(s) in segment ${sendRow.code}.`);
      }
      setSendOpen(false);
      await loadList();
      if (viewMode === "history") await loadHistory();
      if (viewMode === "schedules") await loadSchedules();
    } catch (e) {
      setError(e?.message || "Send failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    if (!window.confirm("Cancel this scheduled send?")) return;
    try {
      await adminNotificationApi.cancelSegmentSchedule(scheduleId);
      setSuccess("Schedule cancelled.");
      await loadSchedules();
    } catch (e) {
      setError(e?.message || "Cancel failed");
    }
  };

  const openHistoryDetail = async (historyId) => {
    setHistoryDetailOpen(true);
    setHistoryDetail(null);
    setHistoryDetailLoading(true);
    setError("");
    try {
      const data = await adminNotificationApi.getSegmentSendHistoryDetail(historyId);
      setHistoryDetail(data?.data ?? data);
    } catch (e) {
      setError(e?.message || "Failed to load history detail");
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const onWaTemplatePick = (templateId) => {
    const t = waTemplates.find((x) => x._id === templateId);
    setConfigForm((f) => ({
      ...f,
      whatsappTemplateId: templateId,
      templateKey: t?.templateKey || f.templateKey,
    }));
  };

  return (
    <div className="min-w-0 p-2 sm:p-3">
      <PageToolbar
        icon={Users}
        title="Notification segments"
        subtitle="Attach WhatsApp templates to audience segments — preview count, then send."
        accentClass="text-violet-600"
      />

      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { id: "segments", label: "Segments", icon: Users },
          { id: "history", label: "Send history", icon: History },
          { id: "schedules", label: "Scheduled", icon: CalendarClock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setViewMode(id)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
              viewMode === id
                ? "border-violet-300 bg-violet-50 text-violet-800"
                : "border-border bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {viewMode === "history" ? (
        <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
          {historyLoading ? (
            <LoadingBlock label="Loading history…" />
          ) : history.length === 0 ? (
            <EmptyBlock message="No segment sends recorded yet." />
          ) : (
            <div className={tableScrollShell}>
              <table className="w-full min-w-[960px] text-left text-[10px]">
                <thead>
                  <tr className="border-b border-border text-stone-500">
                    <th className="p-2">When</th>
                    <th className="p-2">Segment</th>
                    <th className="p-2">Trigger</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Sent</th>
                    <th className="p-2">Audience</th>
                    <th className="p-2">Cooldown skip</th>
                    <th className="p-2">WA delivered</th>
                    <th className="p-2">Orders (48h)</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row._id} className="border-b border-border/60">
                      <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                      <td className="p-2 font-semibold">{row.segmentCode}</td>
                      <td className="p-2">{row.triggerType}</td>
                      <td className="p-2">{row.status}</td>
                      <td className="p-2">{row.sentCount ?? 0}</td>
                      <td className="p-2">{row.audienceCount ?? 0}</td>
                      <td className="p-2">{row.cooldownSkipped ?? 0}</td>
                      <td className="p-2">
                        {row.attribution
                          ? `${row.attribution.whatsappDelivered ?? 0}${row.attribution.whatsappFailed ? ` / ${row.attribution.whatsappFailed} fail` : ""}`
                          : "—"}
                      </td>
                      <td className="p-2 font-medium text-emerald-700">
                        {row.attribution?.ordersWithinWindow ?? "—"}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => openHistoryDetail(row._id)}
                          className="text-violet-700 hover:underline"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {viewMode === "schedules" ? (
        <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
          {historyLoading ? (
            <LoadingBlock label="Loading schedules…" />
          ) : schedules.length === 0 ? (
            <EmptyBlock message="No pending scheduled sends." />
          ) : (
            <div className={tableScrollShell}>
              <table className="w-full min-w-[640px] text-left text-[10px]">
                <thead>
                  <tr className="border-b border-border text-stone-500">
                    <th className="p-2">Scheduled for</th>
                    <th className="p-2">Segment</th>
                    <th className="p-2">Limit</th>
                    <th className="p-2">Status</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((row) => (
                    <tr key={row._id} className="border-b border-border/60">
                      <td className="p-2">{row.scheduledFor ? new Date(row.scheduledFor).toLocaleString() : "—"}</td>
                      <td className="p-2 font-semibold">{row.segmentCode}</td>
                      <td className="p-2">{row.payload?.limit ?? 500}</td>
                      <td className="p-2">{row.status}</td>
                      <td className="p-2 text-right">
                        {row.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => cancelSchedule(row._id)}
                            className="inline-flex items-center gap-0.5 text-rose-600 hover:underline"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {viewMode === "segments" ? (
      <>
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-2 shadow-sm">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Module</label>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={fieldClass}>
            <option value="">All modules</option>
            {Object.entries(MODULE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-stone-600">
          <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
          Batch-ready only
        </label>
        <button type="button" onClick={loadList} className={btnOutline}>
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyBlock message="No segments found." />
      ) : (
        <div className="space-y-4">
          {grouped.map(([module, rows]) => (
            <div key={module} className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border bg-canvas-muted/60 px-3 py-2">
                <h3 className="text-[12px] font-semibold capitalize text-stone-800">
                  {MODULE_LABELS[module] || module}
                  <span className="ml-2 text-[10px] font-normal text-stone-500">({rows.length} segments)</span>
                </h3>
              </div>
              <div className={tableScrollShell}>
                <table className="w-full min-w-[1020px] border-collapse text-left text-[11px]">
                  <thead className="bg-canvas-muted/40 text-[10px] font-semibold uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-2 w-12">Code</th>
                      <th className="px-2 py-2">Segment</th>
                      <th className="px-2 py-2">Trigger</th>
                      <th className="px-2 py-2">Template</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Preview</th>
                      <th className="px-2 py-2">Last send</th>
                      <th className="px-2 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.code} className="hover:bg-canvas-muted/30">
                        <td className="px-2 py-2 font-mono text-[10px] font-bold text-brand-700">{row.code}</td>
                        <td className="px-2 py-2">
                          <p className="font-medium text-stone-800">{row.name}</p>
                          <p className="text-[9px] text-stone-500 line-clamp-1">{row.description}</p>
                          {row.analyticsNote ? (
                            <p className="mt-0.5 text-[9px] text-indigo-700 line-clamp-2" title={row.analyticsNote}>
                              {row.analyticsNote}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <TriggerBadge triggerType={row.triggerType} cronEnabled={row.cronEnabled} />
                        </td>
                        <td className="px-2 py-2 text-[9px] text-stone-600">
                          <span className="font-mono text-brand-800">
                            {row.templateKey || row.defaultTemplateKey || "—"}
                          </span>
                          {row.channels?.length ? (
                            <p className="text-stone-400">{row.channels.join(", ")}</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <PhaseBadge phase={row.phase} implemented={row.implemented} />
                          {!row.isActive ? (
                            <span className="ml-1 text-[9px] text-red-600">disabled</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-[9px] text-stone-500">
                          {row.lastPreviewCount != null ? `${row.lastPreviewCount} users` : "—"}
                        </td>
                        <td className="px-2 py-2 text-[9px] text-stone-500">
                          {row.lastSentAt
                            ? `${row.lastSentCount ?? 0} · ${new Date(row.lastSentAt).toLocaleDateString("en-IN")}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="inline-flex gap-0.5">
                            <TableActionBtn title="Attach template" onClick={() => openConfig(row)}>
                              <Settings2 className="h-3.5 w-3.5" />
                            </TableActionBtn>
                            <TableActionBtn
                              title={row.implemented ? "View all users in segment" : "Segment not queryable"}
                              onClick={() => row.implemented && openAudience(row)}
                              disabled={!row.implemented || !row.isActive}
                            >
                              <Users className="h-3.5 w-3.5" />
                            </TableActionBtn>
                            <TableActionBtn
                              title={batchSendTitle(row)}
                              onClick={() => canBatchSend(row) && openSend(row)}
                              disabled={!canBatchSend(row)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </TableActionBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      ) : null}

      {audienceOpen && audienceRow ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">
                  Audience — {audienceRow.code} {audienceRow.name}
                </h3>
                <p className="text-[11px] text-stone-500">{audienceRow.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setAudienceOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-canvas-muted hover:text-stone-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 py-2">
              <Field label="Max users to load">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={audienceLimitInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setAudienceLimitInput("");
                      return;
                    }
                    if (/^\d+$/.test(v)) setAudienceLimitInput(v);
                  }}
                  onBlur={() => {
                    setAudienceLimitInput(String(clampAudienceLimit(audienceLimitInput)));
                  }}
                  className={fieldClass}
                  aria-label="Max users to load"
                />
                <p className="mt-1 text-[10px] text-stone-500">
                  Very large values may take longer to load.
                </p>
              </Field>
              <button type="button" onClick={reloadAudience} disabled={audienceLoading} className={btnOutline}>
                {audienceLoading ? (
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                ) : null}
                Reload
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {audienceLoading ? (
                <LoadingBlock label="Loading users…" />
              ) : (
                <>
                  <AnalyticsRequirementsBlock
                    requirements={audienceRow.analyticsRequirements}
                    note={audienceData?.meta?.previewNote || audienceData?.meta?.analyticsNote || audienceRow.analyticsNote}
                  />
                  {(audienceData?.users?.length ?? audienceData?.sample?.length ?? 0) === 0 &&
                  (audienceData?.meta?.realtimeOnly || audienceData?.meta?.notImplemented) ? (
                    <p className="text-[11px] text-amber-700">
                      {audienceData.meta.message || "This segment is event-triggered only — no batch audience list."}
                    </p>
                  ) : (audienceData?.users?.length ?? audienceData?.sample?.length ?? 0) === 0 ? (
                    <EmptyBlock message="No users match this segment with current config." />
                  ) : (
                <>
                  <p className="mb-2 text-[11px] font-semibold text-stone-700">
                    {audienceData.count ?? 0} user(s)
                    {((audienceData.users ?? audienceData.sample)?.length ?? 0) < (audienceData.count ?? 0)
                      ? ` — showing first ${(audienceData.users ?? audienceData.sample).length} (increase limit to load more)`
                      : ""}
                  </p>
                  <div className={tableScrollShell}>
                    <table className="w-full min-w-[520px] text-left text-[10px]">
                      <thead className="sticky top-0 bg-white text-stone-500">
                        <tr className="border-b border-border">
                          <th className="px-2 py-1.5 w-8">#</th>
                          <th className="px-2 py-1.5">Name</th>
                          <th className="px-2 py-1.5">Phone</th>
                          <th className="px-2 py-1.5">Email</th>
                          <th className="px-2 py-1.5">User ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(audienceData.users ?? audienceData.sample ?? []).map((u, idx) => (
                          <tr key={String(u.userId)} className="border-b border-border/60 hover:bg-canvas-muted/30">
                            <td className="px-2 py-1.5 text-stone-400">{idx + 1}</td>
                            <td className="px-2 py-1.5 font-medium text-stone-800">{u.name || "—"}</td>
                            <td className="px-2 py-1.5">{u.phone || "—"}</td>
                            <td className="px-2 py-1.5">{u.email || "—"}</td>
                            <td className="px-2 py-1.5 font-mono text-[9px] text-stone-500">{String(u.userId)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <button type="button" onClick={() => setAudienceOpen(false)} className={btnOutline}>
                Close
              </button>
              {audienceRow.implemented && audienceRow.isActive && canBatchSend(audienceRow) ? (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => {
                    setAudienceOpen(false);
                    openSend(audienceRow);
                  }}
                >
                  Send to segment
                </button>
              ) : audienceRow.triggerType === "realtime" ? (
                <p className="text-[10px] text-stone-500 mr-auto self-center">
                  Event-triggered only — no manual batch send.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {configOpen && configRow ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">
              Configure segment {configRow.code}
            </h3>
            <p className="text-[11px] text-stone-500">{configRow.name}</p>
            <form onSubmit={saveConfig} className="mt-3 space-y-3">
              <Field label="WhatsApp template (approved)">
                <select
                  value={configForm.whatsappTemplateId}
                  onChange={(e) => onWaTemplatePick(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">— Select Meta template —</option>
                  {waTemplates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.metaTemplateName} {t.templateKey ? `(${t.templateKey})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Event / template key" hint="Must match code templateKey when event fires.">
                <input
                  type="text"
                  value={configForm.templateKey}
                  onChange={(e) => setConfigForm((f) => ({ ...f, templateKey: e.target.value }))}
                  placeholder={configRow.defaultTemplateKey}
                  className={fieldClass}
                />
              </Field>
              <Field label="Channels">
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-1 text-[10px]">
                      <input
                        type="checkbox"
                        checked={configForm.channels.includes(ch.id)}
                        onChange={(e) => {
                          setConfigForm((f) => ({
                            ...f,
                            channels: e.target.checked
                              ? [...f.channels, ch.id]
                              : f.channels.filter((c) => c !== ch.id),
                          }));
                        }}
                      />
                      {ch.label}
                    </label>
                  ))}
                </div>
              </Field>
              {configFieldsFor(configRow).length || configRow.triggerType === "cron" ? (
                <FormSection title="Audience & automation">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {configFieldsFor(configRow).map((field) => (
                      <Field key={field.key} label={field.label}>
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          min={field.min}
                          max={field.max}
                          value={configForm.config[field.key] ?? ""}
                          onChange={(e) =>
                            setConfigForm((f) => ({
                              ...f,
                              config: {
                                ...f.config,
                                [field.key]:
                                  field.type === "number"
                                    ? e.target.value === ""
                                      ? ""
                                      : Number(e.target.value)
                                    : e.target.value,
                              },
                            }))
                          }
                          className={fieldClass}
                        />
                      </Field>
                    ))}
                    <Field label="Send cooldown (hours)" hint="Per-user minimum gap between segment sends.">
                      <input
                        type="number"
                        min={0}
                        value={configForm.config.cooldownHours ?? ""}
                        onChange={(e) =>
                          setConfigForm((f) => ({
                            ...f,
                            config: {
                              ...f.config,
                              cooldownHours:
                                e.target.value === "" ? "" : Number(e.target.value),
                            },
                          }))
                        }
                        className={fieldClass}
                        placeholder="Default from env"
                      />
                    </Field>
                  </div>
                  {configRow.triggerType === "cron" ? (
                    <label className="mt-2 flex items-center gap-2 text-[11px]">
                      <input
                        type="checkbox"
                        checked={configForm.cronEnabled}
                        onChange={(e) =>
                          setConfigForm((f) => ({ ...f, cronEnabled: e.target.checked }))
                        }
                      />
                      Enable automatic cron sends (requires SEGMENT_CRON_ENABLED)
                    </label>
                  ) : null}
                </FormSection>
              ) : (
                <FormSection title="Send cooldown">
                  <Field label="Cooldown (hours)" hint="Per-user minimum gap between segment sends.">
                    <input
                      type="number"
                      min={0}
                      value={configForm.config.cooldownHours ?? ""}
                      onChange={(e) =>
                        setConfigForm((f) => ({
                          ...f,
                          config: {
                            ...f.config,
                            cooldownHours:
                              e.target.value === "" ? "" : Number(e.target.value),
                          },
                        }))
                      }
                      className={fieldClass}
                      placeholder="Default from env"
                    />
                  </Field>
                </FormSection>
              )}
              {configRow.analyticsNote ? (
                <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] text-indigo-900">
                  {configRow.analyticsNote}
                </p>
              ) : null}
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={configForm.isActive}
                  onChange={(e) => setConfigForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Segment enabled
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => setConfigOpen(false)} className={btnOutline}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {sendOpen && sendRow ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold">
              Send — {sendRow.code} {sendRow.name}
            </h3>
            <p className="text-[10px] text-stone-500">
              Template: {sendRow.templateKey || sendRow.defaultTemplateKey}
            </p>
            {sendRow.triggerType === "realtime" ? (
              <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
                This segment is event-triggered only and cannot be sent manually.
              </p>
            ) : null}
            <div className="mt-3 space-y-3">
              {(sendRow.code === "G5" || sendRow.code === "CUSTOM") ? (
                <>
                  <Field label="Title (broadcast data)">
                    <input
                      value={sendForm.title}
                      onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))}
                      className={fieldClass}
                      placeholder="Khush Pehno"
                    />
                  </Field>
                  <Field label="Body">
                    <textarea
                      value={sendForm.body}
                      onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
                      rows={3}
                      className={fieldClass}
                    />
                  </Field>
                </>
              ) : null}
              {(sendRow.code === "G1" || sendRow.code === "G2" || sendRow.code === "G4") ? (
                <>
                  <Field label="Coupon code" hint="Passed as {{couponCode}} in template variables.">
                    <input
                      value={sendForm.couponCode}
                      onChange={(e) => setSendForm((f) => ({ ...f, couponCode: e.target.value }))}
                      className={fieldClass}
                      placeholder={sendRow.code === "G2" ? "SAVE10" : "SUMMER20"}
                    />
                  </Field>
                  <Field label="Discount %">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={sendForm.discountPercent}
                      onChange={(e) => setSendForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                      className={fieldClass}
                    />
                  </Field>
                </>
              ) : null}
              <Field label="Max recipients per run">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(sendForm.limit)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setSendForm((f) => ({ ...f, limit: "" }));
                      return;
                    }
                    if (/^\d+$/.test(v)) setSendForm((f) => ({ ...f, limit: v }));
                  }}
                  onBlur={() => {
                    const n = parseInt(String(sendForm.limit), 10);
                    setSendForm((f) => ({
                      ...f,
                      limit: Number.isFinite(n) && n >= 1 ? n : 500,
                    }));
                  }}
                  className={fieldClass}
                />
              </Field>

              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={sendForm.scheduleMode}
                  onChange={(e) => setSendForm((f) => ({ ...f, scheduleMode: e.target.checked }))}
                />
                Schedule for later
              </label>
              {sendForm.scheduleMode ? (
                <Field label="Send at (local time)">
                  <input
                    type="datetime-local"
                    value={sendForm.scheduledFor}
                    onChange={(e) => setSendForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                    className={fieldClass}
                  />
                </Field>
              ) : null}

              <button type="button" onClick={runPreview} disabled={previewLoading} className={btnOutline}>
                {previewLoading ? (
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="mr-1 inline h-3.5 w-3.5" />
                )}
                Preview audience
              </button>

              {preview ? (
                <div className="rounded-lg border border-border bg-canvas-muted/40 p-2 text-[10px]">
                  <AnalyticsRequirementsBlock
                    requirements={sendRow.analyticsRequirements}
                    note={preview.meta?.previewNote || preview.meta?.analyticsNote}
                  />
                  <p className="font-semibold text-stone-700">
                    {preview.count ?? 0} user(s) match this segment
                    {(preview.users?.length ?? 0) < (preview.count ?? 0)
                      ? ` (showing ${preview.users?.length ?? preview.sample?.length ?? 0} of ${preview.count})`
                      : ""}
                  </p>
                  {preview.meta?.message ? (
                    <p className="text-amber-700">{preview.meta.message}</p>
                  ) : null}
                  {(preview.users?.length ? preview.users : preview.sample)?.length ? (
                    <div className={`mt-2 ${preview.users?.length > 8 ? "max-h-48 overflow-y-auto" : ""}`}>
                      <table className="w-full text-left text-[9px]">
                        <thead>
                          <tr className="border-b border-border text-stone-500">
                            <th className="py-1 pr-2">Name</th>
                            <th className="py-1 pr-2">Phone</th>
                            <th className="py-1">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(preview.users || preview.sample).map((s) => (
                            <tr key={String(s.userId)} className="border-b border-border/50">
                              <td className="py-1 pr-2">{s.name || "—"}</td>
                              <td className="py-1 pr-2">{s.phone || "—"}</td>
                              <td className="py-1 truncate max-w-[120px]">{s.email || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => setSendOpen(false)} className={btnOutline}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runSend}
                  className={btnPrimary}
                  disabled={
                    submitting ||
                    !canBatchSend(sendRow) ||
                    (!sendForm.scheduleMode && preview && preview.count === 0) ||
                    (sendForm.scheduleMode && !sendForm.scheduledFor)
                  }
                >
                  {submitting
                    ? "Working…"
                    : sendForm.scheduleMode
                      ? "Schedule send"
                      : "Send notifications"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historyDetailOpen ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Send history detail</h3>
                {historyDetail?.history ? (
                  <p className="text-[11px] text-stone-500">
                    {historyDetail.history.segmentCode} · {historyDetail.history.triggerType} ·{" "}
                    {historyDetail.history.status}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setHistoryDetailOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-canvas-muted hover:text-stone-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {historyDetailLoading ? (
                <LoadingBlock label="Loading detail…" />
              ) : historyDetail?.history ? (
                <>
                  <div className="mb-3 grid gap-2 sm:grid-cols-3 text-[10px]">
                    <div className="rounded-lg border border-border p-2">
                      <div className="text-stone-500">Sent / audience</div>
                      <div className="font-semibold">
                        {historyDetail.history.sentCount ?? 0} / {historyDetail.history.audienceCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="text-stone-500">Cooldown skipped</div>
                      <div className="font-semibold">{historyDetail.history.cooldownSkipped ?? 0}</div>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="text-stone-500">
                        Orders within {historyDetail.history.attribution?.attributionWindowHours ?? 48}h
                      </div>
                      <div className="font-semibold text-emerald-700">
                        {historyDetail.history.attribution?.ordersWithinWindow ?? 0}
                      </div>
                    </div>
                  </div>
                  {historyDetail.history.attribution ? (
                    <p className="mb-3 text-[10px] text-stone-600">
                      WhatsApp: {historyDetail.history.attribution.whatsappDelivered ?? 0} delivered/sent ·{" "}
                      {historyDetail.history.attribution.whatsappFailed ?? 0} failed ·{" "}
                      {historyDetail.history.attribution.whatsappQueued ?? 0} queued ·{" "}
                      {historyDetail.history.attribution.notifiedUsers ?? 0} users notified
                    </p>
                  ) : null}
                  {(historyDetail.whatsappMessages || []).length ? (
                    <div className={tableScrollShell}>
                      <table className="w-full min-w-[640px] text-left text-[10px]">
                        <thead className="text-stone-500">
                          <tr className="border-b border-border">
                            <th className="p-2">Phone</th>
                            <th className="p-2">Template</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Sent</th>
                            <th className="p-2">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyDetail.whatsappMessages.map((msg) => (
                            <tr key={msg._id} className="border-b border-border/60">
                              <td className="p-2">{msg.phone || "—"}</td>
                              <td className="p-2 font-mono text-[9px]">{msg.templateKey || "—"}</td>
                              <td className="p-2">{msg.status}</td>
                              <td className="p-2">
                                {msg.sentAt || msg.deliveredAt || msg.createdAt
                                  ? new Date(msg.sentAt || msg.deliveredAt || msg.createdAt).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="p-2 text-rose-600">{msg.error || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyBlock message="No WhatsApp messages linked to this send window." />
                  )}
                </>
              ) : (
                <EmptyBlock message="History entry not found." />
              )}
            </div>
            <div className="flex justify-end border-t border-border px-4 py-3">
              <button type="button" onClick={() => setHistoryDetailOpen(false)} className={btnOutline}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
