import { Link } from "react-router-dom";
import { Hash, Users, Clapperboard, ArrowRight, UsersRound, FolderKanban, Tags } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const CommunityHub = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const cards = [
    {
      to: ap("community/keywords"),
      icon: Hash,
      title: "Keywords",
      border: "border-brand-200 hover:border-brand-400",
      iconClass: "text-brand-600",
      desc: "Curate explore chips — POST/GET/PATCH/DELETE /community/admin/hashtags.",
    },
    {
      to: ap("community/content"),
      icon: Clapperboard,
      title: "Content",
      border: "border-violet-200 hover:border-violet-400",
      iconClass: "text-violet-600",
      desc: "Browse posts & reels from explore feed. View details; delete when permitted.",
    },
    {
      to: ap("community/designers"),
      icon: Users,
      title: "Community designers",
      border: "border-amber-200 hover:border-amber-400",
      iconClass: "text-amber-600",
      desc: "Verify end-user community designers only — not staff Designers panel. APIs under /admin/panels/community-designers.",
    },
    {
      to: ap("community/projects"),
      icon: FolderKanban,
      title: "Projects",
      border: "border-teal-200 hover:border-teal-400",
      iconClass: "text-teal-600",
      desc: "Review community projects. Pending / approved / rejected tabs — PATCH /community/admin/projects/:id/approve or /reject.",
    },
    {
      to: ap("community/project-categories"),
      icon: Tags,
      title: "Project categories",
      border: "border-sky-200 hover:border-sky-400",
      iconClass: "text-sky-600",
      desc: "Create and manage project categories — POST/GET/PATCH/DELETE /community/admin/project-categories.",
    },
  ];

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          <UsersRound className="h-4 w-4 text-brand-600" />
          Community
        </h1>
      </div>

      <p className="mb-2 max-w-3xl text-[11px] text-stone-600">
        Admin tools for the Khush community: curated keywords, content browse,
        community designer verification, project approval, and project categories.
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ to, icon: Icon, title, border, iconClass, desc }) => (
          <Link
            key={to}
            to={to}
            className={`block rounded-xl border-2 bg-white p-3 shadow-sm transition hover:bg-brand-50/20 ${border}`}
          >
            <Icon className={`mb-2 h-5 w-5 ${iconClass}`} />
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
