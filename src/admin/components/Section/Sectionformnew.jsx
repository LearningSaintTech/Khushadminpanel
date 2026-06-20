import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Search, X } from "lucide-react";
import BindOfferFormSection from "./BindOfferFormSection";
import {
  bindOfferFromSection,
  buildBindOfferApiPayload,
  defaultBindOfferFormState,
  formatBindOfferPreview,
  validateBindOfferForm,
} from "../../utils/bindOffer.util";
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
import {
  btnOutline,
  btnPrimary,
  Field,
  fieldClass,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./sectionShared";

const PAGE_SIZE = 10;

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

const LOG = "[SectionForm]";

/** Dev logging — filter browser console by `SectionForm` */
function sectionLog(event, data) {
  const time = new Date().toISOString();
  console.log(`${LOG} ${event}`, { time, ...data });
}

function snapshotSectionFromApi(section) {
  if (!section) return null;
  const orders = getSectionDisplayOrders(section);
  const products = Array.isArray(section.products) ? section.products : [];
  return {
    _id: section._id,
    title: section.title,
    type: section.type,
    discount: section.discount ?? null,
    enableDiscountFromApi:
      section.discount != null && Number(section.discount?.value) > 0,
    appOrder: orders.appOrder,
    webOrder: orders.webOrder,
    rawAppOrder: section.appOrder ?? section.apporder,
    rawWebOrder: section.webOrder ?? section.weborder,
    isApp: section.isApp ?? section.isapp,
    isWeb: section.isWeb ?? section.isweb,
    showBadge: section.showBadge,
    productsCount: products.length,
    products: products.map((p, i) => ({
      index: i,
      itemId:
        (typeof p?.itemId === "object" && p.itemId?._id) ||
        p?.itemId ||
        p?._id,
      productDiscount: p?.discount ?? null,
      discountedPrice: p?.discountedPrice ?? null,
      price: p?.price ?? null,
    })),
  };
}

function snapshotFormState(formData, productIds, categoryIds) {
  const discountConsented = isDiscountConsented(formData);
  return {
    title: formData.title,
    type: formData.type,
    enableDiscountCheckbox: formData.enableDiscount,
    discountConsented,
    discountWillBeSentToApi: discountConsented,
    discountType: discountConsented ? formData.discountType : "NOT SENT",
    discountValue: discountConsented ? formData.discountValue : "NOT SENT",
    apporder: formData.apporder,
    weborder: formData.weborder,
    isapp: formData.isapp,
    isweb: formData.isweb,
    showBadge: formData.showBadge,
    productIdsCount: productIds.length,
    productsPayload: buildProductsPayload(productIds, formData),
    categoryIds,
    subcategoryIds: formData.subcategoryId,
  };
}

function formDataToLogObject(data) {
  const out = {};
  for (const [key, value] of data.entries()) {
    if (value instanceof File) {
      out[key] = `[File name=${value.name} size=${value.size} type=${value.type}]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Discount is sent only when the user explicitly checked “Add discount” AND entered a value > 0 */
function isDiscountConsented(formData) {
  if (!formData?.enableDiscount) return false;
  const v = Number(formData.discountValue);
  return (
    formData.discountValue !== "" &&
    formData.discountValue != null &&
    !Number.isNaN(v) &&
    v > 0
  );
}

function buildProductsPayload(productIds, formData) {
  const withDiscount = isDiscountConsented(formData);
  return productIds.map((itemId) => {
    if (!withDiscount) {
      return { itemId };
    }
    return {
      itemId,
      discount: {
        type: formData.discountType,
        value: Number(formData.discountValue),
      },
    };
  });
}

function buildSectionSubmitPayload(formData, productIds, categoryIds, bindOfferForm, { isEdit = false } = {}) {
  const discountConsented = isDiscountConsented(formData);
  const productsPayload = buildProductsPayload(productIds, formData);
  const appOrder = Number(formData.apporder) || 0;
  const webOrder = Number(formData.weborder) || 0;
  const bindOfferPayload = buildBindOfferApiPayload(bindOfferForm);

  const data = new FormData();
  data.append("title", formData.title.trim());
  data.append("type", formData.type);
  data.append("text", formData.text || "");
  data.append("categoryId", JSON.stringify(formData.categoryId || categoryIds));
  data.append("subcategoryId", JSON.stringify(formData.subcategoryId || []));
  data.append("products", JSON.stringify(productsPayload));

  if (discountConsented) {
    data.append("discount.type", formData.discountType);
    data.append("discount.value", String(formData.discountValue));
  }

  if (bindOfferPayload) {
    data.append("bindOffer", JSON.stringify(bindOfferPayload));
  } else if (isEdit) {
    data.append("bindOffer", JSON.stringify(null));
  }

  data.append("navigation.externalLink", formData.externalLink || "");
  data.append("navigation.navigate", formData.navigate || "");
  data.append("startDate", formData.startDate || "");
  data.append("endDate", formData.endDate || "");
  data.append("showBadge", formData.showBadge);
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

  const apiFields = formDataToLogObject(data);
  const discountInPayload = discountConsented
    ? {
        "discount.type": apiFields["discount.type"],
        "discount.value": apiFields["discount.value"],
      }
    : null;

  const overview = {
    discountConsented,
    bindOfferSummary: formatBindOfferPreview(bindOfferForm),
    bindOfferWillBeSent: Boolean(bindOfferPayload),
    bindOfferPayload,
    discountSummary: discountConsented
      ? `${formData.discountType} — ${formData.discountValue}${
          formData.discountType === "PERCENT" ? "%" : " ₹"
        }`
      : "NOT SENT (Add discount is off or value is empty/zero)",
    title: formData.title.trim(),
    type: formData.type,
    text: formData.text || "",
    categoryIds: formData.categoryId || categoryIds,
    subcategoryIds: formData.subcategoryId || [],
    productCount: productsPayload.length,
    products: productsPayload,
    perProductDiscountInProductsJson: productsPayload.some((p) => p.discount != null),
    navigation: {
      externalLink: formData.externalLink || "",
      navigate: formData.navigate || "",
    },
    startDate: formData.startDate || "",
    endDate: formData.endDate || "",
    showBadge: formData.showBadge,
    appOrder,
    webOrder,
    isApp: !!formData.isapp,
    isWeb: !!formData.isweb,
    desktopBanner: formData.desktopbanner
      ? `[New file: ${formData.desktopbanner.name}]`
      : "unchanged / not selected",
    mobileBanner: formData.mobilebanner
      ? `[New file: ${formData.mobilebanner.name}]`
      : "unchanged / not selected",
    discountFieldsInFormData: discountInPayload,
    allFormDataFields: apiFields,
  };

  return { data, overview, discountConsented, productsPayload, apiFields };
}

function SubmitPreviewModal({ open, mode, sectionId, overview, loading, onClose, onConfirm }) {
  if (!open || !overview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-submit-preview-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
          <div>
            <h2 id="section-submit-preview-title" className="text-sm font-semibold text-stone-900">
              {mode === "UPDATE" ? "Review update" : "Review before create"}
            </h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Confirm what will be sent to the API
              {sectionId ? ` (section ${sectionId})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-stone-400 hover:bg-canvas-muted hover:text-stone-600 disabled:opacity-50"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs">
          <div
            className={`rounded-lg border px-3 py-2 ${
              overview.discountConsented
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide">Discount</p>
            <p className="mt-1 font-medium">{overview.discountSummary}</p>
            {!overview.discountConsented && (
              <p className="mt-1 text-[10px] opacity-90">
                No discount.type, discount.value, or per-product discount in products JSON.
              </p>
            )}
          </div>

          <div
            className={`rounded-lg border px-3 py-2 ${
              overview.bindOfferWillBeSent
                ? "border-violet-200 bg-violet-50 text-violet-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide">Bind offer</p>
            <p className="mt-1 font-medium">{overview.bindOfferSummary}</p>
            {overview.bindOfferPayload ? (
              <pre className="mt-2 max-h-32 overflow-auto rounded border border-violet-200/60 bg-white/60 p-2 text-[10px]">
                {JSON.stringify(overview.bindOfferPayload, null, 2)}
              </pre>
            ) : (
              <p className="mt-1 text-[10px] opacity-90">
                {mode === "UPDATE"
                  ? "bindOffer will be cleared on the server (null)."
                  : "bindOffer omitted from create payload."}
              </p>
            )}
          </div>

          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Title</dt>
              <dd className="font-medium text-stone-900">{overview.title}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Type</dt>
              <dd className="font-medium text-stone-900">{overview.type}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Products</dt>
              <dd className="tabular-nums text-stone-900">{overview.productCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Order</dt>
              <dd className="text-stone-900">
                App {overview.appOrder} · Web {overview.webOrder}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Platforms</dt>
              <dd className="text-stone-900">
                {overview.isApp ? "App" : ""}
                {overview.isApp && overview.isWeb ? " · " : ""}
                {overview.isWeb ? "Web" : ""}
                {!overview.isApp && !overview.isWeb ? "—" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase text-stone-500">Show badge</dt>
              <dd className="text-stone-900">{overview.showBadge ? "Yes" : "No"}</dd>
            </div>
          </dl>

          {overview.text && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-stone-500">Description</p>
              <p className="mt-0.5 text-stone-700">{overview.text}</p>
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-stone-500">
              Full API payload (FormData)
            </p>
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-canvas-muted p-2 text-[10px] leading-relaxed text-stone-800">
              {JSON.stringify(overview.allFormDataFields, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border/80 px-4 py-3">
          <button type="button" onClick={onClose} disabled={loading} className={`${btnOutline} flex-1 py-2`}>
            Go back
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`${btnPrimary} flex-1 py-2`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? "Saving…"
              : mode === "UPDATE"
                ? "Confirm update"
                : "Confirm create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TRACKED_FIELD_CHANGES = new Set([
  "title",
  "type",
  "text",
  "enableDiscount",
  "discountType",
  "discountValue",
  "apporder",
  "weborder",
  "isapp",
  "isweb",
  "showBadge",
  "navigate",
  "externalLink",
  "startDate",
  "endDate",
]);

function PickerPagination({ page, totalPages, onPageChange, loading, selectedCount, label }) {
  return (
    <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
      <span>
        Page {page} / {totalPages}
        {selectedCount != null ? ` · ${selectedCount} ${label || "selected"}` : ""}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border px-2 py-0.5 hover:bg-canvas-muted disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border px-2 py-0.5 hover:bg-canvas-muted disabled:opacity-50"
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
  const loadedFromApiRef = useRef(null);

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
       showBadge: false, 
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

  const [showSubmitPreview, setShowSubmitPreview] = useState(false);
  const [submitOverview, setSubmitOverview] = useState(null);
  const [bindOfferForm, setBindOfferForm] = useState(defaultBindOfferFormState());

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
    const discountConsented =
      enableDiscount &&
      discountValue !== "" &&
      discountValue != null &&
      !Number.isNaN(Number(discountValue)) &&
      Number(discountValue) > 0;

    const products = ids.map((itemId) => {
      const entry = { itemId };
      if (discountConsented) {
        entry.discount = {
          type: discountType,
          value: Number(discountValue),
        };
      }
      return entry;
    });
    sectionLog("products sync → formData.products", {
      productCount: products.length,
      enableDiscountCheckbox: enableDiscount,
      discountConsented,
      discountWillBeSentToApi: discountConsented,
      discountType: discountConsented ? discountType : "NOT SENT",
      discountValue: discountConsented ? discountValue : "NOT SENT",
      products,
      note: discountConsented
        ? "User consented — discount included in products JSON"
        : "No discount in products JSON — checkbox off or value empty/zero",
    });
    setFormData((prev) => ({
      ...prev,
      products,
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
    loadedFromApiRef.current = snapshotSectionFromApi(section);
    sectionLog("LOAD from API → form", {
      sectionId: section._id,
      apiSnapshot: loadedFromApiRef.current,
    });

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

  showBadge: section.showBadge ?? false,
        });

    setBindOfferForm(bindOfferFromSection(section));

    sectionLog("LOAD applied to form fields", {
      enableDiscountCheckbox:
        section.discount != null && Number(section.discount?.value) > 0,
      discountConsentedOnLoad:
        section.discount != null && Number(section.discount?.value) > 0,
      discountWillBeSentOnSaveUnlessUserChanges:
        section.discount != null && Number(section.discount?.value) > 0,
      discountType: section.discount?.type || "FLAT",
      discountValue: section.discount?.value,
      apporder: getSectionDisplayOrders(section).appOrder ?? 0,
      weborder: getSectionDisplayOrders(section).webOrder ?? 0,
      productIds: ids.length,
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

  }, []);

  useEffect(() => {
    sectionLog("mount", { mode: isEdit ? "edit" : "create", sectionId: id || null });
  }, [isEdit, id]);

  useEffect(() => {
    sectionLog("productIds changed", {
      count: productIds.length,
      productIds,
      enableDiscountCheckbox: formData.enableDiscount,
      discountWillBeSentToApi: isDiscountConsented(formData),
    });
  }, [productIds, formData.enableDiscount]);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      setLoadError("");
      try {
        sectionLog("FETCH section start", { sectionId: id });
        const section = await fetchSectionById(id);
        if (cancelled) return;
        sectionLog("FETCH section raw response object", { section });
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
    const nextVal = type === "checkbox" ? checked : value;
    if (TRACKED_FIELD_CHANGES.has(name)) {
      sectionLog("FIELD change", {
        field: name,
        value: nextVal,
        isDiscountField: ["enableDiscount", "discountType", "discountValue"].includes(
          name,
        ),
        discountWillBeSentAfterChange:
          name === "enableDiscount"
            ? nextVal === true
              ? "Only if discount value > 0"
              : false
            : isDiscountConsented({
                ...formData,
                [name]: nextVal,
              }),
        isOrderField: ["apporder", "weborder", "isapp", "isweb"].includes(name),
      });
    }
    if (name === "enableDiscount" && !nextVal) {
      sectionLog("DISCOUNT consent withdrawn", {
        discountWillBeSentToApi: false,
        note: "discount.type, discount.value, and per-product discount will NOT be in submit payload",
      });
    }
    if (name === "enableDiscount" && nextVal) {
      setBindOfferForm((prev) => ({ ...prev, enableBindOffer: false }));
    }
    setFormError("");
    setSubmitError("");
    setFormData((prev) => ({
      ...prev,
      [name]: nextVal,
    }));
  };

  const handleBindOfferChange = (next) => {
    if (next.enableBindOffer && isDiscountConsented(formData)) {
      setFormData((prev) => ({
        ...prev,
        enableDiscount: false,
        discountValue: "",
      }));
    }
    setFormError("");
    setSubmitError("");
    setBindOfferForm(next);
  };

  const validate = () => {
    let err = "";
    if (!formData.title.trim()) err = "Section title is required.";
    else if (formData.type === "CATEGORY" && categoryIds.length === 0) {
      err = "Select at least one category for a CATEGORY section.";
    } else if (formData.type === "MANUAL" && productIds.length === 0) {
      err = "Select at least one product for a MANUAL section.";
    } else if (isDiscountConsented(formData) && bindOfferForm.enableBindOffer) {
      err = "Turn off either section discount or bind offer — only one is allowed.";
    } else if (formData.enableDiscount) {
      const v = Number(formData.discountValue);
      if (formData.discountValue === "" || Number.isNaN(v) || v <= 0) {
        err = "Enter a discount value greater than 0, or turn off “Add discount”.";
      }
    } else {
      const bindErr = validateBindOfferForm(bindOfferForm, {
        hasLegacyDiscount: isDiscountConsented(formData),
      });
      if (bindErr) err = bindErr;
    }
    if (err) {
      setFormError(err);
      sectionLog("VALIDATION failed", { err, discountWillBeSentToApi: false });
      return false;
    }
    setFormError("");
    sectionLog("VALIDATION passed", {
      discountConsented: isDiscountConsented(formData),
      discountWillBeSentToApi: isDiscountConsented(formData),
      enableDiscountCheckbox: formData.enableDiscount,
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      apporder: formData.apporder,
      weborder: formData.weborder,
    });
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");
    sectionLog("SUBMIT clicked — opening review", {
      mode: isEdit ? "UPDATE" : "CREATE",
      sectionId: id || null,
      formSnapshot: snapshotFormState(formData, productIds, categoryIds),
      discountConsented: isDiscountConsented(formData),
      discountWillBeSentToApi: isDiscountConsented(formData),
      loadedFromApi: loadedFromApiRef.current,
    });
    if (!validate()) return;

    const built = buildSectionSubmitPayload(formData, productIds, categoryIds, bindOfferForm, {
      isEdit,
    });
    setSubmitOverview(built.overview);
    setShowSubmitPreview(true);

    sectionLog("SUBMIT preview ready (not sent yet)", {
      mode: isEdit ? "UPDATE" : "CREATE",
      discountConsented: built.discountConsented,
      discountWillBeSentToApi: built.discountConsented,
      discountFields: built.discountConsented
        ? built.overview.discountFieldsInFormData
        : "NOT IN PAYLOAD",
      productsJson: built.productsPayload,
      overview: built.overview,
      fullPayload: built.apiFields,
    });
  };

  const handleConfirmSubmit = async () => {
    if (!validate()) {
      setShowSubmitPreview(false);
      return;
    }

    const built = buildSectionSubmitPayload(formData, productIds, categoryIds, bindOfferForm, {
      isEdit,
    });
    const { data, overview, discountConsented, productsPayload, apiFields } = built;

    sectionLog("SUBMIT confirmed — sending to API", {
      endpoint: isEdit ? `PATCH /sections/update/${id}` : "POST /sections/create",
      discountConsented,
      discountWillBeSentToApi: discountConsented,
      discountFields: discountConsented
        ? overview.discountFieldsInFormData
        : "NOT SENT — user did not consent to discount",
      productsJsonHasPerProductDiscount: productsPayload.some((p) => p.discount != null),
      productsJson: productsPayload,
      overview,
      fullPayload: apiFields,
    });

    try {
      setLoading(true);

      if (isEdit) {
        sectionLog("API call → updateSection", { sectionId: id, discountWillBeSentToApi: discountConsented });
        const res = await updateSection(id, data);
        sectionLog("API response ← updateSection", {
          success: res?.success,
          message: res?.message,
          sentDiscount: discountConsented,
          returnedDiscount: res?.data?.discount ?? res?.data?.data?.discount,
          returnedAppOrder:
            res?.data?.appOrder ??
            res?.data?.apporder ??
            res?.data?.data?.appOrder,
          returnedWebOrder:
            res?.data?.webOrder ??
            res?.data?.weborder ??
            res?.data?.data?.webOrder,
          fullResponse: res,
        });
      } else {
        sectionLog("API call → createSection", { discountWillBeSentToApi: discountConsented });
        const res = await createSection(data);
        sectionLog("API response ← createSection", {
          success: res?.success,
          message: res?.message,
          sentDiscount: discountConsented,
          fullResponse: res,
        });
      }

      setShowSubmitPreview(false);
      navigate(ap("section"));
    } catch (err) {
      console.error(`${LOG} SUBMIT error`, err);
      sectionLog("SUBMIT failed", {
        discountWasSent: discountConsented,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        err,
      });
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

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("section"));
  };

  if (initialLoading) {
    return (
      <div className={formPageWrap}>
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
          Loading section…
        </div>
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className={formPageWrap}>
        <div className={formToolbar}>
          <button type="button" onClick={goBack} className={btnOutline}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
          <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
            Edit section
          </h1>
        </div>
        <div className="rounded-xl border border-danger/30 bg-danger-bg p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">Could not load section</p>
          <p className="mt-1 text-[11px] text-danger">{loadError}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
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
              className={btnPrimary}
            >
              Retry
            </button>
            <button type="button" onClick={() => navigate(ap("section"))} className={btnOutline}>
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          {isEdit ? "Edit section" : "Create section"}
        </h1>
        <button type="button" onClick={() => navigate(ap("section"))} className={btnOutline}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {(formError || submitError) && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger"
          >
            {formError || submitError}
          </div>
        )}

        <FormSection title="Basic details" hint="Title, type, and storefront copy.">
          <Field label="Title" required>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={fieldClass}
              placeholder="Summer collection"
              required
            />
          </Field>
          <Field label="Section type" required>
            <select name="type" value={formData.type} onChange={handleChange} className={fieldClass}>
              <option value="MANUAL">MANUAL — pick products</option>
              <option value="CATEGORY">CATEGORY — link categories</option>
            </select>
          </Field>
          <Field label="Description">
            <textarea
              name="text"
              rows={2}
              value={formData.text}
              onChange={handleChange}
              className={`${fieldClass} resize-none`}
              placeholder="Short copy on storefront"
            />
          </Field>
        </FormSection>

        <FormSection title="Discount" hint="Legacy flat/percent discount. Mutually exclusive with bind offer.">
          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              name="enableDiscount"
              checked={formData.enableDiscount}
              onChange={handleChange}
              disabled={bindOfferForm.enableBindOffer}
              className="h-3.5 w-3.5 rounded border-border accent-brand-600 disabled:opacity-50"
            />
            Add discount to this section
          </label>
          {bindOfferForm.enableBindOffer ? (
            <p className="text-[10px] text-stone-500">
              Disabled while bind offer is enabled.
            </p>
          ) : null}
          {formData.enableDiscount ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Discount type">
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                  className={fieldClass}
                >
                  <option value="FLAT">Flat (₹)</option>
                  <option value="PERCENT">Percent (%)</option>
                </select>
              </Field>
              <Field label="Discount value">
                <input
                  type="number"
                  name="discountValue"
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="e.g. 20"
                />
              </Field>
            </div>
          ) : null}
        </FormSection>

        <BindOfferFormSection
          bindOfferForm={bindOfferForm}
          onChange={handleBindOfferChange}
          legacyDiscountActive={isDiscountConsented(formData)}
          disabled={loading}
        />

        <FormSection title="Navigation & schedule">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Navigate path">
              <input
                type="text"
                name="navigate"
                value={formData.navigate}
                onChange={handleChange}
                className={fieldClass}
                placeholder="/summer-sale"
              />
            </Field>
            <Field label="External link">
              <input
                type="text"
                name="externalLink"
                value={formData.externalLink}
                onChange={handleChange}
                className={fieldClass}
                placeholder="https://..."
              />
            </Field>
            <Field label="Start date">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Display order & platforms">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Field label="App order">
              <input
                type="number"
                name="apporder"
                value={formData.apporder}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
            <Field label="Web order">
              <input
                type="number"
                name="weborder"
                value={formData.weborder}
                onChange={handleChange}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-canvas-muted/50 px-3 py-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="isapp"
                checked={formData.isapp}
                onChange={handleChange}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Show on app
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-canvas-muted/50 px-3 py-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="isweb"
                checked={formData.isweb}
                onChange={handleChange}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Show on web
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-canvas-muted/50 px-3 py-2 text-[11px] font-medium text-stone-700">
              <input
                type="checkbox"
                name="showBadge"
                checked={formData.showBadge}
                onChange={handleChange}
                className="h-3.5 w-3.5 rounded border-border accent-brand-600"
              />
              Show badge
            </label>
          </div>
        </FormSection>

        {formData.type === "CATEGORY" && (
          <FormSection
            title="Categories"
            hint={
              categoryIds.length
                ? `${categoryIds.length} selected — pick at least one.`
                : "Required for CATEGORY sections."
            }
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories…"
                className={`${fieldClass} pl-8`}
              />
            </div>
            {categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categoryIds.map((cid) => {
                  const cat = categories.find((c) => c._id === cid);
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800"
                    >
                      {cat?.name || cat?.title || cid.slice(-6)}
                      <button
                        type="button"
                        onClick={() => toggleId(setCategoryIds, categoryIds, cid)}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-canvas-muted/50 p-2">
              {loadingCategories ? (
                <p className="py-2 text-[11px] text-stone-500">Loading…</p>
              ) : categories.length === 0 ? (
                <p className="py-2 text-[11px] text-stone-500">No categories found.</p>
              ) : (
                <div className="space-y-0.5">
                  {categories.map((cat) => (
                    <label
                      key={cat._id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(cat._id)}
                        onChange={() => toggleId(setCategoryIds, categoryIds, cat._id)}
                        className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                      />
                      <span>{cat.name || cat.title || "Unnamed"}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <PickerPagination
              page={categoryPage}
              totalPages={categoryTotalPages}
              onPageChange={setCategoryPage}
              loading={loadingCategories}
              selectedCount={categoryIds.length}
            />
          </FormSection>
        )}

        {formData.type === "CATEGORY" && categoryIds.length > 0 && (
          <FormSection title="Subcategories" hint="Optional refinement per category.">
            <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
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
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-canvas-muted text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {cat?.name || cat?.title || "Category"}
                    {count > 0 ? (
                      <span className="ml-1 rounded-full bg-white/25 px-1.5">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={subcategorySearch}
                onChange={(e) => setSubcategorySearch(e.target.value)}
                placeholder="Search subcategories…"
                className={`${fieldClass} pl-8`}
              />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-canvas-muted/50 p-2">
              {loadingSubcategories ? (
                <p className="py-2 text-[11px] text-stone-500">Loading…</p>
              ) : !activeSubcat?.items?.length ? (
                <p className="py-2 text-[11px] text-stone-500">No subcategories on this page.</p>
              ) : (
                <div className="space-y-0.5">
                  {activeSubcat.items.map((sub) => (
                    <label
                      key={sub._id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={(subcategoryMap[activeSubcatTab] || []).includes(sub._id)}
                        onChange={() => handleSubcategoryToggle(activeSubcatTab, sub._id)}
                        className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                      />
                      <span>{sub.name || sub.title || "Unnamed"}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <PickerPagination
              page={subcategoryPage}
              totalPages={subcatTotalPages}
              onPageChange={setSubcategoryPage}
              loading={loadingSubcategories}
              selectedCount={selectedSubCount}
            />
          </FormSection>
        )}

        <FormSection
          title="Products"
          hint={
            formData.type === "MANUAL"
              ? productIds.length
                ? `${productIds.length} selected — required for MANUAL.`
                : "Required for MANUAL sections."
              : productIds.length
                ? `${productIds.length} selected (optional).`
                : "Optional for CATEGORY sections."
          }
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className={`${fieldClass} pl-8`}
            />
          </div>
          {productIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-canvas-muted/50 p-2">
              {productIds.map((pid) => (
                <span
                  key={pid}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800"
                >
                  {productLabels[pid] || `…${pid.slice(-6)}`}
                  <button
                    type="button"
                    onClick={() => setProductIds(productIds.filter((x) => x !== pid))}
                    className="text-brand-600 hover:text-brand-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setProductIds([])}
                className="text-[10px] font-medium text-danger hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-canvas-muted/50 p-2">
            {loadingProducts ? (
              <p className="py-2 text-[11px] text-stone-500">Loading…</p>
            ) : products.length === 0 ? (
              <p className="py-2 text-[11px] text-stone-500">No products found.</p>
            ) : (
              <div className="space-y-0.5">
                {products.map((prod) => (
                  <label
                    key={prod._id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] hover:bg-white"
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
                            prod.title || prod.name || prod.productName || "Product",
                        }));
                      }}
                      className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {prod.title || prod.name || prod.productName || "Unnamed"}
                      {prod.discountedPrice != null ? (
                        <span className="ml-1 text-stone-500">₹{prod.discountedPrice}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <PickerPagination
            page={productPage}
            totalPages={productTotalPages}
            onPageChange={setProductPage}
            loading={loadingProducts}
            selectedCount={productIds.length}
          />
        </FormSection>

        <FormSection title="Banner images" hint="Desktop and mobile hero images.">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Desktop banner">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFormData((prev) => ({ ...prev, desktopbanner: file }));
                  setDesktopPreview(URL.createObjectURL(file));
                }}
                className="block w-full text-[11px] text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-canvas-muted file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
              />
              {desktopPreview && (
                <div className="relative mt-2 h-24 w-full">
                  <img
                    src={desktopPreview}
                    alt="Desktop banner preview"
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopPreview(null);
                      setFormData((prev) => ({ ...prev, desktopbanner: null }));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] text-white"
                    aria-label="Remove desktop banner"
                  >
                    ×
                  </button>
                </div>
              )}
            </Field>
            <Field label="Mobile banner">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFormData((prev) => ({ ...prev, mobilebanner: file }));
                  setMobilePreview(URL.createObjectURL(file));
                }}
                className="block w-full text-[11px] text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-canvas-muted file:px-2.5 file:py-1.5 file:text-[11px] file:font-medium"
              />
              {mobilePreview && (
                <div className="relative mt-2 h-24 w-full">
                  <img
                    src={mobilePreview}
                    alt="Mobile banner preview"
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobilePreview(null);
                      setFormData((prev) => ({ ...prev, mobilebanner: null }));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] text-white"
                    aria-label="Remove mobile banner"
                  >
                    ×
                  </button>
                </div>
              )}
            </Field>
          </div>
        </FormSection>

        <div className={formStickyFooter}>
          <button
            type="button"
            onClick={() => navigate(ap("section"))}
            disabled={loading}
            className={btnOutline}
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {isEdit ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </form>

      <SubmitPreviewModal
        open={showSubmitPreview}
        mode={isEdit ? "UPDATE" : "CREATE"}
        sectionId={id}
        overview={submitOverview}
        loading={loading}
        onClose={() => {
          if (!loading) {
            setShowSubmitPreview(false);
            sectionLog("SUBMIT preview closed — no API call", {
              discountWillBeSentToApi: isDiscountConsented(formData),
            });
          }
        }}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
};

export default SectionForm;
