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
import { getPincodes } from "../../apis/Pincodeapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const inputClass =
  "rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const thClass =
  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500";

const btnPrimary =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50";

const btnOutline =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted disabled:opacity-40";

export default function Warehouse() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  // Pincode Modal State
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  // All serviceable pincodes (from Pincodeapi) to render in UI
  const [pincodes, setPincodes] = useState([]);
  // Set of serviceable pincode ids that are already mapped to selectedWarehouse
  const [assignedPincodeIds, setAssignedPincodeIds] = useState(new Set());
  // Fallback when backend returns relation objects without stable pincode ids
  const [assignedPinCodes, setAssignedPinCodes] = useState(new Set());
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [debouncedPincodeSearch, setDebouncedPincodeSearch] = useState("");
  const [pincodePage, setPincodePage] = useState(1);
  const PINCODE_LIMIT = 10;
  const [pincodeTotal, setPincodeTotal] = useState(0);
  const [pincodeTotalPages, setPincodeTotalPages] = useState(1);
  const [newPincode, setNewPincode] = useState("");
  const [pincodeActionLoading, setPincodeActionLoading] = useState(false);
  const [pincodeModalMessage, setPincodeModalMessage] = useState({
    type: "success", // 'success' | 'error'
    text: "",
  });

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockForm, setStockForm] = useState({ sku: "", quantity: "" });
  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const STOCK_LIMIT = 10;

  const getPinCodeValue = (pin) =>
    pin?.pinCode ??
    pin?.pincode ??
    pin?.value ??
    pin?.code ??
    "";

  const getPinCodeId = (pin) =>
    pin?._id ??
    pin?.id ??
    pin?.pincodeId?._id ??
    pin?.pincodeId?.id ??
    null;

  const normalizePincodeRow = (pin) => {
    const value = String(getPinCodeValue(pin) ?? "").trim();
    return {
      ...pin,
      pinCode: value,
      _id: getPinCodeId(pin),
    };
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce pincode search inside modal
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPincodeSearch(pincodeSearch.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [pincodeSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchWarehouses();
  }, [currentPage, limit, debouncedSearchTerm]);

  useEffect(() => {
    if (!showPincodeModal || !selectedWarehouse?.id) return;
    fetchPincodesForModal(pincodePage, debouncedPincodeSearch);
  }, [showPincodeModal, selectedWarehouse?.id, pincodePage, debouncedPincodeSearch]);

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
    navigate(ap(`warehouse/edit/${warehouse.id}`));
  };

  // ────────────────────────────────────────────────
  //                   PINCODE MANAGEMENT
  // ────────────────────────────────────────────────

  const handleManagePincodes = async (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowPincodeModal(true);
    setPincodeLoading(true);
    setPincodeSearch("");
    setDebouncedPincodeSearch("");
    setPincodePage(1);
    setPincodeTotal(0);
    setPincodeTotalPages(1);
    setAssignedPincodeIds(new Set());
    setAssignedPinCodes(new Set());
    setNewPincode("");
    setPincodeModalMessage({ type: "success", text: "" });

    try {
      // Load warehouse-assigned pincodes to enable/disable actions
      const response = await getWarehousePincodes(warehouse.id);
      const assignedList =
        response?.data?.data ??
        response?.data?.pincodes ??
        response?.data ??
        (Array.isArray(response) ? response : []);

      const extractPincodeId = (pin) =>
        pin?.pincodeId?._id ??
        pin?.pincodeId?.id ??
        pin?._id ??
        pin?.id ??
        null;

      const extractPinCodeValue = (pin) =>
        pin?.pincodeId?.pinCode ??
        pin?.pinCode ??
        pin?.pincode ??
        pin?.value ??
        null;

      const assignedSet = new Set(
        (Array.isArray(assignedList) ? assignedList : [])
          .map(extractPincodeId)
          .filter(Boolean)
          .map((id) => String(id))
      );
      setAssignedPincodeIds(assignedSet);

      const assignedCodeSet = new Set(
        (Array.isArray(assignedList) ? assignedList : [])
          .map(extractPinCodeValue)
          .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
          .map((v) => String(v))
      );
      setAssignedPinCodes(assignedCodeSet);
    } catch (err) {
      console.error("Error loading pincodes:", err);
      setError("Failed to load pincodes");
    } finally {
      setPincodeLoading(false);
    }
  };

  const fetchPincodesForModal = async (page = 1, search = "") => {
    try {
      setPincodeLoading(true);
      const allRes = await getPincodes(page, PINCODE_LIMIT, search);
      const allPayload = allRes?.data ?? allRes ?? {};
      const allData =
        allPayload?.data?.data ??
        allPayload?.data ??
        allPayload?.pincodes ??
        allPayload?.items ??
        (Array.isArray(allPayload) ? allPayload : []);
      const pagination = allPayload?.pagination ?? {};
      const normalized = (Array.isArray(allData) ? allData : [])
        .map(normalizePincodeRow)
        .filter((p) => /^\d{6}$/.test(String(p?.pinCode || "").trim()));
      setPincodes(normalized);
      setPincodeTotal(Number(pagination?.total ?? normalized.length ?? 0));
      setPincodeTotalPages(Math.max(1, Number(pagination?.totalPages ?? 1)));
    } catch (err) {
      console.error("Error loading serviceable pincodes:", err);
      setPincodes([]);
      setPincodeTotal(0);
      setPincodeTotalPages(1);
      setPincodeModalMessage({
        type: "error",
        text: getApiErrorMessage(err),
      });
    } finally {
      setPincodeLoading(false);
    }
  };

  const refreshAssignedPincodeIds = async (warehouseId) => {
    const response = await getWarehousePincodes(warehouseId);
    const assignedList =
      response?.data?.data ??
      response?.data?.pincodes ??
      response?.data ??
      (Array.isArray(response) ? response : []);

    const extractPincodeId = (pin) =>
      pin?.pincodeId?._id ??
      pin?.pincodeId?.id ??
      pin?._id ??
      pin?.id ??
      null;

    const extractPinCodeValue = (pin) =>
      pin?.pincodeId?.pinCode ??
      pin?.pinCode ??
      pin?.pincode ??
      pin?.value ??
      null;

    const assignedSet = new Set(
      (Array.isArray(assignedList) ? assignedList : [])
        .map(extractPincodeId)
        .filter(Boolean)
        .map((id) => String(id))
    );
    setAssignedPincodeIds(assignedSet);

    const assignedCodeSet = new Set(
      (Array.isArray(assignedList) ? assignedList : [])
        .map(extractPinCodeValue)
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => String(v))
    );
    setAssignedPinCodes(assignedCodeSet);
  };

  const getApiErrorMessage = (err) => {
    if (typeof err === "string") return err;
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed"
    );
  };

  const handleAddPincode = async (pincode) => {
    if (!selectedWarehouse?.id) return;
    try {
      setPincodeActionLoading(true);
      setPincodeModalMessage({ type: "success", text: "" });
      // Backend may accept either pinCode or pincodeId; send both.
      const pinCodeValue =
        pincode?.pinCode ||
        pincode?.pincode ||
        pincode?.value ||
        (typeof pincode === "string" ? pincode : "");
      const pinCodeTrim = pinCodeValue?.toString().trim();
      const payload = {
        pinCode: pinCodeTrim,
        pincodeId: pincode?._id || pincode?.id,
      };
      const res = await addWarehousePincodes(selectedWarehouse.id, payload);
      await refreshAssignedPincodeIds(selectedWarehouse.id);
      const msg =
        res?.message || res?.data?.message || "Pincode added successfully";
      setPincodeModalMessage({ type: "success", text: msg });
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setPincodeModalMessage({ type: "error", text: msg });
      await refreshAssignedPincodeIds(selectedWarehouse.id);
    } finally {
      setPincodeActionLoading(false);
    }
  };

  const handleAddTypedPincode = async () => {
    if (!selectedWarehouse?.id) return;
    const pin = newPincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeModalMessage({
        type: "error",
        text: "Enter a valid 6-digit pincode.",
      });
      return;
    }

    // Try to locate existing pincode in DB list (optional)
    const existing = pincodes.find((p) => {
      const code = p?.pinCode ?? p?.pincode ?? p?.value;
      return code?.toString() === pin;
    });

    setPincodeActionLoading(true);
    setPincodeModalMessage({ type: "success", text: "" });
    try {
      const payload = {
        pinCode: pin,
        pincodeId: existing?._id || existing?.id,
      };
      const res = await addWarehousePincodes(selectedWarehouse.id, payload);
      await refreshAssignedPincodeIds(selectedWarehouse.id);
      const msg =
        res?.message || res?.data?.message || "Pincode added successfully";
      setPincodeModalMessage({ type: "success", text: msg });
      setNewPincode("");
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setPincodeModalMessage({ type: "error", text: msg });
      await refreshAssignedPincodeIds(selectedWarehouse.id);
    } finally {
      setPincodeActionLoading(false);
    }
  };

  const handleDeletePincode = async (pincodeId) => {
    if (!window.confirm("Remove this pincode?")) return;

    try {
      setPincodeActionLoading(true);
      setPincodeModalMessage({ type: "success", text: "" });
      await deleteWarehousePincode(selectedWarehouse.id, pincodeId);
      await refreshAssignedPincodeIds(selectedWarehouse.id);
      setPincodeModalMessage({
        type: "success",
        text: "Pincode removed successfully.",
      });
    } catch (err) {
      setPincodeModalMessage({
        type: "error",
        text: getApiErrorMessage(err),
      });
    } finally {
      setPincodeActionLoading(false);
    }
  };

  const visiblePincodes = pincodes;

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
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Warehouses
        </h1>
        <input
          type="text"
          placeholder="Search name / city / state…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${inputClass} min-w-[180px] flex-1 max-w-[280px]`}
        />
        <select
          value={limit}
          onChange={(e) => {
            setCurrentPage(1);
            setLimit(parseInt(e.target.value, 10) || 20);
          }}
          className={`${inputClass} shrink-0 min-w-[108px]`}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button type="button" onClick={() => navigate(ap("warehouse/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      <div className={tableScrollShell}>
        <table className="min-w-[980px] w-full divide-y divide-border text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={`${thClass} hidden md:table-cell`}>Address</th>
              <th className={thClass}>City</th>
              <th className={`${thClass} hidden sm:table-cell`}>State</th>
              <th className={`${thClass} hidden lg:table-cell`}>Pincode</th>
              <th className={`${thClass} hidden lg:table-cell`}>Phone</th>
              <th className={`${thClass} whitespace-nowrap`}>Status</th>
              <th className={`${thClass} min-w-[180px] text-right whitespace-nowrap`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-stone-500">
                      Loading warehouses…
                    </td>
                  </tr>
                ) : filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-stone-500">
                      No warehouses found
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((wh, idx) => (
                    <tr key={wh.id} className="transition-colors hover:bg-canvas-muted/50">
                      <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap font-semibold text-stone-900">
                        {wh.name}
                      </td>
                      <td className="hidden max-w-xs truncate px-2 py-2 text-stone-600 md:table-cell">
                        {wh.address}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-stone-700">{wh.city}</td>
                      <td className="hidden px-2 py-2 whitespace-nowrap text-stone-700 sm:table-cell">
                        {wh.state}
                      </td>
                      <td className="hidden px-2 py-2 whitespace-nowrap text-stone-700 lg:table-cell">
                        {wh.pincode}
                      </td>
                      <td className="hidden px-2 py-2 whitespace-nowrap text-stone-700 lg:table-cell">
                        {wh.phone}
                      </td>
                <td className="px-2 py-2 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(wh)}
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                            wh.isActive
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {wh.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                <td className="px-2 py-2 text-right whitespace-nowrap min-w-[180px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleManagePincodes(wh)}
                      className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
                      title="Manage pincodes"
                    >
                      <MapPin size={14} />
                    </button>
                    <button
                      onClick={() => handleManageStock(wh)}
                      className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
                      title="Manage stock"
                    >
                      <Package size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(wh)}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-canvas-muted px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-canvas-muted/80"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-danger/30 bg-danger-bg px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10"
                      title="Delete"
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

        {/* Main Pagination */}
        {warehouses.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-stone-500">
              Showing <span className="font-semibold text-stone-800">{filteredWarehouses.length}</span> · Page{" "}
              <span className="font-semibold text-stone-800">{currentPage}</span> /{" "}
              <span className="font-semibold text-stone-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className={btnOutline}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className={btnOutline}
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* Pincode Modal */}
      {showPincodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-canvas-muted/40 px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-stone-900">Pincodes</h2>
                <p className="truncate text-[11px] text-stone-500">{selectedWarehouse?.name || "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPincodeModal(false);
                  setSelectedWarehouse(null);
                  setPincodes([]);
                  setAssignedPincodeIds(new Set());
                  setAssignedPinCodes(new Set());
                  setNewPincode("");
                  setPincodeSearch("");
                  setPincodeModalMessage({ type: "success", text: "" });
                  setPincodePage(1);
                }}
                className="rounded-lg p-2 text-stone-600 transition hover:bg-canvas-muted"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 space-y-3 max-h-[calc(90vh-3rem)] overflow-auto">
              {(pincodeModalMessage?.text || "").trim() && (
                <div
                  className={`rounded-xl border px-3 py-2 text-[12px] ${
                    pincodeModalMessage.type === "error"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {pincodeModalMessage.text}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTypedPincode();
                      }
                    }}
                    placeholder="Add by pincode (6 digits)"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTypedPincode}
                    disabled={pincodeActionLoading}
                    className={btnPrimary}
                  >
                    {pincodeActionLoading ? "Adding..." : "Add"}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter pincodes..."
                  value={pincodeSearch}
                  onChange={(e) => {
                    setPincodeSearch(e.target.value);
                    setPincodePage(1);
                  }}
                  className={`${inputClass} w-full`}
                />

                {pincodeLoading ? (
                  <div className="py-10 text-center text-stone-500">Loading pincodes…</div>
                ) : pincodes.length === 0 ? (
                  <div className="py-10 text-center text-stone-500">No pincodes added yet</div>
                ) : visiblePincodes.length === 0 ? (
                  <div className="py-10 text-center text-stone-500">No matching pincodes</div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
                            <tr>
                              <th className={`${thClass} px-3`}>Pincode</th>
                              <th className={`${thClass} w-28 px-3 text-right`}>Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {visiblePincodes.map((pin, i) => {
                              const value = getPinCodeValue(pin) || "—";
                              const pincodeId = getPinCodeId(pin);
                              const isAssigned =
                                (pincodeId && assignedPincodeIds.has(String(pincodeId))) ||
                                assignedPinCodes.has(String(value));
                              return (
                                <tr key={pincodeId || i} className="hover:bg-canvas-muted/50">
                                  <td className="px-3 py-2 font-semibold text-stone-900">{value}</td>
                                  <td className="px-3 py-2 text-right">
                                    {isAssigned ? (
                                      <button
                                        onClick={() => handleDeletePincode(pincodeId)}
                                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                                      >
                                        Remove
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleAddPincode(pin)}
                                        className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        Add
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {pincodeTotal > 0 && (
                      <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-stone-500 sm:flex-row">
                        <div>
                          Showing {(pincodePage - 1) * PINCODE_LIMIT + 1} –{" "}
                          {Math.min(pincodePage * PINCODE_LIMIT, pincodeTotal)} of {pincodeTotal}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPincodePage((p) => Math.max(1, p - 1))}
                            disabled={pincodePage === 1}
                            className={btnOutline}
                          >
                            Prev
                          </button>
                          <span className="rounded-lg bg-canvas-muted px-3 py-1.5 font-semibold text-stone-700">
                            Page {pincodePage} of {pincodeTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPincodePage((p) => Math.min(pincodeTotalPages, p + 1))
                            }
                            disabled={pincodePage >= pincodeTotalPages}
                            className={btnOutline}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-canvas-muted/40 px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-stone-900">Stock</h2>
                <p className="truncate text-[11px] text-stone-500">{selectedWarehouse?.name || "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedWarehouse(null);
                  setStock([]);
                  setStockForm({ sku: "", quantity: "" });
                  setStockSearch("");
                  setStockPage(1);
                }}
                className="rounded-lg p-2 text-stone-600 transition hover:bg-canvas-muted"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 space-y-3 max-h-[calc(90vh-3rem)] overflow-auto">
              <div className="space-y-2 rounded-xl border border-border bg-canvas-muted/40 p-3">
                <h3 className="text-xs font-semibold text-stone-800">Update stock</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={stockForm.sku}
                    onChange={(e) => setStockForm({ ...stockForm, sku: e.target.value })}
                    placeholder="SKU (e.g. PROD-RED-XL)"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    placeholder="Quantity"
                    min="0"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleUpdateStock}
                    className={`${btnPrimary} justify-center`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Update
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
                  className={`${inputClass} w-full`}
                />

                {stockLoading ? (
                  <div className="py-10 text-center text-stone-500">Loading stock…</div>
                ) : stock.length === 0 ? (
                  <div className="py-10 text-center text-stone-500">No stock items found</div>
                ) : filteredStock.length === 0 ? (
                  <div className="py-10 text-center text-stone-500">No matching items</div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
                            <tr>
                              <th className={`${thClass} px-3`}>SKU</th>
                              <th className={`${thClass} px-3`}>Product</th>
                              <th className={`${thClass} w-32 px-3 text-right`}>Quantity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {paginatedStock.map((item, i) => (
                              <tr key={item._id || item.id || i} className="hover:bg-canvas-muted/50">
                                <td className="px-3 py-2 font-semibold text-stone-900">
                                  {item.sku || item.SKU || "—"}
                                </td>
                                <td className="px-3 py-2 text-stone-600">
                                  {item.productName || item.name || "—"}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-stone-900">
                                  {item.quantity ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {filteredStock.length > STOCK_LIMIT && (
                      <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-stone-500 sm:flex-row">
                        <div>
                          Showing {(stockPage - 1) * STOCK_LIMIT + 1} –{" "}
                          {Math.min(stockPage * STOCK_LIMIT, filteredStock.length)} of{" "}
                          {filteredStock.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                            disabled={stockPage === 1}
                            className={btnOutline}
                          >
                            Prev
                          </button>
                          <span className="rounded-lg bg-canvas-muted px-3 py-1.5 font-semibold text-stone-700">
                            Page {stockPage} of {Math.ceil(filteredStock.length / STOCK_LIMIT)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setStockPage((p) =>
                                Math.min(Math.ceil(filteredStock.length / STOCK_LIMIT), p + 1)
                              )
                            }
                            disabled={stockPage >= Math.ceil(filteredStock.length / STOCK_LIMIT)}
                            className={btnOutline}
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