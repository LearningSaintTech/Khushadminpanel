import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Eye, EyeOff, FileText, Star, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteBlogPost,
  getAllBlogPosts,
  getBlogSettings,
  toggleBlogPublish,
  toggleBlogFeatured,
  updateBlogSettings,
} from "../../apis/BlogApi";
import { getAllBlogCategories } from "../../apis/BlogCategoryApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function Blog() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blogEnabled, setBlogEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const fetchSettings = async () => {
    try {
      const response = await getBlogSettings();
      const settings = response?.data?.data || response?.data || {};
      setBlogEnabled(Boolean(settings.isEnabled));
    } catch (error) {
      console.error("[Blog] settings error:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getAllBlogCategories(1, 100);
      const payload = response?.data?.data || response?.data || {};
      const list = payload.categories || [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("[Blog] categories error:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await getAllBlogPosts(
        currentPage,
        limit,
        search,
        categoryFilter,
        statusFilter,
      );
      const payload = response?.data?.data || response?.data || {};
      const postsArray = payload.posts || [];
      const pagination = payload.pagination || {};

      setPosts(Array.isArray(postsArray) ? postsArray : []);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("[Blog] fetch error:", error);
      toast.error("Failed to load blog posts");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, limit]);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, limit, search, categoryFilter, statusFilter]);

  const handleToggleFeature = async () => {
    try {
      setSettingsLoading(true);
      const nextEnabled = !blogEnabled;
      await updateBlogSettings({ isEnabled: nextEnabled });
      setBlogEnabled(nextEnabled);
      toast.success(nextEnabled ? "Blog feature enabled" : "Blog feature disabled");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update blog feature flag");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      await deleteBlogPost(id);
      toast.success("Blog post deleted");
      fetchPosts();
    } catch (error) {
      console.error("[Blog] delete error:", error);
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      await toggleBlogPublish(post.id, !post.isPublished);
      toast.success(post.isPublished ? "Post unpublished" : "Post published");
      fetchPosts();
    } catch (error) {
      console.error("[Blog] toggle publish error:", error);
      toast.error(error?.response?.data?.message || "Failed to update publish status");
    }
  };

  const handleToggleFeatured = async (post) => {
    try {
      await toggleBlogFeatured(post.id, !post.isFeatured);
      toast.success(post.isFeatured ? "Removed from featured" : "Marked as featured");
      fetchPosts();
    } catch (error) {
      console.error("[Blog] toggle featured error:", error);
      toast.error(error?.response?.data?.message || "Failed to update featured status");
    }
  };

  return (
    <div className="text-stone-900">
      <div className="mb-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold text-stone-900">Blog feature flag</h2>
            <p className="mt-0.5 text-[10px] text-stone-500">
              When disabled, public website blog APIs return empty results.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              checked={blogEnabled}
              disabled={settingsLoading}
              onChange={handleToggleFeature}
            />
            {blogEnabled ? "Enabled on website" : "Disabled on website"}
          </label>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          All Blogs
        </h1>
        <button
          type="button"
          onClick={() => navigate(ap("blog/comments"))}
          className={inputClass}
        >
          Moderate comments
        </button>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, author..."
          className={`${inputClass} min-w-[160px] flex-1 sm:max-w-[220px]`}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${inputClass} min-w-[120px]`}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} min-w-[120px]`}
        >
          <option value="">All status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
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
        <button
          type="button"
          onClick={() => navigate(ap("blog/create"))}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Create post
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-canvas-muted/80 backdrop-blur">
            <tr>
              <th className="px-3 py-2 font-semibold text-stone-600">#</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Hero</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Title</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Category</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Views</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Likes</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Comments</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Author</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Date</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Status</th>
              <th className="px-3 py-2 font-semibold text-stone-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-stone-500">
                  Loading...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-stone-500">
                  No blog posts found.
                </td>
              </tr>
            ) : (
              posts.map((post, index) => (
                <tr key={post.id} className="border-b border-border/70 hover:bg-canvas-muted/30">
                  <td className="px-3 py-2 text-stone-500">{rowIndexBase + index + 1}</td>
                  <td className="px-3 py-2">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.imageAlt || post.title}
                        className="h-12 w-16 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-md bg-canvas-muted" />
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(ap(`blog/detail/${post.id}`))}
                      className="text-left"
                    >
                      <p className="font-semibold text-stone-900 hover:text-brand-700">
                        {post.title}
                      </p>
                      {post.isFeatured ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                          Featured
                        </span>
                      ) : null}
                      <p className="mt-0.5 truncate text-[10px] text-stone-500">/{post.slug}</p>
                    </button>
                  </td>
                  <td className="px-3 py-2">{post.category}</td>
                  <td className="px-3 py-2">{post.viewCount ?? 0}</td>
                  <td className="px-3 py-2">{post.likeCount ?? 0}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `${ap("blog/comments")}?blogId=${encodeURIComponent(post.id)}&blogTitle=${encodeURIComponent(post.title)}`,
                        )
                      }
                      className="text-left font-medium text-stone-800 hover:text-brand-700"
                      title="View comments"
                    >
                      {post.commentCount ?? 0}
                    </button>
                  </td>
                  <td className="px-3 py-2">{post.author}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{post.date}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        post.isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {post.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(ap(`blog/detail/${post.id}`))}
                        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        title="View details"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${ap("blog/comments")}?blogId=${encodeURIComponent(post.id)}&blogTitle=${encodeURIComponent(post.title)}`,
                          )
                        }
                        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        title="View comments"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(post)}
                        className={`rounded-md border border-border p-1.5 hover:bg-canvas-muted ${
                          post.isFeatured ? "text-amber-600" : "text-stone-600"
                        }`}
                        title={post.isFeatured ? "Remove from featured" : "Mark as featured"}
                      >
                        <Star size={14} fill={post.isFeatured ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(post)}
                        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        title={post.isPublished ? "Unpublish" : "Publish"}
                      >
                        {post.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(ap(`blog/edit/${post.id}`))}
                        className="rounded-md border border-border p-1.5 text-stone-600 hover:bg-canvas-muted"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
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
