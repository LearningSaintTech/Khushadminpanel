// src/admin/pages/Banner.jsx
import React, { useEffect, useState } from "react";
import { getAllBanners, deleteBanner } from "../../apis/homebannerapi";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, ZoomIn, X } from "lucide-react";

const Banner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomedImage, setZoomedImage] = useState(null);
  const navigate = useNavigate();

  const fetchBanners = async (pageNum = 1) => {
  setLoading(true);
  try {
    const response = await getAllBanners({ page: pageNum, limit });

    console.log("Banners fetched:", response);

    const bannerArray = response?.data?.banners || [];
    const pagination = response?.data?.pagination || {};

    setBanners(bannerArray);
    setTotalPages(pagination.totalPages || 1);

  } catch (error) {
    console.error("Failed to fetch banners:", error);
    alert(error.message || "Something went wrong");
  }
  setLoading(false);
};

  useEffect(() => {
    fetchBanners(page);
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner permanently?")) return;

    try {
      await deleteBanner(id);
      alert("Banner deleted successfully");
      fetchBanners(page);
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error.message || "Failed to delete banner");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Banners
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your homepage banners
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/banner-form")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={18} />
              <span>Add New Banner</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-full overflow-x-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="inline-flex items-center gap-3 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span>Loading banners...</span>
            </div>
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">No banners found</p>
            <p className="text-sm text-gray-500 mb-6">Create your first banner to get started</p>
            <button
              onClick={() => navigate("/admin/banner-form")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={18} />
              <span>Create Banner</span>
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="w-full">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-8">#</th>
                      <th className="px-1.5 sm:px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-16 sm:w-20">Desktop</th>
                      <th className="px-1.5 sm:px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell w-16 sm:w-20">Mobile</th>
                      <th className="px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                      <th className="hidden lg:table-cell px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Description</th>
                      <th className="hidden xl:table-cell px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">Type</th>
                      <th className="hidden xl:table-cell px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">Discount</th>
                      <th className="hidden 2xl:table-cell px-2 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Navigate</th>
                      <th className="px-2 py-2.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 sm:w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {banners.map((banner, idx) => {
                      const desktopUrl = banner.desktopBanner?.url || null;
                      const mobileUrl = banner.mobileBanner?.url || null;
                      return (
                        <tr
                          key={banner._id}
                          className="group hover:bg-gray-50/70 transition-colors duration-150"
                        >
                          <td className="px-2 py-2.5 text-xs text-gray-600">
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td className="px-1.5 sm:px-2 py-2.5">
                            {desktopUrl ? (
                              <div
                                className="relative group cursor-pointer h-10 w-14 sm:h-12 sm:w-16 rounded overflow-hidden bg-gray-100 border border-gray-200 shadow-sm hover:ring-1 hover:ring-indigo-500 transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({ url: desktopUrl, name: `${banner.title} - Desktop` });
                                }}
                              >
                                <img
                                  src={desktopUrl}
                                  alt={`${banner.title} - Desktop`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => (e.target.src = "https://via.placeholder.com/56?text=D")}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded transition-all duration-200 opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="h-2.5 w-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-10 w-14 sm:h-12 sm:w-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-[7px] sm:text-[8px] text-gray-400">No</span>
                              </div>
                            )}
                          </td>
                          <td className="px-1.5 sm:px-2 py-2.5 hidden md:table-cell">
                            {mobileUrl ? (
                              <div
                                className="relative group cursor-pointer h-10 w-14 sm:h-12 sm:w-16 rounded overflow-hidden bg-gray-100 border border-gray-200 shadow-sm hover:ring-1 hover:ring-indigo-500 transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({ url: mobileUrl, name: `${banner.title} - Mobile` });
                                }}
                              >
                                <img
                                  src={mobileUrl}
                                  alt={`${banner.title} - Mobile`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => (e.target.src = "https://via.placeholder.com/56?text=M")}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded transition-all duration-200 opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="h-2.5 w-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-10 w-14 sm:h-12 sm:w-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-[7px] sm:text-[8px] text-gray-400">No</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[150px] sm:max-w-none" title={banner.title || ""}>
                              {banner.title || "—"}
                            </div>
                            {/* Show mobile image on small screens */}
                            <div className="md:hidden mt-1.5">
                              {mobileUrl ? (
                                <div
                                  className="relative group cursor-pointer h-8 w-12 rounded overflow-hidden bg-gray-100 border border-gray-200 shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomedImage({ url: mobileUrl, name: `${banner.title} - Mobile` });
                                  }}
                                >
                                  <img
                                    src={mobileUrl}
                                    alt={`${banner.title} - Mobile`}
                                    className="h-full w-full object-cover"
                                    onError={(e) => (e.target.src = "https://via.placeholder.com/48?text=M")}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="h-2 w-2 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-8 w-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <span className="text-[6px] text-gray-400">No M</span>
                                </div>
                              )}
                            </div>
                            {/* Show type and discount on mobile */}
                            <div className="xl:hidden mt-1 flex flex-wrap gap-1">
                              {banner.type && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                                  {banner.type}
                                </span>
                              )}
                              {banner.discount && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-800">
                                  {banner.discount}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-2 py-2.5 text-xs text-gray-600">
                            <div className="line-clamp-2 truncate max-w-[200px]" title={banner.text || ""}>
                              {banner.text || "—"}
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-2 py-2.5 text-xs text-gray-600">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 truncate max-w-full">
                              {banner.type || "—"}
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-2 py-2.5 text-xs text-gray-600">
                            {banner.discount ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                {banner.discount}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="hidden 2xl:table-cell px-2 py-2.5 text-xs text-gray-600">
                            <div className="truncate max-w-[100px]" title={banner.navigation?.navigate || ""}>
                              {banner.navigation?.navigate || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/banner-form/${banner._id}`);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-1 text-xs font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded transition-all"
                                title="Edit banner"
                              >
                                <Edit size={12} className="sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline text-[10px]">Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(banner._id);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                title="Delete banner"
                              >
                                <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline text-[10px]">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {banners.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                <div className="text-sm text-gray-700 font-medium">
                  Showing <span className="font-bold">{banners.length}</span> of{" "}
                  <span className="font-bold">{totalPages * limit}</span> banners
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                  >
                    Previous
                  </button>

                  <span className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 min-w-[140px] text-center">
                    Page {page} of {totalPages || 1}
                  </span>

                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                    className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Close zoom"
          >
            <X size={28} />
          </button>

          {/* Zoomed Image Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '95vw', maxHeight: '90vh' }}
            />
          </div>

          {/* Image Name */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
            <p className="text-base font-medium">{zoomedImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banner;