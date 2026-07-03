import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteBlogCommentAdmin,
  getBlogCommentsAdmin,
  hideBlogComment,
} from "../../apis/BlogApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import BlogCommentThreadList from "./BlogCommentThreadList";

const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function BlogComments() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [searchParams] = useSearchParams();
  const blogId = searchParams.get("blogId") || "";
  const blogTitle = searchParams.get("blogTitle") || "";

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await getBlogCommentsAdmin(
        currentPage,
        limit,
        search,
        blogId,
        statusFilter,
      );
      const payload = response?.data?.data || response?.data || {};
      const list = payload.comments || [];
      const pagination = payload.pagination || {};
      setComments(Array.isArray(list) ? list : []);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("[BlogComments] fetch error:", error);
      toast.error("Failed to load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, limit]);

  useEffect(() => {
    if (blogId) return;
    fetchComments();
  }, [currentPage, limit, search, statusFilter, blogId]);

  const handleToggleHidden = async (comment) => {
    try {
      await hideBlogComment(comment.id, !comment.isHidden);
      toast.success(comment.isHidden ? "Comment restored" : "Comment hidden");
      fetchComments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment and its replies?")) return;
    try {
      await deleteBlogCommentAdmin(id);
      toast.success("Comment deleted");
      fetchComments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  if (blogId) {
    return (
      <div className="text-stone-900">
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(ap(`blog/detail/${blogId}`))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700"
          >
            <ArrowLeft size={14} />
            Back to post
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Comments for this post
          </h1>
        </div>

        <BlogCommentThreadList blogId={blogId} blogTitle={blogTitle} />
      </div>
    );
  }

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Blog Comments
        </h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search comment text..."
          className={`${inputClass} min-w-[160px] flex-1 sm:max-w-[220px]`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} min-w-[120px]`}
        >
          <option value="">All visibility</option>
          <option value="false">Visible</option>
          <option value="true">Hidden</option>
        </select>
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted/80 backdrop-blur">
            <tr>
              <th className="px-3 py-2 font-semibold text-stone-600">#</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Post</th>
              <th className="px-3 py-2 font-semibold text-stone-600">User</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Comment</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Likes</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Type</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Status</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
                  Loading...
                </td>
              </tr>
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
                  No comments found.
                </td>
              </tr>
            ) : (
              comments.map((comment, index) => (
                <tr key={comment.id} className="border-b border-border/70 hover:bg-canvas-muted/30">
                  <td className="px-3 py-2 text-stone-500">{rowIndexBase + index + 1}</td>
                  <td className="max-w-[160px] px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `${ap("blog/comments")}?blogId=${encodeURIComponent(comment.blogId)}&blogTitle=${encodeURIComponent(comment.blogTitle || "")}`,
                        )
                      }
                      className="text-left hover:text-brand-700"
                    >
                      <p className="font-semibold">{comment.blogTitle}</p>
                      <p className="text-[10px] text-stone-500">/{comment.blogSlug}</p>
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{comment.user?.name}</td>
                  <td className="max-w-[280px] px-3 py-2">
                    <p className="line-clamp-3">{comment.text}</p>
                    {comment.parentText ? (
                      <p className="mt-1 text-[10px] text-stone-500">
                        Reply to: {comment.parentText.slice(0, 60)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{comment.likeCount}</td>
                  <td className="px-3 py-2">{comment.parentId ? "Reply" : "Comment"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        comment.isHidden
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {comment.isHidden ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleHidden(comment)}
                        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        title={comment.isHidden ? "Restore" : "Hide"}
                      >
                        {comment.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="rounded-md border border-border p-1.5 text-danger hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-[11px] text-stone-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
