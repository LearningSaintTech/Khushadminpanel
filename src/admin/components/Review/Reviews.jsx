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
  Search,
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

function itemIdStr(item) {
  const id = item?.itemId;
  if (id == null) return "";
  return typeof id === "object" && typeof id.toString === "function"
    ? id.toString()
    : String(id);
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
            i < n ? "fill-black text-black" : "text-gray-200"
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
  }, [debouncedSearch]);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await getItemsWithSkus(page, 12, debouncedSearch);
      if (res?.success && res.data) {
        setItems(res.data.items || []);
        const p = res.data.pagination || {};
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? 12,
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
  }, [page, debouncedSearch]);

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

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Product reviews</h1>
        <p className="text-sm text-gray-600 mb-6">
          Search by product name, product ID, or SKU. Open a product to see all reviews; you can edit or delete any review.
        </p>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name, product ID, or SKU…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingItems ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No products match your search.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="text-left bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900 truncate">
                          {item.name || "—"}
                        </h2>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          ID: {item.productId || "—"}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono truncate mt-1">
                          {id}
                        </p>
                      </div>
                      <MessageSquare className="w-5 h-5 text-gray-400 shrink-0" />
                    </div>

                    {statsLoading && !stats ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading stats…
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <StarRow value={Math.round(avg || 0)} />
                          <span className="text-sm font-medium text-gray-800">
                            {avg != null ? avg.toFixed(1) : "—"}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({total} review{total !== 1 ? "s" : ""})
                          </span>
                        </div>
                        {stats?.distribution && (
                          <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
                            {[5, 4, 3, 2, 1].map((star) => {
                              const c = stats.distribution[star] || 0;
                              const pct = (c / maxDist) * 100;
                              return (
                                <div
                                  key={star}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="w-3 text-gray-500">{star}★</span>
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-900 rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-6 text-right text-gray-600">{c}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-3">
                          Click to view & manage reviews
                        </p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail: all reviews for item */}
      {detailOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div
            className="bg-white w-full max-w-lg h-full sm:h-[min(100vh-2rem,900px)] sm:rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200">
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-gray-900 leading-tight">
                  {selectedItem.name}
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Product ID: {selectedItem.productId || "—"}
                </p>
                <p className="text-[11px] text-gray-400 font-mono truncate">
                  {itemIdStr(selectedItem)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
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
                  <span className="text-lg font-semibold">
                    {statsMap[itemIdStr(selectedItem)].averageRating != null
                      ? statsMap[itemIdStr(selectedItem)].averageRating.toFixed(1)
                      : "—"}
                  </span>
                  <span className="text-sm text-gray-600">
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
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-gray-500">{star}★</span>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right">{c}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                All reviews
              </h3>
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : itemReviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews for this product yet.</p>
              ) : (
                <ul className="space-y-4">
                  {itemReviews.map((rev) => (
                    <li
                      key={rev._id}
                      className="border border-gray-200 rounded-lg p-3 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <StarRow value={Number(rev.rating) || 0} />
                          <p className="text-xs text-gray-500 mt-1">
                            {rev.name || "Customer"}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(rev)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rev)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {rev.description ? (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {rev.description}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No text</p>
                      )}
                      {Array.isArray(rev.images) && rev.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rev.images.map((img, i) => {
                            const src = img?.url || img?.imageUrl;
                            if (!src) return null;
                            return (
                              <img
                                key={img?.key || img?.imageKey || i}
                                src={src}
                                alt=""
                                className="w-16 h-16 object-cover rounded border border-gray-200"
                              />
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit review modal */}
      {editOpen && editingReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeEdit()}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Edit review</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
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
                        className={`w-8 h-8 ${
                          s <= editRating
                            ? "fill-black text-black"
                            : "text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Comment
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Replace images (optional, max 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setEditFiles(Array.from(e.target.files || []).slice(0, 5))
                  }
                  className="text-sm w-full"
                />
                {editFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {editFiles.length} new file(s) — saving replaces existing photos.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50"
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
