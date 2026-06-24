// src/pages/ItemInventory.jsx   (or wherever your centralstock.jsx is located)

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getItemsWithSkus,
  updateItem,
  setAllCentralStockUniform,
  SET_ALL_CENTRAL_STOCK_URLS,
} from '../../apis/Skuapi';
import { getSingleItem } from '../../apis/itemapi';
import { bulkUploadStockFile } from '../../apis/Warehouseapi';
import toast from 'react-hot-toast';
import {
  Search,
  Package,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import logger from '../../../utils/logger.js';

const stockLog = logger.child('CentralStock');

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition disabled:opacity-50 disabled:cursor-not-allowed';
const labelClass = 'mb-1 block text-[11px] font-medium text-slate-700';
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
const btnOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';

function normalizeItemId(item) {
  const id = item?.itemId ?? item?._id;
  return id != null ? String(id) : '';
}

function stopRowToggle(e) {
  e.stopPropagation();
}

function isUpdateItemResponseOk(res) {
  return (
    res?.success === true ||
    (res &&
      typeof res === 'object' &&
      res.success !== false &&
      (res.data != null || res.message))
  );
}

const MIN_THRESHOLD_STORAGE_KEY = 'centralStockMinThreshold';
const DEFAULT_MIN_CENTRAL = 10;
/** Max SKUs per item in one request — API enforces skuLimit ≤ 100 (see item.controller.js getItemsWithSkus). */
const SKU_PAGE_LIMIT = 100;

/** API allows limit 1–100 per request for GET /items/skus */
const ITEMS_PER_PAGE_CHOICES = [5, 10, 25, 50, 100];
const ITEMS_PER_PAGE_STORAGE_KEY = 'centralStockItemsPerPage';
const PAGE_WIDE_EVERY_SKU_KEY = 'centralStockPageWideEverySku';

function readStoredItemsPerPage() {
  try {
    const v = localStorage.getItem(ITEMS_PER_PAGE_STORAGE_KEY);
    if (v === 'all') return 'all';
    const n = parseInt(v, 10);
    if (ITEMS_PER_PAGE_CHOICES.includes(n)) return n;
  } catch {
    /* ignore */
  }
  return 10;
}

function readStoredMinThreshold() {
  try {
    const v = localStorage.getItem(MIN_THRESHOLD_STORAGE_KEY);
    if (v == null || v === '') return DEFAULT_MIN_CENTRAL;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_CENTRAL;
  } catch {
    return DEFAULT_MIN_CENTRAL;
  }
}

/** SKUs on this response page with central stock strictly below threshold. */
function getLowStockSkus(item, minThreshold) {
  const skus = item?.skus || [];
  return skus.filter((s) => Number(s?.stock ?? 0) < minThreshold);
}

/** Smallest central `stock` among loaded SKUs (e.g. sizes 2,3,5 → 2). */
function getMinCentralAmongLoadedSkus(item) {
  const skus = item?.skus || [];
  if (!skus.length) return null;
  let m = Infinity;
  for (const s of skus) {
    const n = Number(s?.stock ?? 0);
    if (!Number.isNaN(n)) m = Math.min(m, n);
  }
  return m === Infinity ? null : m;
}

/** All SKU codes from a full item document (variants → sizes). */
function collectSkuListFromItem(item) {
  if (!item?.variants?.length) return [];
  const set = new Set();
  for (const v of item.variants) {
    for (const sz of v.sizes || []) {
      const s = sz?.sku != null ? String(sz.sku).trim() : '';
      if (s) set.add(s);
    }
  }
  return [...set];
}

function readStoredPageWideEverySku() {
  try {
    return localStorage.getItem(PAGE_WIDE_EVERY_SKU_KEY) === '1';
  } catch {
    return false;
  }
}

const ItemInventory = () => {
  const initialItemsPerPage = readStoredItemsPerPage();
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: typeof initialItemsPerPage === 'number' ? initialItemsPerPage : 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [lowDetailItemId, setLowDetailItemId] = useState(null);
  const [minCentralStock, setMinCentralStock] = useState(readStoredMinThreshold);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [editingStock, setEditingStock] = useState({});

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkLastResult, setBulkLastResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  /** Per-item input: set central stock to same value for all loaded SKUs */
  const [bulkAllStockValue, setBulkAllStockValue] = useState({});
  const [bulkAllApplyingId, setBulkAllApplyingId] = useState(null);

  /** One value applied to every loaded SKU line on the current items page */
  const [pageWideBulkValue, setPageWideBulkValue] = useState("");
  const [pageWideBulkApplying, setPageWideBulkApplying] = useState(false);
  /** When “All results” is on: fetch each product and PATCH every SKU, not only table rows */
  const [pageWideEverySku, setPageWideEverySku] = useState(
    readStoredPageWideEverySku()
  );

  /** Entire-catalog fast path — Skuapi tries several POST paths until one exists */
  const [fastCatalogValue, setFastCatalogValue] = useState("");
  const [fastCatalogApplying, setFastCatalogApplying] = useState(false);
  const [fastCatalogLastResult, setFastCatalogLastResult] = useState(null);

  /** Inventory list load: indeterminate (single request) or page merge progress */
  const [loadProgress, setLoadProgress] = useState(null);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(MIN_THRESHOLD_STORAGE_KEY, String(minCentralStock));
    } catch {
      /* ignore */
    }
  }, [minCentralStock]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_WIDE_EVERY_SKU_KEY, pageWideEverySku ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [pageWideEverySku]);

  const fetchItems = useCallback(async () => {
    stockLog.debug("[CentralStock] fetchItems start", {
      page: pagination.page,
      itemsPerPage,
      search: debouncedSearch,
    });
    setLoading(true);
    setLoadProgress(
      itemsPerPage === "all"
        ? { type: "pages", pct: 0, page: 0, totalPages: 0 }
        : "indeterminate"
    );
    try {
      if (itemsPerPage === 'all') {
        const allItems = [];
        let page = 1;
        const chunkLimit = 100;
        let total = 0;
        let totalPages = 1;

        for (;;) {
          const res = await getItemsWithSkus(
            page,
            chunkLimit,
            1,
            SKU_PAGE_LIMIT,
            debouncedSearch
          );
          if (!res?.success || !Array.isArray(res?.data?.items)) {
            toast.error(res?.message || 'Failed to load items');
            setItems([]);
            setPagination((p) => ({ ...p, page: 1, totalPages: 1, total: 0 }));
            return;
          }
          const chunk = res.data.items;
          const pg = res.data.pagination || {};
          total = pg.total ?? total;
          totalPages = Math.max(1, pg.totalPages ?? 1);
          allItems.push(...chunk);
          const pct = Math.min(100, Math.round((page / totalPages) * 100));
          setLoadProgress({
            type: "pages",
            pct,
            page,
            totalPages,
          });
          if (chunk.length === 0 || page >= totalPages) break;
          page += 1;
        }

        setLoadProgress((prev) =>
          prev && typeof prev === "object" && prev.type === "pages"
            ? { ...prev, pct: 100, page: prev.totalPages || prev.page }
            : { type: "pages", pct: 100, page: totalPages, totalPages }
        );

        setItems(allItems);
        setPagination({
          page: 1,
          limit: allItems.length,
          total: total || allItems.length,
          totalPages: 1,
        });
        stockLog.debug("[CentralStock] fetchItems (all pages)", {
          itemCount: allItems.length,
          catalogTotal: total,
        });
      } else {
        const res = await getItemsWithSkus(
          pagination.page,
          itemsPerPage,
          1,
          SKU_PAGE_LIMIT,
          debouncedSearch
        );

        stockLog.debug("API Response:", res);

        if (res?.success && Array.isArray(res?.data?.items)) {
          const pg = res.data.pagination || {};
          stockLog.debug("[CentralStock] fetchItems success", {
            itemCount: res?.data?.items?.length ?? 0,
            pagination: pg,
          });
          setItems(res.data.items);
          setPagination({
            page: pg.page ?? pagination.page,
            limit: itemsPerPage,
            total: pg.total ?? 0,
            totalPages: pg.totalPages ?? 1,
          });
        } else {
          stockLog.warn("[CentralStock] fetchItems unexpected response", {
            success: res?.success,
            message: res?.message,
            hasItemsArray: Array.isArray(res?.data?.items),
          });
          toast.error(res?.message || 'Failed to load items');
          setItems([]);
        }
      }
    } catch (err) {
      stockLog.error('Fetch error:', err);
      const msg =
        (err && typeof err === 'object' && err.message) ||
        (typeof err === 'string' ? err : null);
      toast.error(msg || 'Error loading inventory');
      setItems([]);
    } finally {
      setLoading(false);
      setLoadProgress(null);
    }
  }, [pagination.page, itemsPerPage, debouncedSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const toggleExpand = (itemId) => {
    const id = String(itemId);
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const toggleLowDetail = (e, itemId) => {
    e.stopPropagation();
    setLowDetailItemId((prev) => (prev === itemId ? null : itemId));
  };

  const visibleItems = useMemo(() => {
    if (!showLowStockOnly) return items;
    return items.filter((item) => getLowStockSkus(item, minCentralStock).length > 0);
  }, [items, showLowStockOnly, minCentralStock]);

  const startEditing = (e, itemId, skuCode, currentStock) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    const id = String(itemId);
    const code = String(skuCode || '').trim();
    if (!id || !code) return;
    const key = `${id}-${code}`;
    setEditingStock((prev) => ({
      ...prev,
      [key]: currentStock ?? 0,
    }));
  };

  const saveStock = async (itemId, sku) => {
    stockLog.debug("[CentralStock] saveStock submit", {
      itemId,
      sku,
    });
    if (!itemId || !sku?.sku) {
      stockLog.warn("[CentralStock] saveStock invalid item/sku", { itemId, sku });
      toast.error('Invalid item or SKU');
      return;
    }

    const id = String(itemId);
    const skuCode = String(sku?.sku || '').trim();
    if (!skuCode) {
      toast.error('SKU code is missing');
      return;
    }
    const key = `${id}-${skuCode}`;
    const newStock = Number(editingStock[key]);
    stockLog.debug("[CentralStock] saveStock parsed stock", {
      key,
      raw: editingStock[key],
      parsed: newStock,
    });

    if (isNaN(newStock) || newStock < 0) {
      stockLog.warn("[CentralStock] saveStock validation failed", {
        key,
        newStock,
      });
      toast.error('Please enter a valid non-negative number');
      return;
    }

    try {
      const payload = {
        skus: [{
          skuId: sku.sku,          // ← IMPORTANT: using sku.sku as identifier
          stock: newStock
        }]
      };
      stockLog.debug("[CentralStock] updateItem request", { itemId, payload });

      const res = await updateItem(itemId, payload);
      stockLog.debug('Update response:', res);

      if (isUpdateItemResponseOk(res)) {
        toast.success('Stock updated');
        setItems((prev) =>
          prev.map((it) => {
            const itId = normalizeItemId(it);
            if (itId !== id) return it;
            return {
              ...it,
              skus: (it.skus || []).map((s) =>
                String(s?.sku || '').trim() === skuCode
                  ? { ...s, stock: newStock }
                  : s,
              ),
            };
          }),
        );
        setEditingStock((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        fetchItems().catch(() => {});
      } else {
        toast.error(res?.message || 'Update failed');
      }
    } catch (err) {
      stockLog.error('Update error:', err);
      toast.error(
        (err && typeof err === 'object' && err.message) || 'Failed to save stock',
      );
    }
  };

  const cancelEdit = (e, itemId, skuCode) => {
    e?.stopPropagation?.();
    const key = `${String(itemId)}-${String(skuCode || '').trim()}`;
    setEditingStock(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyStockToAllLoadedSkus = async (item) => {
    const itemId = item.itemId || item._id;
    if (!itemId) {
      toast.error("Invalid product");
      return;
    }
    const list = item.skus || [];
    if (!list.length) {
      toast.error("No SKUs loaded for this product — expand after list loads");
      return;
    }
    const raw = bulkAllStockValue[String(itemId)] ?? "";
    const newStock = Number(String(raw).trim());
    if (Number.isNaN(newStock) || newStock < 0 || !Number.isFinite(newStock)) {
      toast.error("Enter a valid non-negative stock number");
      return;
    }
    const idKey = String(itemId);
    const skuTotal = item.skuPagination?.total ?? list.length;
    if (skuTotal > list.length) {
      const ok = window.confirm(
        `This product has ${skuTotal} SKUs but only ${list.length} are loaded (API page limit). ` +
          `Update will apply only to these ${list.length} SKUs. Continue?`
      );
      if (!ok) return;
    } else if (list.length >= 5) {
      const ok = window.confirm(
        `Set central stock to ${newStock} for all ${list.length} loaded SKUs?`
      );
      if (!ok) return;
    }

    setBulkAllApplyingId(idKey);
    try {
      const payload = {
        skus: list
          .map((s) => String(s?.sku || "").trim())
          .filter(Boolean)
          .map((skuId) => ({ skuId, stock: newStock })),
      };
      if (!payload.skus.length) {
        toast.error("No valid SKU codes in the list");
        return;
      }

      const res = await updateItem(itemId, payload);
      // Clear loading as soon as the write returns — do not wait for list refresh
      // (a slow / hanging GET would otherwise keep the button stuck on "Saving…").
      setBulkAllApplyingId(null);

      if (isUpdateItemResponseOk(res)) {
        toast.success(
          `Updated central stock to ${newStock} for ${payload.skus.length} SKU(s)`
        );
        setBulkAllStockValue((prev) => ({ ...prev, [idKey]: "" }));
        fetchItems().catch((e) => {
          stockLog.error("[CentralStock] refresh after bulk SKU update", e);
          toast.error(
            (e && typeof e === "object" && e.message) ||
              "Stock saved but refreshing the list failed — try Search or reload"
          );
        });
      } else {
        toast.error(res?.message || "Bulk update failed");
      }
    } catch (err) {
      stockLog.error("[CentralStock] applyStockToAllLoadedSkus", err);
      toast.error(
        (err && typeof err === "object" && err.message) ||
          "Failed to update all SKUs"
      );
    } finally {
      setBulkAllApplyingId(null);
    }
  };

  const applyCentralStockToEntireCurrentPage = async () => {
    const newStock = Number(String(pageWideBulkValue).trim());
    if (Number.isNaN(newStock) || newStock < 0 || !Number.isFinite(newStock)) {
      toast.error("Enter a valid non-negative stock number");
      return;
    }
    if (!items.length) {
      toast.error("No products on this page");
      return;
    }

    const useFullCatalogSkus =
      itemsPerPage === "all" && pageWideEverySku;

    let totalLines = 0;
    let partialProducts = 0;
    for (const it of items) {
      const loaded = it.skus?.length || 0;
      const catalogTotal = it.skuPagination?.total ?? loaded;
      if (useFullCatalogSkus) {
        totalLines += catalogTotal;
      } else {
        totalLines += loaded;
        if (catalogTotal > loaded) partialProducts += 1;
      }
    }
    if (!useFullCatalogSkus && !totalLines) {
      toast.error("No SKU lines loaded — wait for the list to load");
      return;
    }
    if (useFullCatalogSkus && totalLines === 0) {
      toast.error("No SKU totals in list — reload or turn off “Every SKU”");
      return;
    }

    let msg = useFullCatalogSkus
      ? `Set central stock to ${newStock} for every SKU in each of ${items.length} product(s)?\n\n` +
        `This loads the full product from the server for each row (about ${totalLines} SKU(s) total) and may take a while.`
      : `Set central stock to ${newStock} for ${totalLines} SKU line(s) across ${items.length} product(s) on this page?`;
    if (!useFullCatalogSkus && partialProducts > 0) {
      msg += `\n\n${partialProducts} product(s) have extra SKUs not loaded here (API limit); only loaded lines will change.`;
    }
    if (!window.confirm(msg)) return;

    setPageWideBulkApplying(true);
    let ok = 0;
    let failed = 0;
    let skuLinesTouched = 0;
    try {
      for (const item of items) {
        const itemId = item.itemId || item._id;
        if (!itemId) {
          failed += 1;
          continue;
        }

        let skuIds = [];
        if (useFullCatalogSkus) {
          try {
            const r = await getSingleItem(String(itemId));
            const inner = r?.data ?? {};
            const full = inner.item ?? inner;
            skuIds = collectSkuListFromItem(full);
          } catch (e) {
            stockLog.error("[CentralStock] getSingleItem for page-wide", itemId, e);
            failed += 1;
            continue;
          }
          if (!skuIds.length) {
            failed += 1;
            continue;
          }
        } else {
          const list = item.skus || [];
          skuIds = list
            .map((s) => String(s?.sku || "").trim())
            .filter(Boolean);
          if (!skuIds.length) continue;
        }

        const payload = {
          skus: skuIds.map((skuId) => ({ skuId, stock: newStock })),
        };
        try {
          const res = await updateItem(itemId, payload);
          if (isUpdateItemResponseOk(res)) {
            ok += 1;
            skuLinesTouched += payload.skus.length;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) {
        toast.success(
          `Central stock set to ${newStock} for ${ok} product(s) (${skuLinesTouched} SKU line(s))`
        );
      } else {
        toast.error(
          `Partially updated: ${ok} product(s) ok, ${failed} failed — check console or retry`
        );
      }
      setPageWideBulkValue("");
      fetchItems().catch((e) => {
        stockLog.error("[CentralStock] refresh after page-wide stock", e);
        toast.error(
          (e && typeof e === "object" && e.message) ||
            "Saved but list refresh failed — reload the page"
        );
      });
    } finally {
      setPageWideBulkApplying(false);
    }
  };

  const runFastCatalogCentralStock = async () => {
    const n = Number(String(fastCatalogValue).trim());
    if (!Number.isInteger(n) || n < 0 || !Number.isFinite(n)) {
      toast.error("Enter a valid non-negative integer");
      return;
    }
    const msg1 =
      `Set central stock to ${n} for EVERY SKU line in the ENTIRE catalog (all products in the database).\n\n` +
      "This uses the server bulk path (same as the CLI script). Warehouse stock is not changed.\n\n" +
      "Continue?";
    if (!window.confirm(msg1)) return;
    if (
      !window.confirm(
        "Second confirmation: this overwrites catalog central stock for the whole store. Proceed?"
      )
    ) {
      return;
    }

    setFastCatalogApplying(true);
    setFastCatalogLastResult(null);
    try {
      const res = await setAllCentralStockUniform({ stock: n });
      if (res?.success) {
        const d = res.data ?? {};
        setFastCatalogLastResult(d);
        toast.success(
          res.message ||
            `Catalog updated: ${d.updatedItems ?? 0} product(s), ${d.totalSkuLines ?? 0} SKU line(s)`
        );
        setFastCatalogValue("");
        fetchItems().catch((e) => {
          stockLog.error("[CentralStock] refresh after fast catalog stock", e);
          toast.error(
            (e && typeof e === "object" && e.message) ||
              "Saved but list refresh failed — reload the page"
          );
        });
      } else {
        toast.error(res?.message || "Fast catalog update failed");
      }
    } catch (err) {
      stockLog.error("[CentralStock] runFastCatalogCentralStock", err);
      const status = err && typeof err === "object" ? err.status : undefined;
      const msg = String(
        (err && typeof err === "object" && err.message) || err || ""
      );
      if (
        status === 404 ||
        /cannot post|status code 404|<!doctype html>/i.test(msg)
      ) {
        toast.error(
          "Fast catalog API not deployed: all tried routes returned 404. Deploy latest KhushBackend (see amber box for paths) or run node scripts/set-all-sku-central-stock.js from the server."
        );
      } else {
        toast.error(msg.trim() || "Fast catalog update failed");
      }
    } finally {
      setFastCatalogApplying(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Choose a file (.json, .csv, .xlsx, .xls, or .xml)');
      return;
    }
    setBulkSubmitting(true);
    setBulkLastResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await bulkUploadStockFile(formData);
      if (res?.success) {
        const data = res.data ?? {};
        setBulkLastResult(data);
        const errCount = data.errors?.length ?? 0;
        const appliedCount = data.applied?.length ?? 0;
        if (errCount > 0) {
          toast.error(`Bulk finished with ${errCount} error(s); ${appliedCount} applied`);
        } else {
          toast.success(`Bulk stock applied (${appliedCount} operations)`);
        }
        setBulkFile(null);
        if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
        fetchItems();
      } else {
        toast.error(res?.message || 'Bulk upload failed');
      }
    } catch (err) {
      stockLog.error('[CentralStock] bulk upload', err);
      toast.error(typeof err === 'string' ? err : err?.message || 'Bulk upload failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80">
      <div className="mx-auto max-w-[1600px]">
            <div className="mb-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4 lg:ml-auto">
              <label className="block min-w-0">
                <span className={labelClass}>Min central stock</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={minCentralStock}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setMinCentralStock(Number.isFinite(n) && n >= 0 ? n : 0);
                  }}
                  className={inputClass}
                />
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>Products per page</span>
                <select
                  value={itemsPerPage === 'all' ? 'all' : String(itemsPerPage)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItemsPerPage(v === 'all' ? 'all' : Number(v));
                    setPagination((p) => ({ ...p, page: 1 }));
                    try {
                      localStorage.setItem(ITEMS_PER_PAGE_STORAGE_KEY, v);
                    } catch {
                      /* ignore */
                    }
                  }}
                  disabled={loading}
                  className={inputClass}
                >
                  {ITEMS_PER_PAGE_CHOICES.map((n) => (
                    <option key={n} value={String(n)}>
                      {n} per page
                    </option>
                  ))}
                  <option value="all">All results</option>
                </select>
              </label>
              <div className="relative min-w-0 sm:col-span-2">
                <span className={labelClass}>Search</span>
                <Search className="pointer-events-none absolute left-2.5 top-[1.65rem] h-3.5 w-3.5 text-slate-400" />
                <input
                  type="search"
                  placeholder="Name, product ID, SKU…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>

        <label className="mb-3 mt-2 inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Only products with low SKUs (on loaded lines)
        </label>

        {loading && loadProgress != null ? (
          <div
            className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 shadow-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-indigo-950 uppercase tracking-wide">
                Loading inventory
              </span>
              {loadProgress !== "indeterminate" &&
              loadProgress.type === "pages" ? (
                <span className="text-xs font-medium text-indigo-800 tabular-nums">
                  Page {loadProgress.page} / {loadProgress.totalPages} ·{" "}
                  {loadProgress.pct}%
                </span>
              ) : (
                <span className="text-xs font-medium text-indigo-700">
                  Please wait…
                </span>
              )}
            </div>
            <div className="h-2.5 w-full rounded-full bg-indigo-100 overflow-hidden">
              {loadProgress === "indeterminate" ? (
                <div
                  className="h-full w-[35%] rounded-full bg-indigo-600 shadow-sm"
                  style={{
                    animation:
                      "centralStockIndeterminateMove 1.05s ease-in-out infinite",
                  }}
                />
              ) : (
                <div
                  className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 ease-out shadow-sm"
                  style={{
                    width: `${Math.max(0, Math.min(100, loadProgress.pct))}%`,
                  }}
                />
              )}
            </div>
            {loadProgress !== "indeterminate" && loadProgress.type === "pages" ? (
              <p className="mt-2 text-[11px] text-indigo-900/70">
                Merging product pages (up to 100 items per request)…
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-indigo-900/70">
                Fetching products and SKU lines…
              </p>
            )}
          </div>
        ) : null}

        <div className="mb-3 space-y-2">
        <details className="group rounded-lg border border-violet-200 bg-violet-50/60 open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-violet-950 [&::-webkit-details-marker]:hidden">
            <span>Page-wide bulk update</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-violet-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-violet-200/80 px-3 py-3 sm:px-4">
          <p className="text-[11px] text-violet-900/85 max-w-3xl">
            Applies the <strong>same</strong> central quantity to SKUs for{" "}
            <strong>every product in the list below</strong>
            {itemsPerPage === 'all'
              ? ' (with “All results”, that is the full merged result set).'
              : ` (current page size: ${itemsPerPage} products).`}{' '}
            With <strong>All results</strong>, you can optionally update <strong>every SKU</strong> per
            product (full server fetch), not only the SKU rows visible in the table. If &quot;Only
            products with low SKUs&quot; is on, the list below is filtered, but this button still
            updates <strong>every product in the loaded array</strong>. Use file upload to change SKUs
            that are not in the current list.
          </p>
          {itemsPerPage === 'all' ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2.5 text-xs text-violet-950 max-w-3xl">
              <input
                type="checkbox"
                checked={pageWideEverySku}
                onChange={(e) => setPageWideEverySku(e.target.checked)}
                disabled={pageWideBulkApplying || loading}
                className="mt-0.5 h-4 w-4 rounded border-violet-400 text-violet-700 focus:ring-violet-500 disabled:opacity-50"
              />
              <span>
                <span className="font-semibold">Every SKU in each product</span>
                <span className="text-violet-900/85">
                  {' '}
                  — loads each product from the server and sets central stock for all SKUs (not only
                  up to {SKU_PAGE_LIMIT} rows shown per product). Slower, use for a full reset.
                </span>
              </span>
            </label>
          ) : null}
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-violet-900 w-full sm:w-44">
              <span className="font-medium">Stock value (every SKU)</span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="e.g. 50"
                value={pageWideBulkValue}
                onChange={(e) => setPageWideBulkValue(e.target.value)}
                disabled={pageWideBulkApplying || loading}
                className="rounded-lg border border-violet-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={applyCentralStockToEntireCurrentPage}
              disabled={
                pageWideBulkApplying ||
                loading ||
                !items.length ||
                String(pageWideBulkValue).trim() === ""
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pageWideBulkApplying ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {itemsPerPage === "all" && pageWideEverySku
                    ? "Updating every SKU…"
                    : "Updating page…"}
                </>
              ) : itemsPerPage === "all" && pageWideEverySku ? (
                "Update all SKUs (full fetch)"
              ) : (
                "Update all on this page"
              )}
            </button>
          </div>
          </div>
        </details>

        <details className="group rounded-lg border border-amber-200 bg-amber-50/70 open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-amber-950 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Entire catalog (server bulk)
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-amber-200/80 px-3 py-3 sm:px-4">
          <p className="text-[11px] text-amber-950/85 max-w-3xl">
            Sets the <strong>same</strong> central stock on <strong>every SKU line</strong> for{" "}
            <strong>all products</strong> in MongoDB in one server pass (bulkWrite — same logic as{" "}
            <code className="rounded bg-amber-100/80 px-1 text-[11px]">
              scripts/set-all-sku-central-stock.js
            </code>
            ). Does <strong>not</strong> change warehouse quantities. Admin only. The app calls these
            endpoints in order until one works (each under your API base, e.g.{" "}
            <code className="rounded bg-amber-100/80 px-1 text-[11px]">/api</code>
            ):{" "}
            {SET_ALL_CENTRAL_STOCK_URLS.map((p, i) => (
              <span key={p}>
                {i > 0 ? " · " : null}
                <code className="rounded bg-amber-100/80 px-1 text-[11px] whitespace-nowrap">
                  POST …{p}
                </code>
              </span>
            ))}
            . If every call returns 404, production is still on an old backend — deploy{" "}
            <strong>KhushBackend</strong> with these routes or use the CLI script above.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-amber-950 w-full sm:w-44">
              <span className="font-medium">Stock (every SKU, whole catalog)</span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="e.g. 200"
                value={fastCatalogValue}
                onChange={(e) => setFastCatalogValue(e.target.value)}
                disabled={fastCatalogApplying || loading}
                className="rounded-lg border border-amber-400 bg-white px-3 py-2.5 text-sm disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={runFastCatalogCentralStock}
              disabled={
                fastCatalogApplying ||
                loading ||
                String(fastCatalogValue).trim() === ""
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fastCatalogApplying ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Updating entire catalog…
                </>
              ) : (
                "Run fast catalog update"
              )}
            </button>
          </div>
          {fastCatalogLastResult != null ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-white/80 p-3 text-xs text-amber-950">
              <p className="font-semibold text-amber-900">Last run</p>
              <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-amber-800/80">Products examined</dt>
                  <dd className="font-mono tabular-nums">
                    {fastCatalogLastResult.examined ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-amber-800/80">Products updated</dt>
                  <dd className="font-mono tabular-nums">
                    {fastCatalogLastResult.updatedItems ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-amber-800/80">SKU lines</dt>
                  <dd className="font-mono tabular-nums">
                    {fastCatalogLastResult.totalSkuLines ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-amber-800/80">Skipped (no sizes)</dt>
                  <dd className="font-mono tabular-nums">
                    {fastCatalogLastResult.skippedNoSizes ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-brand-600" />
              Bulk stock file upload
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-3 py-3 sm:px-4">
          <p className="text-[11px] text-slate-500 max-w-3xl">
            Upload a file to update <strong>central</strong> stock and/or <strong>warehouse</strong> stock by SKU.
            Formats: JSON, CSV, Excel (.xlsx). Use columns <code className="text-indigo-700 bg-indigo-50 px-1 rounded">sku</code>,{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">central_stock</code> (optional),{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">warehouse_id</code> and{' '}
            <code className="text-indigo-700 bg-indigo-50 px-1 rounded">warehouse_delta</code> (optional).
            Max 2000 rows; duplicate SKUs in one file are rejected. See backend <code className="text-xs">docs/bulk-stock-upload-format.md</code>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".json,.csv,.xlsx,.xls,.xml,application/json,text/csv"
              disabled={bulkSubmitting}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setBulkFile(f);
                setBulkLastResult(null);
              }}
              className="block text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              type="button"
              disabled={bulkSubmitting || !bulkFile}
              onClick={handleBulkUpload}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSubmitting ? 'Uploading…' : 'Upload & apply'}
            </button>
            <details className="relative">
              <summary className="list-none cursor-pointer inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-border text-stone-700 hover:bg-brand-50/30">
                Download template
              </summary>
              <div className="absolute z-10 mt-2 w-52 rounded-lg border border-border bg-white shadow-lg p-1.5 space-y-1">
                <a
                  href="/templates/bulk-stock-upload.sample.csv"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-stone-700 hover:bg-canvas-muted"
                >
                  CSV format
                </a>
                <a
                  href="/templates/bulk-stock-upload.sample.json"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-stone-700 hover:bg-canvas-muted"
                >
                  JSON format
                </a>
                <a
                  href="/templates/bulk-stock-upload.sample.xml"
                  download
                  className="block rounded px-2 py-1.5 text-sm text-stone-700 hover:bg-canvas-muted"
                >
                  Excel format
                </a>
              </div>
            </details>
          </div>
          {bulkLastResult?.errors?.length > 0 ? (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold mb-1">Row errors ({bulkLastResult.errors.length})</p>
              <ul className="space-y-1 font-mono">
                {bulkLastResult.errors.map((row, i) => (
                  <li key={`${row.sku}-${row.rowIndex}-${i}`}>
                    {row.sku ? `${row.sku}: ` : ''}{row.rowIndex != null ? `(row ${row.rowIndex}) ` : ''}{row.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          </div>
        </details>
        </div>

        {loading && loadProgress == null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading inventory…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-xs text-slate-500 shadow-sm">
            No items found {search && `for "${search}"`}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-xs text-slate-500 shadow-sm">
            No products have SKUs below the minimum ({minCentralStock}) on the loaded SKU page.
            <button
              type="button"
              onClick={() => setShowLowStockOnly(false)}
              className="block mx-auto mt-3 text-sm text-brand-600 hover:text-indigo-800 font-medium"
            >
              Show all products
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => {
              const itemId = normalizeItemId(item) || 'no-id';
              const isExpanded = expandedItemId === itemId;
              const skuCount = item.skuPagination?.total || item.skus?.length || 0;
              const loadedSkuCount = item.skus?.length || 0;
              const skuTotal = item.skuPagination?.total ?? loadedSkuCount;
              const partialSkus = skuTotal > loadedSkuCount;
              const lowSkus = getLowStockSkus(item, minCentralStock);
              const lowCount = lowSkus.length;
              const showLowPanel = lowDetailItemId === itemId;
              const minAcrossSkus = getMinCentralAmongLoadedSkus(item);

              return (
                <div
                  key={itemId}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors sm:px-4 ${
                      isExpanded ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    }`}
                    onClick={(e) => {
                      if (e.target.closest('button, input, a, label, select, textarea')) return;
                      toggleExpand(itemId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(itemId);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {item.name || 'Unnamed Item'}
                        </h3>
                        {lowCount > 0 ? (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200">
                            {lowCount} SKU{lowCount !== 1 ? 's' : ''} below {minCentralStock}
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-100">
                            All loaded SKUs ≥ {minCentralStock}
                          </span>
                        )}
                        {minAcrossSkus != null ? (
                          <span
                            className="shrink-0 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-slate-200 tabular-nums"
                            title="Lowest central stock among loaded SKUs for this product"
                          >
                            Min across SKUs: {minAcrossSkus}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="font-mono">ID …{itemId.slice(-8) || '—'}</span>
                        <span>
                          • {skuCount} SKU{skuCount !== 1 ? 's' : ''}
                          {partialSkus ? ` (showing ${loadedSkuCount})` : ''}
                        </span>
                        {partialSkus ? (
                          <span className="text-amber-700 text-xs">
                            Low-SKU count applies to loaded SKUs only
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => toggleLowDetail(e, itemId)}
                          disabled={lowCount === 0}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-stone-700 hover:bg-canvas-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showLowPanel ? 'Hide low-SKU list' : 'Show low-SKU list'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 ml-2">
                      <span className="text-sm text-stone-600">
                        Page {item.skuPagination?.page || 1}
                      </span>
                      <svg
                        className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {showLowPanel && lowCount > 0 ? (
                    <div className="border-t border-amber-200 bg-amber-50/60 px-6 py-4">
                      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">
                        Central stock below threshold ({minCentralStock})
                      </p>
                      {minAcrossSkus != null ? (
                        <p className="text-sm text-gray-800 mb-3">
                          <span className="font-semibold tabular-nums">
                            Smallest quantity among loaded SKUs: {minAcrossSkus}
                          </span>
                          {partialSkus ? (
                            <span className="text-xs text-stone-600 ml-1">
                              (computed from {loadedSkuCount} loaded lines)
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      <div className="overflow-x-auto rounded-lg border border-amber-200/80 bg-white">
                        <table className="min-w-full text-sm">
                          <thead className="bg-amber-100/80 text-left text-xs font-semibold text-amber-950 uppercase">
                            <tr>
                              <th className="px-4 py-2">SKU</th>
                              <th className="px-4 py-2 text-right">Central stock</th>
                              <th className="px-4 py-2 text-right">Threshold</th>
                              <th className="px-4 py-2 text-right">Short by</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {lowSkus.map((s) => {
                              const st = Number(s.stock ?? 0);
                              const shortBy = Math.max(0, minCentralStock - st);
                              const atProductMin =
                                minAcrossSkus != null && st === minAcrossSkus;
                              return (
                                <tr key={s.sku} className="bg-white">
                                  <td className="px-4 py-2 font-mono text-stone-900">
                                    <span className="align-middle">{s.sku}</span>
                                    {atProductMin ? (
                                      <span className="ml-2 align-middle inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-900">
                                        At product min
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-red-700 tabular-nums">
                                    {st}
                                  </td>
                                  <td className="px-4 py-2 text-right tabular-nums text-stone-600">
                                    {minCentralStock}
                                  </td>
                                  <td className="px-4 py-2 text-right tabular-nums text-amber-800 font-medium">
                                    {shortBy}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {/* SKUs table */}
                  {isExpanded && (
                    <div
                      className="border-t border-slate-100"
                      onClick={stopRowToggle}
                      onMouseDown={stopRowToggle}
                    >
                      {item.skus?.length > 0 ? (
                        <>
                        <div className="border-b border-indigo-100 bg-indigo-50/40 px-3 py-3 sm:px-4">
                          <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-2">
                            Update all loaded SKUs at once
                          </p>
                          <p className="text-xs text-stone-600 mb-3 max-w-2xl">
                            Sets the <strong>same central stock</strong> for every SKU shown in the table below
                            ({item.skus.length} line{item.skus.length !== 1 ? "s" : ""}
                            {partialSkus
                              ? ` of ${skuTotal} total — remaining SKUs need another request or higher skuLimit`
                              : ""}
                            ).
                          </p>
                          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                            <label className="flex flex-col gap-1 text-xs text-stone-600 sm:min-w-[140px]">
                              <span className="font-medium text-gray-800">Stock for each SKU</span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="e.g. 20"
                                value={bulkAllStockValue[String(itemId)] ?? ""}
                                onChange={(e) =>
                                  setBulkAllStockValue((prev) => ({
                                    ...prev,
                                    [String(itemId)]: e.target.value,
                                  }))
                                }
                                disabled={bulkAllApplyingId === String(itemId)}
                                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => applyStockToAllLoadedSkus(item)}
                              disabled={
                                bulkAllApplyingId === String(itemId) ||
                                String(bulkAllStockValue[String(itemId)] ?? "").trim() === ""
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bulkAllApplyingId === String(itemId) ? (
                                <>
                                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  Saving…
                                </>
                              ) : (
                                `Apply to all ${item.skus.length} SKU(s)`
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-left">
                            <thead className="bg-slate-50/90">
                              <tr>
                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Central stock</th>
                                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  vs min ({minCentralStock})
                                </th>
                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {item.skus.map((sku, idx) => {
                                const skuCode = String(sku.sku || `sku-${idx}`).trim();
                                const editKey = `${itemId}-${skuCode}`;
                                const isEditing = editKey in editingStock;
                                const st = Number(sku.stock ?? 0);
                                const isLow = st < minCentralStock;
                                const atProductMin =
                                  minAcrossSkus != null &&
                                  st === minAcrossSkus &&
                                  loadedSkuCount > 0;

                                return (
                                  <tr
                                    key={skuCode}
                                    className={`hover:bg-brand-50/30 ${isLow && !isEditing ? 'bg-amber-50/70' : ''} ${atProductMin && !isEditing ? 'ring-1 ring-inset ring-indigo-200' : ''}`}
                                  >
                                    <td className="px-3 py-2 whitespace-nowrap text-[11px] font-mono font-medium text-slate-900">
                                      {sku.sku || '—'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="0"
                                          value={editingStock[editKey] ?? ''}
                                          onClick={stopRowToggle}
                                          onMouseDown={stopRowToggle}
                                          onChange={(e) =>
                                            setEditingStock((prev) => ({
                                              ...prev,
                                              [editKey]: e.target.value,
                                            }))
                                          }
                                          className="w-20 rounded-md border border-indigo-300 px-2 py-1 text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                      ) : (
                                        <span
                                          className={
                                            isLow
                                              ? 'text-red-700 font-semibold'
                                              : st > 0
                                                ? 'text-green-700 font-medium'
                                                : 'text-red-600 font-medium'
                                          }
                                        >
                                          {sku.stock ?? 0}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-center text-[11px]">
                                      {isEditing ? (
                                        <span className="text-stone-400">—</span>
                                      ) : (
                                        <div className="flex flex-col items-center gap-1">
                                          {isLow ? (
                                            <span className="inline-flex rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                                              Low
                                            </span>
                                          ) : (
                                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                              OK
                                            </span>
                                          )}
                                          {atProductMin ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                              Lowest SKU
                                            </span>
                                          ) : null}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-[11px] font-medium">
                                      {isEditing ? (
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              stopRowToggle(e);
                                              saveStock(itemId, sku);
                                            }}
                                            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => cancelEdit(e, itemId, skuCode)}
                                            className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            startEditing(e, itemId, skuCode, sku.stock)
                                          }
                                          className="rounded-md px-2 py-1 text-[10px] font-medium text-brand-600 hover:bg-indigo-50"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        </>
                      ) : (
                        <div className="p-10 text-center text-stone-500 italic">
                          No SKUs on this page
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && itemsPerPage === 'all' && items.length > 0 ? (
          <div className="mt-10 text-center text-sm text-stone-600">
            Showing <span className="font-semibold text-stone-900">{items.length}</span> product
            {items.length !== 1 ? 's' : ''} (all pages merged
            {pagination.total != null && pagination.total !== items.length
              ? ` · ${pagination.total} total matching search`
              : ''}
            )
          </div>
        ) : null}
        {!loading && pagination.totalPages > 1 && itemsPerPage !== 'all' ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={btnOutline}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={btnOutline}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ItemInventory;