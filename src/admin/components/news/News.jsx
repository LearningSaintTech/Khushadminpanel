import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Newspaper,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAllNews, deleteNews } from "../../apis/NewsApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import NewsPressSection from "./NewsPressSection";

const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function News() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = all, "true", "false"
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // View mode: 'table' or 'storefront'
  const [viewMode, setViewMode] = useState("table");

  // Modal states
  const [previewItem, setPreviewItem] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState(null);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  // Fetch news list
  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await getAllNews({
        page: currentPage,
        limit,
        isActive: statusFilter,
      });

      const payload = res?.data?.data || res?.data || {};
      const items = Array.isArray(payload.news)
        ? payload.news
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

      setNewsList(items);

      const total =
        payload.total !== undefined
          ? payload.total
          : payload.totalCount !== undefined
            ? payload.totalCount
            : items.length;

      setTotalCount(total);

      const pages =
        payload.totalPages ||
        payload.pages ||
        Math.max(1, Math.ceil(total / limit)) ||
        1;
      setTotalPages(pages);
    } catch (err) {
      console.error("[News] fetch error:", err);
      toast.error(err?.message || "Failed to load news items");
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, search, statusFilter]);

  useEffect(() => {
    fetchNews();
  }, [currentPage, limit, statusFilter]);

  // Client-side search filtering if backend search is not provided
  const filteredNews = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return newsList;
    return newsList.filter((item) => {
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchLink = Array.isArray(item.links) && item.links.some((l) => (l || "").toLowerCase().includes(q));
      return matchName || matchLink;
    });
  }, [newsList, search]);

  // Summary counts
  const stats = useMemo(() => {
    const activeCount = newsList.filter((n) => n.isActive).length;
    const totalLinks = newsList.reduce(
      (acc, n) => acc + (Array.isArray(n.links) ? n.links.length : 0),
      0
    );
    return {
      total: totalCount || newsList.length,
      active: activeCount,
      totalLinks,
    };
  }, [newsList, totalCount]);

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteNews(deleteCandidate._id || deleteCandidate.id);
      toast.success("News item and media logo deleted successfully");
      setDeleteCandidate(null);

      if (newsList.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        await fetchNews();
      }
    } catch (err) {
      console.error("[News] delete error:", err);
      toast.error(err?.message || "Failed to delete news item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 text-stone-900 pb-10">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Newspaper size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-stone-900">
                News & Media Coverage
              </h1>
              <span className="rounded-full bg-brand-50 border border-brand-100 px-2 py-0.2 text-[10px] font-bold text-brand-700">
                {stats.total}
              </span>
            </div>
            <p className="text-[10px] text-stone-500 hidden sm:block">
              Manage press mentions, newspaper logos, and external media links
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-canvas-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              viewMode === "table"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <List size={13} />
            <span className="hidden sm:inline">Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("storefront")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              viewMode === "storefront"
                ? "bg-white text-brand-700 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Storefront Live Preview</span>
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => navigate(ap("news/create"))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
        >
          <Plus size={14} />
          <span>Create News</span>
        </button>
      </div>

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-2 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by publication name or URL…"
            className={`${inputClass} pl-8 w-full`}
            aria-label="Search news"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} min-w-[120px]`}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>

        {/* Limit */}
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 10)}
          className={`${inputClass} min-w-[100px] ml-auto`}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {/* Main Content Area */}
      {viewMode === "storefront" ? (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-border bg-stone-50/70 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" />
              <h2 className="text-xs font-bold text-stone-900">
                Customer Storefront Preview
              </h2>
            </div>
            <span className="text-[10px] text-stone-500">
              Only items with <span className="font-semibold text-success">Active</span> status will be shown to public users
            </span>
          </div>

          <div className="p-4">
            <NewsPressSection
              items={newsList.filter((n) => n.isActive)}
              title="Khush In The News & Media"
              subtitle="Latest press releases, red carpet highlights, and editorial features"
            />
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
              <tr>
                <th className="w-10 px-2.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  #
                </th>
                <th className="w-20 px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Logo
                </th>
                <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Publication / Media Name
                </th>
                <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Press Links
                </th>
                <th className="w-20 px-2.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Sort Order
                </th>
                <th className="w-20 px-2.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Status
                </th>
                <th className="w-28 px-2.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Created
                </th>
                <th className="w-24 px-2.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-10 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-brand-600" size={24} />
                      <span className="text-xs">Loading press news items…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredNews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-2">
                        <Newspaper size={24} />
                      </div>
                      <p className="text-xs font-semibold text-stone-700">
                        {search || statusFilter ? "No news items match your filters" : "No news items created yet"}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {search
                          ? "Try searching with a different publication title or clearing filters."
                          : "Add your first press or media coverage logo and article links."}
                      </p>
                      {!search && !statusFilter ? (
                        <button
                          type="button"
                          onClick={() => navigate(ap("news/create"))}
                          className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-brand-700 transition"
                        >
                          <Plus size={13} /> Create First News Item
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNews.map((item, idx) => (
                  <tr
                    key={item._id || item.id || idx}
                    className="border-t border-border/80 hover:bg-brand-50/20 transition-colors"
                  >
                    {/* Index */}
                    <td className="px-2.5 py-2 text-center text-[10px] text-stone-500 font-mono">
                      {rowIndexBase + idx + 1}
                    </td>

                    {/* Logo */}
                    <td className="px-2.5 py-2">
                      {item.logo ? (
                        <button
                          type="button"
                          onClick={() => setImageModalUrl(item.logo)}
                          className="group relative flex h-10 w-14 items-center justify-center overflow-hidden rounded-lg border border-border bg-stone-50 p-1 hover:border-brand-500 transition"
                          title="Click to zoom logo"
                        >
                          <img
                            src={item.logo}
                            alt={item.name || "logo"}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-border bg-stone-100 text-stone-400">
                          <Newspaper size={16} />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-2.5 py-2">
                      <div className="font-semibold text-stone-900 text-xs">
                        {item.name}
                      </div>
                      {item.logoKey && (
                        <div className="text-[9px] text-stone-400 font-mono truncate max-w-[200px]" title={item.logoKey}>
                          {item.logoKey}
                        </div>
                      )}
                    </td>

                    {/* Links */}
                    <td className="px-2.5 py-2">
                      {Array.isArray(item.links) && item.links.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.links.map((linkUrl, lIdx) => (
                            <a
                              key={lIdx}
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                              title={linkUrl}
                            >
                              <Globe size={11} className="text-stone-400" />
                              <span className="max-w-[120px] truncate">
                                {linkUrl.replace(/^https?:\/\/(www\.)?/, "")}
                              </span>
                              <ExternalLink size={10} className="shrink-0 text-stone-400" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">No links</span>
                      )}
                    </td>

                    {/* Sort Order */}
                    <td className="px-2.5 py-2 text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                        {item.sortOrder !== undefined ? item.sortOrder : 0}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-2.5 py-2 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                          <XCircle size={11} /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-2.5 py-2 text-center text-[10px] text-stone-500 whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-2.5 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-stone-600 hover:bg-stone-50 hover:text-brand-600 transition"
                          title="Preview Item Card"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(ap(`news/edit/${item._id || item.id}`))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-stone-600 hover:bg-stone-50 hover:text-brand-600 transition"
                          title="Edit News Item"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-stone-600 hover:bg-danger-bg hover:text-danger hover:border-danger/30 transition"
                          title="Delete News Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {viewMode === "table" && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-[11px] shadow-sm">
          <span className="text-stone-500">
            Showing <span className="font-semibold text-stone-800">{filteredNews.length}</span> of{" "}
            <span className="font-semibold text-stone-800">{totalCount}</span> items (Page {currentPage} of {totalPages})
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-stone-800">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setImageModalUrl(null)}
        >
          <div
            className="relative max-w-lg rounded-2xl bg-white p-4 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImageModalUrl(null)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
            >
              <X size={15} />
            </button>
            <img
              src={imageModalUrl}
              alt="Full size logo"
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Quick Preview Card Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-brand-600" />
                <h3 className="text-xs font-bold text-stone-900">Card Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                <X size={15} />
              </button>
            </div>

            {/* Simulated customer card */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
              <div className="flex h-28 w-full items-center justify-center rounded-lg bg-stone-50 p-2 mb-3 border border-stone-100">
                {previewItem.logo ? (
                  <img
                    src={previewItem.logo}
                    alt={previewItem.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Newspaper size={30} className="text-stone-300" />
                )}
              </div>
              <h4 className="text-sm font-bold text-stone-900 mb-2">{previewItem.name}</h4>
              <div className="space-y-1.5 pt-2 border-t border-border">
                {Array.isArray(previewItem.links) && previewItem.links.length > 0 ? (
                  previewItem.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-stone-700 bg-stone-50 border border-stone-200/80 hover:bg-brand-50 hover:text-brand-700 transition"
                    >
                      <span className="truncate max-w-[280px]">{link}</span>
                      <ExternalLink size={12} className="shrink-0 text-stone-400" />
                    </a>
                  ))
                ) : (
                  <p className="text-[10px] text-stone-400 italic">No links</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => !deleting && setDeleteCandidate(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-border text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Delete News Item?</h3>
            <p className="mt-1 text-xs text-stone-500">
              Are you sure you want to delete <span className="font-semibold text-stone-800">&ldquo;{deleteCandidate.name}&rdquo;</span>? This will permanently remove the item and delete its S3 logo image.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteCandidate(null)}
                className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-canvas-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 rounded-full bg-danger px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-danger/90 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{deleting ? "Deleting…" : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
