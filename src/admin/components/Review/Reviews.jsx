// src/components/Review.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getItemsWithSkus, getReviews, deleteReview, updateReview } from "../../apis/Reviewapi";
import { Star, ChevronLeft, ChevronRight, Search, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 10;

export default function Review() {
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState({});
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  console.log("🔄 Component Rendered | Current State:", {
    itemsCount: items.length,
    totalItems,
    currentPage,
    searchTerm,
    debouncedSearch,
    loadingItems,
    reviewsCount: Object.keys(reviews).length,
  });

  // ====================== FETCH ITEMS ======================
  const fetchItems = useCallback(async (page = 1, search = "") => {
    console.log(`📡 Fetching Items - Page: ${page}, Search: "${search}"`);

    try {
      setLoadingItems(true);
      setError(null);

      const res = await getItemsWithSkus(page, ITEMS_PER_PAGE, search);
      console.log("✅ Items API Response:", res?.data);

      if (res?.data?.items) {
        setItems(res.data.items);
        setTotalItems(res.data.total || res.data.items.length);
        console.log(`✅ Items updated | Count: ${res.data.items.length}, Total: ${res.data.total || res.data.items.length}`);
      }
    } catch (err) {
      console.error("❌ Failed to fetch items:", err);
      setError("Failed to fetch items");
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // ====================== FETCH REVIEWS ======================
  const fetchReviews = useCallback(async (itemId) => {
    if (!itemId) {
      console.warn("⚠️ fetchReviews called without itemId");
      return;
    }

    console.log(`📡 Fetching Reviews for itemId: ${itemId}`);

    setLoadingReviews((prev) => ({ ...prev, [itemId]: true }));

    try {
      const res = await getReviews(itemId);
      console.log(`✅ Reviews API Response for ${itemId}:`, res?.data);

      if (res?.data?.reviews) {
        setReviews((prev) => ({ ...prev, [itemId]: res.data.reviews }));
        console.log(`✅ Reviews stored for ${itemId} | Count: ${res.data.reviews.length}`);
      }
    } catch (err) {
      console.error(`❌ Error fetching reviews for ${itemId}:`, err);
    } finally {
      setLoadingReviews((prev) => ({ ...prev, [itemId]: false }));
    }
  }, []);

  // ====================== DEBOUNCE SEARCH ======================
  useEffect(() => {
    console.log(`⌨️ Search term changed: "${searchTerm}"`);

    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
      console.log(`⏳ Debounced search updated to: "${searchTerm}" | Page reset to 1`);
    }, 400);

    return () => {
      clearTimeout(timer);
      console.log("🧹 Debounce timer cleared");
    };
  }, [searchTerm]);

  // ====================== FETCH ITEMS ON PAGE/SEARCH CHANGE ======================
  useEffect(() => {
    console.log(`🔄 useEffect triggered: Fetching items | Page: ${currentPage}, Search: "${debouncedSearch}"`);
    fetchItems(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchItems]);

  // ====================== FETCH REVIEWS FOR NEW ITEMS ======================
  useEffect(() => {
    console.log(`🧩 Items updated - Checking which reviews to fetch | Items count: ${items.length}`);

    items.forEach((item) => {
      if (!reviews[item._id] && !loadingReviews[item._id]) {
        console.log(`📥 Triggering review fetch for new item: ${item._id} - ${item.name}`);
        fetchReviews(item._id);
      } else {
        console.log(`⏭️ Skipping review fetch for ${item._id} (already loaded or loading)`);
      }
    });
  }, [items, fetchReviews]); // Note: reviews & loadingReviews intentionally omitted to avoid loops

  // ====================== RENDER STARS ======================
  const renderStars = (rating) => {
    console.log(`⭐ Rendering stars for rating: ${rating}`);
    return [...Array(5)].map((_, i) => (
      <Star
        key={`star-${rating}-${i}`}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ));
  };

  // ====================== HANDLERS ======================
  const handleDelete = async (reviewId, itemId) => {
    console.log(`🗑️ Delete requested - Review: ${reviewId}, Item: ${itemId}`);

    if (!window.confirm("Are you sure you want to delete this review?")) {
      console.log("❌ Delete cancelled by user");
      return;
    }

    try {
      await deleteReview(reviewId);
      console.log("✅ Review deleted successfully on backend");
      toast.success("Review deleted successfully");
      fetchReviews(itemId);
    } catch (err) {
      console.error("❌ Failed to delete review:", err);
      toast.error("Failed to delete review");
    }
  };

  const handleEdit = async (review, itemId) => {
    console.log(`✏️ Edit requested for review: ${review._id}`);

    const newComment = prompt("Edit comment:", review.comment);
    const newRating = prompt("Edit rating (1-5):", review.rating);

    if (newComment === null || newRating === null) {
      console.log("❌ Edit cancelled by user");
      return;
    }

    const ratingNum = Number(newRating);

    if (!newComment.trim() || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      console.warn("⚠️ Invalid input provided");
      toast.error("Invalid comment or rating");
      return;
    }

    try {
      console.log(`📤 Updating review ${review._id} with:`, { comment: newComment.trim(), rating: ratingNum });
      await updateReview(review._id, { comment: newComment.trim(), rating: ratingNum });
      console.log("✅ Review updated successfully");
      toast.success("Review updated successfully");
      fetchReviews(itemId);
    } catch (err) {
      console.error("❌ Failed to update review:", err);
      toast.error("Failed to update review");
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  console.log(`📄 Total Pages calculated: ${totalPages}`);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Item Reviews</h1>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search items by name or SKU..."
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => {
            console.log(`🔍 Search input changed: ${e.target.value}`);
            setSearchTerm(e.target.value);
          }}
        />
      </div>

      {/* Loading / Error / Empty States */}
      {loadingItems ? (
        <p className="text-center text-gray-500 py-10">Loading items...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-10">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No items found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              console.log(`🎨 Rendering item card: ${item._id} - ${item.name}`);
              return (
                <div key={item._id} className="bg-white shadow-md rounded-xl p-5">
                  <h2 className="font-semibold text-lg mb-1">{item.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{item.sku}</p>

                  {loadingReviews[item._id] ? (
                    <p className="text-gray-500 text-sm py-4">Loading reviews...</p>
                  ) : reviews[item._id]?.length > 0 ? (
                    reviews[item._id].map((review) => (
                      <div
                        key={review._id}
                        className="border-t pt-3 mt-3 border-gray-200 first:border-t-0 first:mt-0 first:pt-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-600 font-medium">
                              {review.user || "Anonymous"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(review, item._id)}
                              className="p-1 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(review._id, item._id)}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {review.comment}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm py-4">No reviews yet.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-12 gap-4">
              <button
                onClick={() => {
                  console.log(`⬅️ Prev clicked | Current page: ${currentPage}`);
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                }}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => {
                  console.log(`➡️ Next clicked | Current page: ${currentPage}`);
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                }}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}