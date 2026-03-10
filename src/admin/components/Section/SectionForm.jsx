// src/admin/pages/SectionForm.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  Image as ImageIcon,
  Link2,
  Percent,
  FileText,
  X,
} from "lucide-react";
import {
  createSection,
  updateSection,
  getSingleSection,
} from "../../apis/Sectionapi";
import { getAllCategories } from "../../apis/categoryapi";
import { searchItems } from "../../apis/itemapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";

const SectionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState("");
  const [type, setType] = useState("MANUAL");
  const [text, setText] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [subcategoryMap, setSubcategoryMap] = useState({}); // { catId: [subId1, subId2, ...] }
  const [productIds, setProductIds] = useState([]);
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discountValue, setDiscountValue] = useState(0);
  const [externalLink, setExternalLink] = useState("");
  const [navigatePath, setNavigatePath] = useState("");
  const [desktopBanner, setDesktopBanner] = useState(null);
  const [mobileBanner, setMobileBanner] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);

  // Data states
  const [categories, setCategories] = useState([]);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [debouncedCategorySearchTerm, setDebouncedCategorySearchTerm] = useState("");
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryPagination, setCategoryPagination] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryLimit] = useState(10);

  const [products, setProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [debouncedProductSearchTerm, setDebouncedProductSearchTerm] = useState("");
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productPagination, setProductPagination] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productLimit] = useState(10);

  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState({});
  const [activeSubcatTab, setActiveSubcatTab] = useState(null);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [isCategoryAccordionOpen, setIsCategoryAccordionOpen] = useState(false);
  const [isSubcategoryAccordionOpen, setIsSubcategoryAccordionOpen] = useState(false);
  const [isProductAccordionOpen, setIsProductAccordionOpen] = useState(true);
  const [isDiscountAccordionOpen, setIsDiscountAccordionOpen] = useState(false);
  const [isNavigationAccordionOpen, setIsNavigationAccordionOpen] = useState(false);
  const [isBannerAccordionOpen, setIsBannerAccordionOpen] = useState(false);

  // ─── Debounce ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearchTerm(categorySearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [categorySearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearchTerm(productSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [productSearchTerm]);

  useEffect(() => {
    setCategoryCurrentPage(1);
  }, [debouncedCategorySearchTerm]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [debouncedProductSearchTerm]);

  // ─── Fetch Categories ────────────────────────────────────────
  const fetchCategories = async (page = 1) => {
    try {
      setLoadingCategories(true);
      const res = await getAllCategories(page, categoryLimit, debouncedCategorySearchTerm);
      const data = res?.data?.data || res?.data || {};
      const cats = Array.isArray(data.categories) ? data.categories : data || [];
      setCategories(cats);
      setCategoryPagination(data.pagination || null);
    } catch (err) {
      console.error("[CATEGORIES] fetch failed:", err);
      setCategories([]);
      setCategoryPagination(null);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (type === "CATEGORY") {
      fetchCategories(categoryCurrentPage);
    }
  }, [categoryCurrentPage, debouncedCategorySearchTerm, type]);

  // ─── Load Subcategories ──────────────────────────────────────
  useEffect(() => {
    if (type !== "CATEGORY" || categoryIds.length === 0) {
      setSubcategoriesByCategory({});
      setSubcategoryMap({});
      setActiveSubcatTab(null);
      return;
    }

    const loadSubcategories = async () => {
      setLoadingSubcategories(true);
      const newSubs = { ...subcategoriesByCategory };
      const newMap = { ...subcategoryMap };

      for (const catId of categoryIds) {
        if (newSubs[catId]) continue;

        try {
          const res = await getSubcategoriesByCategory(catId, 1, 50);
          const subsList =
            res?.data?.data?.subcategories ||
            res?.data?.subcategories ||
            res?.data ||
            [];
          newSubs[catId] = Array.isArray(subsList) ? subsList : [];
          if (!(catId in newMap)) newMap[catId] = [];
        } catch (err) {
          console.error(`[SUBCATS] Failed for ${catId}:`, err);
          newSubs[catId] = [];
          newMap[catId] = [];
        }
      }

      setSubcategoriesByCategory(newSubs);
      setSubcategoryMap(newMap);

      if (!activeSubcatTab && categoryIds.length > 0) {
        setActiveSubcatTab(categoryIds[0]);
      }

      setLoadingSubcategories(false);
    };

    loadSubcategories();

    // Cleanup removed categories
    setSubcategoriesByCategory((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (!categoryIds.includes(key)) delete updated[key];
      });
      return updated;
    });

    setSubcategoryMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (!categoryIds.includes(key)) delete updated[key];
      });
      return updated;
    });
  }, [categoryIds, type]);

  // ─── Fetch Products ──────────────────────────────────────────
  const fetchProducts = async (page = 1) => {
    try {
      setLoadingProducts(true);
      const queryParams = { page, limit: productLimit };
      if (debouncedProductSearchTerm?.trim()) {
        queryParams.search = debouncedProductSearchTerm.trim();
      }
      const res = await searchItems(queryParams);

      let prodArray = [];
      let pag = null;

      if (res?.data?.data?.items) {
        prodArray = res.data.data.items;
        pag = res.data.data.pagination;
      } else if (res?.data?.items) {
        prodArray = res.data.items;
        pag = res.data.pagination;
      } else if (Array.isArray(res?.data)) {
        prodArray = res.data;
      }

      setProducts(Array.isArray(prodArray) ? prodArray : []);
      setProductPagination(pag);
    } catch (err) {
      console.error("[PRODUCTS] fetch failed:", err);
      setProducts([]);
      setProductPagination(null);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts(productCurrentPage);
  }, [productCurrentPage, debouncedProductSearchTerm]);

  // ─── Load Existing Section (Edit) ────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchSection = async () => {
      setLoading(true);
      try {
        const res = await getSingleSection(id);
        const sec = res?.data?.data || res?.data || res || {};

        setTitle(sec.title || "");
        setType(sec.type || "MANUAL");
        setText(sec.text || "");

        const catIds = sec.categoryId || sec.categoryIds || [];
        const loadedCatIds = Array.isArray(catIds) ? catIds : catIds ? [catIds] : [];
        setCategoryIds(loadedCatIds);

        const subIds = sec.subcategoryId || sec.subcategoryIds || [];
        const flatSubIds = Array.isArray(subIds) ? subIds : subIds ? [subIds] : [];

        if (flatSubIds.length > 0 && loadedCatIds.length > 0) {
          setSubcategoryMap({ [loadedCatIds[0]]: flatSubIds });
        }

        let prodIds = [];
        if (sec.products && Array.isArray(sec.products)) {
          prodIds = sec.products.map((p) => p.itemId || p._id).filter(Boolean);
        } else {
          prodIds = sec.productIds || sec.itemIds || [];
        }
        setProductIds(Array.isArray(prodIds) ? prodIds : []);

        setDiscountType(sec.discount?.type || "PERCENT");
        setDiscountValue(sec.discount?.value || 0);
        setExternalLink(sec.navigation?.externalLink || "");
        setNavigatePath(sec.navigation?.navigate || sec.navigation?.path || "");

        const deskUrl = sec.desktopBanner?.[0]?.imageUrl || sec.desktopBanner?.[0]?.url || null;
        const mobUrl = sec.mobileBanner?.[0]?.imageUrl || sec.mobileBanner?.[0]?.url || null;
        setDesktopPreview(deskUrl);
        setMobilePreview(mobUrl);
      } catch (err) {
        console.error("[EDIT] Failed to load section:", err);
        alert("Could not load section data");
        navigate("/admin/sections");
      } finally {
        setLoading(false);
      }
    };

    fetchSection();
  }, [id, navigate]);

  // ─── Helpers ─────────────────────────────────────────────────
  const handleCheckboxChange = (setter, current) => (id) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubcategoryChange = (catId, subId) => {
    setSubcategoryMap((prev) => {
      const list = prev[catId] || [];
      const updated = list.includes(subId)
        ? list.filter((s) => s !== subId)
        : [...list, subId];
      return {
        ...prev,
        [catId]: updated,
      };
    });
  };

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("type", type);
      formData.append("text", text || "");

      categoryIds.forEach((id) => {
        formData.append("categoryId", id);
      });

      const flatSubcategories = Object.values(subcategoryMap).flat();
      flatSubcategories.forEach((subId) => {
        formData.append("subcategoryId", subId);
      });

      productIds.forEach((prodId, index) => {
        formData.append(`products[${index}][itemId]`, prodId);
      });

      if (discountValue > 0) {
        formData.append("discount[type]", discountType);
        formData.append("discount[value]", discountValue);
      }

      formData.append("navigation[externalLink]", externalLink || "");
      formData.append("navigation[navigate]", navigatePath || "");

      if (desktopBanner) {
        formData.append("desktopBanner", desktopBanner);
      }

      if (mobileBanner) {
        formData.append("mobileBanner", mobileBanner);
      }

      let res;
      if (id) {
        res = await updateSection(id, formData);
      } else {
        res = await createSection(formData);
      }

      alert(id ? "Section updated successfully!" : "Section created successfully!");
      navigate("/admin/sections");
    } catch (err) {
      console.error("Submit failed:", err);
      alert(err?.response?.data?.message || "Failed to save section");
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/sections")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {id ? "Edit Section" : "Create Section"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {id ? "Update section information" : "Add a new section"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Basic Information ── */}
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Basic Information
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Title <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter section title"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Section Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setType(newType);
                        if (newType !== "CATEGORY") {
                          setCategoryIds([]);
                          setSubcategoryMap({});
                          setSubcategoriesByCategory({});
                          setIsCategoryAccordionOpen(false);
                          setIsSubcategoryAccordionOpen(false);
                        } else {
                          setIsCategoryAccordionOpen(true);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
                      required
                    >
                      <option value="MANUAL">MANUAL (select products manually)</option>
                      <option value="CATEGORY">CATEGORY (select categories & subcategories)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Description (optional)</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter section description or text..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Categories Accordion */}
              {type === "CATEGORY" && (
                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setIsCategoryAccordionOpen(!isCategoryAccordionOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <h3 className="text-base font-bold">
                          Categories <span className="text-red-600">*</span>
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {categoryIds.length
                            ? `${categoryIds.length} categor${categoryIds.length > 1 ? "ies" : "y"} selected`
                            : "Select categories for this section"}
                        </p>
                      </div>
                    </div>
                    {isCategoryAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {isCategoryAccordionOpen && (
                    <div className="p-6 space-y-4 border-t">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold">Select Categories</label>
                        {categories.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryIds(
                                categoryIds.length === categories.length
                                  ? []
                                  : categories.map((c) => c._id)
                              )
                            }
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 rounded"
                          >
                            {categoryIds.length === categories.length ? "Deselect All" : "Select All"}
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={categorySearchTerm}
                          onChange={(e) => setCategorySearchTerm(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                        />
                      </div>

                      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto p-3">
                          {loadingCategories ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full"></div>
                            </div>
                          ) : categories.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No categories found</p>
                          ) : (
                            categories.map((cat) => (
                              <label
                                key={cat._id}
                                className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={categoryIds.includes(cat._id)}
                                  onChange={() => handleCheckboxChange(setCategoryIds, categoryIds)(cat._id)}
                                  className="w-4 h-4"
                                />
                                <span>{cat.name || cat.title || "Unnamed"}</span>
                              </label>
                            ))
                          )}
                        </div>

                        {categoryPagination?.totalPages > 1 && (
                          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
                            <span>Page {categoryCurrentPage} of {categoryPagination.totalPages}</span>
                            <div className="flex gap-2">
                              <button
                                disabled={categoryCurrentPage === 1}
                                onClick={() => setCategoryCurrentPage((p) => p - 1)}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                              >
                                Prev
                              </button>
                              <button
                                disabled={categoryCurrentPage === categoryPagination.totalPages}
                                onClick={() => setCategoryCurrentPage((p) => p + 1)}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {categoryIds.length === 0 && (
                        <p className="text-red-600 text-sm bg-red-50 p-3 rounded">
                          At least one category is required
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subcategories Accordion */}
              {type === "CATEGORY" && (
                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm mt-4">
                  <button
                    type="button"
                    onClick={() => setIsSubcategoryAccordionOpen(!isSubcategoryAccordionOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50"
                  >
                    <div className="text-left">
                      <h3 className="text-base font-bold">Subcategories (Optional)</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {Object.values(subcategoryMap).flat().length
                          ? `${Object.values(subcategoryMap).flat().length} selected`
                          : "Refine by subcategories"}
                      </p>
                    </div>
                    {isSubcategoryAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {isSubcategoryAccordionOpen && (
                    <div className="p-6 border-t">
                      {loadingSubcategories ? (
                        <p className="text-center py-8">Loading subcategories...</p>
                      ) : categoryIds.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">Select at least one category first</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 mb-5 border-b pb-2 overflow-x-auto">
                            {categoryIds.map((catId) => {
                              const cat = categories.find((c) => c._id === catId);
                              const count = subcategoryMap[catId]?.length || 0;
                              const isActive = activeSubcatTab === catId;

                              return (
                                <button
                                  key={catId}
                                  type="button"
                                  onClick={() => setActiveSubcatTab(catId)}
                                  className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                    isActive
                                      ? "bg-indigo-100 text-indigo-800 border border-b-0 border-indigo-300"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {cat?.name || cat?.title || "Category"}
                                  {count > 0 && (
                                    <span className="ml-1.5 text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                                      {count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {activeSubcatTab && subcategoriesByCategory[activeSubcatTab] ? (
                            <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                              {subcategoriesByCategory[activeSubcatTab].length === 0 ? (
                                <p className="text-center text-gray-500 py-10">
                                  No subcategories found for this category
                                </p>
                              ) : (
                                subcategoriesByCategory[activeSubcatTab].map((sub) => (
                                  <label
                                    key={sub._id}
                                    className="flex items-center gap-3 p-2.5 hover:bg-white rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(subcategoryMap[activeSubcatTab] || []).includes(sub._id)}
                                      onChange={() => handleSubcategoryChange(activeSubcatTab, sub._id)}
                                      className="w-4 h-4"
                                    />
                                    <span>{sub.name || sub.title || "Unnamed Subcategory"}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-8">Select a category tab above</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Products Accordion */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsProductAccordionOpen(!isProductAccordionOpen)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-purple-600" />
                    <div className="text-left">
                      <h3 className="text-base font-bold">
                        Products {type === "MANUAL" ? <span className="text-red-600">*</span> : "(optional)"}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {productIds.length ? `${productIds.length} selected` : "Select products"}
                      </p>
                    </div>
                  </div>
                  {isProductAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isProductAccordionOpen && (
                  <div className="p-6 space-y-4 border-t">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold">Select Products</label>
                      {products.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setProductIds(
                              productIds.length === products.length ? [] : products.map((p) => p._id)
                            )
                          }
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-3 py-1.5 bg-purple-50 rounded"
                        >
                          {productIds.length === products.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                      />
                    </div>

                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto p-3">
                        {loadingProducts ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full"></div>
                          </div>
                        ) : products.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">No products found</p>
                        ) : (
                          products.map((prod) => (
                            <label
                              key={prod._id}
                              className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={productIds.includes(prod._id)}
                                onChange={() => handleCheckboxChange(setProductIds, productIds)(prod._id)}
                                className="w-4 h-4"
                              />
                              <div>
                                <div className="font-medium">{prod.name || "Unnamed Product"}</div>
                                {prod.discountedPrice && (
                                  <div className="text-green-600 text-sm">₹{prod.discountedPrice}</div>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      {productPagination?.totalPages > 1 && (
                        <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t text-sm text-gray-600">
                          <span>Page {productCurrentPage} of {productPagination.totalPages}</span>
                          <div className="flex gap-2">
                            <button
                              disabled={productCurrentPage === 1}
                              onClick={() => setProductCurrentPage((p) => p - 1)}
                              className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              disabled={productCurrentPage === productPagination.totalPages}
                              onClick={() => setProductCurrentPage((p) => p + 1)}
                              className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Selected Products Tags ── */}
                    {productIds.length > 0 && (
                      <div className="mt-6 pt-5 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Package size={16} className="text-purple-600" />
                            Currently selected products ({productIds.length})
                          </p>
                          {productIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setProductIds([])}
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {productIds.map((id) => {
                            const product = products.find((p) => p._id === id);
                            if (!product) {
                              // Product might be from previous page or edit load
                              return (
                                <div
                                  key={id}
                                  className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-full px-3 py-1.5 text-sm text-gray-600 italic"
                                >
                                  <span>ID: {id.slice(-8)}...</span>
                                  <button
                                    type="button"
                                    onClick={() => setProductIds((prev) => prev.filter((pid) => pid !== id))}
                                    className="text-red-500 hover:text-red-700 text-lg leading-none"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={id}
                                className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-sm shadow-sm"
                              >
                                <span className="font-medium truncate max-w-[240px]">
                                  {product.name || product.title || "Unnamed Product"}
                                </span>
                                {product.discountedPrice && (
                                  <span className="text-green-600 text-xs">₹{product.discountedPrice}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setProductIds((prev) => prev.filter((pid) => pid !== id))}
                                  className="text-red-500 hover:text-red-700 ml-1 text-lg leading-none"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {type === "MANUAL" && productIds.length === 0 && (
                      <p className="text-red-600 text-sm bg-red-50 p-3 rounded">
                        At least one product is required for MANUAL type
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Discount Accordion */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsDiscountAccordionOpen(!isDiscountAccordionOpen)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <h3 className="text-base font-bold">Discount Settings</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {discountValue > 0
                          ? `${discountValue}${discountType === "PERCENT" ? "%" : "₹"} discount`
                          : "Optional"}
                      </p>
                    </div>
                  </div>
                  {isDiscountAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isDiscountAccordionOpen && (
                  <div className="p-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                      >
                        <option value="PERCENT">Percentage (%)</option>
                        <option value="FLAT">Flat (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Value</label>
                      <input
                        type="number"
                        min="0"
                        step={discountType === "PERCENT" ? 1 : 0.01}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                        placeholder={discountType === "PERCENT" ? "e.g. 25" : "e.g. 199"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Accordion */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsNavigationAccordionOpen(!isNavigationAccordionOpen)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="h-5 w-5 text-orange-600" />
                    <div className="text-left">
                      <h3 className="text-base font-bold">Navigation Settings</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Optional link / path</p>
                    </div>
                  </div>
                  {isNavigationAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isNavigationAccordionOpen && (
                  <div className="p-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">External Link</label>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Internal Path</label>
                      <input
                        type="text"
                        value={navigatePath}
                        onChange={(e) => setNavigatePath(e.target.value)}
                        placeholder="/collection/summer"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Banner Accordion */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsBannerAccordionOpen(!isBannerAccordionOpen)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-cyan-600" />
                    <div className="text-left">
                      <h3 className="text-base font-bold">Banner Images</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Desktop & Mobile (optional)</p>
                    </div>
                  </div>
                  {isBannerAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isBannerAccordionOpen && (
                  <div className="p-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Desktop Banner</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDesktopBanner(file);
                            setDesktopPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-black file:text-white hover:file:bg-gray-800"
                      />
                      {desktopPreview && (
                        <div className="mt-3 relative group">
                          <img
                            src={desktopPreview}
                            alt="Desktop preview"
                            className="w-full h-48 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDesktopBanner(null);
                              setDesktopPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Mobile Banner</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMobileBanner(file);
                            setMobilePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-black file:text-white hover:file:bg-gray-800"
                      />
                      {mobilePreview && (
                        <div className="mt-3 relative group">
                          <img
                            src={mobilePreview}
                            alt="Mobile preview"
                            className="w-full h-48 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setMobileBanner(null);
                              setMobilePreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? "Saving..." : id ? "Update Section" : "Create Section"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/sections")}
                  className="flex-1 bg-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 border-2 border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionForm;