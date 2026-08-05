import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import {
  deleteBlogCommentAdmin,
  getBlogCommentsAdmin,
  hideBlogComment,
} from "../../apis/BlogApi";

function formatCommentDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildThreads(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const repliesByParent = new Map();

  for (const comment of list) {
    if (comment.parentId) {
      const key = String(comment.parentId);
      if (!repliesByParent.has(key)) repliesByParent.set(key, []);
      repliesByParent.get(key).push(comment);
    }
  }

  for (const replies of repliesByParent.values()) {
    replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return list
    .filter((comment) => !comment.parentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((comment) => ({
      ...comment,
      replies: repliesByParent.get(String(comment.id)) || [],
    }));
}

function CommentStatusBadge({ isHidden }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isHidden ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {isHidden ? "Hidden" : "Visible"}
    </span>
  );
}

function CommentActions({ comment, onChanged }) {
  const handleToggleHidden = async () => {
    try {
      await hideBlogComment(comment.id, !comment.isHidden);
      toast.success(comment.isHidden ? "Comment restored" : "Comment hidden");
      onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment and its replies?")) return;
    try {
      await deleteBlogCommentAdmin(comment.id);
      toast.success("Comment deleted");
      onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={handleToggleHidden}
        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
        title={comment.isHidden ? "Restore" : "Hide"}
      >
        {comment.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="rounded-md border border-border p-1.5 text-danger hover:bg-red-50"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ReplyRow({ reply, onChanged }) {
  return (
    <div className="rounded-lg border border-border/70 bg-canvas-muted/30 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-900">{reply.user?.name || "User"}</span>
            <span className="text-[10px] text-stone-500">{formatCommentDate(reply.createdAt)}</span>
            <CommentStatusBadge isHidden={reply.isHidden} />
            <span className="text-[10px] text-stone-500">{reply.likeCount ?? 0} likes</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-800">{reply.text}</p>
        </div>
        <CommentActions comment={reply} onChanged={onChanged} />
      </div>
    </div>
  );
}

function ThreadCard({ thread, onChanged }) {
  return (
    <article className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-900">
              {thread.user?.name || "User"}
            </span>
            <span className="text-[10px] text-stone-500">{formatCommentDate(thread.createdAt)}</span>
            <CommentStatusBadge isHidden={thread.isHidden} />
            <span className="text-[10px] text-stone-500">{thread.likeCount ?? 0} likes</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-stone-800">{thread.text}</p>
        </div>
        <CommentActions comment={thread} onChanged={onChanged} />
      </div>

      {thread.replies?.length ? (
        <div className="mt-3 space-y-2 border-l-2 border-brand-100 pl-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
          </p>
          {thread.replies.map((reply) => (
            <ReplyRow key={reply.id} reply={reply} onChanged={onChanged} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function BlogCommentThreadList({
  blogId,
  blogTitle = "",
  compact = false,
  className = "",
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchComments = useCallback(async () => {
    if (!blogId) return;
    try {
      setLoading(true);
      const response = await getBlogCommentsAdmin(1, 100, "", blogId, statusFilter);
      const payload = response?.data?.data || response?.data || {};
      const list = payload.comments || [];
      setComments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("[BlogCommentThreadList] fetch error:", error);
      toast.error("Failed to load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [blogId, statusFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const threads = useMemo(() => buildThreads(comments), [comments]);
  const replyCount = useMemo(
    () => comments.filter((comment) => Boolean(comment.parentId)).length,
    [comments],
  );

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className={className}>
      {!compact ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="mr-auto min-w-0">
            <h2 className="text-xs font-semibold text-stone-900">Comments & replies</h2>
            {blogTitle ? (
              <p className="mt-0.5 truncate text-[10px] text-stone-500">{blogTitle}</p>
            ) : null}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} min-w-[120px]`}
          >
            <option value="">All visibility</option>
            <option value="false">Visible</option>
            <option value="true">Hidden</option>
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-6 text-[11px] text-stone-500">
          <Loader2 size={16} className="animate-spin" />
          Loading comments...
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-[11px] text-stone-500">
          No comments on this post yet.
        </div>
      ) : (
        <>
          <p className="mb-2 text-[10px] text-stone-500">
            {threads.length} comment{threads.length === 1 ? "" : "s"}, {replyCount} repl
            {replyCount === 1 ? "y" : "ies"}
          </p>
          <div className="space-y-2.5">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} onChanged={fetchComments} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
