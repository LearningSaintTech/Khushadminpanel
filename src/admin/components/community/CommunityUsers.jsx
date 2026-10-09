import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Users } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getAdminCommunityUser, listAdminCommunityUsers } from "../../apis/Communityapi";
import {
  CommunityBackLink,
  DetailDrawer,
  DetailSection,
  PageHeader,
  Pagination,
  apiMessage,
  authorLabel,
  btnOutline,
  communityPageMeta,
  fmtDate,
  fmtInr,
  inputClass,
  pageToolbar,
  statusPill,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapCommunityData,
} from "./communityShared";

const SORTS = [
  { id: "recent", label: "Recent" },
  { id: "content", label: "Most content" },
  { id: "likes", label: "Most likes" },
  { id: "views", label: "Most views" },
  { id: "removed", label: "Most removed" },
];

function rowUserId(row) {
  return String(
    row?.userId || row?.user?.userId || row?._id || row?.id || row?.user?._id || row?.user?.id || "",
  );
}

function rowUsername(row) {
  return row?.username || row?.user?.username || row?.usernameArchive || row?.user?.usernameArchive || "";
}

const CommunityUsers = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) => `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const sort = params.get("sort") || "recent";
  const hasRemoved = params.get("hasRemoved") || "";
  const active = params.get("active") || "";
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const userId = params.get("userId") || "";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, total: 0, salesUnavailable: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState(q);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page" && key !== "userId") next.delete("page");
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 50, sort };
      if (q) query.q = q;
      if (hasRemoved === "true") query.hasRemoved = "true";
      if (active === "true") query.active = "true";
      const res = await listAdminCommunityUsers(query);
      const pageMeta = communityPageMeta(res);
      setItems(pageMeta.items.filter(Boolean));
      setMeta(pageMeta);
      setLoadError("");
    } catch (err) {
      const message = apiMessage(err);
      setLoadError(message);
      toast.error(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, q, hasRemoved, active]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    getAdminCommunityUser(userId)
      .then((res) => {
        if (!cancelled) setDetail(unwrapCommunityData(res));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(apiMessage(err));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = detail?.user;

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Users}
        title="Community users"
        subtitle="Every community profile, including people who have not posted. Deleted profiles stay in this list."
        onRefresh={load}
        loading={loading}
        backLink={<CommunityBackLink to={ap("community")} />}
      />

      {meta.salesUnavailable ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
          Sales are unavailable. User stats are still current.
        </p>
      ) : null}

      <div className={pageToolbar}>
        <select className={inputClass} value={sort} onChange={(e) => setFilter("sort", e.target.value)}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={inputClass} value={active} onChange={(e) => setFilter("active", e.target.value)}>
          <option value="">All profiles</option>
          <option value="true">Active only</option>
        </select>
        <select className={inputClass} value={hasRemoved} onChange={(e) => setFilter("hasRemoved", e.target.value)}>
          <option value="">All content</option>
          <option value="true">Has removed content</option>
        </select>
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
            placeholder="Name, username, or user id"
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className={btnOutline}>Search</button>
        </form>
      </div>

      <div className={tableScrollShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Profile</th>
              <th className={thClass}>Content</th>
              <th className={thClass}>Reports</th>
              <th className={thClass}>Net sales</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">
                  {loadError || (q ? "No users match that search." : "No community users yet.")}
                </td>
              </tr>
            ) : (
              items.map((row, index) => {
                const id = rowUserId(row);
                const username = rowUsername(row);
                return (
                <tr
                  key={id || `community-user-${index}`}
                  className="cursor-pointer border-b border-border/70 hover:bg-canvas-muted/30"
                  onClick={() => {
                    if (id) setFilter("userId", id);
                  }}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-800">{authorLabel(row, id)}</p>
                    <p className="text-[10px] text-stone-500">{username ? `@${username}` : id || "No username"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={statusPill(row.communityProfileStatus || "active")}>
                      {row.communityProfileStatus || "active"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.stats?.totalContent || 0} total · {row.stats?.removedCount || 0} removed · {row.stats?.hiddenCount || 0} hidden
                  </td>
                  <td className="px-3 py-2">{row.openReports || 0}</td>
                  <td className="px-3 py-2">{meta.salesUnavailable ? "—" : fmtInr(row.sales?.netRevenue)}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {meta.total ? `${meta.total} users` : "0 users"}
          {meta.total > items.length ? ` · showing ${items.length} on this page` : ""}
        </p>
        <Pagination page={page} totalPages={meta.totalPages || 1} disabled={loading} onPage={(n) => setFilter("page", String(n))} />
      </div>

      {(userId && (detail || detailLoading)) ? (
        <DetailDrawer
          title={authorLabel(user, userId)}
          subtitle={userId}
          onClose={() => setFilter("userId", "")}
        >
          {detailLoading && !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : detail ? (
            <>
              <DetailSection title="Profile">
                <p>{user?.email || "No email"} · {user?.phoneNumber || "No phone"}</p>
                <p className="mt-1 text-stone-500">
                  {user?.isCreator ? "Creator" : "Not a creator"} · {user?.isDesigner ? "Designer" : "Not a designer"}
                </p>
                {user?.usernameArchive ? <p className="text-stone-500">Released username: @{user.usernameArchive}</p> : null}
                {detail.profile?.creatorBio ? <p className="mt-1 whitespace-pre-wrap">{detail.profile.creatorBio}</p> : null}
              </DetailSection>
              <DetailSection title="Stats">
                <p>
                  {detail.stats?.posts || 0} posts · {detail.stats?.reels || 0} reels · {detail.stats?.followers || 0} followers · {detail.stats?.following || 0} following
                </p>
                <p className="mt-1">
                  {detail.stats?.projects || 0} projects · {detail.stats?.commentsWritten || 0} comments · {detail.openReportsAgainstUser || 0} reports on the user · {detail.openReportsOnContent || 0} on their content
                </p>
                <p className="mt-1">
                  Last post {fmtDate(detail.stats?.lastPostedAt)}
                </p>
              </DetailSection>
              <DetailSection title="Sales">
                {detail.salesUnavailable ? (
                  <p className="text-amber-800">Sales unavailable</p>
                ) : (
                  <p>
                    {detail.sales?.orders || 0} orders · {fmtInr(detail.sales?.grossRevenue)} gross · {fmtInr(detail.sales?.netRevenue)} net · {fmtInr(detail.sales?.deliveredRevenue)} delivered
                  </p>
                )}
              </DetailSection>
              <div className="mb-2 flex flex-wrap gap-2">
                <Link className={btnOutline} to={ap(`community/content?authorId=${userId}`)}>Their posts</Link>
                <Link className={btnOutline} to={ap(`community/orders?contentAuthorId=${userId}`)}>Their orders</Link>
              </div>
              <DetailSection title="Moderation history">
                {(detail.moderationHistory || []).length === 0 ? (
                  <p className="text-stone-500">None</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.moderationHistory.slice(0, 12).map((log) => (
                      <li key={log.id}>
                        {log.action} · {log.reason || "No reason"} · {fmtDate(log.createdAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
            </>
          ) : null}
        </DetailDrawer>
      ) : null}
    </div>
  );
};

export default CommunityUsers;
