import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { getFeaturedImages, deleteFeaturedImage } from "../../apis/Bannerapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

function isVideoUrl(url = "", key = "") {
  return (
    /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url) ||
    url.includes("video") ||
    key?.includes("video")
  );
}

const PAGE_LABELS = {
  home: "Home",
  lock: "Lock",
  bottom: "Bottom",
};

export default function Banner() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPage, setFilterPage] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const pageFilter = filterPage === "all" ? "" : filterPage;
      const response = await getFeaturedImages(pageFilter, currentPage, limit);
      const responseData = response?.data || {};
      const imagesArray = responseData.data || [];
      const paginationData = responseData.pagination || {};

      setImages(Array.isArray(imagesArray) ? imagesArray : []);

      if (paginationData.totalPages) {
        setTotalPages(paginationData.totalPages);
      } else if (paginationData.total) {
        setTotalPages(Math.max(1, Math.ceil(paginationData.total / limit)));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("[Banner] fetch error:", err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPage, limit]);

  useEffect(() => {
    fetchImages();
  }, [filterPage, currentPage, limit]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await deleteFeaturedImage(id);
      await fetchImages();
    } catch (err) {
      console.error("[Banner] delete error:", err);
      alert(err?.message || "Delete failed");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Featured Banners
        </h1>
        <select
          value={filterPage}
          onChange={(e) => setFilterPage(e.target.value)}
          className={`${inputClass} w-full min-w-[120px] max-w-[160px] sm:w-auto`}
          title="Page location filter"
        >
          <option value="all">All pages</option>
          <option value="home">Home</option>
          <option value="lock">Lock screen</option>
          <option value="bottom">Bottom</option>
        </select>
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("banners/create"))}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Create
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                #
              </th>
              <th className="w-24 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Preview
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Heading
              </th>
              <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                Subheading
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Page
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : images.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center">
                  <p className="text-stone-500">No banners found.</p>
                  <button
                    type="button"
                    onClick={() => navigate(ap("banners/create"))}
                    className="mt-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Create your first banner →
                  </button>
                </td>
              </tr>
            ) : (
              images.map((item, idx) => {
                const video = isVideoUrl(item.url, item.key);
                return (
                  <tr key={item._id} className="border-t border-border/80 hover:bg-brand-50/30">
                    <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <div className="h-12 w-20 overflow-hidden rounded-md border border-border bg-canvas-muted">
                        {video ? (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='48'/%3E";
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="max-w-[180px] px-2 py-2">
                      <p className="truncate font-medium text-stone-900">
                        {item.heading || "—"}
                      </p>
                    </td>
                    <td className="hidden max-w-[200px] truncate px-2 py-2 text-stone-600 md:table-cell">
                      {item.subHeading || "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                        {PAGE_LABELS[item.page] || item.page || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(ap(`banners/edit/${item._id}`))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                          title="Edit"
                          aria-label="Edit banner"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition-colors hover:opacity-90"
                          title="Delete"
                          aria-label="Delete banner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={currentPage === 1 || loading}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
          Page {currentPage} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages || loading}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
