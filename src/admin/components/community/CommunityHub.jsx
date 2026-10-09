import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Clapperboard,
  Flag,
  FolderKanban,
  Hash,
  Library,
  Loader2,
  ScrollText,
  ShoppingBag,
  Tags,
  Users,
  UsersRound,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getCommunityOverview, listAdminCommunityUsers } from "../../apis/Communityapi";
import { getCommunityOrderSummary } from "../../apis/CommunityOrdersapi";
import {
  PageHeader,
  StatCard,
  authorLabel,
  communityPageMeta,
  fmtInr,
  statusPill,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapCommunityData,
} from "./communityShared";

const TOOLS = [
  { suffix: "community/content", icon: Clapperboard, title: "Posts and reels", desc: "Review every post and reel, then remove or restore it." },
  { suffix: "community/reports", icon: Flag, title: "Reports", desc: "Dismiss a report or hide the reported post, reel, comment, or project." },
  { suffix: "community/users", icon: Users, title: "Users", desc: "Every community profile, with content, reports, and sales." },
  { suffix: "community/orders", icon: ShoppingBag, title: "Community orders", desc: "Orders placed from a tagged item on a post or reel." },
  { suffix: "community/sources", icon: Library, title: "Sources", desc: "Labels such as Instagram or street style that users can attach to a post." },
  { suffix: "community/audit-log", icon: ScrollText, title: "Audit log", desc: "Every remove, restore, comment delete, and source change." },
  { suffix: "community/keywords", icon: Hash, title: "Keywords", desc: "Explore chips shown in the app." },
  { suffix: "community/designers", icon: Users, title: "Community designers", desc: "Verify designers and grant panel access." },
  { suffix: "community/projects", icon: FolderKanban, title: "Projects", desc: "Approve or reject community projects." },
  { suffix: "community/project-categories", icon: Tags, title: "Project categories", desc: "Categories used when someone submits a project." },
];

const CommunityHub = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeUserCount, setActiveUserCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, sumRes, usersRes] = await Promise.all([
        getCommunityOverview(),
        getCommunityOrderSummary({ top: 5 }).catch(() => null),
        listAdminCommunityUsers({ page: 1, limit: 1, active: "true" }).catch(() => null),
      ]);
      const ov = unwrapCommunityData(ovRes);
      setOverview(ov);
      setSummary(sumRes ? unwrapCommunityData(sumRes) : null);
      const rawCount = ov?.activeCommunityUsers;
      const fromOverview = rawCount == null || rawCount === "" ? null : Number(rawCount);
      const fromList = usersRes ? communityPageMeta(usersRes).total : null;
      setActiveUserCount(Number.isFinite(fromOverview) ? fromOverview : fromList);
    } catch (err) {
      toast.error(err?.message || "Failed to load community overview");
      setOverview(null);
      setActiveUserCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus = overview?.content?.byStatus || {};
  const totals = summary?.totals;

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={UsersRound}
        title="Community"
        subtitle="Moderation, reports, and orders that started from a post or reel."
        onRefresh={load}
        loading={loading}
      />

      {overview?.salesUnavailable ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
          Sales figures are unavailable right now. Content counts are still live.
        </p>
      ) : null}

      <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-7">
        <Link to={ap("community/users?active=true")}>
          <StatCard
            label="Active users"
            value={activeUserCount ?? "—"}
            sub="Profile not deleted"
            accent="brand"
          />
        </Link>
        <Link to={ap("community/content?status=published")}>
          <StatCard label="Published" value={byStatus.published ?? "—"} accent="success" />
        </Link>
        <Link to={ap("community/content?status=hidden")}>
          <StatCard label="Hidden" value={byStatus.hidden ?? "—"} accent="amber" />
        </Link>
        <Link to={ap("community/content?status=removed")}>
          <StatCard label="Removed" value={byStatus.removed ?? "—"} sub="Soft delete" />
        </Link>
        <Link to={ap("community/reports")}>
          <StatCard label="Open reports" value={overview?.openReports?.total ?? "—"} accent="amber" />
        </Link>
        <Link to={ap("community/orders")}>
          <StatCard label="Orders" value={totals?.orders ?? "—"} sub="From posts and reels" accent="brand" />
        </Link>
        <Link to={ap("community/orders")}>
          <StatCard
            label="Net revenue"
            value={totals ? fmtInr(totals.netRevenue) : "—"}
            sub="Excludes cancelled, refunded, returned"
            accent="violet"
          />
        </Link>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div className={tableScrollShell}>
          <table className="min-w-full text-left text-[11px]">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Source</th>
                <th className={thClass}>Posts</th>
                <th className={thClass}> </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-stone-500">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                  </td>
                </tr>
              ) : (overview?.bySource || []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-stone-500">No sources yet</td>
                </tr>
              ) : (
                overview.bySource.map((row) => (
                  <tr key={String(row.sourceId || row.name)} className="border-b border-border/70">
                    <td className="px-3 py-2">
                      <p className="font-medium text-stone-800">{row.name}</p>
                      {row.isActive === false ? <span className={statusPill("inactive")}>inactive</span> : null}
                    </td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2 text-right">
                      {row.sourceId ? (
                        <Link className="font-medium text-brand-700 hover:underline" to={ap(`community/content?sourceId=${row.sourceId}`)}>
                          View
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={tableScrollShell}>
          <table className="min-w-full text-left text-[11px]">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Top creator</th>
                <th className={thClass}>Net sales</th>
                <th className={thClass}>Likes</th>
                <th className={thClass}>Views</th>
                <th className={thClass}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                  </td>
                </tr>
              ) : (overview?.topCreators || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-stone-500">No published creators yet</td>
                </tr>
              ) : (
                overview.topCreators.map((row) => (
                  <tr key={row.userId} className="border-b border-border/70">
                    <td className="px-3 py-2">
                      <Link className="font-medium text-brand-700 hover:underline" to={ap(`community/users?userId=${row.userId}`)}>
                        {authorLabel(row.user, row.userId)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {overview.salesUnavailable ? "—" : fmtInr(row.sales?.netRevenue)}
                    </td>
                    <td className="px-3 py-2">{row.likes}</td>
                    <td className="px-3 py-2">{row.views}</td>
                    <td className="px-3 py-2">{row.avg ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ suffix, icon: Icon, title, desc }) => (
          <Link
            key={suffix}
            to={ap(suffix)}
            className="block rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/20"
          >
            <Icon className="mb-2 h-4 w-4 text-brand-600" />
            <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{desc}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
              Open <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CommunityHub;
