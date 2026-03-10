import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFeaturedImages, deleteFeaturedImage } from "../../apis/Bannerapi";

export default function Featured() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [expandedTitles, setExpandedTitles] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterPage, setFilterPage] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      // When filterPage is "all", pass empty string so API uses pagination
      const pageFilter = filterPage === "all" ? "" : filterPage;
      const response = await getFeaturedImages(pageFilter, currentPage, limit);

      console.log("Banner API Response:", response);
      console.log("Filter Page:", filterPage, "Current Page:", currentPage);

      // Extract data from response
      // apiConnector returns response.data from axios, so response structure is:
      // { success: true, message: "...", data: { data: [...], pagination: {...} } }
      // So response = { success: true, message: "...", data: { data: [...], pagination: {...} } }
      // And response.data = { data: [...], pagination: {...} }
      const responseData = response?.data || {};
      const imagesArray = responseData.data || [];
      const paginationData = responseData.pagination || {};

      console.log("Full Response:", response);
      console.log("Response Data:", responseData);
      console.log("Images Array:", imagesArray);
      console.log("Pagination Data:", paginationData);

      setImages(Array.isArray(imagesArray) ? imagesArray : []);
      setPagination(paginationData);

      // Set total pages from pagination
      if (paginationData.totalPages) {
        setTotalPages(paginationData.totalPages);
      } else if (paginationData.total) {
        setTotalPages(Math.ceil(paginationData.total / limit));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("[fetchImages] ERROR:", err);
      alert(
        "Failed to load featured images: " + (err?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPage]);

  useEffect(() => {
    fetchImages();
  }, [filterPage, currentPage]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this image?")) return;

    try {
      await deleteFeaturedImage(id);
      fetchImages();
    } catch (err) {
      console.error("[handleDelete] ERROR:", err);
      alert("Delete failed");
    }
  };

  const toggleTitle = (id) => {
    setExpandedTitles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  return (
    <div
      className={`
        min-h-screen  text-gray-900 pb-10
        transition-all duration-300
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Featured Images
          </h1>
          <div className="flex gap-3">
            <select
              value={filterPage}
              onChange={(e) => setFilterPage(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/30 shadow-sm min-w-[140px]"
            >
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="lock">Lock</option>
              <option value="bottom">Bottom</option>
            </select>
            <button
              onClick={() => navigate("/admin/banners/create")}
              className="bg-black text-white font-medium py-2 px-6 rounded-lg hover:bg-gray-800 transition shadow-sm"
            >
              + Add Banners
            </button>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Current Featured Images</h2>

          {loading ? (
            <div className="text-gray-600 py-12 text-center text-lg">
              Loading images...
            </div>
          ) : images.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-600">
              <p className="text-lg font-medium mb-2">
                {filterPage === "all"
                  ? "No featured images found"
                  : `No images for "${filterPage}" page`}
              </p>
              <button
                onClick={() => navigate("/admin/banners/create")}
                className="text-black hover:underline font-medium mt-2"
              >
                Create your first banner →
              </button>
            </div>
          ) : (
            <>
              <div className=" grid grid-cols-1  sm:grid-cols-2  md:grid-cols-3  lg:grid-cols-3  xl:grid-cols-4  2xl:grid-cols-5  gap-5 sm:gap-6 lg:gap-7 ">
                {images.map((item) => {
                  // Check if the URL is a video file
                  const isVideo =
                    /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(item.url) ||
                    item.url.includes("video") ||
                    item.key?.includes("video");

                  return (
                    <div
                      key={item._id}
                      className="group bg-white border border-gray-200  overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    >
                      <div className="relative">
                        {isVideo ? (
                          <video
                            src={item.url}
                            className="w-full h-48 object-cover"
                            controls={false}
                            muted
                            loop
                            playsInline
                            onError={(e) => {
                              e.target.style.display = "none";
                              const fallback = document.createElement("img");
                              fallback.src =
                                "https://via.placeholder.com/400x240?text=Video+Error";
                              fallback.className = "w-full h-48 object-cover";
                              e.target.parentNode.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt={item.heading || "featured image"}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/400x240?text=Image+Error";
                            }}
                          />
                        )}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            onClick={() =>
                              navigate(`/admin/banners/edit/${item._id}`)
                            }
                            className="bg-white/90 hover:bg-white text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 text-xs px-3 py-1 rounded-lg shadow-md opacity-90 hover:opacity-100 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 text-xs px-3 py-1 rounded-lg shadow-md opacity-90 hover:opacity-100 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-1">
                          <h3
                            className={`font-medium text-base ${
                              expandedTitles[item._id] ? "" : "line-clamp-1"
                            }`}
                          >
                            {item.heading || "No heading"}
                          </h3>

                          {item.heading && item.heading.length > 40 && (
                            <button
                              onClick={() => toggleTitle(item._id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {expandedTitles[item._id]
                                ? "Show less"
                                : "See more"}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {item.subHeading || "No subheading"}
                        </p>
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                          {item.page}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {images.length > 0 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages} ({images.length}{" "}
                    items)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1 || loading}
                      className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={loading}
                              className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
                                currentPage === pageNum
                                  ? "bg-black text-white"
                                  : "border border-gray-300 hover:bg-gray-50"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages || loading}
                      className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Next
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
