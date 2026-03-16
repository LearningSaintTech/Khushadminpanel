import { useEffect, useState } from "react";
import { PackageSearch, Warehouse as WarehouseIcon } from "lucide-react";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
} from "../../apis/Warehouseapi";

const WAREHOUSE_PAGE_SIZE = 8;
const STOCK_PAGE_SIZE = 50;

export default function Stockmanagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehousesError, setWarehousesError] = useState(null);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehousePage, setWarehousePage] = useState(1);
  const [warehouseTotalPages, setWarehouseTotalPages] = useState(1);

  // Stock per warehouse: { [warehouseId]: { data, loading, error } }
  const [stockByWarehouseId, setStockByWarehouseId] = useState({});
  // Add/update form per warehouse: { [warehouseId]: { sku, quantity } }
  const [stockFormByWarehouseId, setStockFormByWarehouseId] = useState({});
  const [updatingStockByWarehouseId, setUpdatingStockByWarehouseId] = useState({});
  // Inline "add quantity" input per warehouse+sku: { "warehouseId-sku": "123" }
  const [inlineAddQty, setInlineAddQty] = useState({});
  const [updatingInlineKey, setUpdatingInlineKey] = useState(null);
  // Search existing stock: by item name (per warehouse), by SKU (per item card)
  const [existingStockItemSearch, setExistingStockItemSearch] = useState({});
  const [existingStockSkuSearch, setExistingStockSkuSearch] = useState({});

  // ────────────────────────────────────────────────
  // Load warehouses (paginated + search by name)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const response = await getWarehouses(
          warehousePage,
          WAREHOUSE_PAGE_SIZE,
          warehouseSearch.trim()
        );
        const data = response?.data?.data || response?.data || {};
        const warehouseList = data.data || data.warehouses || data.items || (Array.isArray(data) ? data : []);

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
        console.error("Failed to load warehouses:", err);
        setWarehousesError(err?.response?.data?.message || "Failed to load warehouses");
      } finally {
        setWarehousesLoading(false);
      }
    };

    fetchWarehouses();
  }, [warehousePage, warehouseSearch]);

  // ────────────────────────────────────────────────
  // Load stock for each visible warehouse
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!warehouses.length) return;

    const fetchAllStock = async () => {
      const updates = {};
      warehouses.forEach((wh) => {
        updates[wh.id] = { data: [], loading: true, error: null };
      });
      setStockByWarehouseId((prev) => ({ ...prev, ...updates }));

      const results = await Promise.all(
        warehouses.map((wh) =>
          getWarehouseStock(wh.id, 1, STOCK_PAGE_SIZE)
            .then((r) => ({ id: wh.id, res: r }))
            .catch((e) => ({ id: wh.id, err: e }))
        )
      );

      const next = {};
      results.forEach(({ id, res, err }) => {
        if (err) {
          next[id] = {
            data: [],
            loading: false,
            error: err?.response?.data?.message || "Failed to load stock",
          };
        } else {
          const data = res?.data?.data || res?.data || {};
          const list = data.data || data.stock || data.items || data || [];
          console.log("Warehouse stock response:", { warehouseId: id, raw: res?.data, data: list });
          next[id] = {
            data: list,
            loading: false,
            error: null,
          };
        }
      });
      setStockByWarehouseId((prev) => ({ ...prev, ...next }));
    };

    fetchAllStock();
  }, [warehouses]);

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
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
      alert("Please enter a valid SKU and quantity");
      return;
    }

    setUpdatingStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: true }));
    try {
      await updateWarehouseStock(warehouseId, { sku, quantity });
      const response = await getWarehouseStock(warehouseId, 1, STOCK_PAGE_SIZE);
      const data = response?.data?.data || response?.data || {};
      const list = data.data || data.stock || data.items || data || [];
      setStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: { data: list, loading: false, error: null } }));
      setFormForWarehouse(warehouseId, { sku: "", quantity: "" });
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message || err?.message || "Failed to update stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(msg);
      const isInsufficientStock = /insufficient stock|available.*requested/i.test(msg) && !isSkuNotFound;
      if (isSkuNotFound) {
        alert(`SKU not found: ${msg}\n\nAdd this SKU to an item in the catalog first, then try again.`);
      } else if (isInsufficientStock) {
        alert(`⚠️ Warning: ${msg}\n\nReduce the quantity to the available central stock, or add more stock to the item first.`);
      } else {
        alert(msg);
      }
    } finally {
      setUpdatingStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: false }));
    }
  };

  const handleInlineAddStock = async (warehouseId, sku, quantityStr) => {
    const quantity = Number(quantityStr);
    if (Number.isNaN(quantity) || quantity <= 0) {
      alert("Enter a valid quantity to add");
      return;
    }
    const key = `${warehouseId}-${sku}`;
    setUpdatingInlineKey(key);
    try {
      await updateWarehouseStock(warehouseId, { sku: sku.trim(), quantity });
      const response = await getWarehouseStock(warehouseId, 1, STOCK_PAGE_SIZE);
      const data = response?.data?.data || response?.data || {};
      const list = data.data || data.stock || data.items || data || [];
      setStockByWarehouseId((prev) => ({ ...prev, [warehouseId]: { data: list, loading: false, error: null } }));
      setInlineAddQty((prev) => ({ ...prev, [key]: "" }));
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message || err?.message || "Failed to add stock";
      const isSkuNotFound = /does not exist|not exist in central|could not find sku/i.test(msg);
      const isInsufficientStock = /insufficient stock|available.*requested/i.test(msg) && !isSkuNotFound;
      if (isSkuNotFound) {
        alert(`SKU not found: ${msg}\n\nAdd this SKU to an item in the catalog first, then try again.`);
      } else if (isInsufficientStock) {
        alert(`⚠️ Warning: ${msg}\n\nReduce the quantity to the available central stock, or add more stock to the item first.`);
      } else {
        alert(msg);
      }
    } finally {
      setUpdatingInlineKey(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
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
              Manage SKU-wise stock for each warehouse. Add stock or update per item below.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Warehouse list: search + paginated boxes */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 sm:px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Warehouses
              </h2>
              <p className="text-xs text-gray-500">
                Search by name • click a warehouse to manage its stock
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <PackageSearch size={16} />
              </span>
              <input
                type="text"
                placeholder="Search warehouse by name..."
                value={warehouseSearch}
                onChange={(e) => {
                  setWarehouseSearch(e.target.value);
                  setWarehousePage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {warehousesLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Loading warehouses...
              </div>
            ) : warehousesError ? (
              <p className="py-4 text-center text-sm text-red-600">{warehousesError}</p>
            ) : warehouses.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                {warehouseSearch.trim()
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
                    };
                    const form = getFormForWarehouse(wh.id);
                    const isUpdating = updatingStockByWarehouseId[wh.id];

                    return (
                      <div
                        key={wh.id}
                        className="rounded-xl border-2 border-gray-200 bg-gray-50/50 overflow-hidden"
                      >
                        {/* Warehouse header — 1 card per row, bigger */}
                        <div className="bg-white border-b border-gray-200 px-5 py-5 sm:px-6 sm:py-6">
                          <div className="flex items-start gap-4">
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <WarehouseIcon size={28} className="text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                                {wh.name || "Unnamed Warehouse"}
                              </h3>
                              {wh.code && (
                                <p className="text-sm text-gray-500 font-mono mt-1">
                                  {wh.code}
                                </p>
                              )}
                              {(wh.city || wh.state) && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {[wh.city, wh.state].filter(Boolean).join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Update / Add SKU Stock form — inside this card */}
                        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-white border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Update / Add SKU Stock
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="SKU (e.g. TL-BLK-S)"
                              value={form.sku}
                              onChange={(e) =>
                                setFormForWarehouse(wh.id, { sku: e.target.value })
                              }
                              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                            <input
                              type="number"
                              placeholder="Quantity to add"
                              min="0"
                              value={form.quantity}
                              onChange={(e) =>
                                setFormForWarehouse(wh.id, {
                                  quantity: e.target.value,
                                })
                              }
                              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateStock(wh.id)}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? "Updating..." : "Update Stock"}
                            </button>
                          </div>
                        </div>

                        {/* Existing items with stock + box under each item */}
                        <div className="px-5 py-4 sm:px-6 sm:py-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Existing stock
                            </h4>
                            <input
                              type="text"
                              placeholder="Search items..."
                              value={existingStockItemSearch[wh.id] ?? ""}
                              onChange={(e) =>
                                setExistingStockItemSearch((prev) => ({
                                  ...prev,
                                  [wh.id]: e.target.value,
                                }))
                              }
                              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>
                          {stockState.loading ? (
                            <div className="py-8 text-center text-sm text-gray-500">
                              Loading stock...
                            </div>
                          ) : stockState.error ? (
                            <p className="py-4 text-sm text-red-600">
                              {stockState.error}
                            </p>
                          ) : !stockState.data?.length ? (
                            <p className="py-4 text-sm text-gray-500">
                              No stock in this warehouse yet. Add a SKU above.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {(() => {
                                const itemSearch =
                                  (existingStockItemSearch[wh.id] ?? "").trim().toLowerCase();
                                const groupKey = (row) =>
                                  row.itemId || row.productName || row.name || row.sku;
                                const groups = new Map();
                                stockState.data.forEach((row) => {
                                  const key = groupKey(row);
                                  if (!groups.has(key)) groups.set(key, []);
                                  groups.get(key).push(row);
                                });

                                let entries = Array.from(groups.entries());
                                if (itemSearch) {
                                  entries = entries.filter(([, rows]) => {
                                    const name =
                                      rows[0]?.productName ||
                                      rows[0]?.name ||
                                      "Item";
                                    return name.toLowerCase().includes(itemSearch);
                                  });
                                }

                                return entries.map(
                                  ([groupKeyId, rows]) => {
                                    const itemName =
                                      rows[0]?.productName ||
                                      rows[0]?.name ||
                                      "Item";
                                    const skuSearchKey = `${wh.id}-${groupKeyId}`;
                                    const skuSearch =
                                      (existingStockSkuSearch[skuSearchKey] ?? "").trim().toLowerCase();
                                    const filteredRows = skuSearch
                                      ? rows.filter((item) =>
                                          (item.sku || item.SKU || "")
                                            .toLowerCase()
                                            .includes(skuSearch)
                                        )
                                      : rows;

                                    return (
                                      <div
                                        key={groupKeyId}
                                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 pb-2 border-b border-gray-100">
                                          <p className="text-sm font-semibold text-gray-900">
                                            {itemName}
                                          </p>
                                          <input
                                            type="text"
                                            placeholder="Search SKU..."
                                            value={existingStockSkuSearch[skuSearchKey] ?? ""}
                                            onChange={(e) =>
                                              setExistingStockSkuSearch((prev) => ({
                                                ...prev,
                                                [skuSearchKey]: e.target.value,
                                              }))
                                            }
                                            className="w-full sm:w-36 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-black focus:border-transparent"
                                          />
                                        </div>
                                        {filteredRows.length === 0 ? (
                                          <p className="text-xs text-gray-500 py-2">
                                            {skuSearch
                                              ? "No SKUs match your search."
                                              : "No stock in this item."}
                                          </p>
                                        ) : (
                                        <>
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                                          <span className="min-w-24">SKU</span>
                                          <span className="min-w-20">ID</span>
                                          <span className="min-w-16">Stock</span>
                                          <span className="min-w-20">Central stock</span>
                                          <span className="ml-auto">Add quantity</span>
                                        </div>
                                        <ul className="divide-y divide-gray-100">
                                          {filteredRows.map((item) => {
                                            const sku =
                                              item.sku || item.SKU || "—";
                                            const key = `${wh.id}-${sku}`;
                                            const inlineVal =
                                              inlineAddQty[key] !== undefined
                                                ? inlineAddQty[key]
                                                : "";
                                            const isInlineUpdating =
                                              updatingInlineKey === key;
                                            const warehouseQty = item.quantity ?? 0;
                                            const centralStock = item.centralStock ?? "—";

                                            return (
                                              <li
                                                key={
                                                  item._id || item.id || sku
                                                }
                                                className="py-2.5 first:pt-0 last:pb-0"
                                              >
                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                  <span className="text-sm font-mono font-medium text-gray-700 min-w-24" title="SKU">
                                                    {sku}
                                                  </span>
                                                  <span className="text-xs font-mono text-gray-500 min-w-20 truncate max-w-24" title="ID">
                                                    {item._id ? String(item._id).slice(-8) : "—"}
                                                  </span>
                                                  <span className="text-sm text-gray-700 min-w-16" title="Stock (warehouse)">
                                                    <span className="text-gray-500 text-xs">Stock: </span>
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
                                                  <span className="text-sm text-gray-700 min-w-20" title="Central stock (Item model)">
                                                    <span className="text-gray-500 text-xs">Central: </span>
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
                                                      placeholder="0"
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
                                                      className="w-20 px-2.5 py-1.5 border border-gray-300 rounded text-sm"
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
                                                      className="px-3 py-1.5 rounded border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                      {isInlineUpdating
                                                        ? "Adding..."
                                                        : "Add"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                        </>
                                        )}
                                      </div>
                                    );
                                  }
                                );
                              })()}
                            </div>
                          )}
                        </div>
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