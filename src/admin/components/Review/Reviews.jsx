import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getItemsWithSkus,
  getReviews,
  getReviewStats,
  updateReview,
  deleteReview,
} from "../../apis/Reviewapi";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  X,
  MessageSquare,
  Package,
} from "lucide-react";
import { btnIconDelete, btnIconEdit, btnOutline, pageToolbar } from "./reviewsShared";

function itemIdStr(item) {
  const id = item?.itemId;
  if (id == null) return "";
  return typeof id === "object" && typeof id.toString === "function"
    ? id.toString()
    : String(id);
}

function resolveReviewerType(review) {
  if (review?.reviewerType === "guest" || review?.isGuestReviewer) return "guest";
  if (review?.reviewerType === "fake" || review?.isFakeReviewer) return "fake";
  return "user";
}

function reviewerDisplayName(review) {
  return (
    review?.reviewerName ||
    review?.name ||
    (resolveReviewerType(review) === "guest" ? "Guest" : "Customer")
  );
}

function reviewerTypeBadge(type) {
  if (type === "guest") {
    return {
      label: "Guest",
      className: "bg-violet-100 text-violet-800 border-violet-200",
    };
  }
  if (type === "fake") {
    return {
      label: "Fake profile",
      className: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }
  return {
    label: "Registered user",
    className: "bg-sky-100 text-sky-900 border-sky-200",
  };
}

function formatReviewDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPhone(review) {
  const code = String(review?.countryCode || "").trim();
  const phone = String(review?.phoneNumber || "").trim();
  if (!phone) return null;
  return `${code || ""}${phone}`.trim();
}

function StarRow({ value, max = 5, size = "sm" }) {
  const n = Number(value) || 0;
  const cls = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < n ? "fill-brand-600 text-brand-600" : "text-stone-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  const [statsMap, setStatsMap] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [itemReviews, setItemReviews] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editDescription, setEditDescription] = useState("");
  const [editFiles, setEditFiles] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await getItemsWithSkus(page, limit, debouncedSearch);
      if (res?.success && res.data) {
        setItems(res.data.items || []);
        const p = res.data.pagination || {};
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? limit,
          total: p.total ?? 0,
          totalPages: p.totalPages ?? 1,
        });
      } else {
        setItems([]);
        toast.error(res?.message || "Failed to load products");
      }
    } catch (err) {
      console.error(err);
      toast.error(typeof err === "string" ? err : "Failed to load products");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!items.length) {
      setStatsMap({});
      setStatsLoading(false);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      const next = {};
      await Promise.all(
        items.map(async (item) => {
          const id = itemIdStr(item);
          if (!id) return;
          try {
            const res = await getReviewStats(id);
            if (!cancelled && res?.success && res.data) {
              next[id] = res.data;
            }
          } catch {
            if (!cancelled) next[id] = null;
          }
        })
      );
      if (!cancelled) {
        setStatsMap(next);
        setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const loadItemReviews = async (item) => {
    const id = itemIdStr(item);
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await getReviews(id, 1, 200);
      const list = res?.data?.reviews ?? [];
      setItemReviews(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to load reviews");
      setItemReviews([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setDetailOpen(true);
    loadItemReviews(item);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedItem(null);
    setItemReviews([]);
  };

  const refreshStatsForItem = async (item) => {
    const id = itemIdStr(item);
    if (!id) return;
    try {
      const res = await getReviewStats(id);
      if (res?.success && res.data) {
        setStatsMap((prev) => ({ ...prev, [id]: res.data }));
      }
    } catch {
      /* ignore */
    }
  };

  const openEdit = (review) => {
    setEditingReview(review);
    setEditRating(Number(review.rating) || 5);
    setEditDescription(review.description || "");
    setEditFiles([]);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingReview(null);
    setEditFiles([]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReview?._id) return;
    setEditSaving(true);
    try {
      const res = await updateReview(editingReview._id, {
        rating: editRating,
        description: editDescription,
        files: editFiles,
      });
      if (res?.success) {
        toast.success(res?.message || "Review updated");
        closeEdit();
        if (selectedItem) await loadItemReviews(selectedItem);
        if (selectedItem) await refreshStatsForItem(selectedItem);
      } else {
        toast.error(res?.message || "Update failed");
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (review) => {
    if (!review?._id) return;
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      const res = await deleteReview(review._id);
      if (res?.success) {
        toast.success(res?.message || "Review deleted");
        if (selectedItem) await loadItemReviews(selectedItem);
        if (selectedItem) await refreshStatsForItem(selectedItem);
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Delete failed");
    }
  };

  const dist = selectedItem ? statsMap[itemIdStr(selectedItem)]?.distribution : null;
  const maxDist = dist
    ? Math.max(1, ...Object.values(dist))
    : 1;

  const currentPage = pagination.page ?? page;
  const totalPages = Math.max(1, pagination.totalPages ?? 1);
  const totalItems = pagination.total ?? 0;

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-stone-900 sm:text-lg">
          Product reviews
        </h1>
        <input
          type="search"
          placeholder="Search name, product ID, SKU…"
          className="min-w-[120px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:min-w-[160px] sm:max-w-[280px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) || 12)}
          title="Items per page"
        >
          <option value={12}>12 / page</option>
          <option value={24}>24 / page</option>
          <option value={36}>36 / page</option>
          <option value={48}>48 / page</option>
        </select>
      </form>

      {loadingItems ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-14 text-[11px] text-stone-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading products…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-12 text-center shadow-sm">
          <Package className="mx-auto mb-2 h-9 w-9 text-stone-300" aria-hidden />
          <p className="text-sm font-semibold text-stone-900">No products found</p>
          <p className="mt-1 text-[11px] text-stone-500">Try another search term.</p>
        </div>
      ) : (
        <>
          <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white p-2 shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const id = itemIdStr(item);
                const stats = statsMap[id];
                const total = stats?.totalReviews ?? 0;
                const avg = stats?.averageRating;

                return (
                  <button
                    key={id || item.name}
                    type="button"
                    onClick={() => openDetail(item)}
                    className="text-left rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/20"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-xs font-semibold text-stone-900">
                          {item.name || "—"}
                        </h2>
                        <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                          ID: {item.productId || "—"}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px] text-stone-400">
                          {id}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 shrink-0 text-stone-400" />
                    </div>

                    {statsLoading && !stats ? (
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <>
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <StarRow value={Math.round(avg || 0)} />
                          <span className="text-xs font-semibold text-stone-800">
                            {avg != null ? avg.toFixed(1) : "—"}
                          </span>
                          <span className="text-xs text-stone-500">
                            ({total} review{total !== 1 ? "s" : ""})
                          </span>
                        </div>
                        {stats?.distribution && (
                          <div className="mt-2 space-y-1 border-t border-border/80 pt-2">
                            {[5, 4, 3, 2, 1].map((star) => {
                              const c = stats.distribution[star] || 0;
                              const pct = (c / maxDist) * 100;
                              return (
                                <div
                                  key={star}
                                  className="flex items-center gap-2 text-[10px]"
                                >
                                  <span className="w-3 text-stone-500">{star}★</span>
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-muted">
                                    <div
                                      className="h-full rounded-full bg-brand-600 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-6 text-right text-stone-600">{c}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-stone-500">Open to manage</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-stone-500">
              Page {currentPage} of {totalPages}
              {totalItems > 0 ? ` (${totalItems} products)` : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingItems}
                className={btnOutline}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingItems}
                className={btnOutline}
              >
                Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail: all reviews for item */}
      {detailOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div
            className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-xl sm:h-[min(100vh-2rem,900px)] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border bg-white p-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-stone-900 leading-tight">
                  {selectedItem.name}
                </h2>
                <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                  Product ID: {selectedItem.productId || "—"}
                </p>
                <p className="truncate font-mono text-[10px] text-stone-400">
                  {itemIdStr(selectedItem)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg p-1.5 text-stone-600 hover:bg-canvas-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border bg-canvas-muted p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                Summary
              </p>
              {statsMap[itemIdStr(selectedItem)] && (
                <div className="flex flex-wrap items-center gap-3">
                  <StarRow
                    value={Math.round(
                      statsMap[itemIdStr(selectedItem)].averageRating || 0
                    )}
                    size="lg"
                  />
                  <span className="text-base font-semibold text-stone-900">
                    {statsMap[itemIdStr(selectedItem)].averageRating != null
                      ? statsMap[itemIdStr(selectedItem)].averageRating.toFixed(1)
                      : "—"}
                  </span>
                  <span className="text-xs text-stone-600">
                    {statsMap[itemIdStr(selectedItem)].totalReviews} total
                  </span>
                </div>
              )}
              {dist && (
                <div className="mt-3 space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const c = dist[star] || 0;
                    const pct = (c / maxDist) * 100;
                    return (
                      <div key={star} className="flex items-center gap-2 text-[10px]">
                        <span className="w-3 text-stone-500">{star}★</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-stone-700">{c}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <h3 className="mb-2 text-xs font-semibold text-stone-800">All reviews</h3>
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-stone-400" />
                </div>
              ) : itemReviews.length === 0 ? (
                <p className="text-xs text-stone-500">No reviews for this product yet.</p>
              ) : (
                <ul className="space-y-2">
                  {itemReviews.map((rev) => {
                    const reviewerType = resolveReviewerType(rev);
                    const badge = reviewerTypeBadge(reviewerType);
                    const phone = formatPhone(rev);

                    return (
                    <li
                      key={rev._id}
                      className="rounded-lg border border-border bg-white p-2"
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {formatReviewDate(rev.createdAt)}
                            </span>
                          </div>
                          <StarRow value={Number(rev.rating) || 0} />
                          <p className="mt-0.5 text-xs font-medium text-stone-900">
                            {reviewerDisplayName(rev)}
                          </p>
                          {rev.email ? (
                            <p className="mt-0.5 truncate text-[10px] text-stone-600">
                              {rev.email}
                            </p>
                          ) : null}
                          {phone ? (
                            <p className="mt-0.5 text-[10px] text-stone-500">
                              {phone}
                            </p>
                          ) : null}
                          {rev.userId ? (
                            <p className="mt-0.5 truncate font-mono text-[9px] text-stone-400">
                              User: {String(rev.userId)}
                            </p>
                          ) : null}
                          {rev.guestUserId ? (
                            <p className="mt-0.5 truncate font-mono text-[9px] text-stone-400">
                              Guest ID: {String(rev.guestUserId)}
                            </p>
                          ) : null}
                          {rev.fakeUserId ? (
                            <p className="mt-0.5 truncate font-mono text-[9px] text-stone-400">
                              Fake ID: {String(rev.fakeUserId)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(rev)}
                            className={btnIconEdit}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rev)}
                            className={btnIconDelete}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                      {rev.description ? (
                        <p className="whitespace-pre-wrap text-xs text-stone-800">
                          {rev.description}
                        </p>
                      ) : (
                        <p className="text-xs italic text-stone-400">No text</p>
                      )}
                      {Array.isArray(rev.images) && rev.images.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {rev.images.map((img, i) => {
                            const src = img?.url || img?.imageUrl;
                            if (!src) return null;
                            return (
                              <img
                                key={img?.key || img?.imageKey || i}
                                src={src}
                                alt=""
                                className="h-16 w-16 rounded border border-border object-cover"
                              />
                            );
                          })}
                        </div>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit review modal */}
      {editOpen && editingReview && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeEdit()}
        >
          <div
            className="w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="text-sm font-semibold text-stone-900">Edit review</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg p-1.5 hover:bg-canvas-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 p-3">
              <div className="rounded-lg border border-border bg-canvas-muted/50 px-2.5 py-2 text-[10px] text-stone-600">
                <p className="font-semibold text-stone-800">
                  {reviewerDisplayName(editingReview)}
                </p>
                <p className="mt-0.5">
                  {reviewerTypeBadge(resolveReviewerType(editingReview)).label}
                  {editingReview.email ? ` · ${editingReview.email}` : ""}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-stone-700">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditRating(s)}
                      className="p-1"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          s <= editRating
                            ? "fill-brand-600 text-brand-600"
                            : "text-stone-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-stone-700">
                  Comment
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-stone-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-stone-700">
                  Replace images (optional, max 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setEditFiles(Array.from(e.target.files || []).slice(0, 5))
                  }
                  className="w-full text-xs"
                />
                {editFiles.length > 0 && (
                  <p className="mt-1 text-[10px] text-stone-500">
                    {editFiles.length} new file(s) — saving replaces existing photos.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:bg-canvas-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
