import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Check,
  FolderKanban,
  Loader2,
  X,
  ZoomIn,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  listCommunityProjects,
  getCommunityProject,
  approveCommunityProject,
  rejectCommunityProject,
  listCommunityProjectCategories,
} from "../../apis/Communityapi";
import {
  PageHeader,
  Pagination,
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
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function projectTitle(row) {
  return row?.title || row?.name || row?.projectName || "Untitled project";
}

function projectStatus(row) {
  return String(row?.status || row?.moderationStatus || "").toLowerCase();
}

function projectCover(row) {
  if (!row) return null;
  if (typeof row.coverImage === "string") return row.coverImage;
  if (typeof row.thumbnail === "string") return row.thumbnail;
  if (typeof row.image === "string") return row.image;
  const media = row.media || row.images || row.files;
  if (Array.isArray(media) && media[0]) {
    return media[0].url || media[0].image || media[0];
  }
  return row.cover?.url || row.thumbnailUrl || null;
}

function creatorName(row) {
  const u = row?.user || row?.userId || row?.creator || row?.createdBy || {};
  if (typeof u === "string") return u;
  return u.name || u.username || row?.username || row?.userName || "—";
}

function categoryValue(row) {
  const c = row?.category || row?.categoryName || row?.projectCategory;
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.name || c.label || communityRowId(c) || "";
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

const CommunityProjects = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listCommunityProjectCategories({ limit: 50 });
        const list = extractCommunityList(res, ["projectCategories"]);
        console.log("[Community] parsed categories for project filter", list);
        setCategories(list);
      } catch (err) {
        console.error("[Community] category filter load failed", err);
      }
    })();
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status, category, page, limit };
      console.log("[Community] projects list params", params);
      const res = await listCommunityProjects(params);
      const list = extractCommunityList(res);
      const data = res?.data ?? res;
      const pagination = data?.pagination || {};
      console.log("[Community] parsed projects", {
        count: list.length,
        pagination,
        list,
      });
      setItems(list);
      setTotalPages(
        pagination.pages || pagination.totalPages || data?.totalPages || 1,
      );
      setTotal(pagination.total ?? data?.total ?? list.length);
    } catch (err) {
      toast.error(err?.message || "Failed to load community projects");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, category, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [status, category]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setRejectReason("");
    setDetail({ _id: id });
    try {
      const res = await getCommunityProject(id);
      const record = extractCommunityRecord(res);
      console.log("[Community] parsed project detail", record);
      setDetail(record);
    } catch (err) {
      toast.error(err?.message || "Failed to load project");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!id) return;
    if (!window.confirm("Approve this community project?")) return;
    setActing(true);
    try {
      await approveCommunityProject(id);
      toast.success("Project approved");
      setDetail(null);
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Approve failed");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (id) => {
    if (!id) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    setActing(true);
    try {
      await rejectCommunityProject(id, reason);
      toast.success("Project rejected");
      setDetail(null);
      setRejectReason("");
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Reject failed");
    } finally {
      setActing(false);
    }
  };

  const isPendingRow = (row) => {
    const st = projectStatus(row);
    if (st) return st === "pending";
    return status === "pending";
  };

  const mediaList = Array.isArray(detail?.media)
    ? detail.media
    : Array.isArray(detail?.images)
      ? detail.images
      : [];

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={FolderKanban}
        title="Community projects"
        subtitle="GET /community/admin/projects · PATCH …/approve · PATCH …/reject"
        onRefresh={fetchList}
        loading={loading}
        accentClass="text-teal-600"
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
          value={total}
          sub={`Tab: ${status}`}
          accent="success"
        />
        <StatCard label="Page" value={`${page} / ${totalPages || 1}`} />
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
        <select
          className="shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => {
            const id = communityRowId(c);
            const label = c.name || c.label || id;
            return (
              <option key={id || label} value={c.slug || c.name || id}>
                {label}
              </option>
            );
          })}
        </select>
        <Link to={ap("community/project-categories")} className={btnOutline}>
          Manage categories
        </Link>
      </div>

      <div className={tableScrollShell}>
        <table className="w-full min-w-[800px] text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Project</th>
              <th className={thClass}>Creator</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Submitted</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-stone-500">
                  No community projects for this filter
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const id = communityRowId(row);
                const cover = projectCover(row);
                const st = projectStatus(row);
                return (
                  <tr
                    key={id}
                    className="border-t border-border/80 hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="h-8 w-8 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-canvas-muted text-[10px] text-stone-400">
                            ?
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900">
                            {projectTitle(row)}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {shortId(id)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-stone-700">{creatorName(row)}</td>
                    <td className="px-2 py-2 text-stone-600">
                      {categoryValue(row) || "—"}
                    </td>
                    <td className="px-2 py-2">
                      <span className={statusPill(st)}>{st || "pending"}</span>
                    </td>
                    <td className="px-2 py-2 text-stone-500">
                      {fmtDate(row.submittedAt || row.createdAt)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDetail(id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="View project"
                        >
                          <ZoomIn size={13} />
                        </button>
                        {isPendingRow(row) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-success/30 bg-success-bg text-success hover:opacity-90"
                              title="Approve project"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDetail(id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                              title="Reject (requires reason)"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        disabled={loading}
      />

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Community project
                </h3>
                <p className="text-[10px] text-stone-500">
                  GET /community/admin/projects/:id
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-1 text-stone-500 hover:bg-canvas-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-600" />
            ) : (
              <div className="space-y-3 text-[11px]">
                {projectCover(detail) ? (
                  <img
                    src={projectCover(detail)}
                    alt=""
                    className="h-40 w-full rounded-lg object-cover"
                  />
                ) : null}

                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {projectTitle(detail)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={statusPill(projectStatus(detail))}>
                      {projectStatus(detail) || "pending"}
                    </span>
                    {categoryValue(detail) ? (
                      <span className="rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] text-stone-600">
                        {categoryValue(detail)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {detail.description ? (
                  <p className="whitespace-pre-wrap text-stone-700">
                    {detail.description}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <p>Creator: {creatorName(detail)}</p>
                  <p>ID: {shortId(communityRowId(detail))}</p>
                  <p>
                    Submitted: {fmtDate(detail.submittedAt || detail.createdAt)}
                  </p>
                  <p>Updated: {fmtDate(detail.updatedAt)}</p>
                </div>

                {detail.rejectionReason || detail.rejectReason ? (
                  <p className="rounded-lg border border-danger/30 bg-danger-bg px-2 py-1.5 text-danger">
                    Rejection reason:{" "}
                    {detail.rejectionReason || detail.rejectReason}
                  </p>
                ) : null}

                {mediaList.length > 0 ? (
                  <Section title="Media">
                    <div className="grid grid-cols-3 gap-1.5">
                      {mediaList.map((m, i) => {
                        const url = typeof m === "string" ? m : m?.url || m?.image;
                        if (!url) return null;
                        return (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-20 w-full rounded-md object-cover"
                          />
                        );
                      })}
                    </div>
                  </Section>
                ) : null}

                {isPendingRow(detail) ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className={labelClass}>
                      Reject reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`${fieldClass} min-h-[72px]`}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Incomplete project details"
                      maxLength={500}
                    />
                    <p className="text-[10px] text-stone-400">
                      {rejectReason.length}/500
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={acting}
                        className={btnPrimary}
                        onClick={() => handleApprove(communityRowId(detail))}
                      >
                        {acting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-bg px-3 py-1.5 text-[11px] font-semibold text-danger disabled:opacity-50"
                        onClick={() => handleReject(communityRowId(detail))}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CommunityProjects;
