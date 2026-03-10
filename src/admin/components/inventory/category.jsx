import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ZoomIn } from "lucide-react";
import {
  getAllCategories,
  toggleCategoryActiveStatus,
  toggleCategoryNavbarStatus,
} from "../../apis/categoryapi";
export default function Categories() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNames, setExpandedNames] = useState({});
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [fullDescription, setFullDescription] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
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
  // Fetch categories when page or debounced search term changes
  useEffect(() => {
    fetchCategories();
  }, [currentPage, debouncedSearchTerm]);
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await getAllCategories(
        currentPage,
        limit,
        debouncedSearchTerm,
      );
      const data = response?.data?.data || response?.data || {};
      const catArray =
        data.categories || response?.data?.categories || data || [];
      const formatted = catArray.map((cat, idx) => ({
        id: cat._id || `temp-${idx}`,
        name: cat.name || "",
        description: cat.description || "",
        sortOrder: cat.sortOrder ?? 0,
        image: cat.imageUrl || "https://via.placeholder.com/150",
        isActive: cat.isActive ?? true,
        isNavbar: cat.isNavbar ?? false,
      }));
      setCategories(formatted);
      // Extract pagination info from API response
      const pagination = data.pagination || {};
      const totalCount = pagination.total || data.total || 0;
      const apiTotalPages =
        pagination.totalPages || data.totalPages || data.pages;
      let calculatedTotalPages = 1;
      if (apiTotalPages) {
        calculatedTotalPages = apiTotalPages;
      } else if (totalCount > 0) {
        calculatedTotalPages = Math.ceil(totalCount / limit);
      } else if (catArray.length === limit && currentPage === 1) {
        // If we got exactly 'limit' items on page 1, assume there might be more pages
        calculatedTotalPages = 2;
      }
      setTotalPages(calculatedTotalPages);
      setError(null);
    } catch (err) {
      setError("Failed to load categories");
      console.error("Fetch categories error:", err);
    } finally {
      setLoading(false);
    }
  };
  // TOGGLE ACTIVE / NAVBAR
  const handleToggleActive = async (category) => {
    const original = { ...category };
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === category.id ? { ...cat, isActive: !cat.isActive } : cat,
      ),
    );
    try {
      await toggleCategoryActiveStatus(category.id);
    } catch (err) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === category.id
            ? { ...cat, isActive: original.isActive }
            : cat,
        ),
      );
      alert(err.response?.data?.message || "Failed to update active status");
    }
  };
  const handleToggleNavbar = async (category) => {
    const original = { ...category };
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === category.id ? { ...cat, isNavbar: !cat.isNavbar } : cat,
      ),
    );
    try {
      await toggleCategoryNavbarStatus(category.id);
    } catch (err) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === category.id
            ? { ...cat, isNavbar: original.isNavbar }
            : cat,
        ),
      );
      alert(err.response?.data?.message || "Failed to update navbar status");
    }
  };
  // EDIT - Navigate to edit page
  const handleEdit = (category) => {
    navigate(`/admin/inventory/categories/edit/${category.id}`);
  };
  const handleCategoryClick = (categoryId) => {
    navigate(`/admin/inventory/subcategories/${categoryId}`);
  };

  const toggleName = (id) => {
    setExpandedNames((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  // RENDER
  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white h-16 flex items-center border-b border-gray-200">
        <div className="px-4 sm:px-6 w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Categories
          </h1>
        </div>
      </div>
      {/* Static Search Bar */}
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-4 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
          </div>
          <button
            onClick={() => navigate("/admin/inventory/categories/create")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-white shadow-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 w-full sm:w-auto whitespace-nowrap flex-shrink-0"
          >
            <span className="text-lg">+</span>
            <span className="hidden sm:inline">Add Category</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        {/* Table - Mobile Card View / Desktop Table View */}
        <div className="overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block w-full">
            <div className="w-full overflow-hidden">
              <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      #
                    </th>
                    <th className="w-20 px-2 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Image
                    </th>
                    <th className="w-32 px-3 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="hidden lg:table-cell w-48 px-4 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Description
                    </th>
                    <th className="hidden md:table-cell w-24 px-3 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Order
                    </th>
                    <th className="w-28 px-3 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="hidden xl:table-cell w-28 px-3 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-600">
                      Navbar
                    </th>
                    <th className="w-24 px-3 py-3 lg:py-4 text-right text-xs lg:text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        Loading categories...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        {debouncedSearchTerm
                          ? "No categories match your search"
                          : "No categories found"}
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat, idx) => (
                      <tr
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className="group hover:bg-gray-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-500">
                          {(currentPage - 1) * limit + idx + 1}
                        </td>
                        <td className="px-2 py-3 lg:py-4">
                          <div
                            className="relative group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({
                                url: cat.image,
                                name: cat.name,
                              });
                            }}
                          >
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg object-cover ring-1 ring-gray-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all duration-200 pointer-events-none"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none">
                              <ZoomIn className="h-3 w-3 lg:h-4 lg:w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 lg:py-4 text-xs lg:text-sm font-medium text-gray-900">
                          <div>
                            <span
                              className={`${
                                expandedNames[cat.id] ? "" : "line-clamp-1"
                              }`}
                            >
                              {cat.name}
                            </span>

                            {cat.name && cat.name.length > 20 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleName(cat.id);
                                }}
                                className="ml-1 text-xs text-blue-600 hover:underline"
                              >
                                {expandedNames[cat.id]
                                  ? "See less"
                                  : "See more"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 lg:py-4 text-xs lg:text-sm text-gray-600">
                          <div
                            className="line-clamp-2 cursor-pointer hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cat.description) {
                                setFullDescription(cat.description);
                              }
                            }}
                          >
                            {cat.description || "—"}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3 lg:py-4 text-xs lg:text-sm font-medium text-gray-800">
                          {cat.sortOrder}
                        </td>
                        <td className="px-3 py-3 lg:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(cat);
                            }}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                              cat.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="hidden xl:table-cell px-3 py-3 lg:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleNavbar(cat);
                            }}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                              cat.isNavbar
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {cat.isNavbar ? "Shown" : "Hidden"}
                          </button>
                        </td>
                        <td className="px-3 py-3 lg:py-4 text-right text-xs lg:text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(cat);
                            }}
                            className="font-medium text-black hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100 whitespace-nowrap"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {loading ? (
              <div className="px-4 py-12 text-center text-gray-500 text-sm">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 text-sm">
                {debouncedSearchTerm
                  ? "No categories match your search"
                  : "No categories found"}
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="relative flex-shrink-0 group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage({ url: cat.image, name: cat.name });
                      }}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all duration-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">
                          {cat.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(cat);
                          }}
                          className="text-xs font-medium text-black hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(cat);
                          }}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            cat.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Inactive"}
                        </button>
                        <span className="text-xs text-gray-500">
                          Order: {cat.sortOrder}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleNavbar(cat);
                          }}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            cat.isNavbar
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cat.isNavbar ? "Navbar" : "Hidden"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Pagination */}
        {categories.length > 0 && totalPages > 0 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage((prev) => prev - 1);
                }
              }}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage((prev) => prev + 1);
                }
              }}
              disabled={currentPage >= totalPages}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
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
              style={{ maxWidth: "95vw", maxHeight: "90vh" }}
            />
          </div>
          {/* Image Name */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
            <p className="text-base font-medium">{zoomedImage.name}</p>
          </div>
        </div>
      )}
      {fullDescription && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFullDescription(null)}
        >
          <div
            className="bg-white max-w-lg w-full rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Category Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {fullDescription}
            </p>
            <div className="mt-6 text-right">
              <button
                onClick={() => setFullDescription(null)}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
