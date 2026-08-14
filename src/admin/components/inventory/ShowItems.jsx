import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  Edit,
  Plus,
  X,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  Loader2,
  Package,
  Columns3,
} from "lucide-react";
import ComingSoonListCell from "./ComingSoonListCell.jsx";
import {
  searchItems,
  getItemsBySubcategory,
  updateItem,
  getSingleItem,
  bulkUploadItems,
} from "../../apis/itemapi";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
  addWarehouseStockFromItem,
} from "../../apis/Warehouseapi";
import { getAllCategories } from "../../apis/categoryapi";
import {
  getAllSubcategories,
  getSubcategoriesByCategory,
} from "../../apis/subcategoryapis";
import { itemHasSizeChartContent } from "../../../utils/designerSizeChartDisplay.js";
import ItemPricingHistoryModal from "./ItemPricingHistoryModal.jsx";

function itemRowKey(item) {
  return String(item?._id || item?.productId || "");
}

function collectSkuListFromItem(item) {
  if (!item?.variants?.length) return [];
  const set = new Set();
  for (const v of item.variants) {
    for (const sz of v.sizes || []) {
      const s = sz?.sku != null ? String(sz.sku).trim() : "";
      if (s) set.add(s);
    }
  }
  return [...set];
}

function isWarehouseFromItemRouteUnavailable(err) {
  const msg = String(err?.message || err || "");
  if (/404|cannot post|not found|status code 404/i.test(msg)) return true;
  if (Number(err?.status) === 404) return true;
  return false;
}

function normalizeWarehouseRows(res) {
  const payload = res?.data ?? {};
  const list = payload.data ?? payload.stock ?? payload.items ?? [];
  return Array.isArray(list) ? list : [];
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition disabled:bg-slate-50 disabled:cursor-not-allowed";
const labelClass = "mb-1 block text-[11px] font-medium text-slate-700";
const dropdownBtnClass = `${inputClass} flex items-center justify-between gap-2`;
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
const thClass =
  "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap bg-slate-50/90 border-b border-slate-200";
const tdClass = "px-2 py-1.5 text-[11px] text-slate-600 align-middle";
const badgeActive =
  "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
const badgeInactive =
  "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";

const ITEM_LIST_COLUMNS_STORAGE_KEY = "khush_admin_show_items_visible_columns";

const ITEM_LIST_TABLE_COLUMNS = [
  { key: "index", label: "#", defaultVisible: true },
  { key: "image", label: "Image", defaultVisible: true },
  { key: "name", label: "Name", defaultVisible: true, alwaysVisible: true },
  { key: "productId", label: "Product ID", defaultVisible: true },
  { key: "description", label: "Description", defaultVisible: true },
  { key: "seo", label: "SEO", defaultVisible: false },
  { key: "sizeChart", label: "Size chart", defaultVisible: true },
  { key: "warehouse", label: "Warehouse", defaultVisible: true },
  { key: "mrp", label: "MRP", defaultVisible: true },
  { key: "discount", label: "Discount", defaultVisible: true },
  { key: "pricingHistory", label: "Pricing", defaultVisible: true },
  { key: "createdAt", label: "Created At", defaultVisible: true },
  { key: "updatedAt", label: "Updated At", defaultVisible: true },
  { key: "comingSoon", label: "Coming soon", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
];

function formatItemListDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const tableScrollShell =
  "w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_rgb(248_250_252)]";

function defaultVisibleKeysFor(columns) {
  return columns.filter((c) => c.defaultVisible).map((c) => c.key);
}

function loadVisibleColumnsFromStorage(storageKey, columns) {
  const fallback = defaultVisibleKeysFor(columns);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validKeys = new Set(columns.map((c) => c.key));
    const keys = [...new Set(parsed.filter((k) => validKeys.has(k)))];
    columns.filter((c) => c.alwaysVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.unshift(c.key);
    });
    columns.filter((c) => c.defaultVisible).forEach((c) => {
      if (!keys.includes(c.key)) keys.push(c.key);
    });
    return keys.length ? keys : fallback;
  } catch {
    return fallback;
  }
}

function persistVisibleColumns(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

function ColumnPickerDropdown({
  columns,
  visibleKeys,
  onToggle,
  onReset,
  onSelectAll,
  open,
  onOpenChange,
}) {
  const activeCount = columns.filter((c) => visibleKeys.includes(c.key)).length;
  return (
    <div className="relative shrink-0" data-showitems-column-picker>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${btnOutline} gap-1`}
        aria-expanded={open}
      >
        <Columns3 className="h-3.5 w-3.5 shrink-0" />
        Columns
        <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
          {activeCount}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-1.5rem,20rem)] rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg ring-1 ring-black/5">
          <p className="mb-2 text-[11px] font-semibold text-slate-700">Choose columns to show</p>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              const locked = !!col.alwaysVisible;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(col.key)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-slate-800">{col.label}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[10px] font-medium text-brand-600 hover:text-indigo-800"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-medium text-slate-600 hover:text-slate-800"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [limit] = useState(10);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [jsonFile, setJsonFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingPriceItemId, setEditingPriceItemId] = useState(null);
  const [editingDiscountItemId, setEditingDiscountItemId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingDiscountValue, setEditingDiscountValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    loadVisibleColumnsFromStorage(ITEM_LIST_COLUMNS_STORAGE_KEY, ITEM_LIST_TABLE_COLUMNS),
  );

  const activeColumns = useMemo(
    () => ITEM_LIST_TABLE_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns],
  );

  const tableColSpan = activeColumns.length + 1;

  const toggleColumn = useCallback((key) => {
    const def = ITEM_LIST_TABLE_COLUMNS.find((c) => c.key === key);
    if (def?.alwaysVisible) return;
    setVisibleColumns((prev) => {
      const has = prev.includes(key);
      const without = has ? prev.filter((k) => k !== key) : [...prev, key];
      const always = ITEM_LIST_TABLE_COLUMNS.filter((c) => c.alwaysVisible).map((c) => c.key);
      const next = [...new Set([...always, ...without])];
      if (next.length <= always.length && has) return prev;
      persistVisibleColumns(ITEM_LIST_COLUMNS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    const next = defaultVisibleKeysFor(ITEM_LIST_TABLE_COLUMNS);
    setVisibleColumns(next);
    persistVisibleColumns(ITEM_LIST_COLUMNS_STORAGE_KEY, next);
  }, []);

  const selectAllColumns = useCallback(() => {
    const next = ITEM_LIST_TABLE_COLUMNS.map((c) => c.key);
    setVisibleColumns(next);
    persistVisibleColumns(ITEM_LIST_COLUMNS_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (!columnsOpen) return;
    const onDocClick = (e) => {
      if (!e.target.closest?.("[data-showitems-column-picker]")) setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [columnsOpen]);

  /** Per-row warehouse summary for current table page */
  const [warehouseColLoading, setWarehouseColLoading] = useState(false);
  const [warehouseSummaries, setWarehouseSummaries] = useState({});
  const warehouseListOptsRef = useRef([]);

  /** Warehouse modal (same flow as item.jsx subcategory list) */
  const [warehouseUiItem, setWarehouseUiItem] = useState(null);
  const [warehouseListOpts, setWarehouseListOpts] = useState([]);
  const [warehouseListLoading, setWarehouseListLoading] = useState(false);
  const [pickWarehouseId, setPickWarehouseId] = useState("");
  const [whQtyPerSku, setWhQtyPerSku] = useState("1");
  const [whApplyLoading, setWhApplyLoading] = useState(false);
  const [whPresence, setWhPresence] = useState([]);
  const [whPresenceLoading, setWhPresenceLoading] = useState(false);

  const [pricingHistoryItem, setPricingHistoryItem] = useState(null);

  // Category dropdown states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [debouncedCategorySearchTerm, setDebouncedCategorySearchTerm] =
    useState("");
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryPagination, setCategoryPagination] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryLimit] = useState(10);

  // Subcategory dropdown states
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] =
    useState(false);
  const [subcategorySearchTerm, setSubcategorySearchTerm] = useState("");
  const [debouncedSubcategorySearchTerm, setDebouncedSubcategorySearchTerm] =
    useState("");
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

  // Fetch items when filters or search change
  useEffect(() => {
    setCurrentPage(1);
    fetchItems(1);
  }, [selectedCategoryId, selectedSubcategoryId, appliedSearchTerm]);

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
      const res = await getAllCategories(
        page,
        categoryLimit,
        debouncedCategorySearchTerm,
      );
      const data = res?.data?.data || res?.data || {};
      const categoryList = data.categories || data || [];
      const pag = data.pagination || null;

      if (page === 1 || debouncedCategorySearchTerm) {
        setAllCategories(categoryList);
      } else {
        setAllCategories((prev) => [...prev, ...categoryList]);
      }

      if (pag) {
        const totalPages =
          pag.pages ||
          pag.totalPages ||
          (pag.total ? Math.ceil(pag.total / categoryLimit) : 1);
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
      const res = await getAllSubcategories(
        page,
        subcategoryLimit,
        debouncedSubcategorySearchTerm,
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
        const totalPages =
          pag.pages ||
          pag.totalPages ||
          (pag.total ? Math.ceil(pag.total / subcategoryLimit) : 1);
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
        debouncedSubcategorySearchTerm,
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
        const totalPages =
          pag.pages ||
          pag.totalPages ||
          (pag.total ? Math.ceil(pag.total / subcategoryLimit) : 1);
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

  /** Normalize item list + pagination from various backend shapes (apiConnector returns response body). */
  const parseItemsResponse = (res) => {
    if (res == null) return { items: [], pagination: null };

    const tryPayload = (payload) => {
      if (!payload || typeof payload !== "object") return null;
      const items =
        (Array.isArray(payload.items) && payload.items) ||
        (Array.isArray(payload.results) && payload.results) ||
        (Array.isArray(payload.products) && payload.products) ||
        (Array.isArray(payload.data) ? payload.data : null) ||
        (Array.isArray(payload) ? payload : null);
      const pagination =
        payload.pagination ||
        payload.meta ||
        payload.pageInfo ||
        null;
      if (items) return { items, pagination };
      return null;
    };

    // Direct: { items, pagination }
    let out = tryPayload(res);
    if (out) return out;

    // { data: { items, pagination } }
    if (res.data && typeof res.data === "object") {
      out = tryPayload(res.data);
      if (out) return out;
      // { data: { data: { items } } }
      if (res.data.data && typeof res.data.data === "object") {
        out = tryPayload(res.data.data);
        if (out) return out;
      }
    }

    return { items: [], pagination: null };
  };

  /** Turn axios/HTML error bodies into a short UI message */
  const formatItemsLoadError = (err) => {
    const raw =
      (typeof err === "string" && err) ||
      err?.message ||
      err?.response?.data?.message ||
      "";
    const s = String(raw);
    if (s.includes("<!DOCTYPE") || s.includes("Cannot GET")) {
      return "Could not reach the products API (404 or wrong path). Check that the backend exposes GET /items/search (or /items/get/subcategory/:id) under your API base URL.";
    }
    return s.trim() || "Failed to load items";
  };

  /**
   * List products: many backends do not implement GET /items/getAll (404).
   * Prefer search (works with empty search for “all”) and subcategory route when filtered.
   */
  const fetchItems = async (page = 1) => {
    setLoading(true);
    setError(null);

    const q = (appliedSearchTerm || "").trim();

    const runSearchItems = () => {
      const queryParams = { page, limit };
      // Backend expects `keywords` for text search (searchItems also accepts legacy `search`)
      if (q) queryParams.keywords = q;
      if (selectedCategoryId) queryParams.categoryId = selectedCategoryId;
      if (selectedSubcategoryId)
        queryParams.subcategoryId = selectedSubcategoryId;
      return searchItems(queryParams);
    };

    try {
      let res;

      if (selectedSubcategoryId) {
        try {
          res = await getItemsBySubcategory(
            selectedSubcategoryId,
            page,
            limit,
            q
          );
        } catch (subErr) {
          console.warn(
            "[ShowItems] getItemsBySubcategory failed, falling back to searchItems:",
            subErr
          );
          res = await runSearchItems();
        }
      } else {
        res = await runSearchItems();
      }

      const { items: itemsList, pagination: pag } = parseItemsResponse(res);
      setItems(itemsList);
      setPagination(pag);
    } catch (err) {
      console.error("Failed to load items", err);
      setError(formatItemsLoadError(err));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    warehouseListOptsRef.current = warehouseListOpts;
  }, [warehouseListOpts]);

  const fetchWarehousePresenceForItem = useCallback(async (item, opts) => {
    const itemIdStr = String(item._id || item.productId || "");
    const nameQ = (item.name || "").trim();
    if (!nameQ || !opts?.length) return [];
    const rows = await Promise.all(
      opts.map(async (wh) => {
        try {
          const stockRes = await getWarehouseStock(wh.id, 1, 200, {
            itemSearch: nameQ,
          });
          const list = normalizeWarehouseRows(stockRes);
          const mine = list.filter((r) => {
            if (r.itemId && String(r.itemId) === itemIdStr) return true;
            return String(r.productName || "").trim() === nameQ;
          });
          const totalQty = mine.reduce(
            (s, r) => s + (Number(r.quantity) || 0),
            0,
          );
          return {
            id: wh.id,
            name: wh.name,
            code: wh.code,
            city: wh.city,
            skuLines: mine.length,
            totalQty,
          };
        } catch {
          return {
            id: wh.id,
            name: wh.name,
            code: wh.code,
            city: wh.city,
            skuLines: 0,
            totalQty: 0,
            fetchError: true,
          };
        }
      }),
    );
    return [...rows].sort(
      (a, b) => b.totalQty - a.totalQty || a.name.localeCompare(b.name),
    );
  }, []);

  const updateWarehouseSummaryForItem = useCallback(
    async (item, opts) => {
      const k = itemRowKey(item);
      if (!k || !opts?.length) return;
      const presence = await fetchWarehousePresenceForItem(item, opts);
      const withStock = presence.filter(
        (p) => p.totalQty > 0 || p.skuLines > 0,
      );
      setWarehouseSummaries((prev) => ({
        ...prev,
        [k]: {
          hasAny: withStock.length > 0,
          names: withStock.map((w) => w.name),
          summary:
            withStock.length === 0
              ? "Not in any warehouse"
              : withStock.map((w) => w.name).join(", "),
        },
      }));
    },
    [fetchWarehousePresenceForItem],
  );

  useEffect(() => {
    if (loading || items.length === 0) {
      setWarehouseColLoading(false);
      if (items.length === 0) setWarehouseSummaries({});
      return;
    }
    let cancelled = false;
    (async () => {
      setWarehouseColLoading(true);
      try {
        const res = await getWarehouses(1, 100, "");
        const payload = res?.data ?? {};
        const raw = payload.data ?? payload.warehouses ?? [];
        const opts = (raw || []).map((wh, idx) => {
          const addr = wh.address || {};
          return {
            id: String(wh._id || wh.id || `tmp-${idx}`),
            name: wh.name || "—",
            code: wh.code || "",
            city: addr.city || "",
          };
        });
        const nextMap = {};
        for (const item of items) {
          if (cancelled) return;
          const k = itemRowKey(item);
          if (!k) continue;
          const presence = await fetchWarehousePresenceForItem(item, opts);
          if (cancelled) return;
          const withStock = presence.filter(
            (p) => p.totalQty > 0 || p.skuLines > 0,
          );
          nextMap[k] = {
            hasAny: withStock.length > 0,
            names: withStock.map((w) => w.name),
            summary:
              withStock.length === 0
                ? "Not in any warehouse"
                : withStock.map((w) => w.name).join(", "),
          };
        }
        if (!cancelled) setWarehouseSummaries(nextMap);
      } catch (e) {
        console.error("[ShowItems] warehouse summaries", e);
        if (!cancelled) setWarehouseSummaries({});
      } finally {
        if (!cancelled) setWarehouseColLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, loading, fetchWarehousePresenceForItem]);

  const openWarehouseStockModal = useCallback(
    async (item) => {
      setWarehouseUiItem(item);
      setPickWarehouseId("");
      setWhQtyPerSku("1");
      setWarehouseListOpts([]);
      setWhPresence([]);
      setWarehouseListLoading(true);
      setWhPresenceLoading(true);
      try {
        const res = await getWarehouses(1, 100, "");
        const payload = res?.data ?? {};
        const raw = payload.data ?? payload.warehouses ?? [];
        const opts = (raw || []).map((wh, idx) => {
          const addr = wh.address || {};
          return {
            id: String(wh._id || wh.id || `tmp-${idx}`),
            name: wh.name || "—",
            code: wh.code || "",
            city: addr.city || "",
          };
        });
        setWarehouseListOpts(opts);
        setPickWarehouseId(opts[0]?.id || "");

        const presence = await fetchWarehousePresenceForItem(item, opts);
        setWhPresence(presence);
      } catch (e) {
        toast.error(e?.message || "Could not load warehouses");
      } finally {
        setWarehouseListLoading(false);
        setWhPresenceLoading(false);
      }
    },
    [fetchWarehousePresenceForItem],
  );

  const refreshWarehousePresence = useCallback(async () => {
    if (!warehouseUiItem || warehouseListOpts.length === 0) return;
    setWhPresenceLoading(true);
    try {
      const rows = await fetchWarehousePresenceForItem(
        warehouseUiItem,
        warehouseListOpts,
      );
      setWhPresence(rows);
    } catch {
      toast.error("Could not refresh warehouse stock");
    } finally {
      setWhPresenceLoading(false);
    }
  }, [warehouseUiItem, warehouseListOpts, fetchWarehousePresenceForItem]);

  const handleAddAllSkusToWarehouse = useCallback(async () => {
    if (!warehouseUiItem || !pickWarehouseId) {
      toast.error("Choose a warehouse");
      return;
    }
    const q = Number(whQtyPerSku);
    if (!Number.isInteger(q) || q < 1) {
      toast.error("Enter a positive whole number (qty per SKU)");
      return;
    }
    const itemId = String(warehouseUiItem._id || warehouseUiItem.productId);
    setWhApplyLoading(true);
    try {
      let applied = [];
      let failed = [];
      try {
        const res = await addWarehouseStockFromItem(pickWarehouseId, {
          itemId,
          quantity: q,
        });
        const data = res?.data ?? {};
        applied = data.applied ?? [];
        failed = data.failed ?? [];
      } catch (bulkErr) {
        if (!isWarehouseFromItemRouteUnavailable(bulkErr)) throw bulkErr;
        let doc = warehouseUiItem;
        let skus = collectSkuListFromItem(doc);
        if (skus.length === 0) {
          try {
            const r = await getSingleItem(itemId);
            const inner = r?.data ?? {};
            const full = inner.item ?? inner;
            if (full?.variants) doc = full;
            skus = collectSkuListFromItem(doc);
          } catch {
            /* ignore */
          }
        }
        if (skus.length === 0) {
          toast.error("Could not resolve SKUs for this product");
          return;
        }
        for (const sku of skus) {
          try {
            await updateWarehouseStock(pickWarehouseId, { sku, quantity: q });
            applied.push(sku);
          } catch (e) {
            failed.push({
              sku,
              message:
                (e && typeof e === "object" && e.message) ||
                String(e || "Failed"),
            });
          }
        }
      }
      if (failed.length === 0) {
        toast.success(`Moved stock for ${applied.length} SKU(s)`);
      } else {
        toast.error(
          `${applied.length} SKU(s) ok, ${failed.length} failed${
            failed[0]?.message ? `: ${failed[0].message}` : ""
          }`,
        );
      }
      await refreshWarehousePresence();
      await updateWarehouseSummaryForItem(
        warehouseUiItem,
        warehouseListOptsRef.current,
      );
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Update failed",
      );
    } finally {
      setWhApplyLoading(false);
    }
  }, [
    warehouseUiItem,
    pickWarehouseId,
    whQtyPerSku,
    refreshWarehousePresence,
    updateWarehouseSummaryForItem,
  ]);

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
    const selected = allCategories.find(
      (cat) => cat._id === selectedCategoryId,
    );
    return selected?.name || selected?.title || "Unknown Category";
  };

  const getSelectedSubcategoryName = () => {
    if (!selectedSubcategoryId)
      return selectedCategoryId
        ? "Select Subcategory"
        : "Select Category First";
    const selected = allSubcategories.find(
      (sub) => sub._id === selectedSubcategoryId,
    );
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

  const categoryTotalPages =
    categoryPagination?.pages ||
    (categoryPagination?.total
      ? Math.ceil(categoryPagination.total / categoryLimit)
      : 1) ||
    1;

  const subcategoryTotalPages =
    subcategoryPagination?.pages ||
    (subcategoryPagination?.total
      ? Math.ceil(subcategoryPagination.total / subcategoryLimit)
      : 1) ||
    1;

  // Use items directly from API (search is handled by API)
  const filteredItems = items;

  // Navigation handlers
  const openEdit = (item) => {
    const categoryId = item.categoryId || selectedCategoryId;
    const subcategoryId = item.subcategoryId || selectedSubcategoryId;

    if (categoryId && subcategoryId) {
      navigate(
        `/admin/inventory/items/${categoryId}/${subcategoryId}/edit/${item._id || item.productId}`,
      );
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
      navigate(
        `/admin/inventory/items/${selectedCategoryId}/${selectedSubcategoryId}/create`,
      );
    } else {
      alert("Please select both category and subcategory to create a new item");
    }
  };

  const handleSearchClick = () => {
    const normalized = searchTerm.trim();
    if (!normalized) return;
    setAppliedSearchTerm(normalized);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setAppliedSearchTerm("");
  };
  const handleBulkUpload = async () => {
    if (!jsonFile) {
      alert("Please select JSON file");
      return;
    }

    if (imageFiles.length === 0) {
      alert("Please select product images");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("products", jsonFile);

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await bulkUploadItems(formData);

      alert(res?.data?.message || "Bulk upload completed");

      setShowBulkUpload(false);
      setJsonFile(null);
      setImageFiles([]);

      fetchItems(1);
    } catch (err) {
      console.error(err);
      alert("Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startPriceEdit = (item) => {
    setEditingDiscountItemId(null);
    setEditingPriceItemId(item._id || item.productId);
    setEditingPriceValue(String(item.price ?? ""));
  };

  const startDiscountEdit = (item) => {
    setEditingPriceItemId(null);
    setEditingDiscountItemId(item._id || item.productId);
    setEditingDiscountValue(
      item.discountedPrice === null || item.discountedPrice === undefined
        ? ""
        : String(item.discountedPrice),
    );
  };

  const cancelInlineEdit = () => {
    setEditingPriceItemId(null);
    setEditingDiscountItemId(null);
    setEditingPriceValue("");
    setEditingDiscountValue("");
  };

  const saveInlinePrice = async (itemId) => {
    const numericPrice = Number(editingPriceValue);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert("Please enter a valid MRP");
      return;
    }
    try {
      setSavingPrice(true);
      const formData = new FormData();
      formData.append("price", String(numericPrice));
      await updateItem(itemId, formData);
      setEditingPriceItemId(null);
      setEditingPriceValue("");
      await fetchItems(currentPage);
    } catch (error) {
      console.error("Failed to update MRP:", error);
      alert(error?.message || "Failed to update MRP");
    } finally {
      setSavingPrice(false);
    }
  };

  const saveInlineDiscount = async (itemId) => {
    const hasValue = String(editingDiscountValue).trim() !== "";
    const numericDiscount = Number(editingDiscountValue);
    if (hasValue && (Number.isNaN(numericDiscount) || numericDiscount < 0)) {
      alert("Please enter a valid discounted price");
      return;
    }
    try {
      setSavingPrice(true);
      const formData = new FormData();
      formData.append("discountedPrice", hasValue ? String(numericDiscount) : "");
      await updateItem(itemId, formData);
      setEditingDiscountItemId(null);
      setEditingDiscountValue("");
      await fetchItems(currentPage);
    } catch (error) {
      console.error("Failed to update discounted price:", error);
      alert(error?.message || "Failed to update discounted price");
    } finally {
      setSavingPrice(false);
    }
  };

  const saveComingSoon = async (itemId, { isComingSoon, launchDate }) => {
    try {
      const formData = new FormData();
      formData.append("isComingSoon", String(Boolean(isComingSoon)));
      formData.append("launchDate", launchDate || "");
      await updateItem(itemId, formData);
      setItems((prev) =>
        prev.map((row) =>
          String(row._id) === String(itemId)
            ? { ...row, isComingSoon: Boolean(isComingSoon), launchDate: launchDate || null }
            : row,
        ),
      );
      toast.success("Coming soon updated");
    } catch (error) {
      console.error("Failed to update coming soon:", error);
      toast.error(error?.message || "Failed to update coming soon");
      throw error;
    }
  };

  const tableMinWidth = Math.max(420, activeColumns.length * 100 + 72);

  const renderItemCell = (key, item, index) => {
    const rowId = item._id || item.productId;
    switch (key) {
      case "index":
        return (
          <td className={`${tdClass} text-slate-400 tabular-nums`}>
            {(currentPage - 1) * limit + index + 1}
          </td>
        );
      case "image":
        return (
          <td className={tdClass}>
            <img
              src={
                item?.thumbnail ||
                item?.images?.[0] ||
                "https://via.placeholder.com/50"
              }
              alt={item.name}
              onClick={() =>
                setZoomedImage(
                  item?.thumbnail ||
                    item?.images?.[0] ||
                    "https://via.placeholder.com/50",
                )
              }
              className="h-9 w-9 rounded-md border border-slate-200 object-cover cursor-pointer hover:opacity-80 transition-opacity"
            />
          </td>
        );
      case "name":
        return (
          <td className={`${tdClass} font-medium text-slate-900 max-w-[140px]`}>
            <span className="line-clamp-2 leading-snug" title={item.name}>
              {item.name || "—"}
            </span>
          </td>
        );
      case "productId":
        return (
          <td className={`${tdClass} font-mono text-[10px] text-slate-500 max-w-[90px]`}>
            <span className="line-clamp-2 break-all" title={item.productId}>
              {item.productId || "—"}
            </span>
          </td>
        );
      case "description":
        return (
          <td
            className={`${tdClass} max-w-[120px]`}
            title={item.shortDescription || item.description}
          >
            <span className="line-clamp-2 text-slate-500">
              {item.shortDescription || item.description || "—"}
            </span>
          </td>
        );
      case "seo":
        return (
          <td
            className={`${tdClass} max-w-[120px]`}
            title={[
              item.metaTitle && `Title: ${item.metaTitle}`,
              item.metaDescription && `Desc: ${item.metaDescription}`,
              Array.isArray(item.metaTags) &&
                item.metaTags.length &&
                `Tags: ${item.metaTags.join(", ")}`,
            ]
              .filter(Boolean)
              .join("\n")}
          >
            <div className="font-medium text-slate-800 line-clamp-1 text-[10px]">
              {String(item.metaTitle || "").trim() || "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">
              {Array.isArray(item.metaTags) && item.metaTags.length > 0
                ? item.metaTags.join(", ")
                : ""}
            </div>
          </td>
        );
      case "sizeChart":
        return (
          <td className={`${tdClass} text-center`}>
            {itemHasSizeChartContent(item) ? (
              <span className={badgeActive}>Yes</span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>
        );
      case "warehouse":
        return (
          <td className={`${tdClass} align-top`}>
            <div className="flex flex-col gap-1 max-w-[160px]">
              {warehouseColLoading ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  …
                </span>
              ) : !(item.name || "").trim() ? (
                <span className="text-[10px] text-amber-700" title="Product name required">
                  No name
                </span>
              ) : (
                <>
                  {warehouseSummaries[itemRowKey(item)]?.hasAny ? (
                    <span
                      className="text-[10px] font-medium text-emerald-700 line-clamp-2 leading-snug"
                      title={warehouseSummaries[itemRowKey(item)]?.summary || ""}
                    >
                      {warehouseSummaries[itemRowKey(item)]?.summary}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {warehouseSummaries[itemRowKey(item)]?.summary || "—"}
                    </span>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openWarehouseStockModal(item);
                }}
                className="inline-flex items-center gap-0.5 self-start rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-colors"
                title="Warehouse stock"
              >
                <Warehouse className="h-3 w-3" />
                Manage
              </button>
            </div>
          </td>
        );
      case "mrp":
        return (
          <td className={`${tdClass} text-right font-medium text-slate-800`}>
            {editingPriceItemId === rowId ? (
              <div className="flex items-center justify-end gap-2">
                <input
                  autoFocus
                  value={editingPriceValue}
                  onChange={(e) => setEditingPriceValue(e.target.value)}
                  className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-[11px]"
                  placeholder="MRP"
                />
                <button
                  type="button"
                  onClick={() => saveInlinePrice(rowId)}
                  disabled={savingPrice}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelInlineEdit}
                  disabled={savingPrice}
                  className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-0.5">
                <span className="tabular-nums">₹{item.price || 0}</span>
                <button
                  type="button"
                  onClick={() => startPriceEdit(item)}
                  className="rounded p-0.5 text-slate-400 hover:bg-indigo-50 hover:text-brand-600 transition-colors"
                  title="Edit MRP"
                >
                  <Edit className="h-3 w-3" />
                </button>
              </div>
            )}
          </td>
        );
      case "discount":
        return (
          <td className={`${tdClass} text-right`}>
            {editingDiscountItemId === rowId ? (
              <div className="flex items-center justify-end gap-2">
                <input
                  autoFocus
                  value={editingDiscountValue}
                  onChange={(e) => setEditingDiscountValue(e.target.value)}
                  className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-[11px]"
                  placeholder="Disc."
                />
                <button
                  type="button"
                  onClick={() => saveInlineDiscount(rowId)}
                  disabled={savingPrice}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelInlineEdit}
                  disabled={savingPrice}
                  className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-0.5">
                {item.discountedPrice ? (
                  <span className="font-medium text-emerald-700 tabular-nums">
                    ₹{item.discountedPrice}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
                <button
                  type="button"
                  onClick={() => startDiscountEdit(item)}
                  className="rounded p-0.5 text-slate-400 hover:bg-indigo-50 hover:text-brand-600 transition-colors"
                  title="Edit discount"
                >
                  <Edit className="h-3 w-3" />
                </button>
              </div>
            )}
          </td>
        );
      case "pricingHistory":
        return (
          <td className={`${tdClass} text-center`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log("[pricing-history][ShowItems] History clicked", {
                  _id: item._id,
                  productId: item.productId,
                  name: item.name,
                });
                setPricingHistoryItem(item);
              }}
              className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors whitespace-nowrap"
              title="View pricing history"
            >
              History
            </button>
          </td>
        );
      case "createdAt":
        return (
          <td
            className={`${tdClass} whitespace-nowrap text-slate-500`}
            title={item.createdAt ? new Date(item.createdAt).toISOString() : undefined}
          >
            {formatItemListDateTime(item.createdAt)}
          </td>
        );
      case "updatedAt":
        return (
          <td
            className={`${tdClass} whitespace-nowrap text-slate-500`}
            title={item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined}
          >
            {formatItemListDateTime(item.updatedAt)}
          </td>
        );
      case "comingSoon":
        return (
          <td className={tdClass}>
            <ComingSoonListCell item={item} onSave={saveComingSoon} compact />
          </td>
        );
      case "status":
        return (
          <td className={`${tdClass} text-center`}>
            {item.isActive ? (
              <span className={badgeActive}>Active</span>
            ) : (
              <span className={badgeInactive}>Off</span>
            )}
          </td>
        );
      default:
        return <td className={tdClass}>—</td>;
    }
  };

  const thAlign = (key) => {
    if (key === "sizeChart" || key === "status" || key === "pricingHistory") return "text-center";
    if (key === "mrp" || key === "discount") return "text-right";
    return "text-left";
  };

  return (
    <div>
      <div className="mx-auto max-w-[1600px]">
        <p className="mb-3 text-[10px] leading-relaxed text-slate-500 max-w-2xl">
          Move central stock to a warehouse via{" "}
          <Link
            to="/admin/inventory/stock-management"
            className="font-medium text-brand-600 hover:text-indigo-800 underline-offset-2 hover:underline"
          >
            Stock management
          </Link>
          {" "}→ pick warehouse, search item, use &quot;Add all SKUs from one item&quot;.
        </p>

      <div className="py-1">
        {/* Filters */}
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Category Dropdown */}
            <div>
              <label className={labelClass}>Category</label>
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() =>
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                  }
                  disabled={loadingCategories}
                  className={dropdownBtnClass}
                >
                  <span className="truncate text-left">
                    {loadingCategories
                      ? "Loading..."
                      : getSelectedCategoryName()}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-stone-500 transition-transform flex-shrink-0 ml-2 ${
                      isCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-border rounded-lg shadow-lg max-h-96 flex flex-col">
                    <div className="p-3 border-b border-border sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
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
                          className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100/20 focus:border-brand-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 min-h-0">
                      {loadingCategories && allCategories.length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-sm">
                          Loading categories...
                        </div>
                      ) : getDisplayedCategories().length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-sm">
                          {categorySearchTerm
                            ? "No categories found matching your search"
                            : "No categories available"}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCategorySelect("")}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50/30 transition-colors ${
                              selectedCategoryId === ""
                                ? "bg-canvas-muted font-semibold text-black"
                                : "text-stone-700"
                            }`}
                          >
                            All Categories
                          </button>
                          {getDisplayedCategories().map((cat) => (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => handleCategorySelect(cat._id)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50/30 transition-colors border-t border-gray-100 ${
                                selectedCategoryId === cat._id
                                  ? "bg-canvas-muted font-semibold text-black"
                                  : "text-stone-700"
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
                                className="w-full px-4 py-2.5 text-sm text-stone-600 hover:bg-brand-50/30 border-t border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingCategories
                                  ? "Loading..."
                                  : "Load More..."}
                              </button>
                            )}
                        </>
                      )}
                    </div>

                    {getDisplayedCategories().length > 0 && (
                      <div className="p-3 border-t border-border bg-canvas-muted sticky bottom-0">
                        <div className="flex items-center justify-between text-xs text-stone-600">
                          <span>
                            {debouncedCategorySearchTerm
                              ? `Found ${getDisplayedCategories().length} result${getDisplayedCategories().length !== 1 ? "s" : ""}`
                              : categoryPagination
                                ? `Page ${categoryCurrentPage} of ${categoryTotalPages} (${allCategories.length} total)`
                                : `Showing ${getDisplayedCategories().length} categories`}
                          </span>
                          {!debouncedCategorySearchTerm &&
                            categoryPagination &&
                            categoryTotalPages > 1 && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (categoryCurrentPage > 1) {
                                      setCategoryCurrentPage(
                                        categoryCurrentPage - 1,
                                      );
                                    }
                                  }}
                                  disabled={
                                    categoryCurrentPage === 1 ||
                                    loadingCategories
                                  }
                                  className="px-2 py-1 text-xs border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      categoryCurrentPage < categoryTotalPages
                                    ) {
                                      setCategoryCurrentPage(
                                        categoryCurrentPage + 1,
                                      );
                                    }
                                  }}
                                  disabled={
                                    categoryCurrentPage >= categoryTotalPages ||
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

            {/* Subcategory Dropdown */}
            <div>
              <label className={labelClass}>Subcategory</label>
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
                  className={dropdownBtnClass}
                >
                  <span className="truncate text-left">
                    {loadingSubcategories
                      ? "Loading..."
                      : !selectedCategoryId
                        ? "Select category first"
                        : getSelectedSubcategoryName()}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-stone-500 transition-transform flex-shrink-0 ml-2 ${
                      isSubcategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSubcategoryDropdownOpen && selectedCategoryId && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-border rounded-lg shadow-lg max-h-96 flex flex-col">
                    <div className="p-3 border-b border-border sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
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
                          className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100/20 focus:border-brand-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 min-h-0">
                      {loadingSubcategories && allSubcategories.length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-sm">
                          Loading subcategories...
                        </div>
                      ) : getDisplayedSubcategories().length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-sm">
                          {subcategorySearchTerm
                            ? "No subcategories found matching your search"
                            : "No subcategories available"}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSubcategorySelect("")}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50/30 transition-colors ${
                              selectedSubcategoryId === ""
                                ? "bg-canvas-muted font-semibold text-black"
                                : "text-stone-700"
                            }`}
                          >
                            All Subcategories
                          </button>
                          {getDisplayedSubcategories().map((sub) => (
                            <button
                              key={sub._id}
                              type="button"
                              onClick={() => handleSubcategorySelect(sub._id)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50/30 transition-colors border-t border-gray-100 ${
                                selectedSubcategoryId === sub._id
                                  ? "bg-canvas-muted font-semibold text-black"
                                  : "text-stone-700"
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
                                className="w-full px-4 py-2.5 text-sm text-stone-600 hover:bg-brand-50/30 border-t border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingSubcategories
                                  ? "Loading..."
                                  : "Load More..."}
                              </button>
                            )}
                        </>
                      )}
                    </div>

                    {getDisplayedSubcategories().length > 0 && (
                      <div className="p-3 border-t border-border bg-canvas-muted sticky bottom-0">
                        <div className="flex items-center justify-between text-xs text-stone-600">
                          <span>
                            {debouncedSubcategorySearchTerm
                              ? `Found ${getDisplayedSubcategories().length} result${getDisplayedSubcategories().length !== 1 ? "s" : ""}`
                              : subcategoryPagination
                                ? `Page ${subcategoryCurrentPage} of ${subcategoryTotalPages} (${allSubcategories.length} total)`
                                : `Showing ${getDisplayedSubcategories().length} subcategories`}
                          </span>
                          {!debouncedSubcategorySearchTerm &&
                            subcategoryPagination &&
                            subcategoryTotalPages > 1 && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (subcategoryCurrentPage > 1) {
                                      setSubcategoryCurrentPage(
                                        subcategoryCurrentPage - 1,
                                      );
                                    }
                                  }}
                                  disabled={
                                    subcategoryCurrentPage === 1 ||
                                    loadingSubcategories
                                  }
                                  className="px-2 py-1 text-xs border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      subcategoryCurrentPage <
                                      subcategoryTotalPages
                                    ) {
                                      setSubcategoryCurrentPage(
                                        subcategoryCurrentPage + 1,
                                      );
                                    }
                                  }}
                                  disabled={
                                    subcategoryCurrentPage >=
                                      subcategoryTotalPages ||
                                    loadingSubcategories
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

            {/* Search Input */}
            <div>
              <label className={labelClass}>Search products</label>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Name, product ID, SKU…"
                    className={`${inputClass} pl-8`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchClick}
                  disabled={!searchTerm.trim()}
                  className={btnPrimary}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  disabled={!searchTerm && !appliedSearchTerm}
                  className={btnOutline}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">
            {pagination ? (
              <>
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {(currentPage - 1) * limit + 1}–
                  {Math.min(currentPage * limit, pagination.total || items.length)}
                </span>{" "}
                of {pagination.total || items.length}
              </>
            ) : (
              <span className="font-medium text-slate-700">{items.length}</span>
            )}{" "}
            items
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <ColumnPickerDropdown
              columns={ITEM_LIST_TABLE_COLUMNS}
              visibleKeys={visibleColumns}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSelectAll={selectAllColumns}
              open={columnsOpen}
              onOpenChange={setColumnsOpen}
            />
            <button
              type="button"
              onClick={() => setShowBulkUpload(true)}
              className={btnOutline}
            >
              Bulk upload
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={!selectedCategoryId || !selectedSubcategoryId}
              className={btnPrimary}
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
          </div>
        </div>

        <p className="mb-1.5 text-[10px] text-slate-400">
          {activeColumns.length} column{activeColumns.length === 1 ? "" : "s"} visible · scroll
          horizontally for more
        </p>

        {error && (
          <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Items table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className={tableScrollShell}>
            <table
              className="w-full border-collapse text-left"
              style={{ minWidth: `${tableMinWidth}px` }}
            >
              <thead>
                <tr>
                  {activeColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`${thClass} ${thAlign(col.key)} ${
                        col.key === "index" ? "w-8" : ""
                      } ${col.key === "name" ? "min-w-[120px]" : ""} ${
                        col.key === "description" || col.key === "seo"
                          ? "min-w-[100px]"
                          : ""
                      } ${col.key === "warehouse" ? "min-w-[120px]" : ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th
                    className={`${thClass} sticky right-0 text-right bg-slate-50/95 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-2 py-10 text-center text-xs text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        Loading items…
                      </span>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-2 py-10 text-center text-xs text-slate-500"
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={item._id || item.productId}
                      className="group border-t border-slate-100 transition-colors hover:bg-indigo-50/25"
                    >
                      {activeColumns.map((col) => (
                        <React.Fragment key={col.key}>
                          {renderItemCell(col.key, item, index)}
                        </React.Fragment>
                      ))}
                      <td
                        className={`${tdClass} sticky right-0 bg-white text-right group-hover:bg-indigo-50/25 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => openDetails(item)}
                            className="rounded p-1 text-slate-500 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-brand-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
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

        {warehouseUiItem ? (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close dialog"
              onClick={() => setWarehouseUiItem(null)}
            />
            <div
              className="relative w-full max-w-4xl mt-4 sm:mt-8 rounded-xl border border-border bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="showitems-wh-title"
            >
              <div className="flex items-start justify-between gap-3 px-4 py-2.5 border-b border-slate-200 shrink-0 bg-slate-50/50">
                <div className="min-w-0">
                  <h2
                    id="showitems-wh-title"
                    className="text-xs font-semibold text-slate-900 truncate"
                  >
                    Warehouse stock
                  </h2>
                  <p className="text-[11px] font-medium text-slate-800 mt-0.5 truncate">
                    {warehouseUiItem.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Product ID:{" "}
                    {warehouseUiItem.productId != null &&
                    String(warehouseUiItem.productId).trim() !== ""
                      ? String(warehouseUiItem.productId)
                      : String(warehouseUiItem._id)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWarehouseUiItem(null)}
                  className="p-2 rounded-lg border border-border hover:bg-canvas-muted transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
                <div className="rounded-xl border border-border bg-canvas-muted p-4">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Add all SKUs to a warehouse
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                    Moves the same quantity from <strong>central</strong> catalog
                    stock into the chosen warehouse for every SKU on this product.
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-stone-600 min-w-[200px] flex-1">
                      <span className="font-medium text-gray-800">Warehouse</span>
                      <select
                        value={pickWarehouseId}
                        onChange={(e) => setPickWarehouseId(e.target.value)}
                        disabled={warehouseListLoading || whApplyLoading}
                        className="rounded-lg border border-border px-3 py-2.5 text-sm bg-white disabled:opacity-50"
                      >
                        {warehouseListOpts.length === 0 ? (
                          <option value="">
                            {warehouseListLoading ? "Loading…" : "No warehouses"}
                          </option>
                        ) : (
                          warehouseListOpts.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                              {wh.name}
                              {wh.code ? ` (${wh.code})` : ""}
                              {wh.city ? ` — ${wh.city}` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-stone-600 w-full sm:w-28">
                      <span className="font-medium text-gray-800">Qty / SKU</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={whQtyPerSku}
                        onChange={(e) => setWhQtyPerSku(e.target.value)}
                        disabled={whApplyLoading}
                        className="rounded-lg border border-border px-3 py-2.5 text-sm disabled:opacity-50"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAllSkusToWarehouse}
                      disabled={
                        whApplyLoading ||
                        warehouseListLoading ||
                        !pickWarehouseId ||
                        !Number.isInteger(Number(whQtyPerSku)) ||
                        Number(whQtyPerSku) < 1
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {whApplyLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Applying…
                        </>
                      ) : (
                        "Add to warehouse"
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-stone-900">
                      Stock by warehouse
                    </h3>
                    <button
                      type="button"
                      onClick={refreshWarehousePresence}
                      disabled={
                        whPresenceLoading || warehouseListOpts.length === 0
                      }
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-canvas-muted transition-colors disabled:opacity-40"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-canvas-muted text-left text-xs uppercase tracking-wide text-stone-600">
                        <tr>
                          <th className="px-3 py-2.5 font-medium">Warehouse</th>
                          <th className="px-3 py-2.5 font-medium">Code</th>
                          <th className="px-3 py-2.5 font-medium">City</th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            SKU lines
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Total qty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {whPresenceLoading && whPresence.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-8 text-center text-stone-500"
                            >
                              <span className="inline-flex items-center gap-2 justify-center">
                                <Loader2 className="animate-spin" size={16} />
                                Loading warehouse stock…
                              </span>
                            </td>
                          </tr>
                        ) : whPresence.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center text-stone-500 text-sm"
                            >
                              No warehouses loaded, or this product has no name to
                              match stock.
                            </td>
                          </tr>
                        ) : (
                          whPresence.map((row) => (
                            <tr
                              key={row.id}
                              className={`border-t border-gray-100 ${
                                row.totalQty > 0 || row.skuLines > 0
                                  ? "bg-emerald-50/60"
                                  : "bg-white"
                              }`}
                            >
                              <td className="px-3 py-2.5 font-medium text-stone-900">
                                {row.name}
                                {row.fetchError ? (
                                  <span className="ml-1 text-xs text-amber-700">
                                    (load error)
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-stone-700">
                                {row.code || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-stone-700">
                                {row.city || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {row.skuLines}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                                {row.totalQty}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={`${btnOutline} gap-1`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
              {currentPage} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`${btnOutline} gap-1`}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showBulkUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900">
                Bulk upload products
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                JSON catalog + image files
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelClass}>Products JSON</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setJsonFile(e.target.files[0])}
                    className={`${inputClass} file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-0.5 file:text-[10px]`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Product images</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files))}
                    className={`${inputClass} file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-0.5 file:text-[10px]`}
                  />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkUpload(false)}
                    className={btnOutline}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    disabled={uploading}
                    className={btnPrimary}
                  >
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
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

      <ItemPricingHistoryModal
        open={Boolean(pricingHistoryItem)}
        onClose={() => setPricingHistoryItem(null)}
        itemId={pricingHistoryItem?._id || pricingHistoryItem?.productId}
        itemName={pricingHistoryItem?.name || ""}
        productId={pricingHistoryItem?.productId || ""}
      />
    </div>
  );
};

export default ShowItems;
