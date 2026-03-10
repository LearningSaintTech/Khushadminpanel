// src/components/Review.jsx
import React, { useEffect, useState } from "react";
import { getItemsWithSkus, getReviews } from "../../apis/Reviewapi";
import { Star, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function Review() {
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState({});
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // ===============================
  // 🔹 Fetch Items with pagination & search
  // ===============================
  const fetchItems = async (page = 1) => {
    try {
      console.log("Fetching items...", { page, searchTerm });
      setLoadingItems(true);

      const res = await getItemsWithSkus(page, ITEMS_PER_PAGE);
      console.log("Items response:", res);

      if (res?.data?.items) {
        setItems(res.data.items);
        setTotalItems(res.data.total || res.data.items.length); // fallback if total not returned
        console.log("Items set in state:", res.data.items);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      setError("Failed to fetch items");
    } finally {
      setLoadingItems(false);
    }
  };

  // ===============================
  // 🔹 Fetch Reviews for a specific item
  // ===============================
  const fetchReviews = async (itemId) => {
    if (!itemId) return console.warn("Item ID missing for fetching reviews!");
    try {
      console.log(`Fetching reviews for itemId: ${itemId}...`);
      setLoadingReviews((prev) => ({ ...prev, [itemId]: true }));

      const res = await getReviews(itemId);
      console.log(`Reviews response for ${itemId}:`, res);

      if (res?.data?.reviews) {
        setReviews((prev) => ({ ...prev, [itemId]: res.data.reviews }));
        console.log(`Reviews set for itemId ${itemId}:`, res.data.reviews);
      }
    } catch (err) {
      console.error(`Error fetching reviews for ${itemId}:`, err);
    } finally {
      setLoadingReviews((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // ===============================
  // 🔹 Fetch items when component mounts or page changes
  // ===============================
  useEffect(() => {
    fetchItems(currentPage);
  }, [currentPage]);

  // ===============================
  // 🔹 Fetch reviews for visible items
  // ===============================
  useEffect(() => {
    if (items.length > 0) {
      items.forEach((item) => fetchReviews(item._id));
    }
  }, [items]);

  // ===============================
  // 🔹 Filtered items by search term
  // ===============================
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===============================
  // 🔹 Render Stars
  // ===============================
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  // ===============================
  // 🔹 Pagination controls
  // ===============================
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Item Reviews</h1>

      {/* Search Bar */}
      <div className="mb-4 flex items-center space-x-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search items by name or SKU..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loadingItems ? (
        <p>Loading items...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : filteredItems.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition"
              >
                <h2 className="font-semibold text-lg">{item.name}</h2>
                <p className="text-sm text-gray-500 mb-2">{item.sku}</p>

                {loadingReviews[item._id] ? (
                  <p>Loading reviews...</p>
                ) : reviews[item._id]?.length > 0 ? (
                  reviews[item._id].map((review) => (
                    <div
                      key={review._id}
                      className="border-t pt-2 mt-2 border-gray-200"
                    >
                      <div className="flex items-center mb-1">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-gray-600">
                          {review.user}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No reviews yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}