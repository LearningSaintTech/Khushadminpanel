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
} from "lucide-react";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
} from "../../apis/Warehouseapi";

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

    if (!sku || Number.isNaN(quantity) || quantity < 0) {
      toast.error("Enter a valid SKU and a non-negative quantity");
      return;
    }

    setUpdatingStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: true }));
    try {
      await updateWarehouseStock(warehouseId, { sku, quantity });
      await refetchStockRow(warehouseId);
      setFormForWarehouse(warehouseId, { sku: "", quantity: "" });
      toast.success(`Moved ${quantity} unit(s) to warehouse — ${sku}`);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message ||
            err?.message ||
            "Failed to update stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(
        msg
      );
      const isInsufficientStock =
        /insufficient stock|available.*requested/i.test(msg) && !isSkuNotFound;
      if (isSkuNotFound) {
        toast.error(
          "SKU not in catalog — add it to an item in Central stock / catalog first."
        );
      } else if (isInsufficientStock) {
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
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("Enter a quantity greater than 0");
      return;
    }
    const key = `${warehouseId}-${sku}`;
    setUpdatingInlineKey(key);
    try {
      await updateWarehouseStock(warehouseId, {
        sku: sku.trim(),
        quantity,
      });
      await refetchStockRow(warehouseId);
      setInlineAddQty((prev) => ({ ...prev, [key]: "" }));
      toast.success(`Added ${quantity} to warehouse — ${sku.trim()}`);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message ||
            err?.message ||
            "Failed to add stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(
        msg
      );
      const isInsufficientStock =
        /insufficient stock|available.*requested/i.test(msg) && !isSkuNotFound;
      if (isSkuNotFound) {
        toast.error(
          "SKU not in catalog — add it to an item in Central stock / catalog first."
        );
      } else if (isInsufficientStock) {
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
              Move stock from <strong>central catalog</strong> into each warehouse. Use
              filters and pagination to work with large lists.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
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
                            Add stock from central inventory
                          </h4>
                          <p className="text-xs text-gray-500 mb-3 max-w-2xl">
                            Quantity is deducted from the item&apos;s{" "}
                            <strong>central</strong> stock and added to this warehouse.
                            SKU must already exist on a product.
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
                              placeholder="Quantity to move"
                              min="0"
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
                                "Move to warehouse"
                              )}
                            </button>
                          </form>
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
                                const groupKey = (row) =>
                                  row.itemId ||
                                  row.productName ||
                                  row.name ||
                                  row.sku;
                                const groups = new Map();
                                stockState.data.forEach((row) => {
                                  const key = groupKey(row);
                                  if (!groups.has(key)) groups.set(key, []);
                                  groups.get(key).push(row);
                                });

                                return Array.from(groups.entries()).map(
                                  ([groupKeyId, rows]) => {
                                    const itemName =
                                      rows[0]?.productName ||
                                      rows[0]?.name ||
                                      "Item";

                                    return (
                                      <div
                                        key={groupKeyId}
                                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 pb-2 border-b border-gray-100">
                                          <p className="text-sm font-semibold text-gray-900">
                                            {itemName}
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                                          <span className="min-w-28">SKU</span>
                                          <span className="min-w-20">ID</span>
                                          <span className="min-w-16">Stock</span>
                                          <span className="min-w-20">
                                            Central stock
                                          </span>
                                          <span className="ml-auto">
                                            Add quantity
                                          </span>
                                        </div>
                                        <ul className="divide-y divide-gray-100">
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
                                                className="py-2.5 first:pt-0 last:pb-0"
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
                                                      Add quantity:
                                                    </span>
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      placeholder="Qty"
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
                                                        Number(inlineVal) <= 0
                                                      }
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                      {isInlineUpdating ? (
                                                        <>
                                                          <Loader2
                                                            className="animate-spin"
                                                            size={14}
                                                          />
                                                          Add…
                                                        </>
                                                      ) : (
                                                        "Add"
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
                                  }
                                );
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
