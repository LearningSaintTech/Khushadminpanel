import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Edit, Plus, ZoomIn, X, Eye, ChevronDown } from "lucide-react";
import { searchItems, getAllItems } from "../../apis/itemapi";
import { getAllCategories } from "../../apis/categoryapi";
import { getAllSubcategories, getSubcategoriesByCategory } from "../../apis/subcategoryapis";

const ShowItems = () => {
  const navigate = useNavigate();
  const categoryDropdownRef = useRef(null);
  const subcategoryDropdownRef = useRef(null);

  // State
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [limit] = useState(10);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Category dropdown states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [debouncedCategorySearchTerm, setDebouncedCategorySearchTerm] = useState("");
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryPagination, setCategoryPagination] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryLimit] = useState(10);

  // Subcategory dropdown states
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  const [subcategorySearchTerm, setSubcategorySearchTerm] = useState("");
  const [debouncedSubcategorySearchTerm, setDebouncedSubcategorySearchTerm] = useState("");
  const [subcategoryCurrentPage, setSubcategoryCurrentPage] = useState(1);
  const [subcategoryPagination, setSubcategoryPagination] = useState(null);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [subcategoryLimit] = useState(10);

  // Debounce category search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearchTerm(categorySearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [categorySearchTerm]);

  // Debounce subcategory search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSubcategorySearchTerm(subcategorySearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [subcategorySearchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (debouncedCategorySearchTerm !== categorySearchTerm) {
      setCategoryCurrentPage(1);
    }
  }, [debouncedCategorySearchTerm]);

  useEffect(() => {
    if (debouncedSubcategorySearchTerm !== subcategorySearchTerm) {
      setSubcategoryCurrentPage(1);
    }
  }, [debouncedSubcategorySearchTerm]);

  // Fetch categories with pagination and search
  useEffect(() => {
    fetchCategories(categoryCurrentPage);
  }, [categoryCurrentPage, debouncedCategorySearchTerm]);

  // Fetch all items on mount
  useEffect(() => {
    fetchItems(1);
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    setSelectedSubcategoryId(""); // Reset subcategory when category changes
    setSubcategoryCurrentPage(1);
    setSubcategorySearchTerm("");
    setDebouncedSubcategorySearchTerm("");
    if (selectedCategoryId) {
      // Fetch subcategories for the selected category
      fetchSubcategoriesByCategory(1);
    } else {
      // If no category selected, fetch all subcategories
      fetchAllSubcategories(1);
    }
  }, [selectedCategoryId]);

  // Fetch subcategories with pagination and search
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubcategoriesByCategory(subcategoryCurrentPage);
    } else {
      fetchAllSubcategories(subcategoryCurrentPage);
    }
  }, [subcategoryCurrentPage, debouncedSubcategorySearchTerm]);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch items when filters or search change
  useEffect(() => {
    setCurrentPage(1);
    fetchItems(1);
  }, [selectedCategoryId, selectedSubcategoryId, debouncedSearchTerm]);

  // Re-fetch items when page changes (but not on initial mount)
  useEffect(() => {
    if (currentPage > 1) {
      fetchItems(currentPage);
    }
  }, [currentPage]);

  // Fetch categories with pagination and search
  const fetchCategories = async (page = 1) => {
    try {
      setLoadingCategories(true);
      const res = await getAllCategories(page, categoryLimit, debouncedCategorySearchTerm);
      const data = res?.data?.data || res?.data || {};
      const categoryList = data.categories || data || [];
      const pag = data.pagination || null;

      if (page === 1 || debouncedCategorySearchTerm) {
        setAllCategories(categoryList);
      } else {
        setAllCategories((prev) => [...prev, ...categoryList]);
      }

      if (pag) {
        const totalPages = pag.pages || pag.totalPages || (pag.total ? Math.ceil(pag.total / categoryLimit) : 1);
        setCategoryPagination({
          ...pag,
          pages: totalPages,
          total: pag.total || categoryList.length,
        });
      } else {
        const total = categoryList.length;
        setCategoryPagination({
          pages: Math.ceil(total / categoryLimit) || 1,
          total: total,
          currentPage: page,
        });
      }
    } catch (err) {
      console.error("Failed to load categories", err);
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch all subcategories with pagination and search
  const fetchAllSubcategories = async (page = 1) => {
    try {
      setLoadingSubcategories(true);
      const res = await getAllSubcategories(page, subcategoryLimit, debouncedSubcategorySearchTerm);
      const data = res?.data?.data || res?.data || {};
      const subList = data.subcategories || data.subCategories || data || [];
      const pag = data.pagination || null;

      if (page === 1 || debouncedSubcategorySearchTerm) {
        setAllSubcategories(subList);
      } else {
        setAllSubcategories((prev) => [...prev, ...subList]);
      }

      if (pag) {
        const totalPages = pag.pages || pag.totalPages || (pag.total ? Math.ceil(pag.total / subcategoryLimit) : 1);
        setSubcategoryPagination({
          ...pag,
          pages: totalPages,
          total: pag.total || subList.length,
        });
      } else {
        const total = subList.length;
        setSubcategoryPagination({
          pages: Math.ceil(total / subcategoryLimit) || 1,
          total: total,
          currentPage: page,
        });
      }
    } catch (err) {
      console.error("Failed to load subcategories", err);
      setError("Failed to load subcategories");
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Fetch subcategories by category with pagination and search
  const fetchSubcategoriesByCategory = async (page = 1) => {
    if (!selectedCategoryId) return;
    try {
      setLoadingSubcategories(true);
      const res = await getSubcategoriesByCategory(
        selectedCategoryId,
        page,
        subcategoryLimit,
        debouncedSubcategorySearchTerm
      );
      const data = res?.data?.data || res?.data || {};
      const subList = data.subcategories || data.subCategories || data || [];
      const pag = data.pagination || null;

      if (page === 1 || debouncedSubcategorySearchTerm) {
        setAllSubcategories(subList);
      } else {
        setAllSubcategories((prev) => [...prev, ...subList]);
      }

      if (pag) {
        const totalPages = pag.pages || pag.totalPages || (pag.total ? Math.ceil(pag.total / subcategoryLimit) : 1);
        setSubcategoryPagination({
          ...pag,
          pages: totalPages,
          total: pag.total || subList.length,
        });
      } else {
        const total = subList.length;
        setSubcategoryPagination({
          pages: Math.ceil(total / subcategoryLimit) || 1,
          total: total,
          currentPage: page,
        });
      }
    } catch (err) {
      console.error("Failed to load subcategories", err);
      setError("Failed to load subcategories");
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Fetch items with filters - using getAllItems API
  const fetchItems = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Use getAllItems API (similar to getAllCategories pattern)
      const res = await getAllItems(
        page,
        limit,
        debouncedSearchTerm || "",
        selectedCategoryId || "",
        selectedSubcategoryId || ""
      );
      
      const data = res?.data?.data || res?.data || res || {};
      const itemsList = data.items || data?.items || data || [];
      const pag = data.pagination || null;

      setItems(Array.isArray(itemsList) ? itemsList : []);
      setPagination(pag);
    } catch (err) {
      console.error("Failed to load items", err);
      // Fallback to searchItems API if getAllItems doesn't exist
      try {
        const queryParams = {
          page,
          limit,
        };
        if (selectedCategoryId) queryParams.categoryId = selectedCategoryId;
        if (selectedSubcategoryId) queryParams.subcategoryId = selectedSubcategoryId;
        if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
          queryParams.search = debouncedSearchTerm.trim();
        }
        
        const res = await searchItems(queryParams);
        const data = res?.data?.data || res?.data || res || {};
        const itemsList = data.items || data?.items || data || [];
        const pag = data.pagination || null;

        setItems(Array.isArray(itemsList) ? itemsList : []);
        setPagination(pag);
      } catch (fallbackErr) {
        console.error("Fallback API also failed:", fallbackErr);
        setError(err?.response?.data?.message || err?.message || "Failed to load items");
        setItems([]);
        setPagination(null);
      }
    } finally {
      setLoading(false);
    }
  };


  // Get displayed categories based on search and pagination
  const getDisplayedCategories = () => {
    if (debouncedCategorySearchTerm.trim()) {
      return allCategories;
    }
    const startIndex = (categoryCurrentPage - 1) * categoryLimit;
    const endIndex = startIndex + categoryLimit;
    return allCategories.slice(startIndex, endIndex);
  };

  // Get displayed subcategories based on search and pagination
  const getDisplayedSubcategories = () => {
    if (debouncedSubcategorySearchTerm.trim()) {
      return allSubcategories;
    }
    const startIndex = (subcategoryCurrentPage - 1) * subcategoryLimit;
    const endIndex = startIndex + subcategoryLimit;
    return allSubcategories.slice(startIndex, endIndex);
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return "All Categories";
    const selected = allCategories.find((cat) => cat._id === selectedCategoryId);
    return selected?.name || selected?.title || "Unknown Category";
  };

  const getSelectedSubcategoryName = () => {
    if (!selectedSubcategoryId) return selectedCategoryId ? "Select Subcategory" : "Select Category First";
    const selected = allSubcategories.find((sub) => sub._id === selectedSubcategoryId);
    return selected?.name || selected?.title || "Unknown Subcategory";
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategoryId(catId);
    setIsCategoryDropdownOpen(false);
    setCategorySearchTerm("");
    setDebouncedCategorySearchTerm("");
    setCategoryCurrentPage(1);
    setSelectedSubcategoryId("");
    setAllSubcategories([]);
  };

  const handleSubcategorySelect = (subId) => {
    setSelectedSubcategoryId(subId);
    setIsSubcategoryDropdownOpen(false);
    setSubcategorySearchTerm("");
    setDebouncedSubcategorySearchTerm("");
    setSubcategoryCurrentPage(1);
  };

  const categoryTotalPages = categoryPagination?.pages || 
    (categoryPagination?.total ? Math.ceil(categoryPagination.total / categoryLimit) : 1) || 1;

  const subcategoryTotalPages = subcategoryPagination?.pages || 
    (subcategoryPagination?.total ? Math.ceil(subcategoryPagination.total / subcategoryLimit) : 1) || 1;

  // Use items directly from API (search is handled by API)
  const filteredItems = items;

  // Navigation handlers
  const openEdit = (item) => {
    const categoryId = item.categoryId || selectedCategoryId;
    const subcategoryId = item.subcategoryId || selectedSubcategoryId;
    
    if (categoryId && subcategoryId) {
      navigate(`/admin/inventory/items/${categoryId}/${subcategoryId}/edit/${item._id || item.productId}`);
    } else {
      // Fallback: navigate to item details if category/subcategory not available
      navigate(`/admin/inventory/items/${item._id || item.productId}`);
    }
  };

  const openDetails = (item) => {
    navigate(`/admin/inventory/items/${item._id || item.productId}`);
  };

  const openCreate = () => {
    if (selectedCategoryId && selectedSubcategoryId) {
      navigate(`/admin/inventory/items/${selectedCategoryId}/${selectedSubcategoryId}/create`);
    } else {
      alert("Please select both category and subcategory to create a new item");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">All Items</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  disabled={loadingCategories}
                  className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-2 focus:ring-black/20 transition-all outline-none text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span className="truncate">
                    {loadingCategories ? "Loading..." : getSelectedCategoryName()}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform flex-shrink-0 ml-2 ${
                      isCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-96 flex flex-col">
                    <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearchTerm}
                          onChange={(e) => {
                            setCategorySearchTerm(e.target.value);
                            setCategoryCurrentPage(1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 min-h-0">
                      {loadingCategories && allCategories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Loading categories...
                        </div>
                      ) : getDisplayedCategories().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {categorySearchTerm
                            ? "No categories found matching your search"
                            : "No categories available"}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCategorySelect("")}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                              selectedCategoryId === ""
                                ? "bg-gray-100 font-semibold text-black"
                                : "text-gray-700"
                            }`}
                          >
                            All Categories
                          </button>
                          {getDisplayedCategories().map((cat) => (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => handleCategorySelect(cat._id)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 ${
                                selectedCategoryId === cat._id
                                  ? "bg-gray-100 font-semibold text-black"
                                  : "text-gray-700"
                              }`}
                            >
                              {cat.name || cat.title || "Unnamed Category"}
                            </button>
                          ))}

                          {!debouncedCategorySearchTerm &&
                            categoryPagination &&
                            categoryCurrentPage < categoryTotalPages && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryCurrentPage((prev) => prev + 1);
                                }}
                                disabled={loadingCategories}
                                className="w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingCategories ? "Loading..." : "Load More..."}
                              </button>
                            )}
                        </>
                      )}
                    </div>

                    {getDisplayedCategories().length > 0 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {debouncedCategorySearchTerm
                              ? `Found ${getDisplayedCategories().length} result${getDisplayedCategories().length !== 1 ? "s" : ""}`
                              : categoryPagination
                              ? `Page ${categoryCurrentPage} of ${categoryTotalPages} (${allCategories.length} total)`
                              : `Showing ${getDisplayedCategories().length} categories`}
                          </span>
                          {!debouncedCategorySearchTerm && categoryPagination && categoryTotalPages > 1 && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (categoryCurrentPage > 1) {
                                    setCategoryCurrentPage(categoryCurrentPage - 1);
                                  }
                                }}
                                disabled={categoryCurrentPage === 1 || loadingCategories}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (categoryCurrentPage < categoryTotalPages) {
                                    setCategoryCurrentPage(categoryCurrentPage + 1);
                                  }
                                }}
                                disabled={categoryCurrentPage >= categoryTotalPages || loadingCategories}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subcategory Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subcategory
              </label>
              <div className="relative" ref={subcategoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCategoryId) {
                      alert("Please select a category first");
                      return;
                    }
                    setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen);
                  }}
                  disabled={!selectedCategoryId || loadingSubcategories}
                  className="w-full px-4 py-2.5 text-sm bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-2 focus:ring-black/20 transition-all outline-none text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span className="truncate">
                    {loadingSubcategories
                      ? "Loading..."
                      : !selectedCategoryId
                      ? "Select category first"
                      : getSelectedSubcategoryName()}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform flex-shrink-0 ml-2 ${
                      isSubcategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSubcategoryDropdownOpen && selectedCategoryId && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-96 flex flex-col">
                    <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Search subcategories..."
                          value={subcategorySearchTerm}
                          onChange={(e) => {
                            setSubcategorySearchTerm(e.target.value);
                            setSubcategoryCurrentPage(1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 min-h-0">
                      {loadingSubcategories && allSubcategories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Loading subcategories...
                        </div>
                      ) : getDisplayedSubcategories().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {subcategorySearchTerm
                            ? "No subcategories found matching your search"
                            : "No subcategories available"}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSubcategorySelect("")}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                              selectedSubcategoryId === ""
                                ? "bg-gray-100 font-semibold text-black"
                                : "text-gray-700"
                            }`}
                          >
                            All Subcategories
                          </button>
                          {getDisplayedSubcategories().map((sub) => (
                            <button
                              key={sub._id}
                              type="button"
                              onClick={() => handleSubcategorySelect(sub._id)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 ${
                                selectedSubcategoryId === sub._id
                                  ? "bg-gray-100 font-semibold text-black"
                                  : "text-gray-700"
                              }`}
                            >
                              {sub.name || sub.title || "Unnamed Subcategory"}
                            </button>
                          ))}

                          {!debouncedSubcategorySearchTerm &&
                            subcategoryPagination &&
                            subcategoryCurrentPage < subcategoryTotalPages && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubcategoryCurrentPage((prev) => prev + 1);
                                }}
                                disabled={loadingSubcategories}
                                className="w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingSubcategories ? "Loading..." : "Load More..."}
                              </button>
                            )}
                        </>
                      )}
                    </div>

                    {getDisplayedSubcategories().length > 0 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {debouncedSubcategorySearchTerm
                              ? `Found ${getDisplayedSubcategories().length} result${getDisplayedSubcategories().length !== 1 ? "s" : ""}`
                              : subcategoryPagination
                              ? `Page ${subcategoryCurrentPage} of ${subcategoryTotalPages} (${allSubcategories.length} total)`
                              : `Showing ${getDisplayedSubcategories().length} subcategories`}
                          </span>
                          {!debouncedSubcategorySearchTerm && subcategoryPagination && subcategoryTotalPages > 1 && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (subcategoryCurrentPage > 1) {
                                    setSubcategoryCurrentPage(subcategoryCurrentPage - 1);
                                  }
                                }}
                                disabled={subcategoryCurrentPage === 1 || loadingSubcategories}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (subcategoryCurrentPage < subcategoryTotalPages) {
                                    setSubcategoryCurrentPage(subcategoryCurrentPage + 1);
                                  }
                                }}
                                disabled={subcategoryCurrentPage >= subcategoryTotalPages || loadingSubcategories}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full px-4 py-2.5 pl-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {pagination ? (
              <span>
                Showing {((currentPage - 1) * limit) + 1} to{" "}
                {Math.min(currentPage * limit, pagination.total || items.length)} of{" "}
                {pagination.total || items.length} items
              </span>
            ) : (
              <span>{items.length} items found</span>
            )}
          </div>
          <button
            onClick={openCreate}
            disabled={!selectedCategoryId || !selectedSubcategoryId}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={!selectedCategoryId || !selectedSubcategoryId ? "Please select both category and subcategory to add an item" : "Add new item"}
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Image</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Product ID</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Discounted</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={item._id || item.productId}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-4 text-gray-600">
                        {(currentPage - 1) * limit + index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <img
                          src={item?.thumbnail || item?.images?.[0] || "https://via.placeholder.com/50"}
                          alt={item.name}
                          onClick={() =>
                            setZoomedImage(
                              item?.thumbnail || item?.images?.[0] || "https://via.placeholder.com/50"
                            )
                          }
                          className="h-12 w-12 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition"
                        />
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {item.name || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.productId || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate" title={item.shortDescription || item.description}>
                        {item.shortDescription || item.description || "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        ₹{item.price || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.discountedPrice ? (
                          <span className="text-green-600 font-semibold">
                            ₹{item.discountedPrice}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.isActive ? (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetails(item)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-5 py-2 border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Previous
            </button>
            <span className="text-gray-700">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-5 py-2 border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoomed"
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowItems;
