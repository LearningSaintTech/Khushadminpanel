import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Heart,
  Loader2,
  MessageCircle,
  Package,
  PanelLeft,
  Share2,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getCommunityFeed,
  getCommunityContent,
  deleteCommunityContent,
} from "../../apis/Communityapi";
import {
  PageHeader,
  inputClass,
  tableScrollShell,
  btnOutline,
  pageToolbar,
  tableHeadClass,
  thClass,
  shortId,
  statusPill,
} from "./communityShared";

const TAGGED_PAGE_SIZE = 4;

function mediaUrl(item) {
  return (
    item?.thumbnailUrl ||
    item?.thumbnail ||
    item?.media?.[0]?.url ||
    item?.mediaUrl ||
    item?.videoUrl ||
    item?.imageUrl ||
    null
  );
}

function firstAvailable(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function toCompactCount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  return `${num}`;
}

function authorMeta(item) {
  const author = item?.author || item?.user || item?.creator || item?.userId || {};
  return {
    name: firstAvailable(item?.authorName, author?.name, item?.userName, "Creator"),
    role: firstAvailable(item?.authorRoleLabel, author?.roleLabel, "CREATOR"),
    image: firstAvailable(
      item?.authorProfileImage,
      author?.profileImage,
      author?.avatar,
      item?.profileImage,
      item?.avatar,
      "",
    ),
  };
}

function taggedProductsOf(item) {
  const raw =
    item?.taggedProducts ||
    item?.products ||
    item?.taggedItems ||
    item?.productTags ||
    item?.linkedProducts ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      const product = entry?.product || entry?.item || entry;
      return {
        id: firstAvailable(
          product?._id,
          product?.id,
          product?.productId,
          entry?._id,
          entry?.id,
          `tag-${index}`,
        ),
        name: firstAvailable(
          product?.name,
          product?.title,
          entry?.name,
          entry?.title,
          `Product ${index + 1}`,
        ),
        image: firstAvailable(
          product?.image,
          product?.imageUrl,
          product?.thumbnail,
          product?.images?.[0]?.url,
          entry?.image,
          entry?.imageUrl,
          "",
        ),
        price: firstAvailable(
          product?.price,
          product?.sellingPrice,
          product?.mrp,
          entry?.price,
          null,
        ),
      };
    })
    .filter((entry) => entry.id || entry.name);
}

const CommunityContent = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTaggedProducts, setShowTaggedProducts] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [taggedPage, setTaggedPage] = useState(0);

  const fetchFeed = useCallback(
    async ({ reset = false, cursorVal = null } = {}) => {
      setLoading(true);
      try {
        const params = {
          scope: "explore",
          type,
          limit: 20,
        };
        if (q.trim()) params.q = q.trim();
        if (!reset && cursorVal) params.cursor = cursorVal;

        const res = await getCommunityFeed(params);
        const data = res?.data ?? res;
        const list = data?.items || data?.data?.items || [];
        setItems((prev) => (reset ? list : [...prev, ...list]));
        setNextCursor(data?.nextCursor || null);
        setHasMore(Boolean(data?.hasMore));
      } catch (err) {
        toast.error(err?.message || "Failed to load feed");
        if (reset) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [type, q],
  );

  useEffect(() => {
    fetchFeed({ reset: true });
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ _id: id });
    setShowTaggedProducts(false);
    setPreviewCollapsed(false);
    setTaggedPage(0);
    try {
      const res = await getCommunityContent(id);
      setDetail(res?.data ?? res);
    } catch (err) {
      toast.error(err?.message || "Failed to load content");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this content? Admin delete may be rejected if the API only allows the author.",
      )
    ) {
      return;
    }
    try {
      await deleteCommunityContent(id);
      toast.success("Content deleted");
      setDetail(null);
      fetchFeed({ reset: true });
    } catch (err) {
      toast.error(err?.message || "Delete not allowed");
    }
  };

  const detailAuthor = useMemo(() => authorMeta(detail), [detail]);
  const detailTaggedProducts = useMemo(() => taggedProductsOf(detail), [detail]);
  const taggedPageCount = Math.max(
    1,
    Math.ceil(detailTaggedProducts.length / TAGGED_PAGE_SIZE),
  );
  const taggedSlide = detailTaggedProducts.slice(
    taggedPage * TAGGED_PAGE_SIZE,
    taggedPage * TAGGED_PAGE_SIZE + TAGGED_PAGE_SIZE,
  );
  const detailCaption = firstAvailable(detail?.caption, detail?.description, "—");

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Clapperboard}
        title="Community content"
        subtitle="Explore feed browse — GET /community/feed?scope=explore"
        onRefresh={() => fetchFeed({ reset: true })}
        loading={loading}
        backLink={
          <Link
            to={ap("community")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Community
          </Link>
        }
      />

      <div className={pageToolbar}>
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="post">Posts</option>
          <option value="reel">Reels</option>
        </select>
        <input
          className={`${inputClass} min-w-[160px] flex-1`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search caption / hashtag / item…"
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchFeed({ reset: true });
          }}
        />
        <button
          type="button"
          className={btnOutline}
          onClick={() => fetchFeed({ reset: true })}
        >
          Search
        </button>
      </div>

      <div className={tableScrollShell}>
        <table className="w-full min-w-[720px] text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Media</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Author</th>
              <th className={thClass}>Caption</th>
              <th className={thClass}>Stats</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-stone-500">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-stone-500">
                  No content found
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const url = mediaUrl(item);
                return (
                  <tr
                    key={item._id}
                    className="border-t border-border/80 hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2">
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-canvas-muted">
                        {url ? (
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-stone-400">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={statusPill(item.type || item.contentType)}>
                        {item.type || item.contentType || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-medium text-stone-900">
                        {item.authorName || "—"}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        @{item.authorUsername || shortId(item.authorId)}
                      </p>
                    </td>
                    <td className="max-w-[220px] px-2 py-2">
                      <p className="line-clamp-2 text-stone-700">
                        {item.caption || "—"}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-stone-600">
                      ♥ {item.likeCount ?? 0} · 💬 {item.commentCount ?? 0}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDetail(item._id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="View"
                        >
                          <ZoomIn size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger/10"
                          title="Delete"
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

      {hasMore ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={loading}
            className={btnOutline}
            onClick={() => {
              fetchFeed({ cursorVal: nextCursor });
            }}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                Content detail
              </h3>
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
              <div className="space-y-2 text-[11px] text-stone-700">
                <p>
                  <span className="font-semibold text-stone-500">ID:</span>{" "}
                  {detail._id}
                </p>
                <p>
                  <span className="font-semibold text-stone-500">Type:</span>{" "}
                  {detail.type || detail.contentType || "—"}
                </p>
                <p>
                  <span className="font-semibold text-stone-500">Author:</span>{" "}
                  {detail.authorName || shortId(detail.authorId)}
                </p>
                <p>
                  <span className="font-semibold text-stone-500">Status:</span>{" "}
                  {detail.status || "—"}
                </p>
                <p className="whitespace-pre-wrap">{detail.caption || "—"}</p>
                {mediaUrl(detail) ? (
                  <img
                    src={mediaUrl(detail)}
                    alt=""
                    className="max-h-64 w-full rounded-lg object-contain"
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CommunityContent;
