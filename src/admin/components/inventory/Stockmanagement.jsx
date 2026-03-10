import { useEffect, useState, useRef } from "react";
import { PackageSearch, Warehouse as WarehouseIcon } from "lucide-react";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
} from "../../apis/Warehouseapi";
import { getItemsWithSkus } from "../../apis/itemapi";

export default function Stockmanagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehousesError, setWarehousesError] = useState(null);

  const updateFormRef = useRef(null);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // ── Warehouse Stock ────────────────────────────────────────────────
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 15;
  const [stockTotalPages, setStockTotalPages] = useState(1);

  // ── Add Stock: Items + SKUs catalog ────────────────────────────────
  const [itemSkuRows, setItemSkuRows] = useState([]);
  const [itemSkuLoading, setItemSkuLoading] = useState(false);
  const [itemSkuError, setItemSkuError] = useState(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const ITEM_PAGE_SIZE = 10;
  const [itemTotalPages, setItemTotalPages] = useState(1);

  // Form for updating/adding stock
  const [stockForm, setStockForm] = useState({
    sku: "",
    quantity: "",
  });
  const [updatingStock, setUpdatingStock] = useState(false);

  // ────────────────────────────────────────────────
  // Load warehouses (once)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const response = await getWarehouses(1, 200, "");
        const data = response?.data?.data || response?.data || {};
        const warehouseList = data.warehouses || data.items || data || [];

        const formatted = warehouseList.map((wh, idx) => {
          const addr = wh.address || {};
          return {
            id: wh._id || wh.id || `temp-${idx}`,
            name: wh.name || "",
            city: addr.city || "",
            state: addr.state || "",
            displayName: wh.name
              ? `${wh.name}${addr.city ? ` — ${addr.city}` : ""}`
              : `Warehouse ${idx + 1}`,
          };
        });

        setWarehouses(formatted);
        setWarehousesError(null);
      } catch (err) {
        console.error("Failed to load warehouses:", err);
        setWarehousesError(err?.response?.data?.message || "Failed to load warehouses");
      } finally {
        setWarehousesLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  // ────────────────────────────────────────────────
  // Load items + SKUs (backend search + pagination)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!itemSearch && itemPage === 1 && itemSkuRows.length > 0) {
      // optional: prevent unnecessary reload on mount if we already have data
      return;
    }

    const fetchItemsWithSkus = async () => {
      setItemSkuLoading(true);
      setItemSkuError(null);

      try {
        const response = await getItemsWithSkus(
          itemPage,
          ITEM_PAGE_SIZE,
          1,           // assuming this is some level/minimum SKU count or similar
          50,          // assuming this is max SKUs per item or similar
          itemSearch   // ← search term sent to backend
        );

        const data = response?.data?.data || response?.data || {};
        const items = data.items || data || [];

        const rows = [];
        items.forEach((item) => {
          const name = item.name || "—";
          const itemId = item.itemId || item._id || "";
          const skus = item.skuIds || item.skus || [];

          skus.forEach((skuId) => {
            rows.push({
              itemName: name,
              itemId,
              sku: skuId,
            });
          });
        });

        setItemSkuRows(rows);
        const pagination = data.pagination || {};
        setItemTotalPages(pagination.totalPages || pagination.pages || 1);
      } catch (err) {
        console.error("Failed to load items with SKUs:", err);
        setItemSkuError(err?.response?.data?.message || "Failed to load items/SKUs");
      } finally {
        setItemSkuLoading(false);
      }
    };

    fetchItemsWithSkus();
  }, [itemPage, itemSearch]);

  // ────────────────────────────────────────────────
  // Load warehouse stock (backend search + pagination)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedWarehouseId) {
      setSelectedWarehouse(null);
      setStock([]);
      setStockError(null);
      setStockTotalPages(1);
      return;
    }

    const wh = warehouses.find((w) => w.id === selectedWarehouseId) || null;
    setSelectedWarehouse(wh);

    const fetchStock = async () => {
      setStockLoading(true);
      setStockError(null);

      try {
        const response = await getWarehouseStock(
          selectedWarehouseId,
          stockPage,
          STOCK_PAGE_SIZE,
          stockSearch
        );

        const data = response?.data?.data || response?.data || {};
        setStock(data.stock || data.items || data || []);

        const pagination = data.pagination || {};
        setStockTotalPages(pagination.totalPages || pagination.pages || 1);
      } catch (err) {
        console.error("Failed to load warehouse stock:", err);
        setStockError(
          err?.response?.data?.message || "Failed to load stock for this warehouse"
        );
      } finally {
        setStockLoading(false);
      }
    };

    fetchStock();
  }, [selectedWarehouseId, warehouses, stockPage, stockSearch]);

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const handleWarehouseChange = (e) => {
    const value = e.target.value;
    setSelectedWarehouseId(value);
    setStock([]);
    setStockSearch("");
    setStockPage(1);
    setStockForm({ sku: "", quantity: "" });
  };

  const handleRowClick = (item) => {
    if (!item) return;
    setStockForm((prev) => ({
      ...prev,
      sku: item.sku || item.SKU || prev.sku,
    }));
    updateFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleUpdateStock = async () => {
    if (!selectedWarehouseId) {
      alert("Please select a warehouse first");
      return;
    }

    const sku = stockForm.sku.trim();
    const quantity = Number(stockForm.quantity);

    if (!sku || Number.isNaN(quantity)) {
      alert("Please enter a valid SKU and quantity");
      return;
    }

    setUpdatingStock(true);
    try {
      await updateWarehouseStock(selectedWarehouseId, { sku, quantity });

      // Refresh current page (or go to page 1)
      const response = await getWarehouseStock(
        selectedWarehouseId,
        1,
        STOCK_PAGE_SIZE,
        stockSearch
      );
      const data = response?.data?.data || response?.data || {};
      setStock(data.stock || data.items || data || []);
      setStockPage(1);
      setStockTotalPages(data.pagination?.totalPages || 1);

      setStockForm({ sku: "", quantity: "" });
    } catch (err) {
      console.error("Failed to update stock:", err);
      alert(err?.response?.data?.message || "Failed to update stock");
    } finally {
      setUpdatingStock(false);
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
              Select a warehouse and manage SKU-wise stock in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Warehouse selector */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <WarehouseIcon size={18} className="text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Warehouse
              </p>
              <p className="text-sm font-medium text-gray-900">
                {selectedWarehouse?.name || "Choose a warehouse"}
              </p>
            </div>
          </div>

          <div className="w-full md:w-72">
            <select
              value={selectedWarehouseId}
              onChange={handleWarehouseChange}
              disabled={warehousesLoading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100"
            >
              <option value="">
                {warehousesLoading ? "Loading warehouses..." : "Select warehouse"}
              </option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.displayName}
                </option>
              ))}
            </select>
            {warehousesError && (
              <p className="mt-1 text-xs text-red-600">{warehousesError}</p>
            )}
          </div>
        </div>

        {/* Update stock form */}
        <div
          ref={updateFormRef}
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Update / Add SKU Stock
            </h2>
            <p className="text-xs text-gray-500">POST /warehouse/:warehouseId/stock</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="SKU (e.g. TL-BLK-S)"
              value={stockForm.sku}
              onChange={(e) =>
                setStockForm((prev) => ({ ...prev, sku: e.target.value }))
              }
              className="px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Quantity"
              min="0"
              value={stockForm.quantity}
              onChange={(e) =>
                setStockForm((prev) => ({ ...prev, quantity: e.target.value }))
              }
              className="px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleUpdateStock}
              disabled={updatingStock || !selectedWarehouseId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updatingStock ? "Updating..." : "Update Stock"}
            </button>
          </div>

          {!selectedWarehouseId && (
            <p className="text-xs text-amber-600">
              Select a warehouse first to update its stock.
            </p>
          )}
        </div>

        {/* Warehouse Stock Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="border-b border-gray-100 px-4 sm:px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Warehouse Stock
              </h2>
              <p className="text-xs text-gray-500">
                Search by SKU or product name • click row to autofill SKU
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <PackageSearch size={16} />
              </span>
              <input
                type="text"
                placeholder="Search SKU or product..."
                value={stockSearch}
                onChange={(e) => {
                  setStockSearch(e.target.value);
                  setStockPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-b-xl">
            {stockLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">Loading stock...</div>
            ) : stockError ? (
              <div className="py-10 text-center text-sm text-red-600">{stockError}</div>
            ) : !selectedWarehouseId ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Select a warehouse to view its stock.
              </div>
            ) : stock.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                {stockSearch.trim()
                  ? "No matching stock records found."
                  : "No stock records in this warehouse yet."}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 w-32">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stock.map((item) => (
                        <tr
                          key={item._id || item.id || item.sku}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(item)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.sku || item.SKU || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.productName || item.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={`${
                                  (item.quantity ?? 0) < 10 ? "text-red-600" : "text-gray-900"
                                }`}
                              >
                                {item.quantity ?? 0}
                              </span>
                              {(item.quantity ?? 0) < 10 && (
                                <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                  Low
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                  <span>
                    Page {stockPage} of {stockTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                      disabled={stockPage === 1}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setStockPage((p) => Math.min(stockTotalPages, p + 1))}
                      disabled={stockPage >= stockTotalPages}
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

        {/* All Items & SKUs */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="border-b border-gray-100 px-4 sm:px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Catalog – Items & SKUs
              </h2>
              <p className="text-xs text-gray-500">
                Search items/SKUs • click to copy SKU into update form
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <PackageSearch size={16} />
              </span>
              <input
                type="text"
                placeholder="Search item name or SKU..."
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setItemPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-b-xl">
            {itemSkuLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">Loading catalog...</div>
            ) : itemSkuError ? (
              <div className="py-10 text-center text-sm text-red-600">{itemSkuError}</div>
            ) : itemSkuRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                {itemSearch.trim()
                  ? "No matching items or SKUs found."
                  : "No items/SKUs available in catalog."}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          SKU
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemSkuRows.map((row, idx) => (
                        <tr
                          key={`${row.itemId || "i"}-${row.sku}-${idx}`}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setStockForm((prev) => ({ ...prev, sku: row.sku }));
                            updateFormRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">{row.itemName}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">
                            {row.sku}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                  <span>
                    Page {itemPage} of {itemTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                      disabled={itemPage === 1 || itemSkuLoading}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setItemPage((p) => Math.min(itemTotalPages, p + 1))}
                      disabled={itemPage >= itemTotalPages || itemSkuLoading}
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