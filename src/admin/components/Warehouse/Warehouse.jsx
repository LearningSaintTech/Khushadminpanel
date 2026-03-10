import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Package, MapPin } from "lucide-react";
import {
  getWarehouses,
  toggleWarehouseStatus,
  deleteWarehouse,
  getWarehousePincodes,
  addWarehousePincodes,
  deleteWarehousePincode,
  getWarehouseStock,
  updateWarehouseStock,
} from "../../apis/Warehouseapi";

export default function Warehouse() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Pincode Modal State
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [pincodes, setPincodes] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [newPincode, setNewPincode] = useState("");
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [pincodePage, setPincodePage] = useState(1);
  const PINCODE_LIMIT = 10;

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockForm, setStockForm] = useState({ sku: "", quantity: "" });
  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const STOCK_LIMIT = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchWarehouses();
  }, [currentPage, debouncedSearchTerm]);

  const fetchWarehouses = async () => {
    setLoading(true);
    console.log("[FETCH] Requesting page", currentPage, "search:", debouncedSearchTerm);

    try {
      const response = await getWarehouses(currentPage, limit, debouncedSearchTerm);
      console.log("[FETCH] Raw response:", response);

      const data = response?.data?.data || response?.data || {};
      const warehouseList = data.warehouses || data.items || data || [];

      const formatted = warehouseList.map((wh, idx) => ({
        id: wh._id || wh.id || `temp-${idx}`,
        name: wh.name || "",
        address: wh.address?.line
          ? `${wh.address.line}, ${wh.address.city}, ${wh.address.state} - ${wh.address.pinCode}, ${wh.address.country || ""}`
          : "—",
        city: wh.address?.city || "—",
        state: wh.address?.state || "—",
        pincode: wh.address?.pinCode || "—",
        phone: wh.phone || "—",
        email: wh.email || "",
        isActive: wh.isActive !== false,
        createdAt: wh.createdAt || "",
      }));

      console.log("[FETCH] Loaded", formatted.length, "warehouses");
      setWarehouses(formatted);
      setTotalPages(data.totalPages || data.pages || 1);
      setError(null);
    } catch (err) {
      console.error("[FETCH] Error:", err);
      setError("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  //  Client-side filtering (this was missing → caused the error)
  // ────────────────────────────────────────────────
  const filteredWarehouses = warehouses.filter((wh) =>
    (wh.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wh.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wh.state || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (warehouse) => {
    console.log("[TOGGLE] Clicked warehouse:", warehouse.name, "ID:", warehouse.id, "Current status:", warehouse.isActive);

    if (!warehouse?.id) {
      console.warn("[TOGGLE] Missing ID");
      alert("Cannot toggle — warehouse ID missing");
      return;
    }

    const originalIsActive = warehouse.isActive;
    const desiredIsActive = !originalIsActive;

    // Optimistic update
    setWarehouses((prev) =>
      prev.map((wh) =>
        wh.id === warehouse.id ? { ...wh, isActive: desiredIsActive } : wh
      )
    );

    try {
      console.log("[TOGGLE] Calling API →", warehouse.id);
      const response = await toggleWarehouseStatus(warehouse.id);
      console.log("[TOGGLE] API success → response:", response);

      // Re-fetch to sync with backend (safest)
      await fetchWarehouses();
    } catch (err) {
      console.error("[TOGGLE] API failed:", err);
      console.error("[TOGGLE] Full error:", err?.response?.data || err.message || err);

      // Rollback
      setWarehouses((prev) =>
        prev.map((wh) =>
          wh.id === warehouse.id ? { ...wh, isActive: originalIsActive } : wh
        )
      );

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to update warehouse status";

      alert(errorMessage);
    }
  };

  const handleDelete = async (warehouseId) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?")) return;

    try {
      console.log("[DELETE] Deleting ID:", warehouseId);
      await deleteWarehouse(warehouseId);
      console.log("[DELETE] Success");
      await fetchWarehouses();
    } catch (err) {
      console.error("[DELETE] Failed:", err);
      alert(err?.response?.data?.message || "Failed to delete warehouse");
    }
  };

  const handleEdit = (warehouse) => {
    navigate(`/admin/warehouse/edit/${warehouse.id}`);
  };

  // ────────────────────────────────────────────────
  //                   PINCODE MANAGEMENT
  // ────────────────────────────────────────────────

  const handleManagePincodes = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowPincodeModal(true);
    setPincodeLoading(true);
    setPincodeSearch("");
    setPincodePage(1);

    try {
      const response = await getWarehousePincodes(warehouse.id);
      const pincodeList = response?.data || (Array.isArray(response) ? response : []);
      setPincodes(pincodeList);
    } catch (err) {
      console.error("Error loading pincodes:", err);
      setError("Failed to load pincodes");
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleAddPincode = async () => {
    if (!newPincode.trim()) {
      alert("Please enter a pincode");
      return;
    }

    try {
      const payload = { pinCode: newPincode.trim() };
      await addWarehousePincodes(selectedWarehouse.id, payload);
      setNewPincode("");

      const response = await getWarehousePincodes(selectedWarehouse.id);
      setPincodes(response?.data || (Array.isArray(response) ? response : []));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add pincode";
      alert(msg);

      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate")) {
        const response = await getWarehousePincodes(selectedWarehouse.id);
        setPincodes(response?.data || []);
      }
    }
  };

  const handleDeletePincode = async (pincodeId) => {
    if (!window.confirm("Remove this pincode?")) return;

    try {
      await deleteWarehousePincode(selectedWarehouse.id, pincodeId);
      const response = await getWarehousePincodes(selectedWarehouse.id);
      setPincodes(response?.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete pincode");
    }
  };

  const filteredPincodes = pincodes.filter((pin) => {
    const val =
      pin?.pincodeId?.pinCode ||
      pin?.pinCode ||
      pin?.pincode ||
      (typeof pin === "string" ? pin : "");
    return val.toString().includes(pincodeSearch.trim());
  });

  const paginatedPincodes = filteredPincodes.slice(
    (pincodePage - 1) * PINCODE_LIMIT,
    pincodePage * PINCODE_LIMIT
  );

  // ────────────────────────────────────────────────
  //                     STOCK MANAGEMENT
  // ────────────────────────────────────────────────

  const handleManageStock = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowStockModal(true);
    setStockLoading(true);
    setStockSearch("");
    setStockPage(1);

    try {
      const response = await getWarehouseStock(warehouse.id, 1, 500);
      const data = response?.data?.data || response?.data || {};
      setStock(data.stock || data.items || data || []);
    } catch (err) {
      console.error("Error loading stock:", err);
      setError("Failed to load stock");
    } finally {
      setStockLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!stockForm.sku.trim() || !stockForm.quantity) {
      alert("Please enter SKU and quantity");
      return;
    }

    try {
      await updateWarehouseStock(selectedWarehouse.id, {
        sku: stockForm.sku.trim(),
        quantity: Number(stockForm.quantity),
      });
      setStockForm({ sku: "", quantity: "" });

      const response = await getWarehouseStock(selectedWarehouse.id, 1, 500);
      const data = response?.data?.data || response?.data || {};
      setStock(data.stock || data.items || data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update stock");
    }
  };

  const filteredStock = stock.filter((item) =>
    `${item.sku || ""} ${item.productName || ""} ${item.name || ""}`
      .toLowerCase()
      .includes(stockSearch.toLowerCase().trim())
  );

  const paginatedStock = filteredStock.slice(
    (stockPage - 1) * STOCK_LIMIT,
    stockPage * STOCK_LIMIT
  );

  return (
    <div className="w-full min-h-screen bg-white table-fixed">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
            Warehouses
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <input
            type="text"
            placeholder="Search by name, city or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
          />
          <button
            onClick={() => navigate("/admin/warehouse/create")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 w-full sm:w-auto"
          >
            <Plus size={16} /> Add Warehouse
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Main Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <div className="w-full table-fixed">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">City</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    State
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Pincode
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-600">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      Loading warehouses...
                    </td>
                  </tr>
                ) : filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      No warehouses found
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((wh, idx) => (
                    <tr key={wh.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{wh.name}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                        {wh.address}
                      </td>
                      <td className="px-4 py-3 text-sm">{wh.city}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm">{wh.state}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm">{wh.pincode}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm">{wh.phone}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(wh)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            wh.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {wh.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          <button
                            onClick={() => handleManagePincodes(wh)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <MapPin size={14} /> Pincodes
                          </button>
                          <button
                            onClick={() => handleManageStock(wh)}
                            className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                          >
                            <Package size={14} /> Stock
                          </button>
                          <button
                            onClick={() => handleEdit(wh)}
                            className="text-gray-700 hover:text-black font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(wh.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
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

        {/* Main Pagination */}
        {warehouses.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing <strong>{filteredWarehouses.length}</strong> of{" "}
              <strong>{totalPages * limit}</strong> warehouses
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-5 py-2 bg-gray-100 rounded font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pincode Modal */}
      {showPincodeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">
                Manage Pincodes — {selectedWarehouse?.name}
              </h2>
              <button
                onClick={() => {
                  setShowPincodeModal(false);
                  setSelectedWarehouse(null);
                  setPincodes([]);
                  setNewPincode("");
                  setPincodeSearch("");
                  setPincodePage(1);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPincode())}
                  placeholder="Enter 6-digit pincode (e.g. 560001)"
                  className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={handleAddPincode}
                  className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Filter pincodes..."
                  value={pincodeSearch}
                  onChange={(e) => {
                    setPincodeSearch(e.target.value);
                    setPincodePage(1);
                  }}
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {pincodeLoading ? (
                  <div className="text-center py-10 text-gray-500">Loading pincodes...</div>
                ) : pincodes.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No pincodes added yet</div>
                ) : filteredPincodes.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No matching pincodes</div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                                Pincode
                              </th>
                              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 w-28">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedPincodes.map((pin, i) => {
                              const value =
                                pin?.pincodeId?.pinCode ||
                                pin?.pinCode ||
                                pin?.pincode ||
                                (typeof pin === "string" ? pin : "—");
                              const id = pin._id || pin.id;
                              return (
                                <tr key={id || i} className="hover:bg-gray-50">
                                  <td className="px-5 py-3.5 font-medium">{value}</td>
                                  <td className="px-5 py-3.5 text-right">
                                    <button
                                      onClick={() => handleDeletePincode(id)}
                                      className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {filteredPincodes.length > PINCODE_LIMIT && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                        <div>
                          Showing {(pincodePage - 1) * PINCODE_LIMIT + 1} –{" "}
                          {Math.min(pincodePage * PINCODE_LIMIT, filteredPincodes.length)} of{" "}
                          {filteredPincodes.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPincodePage((p) => Math.max(1, p - 1))}
                            disabled={pincodePage === 1}
                            className="px-4 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                          >
                            Prev
                          </button>
                          <span className="px-4 py-1.5 font-medium bg-gray-100 rounded">
                            Page {pincodePage} of {Math.ceil(filteredPincodes.length / PINCODE_LIMIT)}
                          </span>
                          <button
                            onClick={() =>
                              setPincodePage((p) =>
                                Math.min(
                                  Math.ceil(filteredPincodes.length / PINCODE_LIMIT),
                                  p + 1
                                )
                              )
                            }
                            disabled={
                              pincodePage >= Math.ceil(filteredPincodes.length / PINCODE_LIMIT)
                            }
                            className="px-4 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">
                Manage Stock — {selectedWarehouse?.name}
              </h2>
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedWarehouse(null);
                  setStock([]);
                  setStockForm({ sku: "", quantity: "" });
                  setStockSearch("");
                  setStockPage(1);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-5 rounded-xl space-y-4">
                <h3 className="font-semibold text-gray-700">Update Stock</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={stockForm.sku}
                    onChange={(e) => setStockForm({ ...stockForm, sku: e.target.value })}
                    placeholder="SKU (e.g. PROD-RED-XL)"
                    className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    placeholder="Quantity"
                    min="0"
                    className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button
                    onClick={handleUpdateStock}
                    className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={16} /> Update
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search by SKU or product name..."
                  value={stockSearch}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    setStockPage(1);
                  }}
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {stockLoading ? (
                  <div className="text-center py-10 text-gray-500">Loading stock...</div>
                ) : stock.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No stock items found</div>
                ) : filteredStock.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No matching items</div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                                SKU
                              </th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                                Product
                              </th>
                              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 w-32">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedStock.map((item, i) => (
                              <tr key={item._id || item.id || i} className="hover:bg-gray-50">
                                <td className="px-5 py-3.5 font-medium">
                                  {item.sku || item.SKU || "—"}
                                </td>
                                <td className="px-5 py-3.5 text-gray-600">
                                  {item.productName || item.name || "—"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-semibold">
                                  {item.quantity ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {filteredStock.length > STOCK_LIMIT && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                        <div>
                          Showing {(stockPage - 1) * STOCK_LIMIT + 1} –{" "}
                          {Math.min(stockPage * STOCK_LIMIT, filteredStock.length)} of{" "}
                          {filteredStock.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                            disabled={stockPage === 1}
                            className="px-4 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                          >
                            Prev
                          </button>
                          <span className="px-4 py-1.5 font-medium bg-gray-100 rounded">
                            Page {stockPage} of {Math.ceil(filteredStock.length / STOCK_LIMIT)}
                          </span>
                          <button
                            onClick={() =>
                              setStockPage((p) =>
                                Math.min(Math.ceil(filteredStock.length / STOCK_LIMIT), p + 1)
                              )
                            }
                            disabled={stockPage >= Math.ceil(filteredStock.length / STOCK_LIMIT)}
                            className="px-4 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}