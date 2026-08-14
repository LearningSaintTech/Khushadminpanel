import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  X,
  ZoomIn,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  listCommunityDesigners,
  getCommunityDesigner,
  verifyCommunityDesigner,
  rejectCommunityDesigner,
} from "../../apis/CommunityDesignersapi";
import {
  PageHeader,
  Pagination,
  StatCard,
  inputClass,
  tableScrollShell,
  btnPrimary,
  btnOutline,
  fieldClass,
  labelClass,
  pageToolbar,
  tableHeadClass,
  thClass,
  shortId,
  statusPill,
} from "./communityShared";

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

const CommunityDesigners = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCommunityDesigners({
        status,
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      const data = res?.data ?? res;
      const list = data?.items || [];
      setItems(Array.isArray(list) ? list : []);
      const pagination = data?.pagination || {};
      setTotalPages(pagination.pages || pagination.totalPages || 1);
      setTotal(pagination.total ?? list.length);
    } catch (err) {
      toast.error(err?.message || "Failed to load community designers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, page, limit, search]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setRejectReason("");
    setDetail({ _id: id });
    try {
      const res = await getCommunityDesigner(id);
      setDetail(res?.data ?? res);
    } catch (err) {
      toast.error(err?.message || "Failed to load community designer");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerify = async (id) => {
    if (
      !window.confirm(
        "Verify this community designer? They will get the community designer badge (not staff Designer login).",
      )
    ) {
      return;
    }
    setActing(true);
    try {
      await verifyCommunityDesigner(id);
      toast.success("Community designer verified");
      setDetail(null);
      fetchList();
    } catch (err) {
      toast.error(
        err?.message ||
          "Verify failed — only pending applications can be verified",
      );
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required (max 500 chars)");
      return;
    }
    if (reason.length > 500) {
      toast.error("Reason must be 500 characters or less");
      return;
    }
    setActing(true);
    try {
      await rejectCommunityDesigner(id, reason);
      toast.success("Community designer rejected");
      setDetail(null);
      setRejectReason("");
      fetchList();
    } catch (err) {
      toast.error(
        err?.message ||
          "Reject failed — only pending applications can be rejected",
      );
    } finally {
      setActing(false);
    }
  };

  const skills = Array.isArray(detail?.designerSkills)
    ? detail.designerSkills
    : [];
  const links = Array.isArray(detail?.designerSocialLinks)
    ? detail.designerSocialLinks.filter((l) => l?.enabled !== false)
    : [];
  const experience = Array.isArray(detail?.designerWorkExperience)
    ? detail.designerWorkExperience
    : [];
  const education = Array.isArray(detail?.designerEducation)
    ? detail.designerEducation
    : [];

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={BadgeCheck}
        title="Community designers"
        subtitle="Verify end-user community designer applications — not staff Designers (/designer)"
        onRefresh={fetchList}
        loading={loading}
        accentClass="text-amber-600"
        backLink={
          <Link
            to={ap("community")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Community
          </Link>
        }
      />

      <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
        <strong>Community designer</strong> = app user with{" "}
        <code className="rounded bg-white/80 px-1">isDesigner</code> who
        completed onboarding. Separate from the staff{" "}
        <Link
          to={ap("designer")}
          className="font-medium text-brand-700 underline hover:text-brand-800"
        >
          Designers
        </Link>{" "}
        inventory panel.
      </p>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="In this view"
          value={total}
          sub={`Filter: ${status}`}
          accent="amber"
        />
        <StatCard label="Page" value={`${page} / ${totalPages || 1}`} />
      </div>

      <div className={pageToolbar}>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          title="designerVerificationStatus"
        >
          <option value="pending">Pending (review)</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <input
          className={`${inputClass} min-w-[160px] flex-1`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / username / phone…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              fetchList();
            }
          }}
        />
        <button
          type="button"
          className={btnOutline}
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Search
        </button>
      </div>

      <div className={tableScrollShell}>
        <table className="w-full min-w-[800px] text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Applicant</th>
              <th className={thClass}>Username</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Location</th>
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
                  No community designers for this filter
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row._id}
                  className="border-t border-border/80 hover:bg-brand-50/30"
                >
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {row.profileImage ? (
                        <img
                          src={row.profileImage}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas-muted text-[10px] text-stone-400">
                          ?
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-stone-900">
                          {row.name || "—"}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {row.phoneNumber || shortId(row._id)}
                          {row.isActive === false ? " · inactive" : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-stone-700">
                    @{row.username || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <span className={statusPill(row.designerVerificationStatus)}>
                      {row.designerVerificationStatus || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-stone-600">
                    {row.designerLocation || "—"}
                  </td>
                  <td className="px-2 py-2 text-stone-500">
                    {fmtDate(row.designerSubmittedAt || row.updatedAt)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openDetail(row._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                        title="View community profile"
                      >
                        <ZoomIn size={13} />
                      </button>
                      {row.designerVerificationStatus === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVerify(row._id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-success/30 bg-success-bg text-success hover:opacity-90"
                            title="Verify community designer"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDetail(row._id)}
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
              ))
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
                  Community designer profile
                </h3>
                <p className="text-[10px] text-stone-500">
                  GET /admin/panels/community-designers/:id
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
                {detail.designerCoverImage ? (
                  <img
                    src={detail.designerCoverImage}
                    alt="Cover"
                    className="h-28 w-full rounded-lg object-cover"
                  />
                ) : null}

                <div className="flex items-center gap-3">
                  {detail.profileImage ? (
                    <img
                      src={detail.profileImage}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas-muted text-stone-400">
                      ?
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {detail.name || "—"}
                    </p>
                    <p className="text-stone-500">@{detail.username || "—"}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={statusPill(
                          detail.designerVerificationStatus,
                        )}
                      >
                        {detail.designerVerificationStatus || "—"}
                      </span>
                      {detail.isCreator ? (
                        <span className="rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] text-stone-600">
                          also creator
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {detail.designerTagline ? (
                  <p className="font-medium text-stone-800">
                    {detail.designerTagline}
                  </p>
                ) : null}
                {detail.designerBio ? (
                  <p className="whitespace-pre-wrap text-stone-700">
                    {detail.designerBio}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <p>Location: {detail.designerLocation || "—"}</p>
                  <p>Phone: {detail.phoneNumber || "—"}</p>
                  <p>Submitted: {fmtDate(detail.designerSubmittedAt)}</p>
                  <p>Verified: {fmtDate(detail.designerVerifiedAt)}</p>
                  <p>Rejected: {fmtDate(detail.designerRejectedAt)}</p>
                  <p>Step: {detail.designerOnboardingStep || "—"}</p>
                </div>

                {detail.designerRejectionReason ? (
                  <p className="rounded-lg border border-danger/30 bg-danger-bg px-2 py-1.5 text-danger">
                    Rejection reason: {detail.designerRejectionReason}
                  </p>
                ) : null}

                {skills.length > 0 ? (
                  <Section title="Skills">
                    <div className="flex flex-wrap gap-1">
                      {skills.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] text-stone-700"
                        >
                          {s.name}
                          {s.proficiency != null ? ` · ${s.proficiency}%` : ""}
                        </span>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {links.length > 0 ? (
                  <Section title="Links">
                    <ul className="space-y-1">
                      {links.map((l, i) => (
                        <li key={`${l.url}-${i}`}>
                          <a
                            href={
                              String(l.url || "").startsWith("http")
                                ? l.url
                                : `https://${l.url}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                          >
                            {l.label || l.platform || l.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {experience.length > 0 ? (
                  <Section title="Experience">
                    <ul className="space-y-1.5">
                      {experience.map((e, i) => (
                        <li key={i} className="text-stone-700">
                          <span className="font-medium">
                            {e.title || "Role"}
                          </span>
                          {e.company ? ` @ ${e.company}` : ""}
                          <span className="block text-[10px] text-stone-500">
                            {e.startDate || "?"} –{" "}
                            {e.isPresent ? "Present" : e.endDate || "?"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {education.length > 0 ? (
                  <Section title="Education">
                    <ul className="space-y-1.5">
                      {education.map((e, i) => (
                        <li key={i} className="text-stone-700">
                          <span className="font-medium">
                            {e.degree || e.fieldOfStudy || "Education"}
                          </span>
                          {e.institution ? ` · ${e.institution}` : ""}
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {detail.designerVerificationStatus === "pending" ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className={labelClass}>
                      Reject reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`${fieldClass} min-h-[72px]`}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Incomplete portfolio links"
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
                        onClick={() => handleVerify(detail._id)}
                      >
                        {acting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Verify
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-bg px-3 py-1.5 text-[11px] font-semibold text-danger disabled:opacity-50"
                        onClick={() => handleReject(detail._id)}
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

export default CommunityDesigners;
