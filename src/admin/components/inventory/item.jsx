import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import toast from "react-hot-toast";
import { X, Loader2 } from "lucide-react";
import {
  getItemsBySubcategory,
  bulkUploadItems,
  updateItem,
  getSingleItem,
} from "../../apis/itemapi";
import {
  getWarehouses,
  getWarehouseStock,
  updateWarehouseStock,
  addWarehouseStockFromItem,
} from "../../apis/Warehouseapi";
import { itemHasSizeChartContent } from "../../../utils/designerSizeChartDisplay.js";
import ItemPricingHistoryModal from "./ItemPricingHistoryModal.jsx";

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

export default function Items() {
  const { categoryId, subcategoryId } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [jsonFile, setJsonFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingPriceItemId, setEditingPriceItemId] = useState(null);
  const [editingDiscountItemId, setEditingDiscountItemId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingDiscountValue, setEditingDiscountValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  /** Warehouse stock modal (per product row) */
  const [warehouseUiItem, setWarehouseUiItem] = useState(null);
  const [warehouseListOpts, setWarehouseListOpts] = useState([]);
  const [warehouseListLoading, setWarehouseListLoading] = useState(false);
  const [pickWarehouseId, setPickWarehouseId] = useState("");
  const [whQtyPerSku, setWhQtyPerSku] = useState("1");
  const [whApplyLoading, setWhApplyLoading] = useState(false);
  const [whPresence, setWhPresence] = useState([]);
  const [whPresenceLoading, setWhPresenceLoading] = useState(false);

  const [pricingHistoryItem, setPricingHistoryItem] = useState(null);

  console.log("[Items.jsx] Component mounted / re-rendered");
  console.log(
    "[Items.jsx] Params → categoryId:",
    categoryId,
    "subcategoryId:",
    subcategoryId,
  );

  // Fetch items
  const fetchItems = async (page = 1, limit = 10, search = "") => {
    console.log(
      `[Items.jsx] fetchItems called — page: ${page}, limit: ${limit}, subcategoryId: ${subcategoryId}, search: "${search}"`,
    );

    try {
      setLoading(true);
      console.log("[Items.jsx] → Calling API: getItemsBySubcategory");

      const res = await getItemsBySubcategory(
        subcategoryId,
        page,
        limit,
        search || "",
      );

      console.log("[Items.jsx] ← API response received", res);

      const root = res?.data ?? res ?? {};
      const payload =
        root?.data && typeof root.data === "object" && !Array.isArray(root.data)
          ? root.data
          : root;
      const list = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
      const pag = payload?.pagination ?? root?.pagination ?? null;

      setItems(list);
      setPagination(pag);

      console.log("[Items.jsx] State updated → items:", list.length);
    } catch (err) {
      console.error("[Items.jsx] Fetch items FAILED");
      console.error("[Items.jsx] Error:", err);
    } finally {
      setLoading(false);
      console.log("[Items.jsx] Loading finished");
    }
  };

  useEffect(() => {
    console.log("[Items.jsx] useEffect triggered — fetching items");
    if (!subcategoryId) {
      console.warn("[Items.jsx] No subcategoryId → skipping fetch");
      return;
    }
    const normalizedSearch = appliedSearchTerm.trim();
    // Search API query is sent only when the user enters text.
    fetchItems(1, 10, normalizedSearch);
  }, [subcategoryId, appliedSearchTerm]);

  const handleSearchClick = () => {
    const normalized = searchTerm.trim();
    if (!normalized) return;
    setAppliedSearchTerm(normalized);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setAppliedSearchTerm("");
  };

  const fetchWarehousePresenceForItem = useCallback(async (item, opts) => {
    const itemIdStr = String(item._id);
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
    const itemId = String(warehouseUiItem._id);
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
  ]);

  // Navigation
  const openCreate = () => {
    console.log("[Items.jsx] → Navigate to CREATE product");
    navigate(`/admin/inventory/items/${categoryId}/${subcategoryId}/create`);
  };

  const openEdit = (item) => {
    console.log(
      "[Items.jsx] → Navigate to EDIT product:",
      item._id || item.productId,
      item.name,
    );
    navigate(
      `/admin/inventory/items/${categoryId}/${subcategoryId}/edit/${
        item._id || item.productId
      }`,
    );
  };

  const goBackToSubcategory = () => {
    console.log("[Items.jsx] → Back to subcategories list");
    navigate(`/admin/inventory/subcategories/${categoryId}`);
  };

  const handleBulkUpload = async () => {
    if (!jsonFile) {
      alert("Please select products JSON file");
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

      console.log("Bulk upload response:", res);

      alert(res?.data?.message || "Bulk upload completed");

      fetchItems(1, 10, appliedSearchTerm.trim()); // refresh list
    } catch (error) {
      console.error("Bulk upload failed:", error);
      alert(error?.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startPriceEdit = (e, item) => {
    e.stopPropagation();
    setEditingDiscountItemId(null);
    setEditingPriceItemId(item._id);
    setEditingPriceValue(String(item.price ?? ""));
  };

  const startDiscountEdit = (e, item) => {
    e.stopPropagation();
    setEditingPriceItemId(null);
    setEditingDiscountItemId(item._id);
    setEditingDiscountValue(
      item.discountedPrice === null || item.discountedPrice === undefined
        ? ""
        : String(item.discountedPrice),
    );
  };

  const cancelInlineEdit = (e) => {
    e.stopPropagation();
    setEditingPriceItemId(null);
    setEditingDiscountItemId(null);
    setEditingPriceValue("");
    setEditingDiscountValue("");
  };

  const saveInlinePrice = async (e, itemId) => {
    e.stopPropagation();
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
      await fetchItems(pagination?.page || 1, 10, appliedSearchTerm.trim());
    } catch (error) {
      console.error("Failed to update MRP:", error);
      alert(error?.message || "Failed to update MRP");
    } finally {
      setSavingPrice(false);
    }
  };

  const saveInlineDiscount = async (e, itemId) => {
    e.stopPropagation();
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
      await fetchItems(pagination?.page || 1, 10, appliedSearchTerm.trim());
    } catch (error) {
      console.error("Failed to update discounted price:", error);
      alert(error?.message || "Failed to update discounted price");
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black scroll-smooth">
      {/* Top Header */}
      <div className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
              P
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Products
              </h1>
              <p className="text-xs sm:text-sm text-stone-500">
                Manage all items inside this subcategory.{" "}
                <button
                  type="button"
                  onClick={() => navigate(ap("designer/inventory?syncCatalog=1"))}
                  className="font-medium text-brand-600 hover:underline"
                >
                  Sync missing items to designer panel
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-full border border-black text-sm font-medium hover:bg-brand-600 hover:text-white transition-colors"
            >
              Bulk Upload
            </button>

            <button
              onClick={openCreate}
              className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Sticky Search / Controls Bar */}
        <div className="border-t border-black/5 bg-white">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={goBackToSubcategory}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-black/10 text-xs sm:text-sm font-medium hover:bg-brand-600 hover:text-white transition-colors"
              >
                ← Back
              </button>

              <div className="flex-1 relative">
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    console.log(
                      "[Items.jsx] Search term changed:",
                      e.target.value,
                    );
                    setSearchTerm(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchClick();
                    }
                  }}
                  placeholder="Search by exact product name or product ID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100/80 focus:border-brand-500/80 bg-white"
                />
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">
                  🔍
                </span>
              </div>
              <button
                onClick={handleSearchClick}
                disabled={!searchTerm.trim()}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Search
              </button>
              <button
                onClick={handleClearSearch}
                disabled={!searchTerm && !appliedSearchTerm}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-black/20 text-sm font-medium hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear
              </button>

              <button
                onClick={openCreate}
                className="sm:hidden inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {showBulkUpload && (
  <div className="px-4 sm:px-6 lg:px-8 py-6">
    <div className="bg-canvas-muted border border-black/10 rounded-2xl p-6 max-w-xl">

      <h2 className="text-lg font-semibold mb-4">Bulk Upload Products</h2>

      <div className="flex flex-col gap-4">

        {/* JSON FILE */}
        <div>
          <label className="text-sm font-medium">Products JSON File</label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setJsonFile(e.target.files[0])}
            className="mt-2 block w-full text-sm"
          />
        </div>

        {/* IMAGES */}
        <div>
          <label className="text-sm font-medium">Product Images</label>
          <input
            type="file"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files))}
            className="mt-2 block w-full text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">

          <button
            onClick={handleBulkUpload}
            disabled={uploading}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          <button
            onClick={() => setShowBulkUpload(false)}
            className="px-4 py-2 rounded border text-sm"
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  </div>
)}
      </div>

      {/* Table Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border border-black/5 rounded-2xl shadow-sm max-h-[68vh] overflow-y-auto hide-scrollbar scroll-smooth">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-black text-white text-[11px] sm:text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Image</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium min-w-[120px]">SEO</th>
                <th className="px-4 py-3 text-center font-medium">Size chart</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Discounted</th>
                <th className="px-4 py-3 text-center font-medium">Pricing</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-stone-500 text-sm"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-stone-500 text-sm"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item._id}
                    onClick={() => {
                      console.log(
                        "[Items.jsx] Row clicked → view details:",
                        item._id,
                        item.name,
                      );
                      navigate(`/admin/inventory/items/${item._id}`);
                    }}
                    className="border-t border-black/5 hover:bg-black/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 align-middle text-xs text-stone-500">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="h-11 w-11 rounded-lg overflow-hidden border border-black/10 bg-canvas-muted">
                        <img
                          src={
                            item?.thumbnail || "https://via.placeholder.com/50"
                          }
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle font-medium text-sm">
                      {item.name}
                    </td>

                    <td className="px-4 py-3 align-middle text-xs sm:text-sm text-stone-600 max-w-xs truncate">
                      {item.shortDescription || "—"}
                    </td>

                    <td
                      className="px-4 py-3 align-middle text-xs text-stone-600 max-w-[140px]"
                      title={[
                        item.metaTitle && `Title: ${item.metaTitle}`,
                        Array.isArray(item.metaTags) &&
                          item.metaTags.length &&
                          `Tags: ${item.metaTags.join(", ")}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-medium text-gray-800 line-clamp-1">
                        {String(item.metaTitle || "").trim() || "—"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-stone-500 line-clamp-2">
                        {Array.isArray(item.metaTags) && item.metaTags.length > 0
                          ? item.metaTags.join(", ")
                          : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle text-center text-xs text-stone-600">
                      {itemHasSizeChartContent(item) ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-100">
                          Yes
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-right text-sm">
                      {editingPriceItemId === item._id ? (
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            className="w-24 rounded border border-black/20 px-2 py-1 text-right text-xs sm:text-sm"
                            placeholder="MRP"
                          />
                          <button
                            type="button"
                            onClick={(e) => saveInlinePrice(e, item._id)}
                            disabled={savingPrice}
                            className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-700 hover:text-white transition-colors disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            disabled={savingPrice}
                            className="text-xs px-2 py-1 rounded border border-black/20 hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span>₹{item.price}</span>
                          <button
                            type="button"
                            onClick={(e) => startPriceEdit(e, item)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-black/20 hover:bg-brand-600 hover:text-white transition-colors"
                            title="Edit MRP"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-right text-sm">
                      {editingDiscountItemId === item._id ? (
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={editingDiscountValue}
                            onChange={(e) => setEditingDiscountValue(e.target.value)}
                            className="w-24 rounded border border-black/20 px-2 py-1 text-right text-xs sm:text-sm"
                            placeholder="Discount"
                          />
                          <button
                            type="button"
                            onClick={(e) => saveInlineDiscount(e, item._id)}
                            disabled={savingPrice}
                            className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-700 hover:text-white transition-colors disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            disabled={savingPrice}
                            className="text-xs px-2 py-1 rounded border border-black/20 hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {item.discountedPrice ? (
                            <span className="font-semibold">
                              ₹{item.discountedPrice}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => startDiscountEdit(e, item)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-black/20 hover:bg-brand-600 hover:text-white transition-colors"
                            title="Edit discounted price"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("[pricing-history][item.jsx] History clicked", {
                            _id: item._id,
                            productId: item.productId,
                            name: item.name,
                          });
                          setPricingHistoryItem(item);
                        }}
                        className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors whitespace-nowrap"
                        title="View pricing history"
                      >
                        History
                      </button>
                    </td>

                    <td className="px-4 py-3 align-middle text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-brand-600 text-white">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold border border-black/20 text-stone-700">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWarehouseStockModal(item);
                          }}
                          className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-900 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-colors"
                        >
                          Warehouse
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/admin/inventory/items/${item._id}?skuUids=1`,
                            );
                          }}
                          className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-800 hover:bg-indigo-700 hover:text-white hover:border-indigo-700 transition-colors"
                        >
                          SKU UIDs
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(item);
                          }}
                          className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-black/20 hover:bg-brand-600 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="mt-6 flex justify-center items-center gap-4 text-xs sm:text-sm">
            <button
              disabled={pagination.page <= 1}
              onClick={() => {
                console.log(
                  "[Items.jsx] Previous page clicked → page:",
                  pagination.page - 1,
                );
                fetchItems(pagination.page - 1, 10, appliedSearchTerm.trim());
              }}
              className="px-4 py-2 rounded-full border border-black/15 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-600 hover:text-white transition-colors"
            >
              Previous
            </button>

            <span className="text-stone-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                console.log(
                  "[Items.jsx] Next page clicked → page:",
                  pagination.page + 1,
                );
                fetchItems(pagination.page + 1, 10, appliedSearchTerm.trim());
              }}
              className="px-4 py-2 rounded-full border border-black/15 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-600 hover:text-white transition-colors"
            >
              Next
            </button>
          </div>
        )}
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
            className="relative w-full max-w-4xl mt-4 sm:mt-8 rounded-2xl border border-black/10 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wh-modal-title"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-black/10 shrink-0">
              <div className="min-w-0">
                <h2
                  id="wh-modal-title"
                  className="text-lg font-bold text-stone-900 truncate"
                >
                  Warehouse stock
                </h2>
                <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                  {warehouseUiItem.name}
                </p>
                <p className="text-xs text-stone-500 mt-1 font-mono">
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
                className="p-2 rounded-full border border-black/10 hover:bg-brand-600 hover:text-white transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
              <div className="rounded-xl border border-black/10 bg-canvas-muted p-4">
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
                      className="rounded-lg border border-black/15 px-3 py-2.5 text-sm bg-white disabled:opacity-50"
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
                      className="rounded-lg border border-black/15 px-3 py-2.5 text-sm disabled:opacity-50"
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-black/15 hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </div>
                <div className="rounded-xl border border-black/10 overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-black text-white text-left text-xs uppercase tracking-wide">
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
                            className={`border-t border-black/5 ${
                              row.totalQty > 0
                                ? "bg-emerald-50/50"
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
                            <td className="px-3 py-2.5 font-mono text-xs text-stone-700">
                              {row.code || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-stone-600">
                              {row.city || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {row.skuLines}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                              {row.totalQty.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  Rows use catalog name search per warehouse, then match this
                  product by ID. Warehouses with no lines show 0. Highlighted rows
                  have stock in that warehouse.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ItemPricingHistoryModal
        open={Boolean(pricingHistoryItem)}
        onClose={() => setPricingHistoryItem(null)}
        itemId={pricingHistoryItem?._id || pricingHistoryItem?.productId}
        itemName={pricingHistoryItem?.name || ""}
        productId={pricingHistoryItem?.productId || ""}
      />
    </div>
  );
}
