import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquare, Pencil } from "lucide-react";
import { getBlogPostById } from "../../apis/BlogApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import BlogCommentThreadList from "./BlogCommentThreadList";

function DetailSection({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <h2 className="mb-2 border-b border-border pb-2 text-xs font-semibold text-stone-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </span>
      <span className="text-[11px] text-stone-800">{value}</span>
    </div>
  );
}

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getBlogPostById(id);
        const data = response?.data?.data || response?.data || response;
        if (!data?.id) {
          setError("Blog post not found.");
          return;
        }
        setPost(data);
      } catch (err) {
        console.error("[BlogDetail] load error:", err);
        setError(err?.response?.data?.message || "Failed to load blog post.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-6 text-[11px] text-stone-500">
        <Loader2 size={16} className="animate-spin" />
        Loading blog details...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate(ap("blog"))}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700"
        >
          <ArrowLeft size={14} />
          Back to all blogs
        </button>
        <div className="rounded-xl border border-danger/30 bg-red-50 p-4 text-[11px] text-danger">
          {error || "Blog post not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 text-stone-900">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(ap("blog"))}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700"
        >
          <ArrowLeft size={14} />
          All blogs
        </button>
        <button
          type="button"
          onClick={() => navigate(ap(`blog/edit/${post.id}`))}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700"
        >
          <Pencil size={14} />
          Edit post
        </button>
        <button
          type="button"
          onClick={() =>
            navigate(
              `${ap("blog/comments")}?blogId=${encodeURIComponent(post.id)}&blogTitle=${encodeURIComponent(post.title)}`,
            )
          }
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-canvas-muted"
        >
          <MessageSquare size={14} />
          All comments
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {post.image ? (
          <img
            src={post.image}
            alt={post.imageAlt || post.title}
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : null}
        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
            {post.category}
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{post.title}</h1>
          <p className="mt-2 text-[11px] text-stone-500">/{post.slug}</p>
          {post.excerpt ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">{post.excerpt}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DetailSection title="Post metadata">
          <div className="space-y-2">
            <MetaRow label="Author" value={post.author} />
            <MetaRow label="Date" value={post.date} />
            <MetaRow label="Read time" value={post.readTime} />
            <MetaRow
              label="Status"
              value={post.isPublished ? "Published" : "Draft"}
            />
            <MetaRow label="Views" value={post.viewCount ?? 0} />
            <MetaRow label="Likes" value={post.likeCount ?? 0} />
            <MetaRow label="Comments" value={post.commentCount ?? 0} />
          </div>
        </DetailSection>

        <DetailSection title="SEO & media">
          <div className="space-y-2">
            <MetaRow label="Hero alt" value={post.imageAlt || "—"} />
            <MetaRow label="Inline alt" value={post.body?.inlineImageAlt || "—"} />
            <MetaRow label="Category slug" value={post.categorySlug || "—"} />
          </div>
        </DetailSection>
      </div>

      <DetailSection title="Article body">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-stone-800">{post.body?.intro}</p>

          {(post.body?.sections || []).map((section, index) => (
            <div
              key={`${section.subheading}-${index}`}
              className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0"
            >
              {section.inlineImage ? (
                <img
                  src={section.inlineImage}
                  alt={section.inlineImageAlt || ""}
                  className="max-h-80 w-full rounded-xl object-cover"
                />
              ) : null}

              {section.subheading ? (
                <h3 className="text-base font-bold text-stone-900">{section.subheading}</h3>
              ) : null}

              <div className="space-y-3">
                {(section.paragraphs || []).map((paragraph) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 32)}`}
                    className="text-sm leading-relaxed text-stone-800"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.quote ? (
                <blockquote className="border-l-4 border-brand-200 pl-4 text-sm italic text-stone-700">
                  &ldquo;{section.quote}&rdquo;
                </blockquote>
              ) : null}
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Comments & replies">
        <BlogCommentThreadList blogId={post.id} blogTitle={post.title} compact />
      </DetailSection>
    </div>
  );
}
