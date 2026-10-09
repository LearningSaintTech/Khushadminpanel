import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Clapperboard, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  deleteAdminCommunityComment,
  getAdminCommunityContent,
  listAdminCommunityComments,
  listAdminCommunityContent,
  listCommunitySources,
  removeAdminCommunityContent,
  restoreAdminCommunityContent,
} from "../../apis/Communityapi";
import {
  CommunityBackLink,
  DetailDrawer,
  DetailSection,
  PageHeader,
  Pagination,
  apiMessage,
  authorLabel,
  btnOutline,
  btnPrimary,
  communityPageMeta,
  extractCommunityList,
  fieldClass,
  fmtDate,
  fmtInr,
  inputClass,
  labelClass,
  ContentMedia,
  mediaThumb,
  pageToolbar,
  videoMedia,
  shortId,
  statusPill,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapCommunityData,
} from "./communityShared";

const TYPES = [
  { id: "all", label: "All types" },
  { id: "post", label: "Posts" },
  { id: "reel", label: "Reels" },
];
const STATUSES = ["all", "published", "hidden", "removed", "draft", "processing"];
const SORTS = [
  { id: "recent", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "likes", label: "Likes" },
  { id: "views", label: "Views" },
  { id: "comments", label: "Comments" },
  { id: "reports", label: "Reports" },
  { id: "sales", label: "Sales" },
];

function boughtSet(ids) {
  return new Set((ids || []).map(String));
}

const CommunityContent = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) => `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [params, setParams] = useSearchParams();

  const type = params.get("type") || "all";
  const status = params.get("status") || "all";
  const sort = params.get("sort") || "recent";
  const q = params.get("q") || "";
  const reported = params.get("reported") || "";
  const sourceId = params.get("sourceId") || "";
  const authorId = params.get("authorId") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const openId = params.get("id") || "";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0, salesUnavailable: false });
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [search, setSearch] = useState(q);

  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [commentReason, setCommentReason] = useState("");

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    if (key !== "page" && key !== "id") next.delete("page");
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 20, type, status, sort };
      if (q) query.q = q;
      if (reported === "true") query.reported = "true";
      if (sourceId) query.sourceId = sourceId;
      if (authorId) query.authorId = authorId;
      if (from) query.from = from;
      if (to) query.to = to;
      const res = await listAdminCommunityContent(query);
      const pageMeta = communityPageMeta(res);
      setItems(pageMeta.items);
      setMeta(pageMeta);
    } catch (err) {
      toast.error(apiMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, type, status, sort, q, reported, sourceId, authorId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCommunitySources({ limit: 100 })
      .then((res) => setSources(extractCommunityList(res)))
      .catch(() => setSources([]));
  }, []);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  const closeDetail = () => {
    setDetail(null);
    setComments([]);
    setMode(null);
    setReason("");
    const next = new URLSearchParams(params);
    next.delete("id");
    setParams(next, { replace: true });
  };

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setMode(null);
    try {
      const [contentRes, commentRes] = await Promise.all([
        getAdminCommunityContent(id),
        listAdminCommunityComments(id, { page: 1, limit: 20 }),
      ]);
      setDetail(unwrapCommunityData(contentRes));
      setComments(communityPageMeta(commentRes).items);
    } catch (err) {
      toast.error(apiMessage(err));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openId) return undefined;
    loadDetail(openId);
    return undefined;
  }, [openId, loadDetail]);

  const refreshOpen = async () => {
    if (openId) await loadDetail(openId);
    await load();
  };

  const confirmRemove = async () => {
    if (!detail?._id) return;
    setActing(true);
    try {
      await removeAdminCommunityContent(detail._id, { reason: reason.trim(), notify });
      toast.success(notify ? "Post removed and the author was notified" : "Post removed");
      setMode(null);
      await refreshOpen();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setActing(false);
    }
  };

  const confirmRestore = async () => {
    if (!detail?._id) return;
    setActing(true);
    try {
      await restoreAdminCommunityContent(detail._id, { reason: reason.trim(), notify });
      toast.success(notify ? "Content restored and the author was notified" : "Content restored");
      setMode(null);
      await refreshOpen();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setActing(false);
    }
  };

  const removeComment = async (commentId) => {
    setActing(true);
    try {
      await deleteAdminCommunityComment(commentId, { reason: commentReason.trim() });
      toast.success("Comment deleted");
      setCommentReason("");
      await refreshOpen();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setActing(false);
    }
  };

  const canRestore = detail && (detail.status === "removed" || detail.status === "hidden");
  const bought = boughtSet(detail?.purchasedItemIds);

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Clapperboard}
        title="Posts and reels"
        subtitle="Every post and reel, including hidden and removed. Remove keeps the record for sales."
        onRefresh={load}
        loading={loading}
        backLink={<CommunityBackLink to={ap("community")} />}
      />

      {meta.salesUnavailable ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
          Sales are unavailable. The list is still current.
        </p>
      ) : null}

      <div className={pageToolbar}>
        <select className={inputClass} value={type} onChange={(e) => setFilter("type", e.target.value)}>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className={inputClass} value={status} onChange={(e) => setFilter("status", e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
        <select className={inputClass} value={sort} onChange={(e) => setFilter("sort", e.target.value)}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={inputClass} value={sourceId} onChange={(e) => setFilter("sourceId", e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
          ))}
        </select>
        <select className={inputClass} value={reported} onChange={(e) => setFilter("reported", e.target.value)}>
          <option value="">Any reports</option>
          <option value="true">Open reports only</option>
        </select>
        <input className={inputClass} type="date" value={from} onChange={(e) => setFilter("from", e.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(e) => setFilter("to", e.target.value)} />
        <form
          className="flex min-w-[12rem] flex-1 gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", search.trim());
          }}
        >
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caption, item, hashtag"
          />
          <button type="submit" className={btnOutline}>Search</button>
        </form>
      </div>

      {authorId ? (
        <p className="mb-2 text-[11px] text-stone-600">
          Filtered to one creator.{" "}
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setFilter("authorId", "")}>
            Clear
          </button>
        </p>
      ) : null}

      <div className={tableScrollShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Content</th>
              <th className={thClass}>Author</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Stats</th>
              <th className={thClass}>Sales</th>
              <th className={thClass}>Posted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">
                  <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin text-brand-600" />
                  Loading content…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">No posts match these filters</td>
              </tr>
            ) : (
              items.map((row) => {
                const thumb = mediaThumb(row);
                const video = videoMedia(row);
                return (
                  <tr
                    key={row._id}
                    className="cursor-pointer border-b border-border/70 hover:bg-canvas-muted/30"
                    onClick={() => setFilter("id", row._id)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-10 w-10 rounded-md object-cover" />
                        ) : video ? (
                          <video
                            src={video.url}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-10 w-10 rounded-md bg-black object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-canvas-muted" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium capitalize text-stone-800">{row.type}</p>
                          <p className="line-clamp-1 max-w-[16rem] text-stone-500">{row.caption || "No caption"}</p>
                          <p className="text-[10px] text-stone-400">{row.source?.name || "No source"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{authorLabel(row.author, row.authorId)}</td>
                    <td className="px-3 py-2">
                      <span className={statusPill(row.status)}>{row.status}</span>
                      {row.suppressedForCommunity ? (
                        <p className="mt-1 text-[10px] text-amber-800">Profile deleted</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {row.likeCount || 0} likes · {row.commentCount || 0} comments
                      <br />
                      {row.viewCount || 0} views · {row.openReports || 0} reports
                    </td>
                    <td className="px-3 py-2">
                      {meta.salesUnavailable ? "—" : `${fmtInr(row.sales?.netRevenue)} · ${row.sales?.orders || 0}`}
                    </td>
                    <td className="px-3 py-2 text-stone-600">{fmtDate(row.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={meta.totalPages || 1}
          disabled={loading}
          onPage={(n) => setFilter("page", String(n))}
        />
      </div>
      <p className="mt-1 text-[10px] text-stone-500">{meta.total} posts and reels</p>

      {(detail || detailLoading) && (
        <DetailDrawer
          title={detail ? `${detail.type || "Content"} · ${detail.status || ""}` : "Content"}
          subtitle={detail?._id || openId}
          busy={acting}
          onClose={closeDetail}
        >
          {detailLoading && !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : detail ? (
            <>
              <DetailSection title="Post">
                <p className="whitespace-pre-wrap">{detail.caption || "No caption"}</p>
                <p className="mt-1 text-stone-500">
                  {authorLabel(detail.author, detail.authorId)} · {detail.source?.name || "No source"} · {fmtDate(detail.createdAt)}
                </p>
                {detail.author?.phoneNumber ? (
                  <p className="text-stone-500">{detail.author.countryCode || ""} {detail.author.phoneNumber}</p>
                ) : null}
                <div className="mt-2">
                  <ContentMedia media={detail.media} />
                </div>
              </DetailSection>

              <DetailSection title="Tagged items">
                {(detail.items || []).length === 0 ? (
                  <p className="text-stone-500">None</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.items.map((item) => (
                      <li key={item.itemId} className="flex items-center justify-between gap-2">
                        <span>{item.name || shortId(item.itemId)}</span>
                        {bought.has(String(item.itemId)) ? (
                          <span className={statusPill("published")}>bought</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>

              <DetailSection title="Sales">
                {meta.salesUnavailable || detail.salesUnavailable ? (
                  <p className="text-amber-800">Sales unavailable</p>
                ) : (
                  <p>
                    {detail.sales?.orders || 0} orders · {fmtInr(detail.sales?.netRevenue)} net · {fmtInr(detail.sales?.deliveredRevenue)} delivered
                  </p>
                )}
              </DetailSection>

              <DetailSection title="Open reports">
                {(detail.reports || []).filter((r) => r.status === "open").length === 0 ? (
                  <p className="text-stone-500">None</p>
                ) : (
                  <ul className="space-y-1">
                    {(detail.reports || []).filter((r) => r.status === "open").map((r) => (
                      <li key={r.id || r._id}>{r.reason} · {r.details || "No details"}</li>
                    ))}
                  </ul>
                )}
              </DetailSection>

              <DetailSection title="Comments">
                <label className={labelClass}>Reason for delete</label>
                <input className={`${fieldClass} mb-2`} value={commentReason} onChange={(e) => setCommentReason(e.target.value)} placeholder="Optional" />
                {comments.length === 0 ? (
                  <p className="text-stone-500">No comments</p>
                ) : (
                  <ul className="space-y-2">
                    {comments.map((c) => (
                      <li key={c.id || c._id} className="rounded-md border border-border bg-white p-2">
                        <p>{c.text}</p>
                        <p className="mt-0.5 text-[10px] text-stone-500">
                          {authorLabel(c.user, c.userId)} · {c.openReports || 0} open reports · {fmtDate(c.createdAt)}
                        </p>
                        <button type="button" disabled={acting} className={`${btnOutline} mt-1 text-danger`} onClick={() => removeComment(c.id || c._id)}>
                          Delete comment
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-[10px] text-stone-500">Deleting a comment is permanent and closes its open reports.</p>
              </DetailSection>

              {detail.status !== "removed" ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  <button type="button" className={btnPrimary} disabled={acting} onClick={() => setMode("remove")}>Remove</button>
                </div>
              ) : null}
              {canRestore ? (
                <div className="mb-2">
                  <button
                    type="button"
                    className={btnOutline}
                    disabled={acting || detail.suppressedForCommunity}
                    onClick={() => {
                      setNotify(true);
                      setMode("restore");
                    }}
                  >
                    Restore to published
                  </button>
                  {detail.suppressedForCommunity ? (
                    <p className="mt-1 text-[10px] text-amber-800">
                      The creator deleted their community profile, so this cannot be restored.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {mode ? (
                <DetailSection title={mode === "remove" ? "Remove" : "Restore"}>
                  <label className={labelClass}>Reason</label>
                  <textarea className={`${fieldClass} mb-2`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <label className="mb-2 flex items-center gap-2 text-[11px]">
                    <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                    Notify the author
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className={btnOutline} disabled={acting} onClick={() => setMode(null)}>Cancel</button>
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={acting}
                      onClick={mode === "remove" ? confirmRemove : confirmRestore}
                    >
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Confirm
                    </button>
                  </div>
                </DetailSection>
              ) : null}
            </>
          ) : null}
        </DetailDrawer>
      )}
    </div>
  );
};

export default CommunityContent;
