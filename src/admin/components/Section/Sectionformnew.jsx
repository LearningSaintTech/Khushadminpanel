import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Package,
  Search,
  Tag,
} from "lucide-react";
import {
  createSection,
  getOneSection,
  getSingleSection,
  updateSection,
} from "../../apis/NewsectionApi";
import { getAllCategories } from "../../apis/categoryapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";
import { searchItems } from "../../apis/itemApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getSectionDisplayOrders } from "../../utils/sectionDisplay";

const PAGE_SIZE = 10;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15";
const labelClass = "mb-1 block text-[11px] font-semibold text-slate-700";
const sectionCard = "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";
const sectionHeader =
  "flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-50/80";
const sectionBody = "space-y-3 border-t border-slate-100 p-3 sm:p-4";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 transition-colors";

function getTotalPages(pagination) {
  if (!pagination) return 1;
  return (
    pagination.totalPages ||
    pagination.pages ||
    (pagination.total
      ? Math.ceil(pagination.total / (pagination.limit || PAGE_SIZE))
      : 1)
  );
}

function parseListResponse(res, listKeys = ["items", "categories", "subcategories"]) {
  const data = res?.data?.data || res?.data || {};
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return { list: data[key], pagination: data.pagination || null };
  }
  if (Array.isArray(data)) return { list: data, pagination: null };
  return { list: [], pagination: data.pagination || null };
}

/** Unwrap section object from various API response shapes */
function extractSectionFromApiResponse(res) {
  if (!res || typeof res !== "object") return null;
  const candidates = [
    res?.data?.data,
    res?.data?.section,
    res?.data?.item,
    res?.data,
    res?.section,
    res?.item,
    res,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && !Array.isArray(c) && (c._id || c.title)) {
      return c;
    }
  }
  return null;
}

async function fetchSectionById(sectionId) {
  let lastError = null;
  for (const fetcher of [getSingleSection, getOneSection]) {
    try {
      const res = await fetcher(sectionId);
      const section = extractSectionFromApiResponse(res);
      if (section?._id) return section;
      lastError = new Error("Section payload missing in API response");
    } catch (err) {
      lastError = err;
      console.warn("[SectionForm] fetch attempt failed:", err?.message || err);
    }
  }
  throw lastError || new Error("Could not load section");
}

function normalizeIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "",
      )
      .filter(Boolean);
  }
  if (typeof value === "object" && value._id) return [String(value._id)];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseProductsFromSection(prods) {
  const ids = [];
  const labels = {};
  const list = Array.isArray(prods) ? prods : [];
  list.forEach((p) => {
    if (!p || typeof p !== "object") return;
    const item = p.itemId;
    const pid =
      (typeof item === "object" && item?._id) ||
      (typeof item === "string" ? item : null) ||
      p._id;
    if (!pid) return;
    const id = String(pid);
    ids.push(id);
    labels[id] =
      (typeof item === "object" && (item.title || item.name || item.productName)) ||
      p.title ||
      p.name ||
      p.productName ||
      "Product";
  });
  return { ids, labels };
}

function buildSubcategoryMap(categoryIds, subcategoryIds) {
  const map = {};
  if (!subcategoryIds.length) return map;
  const primary = categoryIds[0];
  if (primary) map[primary] = [...subcategoryIds];
  return map;
}

function PaginationBar({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-600">
      <span>
        Page {page} / {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className={btnOutline}
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className={btnOutline}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const SectionForm = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = useMemo(
    () => (suffix) =>
      `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/"),
    [basePath],
  );

  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
      title: "",
      type: "MANUAL",
      text: "",
      categoryId: [],
      subcategoryId: [],
      products: [],

    enableDiscount: false,
      discountType: "FLAT",
    discountValue: "",
      externalLink: "",
      navigate: "",
      startDate: "",
      endDate: "",
      desktopbanner: null,
      mobilebanner: null,
      apporder: 0,
      weborder: 0,
      isapp: true,
      isweb: true,
    });

  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);

  const [categoryIds, setCategoryIds] = useState([]);
  const [subcategoryMap, setSubcategoryMap] = useState({});
  const [productIds, setProductIds] = useState([]);
  const [productLabels, setProductLabels] = useState({});

  const [categories, setCategories] = useState([]);
  const [categoryPagination, setCategoryPagination] = useState(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [subcatState, setSubcatState] = useState({});
  const [activeSubcatTab, setActiveSubcatTab] = useState(null);
  const [subcategoryPage, setSubcategoryPage] = useState(1);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [debouncedSubcategorySearch, setDebouncedSubcategorySearch] = useState("");
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const [products, setProducts] = useState([]);
  const [productPagination, setProductPagination] = useState(null);
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [openBasic, setOpenBasic] = useState(true);
  const [openCategories, setOpenCategories] = useState(true);
  const [openSubcategories, setOpenSubcategories] = useState(false);
  const [openProducts, setOpenProducts] = useState(true);
  const [openMedia, setOpenMedia] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCategorySearch(categorySearch), 400);
    return () => clearTimeout(t);
  }, [categorySearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductSearch(productSearch), 400);
    return () => clearTimeout(t);
  }, [productSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSubcategorySearch(subcategorySearch), 400);
    return () => clearTimeout(t);
  }, [subcategorySearch]);

  useEffect(() => setCategoryPage(1), [debouncedCategorySearch]);
  useEffect(() => setProductPage(1), [debouncedProductSearch]);
  useEffect(() => setSubcategoryPage(1), [debouncedSubcategorySearch, activeSubcatTab]);

  useEffect(() => {
    if (formError || submitError) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [formError, submitError]);

  const syncProductsToForm = useCallback((ids, enableDiscount, discountType, discountValue) => {
    setFormData((prev) => ({
      ...prev,
      products: ids.map((itemId) => {
        const entry = { itemId };
        if (enableDiscount) {
          entry.discount = {
            type: discountType,
            value: Number(discountValue) || 0,
          };
        }
        return entry;
      }),
    }));
  }, []);

  useEffect(() => {
    syncProductsToForm(
      productIds,
      formData.enableDiscount,
      formData.discountType,
      formData.discountValue,
    );
  }, [
    productIds,
    formData.enableDiscount,
    formData.discountType,
    formData.discountValue,
    syncProductsToForm,
  ]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await getAllCategories(
        categoryPage,
        PAGE_SIZE,
        debouncedCategorySearch,
      );
      const { list, pagination } = parseListResponse(res, ["categories"]);
      setCategories(list);
      setCategoryPagination(pagination);
    } catch (err) {
      console.error(err);
      setCategories([]);
      setCategoryPagination(null);
    } finally {
      setLoadingCategories(false);
    }
  }, [categoryPage, debouncedCategorySearch]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const query = { page: productPage, limit: PAGE_SIZE };
      if (debouncedProductSearch.trim()) {
        query.keywords = debouncedProductSearch.trim();
      }
      const res = await searchItems(query);
      const { list, pagination } = parseListResponse(res, ["items"]);
      setProducts(list);
      setProductPagination(pagination);
      setProductLabels((prev) => {
        const next = { ...prev };
        list.forEach((p) => {
          next[p._id] = p.title || p.name || p.productName || "Product";
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setProducts([]);
      setProductPagination(null);
    } finally {
      setLoadingProducts(false);
    }
  }, [productPage, debouncedProductSearch]);

  const fetchSubcategoriesForTab = useCallback(async () => {
    if (!activeSubcatTab) return;
    try {
      setLoadingSubcategories(true);
      const res = await getSubcategoriesByCategory(
        activeSubcatTab,
        subcategoryPage,
        PAGE_SIZE,
        debouncedSubcategorySearch,
      );
      const { list, pagination } = parseListResponse(res, ["subcategories"]);
      setSubcatState((prev) => ({
        ...prev,
        [activeSubcatTab]: { items: list, pagination },
      }));
    } catch (err) {
      console.error(err);
      setSubcatState((prev) => ({
        ...prev,
        [activeSubcatTab]: { items: [], pagination: null },
      }));
    } finally {
      setLoadingSubcategories(false);
    }
  }, [activeSubcatTab, subcategoryPage, debouncedSubcategorySearch]);

  useEffect(() => {
    if (formData.type === "CATEGORY") fetchCategories();
  }, [formData.type, fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (formData.type === "CATEGORY" && activeSubcatTab) {
      fetchSubcategoriesForTab();
    }
  }, [formData.type, activeSubcatTab, fetchSubcategoriesForTab]);

  useEffect(() => {
    if (categoryIds.length > 0 && !activeSubcatTab) {
      setActiveSubcatTab(categoryIds[0]);
    }
    if (categoryIds.length === 0) {
      setActiveSubcatTab(null);
    }
    if (activeSubcatTab && !categoryIds.includes(activeSubcatTab)) {
      setActiveSubcatTab(categoryIds[0] || null);
    }
  }, [categoryIds, activeSubcatTab]);

  useEffect(() => {
    const flatSubs = Object.values(subcategoryMap).flat();
    setFormData((prev) => ({
      ...prev,
      categoryId: categoryIds,
      subcategoryId: flatSubs,
    }));
  }, [categoryIds, subcategoryMap]);

  const applySectionToForm = useCallback((section) => {
    const loadedCats = normalizeIdList(
      section.categoryId || section.categoryIds,
    );
    const flatSubs = normalizeIdList(
      section.subcategoryId || section.subcategoryIds,
    );
    const subMap = buildSubcategoryMap(loadedCats, flatSubs);
    const { ids, labels } = parseProductsFromSection(section.products);

    setCategoryIds(loadedCats);
    setSubcategoryMap(subMap);
    setProductIds(ids);
    setProductLabels(labels);

    if (loadedCats.length > 0) setActiveSubcatTab(loadedCats[0]);

    setFormData({
      title: section.title || "",
      type: section.type || "MANUAL",
      text: section.text || "",
      categoryId: loadedCats,
      subcategoryId: flatSubs,
      products: [],
      enableDiscount:
        section.discount != null &&
        Number(section.discount?.value) > 0,
      discountType: section.discount?.type || "FLAT",
          discountValue:
        section.discount?.value != null && section.discount?.value !== ""
          ? section.discount.value
          : "",
      externalLink: section.navigation?.externalLink || "",
          navigate:
        section.navigation?.navigate ||
        section.navigation?.path ||
        "",
      startDate: section.startDate
        ? String(section.startDate).slice(0, 10)
        : "",
      endDate: section.endDate ? String(section.endDate).slice(0, 10) : "",
          desktopbanner: null,
          mobilebanner: null,
      apporder: getSectionDisplayOrders(section).appOrder ?? 0,
      weborder: getSectionDisplayOrders(section).webOrder ?? 0,
      isapp: section.isApp ?? section.isapp ?? true,
          isweb:
        section.isWeb ??
        section.isweb ??
        section.webinfo?.isWeb ??
        true,
        });

        setDesktopPreview(
      section.desktopBanner?.[0]?.imageUrl ||
        section.desktopBanner?.[0]?.url ||
        section.desktopbanner?.[0]?.imageUrl ||
        null,
    );
        setMobilePreview(
      section.mobileBanner?.[0]?.imageUrl ||
        section.mobileBanner?.[0]?.url ||
        section.mobilebanner?.[0]?.imageUrl ||
        null,
    );

    if (section.type === "CATEGORY") {
      setOpenCategories(true);
      setOpenSubcategories(true);
    }
  }, []);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      setLoadError("");
      try {
        const section = await fetchSectionById(id);
        if (cancelled) return;
        applySectionToForm(section);
      } catch (err) {
        if (cancelled) return;
        console.error("[SectionForm] load section failed:", err);
        setLoadError(
          err?.message ||
            (typeof err === "string" ? err : "Could not load section data"),
        );
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, applySectionToForm]);

  const toggleId = (setter, current, id) => {
    setter(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const handleSubcategoryToggle = (catId, subId) => {
    setSubcategoryMap((prev) => {
      const list = prev[catId] || [];
      const updated = list.includes(subId)
        ? list.filter((s) => s !== subId)
        : [...list, subId];
      return { ...prev, [catId]: updated };
    });
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormError("");
    setSubmitError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!formData.title.trim()) {
      setFormError("Section title is required.");
      return false;
    }
    if (formData.type === "CATEGORY" && categoryIds.length === 0) {
      setFormError("Select at least one category for a CATEGORY section.");
      return false;
    }
    if (formData.type === "MANUAL" && productIds.length === 0) {
      setFormError("Select at least one product for a MANUAL section.");
      return false;
    }
    if (formData.enableDiscount) {
      const v = Number(formData.discountValue);
      if (formData.discountValue === "" || Number.isNaN(v) || v <= 0) {
        setFormError("Enter a discount value greater than 0, or turn off “Add discount”.");
        return false;
      }
    }
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    try {
      setLoading(true);
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("type", formData.type);
      data.append("text", formData.text || "");
      data.append("categoryId", JSON.stringify(formData.categoryId));
      data.append("subcategoryId", JSON.stringify(formData.subcategoryId));
      const productsPayload = formData.enableDiscount
        ? formData.products
        : productIds.map((itemId) => ({ itemId }));
      data.append("products", JSON.stringify(productsPayload));

      if (formData.enableDiscount) {
        data.append("discount.type", formData.discountType);
        data.append("discount.value", String(formData.discountValue));
      }
      data.append("navigation.externalLink", formData.externalLink || "");
      data.append("navigation.navigate", formData.navigate || "");
      data.append("startDate", formData.startDate || "");
      data.append("endDate", formData.endDate || "");

      const appOrder = Number(formData.apporder) || 0;
      const webOrder = Number(formData.weborder) || 0;

      // API expects camelCase (see create response: appOrder, webOrder, webinfo)
      data.append("appOrder", String(appOrder));
      data.append("webOrder", String(webOrder));
      data.append("isApp", String(!!formData.isapp));
      data.append("isWeb", String(!!formData.isweb));
      data.append(
        "webinfo",
        JSON.stringify({
          isWeb: !!formData.isweb,
          webOrder,
          isActive: true,
        }),
      );
      if (formData.desktopbanner) data.append("desktopbanner", formData.desktopbanner);
      if (formData.mobilebanner) data.append("mobilebanner", formData.mobilebanner);

      if (isEdit) await updateSection(id, data);
      else await createSection(data);

      navigate(ap("section"));
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.message || err?.response?.data?.message || "Failed to save section",
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryTotalPages = getTotalPages(categoryPagination);
  const productTotalPages = getTotalPages(productPagination);
  const activeSubcat = activeSubcatTab ? subcatState[activeSubcatTab] : null;
  const subcatTotalPages = getTotalPages(activeSubcat?.pagination);

  const selectedSubCount = useMemo(
    () => Object.values(subcategoryMap).flat().length,
    [subcategoryMap],
  );

  if (initialLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-600">Loading section…</p>
      </div>
    );
  }

  if (isEdit && loadError) {
  return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Could not load section</p>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setInitialLoading(true);
                fetchSectionById(id)
                  .then(applySectionToForm)
                  .catch((err) =>
                    setLoadError(err?.message || "Could not load section data"),
                  )
                  .finally(() => setInitialLoading(false));
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate(ap("section"))}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-24">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <button
            type="button"
            onClick={() => navigate(ap("section"))}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sections
          </button>
          <div className="text-left sm:text-right">
            <h1 className="text-sm font-semibold text-slate-900">
              {isEdit ? "Edit section" : "Create section"}
            </h1>
            <p className="text-[10px] text-slate-500">
              Categories, products, banners & display order
            </p>
          </div>
        </div>
        </div>

      <div className="mx-auto max-w-4xl px-3 pt-3 sm:px-4">
        {(formError || submitError) && (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            {formError || submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Basic */}
          <section className={sectionCard}>
            <button
              type="button"
              onClick={() => setOpenBasic(!openBasic)}
              className={`${sectionHeader} bg-gradient-to-r from-slate-50 to-white`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-900">Basic details</span>
              </div>
              {openBasic ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {openBasic && (
              <div className={sectionBody}>
          <div>
                  <label className={labelClass}>
                    Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
                    className={inputClass}
                    placeholder="Summer collection"
                    required
                  />
          </div>
          <div>
                  <label className={labelClass}>
                    Section type <span className="text-red-500">*</span>
            </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.value === "CATEGORY") {
                        setOpenCategories(true);
                        setOpenSubcategories(true);
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="MANUAL">MANUAL — pick products yourself</option>
                    <option value="CATEGORY">CATEGORY — link categories & subcategories</option>
                  </select>
              </div>
              <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    name="text"
                    rows={2}
                    value={formData.text}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                    placeholder="Short copy shown on the storefront"
                  />
              </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <label className="flex cursor-pointer items-center gap-2">
            <input
                      type="checkbox"
                      name="enableDiscount"
                      checked={formData.enableDiscount}
                      onChange={handleChange}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Add discount to this section
                    </span>
                    <span className="text-[10px] font-normal text-slate-500">(optional)</span>
              </label>

                  {formData.enableDiscount ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Discount type</label>
                        <select
                          name="discountType"
                          value={formData.discountType}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="FLAT">Flat (₹)</option>
                          <option value="PERCENT">Percent (%)</option>
                        </select>
            </div>
            <div>
                        <label className={labelClass}>Discount value</label>
              <input
                type="number"
                name="discountValue"
                          min="0"
                          step="0.01"
                          value={formData.discountValue}
                onChange={handleChange}
                          className={inputClass}
                          placeholder="e.g. 20"
                        />
            </div>
          </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Leave unchecked if this section should not apply a discount.
                    </p>
                  )}
          </div>
                <div className="grid gap-3 sm:grid-cols-2">
            <div>
                    <label className={labelClass}>Navigate path</label>
              <input
                type="text"
                      name="navigate"
                      value={formData.navigate}
                onChange={handleChange}
                      className={inputClass}
                      placeholder="/summer-sale"
                    />
            </div>
            <div>
                    <label className={labelClass}>External link</label>
              <input
                type="text"
                      name="externalLink"
                      value={formData.externalLink}
                onChange={handleChange}
                      className={inputClass}
                      placeholder="https://..."
                    />
            </div>
          </div>
                <div className="grid gap-3 sm:grid-cols-2">
            <div>
                    <label className={labelClass}>Start date</label>
              <input
                type="date"
                name="startDate"
                      value={formData.startDate}
                onChange={handleChange}
                      className={inputClass}
                    />
            </div>
            <div>
                    <label className={labelClass}>End date</label>
              <input
                type="date"
                name="endDate"
                      value={formData.endDate}
                onChange={handleChange}
                      className={inputClass}
                    />
            </div>
          </div>
                <div className="grid gap-3 sm:grid-cols-2">
            <div>
                    <label className={labelClass}>App order</label>
              <input
                type="number"
                name="apporder"
                value={formData.apporder}
                onChange={handleChange}
                      className={inputClass}
                    />
            </div>
            <div>
                    <label className={labelClass}>Web order</label>
              <input
                type="number"
                name="weborder"
                value={formData.weborder}
                onChange={handleChange}
                      className={inputClass}
                    />
            </div>
          </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                name="isapp"
                checked={formData.isapp}
                onChange={handleChange}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-xs font-medium text-slate-700">Show on app</span>
            </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                name="isweb"
                checked={formData.isweb}
                onChange={handleChange}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-xs font-medium text-slate-700">Show on web</span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* Categories */}
          {formData.type === "CATEGORY" && (
            <section className={sectionCard}>
              <button
                type="button"
                onClick={() => setOpenCategories(!openCategories)}
                className={`${sectionHeader} bg-gradient-to-r from-indigo-50 to-violet-50`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-600" />
                  <div className="text-left">
                    <span className="text-xs font-semibold text-slate-900">Categories</span>
                    <p className="text-[10px] text-slate-600">
                      {categoryIds.length
                        ? `${categoryIds.length} selected`
                        : "Required — pick at least one"}
                    </p>
                  </div>
                </div>
                {openCategories ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {openCategories && (
                <div className={`${sectionBody} space-y-3`}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                  {categoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {categoryIds.map((cid) => {
                        const cat = categories.find((c) => c._id === cid);
                        return (
                          <span
                            key={cid}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800"
                          >
                            {cat?.name || cat?.title || cid.slice(-6)}
                            <button
                              type="button"
                              onClick={() => toggleId(setCategoryIds, categoryIds, cid)}
                              className="ml-1 text-indigo-600 hover:text-indigo-900"
                            >
                              ×
                            </button>
              </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="max-h-52 overflow-y-auto p-1.5">
                      {loadingCategories ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        </div>
                      ) : categories.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No categories found</p>
                      ) : (
                        categories.map((cat) => (
                          <label
                            key={cat._id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={categoryIds.includes(cat._id)}
                              onChange={() => toggleId(setCategoryIds, categoryIds, cat._id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                            />
                            <span className="text-xs font-medium text-slate-800">
                              {cat.name || cat.title || "Unnamed"}
                            </span>
            </label>
                        ))
                      )}
                    </div>
                    <PaginationBar
                      page={categoryPage}
                      totalPages={categoryTotalPages}
                      onPageChange={setCategoryPage}
                      loading={loadingCategories}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Subcategories */}
          {formData.type === "CATEGORY" && categoryIds.length > 0 && (
            <section className={sectionCard}>
              <button
                type="button"
                onClick={() => setOpenSubcategories(!openSubcategories)}
                className={`${sectionHeader} bg-gradient-to-r from-violet-50 to-purple-50`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-600" />
                  <div className="text-left">
                    <span className="text-xs font-semibold text-slate-900">Subcategories</span>
                    <p className="text-[10px] text-slate-600">
                      {selectedSubCount ? `${selectedSubCount} selected` : "Optional refinement"}
                    </p>
          </div>
                </div>
                {openSubcategories ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {openSubcategories && (
                <div className={`${sectionBody} space-y-3`}>
                  <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                    {categoryIds.map((cid) => {
                      const cat = categories.find((c) => c._id === cid);
                      const count = subcategoryMap[cid]?.length || 0;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setActiveSubcatTab(cid)}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                            activeSubcatTab === cid
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {cat?.name || cat?.title || "Category"}
                          {count > 0 && (
                            <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={subcategorySearch}
                      onChange={(e) => setSubcategorySearch(e.target.value)}
                      placeholder="Search subcategories..."
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="max-h-52 overflow-y-auto p-1.5">
                      {loadingSubcategories ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                        </div>
                      ) : !activeSubcat?.items?.length ? (
                        <p className="py-8 text-center text-xs text-slate-500">
                          No subcategories on this page
                        </p>
                      ) : (
                        activeSubcat.items.map((sub) => (
                          <label
                            key={sub._id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={(subcategoryMap[activeSubcatTab] || []).includes(sub._id)}
                              onChange={() =>
                                handleSubcategoryToggle(activeSubcatTab, sub._id)
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600"
                            />
                            <span className="text-xs font-medium text-slate-800">
                              {sub.name || sub.title || "Unnamed"}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <PaginationBar
                      page={subcategoryPage}
                      totalPages={subcatTotalPages}
                      onPageChange={setSubcategoryPage}
                      loading={loadingSubcategories}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Products */}
          <section className={sectionCard}>
            <button
              type="button"
              onClick={() => setOpenProducts(!openProducts)}
              className={`${sectionHeader} bg-gradient-to-r from-emerald-50 to-teal-50`}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-900">Products</span>
                  <p className="text-[10px] text-slate-600">
                    {formData.type === "MANUAL" ? (
                      <>
                        {productIds.length
                          ? `${productIds.length} selected`
                          : "Required for MANUAL"}
                      </>
                    ) : (
                      <>{productIds.length} selected (optional)</>
                    )}
                  </p>
                </div>
              </div>
              {openProducts ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {openProducts && (
              <div className={`${sectionBody} space-y-3`}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name or SKU..."
                    className={`${inputClass} pl-8`}
                  />
                </div>
                {productIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {productIds.map((pid) => (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900"
                      >
                        {productLabels[pid] || `…${pid.slice(-6)}`}
                        <button
                          type="button"
                          onClick={() => {
                            const next = productIds.filter((x) => x !== pid);
                            setProductIds(next);
                          }}
                          className="text-emerald-700 hover:text-emerald-950"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setProductIds([])}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="max-h-60 overflow-y-auto p-1.5">
                    {loadingProducts ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                      </div>
                    ) : products.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-500">No products found</p>
                    ) : (
                      products.map((prod) => (
                        <label
                          key={prod._id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={productIds.includes(prod._id)}
                            onChange={() => {
                              const next = productIds.includes(prod._id)
                                ? productIds.filter((x) => x !== prod._id)
                                : [...productIds, prod._id];
                              setProductIds(next);
                              setProductLabels((prev) => ({
                                ...prev,
                                [prod._id]:
                                  prod.title ||
                                  prod.name ||
                                  prod.productName ||
                                  "Product",
                              }));
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-800">
                              {prod.title || prod.name || prod.productName || "Unnamed"}
                            </p>
                            {prod.discountedPrice != null && (
                              <p className="text-[10px] text-emerald-700">
                                ₹{prod.discountedPrice}
                              </p>
                            )}
                          </div>
              </label>
                      ))
                    )}
                  </div>
                  <PaginationBar
                    page={productPage}
                    totalPages={productTotalPages}
                    onPageChange={setProductPage}
                    loading={loadingProducts}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Banners */}
          <section className={sectionCard}>
            <button
              type="button"
              onClick={() => setOpenMedia(!openMedia)}
              className={`${sectionHeader} bg-gradient-to-r from-amber-50 to-orange-50`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-900">Banner images</span>
              </div>
              {openMedia ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {openMedia && (
              <div className="grid gap-4 border-t border-slate-100 p-3 sm:grid-cols-2 sm:p-4">
                <div>
                  <label className={labelClass}>Desktop banner</label>
              <input
                type="file"
                    accept="image/*"
                onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFormData((prev) => ({ ...prev, desktopbanner: file }));
                      setDesktopPreview(URL.createObjectURL(file));
                    }}
                    className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
                  />
              {desktopPreview && (
                <div className="relative mt-2 h-28 w-full">
                  <img
                    src={desktopPreview}
                    alt="Desktop banner preview"
                    className="h-full w-full rounded-lg border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopPreview(null);
                      setFormData((prev) => ({ ...prev, desktopbanner: null }));
                    }}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white shadow-sm hover:bg-black"
                    aria-label="Remove desktop banner"
                    title="Remove desktop banner"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <div>
                  <label className={labelClass}>Mobile banner</label>
              <input
                type="file"
                    accept="image/*"
                onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFormData((prev) => ({ ...prev, mobilebanner: file }));
                      setMobilePreview(URL.createObjectURL(file));
                    }}
                    className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
                  />
              {mobilePreview && (
                <div className="relative mt-2 h-28 w-full">
                  <img
                    src={mobilePreview}
                    alt="Mobile banner preview"
                    className="h-full w-full rounded-lg border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobilePreview(null);
                      setFormData((prev) => ({ ...prev, mobilebanner: null }));
                    }}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white shadow-sm hover:bg-black"
                    aria-label="Remove mobile banner"
                    title="Remove mobile banner"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
            )}
          </section>

          <div className="sticky bottom-0 z-10 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-sm sm:-mx-4 sm:px-4">
          <button
              type="submit"
            disabled={loading}
              className={`${btnPrimary} w-full py-2.5 text-xs font-semibold`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Saving…" : isEdit ? "Update section" : "Create section"}
          </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SectionForm;
