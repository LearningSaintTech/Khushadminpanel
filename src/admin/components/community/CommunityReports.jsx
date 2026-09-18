import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Flag, Loader2, X } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  listCommunityReports,
  getCommunityReport,
  resolveCommunityReport,
  getCommunityContent,
} from "../../apis/Communityapi";
import {
  PageHeader,
  StatCard,
  tableScrollShell,
  btnPrimary,
  fieldClass,
  labelClass,
  pageToolbar,
  tableHeadClass,
  thClass,
  tabActive,
  tabInactive,
  btnOutline,
  shortId,
  statusPill,
  communityRowId,
  extractCommunityList,
  extractCommunityRecord,
} from "./communityShared";

const STATUS_TABS = [
  { id: "open", label: "Open" },
  { id: "dismissed", label: "Dismissed" },
  { id: "actioned", label: "Actioned" },
  { id: "all", label: "All" },
];

const RESOLVE_ACTIONS = [
  { id: "none", label: "None (no content change)" },
  { id: "hide_content", label: "Hide reported content" },
];

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reportStatus(row) {
  return String(row?.status || "").toLowerCase();
}

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div className="rounded-lg border border-border bg-canvas-muted/40 p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </p>
      {children}
    </div>
  );
}

const CommunityReports = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");
  const [limit] = useState(20);
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [targetPreview, setTargetPreview] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [resolveAction, setResolveAction] = useState("none");
  const [acting, setActing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (status && status !== "all") params.status = status;
      if (cursor) params.cursor = cursor;
      console.log("[Community] reports list params", params);
      const res = await listCommunityReports(params);
      const list = extractCommunityList(res, ["reports"]);
      const data = res?.data ?? res ?? {};
      console.log("[Community] parsed reports", {
        count: list.length,
        nextCursor: data?.nextCursor,
        hasMore: data?.hasMore,
        list,
      });
      setItems(list);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      toast.error(err?.message || "Failed to load reports");
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [status, limit, cursor]);

  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setAdminNote("");
    setResolveAction("none");
    setTargetPreview(null);
    setDetail({ id });
    try {
      const res = await getCommunityReport(id);
      const record = extractCommunityRecord(res);
      console.log("[Community] parsed report detail", record);
      setDetail(record);
      setAdminNote(String(record?.adminNote || ""));
      if (String(record?.status || "").toLowerCase() === "open") {
        setResolveAction("none");
      }

      const targetType = String(record?.targetType || "").toLowerCase();
      const targetId = record?.targetId;
      if (targetType === "content" && targetId) {
        try {
          const contentRes = await getCommunityContent(targetId);
          const content = extractCommunityRecord(contentRes);
          setTargetPreview(content);
        } catch (err) {
          console.warn("[Community] report target content load failed", err);
          setTargetPreview({ id: targetId, _loadError: err?.message || "Unavailable" });
        }
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load report");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async (resolveStatus, actionOverride) => {
    const id = communityRowId(detail);
    if (!id) return;
    const note = adminNote.trim();
    if (!note) {
      toast.error("Admin note is required");
      return;
    }
    const action =
      resolveStatus === "dismissed"
        ? "none"
        : actionOverride || resolveAction || "hide_content";
    const body = {
      status: resolveStatus,
      adminNote: note,
      action,
    };
    if (
      !window.confirm(
        resolveStatus === "dismissed"
          ? "Dismiss this report? No content action will be taken."
          : `Resolve as actioned with action "${action}"?`,
      )
    ) {
      return;
    }
    setActing(true);
    try {
      console.log("[Community] resolve report →", { id, body });
      await resolveCommunityReport(id, body);
      toast.success(
        resolveStatus === "dismissed" ? "Report dismissed" : "Report actioned",
      );
      setDetail(null);
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Resolve failed");
    } finally {
      setActing(false);
    }
  };

  const goNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor]);
    setCursor(nextCursor);
  };

  const goPrev = () => {
    setCursorStack((prev) => {
      if (!prev.length) {
        setCursor(null);
        return [];
      }
      const next = [...prev];
      const prevCursor = next.pop();
      setCursor(prevCursor ?? null);
      return next;
    });
  };

  const isOpen = reportStatus(detail) === "open" || (!detail?.status && status === "open");

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Flag}
        title="Community reports"
        subtitle="GET /community/admin/reports · GET …/:id · PATCH …/:id/resolve"
        onRefresh={fetchList}
        loading={loading}
        accentClass="text-rose-600"
        backLink={
          <Link
            to={ap("community")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Community
          </Link>
        }
      />

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="In this view"
          value={items.length}
          sub={`Tab: ${status}`}
          accent="success"
        />
        <StatCard
          label="Has more"
          value={hasMore ? "Yes" : "No"}
          sub={nextCursor ? shortId(nextCursor) : "End of list"}
        />
      </div>

      <div className={pageToolbar}>
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-canvas-muted/50 p-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={status === tab.id ? tabActive : tabInactive}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={tableScrollShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Report</th>
              <th className={thClass}>Target</th>
              <th className={thClass}>Reason</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Created</th>
              <th className={thClass}> </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">
                  <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin text-brand-600" />
                  Loading reports…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">
                  No reports in this filter
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const id = communityRowId(row);
                return (
                  <tr
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(id);
                      }
                    }}
                    className="cursor-pointer border-b border-border/70 hover:bg-canvas-muted/30"
                  >
                    <td className="px-3 py-2">
                      <p className="font-mono text-[10px] text-stone-700">{shortId(id)}</p>
                      <p className="text-[10px] text-stone-500">
                        Reporter {shortId(row.reporterId)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium capitalize text-stone-800">
                        {row.targetType || "—"}
                      </p>
                      <p className="font-mono text-[10px] text-stone-500">
                        {shortId(row.targetId)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium capitalize text-stone-800">
                        {row.reason || "—"}
                      </p>
                      <p className="line-clamp-2 max-w-[14rem] text-[10px] text-stone-500">
                        {row.details || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={statusPill(row.status)}>{row.status || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-stone-600">{fmtDate(row.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(id);
                        }}
                        className={`${btnOutline} relative z-10 cursor-pointer font-semibold text-brand-700 hover:underline`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={!cursorStack.length && !cursor}
          onClick={goPrev}
          className={btnOutline}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasMore || !nextCursor}
          onClick={goNext}
          className={btnOutline}
        >
          Next
        </button>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => !acting && setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Report review</h2>
                <p className="font-mono text-[10px] text-stone-500">
                  {communityRowId(detail)}
                </p>
              </div>
              <button
                type="button"
                disabled={acting}
                onClick={() => setDetail(null)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-canvas-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              </div>
            ) : (
              <div className="space-y-2.5 text-[11px]">
                <Section title="Report">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-stone-500">Status</p>
                      <span className={statusPill(detail.status)}>{detail.status || "—"}</span>
                    </div>
                    <div>
                      <p className="text-stone-500">Reason</p>
                      <p className="font-medium capitalize">{detail.reason || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-stone-500">Details</p>
                      <p className="whitespace-pre-wrap text-stone-800">
                        {detail.details || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Reporter</p>
                      <p className="font-mono">{shortId(detail.reporterId)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Created</p>
                      <p>{fmtDate(detail.createdAt)}</p>
                    </div>
                  </div>
                </Section>

                <Section title="Target">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-stone-500">Type</p>
                      <p className="capitalize font-medium">{detail.targetType || "—"}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">ID</p>
                      <p className="font-mono">{shortId(detail.targetId)}</p>
                    </div>
                  </div>
                  {String(detail.targetType || "").toLowerCase() === "content" &&
                  detail.targetId ? (
                    <div className="mt-2 rounded-lg border border-border bg-white p-2">
                      {targetPreview?._loadError ? (
                        <p className="text-stone-500">{targetPreview._loadError}</p>
                      ) : targetPreview ? (
                        <>
                          <p className="font-semibold text-stone-900">
                            {targetPreview.title ||
                              targetPreview.caption ||
                              targetPreview.text ||
                              "Content"}
                          </p>
                          <p className="mt-0.5 line-clamp-3 text-stone-600">
                            {targetPreview.description ||
                              targetPreview.body ||
                              targetPreview.caption ||
                              "—"}
                          </p>
                        </>
                      ) : (
                        <p className="text-stone-500">Loading target…</p>
                      )}
                      <Link
                        to={ap("community/content")}
                        className="mt-1.5 inline-block text-[10px] font-medium text-brand-600 hover:underline"
                      >
                        Open content tools →
                      </Link>
                    </div>
                  ) : null}
                </Section>

                {(detail.resolvedAt || detail.adminNote) && (
                  <Section title="Resolution">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-stone-500">Resolved at</p>
                        <p>{fmtDate(detail.resolvedAt)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Resolved by</p>
                        <p className="font-mono">{shortId(detail.resolvedBy) || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-stone-500">Admin note</p>
                        <p className="whitespace-pre-wrap">{detail.adminNote || "—"}</p>
                      </div>
                    </div>
                  </Section>
                )}

                {isOpen ? (
                  <Section title="Resolve">
                    <label className={labelClass}>Admin note</label>
                    <textarea
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="e.g. No violation found / Removed violating content"
                      className={`${fieldClass} mb-2`}
                    />
                    <label className={labelClass}>Action (for actioned)</label>
                    <select
                      value={resolveAction}
                      onChange={(e) => setResolveAction(e.target.value)}
                      className={`${fieldClass} mb-2`}
                    >
                      {RESOLVE_ACTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => handleResolve("dismissed")}
                        className={btnOutline}
                      >
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Dismiss (none)
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => handleResolve("actioned", "hide_content")}
                        className={btnPrimary}
                      >
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Action & hide
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-stone-500">
                      Dismiss →{" "}
                      <code className="rounded bg-white px-1">
                        status: dismissed, action: none
                      </code>
                      . Action →{" "}
                      <code className="rounded bg-white px-1">
                        status: actioned, action: hide_content
                      </code>
                      .
                    </p>
                  </Section>
                ) : (
                  <p className="rounded-lg border border-border bg-canvas-muted/50 px-2.5 py-2 text-stone-600">
                    This report is already resolved.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityReports;
