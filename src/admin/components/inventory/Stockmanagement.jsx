import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import {
  PackageSearch,
  Warehouse as WarehouseIcon,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  Loader2,
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  Upload,
} from "lucide-react";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
  bulkUploadStockFile,
  addWarehouseStockFromItem,
} from "../../apis/Warehouseapi";
import { searchItems, getSingleItem } from "../../apis/itemapi";

const WAREHOUSE_PAGE_SIZE = 8;
const STOCK_PAGE_SIZE_OPTIONS = [25, 50, 100];

function searchMapsEqual(a, b) {
  const keys = new Set([
    ...Object.keys(a || {}),
    ...Object.keys(b || {}),
  ]);
  for (const k of keys) {
    if (String((a || {})[k] ?? "") !== String((b || {})[k] ?? "")) {
      return false;
    }
  }
  return true;
}

/** apiConnector resolves to axios body: { success, message, data: { data, pagination } } */
function parseStockApiResponse(res) {
  const payload = res?.data ?? {};
  const list = payload.data ?? payload.stock ?? payload.items ?? [];
  const pagination = payload.pagination || {};
  return {
    list: Array.isArray(list) ? list : [],
    pagination: {
      page: pagination.page ?? 1,
      limit: pagination.limit ?? 50,
      total: pagination.total ?? 0,
      totalPages:
        typeof pagination.totalPages === "number"
          ? pagination.totalPages
          : 0,
    },
  };
}

/** Stable key so all SKUs of one catalog item nest under one product block */
function stockRowGroupKey(row) {
  const id = row?.itemId != null ? String(row.itemId).trim() : "";
  if (id) return `item:${id}`;
  const name = String(row?.productName || row?.name || "").trim();
  if (name) return `name:${name.toLowerCase()}`;
  const sku = String(row?.sku || row?.SKU || "").trim();
  return sku ? `sku:${sku}` : "unknown";
}

function displayProductTitleForGroup(rows) {
  const first = rows?.[0];
  const title =
    (first?.productName && String(first.productName).trim()) ||
    (first?.name && String(first.name).trim()) ||
    "";
  if (title) return title;
  const sku = String(first?.sku || first?.SKU || "").trim();
  return sku ? `SKU: ${sku}` : "Item";
}

function countSkusOnItem(item) {
  return collectSkuListFromItem(item).length;
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

function parseItemSearchResponse(res) {
  const payload = res?.data ?? res ?? {};
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  return [];
}

/** Catalog product id (human-facing) or Mongo _id fallback */
function getItemProductIdDisplay(item) {
  const p = item?.productId;
  if (p != null && String(p).trim() !== "") return String(p).trim();
  const id = item?._id || item?.id;
  return id ? String(id) : "—";
}

/** Total units in central catalog for this item (sum of variant size stocks). */
function getCentralStockTotal(item) {
  if (item != null) {
    const t = item.totalStock;
    if (typeof t === "number" && !Number.isNaN(t)) return t;
  }
  let sum = 0;
  for (const v of item?.variants || []) {
    for (const sz of v.sizes || []) {
      const s = sz?.stock;
      const n = typeof s === "number" ? s : Number(s);
      if (!Number.isNaN(n)) sum += n;
    }
  }
  return sum;
}

/** Search catalog by name, pick one item, move the same qty from central into this warehouse for every SKU on that item. */
function AddItemSkusToWarehousePanel({ warehouseId, disabled, onStockUpdated }) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [skuCount, setSkuCount] = useState(0);
  const [qtyPerSku, setQtyPerSku] = useState("1");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const res = await searchItems({
          keywords: debouncedQuery,
          page: 1,
          limit: 20,
        });
        const list = parseItemSearchResponse(res);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const pickItem = async (item) => {
    const id = item?._id || item?.id;
    if (!id) return;
    setQuery(item.name || item.title || "");
    setOpen(false);
    let doc = item;
    let n = countSkusOnItem(doc);
    if (n === 0) {
      try {
        const res = await getSingleItem(String(id));
        const inner = res?.data ?? {};
        const full = inner.item ?? inner;
        if (full?.variants) {
          doc = full;
          n = countSkusOnItem(full);
        }
      } catch {
        /* keep search row */
      }
    }
    setSelected(doc);
    setSkuCount(n);
  };

  const clearSelection = () => {
    setSelected(null);
    setSkuCount(0);
    setQuery("");
    setResults([]);
  };

  const handleApply = async () => {
    const id = selected?._id || selected?.id;
    if (!id) {
      toast.error("Search and select an item first");
      return;
    }
    const q = Number(qtyPerSku);
    if (!Number.isInteger(q) || q < 1) {
      toast.error(
        "Enter a positive whole number (units per SKU to move from central)"
      );
      return;
    }
    if (skuCount === 0) {
      toast.error("This item has no SKUs to move");
      return;
    }
    setApplying(true);
    try {
      let data;
      let successMessage;

      try {
        const res = await addWarehouseStockFromItem(String(warehouseId), {
          itemId: String(id),
          quantity: q,
        });
        data = res?.data ?? {};
        successMessage = res?.message;
      } catch (bulkErr) {
        if (!isWarehouseFromItemRouteUnavailable(bulkErr)) throw bulkErr;

        let doc = selected;
        let skus = collectSkuListFromItem(doc);
        if (skus.length === 0) {
          try {
            const r = await getSingleItem(String(id));
            const inner = r?.data ?? {};
            const full = inner.item ?? inner;
            if (full?.variants) doc = full;
            skus = collectSkuListFromItem(doc);
          } catch {
            /* ignore */
          }
        }
        if (skus.length === 0) {
          toast.error(
            "Could not load SKUs for this item. Update the API or open the item once, then retry."
          );
          return;
        }

        const applied = [];
        const failed = [];
        for (const sku of skus) {
          try {
            await updateWarehouseStock(String(warehouseId), {
              sku,
              quantity: q,
            });
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
        data = { applied, failed };
        successMessage = `Moved stock for ${applied.length} SKU(s)`;
      }

      const failed = data.failed ?? [];
      const applied = data.applied ?? [];
      if (applied.length > 0 && typeof onStockUpdated === "function") {
        await onStockUpdated();
      }
      if (failed.length === 0) {
        toast.success(successMessage || `Moved stock for ${applied.length} SKU(s)`);
        clearSelection();
        setQtyPerSku("1");
      } else {
        const firstErr = failed[0]?.message || "";
        toast.error(
          `${applied.length} SKU(s) updated, ${failed.length} failed.${
            firstErr ? ` ${firstErr}` : ""
          }`
        );
      }
    } catch (err) {
      toast.error(
        typeof err === "string"
          ? err
          : err?.message || "Could not apply stock for this item"
      );
    } finally {
      setApplying(false);
    }
  };

  const selectedId = selected?._id || selected?.id;
  const selectedName =
    (selected?.name || selected?.title || "").trim() || "Selected item";

  return (
    <div
      ref={rootRef}
      className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4"
    >
      <h5 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">
        Add all SKUs from one item
      </h5>
      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
        Search by product name (same catalog search as Items). Choose an item,
        set units <strong>per SKU</strong>, then apply — each variant size
        moves that many units from <strong>central</strong> into this warehouse.
        SKUs with insufficient central stock are reported and skipped.
      </p>
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1 min-w-0 relative">
          <label className="sr-only" htmlFor={`item-pick-${warehouseId}`}>
            Search item by name
          </label>
          <input
            id={`item-pick-${warehouseId}`}
            type="text"
            placeholder="Type item name…"
            value={query}
            disabled={disabled || applying}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (selected) {
                setSelected(null);
                setSkuCount(0);
              }
            }}
            onFocus={() => setOpen(true)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            autoComplete="off"
          />
          {open && debouncedQuery.length >= 2 && !selectedId ? (
            <div className="absolute z-20 left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {searching ? (
                <div className="px-3 py-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader2 className="animate-spin" size={14} />
                  Searching…
                </div>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-500">No items found</p>
              ) : (
                <ul className="py-1">
                  {results.map((it) => {
                    const rid = it._id || it.id;
                    const label = (it.name || it.title || "Untitled").trim();
                    const pid = getItemProductIdDisplay(it);
                    const central = getCentralStockTotal(it);
                    const nSkus = countSkusOnItem(it);
                    return (
                      <li key={rid ? String(rid) : label}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickItem(it)}
                        >
                          <span className="block font-medium text-gray-900 truncate pr-1">
                            {label}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                            <span className="font-mono text-gray-600" title="Product ID">
                              {pid}
                            </span>
                            <span className="text-gray-300" aria-hidden>
                              ·
                            </span>
                            <span title="Total central catalog stock (all SKUs)">
                              Central{" "}
                              <strong className="font-semibold text-gray-700">
                                {central.toLocaleString()}
                              </strong>
                            </span>
                            <span className="text-gray-300" aria-hidden>
                              ·
                            </span>
                            <span>
                              {nSkus} SKU{nSkus !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {selectedId ? (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 max-w-md min-w-0">
              <div className="min-w-0 flex-1">
                <span
                  className="block truncate font-medium text-gray-900"
                  title={selectedName}
                >
                  {selectedName}
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-500 font-mono truncate" title="Product ID · central stock">
                  {getItemProductIdDisplay(selected)} · central{" "}
                  {getCentralStockTotal(selected).toLocaleString()} ·{" "}
                  {skuCount} SKU{skuCount !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                disabled={applying}
                className="p-0.5 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-100 shrink-0"
                aria-label="Clear item"
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          <label className="flex flex-col gap-0.5 text-xs text-gray-600">
            <span className="font-medium text-gray-700">Qty per SKU</span>
            <input
              type="number"
              min={1}
              step={1}
              value={qtyPerSku}
              disabled={disabled || applying}
              onChange={(e) => setQtyPerSku(e.target.value)}
              className="w-24 px-2.5 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <button
            type="button"
            disabled={
              disabled ||
              applying ||
              !selectedId ||
              skuCount === 0 ||
              !Number.isInteger(Number(qtyPerSku)) ||
              Number(qtyPerSku) < 1
            }
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Applying…
              </>
            ) : (
              "Apply all SKUs"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Stockmanagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehousesError, setWarehousesError] = useState(null);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [debouncedWarehouseSearch, setDebouncedWarehouseSearch] = useState("");
  const [warehousePage, setWarehousePage] = useState(1);
  const [warehouseTotalPages, setWarehouseTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWarehouseSearch(warehouseSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [warehouseSearch]);

  const [stockByWarehouseId, setStockByWarehouseId] = useState({});
  const [stockFormByWarehouseId, setStockFormByWarehouseId] = useState({});
  const [updatingStockByWarehouseId, setUpdatingStockByWarehouseId] = useState(
    {}
  );
  const [inlineAddQty, setInlineAddQty] = useState({});
  const [updatingInlineKey, setUpdatingInlineKey] = useState(null);

  /** Server-side filters (immediate UI) */
  const [stockItemSearch, setStockItemSearch] = useState({});
  const [stockSkuSearch, setStockSkuSearch] = useState({});
  /** Debounced → drives GET /stock */
  const [debouncedStockItemSearch, setDebouncedStockItemSearch] = useState({});
  const [debouncedStockSkuSearch, setDebouncedStockSkuSearch] = useState({});

  const [stockPageByWarehouseId, setStockPageByWarehouseId] = useState({});
  const [stockPageSize, setStockPageSize] = useState(50);
  /** Collapsed = compact header-only row (easier scanning of many warehouses) */
  const [collapsedWarehouseIds, setCollapsedWarehouseIds] = useState(() => new Set());
  const [copiedSkuKey, setCopiedSkuKey] = useState(null);

  const [stockRefreshTick, setStockRefreshTick] = useState(0);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDefaultWarehouseId, setBulkDefaultWarehouseId] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkLastResult, setBulkLastResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  /** Per warehouse: set every listed SKU to the same warehouse quantity (delta via API) */
  const [whUniformTarget, setWhUniformTarget] = useState({});
  const [whUniformAllPages, setWhUniformAllPages] = useState({});
  const [whUniformApplyingId, setWhUniformApplyingId] = useState(null);

  const warehouseIdsKey = useMemo(
    () => warehouses.map((w) => w.id).join(","),
    [warehouses]
  );
  const warehousesRef = useRef(warehouses);
  warehousesRef.current = warehouses;

  const toggleWarehouseCollapsed = useCallback((warehouseId) => {
    setCollapsedWarehouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(warehouseId)) next.delete(warehouseId);
      else next.add(warehouseId);
      return next;
    });
  }, []);

  const expandAllWarehouses = useCallback(() => {
    setCollapsedWarehouseIds(new Set());
  }, []);

  const collapseAllWarehouses = useCallback(() => {
    setCollapsedWarehouseIds(new Set(warehouses.map((w) => w.id)));
  }, [warehouses]);

  const copySkuToClipboard = useCallback(async (sku, key) => {
    const text = String(sku || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSkuKey(key);
      toast.success("SKU copied");
      setTimeout(() => setCopiedSkuKey((k) => (k === key ? null : k)), 2000);
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  }, []);

  // Debounce product-name + SKU filters (per warehouse keys preserved)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedStockItemSearch((prev) =>
        searchMapsEqual(prev, stockItemSearch)
          ? prev
          : { ...stockItemSearch }
      );
    }, 400);
    return () => clearTimeout(t);
  }, [stockItemSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedStockSkuSearch((prev) =>
        searchMapsEqual(prev, stockSkuSearch) ? prev : { ...stockSkuSearch }
      );
    }, 400);
    return () => clearTimeout(t);
  }, [stockSkuSearch]);

  useEffect(() => {
    setStockPageByWarehouseId({});
  }, [stockPageSize]);

  // ────────────────────────────────────────────────
  // Load warehouses (paginated + search — backend)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const response = await getWarehouses(
          warehousePage,
          WAREHOUSE_PAGE_SIZE,
          debouncedWarehouseSearch
        );
        const data = response?.data ?? {};
        const warehouseList =
          data.data ||
          data.warehouses ||
          data.items ||
          (Array.isArray(data) ? data : []);

        const formatted = (warehouseList || []).map((wh, idx) => {
          const addr = wh.address || {};
          return {
            id: wh._id || wh.id || `temp-${idx}`,
            name: wh.name || "",
            code: wh.code || "",
            city: addr.city || "",
            state: addr.state || "",
            displayName: wh.name
              ? `${wh.name}${addr.city ? ` — ${addr.city}` : ""}`
              : `Warehouse ${idx + 1}`,
          };
        });

        setWarehouses(formatted);
        const pagination = data.pagination || {};
        setWarehouseTotalPages(pagination.totalPages || pagination.pages || 1);
        setWarehousesError(null);
      } catch (err) {
        const msg =
          typeof err === "string"
            ? err
            : err?.response?.data?.message || "Failed to load warehouses";
        setWarehousesError(msg);
        toast.error(msg);
      } finally {
        setWarehousesLoading(false);
      }
    };

    fetchWarehouses();
  }, [warehousePage, debouncedWarehouseSearch]);

  // ────────────────────────────────────────────────
  // Load stock: backend pagination + itemSearch + skuSearch
  // ────────────────────────────────────────────────
  useEffect(() => {
    const list = warehousesRef.current;
    if (!list.length) return;

    let cancelled = false;

    const run = async () => {
      setStockByWarehouseId((prev) => {
        const next = { ...prev };
        list.forEach((wh) => {
          next[wh.id] = {
            ...(prev[wh.id] || {}),
            loading: true,
            error: null,
          };
        });
        return next;
      });

      const results = await Promise.all(
        list.map((wh) => {
          const page = stockPageByWarehouseId[wh.id] || 1;
          const itemS = (debouncedStockItemSearch[wh.id] ?? "").trim();
          const skuS = (debouncedStockSkuSearch[wh.id] ?? "").trim();
          return getWarehouseStock(wh.id, page, stockPageSize, {
            itemSearch: itemS,
            skuSearch: skuS,
          })
            .then((r) => ({ id: wh.id, res: r }))
            .catch((e) => ({ id: wh.id, err: e }));
        })
      );

      if (cancelled) return;

      setStockByWarehouseId((prev) => {
        const next = { ...prev };
        results.forEach(({ id, res, err }) => {
          if (err) {
            console.warn("[StockManagement] fetchStock error", {
              warehouseId: id,
              message: err?.response?.data?.message || err?.message,
            });
            next[id] = {
              data: [],
              loading: false,
              error:
                err?.response?.data?.message || "Failed to load stock",
              pagination: {
                page: 1,
                totalPages: 0,
                total: 0,
                limit: stockPageSize,
              },
            };
          } else {
            const { list, pagination } = parseStockApiResponse(res);
            next[id] = {
              data: list,
              loading: false,
              error: null,
              pagination: {
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
                limit: pagination.limit,
              },
            };
          }
        });
        return next;
      });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    warehouseIdsKey,
    stockPageByWarehouseId,
    debouncedStockItemSearch,
    debouncedStockSkuSearch,
    stockPageSize,
    stockRefreshTick,
  ]);

  const mergeStockState = useCallback((warehouseId, res) => {
    const { list, pagination } = parseStockApiResponse(res);
    setStockByWarehouseId((prev) => ({
      ...prev,
      [warehouseId]: {
        data: list,
        loading: false,
        error: null,
        pagination: {
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
        },
      },
    }));
  }, []);

  const refetchStockRow = useCallback(
    async (warehouseId) => {
      const page = stockPageByWarehouseId[warehouseId] || 1;
      const itemS = (stockItemSearch[warehouseId] ?? "").trim();
      const skuS = (stockSkuSearch[warehouseId] ?? "").trim();
      const response = await getWarehouseStock(
        warehouseId,
        page,
        stockPageSize,
        { itemSearch: itemS, skuSearch: skuS }
      );
      mergeStockState(warehouseId, response);
    },
    [
      stockPageByWarehouseId,
      stockItemSearch,
      stockSkuSearch,
      stockPageSize,
      mergeStockState,
    ]
  );

  const getFormForWarehouse = (warehouseId) =>
    stockFormByWarehouseId[warehouseId] || { sku: "", quantity: "" };

  const setFormForWarehouse = (warehouseId, payload) => {
    setStockFormByWarehouseId((prev) => ({
      ...prev,
      [warehouseId]: { ...getFormForWarehouse(warehouseId), ...payload },
    }));
  };

  const handleUpdateStock = async (warehouseId) => {
    const form = getFormForWarehouse(warehouseId);
    const sku = (form.sku || "").trim();
    const quantity = Number(form.quantity);
    console.log("[StockManagement] handleUpdateStock submit", {
      warehouseId,
      form,
      parsed: { sku, quantity },
    });

    if (!sku || Number.isNaN(quantity) || quantity === 0) {
      console.warn("[StockManagement] handleUpdateStock validation failed", {
        warehouseId,
        sku,
        quantity,
      });
      toast.error(
        "Enter a valid SKU and a non-zero quantity (positive = to warehouse, negative = return to central)"
      );
      return;
    }

    setUpdatingStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: true }));
    try {
      const payload = { sku, quantity };
      console.log("[StockManagement] updateWarehouseStock request", {
        warehouseId,
        payload,
      });
      const updateResponse = await updateWarehouseStock(warehouseId, payload);
      console.log("[StockManagement] updateWarehouseStock response", {
        warehouseId,
        success: updateResponse?.success,
        message: updateResponse?.message,
        data: updateResponse?.data,
      });
      await refetchStockRow(warehouseId);
      console.log("[StockManagement] refetchStockRow completed", { warehouseId });
      setFormForWarehouse(warehouseId, { sku: "", quantity: "" });
      if (quantity > 0) {
        toast.success(`Moved ${quantity} unit(s) to warehouse — ${sku}`);
      } else {
        toast.success(`Returned ${Math.abs(quantity)} unit(s) to central — ${sku}`);
      }
    } catch (err) {
      console.error("[StockManagement] handleUpdateStock error", {
        warehouseId,
        sku,
        quantity,
        message: err?.response?.data?.message || err?.message,
      });
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message ||
            err?.message ||
            "Failed to update stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(
        msg
      );
      const isInsufficientCentral =
        /central inventory/i.test(msg) &&
        /insufficient|available/i.test(msg) &&
        !isSkuNotFound;
      const isInsufficientWarehouse =
        /insufficient stock in warehouse/i.test(msg) ||
        (/warehouse/i.test(msg) && /insufficient|available/i.test(msg));
      if (isSkuNotFound) {
        toast.error(
          "SKU not in catalog — add it to an item in Central stock / catalog first."
        );
      } else if (isInsufficientWarehouse) {
        toast.error(msg);
      } else if (isInsufficientCentral) {
        toast.error(
          "Not enough central stock — lower the quantity or add stock on the item."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setUpdatingStockByWarehouseId((prev) => ({
        ...prev,
        [warehouseId]: false,
      }));
    }
  };

  const handleInlineAddStock = async (warehouseId, sku, quantityStr) => {
    const quantity = Number(quantityStr);
    console.log("[StockManagement] handleInlineAddStock submit", {
      warehouseId,
      sku,
      quantityStr,
      parsedQuantity: quantity,
    });
    if (Number.isNaN(quantity) || quantity === 0) {
      console.warn("[StockManagement] handleInlineAddStock validation failed", {
        warehouseId,
        sku,
        quantity,
      });
      toast.error(
        "Enter a non-zero quantity (positive adds from central; negative returns to central)"
      );
      return;
    }
    const key = `${warehouseId}-${sku}`;
    setUpdatingInlineKey(key);
    try {
      const payload = {
        sku: sku.trim(),
        quantity,
      };
      console.log("[StockManagement] inline updateWarehouseStock request", {
        warehouseId,
        payload,
        key,
      });
      const updateResponse = await updateWarehouseStock(warehouseId, payload);
      console.log("[StockManagement] inline updateWarehouseStock response", {
        warehouseId,
        key,
        success: updateResponse?.success,
        message: updateResponse?.message,
        data: updateResponse?.data,
      });
      await refetchStockRow(warehouseId);
      console.log("[StockManagement] inline refetchStockRow completed", {
        warehouseId,
        key,
      });
      setInlineAddQty((prev) => ({ ...prev, [key]: "" }));
      if (quantity > 0) {
        toast.success(`Added ${quantity} to warehouse — ${sku.trim()}`);
      } else {
        toast.success(
          `Returned ${Math.abs(quantity)} to central from warehouse — ${sku.trim()}`
        );
      }
    } catch (err) {
      console.error("[StockManagement] handleInlineAddStock error", {
        warehouseId,
        sku,
        quantity,
        key,
        message: err?.response?.data?.message || err?.message,
      });
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message ||
            err?.message ||
            "Failed to add stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(
        msg
      );
      const isInsufficientCentral =
        /central inventory/i.test(msg) &&
        /insufficient|available/i.test(msg) &&
        !isSkuNotFound;
      const isInsufficientWarehouse =
        /insufficient stock in warehouse/i.test(msg) ||
        (/warehouse/i.test(msg) && /insufficient|available/i.test(msg));
      if (isSkuNotFound) {
        toast.error(
          "SKU not in catalog — add it to an item in Central stock / catalog first."
        );
      } else if (isInsufficientWarehouse) {
        toast.error(msg);
      } else if (isInsufficientCentral) {
        toast.error(
          "Not enough central stock — lower the quantity or add stock on the item."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setUpdatingInlineKey(null);
    }
  };

  const setStockPage = (warehouseId, page) => {
    setStockPageByWarehouseId((prev) => ({
      ...prev,
      [warehouseId]: Math.max(1, page),
    }));
  };

  const fetchAllStockRowsForWarehouse = useCallback(async (warehouseId) => {
    const pageSize = 100;
    const aggregated = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await getWarehouseStock(warehouseId, page, pageSize, {});
      const { list, pagination } = parseStockApiResponse(res);
      aggregated.push(...list);
      totalPages =
        typeof pagination.totalPages === "number" && pagination.totalPages > 0
          ? pagination.totalPages
          : 1;
      if (!list.length && page > 1) break;
      page += 1;
    } while (page <= totalPages);

    const seen = new Set();
    const unique = [];
    for (const row of aggregated) {
      const sku = String(row?.sku || row?.SKU || "").trim();
      if (!sku || seen.has(sku)) continue;
      seen.add(sku);
      unique.push(row);
    }
    return unique;
  }, []);

  const handleUniformWarehouseQuantity = useCallback(
    async (warehouseId) => {
      const raw = String(whUniformTarget[warehouseId] ?? "").trim();
      const targetInt = parseInt(raw, 10);
      if (!Number.isInteger(targetInt) || targetInt < 0) {
        toast.error("Enter a non-negative whole number for warehouse quantity");
        return;
      }

      const useAllPages = Boolean(whUniformAllPages[warehouseId]);
      let rows = [];

      if (useAllPages) {
        try {
          rows = await fetchAllStockRowsForWarehouse(warehouseId);
        } catch (e) {
          toast.error(
            (e && typeof e === "object" && e.message) ||
              "Could not load full warehouse stock list"
          );
          return;
        }
      } else {
        rows = stockByWarehouseId[warehouseId]?.data || [];
      }

      const bySku = new Map();
      for (const row of rows) {
        const sku = String(row?.sku || row?.SKU || "").trim();
        if (!sku) continue;
        if (!bySku.has(sku)) bySku.set(sku, row);
      }
      const uniqueRows = [...bySku.values()];
      if (uniqueRows.length === 0) {
        toast.error(
          useAllPages
            ? "No SKUs found in this warehouse"
            : "No SKU lines on this page — change page or enable “entire warehouse”"
        );
        return;
      }

      const scopeLabel = useAllPages
        ? `all ${uniqueRows.length} SKU line(s) in this warehouse (every page, ignoring filters)`
        : `${uniqueRows.length} SKU line(s) on the current page/filters`;

      if (
        !window.confirm(
          `Set warehouse stock to ${targetInt} for ${scopeLabel}?\n\n` +
            "The app will move stock from central or back to central per SKU (same rules as single-line adjust). " +
            "Increasing quantity needs enough central stock for each SKU; decreasing needs enough in the warehouse."
        )
      ) {
        return;
      }

      setWhUniformApplyingId(warehouseId);
      let adjusted = 0;
      let skipped = 0;
      let failed = 0;
      try {
        for (const row of uniqueRows) {
          const sku = String(row?.sku || row?.SKU || "").trim();
          const current = Number(row.quantity) || 0;
          const delta = targetInt - current;
          if (delta === 0) {
            skipped += 1;
            continue;
          }
          try {
            await updateWarehouseStock(warehouseId, { sku, quantity: delta });
            adjusted += 1;
          } catch {
            failed += 1;
          }
        }

        if (failed === 0) {
          toast.success(
            `Target ${targetInt}: ${adjusted} SKU(s) adjusted, ${skipped} already at target`
          );
        } else {
          toast.error(
            `${adjusted} adjusted, ${skipped} unchanged, ${failed} failed (check central/warehouse availability)`
          );
        }
        await refetchStockRow(warehouseId);
        setStockRefreshTick((t) => t + 1);
      } finally {
        setWhUniformApplyingId(null);
      }
    },
    [
      whUniformTarget,
      whUniformAllPages,
      stockByWarehouseId,
      fetchAllStockRowsForWarehouse,
      refetchStockRow,
    ]
  );

  const handleBulkStockUpload = async () => {
    if (!bulkFile) {
      toast.error("Choose a file (.json, .csv, .xlsx, .xls, or .xml)");
      return;
    }
    setBulkSubmitting(true);
    setBulkLastResult(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      const wh = bulkDefaultWarehouseId.trim();
      if (wh) formData.append("warehouseId", wh);
      const res = await bulkUploadStockFile(formData);
      if (res?.success) {
        const data = res.data ?? {};
        setBulkLastResult(data);
        const errCount = data.errors?.length ?? 0;
        const appliedCount = data.applied?.length ?? 0;
        if (errCount > 0) {
          toast.error(
            `Bulk finished with ${errCount} error(s); ${appliedCount} applied`
          );
        } else {
          toast.success(`Bulk stock applied (${appliedCount} operations)`);
        }
        setBulkFile(null);
        if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
        setStockRefreshTick((t) => t + 1);
      } else {
        toast.error(res?.message || "Bulk upload failed");
      }
    } catch (err) {
      console.error("[StockManagement] bulk upload", err);
      toast.error(
        typeof err === "string" ? err : err?.message || "Bulk upload failed"
      );
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center">
            <PackageSearch size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
              Stock Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Move stock between <strong>central catalog</strong> and each warehouse (use
              negative quantity to return stock to central). Filters and pagination help with
              large lists.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <Upload size={20} className="text-gray-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Bulk stock upload
              </h2>
              <p className="mt-1 text-xs text-gray-500 max-w-3xl">
                JSON, CSV, or Excel with{" "}
                <span className="font-mono text-gray-700">sku</span>, optional{" "}
                <span className="font-mono text-gray-700">central_stock</span>,{" "}
                <span className="font-mono text-gray-700">warehouse_id</span>,{" "}
                <span className="font-mono text-gray-700">warehouse_delta</span>{" "}
                (+ into warehouse from central, − back to central). Max 2000 rows per file. Optional
                default warehouse applies when rows omit warehouse id.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-gray-600 sm:min-w-[200px]">
                  <span className="font-medium text-gray-700">Default warehouse ID (optional)</span>
                  <input
                    type="text"
                    placeholder="69c5308e5033cadea9873121"
                    value={bulkDefaultWarehouseId}
                    onChange={(e) => setBulkDefaultWarehouseId(e.target.value)}
                    disabled={bulkSubmitting}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-black focus:ring-1 focus:ring-black"
                  />
                </label>
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
                  className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200"
                />
                <button
                  type="button"
                  disabled={bulkSubmitting || !bulkFile}
                  onClick={handleBulkStockUpload}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload & apply
                    </>
                  )}
                </button>
                <details className="relative">
                  <summary className="list-none cursor-pointer inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Download template
                  </summary>
                  <div className="absolute z-10 mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg p-1.5 space-y-1">
                    <a
                      href="/templates/bulk-stock-upload.sample.csv"
                      download
                      className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      CSV format
                    </a>
                    <a
                      href="/templates/bulk-stock-upload.sample.json"
                      download
                      className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      JSON format
                    </a>
                    <a
                      href="/templates/bulk-stock-upload.sample.xml"
                      download
                      className="block rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Excel format
                    </a>
                  </div>
                </details>
              </div>
              {bulkLastResult?.errors?.length > 0 ? (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
                  <p className="font-semibold mb-1">
                    Errors ({bulkLastResult.errors.length})
                  </p>
                  <ul className="space-y-1 font-mono">
                    {bulkLastResult.errors.map((row, i) => (
                      <li key={`${row.sku}-${row.rowIndex}-${i}`}>
                        {row.sku ? `${row.sku}: ` : ""}
                        {row.rowIndex != null ? `(row ${row.rowIndex}) ` : ""}
                        {row.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 sm:px-5 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Warehouses
              </h2>
              <p className="text-xs text-gray-500">
                Search by name, code, or city • Expand/collapse cards to focus on one site
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end w-full lg:w-auto">
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={expandAllWarehouses}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAllWarehouses}
                  disabled={!warehouses.length}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Collapse all
                </button>
              </div>
              <div className="relative w-full sm:w-72 min-w-0">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <PackageSearch size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search warehouses..."
                  value={warehouseSearch}
                  onChange={(e) => {
                    setWarehouseSearch(e.target.value);
                    setWarehousePage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  aria-label="Search warehouses"
                />
                {warehouseSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWarehouseSearch("");
                      setWarehousePage(1);
                    }}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 p-1"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {warehousesLoading ? (
              <div className="space-y-4 py-2" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 overflow-hidden animate-pulse"
                  >
                    <div className="h-24 bg-gray-100" />
                    <div className="h-20 bg-gray-50 border-t border-gray-100" />
                  </div>
                ))}
                <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} />
                  Loading warehouses…
                </p>
              </div>
            ) : warehousesError ? (
              <p className="py-4 text-center text-sm text-red-600">
                {warehousesError}
              </p>
            ) : warehouses.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                {debouncedWarehouseSearch
                  ? "No warehouses match your search."
                  : "No warehouses found."}
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {warehouses.map((wh) => {
                    const stockState = stockByWarehouseId[wh.id] || {
                      data: [],
                      loading: true,
                      error: null,
                      pagination: {
                        page: 1,
                        totalPages: 0,
                        total: 0,
                      },
                    };
                    const form = getFormForWarehouse(wh.id);
                    const isUpdating = updatingStockByWarehouseId[wh.id];
                    const pg = stockState.pagination || {};
                    const stockPage = pg.page || stockPageByWarehouseId[wh.id] || 1;
                    const totalPages = pg.totalPages ?? 0;
                    const totalSkus = pg.total ?? 0;
                    const isCollapsed = collapsedWarehouseIds.has(wh.id);
                    const filtersPending =
                      (stockItemSearch[wh.id] ?? "") !==
                        (debouncedStockItemSearch[wh.id] ?? "") ||
                      (stockSkuSearch[wh.id] ?? "") !==
                        (debouncedStockSkuSearch[wh.id] ?? "");

                    return (
                      <div
                        key={wh.id}
                        className="rounded-xl border-2 border-gray-200 bg-gray-50/50 overflow-hidden shadow-sm hover:border-gray-300 transition-colors"
                      >
                        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <button
                              type="button"
                              onClick={() => toggleWarehouseCollapsed(wh.id)}
                              className="mt-1 p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 shrink-0"
                              aria-expanded={!isCollapsed}
                              aria-label={
                                isCollapsed ? "Expand warehouse" : "Collapse warehouse"
                              }
                            >
                              {isCollapsed ? (
                                <ChevronRight size={22} />
                              ) : (
                                <ChevronDown size={22} />
                              )}
                            </button>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <WarehouseIcon
                                size={26}
                                className="text-gray-600"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-xl font-bold text-gray-900">
                                {wh.name || "Unnamed Warehouse"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                                {wh.code ? (
                                  <span className="font-mono">{wh.code}</span>
                                ) : null}
                                {(wh.city || wh.state) && (
                                  <span>
                                    {[wh.city, wh.state].filter(Boolean).join(", ")}
                                  </span>
                                )}
                                {!stockState.loading && !isCollapsed ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                    {totalSkus.toLocaleString()} SKU
                                    {totalSkus !== 1 ? "s" : ""}
                                    {totalPages > 1
                                      ? ` · page ${stockPage}/${totalPages}`
                                      : ""}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {isCollapsed ? (
                            <p className="mt-3 ml-10 sm:ml-12 text-xs text-gray-500">
                              Collapsed — click the arrow to manage stock for this
                              warehouse.
                            </p>
                          ) : null}
                        </div>

                        {!isCollapsed ? (
                          <>
                        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-white border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            Adjust stock (central ↔ warehouse)
                          </h4>
                          <p className="text-xs text-gray-500 mb-3 max-w-2xl">
                            <strong>Positive</strong> quantity moves units from central catalog
                            stock into this warehouse. <strong>Negative</strong> quantity returns
                            units from this warehouse back to central. SKU must already exist on
                            a product.
                          </p>
                          <form
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleUpdateStock(wh.id);
                            }}
                          >
                            <input
                              type="text"
                              placeholder="SKU (e.g. TL-BLK-S)"
                              value={form.sku}
                              onChange={(e) =>
                                setFormForWarehouse(wh.id, {
                                  sku: e.target.value,
                                })
                              }
                              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                              autoComplete="off"
                              aria-label="SKU to add"
                            />
                            <input
                              type="number"
                              placeholder="Qty (+ to warehouse, − to central)"
                              value={form.quantity}
                              onChange={(e) =>
                                setFormForWarehouse(wh.id, {
                                  quantity: e.target.value,
                                })
                              }
                              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                              aria-label="Quantity"
                            />
                            <button
                              type="submit"
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="animate-spin" size={16} />
                                  Updating…
                                </>
                              ) : (
                                "Apply"
                              )}
                            </button>
                          </form>
                          <AddItemSkusToWarehousePanel
                            warehouseId={wh.id}
                            disabled={isUpdating || stockState.loading}
                            onStockUpdated={() => refetchStockRow(wh.id)}
                          />
                        </div>

                        <div className="px-5 py-4 sm:px-6 sm:py-5">
                          <div className="flex flex-col gap-3 mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Stock in this warehouse
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                {filtersPending ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                    <Loader2 className="animate-spin" size={12} />
                                    Applying filters…
                                  </span>
                                ) : null}
                                <span className="text-xs text-gray-500">
                                  {totalSkus.toLocaleString()} SKU
                                  {totalSkus !== 1 ? "s" : ""}
                                  {(debouncedStockItemSearch[wh.id] ||
                                    debouncedStockSkuSearch[wh.id]) &&
                                    " (filtered)"}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Filter by product name…"
                                  value={stockItemSearch[wh.id] ?? ""}
                                  onChange={(e) => {
                                    setStockItemSearch((prev) => ({
                                      ...prev,
                                      [wh.id]: e.target.value,
                                    }));
                                    setStockPageByWarehouseId((prev) => ({
                                      ...prev,
                                      [wh.id]: 1,
                                    }));
                                  }}
                                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                                  aria-label="Filter by product name"
                                />
                                {(stockItemSearch[wh.id] ?? "") ? (
                                  <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5"
                                    onClick={() => {
                                      setStockItemSearch((prev) => ({
                                        ...prev,
                                        [wh.id]: "",
                                      }));
                                      setStockPageByWarehouseId((prev) => ({
                                        ...prev,
                                        [wh.id]: 1,
                                      }));
                                    }}
                                    aria-label="Clear product filter"
                                  >
                                    <X size={14} />
                                  </button>
                                ) : null}
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Filter by SKU…"
                                  value={stockSkuSearch[wh.id] ?? ""}
                                  onChange={(e) => {
                                    setStockSkuSearch((prev) => ({
                                      ...prev,
                                      [wh.id]: e.target.value,
                                    }));
                                    setStockPageByWarehouseId((prev) => ({
                                      ...prev,
                                      [wh.id]: 1,
                                    }));
                                  }}
                                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent font-mono"
                                  aria-label="Filter by SKU"
                                />
                                {(stockSkuSearch[wh.id] ?? "") ? (
                                  <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5"
                                    onClick={() => {
                                      setStockSkuSearch((prev) => ({
                                        ...prev,
                                        [wh.id]: "",
                                      }));
                                      setStockPageByWarehouseId((prev) => ({
                                        ...prev,
                                        [wh.id]: 1,
                                      }));
                                    }}
                                    aria-label="Clear SKU filter"
                                  >
                                    <X size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-3 sm:p-4">
                              <h5 className="text-xs font-semibold text-violet-950 uppercase tracking-wide">
                                Set all SKUs to one warehouse quantity
                              </h5>
                              <p className="mt-1 text-xs text-violet-900/80 max-w-3xl">
                                Sets the <strong>warehouse</strong> quantity to the same target for many
                                SKUs by applying the right move per line (positive pulls from central,
                                negative returns to central — same as ± adjust). SKUs already at the
                                target are skipped.
                              </p>
                              <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
                                <label className="flex flex-col gap-1 text-xs text-violet-900 min-w-[100px]">
                                  <span className="font-medium">Target qty in warehouse</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="e.g. 10"
                                    value={whUniformTarget[wh.id] ?? ""}
                                    onChange={(e) =>
                                      setWhUniformTarget((prev) => ({
                                        ...prev,
                                        [wh.id]: e.target.value,
                                      }))
                                    }
                                    disabled={
                                      whUniformApplyingId === wh.id ||
                                      stockState.loading ||
                                      isUpdating
                                    }
                                    className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-xs text-violet-900 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(whUniformAllPages[wh.id])}
                                    onChange={(e) =>
                                      setWhUniformAllPages((prev) => ({
                                        ...prev,
                                        [wh.id]: e.target.checked,
                                      }))
                                    }
                                    disabled={
                                      whUniformApplyingId === wh.id ||
                                      stockState.loading ||
                                      isUpdating
                                    }
                                    className="rounded border-violet-400 text-violet-700"
                                  />
                                  <span>
                                    Entire warehouse (all pages, clears filters for fetch only)
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleUniformWarehouseQuantity(wh.id)}
                                  disabled={
                                    whUniformApplyingId === wh.id ||
                                    stockState.loading ||
                                    isUpdating ||
                                    String(whUniformTarget[wh.id] ?? "").trim() === ""
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {whUniformApplyingId === wh.id ? (
                                    <>
                                      <Loader2 className="animate-spin" size={16} />
                                      Applying…
                                    </>
                                  ) : (
                                    "Apply to all listed SKUs"
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {totalPages > 0 && (
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-gray-100 text-xs text-gray-600">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-700">
                                  Page {stockPage} / {totalPages}
                                </span>
                                <label className="inline-flex items-center gap-1.5 text-gray-600 ml-0 sm:ml-2">
                                  <span className="sr-only">Rows per page</span>
                                  <select
                                    value={stockPageSize}
                                    onChange={(e) => {
                                      setStockPageSize(Number(e.target.value));
                                      setStockPageByWarehouseId((prev) => ({
                                        ...prev,
                                        [wh.id]: 1,
                                      }));
                                    }}
                                    className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
                                  >
                                    {STOCK_PAGE_SIZE_OPTIONS.map((n) => (
                                      <option key={n} value={n}>
                                        {n} / page
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setStockPage(wh.id, 1)}
                                  disabled={
                                    stockPage <= 1 || stockState.loading
                                  }
                                  className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                                  title="First page"
                                  aria-label="First page"
                                >
                                  <ChevronsLeft size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStockPage(wh.id, stockPage - 1)
                                  }
                                  disabled={
                                    stockPage <= 1 || stockState.loading
                                  }
                                  className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                                >
                                  Prev
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStockPage(wh.id, stockPage + 1)
                                  }
                                  disabled={
                                    stockPage >= totalPages ||
                                    stockState.loading
                                  }
                                  className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                                >
                                  Next
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStockPage(wh.id, totalPages)
                                  }
                                  disabled={
                                    stockPage >= totalPages ||
                                    stockState.loading
                                  }
                                  className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                                  title="Last page"
                                  aria-label="Last page"
                                >
                                  <ChevronsRight size={16} />
                                </button>
                              </div>
                            </div>
                          )}

                          {stockState.loading ? (
                            <div className="py-6 space-y-3" aria-busy="true">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className="h-12 rounded-lg bg-gray-100 animate-pulse"
                                />
                              ))}
                              <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={14} />
                                Loading stock lines…
                              </p>
                            </div>
                          ) : stockState.error ? (
                            <div className="py-4 rounded-lg border border-red-100 bg-red-50/50 px-4">
                              <p className="text-sm text-red-700">
                                {stockState.error}
                              </p>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await refetchStockRow(wh.id);
                                  } catch (e) {
                                    toast.error(
                                      typeof e === "string"
                                        ? e
                                        : "Could not reload stock"
                                    );
                                  }
                                }}
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-800 hover:text-red-950"
                              >
                                <RefreshCw size={14} />
                                Retry load
                              </button>
                            </div>
                          ) : !stockState.data?.length ? (
                            <p className="py-4 text-sm text-gray-500">
                              {(stockItemSearch[wh.id] || stockSkuSearch[wh.id])
                                ?.trim()
                                ? "No stock matches your filters."
                                : "No stock in this warehouse yet. Add a SKU above."}
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {(() => {
                                const groups = new Map();
                                stockState.data.forEach((row) => {
                                  const key = stockRowGroupKey(row);
                                  if (!groups.has(key)) groups.set(key, []);
                                  groups.get(key).push(row);
                                });

                                const sortedEntries = Array.from(
                                  groups.entries()
                                ).sort(([, a], [, b]) => {
                                  const na = displayProductTitleForGroup(a);
                                  const nb = displayProductTitleForGroup(b);
                                  return na.localeCompare(nb, undefined, {
                                    sensitivity: "base",
                                  });
                                });

                                return sortedEntries.map(([groupKeyId, rows]) => {
                                  const skuSort = (x, y) =>
                                    String(x?.sku || x?.SKU || "").localeCompare(
                                      String(y?.sku || y?.SKU || ""),
                                      undefined,
                                      { numeric: true }
                                    );
                                  rows.sort(skuSort);

                                  const productTitle =
                                    displayProductTitleForGroup(rows);
                                  const variantCount = rows.length;

                                  return (
                                      <div
                                        key={groupKeyId}
                                        className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm"
                                      >
                                        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-200">
                                          <p className="text-sm font-semibold text-gray-900">
                                            {productTitle}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {variantCount} SKU
                                            {variantCount !== 1 ? "s" : ""} in
                                            this warehouse — adjust each line
                                            below
                                          </p>
                                        </div>
                                        <div className="px-3 sm:px-4 py-2 border-b border-gray-100 bg-white">
                                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-1.5 text-xs font-semibold text-gray-500">
                                            <span className="min-w-28 pl-2 sm:pl-3">
                                              SKU
                                            </span>
                                            <span className="min-w-20">ID</span>
                                            <span className="min-w-16">Stock</span>
                                            <span className="min-w-20">
                                              Central stock
                                            </span>
                                            <span className="ml-auto">
                                              ± Qty adjust
                                            </span>
                                          </div>
                                        </div>
                                        <ul className="divide-y divide-gray-100 bg-gray-50/30">
                                          {rows.map((item) => {
                                            const sku =
                                              item.sku || item.SKU || "—";
                                            const key = `${wh.id}-${sku}`;
                                            const inlineVal =
                                              inlineAddQty[key] !== undefined
                                                ? inlineAddQty[key]
                                                : "";
                                            const isInlineUpdating =
                                              updatingInlineKey === key;
                                            const warehouseQty =
                                              item.quantity ?? 0;
                                            const centralStock =
                                              item.centralStock ?? "—";

                                            return (
                                              <li
                                                key={
                                                  item._id || item.id || sku
                                                }
                                                className="py-2.5 px-2 sm:px-3 border-l-2 border-gray-200 ml-2 sm:ml-3 bg-white/80 first:pt-3 last:pb-3"
                                              >
                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                  <div className="flex items-center gap-1 min-w-28">
                                                    <span
                                                      className="text-sm font-mono font-medium text-gray-700 truncate max-w-40 sm:max-w-xs"
                                                      title={sku}
                                                    >
                                                      {sku}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        copySkuToClipboard(
                                                          sku,
                                                          key
                                                        )
                                                      }
                                                      className="p-1 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-100 shrink-0"
                                                      title="Copy SKU"
                                                      aria-label={`Copy SKU ${sku}`}
                                                    >
                                                      {copiedSkuKey === key ? (
                                                        <Check
                                                          size={14}
                                                          className="text-emerald-600"
                                                        />
                                                      ) : (
                                                        <Copy size={14} />
                                                      )}
                                                    </button>
                                                  </div>
                                                  <span
                                                    className="text-xs font-mono text-gray-500 min-w-20 truncate max-w-24"
                                                    title="ID"
                                                  >
                                                    {item._id
                                                      ? String(item._id).slice(
                                                          -8
                                                        )
                                                      : "—"}
                                                  </span>
                                                  <span
                                                    className="text-sm text-gray-700 min-w-16"
                                                    title="Stock (warehouse)"
                                                  >
                                                    <span className="text-gray-500 text-xs">
                                                      Stock:{" "}
                                                    </span>
                                                    <span
                                                      className={
                                                        warehouseQty < 10
                                                          ? "text-red-600 font-semibold"
                                                          : "font-semibold"
                                                      }
                                                    >
                                                      {warehouseQty}
                                                    </span>
                                                    {warehouseQty < 10 && (
                                                      <span className="ml-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                                        Low
                                                      </span>
                                                    )}
                                                  </span>
                                                  <span
                                                    className="text-sm text-gray-700 min-w-20"
                                                    title="Central stock (Item model)"
                                                  >
                                                    <span className="text-gray-500 text-xs">
                                                      Central:{" "}
                                                    </span>
                                                    <span className="font-medium">
                                                      {centralStock}
                                                    </span>
                                                  </span>
                                                  <div className="flex items-center gap-2 ml-auto">
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                      ± Qty:
                                                    </span>
                                                    <input
                                                      type="number"
                                                      placeholder="+/−"
                                                      value={inlineVal}
                                                      onChange={(e) =>
                                                        setInlineAddQty(
                                                          (prev) => ({
                                                            ...prev,
                                                            [key]:
                                                              e.target.value,
                                                          })
                                                        )
                                                      }
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          e.preventDefault();
                                                          handleInlineAddStock(
                                                            wh.id,
                                                            sku,
                                                            inlineVal
                                                          );
                                                        }
                                                      }}
                                                      className="w-20 px-2.5 py-1.5 border border-gray-300 rounded text-sm"
                                                      aria-label={`Add quantity for ${sku}`}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleInlineAddStock(
                                                          wh.id,
                                                          sku,
                                                          inlineVal
                                                        )
                                                      }
                                                      disabled={
                                                        isInlineUpdating ||
                                                        !inlineVal ||
                                                        Number(inlineVal) === 0 ||
                                                        Number.isNaN(Number(inlineVal))
                                                      }
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                      {isInlineUpdating ? (
                                                        <>
                                                          <Loader2
                                                            className="animate-spin"
                                                            size={14}
                                                          />
                                                          …
                                                        </>
                                                      ) : (
                                                        "Apply"
                                                      )}
                                                    </button>
                                                  </div>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                  <span>
                    Page {warehousePage} of {warehouseTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWarehousePage((p) => Math.max(1, p - 1))}
                      disabled={warehousePage === 1 || warehousesLoading}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWarehousePage((p) =>
                          Math.min(warehouseTotalPages, p + 1)
                        )
                      }
                      disabled={
                        warehousePage >= warehouseTotalPages ||
                        warehousesLoading
                      }
                      className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
