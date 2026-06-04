import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAllCategories,
} from "../../apis/categoryapi";
import {
  getSubcategoriesByCategory,
  getAllSubcategories,
  toggleSubcategoryActiveStatus,
  toggleSubcategoryNavbarStatus,
} from "../../apis/subcategoryapis";
import { ChevronDown, Edit, Plus, Search, ZoomIn, X } from "lucide-react";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  normalizeCategoryId,
  resolveSubcategoryIconUrl,
} from "../../utils/subcategoryDisplay";

const Showsubcategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const categoryDropdownRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(""); // empty = all
  const [subcategories, setSubcategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  /** All backend / API messages for this page (fetch, toggles, etc.) */
  const [listErrors, setListErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // ─── Debounce logic ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearchTerm(categorySearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [categorySearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Reset page when filters change ────────────────────────────────
  useEffect(() => {
    if (debouncedCategorySearchTerm !== categorySearchTerm) setCategoryCurrentPage(1);
  }, [debouncedCategorySearchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchSubcategories(1);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (currentPage > 0) fetchSubcategories(currentPage);
  }, [currentPage, debouncedSearchTerm]);

  // Refetch after returning from edit (list may be stale otherwise)
  useEffect(() => {
    if (!location.state?.refresh) return;
    const updated = location.state?.updatedSubcategory;
    (async () => {
      await fetchSubcategories(currentPage);
      if (updated?._id) {
        setSubcategories((prev) =>
          prev.map((s) =>
            String(s._id) === String(updated._id) ? { ...s, ...updated } : s,
          ),
        );
      }
      navigate(location.pathname, { replace: true, state: {} });
    })();
  }, [location.state?.refresh]);

  useEffect(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, [selectedCategoryId]);

  // ─── Close dropdown on outside click ───────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
        setCategorySearchTerm("");
        setDebouncedCategorySearchTerm("");
        setCategoryCurrentPage(1);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryDropdownOpen]);

  // ─── API Calls ─────────────────────────────────────────────────────
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
          total,
          currentPage: page,
        });
      }
    } catch (err) {
      console.error("Failed to load categories", err);
      setListErrors(extractBackendMessages(err));
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories(categoryCurrentPage);
  }, [categoryCurrentPage, debouncedCategorySearchTerm]);

  useEffect(() => {
    if (allCategories.length === 0) {
      setCategories([]);
      return;
    }

    if (!debouncedCategorySearchTerm.trim()) {
      const start = (categoryCurrentPage - 1) * categoryLimit;
      const end = start + categoryLimit;
      setCategories(allCategories.slice(start, end));
    } else {
      setCategories(allCategories);
    }
  }, [debouncedCategorySearchTerm, categoryCurrentPage, allCategories, categoryLimit]);

  const loadMoreCategories = () => {
    const totalPages = categoryPagination?.pages ||
      (categoryPagination?.total ? Math.ceil(categoryPagination.total / categoryLimit) : 1) ||
      1;

    if (categoryCurrentPage < totalPages) {
      setCategoryCurrentPage((prev) => prev + 1);
    }
  };

  const fetchSubcategories = async (page = 1) => {
    setLoading(true);
    setListErrors([]);

    try {
      let res;
      if (selectedCategoryId) {
        res = await getSubcategoriesByCategory(selectedCategoryId, page, limit, debouncedSearchTerm);
      } else {
        res = await getAllSubcategories(page, limit, debouncedSearchTerm);
      }

      const data = res?.data?.data || res?.data || res || {};
      const subs = data.subcategories || data.subCategories || data || [];
      const pag = data.pagination || null;

      const formattedSubs = Array.isArray(subs)
        ? subs.map((sub) => ({
            ...sub,
            isNavbar: sub.isNavbar ?? sub.showInNavbar ?? false,
            isFooter: sub.isFooter ?? sub.showInFooter ?? false,
            categoryId: normalizeCategoryId(sub),
          }))
        : [];

      console.log("[showsubcategory] fetched", formattedSubs.length, "rows");
      formattedSubs.forEach((sub, idx) => {
        console.log(`[showsubcategory] row ${idx}`, sub._id, sub.name, {
          iconUrl: sub.iconUrl,
          iconKey: sub.iconKey,
          resolvedIcon: resolveSubcategoryIconUrl(sub),
        });
      });

      setSubcategories(formattedSubs);

      if (pag) {
        setPagination(pag);
      } else {
        const total = data.total || formattedSubs.length;
        setPagination({
          pages: Math.ceil(total / limit) || 1,
          total,
          currentPage: page,
        });
      }
    } catch (err) {
      console.error("Fetch subcategories error:", err);
      setListErrors(extractBackendMessages(err));
      setSubcategories([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setIsCategoryDropdownOpen(false);
    setCategorySearchTerm("");
    setDebouncedCategorySearchTerm("");
    setCategoryCurrentPage(1);
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return "All Subcategories";
    const selected = allCategories.find((cat) => cat._id === selectedCategoryId);
    return selected?.name || selected?.title || "Unknown Category";
  };

  const openCreate = () => {
    if (!selectedCategoryId) {
      alert("Please select a category first to create a subcategory under it.");
      return;
    }
    navigate(`/admin/inventory/subcategories/${selectedCategoryId}/create`);
  };

  const openEdit = (sub) => {
    const categoryId = normalizeCategoryId(sub);
    // Always use standalone edit from this page (avoids route treating "edit" as categoryId).
    navigate(`/admin/inventory/subcategories/edit/${sub._id}`, {
      state: {
        categoryId,
        subcategory: sub,
        returnTo: "/admin/subcategoriess",
      },
    });
  };

  const toggleActive = async (id) => {
    try {
      await toggleSubcategoryActiveStatus(id);
      setSubcategories((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      console.error("Toggle active error:", err);
      setListErrors(extractBackendMessages(err));
      fetchSubcategories(currentPage);
    }
  };

  const toggleNavbar = async (id) => {
    try {
      await toggleSubcategoryNavbarStatus(id);
      setSubcategories((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isNavbar: !s.isNavbar } : s))
      );
    } catch (err) {
      console.error("Toggle navbar error:", err);
      setListErrors(extractBackendMessages(err));
      fetchSubcategories(currentPage);
    }
  };

  const isSearching = debouncedSearchTerm.trim().length > 0;
  const displayData = subcategories;

  // ───────────────────────────────────────────────────────────────────
  //                          R E N D E R
  // ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-canvas-muted overflow-hidden">
      {/* Sticky top bar – header + filters */}
      <div className="sticky top-0 z-20 bg-white border-b border-border shadow-sm">
        <div className="px-4 sm:px-6">
          {/* Title */}
          <div className="py-3">
            <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Subcategories
            </h1>
          </div>

          {/* Filters section */}
          <div className="pb-5 space-y-5 border-t border-gray-100 pt-5">
            {/* Category Dropdown */}
            <div>
              <label className="block mb-2 text-xs font-semibold text-stone-700">
                Filter by Category
              </label>
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  disabled={loadingCategories}
                  className="w-full px-4 py-2 text-xs bg-white border-2 border-border rounded-lg shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100/20 transition-all outline-none text-stone-900 disabled:bg-canvas-muted disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span className="truncate">
                    {loadingCategories ? "Loading..." : getSelectedCategoryName()}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-stone-500 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-border rounded-lg shadow-lg max-h-96 flex flex-col">
                    {/* Search inside dropdown */}
                    <div className="p-3 border-b border-border sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearchTerm}
                          onChange={(e) => {
                            setCategorySearchTerm(e.target.value);
                            setCategoryCurrentPage(1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100/20 focus:border-brand-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 min-h-0">
                      {loadingCategories && categories.length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-xs">Loading categories...</div>
                      ) : categories.length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-xs">
                          {categorySearchTerm ? "No categories found matching your search" : "No categories available"}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCategorySelect("")}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-brand-50/30 transition-colors ${
                              selectedCategoryId === "" ? "bg-canvas-muted font-semibold text-black" : "text-stone-700"
                            }`}
                          >
                            All Subcategories/categories
                          </button>

                          {categories.map((cat) => (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => handleCategorySelect(cat._id)}
                              className={`w-full px-4 py-2 text-left text-xs hover:bg-brand-50/30 transition-colors border-t border-gray-100 ${
                                selectedCategoryId === cat._id ? "bg-canvas-muted font-semibold text-black" : "text-stone-700"
                              }`}
                            >
                              {cat.name || cat.title || "Unnamed Category"}
                            </button>
                          ))}

                          {!debouncedCategorySearchTerm &&
                            categoryPagination &&
                            categoryCurrentPage <
                              (categoryPagination.pages ||
                                Math.ceil(categoryPagination.total / categoryLimit) ||
                                1) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadMoreCategories();
                                }}
                                disabled={loadingCategories}
                                className="w-full px-4 py-2 text-xs text-stone-600 hover:bg-brand-50/30 border-t border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingCategories ? "Loading..." : "Load More..."}
                              </button>
                            )}
                        </>
                      )}
                    </div>

                    {categories.length > 0 && (
                      <div className="p-3 border-t border-border bg-canvas-muted sticky bottom-0">
                        <div className="flex items-center justify-between text-xs text-stone-600">
                          <span>
                            {debouncedCategorySearchTerm
                              ? `Found ${categories.length} result${categories.length !== 1 ? "s" : ""}`
                              : categoryPagination
                              ? `Page ${categoryCurrentPage} of ${
                                  categoryPagination.pages ||
                                  Math.ceil(categoryPagination.total / categoryLimit) ||
                                  1
                                } (${allCategories.length} total)`
                              : `Showing ${categories.length} categories`}
                          </span>

                          {!debouncedCategorySearchTerm && categoryPagination && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (categoryCurrentPage > 1) setCategoryCurrentPage(categoryCurrentPage - 1);
                                }}
                                disabled={categoryCurrentPage === 1 || loadingCategories}
                                className="px-2 py-1 text-xs border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Prev
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const totalPages =
                                    categoryPagination.pages ||
                                    Math.ceil(categoryPagination.total / categoryLimit) ||
                                    1;
                                  if (categoryCurrentPage < totalPages) setCategoryCurrentPage(categoryCurrentPage + 1);
                                }}
                                disabled={
                                  categoryCurrentPage >=
                                    (categoryPagination.pages ||
                                      Math.ceil(categoryPagination.total / categoryLimit) ||
                                      1) ||
                                  loadingCategories
                                }
                                className="px-2 py-1 text-xs border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Search + Add Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search subcategories by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white border-2 border-border rounded-lg shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100/20 transition-all outline-none text-stone-900 placeholder-gray-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" size={20} />
              </div>

              <button
                onClick={openCreate}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus size={18} />
                <span>New Subcategory</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6">
          {listErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
              <div className="font-semibold mb-2">Please review:</div>
              <ul className="list-disc list-inside space-y-1">
                {listErrors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-canvas-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden sm:table-cell">Order</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Image</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Icon</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider hidden lg:table-cell">Description</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-stone-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-stone-700 uppercase tracking-wider hidden md:table-cell">Navbar</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-stone-700 uppercase tracking-wider hidden md:table-cell">
  Footer
</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-stone-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-stone-500">
                        <div className="inline-flex items-center gap-3">
                          <div className="w-6 h-6 border-2 border-border border-t-black rounded-full animate-spin"></div>
                          <span>Loading subcategories...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-stone-500 italic">
                        {debouncedSearchTerm
                          ? "No matching subcategories found..."
                          : selectedCategoryId
                          ? "No subcategories found in this category."
                          : "No subcategories exist yet."}
                      </td>
                    </tr>
                  ) : (
                    displayData.map((sub, i) => {
                      const iconUrl = resolveSubcategoryIconUrl(sub);
                      return (
                      <tr
                        key={sub._id}
                        className="group hover:bg-brand-50/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-xs text-stone-600">
                          {(currentPage - 1) * limit + i + 1}
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-600 hidden sm:table-cell">
                          {sub.sortOrder || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="relative group cursor-pointer h-10 w-10 rounded-lg overflow-hidden bg-canvas-muted border border-border shadow-sm hover:ring-2 hover:ring-brand-500 transition-all duration-200"
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
                              <div className="h-full w-full flex items-center justify-center text-stone-400 text-xs">
                                No img
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`relative h-10 w-10 rounded-lg overflow-hidden bg-canvas-muted border border-border shadow-sm ${
                              iconUrl ? "cursor-pointer hover:ring-2 hover:ring-brand-500" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (iconUrl) {
                                setZoomedImage({ url: iconUrl, name: `${sub.name} icon` });
                              }
                            }}
                            title={iconUrl ? "View icon" : "No icon — edit to upload"}
                          >
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt=""
                                className="h-full w-full object-contain p-0.5"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-stone-400 text-[10px]">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-stone-900">{sub.name}</div>
                        </td>
                        <td className="px-5 py-3 text-xs text-stone-600 hidden lg:table-cell max-w-md">
                          <div className="line-clamp-2">{sub.description || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(sub._id);
                            }}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                              sub.isActive
                                ? "bg-success-bg text-success hover:bg-green-200"
                                : "bg-danger-bg text-danger hover:bg-red-200"
                            }`}
                          >
                            {sub.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNavbar(sub._id);
                            }}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                              sub.isNavbar
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                : "bg-canvas-muted text-stone-700 hover:bg-gray-200"
                            }`}
                          >
                            {sub.isNavbar ? "Shown" : "Hidden"}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center hidden md:table-cell">
  <button
    onClick={(e) => {
      e.stopPropagation();
      // toggleFooter(sub._id);
    }}
    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
      sub.isFooter
        ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
        : "bg-canvas-muted text-stone-700 hover:bg-gray-200"
    }`}
  >
    {sub.isFooter ? "Shown" : "Hidden"}
  </button>
</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(sub);
                            }}
                            className="inline-flex items-center gap-1.5 text-stone-700 hover:text-black font-medium transition px-2 py-1.5 rounded-md hover:bg-canvas-muted"
                            title="Edit subcategory (name, image, icon, etc.)"
                          >
                            <Edit size={18} />
                            <span className="hidden sm:inline text-xs">Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {displayData.length > 0 && !loading && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-1 pb-6">
              <div className="text-xs text-stone-700">
                {isSearching ? (
                  <>
                    Showing <strong>{displayData.length}</strong> of{" "}
                    <strong>{pagination?.total || displayData.length}</strong> matching results
                  </>
                ) : (
                  <>
                    Showing <strong>{displayData.length}</strong> of{" "}
                    <strong>{pagination?.total || subcategories.length}</strong> subcategories
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-5 py-2 bg-white border-2 border-border rounded-lg font-semibold text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-50/30 hover:border-gray-400 transition-all shadow-sm"
                >
                  Previous
                </button>

                <span className="px-5 py-2 bg-canvas-muted border border-border rounded-lg font-semibold text-stone-700 min-w-[140px] text-center">
                  Page {currentPage} of{" "}
                  {pagination?.pages ||
                    Math.ceil((pagination?.total || subcategories.length) / limit) ||
                    1}
                </span>

                <button
                  disabled={
                    currentPage >=
                      (pagination?.pages ||
                        Math.ceil((pagination?.total || subcategories.length) / limit) ||
                        1) || loading
                  }
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-5 py-2 bg-white border-2 border-border rounded-lg font-semibold text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-50/30 hover:border-gray-400 transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Close zoom"
          >
            <X size={28} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '95vw', maxHeight: '90vh' }}
            />
          </div>

          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg backdrop-blur-sm">
            <p className="text-base font-medium">{zoomedImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Showsubcategory;