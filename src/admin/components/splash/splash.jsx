import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Trash2, ZoomIn, X } from "lucide-react";
import { getAllBanners, deleteBanner } from "../../apis/homebannerapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

function firstBannerUrl(media) {
  if (!media) return null;
  const items = media.items;
  if (Array.isArray(items) && items.length > 0) {
    return items[0]?.url || null;
  }
  return media.url || null;
}

function bannerItemCount(media) {
  if (!media) return 0;
  if (Array.isArray(media.items)) return media.items.length;
  return media.url ? 1 : 0;
}

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const SplashPage = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomedImage, setZoomedImage] = useState(null);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllBanners({ page, limit });
      const bannerArray = response?.data?.banners || response?.banners || [];
      const pagination = response?.data?.pagination || response?.pagination || {};
      setBanners(bannerArray);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch banners:", error);
      alert(error.message || "Something went wrong");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner permanently?")) return;
    try {
      await deleteBanner(id);
      fetchBanners();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error.message || "Failed to delete banner");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  const openZoom = (url, name) => {
    if (!url) return;
    setZoomedImage({ url, name });
  };

  const MediaThumb = ({ url, count, label, onZoom }) => {
    if (!url) {
      return (
        <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-border bg-canvas-muted text-[10px] text-stone-400">
          —
        </div>
      );
    }
    const isVideo =
      url.toLowerCase().endsWith(".mp4") || url.toLowerCase().includes("video");
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoom();
        }}
        className="group relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas-muted"
        title={`Zoom ${label}`}
      >
        {isVideo ? (
          <span className="text-[10px] font-bold text-white">▶</span>
        ) : (
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/56?text=?";
            }}
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <ZoomIn className="h-2.5 w-2.5 text-white" />
        </span>
        {count > 1 ? (
          <span className="absolute bottom-0 right-0 rounded-tl bg-black/75 px-1 text-[8px] text-white">
            +{count - 1}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Homepage banners
        </h1>
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
          onClick={() => navigate(ap("banner-form"))}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </button>
      </div>

      {loading && banners.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
          <p className="text-[11px] font-medium text-stone-600">No banners yet</p>
          <button
            type="button"
            onClick={() => navigate(ap("banner-form"))}
            className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Create banner →
          </button>
        </div>
      ) : (
        <>
          <div className={tableScrollShell}>
            <table className="w-full min-w-[880px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-canvas-muted/95 shadow-[0_1px_0_0_var(--color-border)]">
                <tr>
                  <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Desktop
                  </th>
                  <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                    Mobile
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Title
                  </th>
                  <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Description
                  </th>
                  <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 xl:table-cell">
                    Type
                  </th>
                  <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 xl:table-cell">
                    Discount
                  </th>
                  <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 2xl:table-cell">
                    Navigate
                  </th>
                  <th className="sticky right-0 bg-canvas-muted/95 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner, idx) => {
                  const desktopUrl = firstBannerUrl(banner.desktopBanner);
                  const desktopCount = bannerItemCount(banner.desktopBanner);
                  const mobileUrl = firstBannerUrl(banner.mobileBanner);
                  const mobileCount = bannerItemCount(banner.mobileBanner);
                  const categoryLabel =
                    banner.type === "CATEGORY" && banner.categoryId
                      ? typeof banner.categoryId === "object"
                        ? banner.categoryId.name
                        : null
                      : null;

                  return (
                    <tr
                      key={banner._id}
                      className="group border-t border-border/80 transition-colors hover:bg-brand-50/30"
                    >
                      <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                        {rowIndexBase + idx + 1}
                      </td>
                      <td className="px-2 py-2">
                        <MediaThumb
                          url={desktopUrl}
                          count={desktopCount}
                          label={`${banner.title} desktop`}
                          onZoom={() =>
                            openZoom(desktopUrl, `${banner.title} — Desktop`)
                          }
                        />
                      </td>
                      <td className="hidden px-2 py-2 md:table-cell">
                        <MediaThumb
                          url={mobileUrl}
                          count={mobileCount}
                          label={`${banner.title} mobile`}
                          onZoom={() =>
                            openZoom(mobileUrl, `${banner.title} — Mobile`)
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <p
                          className="max-w-[180px] truncate font-medium text-stone-900"
                          title={banner.title || ""}
                        >
                          {banner.title || "—"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                          {banner.type ? (
                            <span className="rounded-full border border-border bg-canvas-muted px-1.5 py-0.5 text-[10px] text-stone-700">
                              {banner.type}
                            </span>
                          ) : null}
                          {banner.discount ? (
                            <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[10px] text-success">
                              {banner.discount}%
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden max-w-[200px] px-2 py-2 lg:table-cell">
                        <p className="line-clamp-2 text-[10px] text-stone-600" title={banner.text || ""}>
                          {banner.text || "—"}
                        </p>
                      </td>
                      <td className="hidden px-2 py-2 xl:table-cell">
                        <span className="rounded-full border border-border bg-canvas-muted px-2 py-0.5 text-[10px] text-stone-700">
                          {banner.type || "—"}
                        </span>
                        {categoryLabel ? (
                          <p className="mt-0.5 truncate text-[10px] text-stone-500" title={categoryLabel}>
                            {categoryLabel}
                          </p>
                        ) : null}
                      </td>
                      <td className="hidden px-2 py-2 xl:table-cell">
                        {banner.discount ? (
                          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success">
                            {banner.discount}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">—</span>
                        )}
                      </td>
                      <td className="hidden max-w-[120px] truncate px-2 py-2 2xl:table-cell">
                        <span className="text-[10px] text-stone-600" title={banner.navigation?.navigate || ""}>
                          {banner.navigation?.navigate || "—"}
                        </span>
                      </td>
                      <td className="sticky right-0 bg-white px-2 py-2 text-right group-hover:bg-brand-50/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(ap(`banner-form/${banner._id}`))}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="Edit"
                            aria-label="Edit banner"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner._id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                            title="Delete"
                            aria-label="Delete banner"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
              Page {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {zoomedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20"
            aria-label="Close zoom"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative flex h-full w-full items-center justify-center">
            {zoomedImage.url?.toLowerCase?.().endsWith(".mp4") ? (
              <video
                src={zoomedImage.url}
                controls
                className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={zoomedImage.url}
                alt={zoomedImage.name}
                className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {zoomedImage.name}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SplashPage;
