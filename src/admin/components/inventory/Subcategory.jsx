// src/admin/components/Subcategories/Subcategories.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZoomIn, X, Search, Plus, ArrowLeft, Edit } from "lucide-react";
import {
  getSubcategoriesByCategory,
  toggleSubcategoryActiveStatus,
  toggleSubcategoryNavbarStatus,
} from "../../apis/subcategoryapis";

export default function Subcategories() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (!categoryId) {
      setError("Category ID is missing from URL");
      setLoading(false);
      return;
    }
    fetchSubcategories(currentPage);
  }, [categoryId, currentPage, debouncedSearchTerm]);

  const fetchSubcategories = async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSubcategoriesByCategory(categoryId, page, limit, debouncedSearchTerm);
      const data = res.data?.data || res.data || {};
      const subs = data.subcategories || data.subCategories || data || [];
      const pag = data.pagination || null;

      // Ensure navbar field is properly mapped
      const formattedSubs = subs.map((sub) => ({
        ...sub,
        isNavbar: sub.isNavbar ?? sub.showInNavbar ?? false,
      }));

      setSubcategories(formattedSubs);
      setPagination(pag);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load subcategories."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const openCreate = () => {
    navigate(`/admin/inventory/subcategories/${categoryId}/create`);
  };

  const openEdit = (sub) => {
    navigate(`/admin/inventory/subcategories/${categoryId}/edit/${sub._id}`);
  };

  const toggleActive = async (id) => {
    try {
      await toggleSubcategoryActiveStatus(id);
      setSubcategories((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      alert("Failed to toggle active status");
    }
  };

  const toggleNavbar = async (id) => {
    try {
      await toggleSubcategoryNavbarStatus(id);
      setSubcategories((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isNavbar: !(s.isNavbar ?? s.showInNavbar ?? false) } : s))
      );
    } catch (err) {
      alert("Failed to toggle navbar visibility");
    }
  };


  // Render
  return (
    <div className="w-full min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Subcategories
          </h1>
        </div>
      </header>

      {/* Static Search Bar */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => navigate("/admin/inventory/categories")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm font-semibold"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search subcategories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-2 focus:ring-black/20 transition-all outline-none text-gray-900 placeholder-gray-400"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              size={20}
            />
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>New Subcategory</span>
          </button>
        </div>
      </div>

      <main className="px-4 sm:px-6 py-6 bg-gray-50/50">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Order</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Image</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Description</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Navbar</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-gray-500">
                      <div className="inline-flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                        <span>Loading subcategories...</span>
                      </div>
                    </td>
                  </tr>
                ) : subcategories.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-gray-500 italic">
                      {debouncedSearchTerm ? "No matching subcategories found..." : "No subcategories yet."}
                    </td>
                  </tr>
                ) : (
                  subcategories.map((sub, i) => (
                    <tr key={sub._id} className="group hover:bg-gray-50/70 transition-colors duration-150">
                      <td className="px-4 py-4 text-sm text-gray-600">{i + 1}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 hidden sm:table-cell">{sub.sortOrder || "—"}</td>
                      <td className="px-4 py-4">
                        <div 
                          className="relative group cursor-pointer h-12 w-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sub.imageUrl) {
                              setZoomedImage({ url: sub.imageUrl, name: sub.name });
                            }
                          }}
                        >
                          {sub.imageUrl ? (
                            <>
                              <img
                                src={sub.imageUrl}
                                alt={sub.name}
                                className="h-full w-full object-cover"
                                onError={(e) => (e.target.src = "https://via.placeholder.com/48?text=?")}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                              No img
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div
                          onClick={() => navigate(`/admin/inventory/items/${categoryId}/${sub._id}`)}
                          className="text-sm font-semibold text-gray-900 cursor-pointer group-hover:text-gray-700 transition-colors underline-offset-2 hover:underline"
                        >
                          {sub.name}
                        </div>
                        <div className="text-xs text-gray-600 lg:hidden mt-1 line-clamp-2">
                          {sub.description || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 hidden lg:table-cell max-w-md">
                        <div className="line-clamp-2">{sub.description || "—"}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(sub._id);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                            sub.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {sub.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNavbar(sub._id);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                            (sub.isNavbar ?? sub.showInNavbar ?? false)
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {(sub.isNavbar ?? sub.showInNavbar ?? false) ? "Shown" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(sub);
                          }}
                          className="inline-flex items-center gap-1.5 text-gray-700 hover:text-black font-medium transition px-2 py-1.5 rounded-md hover:bg-gray-100"
                          title="Edit subcategory"
                        >
                          <Edit size={18} />
                          <span className="hidden sm:inline text-sm">Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {(pagination || subcategories.length > 0) && (
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
            {/* Showing info */}
            <div className="text-sm text-gray-700 font-medium">
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Showing <span className="font-bold">{subcategories.length}</span> of{" "}
                  <span className="font-bold">{pagination?.total || subcategories.length}</span>{" "}
                  subcategories
                </>
              )}
            </div>

            {/* Pagination controls */}
           {/* Pagination controls */}
{pagination && (
  <div className="flex items-center gap-3">
    <button
      disabled={currentPage <= 1 || loading}
      onClick={() => setCurrentPage((prev) => prev - 1)}
      className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
    >
      Previous
    </button>

    <span className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 min-w-[140px] text-center">
      Page {currentPage} of {pagination.totalPages}
    </span>

    <button
      disabled={currentPage >= pagination.totalPages || loading}
      onClick={() => setCurrentPage((prev) => prev + 1)}
      className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
    >
      Next
    </button>
  </div>
)}
          </div>
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
}
