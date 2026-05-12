import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, Info, X } from "lucide-react";
import {
  approveDesignerCatalogSync,
  dismissDesignerCatalogPending,
  changeDesignerInventoryStatus,
  exportDesignerInventory,
  getDesignerInventory,
  getDesignerInventoryById,
  regenerateDesignerSku,
  patchDesignerInventoryListed,
} from "../../apis/Designerapi";
import ListDesignerToCatalogModal from "./ListDesignerToCatalogModal.jsx";
import DesignerSizeChartReadonlyTables from "../../../components/designer/DesignerSizeChartReadonlyTables.jsx";
import { resolveCareIconSrc } from "../../../utils/resolveCareIconSrc.js";

/** Table/list cell: clamp text + info opens full copy in modal. */
const ADMIN_TABLE_SHORT_PEEK = 100;
const ADMIN_TABLE_LONG_PEEK = 140;

/** Detail drawer: same thresholds as designer self-service list. */
const DETAIL_SHORT_PREVIEW_LEN = 160;
const DETAIL_LONG_PREVIEW_LEN = 320;

function InventoryTableTextPeek({ text, modalTitle, previewLen, onOpenFull }) {
  const raw = String(text ?? "").trim();
  if (!raw) return <span className="text-gray-400">-</span>;
  const needs = raw.length > previewLen;
  return (
    <div className="flex min-w-0 max-w-[9.5rem] flex-col gap-1 xl:max-w-[11rem]">
      <p
        className={`text-xs leading-snug text-gray-700 break-words ${needs ? "line-clamp-3" : "whitespace-pre-wrap"}`}
      >
        {needs ? (
          <>
            {raw.slice(0, previewLen)}
            <span className="text-gray-400">…</span>
          </>
        ) : (
          raw
        )}
      </p>
      {needs ? (
        <button
          type="button"
          onClick={() => onOpenFull({ title: modalTitle, body: raw })}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          title="View full text"
          aria-label={`View full ${modalTitle}`}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}

function CatalogSyncControls({
  row: r,
  busyApproveCatalogId,
  busyDismissCatalogId,
  onApprove,
  onDismiss,
}) {
  return (
    <div className="flex min-w-0 max-w-[9rem] flex-col gap-1 sm:min-w-[118px] sm:max-w-none">
      <span
        className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium ${
          r.catalogUpdateStatus === "pending"
            ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
        }`}
      >
        {r.catalogItemId
          ? r.catalogUpdateStatus === "pending"
            ? "Pending"
            : "Up to date"
          : "—"}
      </span>
      {r.catalogItemId && r.catalogUpdateStatus === "pending" ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-left text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            disabled={busyApproveCatalogId === r._id || busyDismissCatalogId === r._id}
            onClick={() => onApprove(r)}
          >
            {busyApproveCatalogId === r._id ? "Applying…" : "Apply to catalog"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={busyApproveCatalogId === r._id || busyDismissCatalogId === r._id}
            onClick={() => onDismiss(r)}
          >
            {busyDismissCatalogId === r._id ? "Clearing…" : "Dismiss pending"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DescriptionWithInfo({ label, value, previewLen, onOpenFull }) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return (
      <div className="min-w-0 sm:col-span-2 lg:col-span-3">
        <span className="font-medium text-gray-700">{label}</span>{" "}
        <span className="text-gray-800">—</span>
      </div>
    );
  }
  const needsInfo = raw.length > previewLen;
  return (
    <div className="min-w-0 sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium text-gray-700">{label}</span>
        {needsInfo ? (
          <button
            type="button"
            onClick={() => onOpenFull({ title: label.replace(":", "").trim(), body: raw })}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            title="View full text"
            aria-label={`View full ${label.replace(":", "").trim()}`}
          >
            <Info className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      <p className="mt-1 break-words text-gray-800">
        {needsInfo ? (
          <>
            {raw.slice(0, previewLen)}
            <span className="text-gray-400">…</span>
          </>
        ) : (
          <span className="whitespace-pre-wrap">{raw}</span>
        )}
      </p>
    </div>
  );
}

const DesignerInventory = () => {
  const [params] = useSearchParams();
  const presetDesignerId = params.get("designerId") || "";
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [listedFilter, setListedFilter] = useState("");
  const [catalogSyncFilter, setCatalogSyncFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [exportingType, setExportingType] = useState("");
  const [error, setError] = useState("");
  const [busyStatusId, setBusyStatusId] = useState("");
  const [busyListedId, setBusyListedId] = useState("");
  const [busyApproveCatalogId, setBusyApproveCatalogId] = useState("");
  const [busyDismissCatalogId, setBusyDismissCatalogId] = useState("");
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingSelected, setRegeneratingSelected] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [selectedRegenProgress, setSelectedRegenProgress] = useState({ done: 0, total: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [listModalDesigner, setListModalDesigner] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [fullTextModal, setFullTextModal] = useState(null);

  const getSkuIds = (item) => {
    const skus = [];
    for (const variant of item?.variants || []) {
      for (const size of variant?.sizes || []) {
        if (size?.sku) skus.push(size.sku);
      }
    }
    return [...new Set(skus)];
  };

  const variantImageSrc = (img) => {
    if (!img) return "";
    if (typeof img === "string") return img.trim();
    if (typeof img?.url === "string") return img.url.trim();
    return "";
  };

  const orderedVariantImages = (variant) => {
    const raw = Array.isArray(variant?.images) ? variant.images : [];
    return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
  };

  const getStatusClasses = (value) => {
    const statusValue = String(value || "").toLowerCase();
    if (statusValue === "approved") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    if (statusValue === "submitted") return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
    if (statusValue === "rejected") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    if (statusValue === "archived") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  };

  const getGenderClasses = (value) => {
    const genderValue = String(value || "").toLowerCase();
    if (genderValue === "women") return "bg-pink-100 text-pink-700 ring-1 ring-pink-200";
    if (genderValue === "men") return "bg-sky-100 text-sky-700 ring-1 ring-sky-200";
    if (genderValue === "kids") return "bg-violet-100 text-violet-700 ring-1 ring-violet-200";
    if (genderValue === "unisex") return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
    return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  };

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDesignerInventory({
        page,
        limit: 10,
        search,
        status,
        designerId: presetDesignerId,
        isListed: listedFilter,
        catalogUpdateStatus: catalogSyncFilter,
      });
      if (res?.success) {
        setRows(res.data?.items || []);
        setPagination(res.data?.pagination || { totalPages: 1 });
      }
    } catch (err) {
      setError(err?.message || "Failed to fetch inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, status, listedFilter, catalogSyncFilter, search, presetDesignerId]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [page, status, listedFilter, catalogSyncFilter, search, presetDesignerId]);

  const onChangeStatus = async (id, nextStatus) => {
    setBusyStatusId(id);
    setError("");
    try {
      await changeDesignerInventoryStatus(id, nextStatus);
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to update inventory status.");
    } finally {
      setBusyStatusId("");
    }
  };

  const listedSelectValue = (r) => {
    if (listModalDesigner && listModalDesigner._id === r._id) return "false";
    return r.isListed ? "true" : "false";
  };

  const handleListedSelect = async (r, e) => {
    const next = e.target.value === "true";
    if (next) {
      if (r.isListed) return;
      setListModalDesigner(r);
      return;
    }
    if (!r.isListed) return;
    setBusyListedId(r._id);
    setError("");
    try {
      const res = await patchDesignerInventoryListed(r._id, { isListed: false });
      if (res?.success && selectedItem?._id === r._id) {
        setSelectedItem(res.data);
      }
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to update listing.");
    } finally {
      setBusyListedId("");
    }
  };

  const handleApproveCatalogSync = async (r) => {
    if (!r?._id) return;
    const ok = window.confirm(
      "Apply this designer row to the linked main catalog item? Overlapping catalog fields will be updated from the designer copy. Variant colors and SKUs must already match the catalog item (extra designer SKUs are allowed)."
    );
    if (!ok) return;
    setBusyApproveCatalogId(r._id);
    setError("");
    try {
      const res = await approveDesignerCatalogSync(r._id);
      if (res?.success && selectedItem?._id === r._id) {
        setSelectedItem(res.data);
      }
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to apply catalog update.");
    } finally {
      setBusyApproveCatalogId("");
    }
  };

  const handleDismissCatalogPending = async (r) => {
    if (!r?._id) return;
    const ok = window.confirm(
      "Clear the pending flag without updating the main catalog item? The designer row will show as up to date; their saved edits stay on the designer copy only."
    );
    if (!ok) return;
    setBusyDismissCatalogId(r._id);
    setError("");
    try {
      const res = await dismissDesignerCatalogPending(r._id);
      if (res?.success && selectedItem?._id === r._id) {
        setSelectedItem(res.data);
      }
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to dismiss pending catalog update.");
    } finally {
      setBusyDismissCatalogId("");
    }
  };

  const onExport = async (type) => {
    setExportingType(type);
    setError("");
    try {
      const res = await exportDesignerInventory(type, {
        search,
        status,
        ...(listedFilter ? { isListed: listedFilter } : {}),
        ...(catalogSyncFilter ? { catalogUpdateStatus: catalogSyncFilter } : {}),
        ...(presetDesignerId ? { designerId: presetDesignerId } : {}),
      });
      const url = window.URL.createObjectURL(res);
      const a = document.createElement("a");
      a.href = url;
      a.download = `designer-inventory.${type === "excel" ? "xlsx" : type}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || `Failed to export ${type.toUpperCase()}.`);
    } finally {
      setExportingType("");
    }
  };

  const onRegenerateAllSkuIds = async () => {
    if (regeneratingAll) return;
    const ok = window.confirm(
      "Regenerate SKU IDs for all designer inventory items matching current filters?\n\nThis can take some time."
    );
    if (!ok) return;

    setRegeneratingAll(true);
    setError("");
    try {
      const limit = 50;
      let currentPage = 1;
      const allIds = [];

      // Fetch all IDs matching current filters.
      while (true) {
        const res = await getDesignerInventory({
          page: currentPage,
          limit,
          search,
          status,
          designerId: presetDesignerId,
          isListed: listedFilter,
          catalogUpdateStatus: catalogSyncFilter,
        });

        const items = res?.data?.items || [];
        allIds.push(...items.map((x) => x._id).filter(Boolean));

        const totalPages = res?.data?.pagination?.totalPages || 1;
        if (currentPage >= totalPages) break;
        currentPage += 1;
      }

      const uniqueIds = [...new Set(allIds)];
      for (const id of uniqueIds) {
        await regenerateDesignerSku(id);
      }

      await fetchRows();
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to regenerate SKU IDs.");
    } finally {
      setRegeneratingAll(false);
    }
  };

  const visibleRowIds = rows.map((r) => r._id).filter(Boolean);
  const allVisibleSelected =
    visibleRowIds.length > 0 &&
    visibleRowIds.every((id) => selectedRowIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !visibleRowIds.includes(id)));
      return;
    }
    setSelectedRowIds((prev) => [...new Set([...prev, ...visibleRowIds])]);
  };

  const toggleSelectRow = (id) => {
    if (!id) return;
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onRegenerateSelectedSkuIds = async () => {
    if (regeneratingSelected || selectedRowIds.length === 0) return;
    const ok = window.confirm(
      `Regenerate SKU IDs for ${selectedRowIds.length} selected item(s)?`
    );
    if (!ok) return;
    setRegeneratingSelected(true);
    setSelectedRegenProgress({ done: 0, total: selectedRowIds.length });
    setError("");
    try {
      for (let i = 0; i < selectedRowIds.length; i += 1) {
        const id = selectedRowIds[i];
        await regenerateDesignerSku(id);
        setSelectedRegenProgress({ done: i + 1, total: selectedRowIds.length });
      }
      setSelectedRowIds([]);
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to regenerate selected SKU IDs.");
    } finally {
      setRegeneratingSelected(false);
      setSelectedRegenProgress({ done: 0, total: 0 });
    }
  };

  const openLightbox = (images, index = 0) => {
    if (!Array.isArray(images) || images.length === 0) return;
    const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
    setLightbox({ open: true, images, index: safeIndex });
  };

  const closeLightbox = () => setLightbox({ open: false, images: [], index: 0 });

  const moveLightbox = (dir) => {
    setLightbox((prev) => {
      if (!prev.open || prev.images.length === 0) return prev;
      const n = prev.images.length;
      const next = (prev.index + dir + n) % n;
      return { ...prev, index: next };
    });
  };

  const openInventoryDetails = async (row) => {
    if (!row?._id) return;
    try {
      const res = await getDesignerInventoryById(row._id);
      if (res?.success && res?.data) {
        setSelectedItem(res.data);
        return;
      }
    } catch {
      // Fallback to row data if detail fetch fails.
    }
    setSelectedItem(row);
  };

  useEffect(() => {
    if (!lightbox.open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveLightbox(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveLightbox(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox.open]);

  useEffect(() => {
    if (!fullTextModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFullTextModal(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullTextModal]);

  return (
    <div className="min-w-0 bg-white p-3 text-black sm:p-4 lg:mx-auto lg:max-w-[min(100vw-1rem,90rem)]">
      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Designer Inventory</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Review inventory submissions and update approval status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("csv")}>{exportingType === "csv" ? "Exporting..." : "CSV"}</button>
          <button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("excel")}>{exportingType === "excel" ? "Exporting..." : "Excel"}</button>
          <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("pdf")}>{exportingType === "pdf" ? "Exporting..." : "PDF"}</button>
          <button
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={exportingType !== "" || regeneratingAll || regeneratingSelected || selectedRowIds.length === 0}
            onClick={onRegenerateSelectedSkuIds}
            title="Regenerate SKU IDs only for selected rows"
          >
            {regeneratingSelected
              ? `Regenerating selected... (${selectedRegenProgress.done}/${selectedRegenProgress.total})`
              : `Regenerate selected SKU IDs${selectedRowIds.length ? ` (${selectedRowIds.length})` : ""}`}
          </button>
          <button
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={exportingType !== "" || regeneratingAll || regeneratingSelected}
            onClick={onRegenerateAllSkuIds}
            title="Regenerate all SKU IDs for the current filters"
          >
            {regeneratingAll ? "Regenerating..." : "Regenerate all SKU IDs"}
          </button>
        </div>
      </div>

      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search by designer, style, SKU, meta title, tags…" />
        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5 sm:min-w-[170px]" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All status</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5 sm:min-w-[160px]" value={listedFilter} onChange={(e) => { setPage(1); setListedFilter(e.target.value); }}>
          <option value="">All listing</option>
          <option value="true">Listed</option>
          <option value="false">Not listed</option>
        </select>
        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5 sm:min-w-[200px]" value={catalogSyncFilter} onChange={(e) => { setPage(1); setCatalogSyncFilter(e.target.value); }}>
          <option value="">All catalog sync</option>
          <option value="pending">Pending main-item sync</option>
        </select>
      </div>
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Card layout: small / split viewports (incl. narrow MacBook) */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="flex justify-center rounded-xl border border-black/10 bg-white py-10 text-gray-500">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white py-10 text-center text-sm text-gray-500">
            No records.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r._id}
              className="min-w-0 rounded-xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 pb-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={selectedRowIds.includes(r._id)}
                    onChange={() => toggleSelectRow(r._id)}
                    aria-label={`Select item ${r.StyleNumber || r._id}`}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.StyleNumber || "-"}</div>
                    <div className="truncate text-xs text-gray-500">{r.employeeId || "-"}</div>
                  </div>
                </label>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-800 sm:grid-cols-2">
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Designer</dt>
                  <dd className="mt-0.5 break-words">{r.designerName || "—"}</dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Product</dt>
                  <dd className="mt-0.5 break-words text-gray-700">
                    {r.productType || "—"}
                    {r.productTypeCode ? (
                      <span className="text-gray-500"> [{r.productTypeCode}]</span>
                    ) : null}{" "}
                    / {r.fitType || "—"}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Short description</dt>
                  <dd className="mt-0.5">
                    <InventoryTableTextPeek
                      text={r.shortDescription}
                      modalTitle="Short description"
                      previewLen={ADMIN_TABLE_SHORT_PEEK}
                      onOpenFull={setFullTextModal}
                    />
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Long description</dt>
                  <dd className="mt-0.5">
                    <InventoryTableTextPeek
                      text={r.longDescription}
                      modalTitle="Long description"
                      previewLen={ADMIN_TABLE_LONG_PEEK}
                      onOpenFull={setFullTextModal}
                    />
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">SEO</dt>
                  <dd className="mt-0.5 min-w-0">
                    <div className="truncate font-medium text-gray-900">
                      {String(r.metaTitle || "").trim() || "—"}
                    </div>
                    <div className="mt-0.5 line-clamp-2 break-words text-[11px] text-gray-500">
                      {Array.isArray(r.metaTags) && r.metaTags.length > 0 ? r.metaTags.join(", ") : ""}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">MRP / Disc</dt>
                  <dd className="mt-0.5">
                    {Number(r.mrp ?? 0)} / {Number(r.discountPrice ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Gender</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}
                    >
                      {r.gender || "—"}
                    </span>
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">SKU IDs</dt>
                  <dd className="mt-0.5 break-all text-[11px] text-gray-700">
                    {getSkuIds(r).length ? getSkuIds(r).join(", ") : "—"}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Catalog sync</dt>
                  <dd className="mt-0.5">
                    <CatalogSyncControls
                      row={r}
                      busyApproveCatalogId={busyApproveCatalogId}
                      busyDismissCatalogId={busyDismissCatalogId}
                      onApprove={handleApproveCatalogSync}
                      onDismiss={handleDismissCatalogPending}
                    />
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-500">Listed</dt>
                  <dd className="mt-0.5">
                    <select
                      className="w-full max-w-xs rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-xs font-medium text-teal-800 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={busyListedId === r._id}
                      value={listedSelectValue(r)}
                      onChange={(e) => handleListedSelect(r, e)}
                    >
                      <option value="false">Not listed</option>
                      <option value="true">Listed</option>
                    </select>
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-black/5 pt-3">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/15 text-gray-700 hover:bg-black hover:text-white transition-colors"
                  onClick={() => openInventoryDetails(r)}
                  title="View details"
                  aria-label="View details"
                >
                  <Eye size={14} />
                </button>
                <select
                  className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed sm:max-w-[200px] sm:flex-none"
                  disabled={busyStatusId === r._id}
                  value={r.status}
                  onChange={(e) => onChangeStatus(r._id, e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="submitted">submitted</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Wide table: lg+ (full-width laptop / desktop) */}
      <div className="hidden min-w-0 lg:block">
        <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-black/10 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[72rem] table-fixed text-sm xl:min-w-0 xl:table-auto">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-10 p-2 text-center font-semibold text-gray-700 xl:w-auto xl:p-2.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible items"
                  />
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Style
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Designer
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Product
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Short Description
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Long Description
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  SEO
                </th>
                <th className="w-[5.5rem] p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Price
                </th>
                <th className="w-[4.5rem] p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Gender
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  SKU IDs
                </th>
                <th className="w-[5.5rem] p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Status
                </th>
                <th className="min-w-0 p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Catalog sync
                </th>
                <th className="w-[6.5rem] p-2 text-left text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Listed
                </th>
                <th className="w-[7.5rem] p-2 text-right text-xs font-semibold text-gray-700 xl:w-auto xl:p-2.5 xl:text-sm">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-4 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-4 text-gray-500">
                    No records.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="border-t border-black/5">
                    <td className="p-2 align-top text-center xl:p-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(r._id)}
                        onChange={() => toggleSelectRow(r._id)}
                        aria-label={`Select item ${r.StyleNumber || r._id}`}
                      />
                    </td>
                    <td className="min-w-0 p-2 align-top xl:p-2.5">
                      <div className="truncate font-medium">{r.StyleNumber || "-"}</div>
                      <div className="truncate text-xs text-gray-500">{r.employeeId || "-"}</div>
                    </td>
                    <td className="min-w-0 p-2 align-top text-gray-700 xl:p-2.5">
                      <span className="line-clamp-2 break-words text-xs">{r.designerName}</span>
                    </td>
                    <td className="min-w-0 p-2 align-top text-gray-700 xl:p-2.5">
                      <span className="line-clamp-3 break-words text-xs">
                        {r.productType || "—"}
                        {r.productTypeCode ? (
                          <span className="text-gray-500"> [{r.productTypeCode}]</span>
                        ) : null}{" "}
                        / {r.fitType || "—"}
                      </span>
                    </td>
                    <td className="min-w-0 p-2 align-top xl:p-2.5">
                      <InventoryTableTextPeek
                        text={r.shortDescription}
                        modalTitle="Short description"
                        previewLen={ADMIN_TABLE_SHORT_PEEK}
                        onOpenFull={setFullTextModal}
                      />
                    </td>
                    <td className="min-w-0 p-2 align-top xl:p-2.5">
                      <InventoryTableTextPeek
                        text={r.longDescription}
                        modalTitle="Long description"
                        previewLen={ADMIN_TABLE_LONG_PEEK}
                        onOpenFull={setFullTextModal}
                      />
                    </td>
                    <td
                      className="min-w-0 max-w-[9rem] p-2 align-top text-xs text-gray-700 xl:max-w-none xl:p-2.5"
                      title={[
                        r.metaTitle && `Title: ${r.metaTitle}`,
                        r.metaDescription && `Meta: ${r.metaDescription}`,
                        Array.isArray(r.metaTags) && r.metaTags.length && `Tags: ${r.metaTags.join(", ")}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    >
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {String(r.metaTitle || "").trim() || "—"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 break-words">
                        {Array.isArray(r.metaTags) && r.metaTags.length > 0 ? r.metaTags.join(", ") : ""}
                      </div>
                    </td>
                    <td className="p-2 align-top text-gray-700 xl:p-2.5">
                      <div className="text-xs">MRP: {Number(r.mrp ?? 0)}</div>
                      <div className="text-xs">Disc: {Number(r.discountPrice ?? 0)}</div>
                    </td>
                    <td className="p-2 align-top xl:p-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}
                      >
                        {r.gender || "-"}
                      </span>
                    </td>
                    <td className="min-w-0 p-2 align-top xl:p-2.5">
                      <div className="truncate text-xs text-gray-700 xl:max-w-[14rem] xl:whitespace-normal xl:break-words">
                        {getSkuIds(r).slice(0, 3).join(", ") || "-"}
                      </div>
                      {getSkuIds(r).length > 3 ? (
                        <div className="text-[11px] text-gray-500">+{getSkuIds(r).length - 3} more</div>
                      ) : null}
                    </td>
                    <td className="p-2 align-top xl:p-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClasses(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="min-w-0 p-2 align-top xl:p-2.5">
                      <CatalogSyncControls
                        row={r}
                        busyApproveCatalogId={busyApproveCatalogId}
                        busyDismissCatalogId={busyDismissCatalogId}
                        onApprove={handleApproveCatalogSync}
                        onDismiss={handleDismissCatalogPending}
                      />
                    </td>
                    <td className="p-2 align-top xl:p-2.5">
                      <select
                        className="w-full max-w-[7.5rem] rounded-lg border border-teal-200 bg-teal-50 px-1.5 py-1 text-[11px] font-medium text-teal-800 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed xl:max-w-[9rem] xl:px-2 xl:py-1.5 xl:text-xs"
                        disabled={busyListedId === r._id}
                        value={listedSelectValue(r)}
                        onChange={(e) => handleListedSelect(r, e)}
                      >
                        <option value="false">Not listed</option>
                        <option value="true">Listed</option>
                      </select>
                    </td>
                    <td className="p-2 align-top text-right xl:p-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/15 text-gray-700 hover:bg-black hover:text-white transition-colors"
                          onClick={() => openInventoryDetails(r)}
                          title="View details"
                          aria-label="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <select
                          className="min-w-0 max-w-[5.5rem] flex-1 rounded-lg border border-indigo-200 bg-indigo-50 px-1 py-1 text-[11px] font-medium text-indigo-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed xl:max-w-[7rem] xl:px-2 xl:py-1.5 xl:text-xs"
                          disabled={busyStatusId === r._id}
                          value={r.status}
                          onChange={(e) => onChangeStatus(r._id, e.target.value)}
                        >
                          <option value="draft">draft</option>
                          <option value="submitted">submitted</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                          <option value="archived">archived</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm text-gray-700 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-700">Page {page} / {pagination.totalPages || 1}</span>
        <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm text-gray-700 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {lightbox.open ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-2 sm:p-4">
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={closeLightbox}
            aria-label="Close image viewer"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="absolute left-2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:left-4"
            onClick={() => moveLightbox(-1)}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
          <img
            src={lightbox.images[lightbox.index]}
            alt=""
            className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain"
          />
          <button
            type="button"
            className="absolute right-2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-4"
            onClick={() => moveLightbox(1)}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[88vh] w-full min-w-0 max-w-5xl overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 sm:p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Inventory Details</h2>
              <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-black hover:text-white transition-colors" onClick={() => setSelectedItem(null)}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><span className="font-medium">Style Number:</span> {selectedItem.StyleNumber || "-"}</div>
              <div><span className="font-medium">Designer:</span> {selectedItem.designerName || "-"}</div>
              <div><span className="font-medium">Employee ID:</span> {selectedItem.employeeId || "-"}</div>
              <div><span className="font-medium">Status:</span> {selectedItem.status || "-"}</div>
              <div><span className="font-medium">Listed (catalog):</span> {selectedItem.isListed ? "Yes" : "No"}</div>
              <div><span className="font-medium">Main inventory item ID:</span> {selectedItem.catalogItemId ? String(selectedItem.catalogItemId) : "—"}</div>
              <div>
                <span className="font-medium">Main catalog update:</span>{" "}
                {selectedItem.catalogItemId
                  ? selectedItem.catalogUpdateStatus === "pending"
                    ? "Pending admin approval"
                    : "Up to date"
                  : "—"}
              </div>
              {selectedItem.catalogItemId && selectedItem.catalogUpdateStatus === "pending" ? (
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
                  <button
                    type="button"
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    disabled={
                      busyApproveCatalogId === selectedItem._id ||
                      busyDismissCatalogId === selectedItem._id
                    }
                    onClick={() => handleApproveCatalogSync(selectedItem)}
                  >
                    {busyApproveCatalogId === selectedItem._id
                      ? "Applying…"
                      : "Apply designer changes to catalog item"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    disabled={
                      busyApproveCatalogId === selectedItem._id ||
                      busyDismissCatalogId === selectedItem._id
                    }
                    onClick={() => handleDismissCatalogPending(selectedItem)}
                  >
                    {busyDismissCatalogId === selectedItem._id
                      ? "Clearing…"
                      : "Dismiss pending (no catalog change)"}
                  </button>
                </div>
              ) : null}
              <div>
                <span className="font-medium">Product type:</span> {selectedItem.productType || "—"}
                {selectedItem.productTypeCode ? (
                  <span className="text-gray-600"> ({selectedItem.productTypeCode})</span>
                ) : null}
              </div>
              <div><span className="font-medium">Fit Type:</span> {selectedItem.fitType || "-"}</div>
              <div><span className="font-medium">Gender:</span> {selectedItem.gender || "-"}</div>
              <div><span className="font-medium">MRP:</span> {Number(selectedItem.mrp ?? 0)}</div>
              <div><span className="font-medium">Discount Price:</span> {Number(selectedItem.discountPrice ?? 0)}</div>
              <div><span className="font-medium">Total Production Qty:</span> {selectedItem.totalProductionQty ?? 0}</div>
              <div><span className="font-medium">Default Color:</span> {selectedItem.defaultColor || "-"}</div>
              <div><span className="font-medium">Top SKU ID:</span> {selectedItem?.sku?.skuId || "-"}</div>
              <DescriptionWithInfo
                label="Short description:"
                value={selectedItem.shortDescription}
                previewLen={DETAIL_SHORT_PREVIEW_LEN}
                onOpenFull={setFullTextModal}
              />
              <DescriptionWithInfo
                label="Long description:"
                value={selectedItem.longDescription}
                previewLen={DETAIL_LONG_PREVIEW_LEN}
                onOpenFull={setFullTextModal}
              />

              <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                <h4 className="mb-2 text-xs font-semibold text-slate-900">SEO</h4>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Meta title:</span>{" "}
                    <span className="text-gray-900">{String(selectedItem.metaTitle || "").trim() || "—"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Meta description:</span>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-gray-800">
                      {String(selectedItem.metaDescription || "").trim() || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Tags:</span>{" "}
                    <span className="break-all text-gray-800">
                      {Array.isArray(selectedItem.metaTags) && selectedItem.metaTags.length > 0
                        ? selectedItem.metaTags.join(", ")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div><span className="font-medium">Created:</span> {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : "-"}</div>
              <div><span className="font-medium">Updated:</span> {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleString() : "-"}</div>
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-emerald-400 pl-2 font-medium text-emerald-700">Fabric Details</h3>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 bg-gray-50 p-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><span className="font-medium">Name:</span> {selectedItem.fabric?.name || "-"}</div>
                <div><span className="font-medium">GSM:</span> {selectedItem.fabric?.gsm ?? 0}</div>
                <div><span className="font-medium">Width:</span> {selectedItem.fabric?.width || "-"}</div>
                <div><span className="font-medium">Lining:</span> {selectedItem.fabric?.lining || "-"}</div>
                <div><span className="font-medium">Meter:</span> {selectedItem.fabric?.meter ?? 0}</div>
                <div><span className="font-medium">Cost / Meter:</span> {selectedItem.fabric?.costPerMeter ?? 0}</div>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-indigo-400 pl-2 font-medium text-indigo-700">Costing</h3>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 bg-gray-50 p-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><span className="font-medium">Trim Cost:</span> {selectedItem.costs?.trimCost ?? 0}</div>
                <div><span className="font-medium">Stitching Cost:</span> {selectedItem.costs?.stitchingCost ?? 0}</div>
                <div><span className="font-medium">Finishing Cost:</span> {selectedItem.costs?.finishingCost ?? 0}</div>
                <div><span className="font-medium">Total Fabric Cost:</span> {selectedItem.costs?.totalFabricCost ?? 0}</div>
                <div><span className="font-medium">Total Cost:</span> {selectedItem.costs?.totalCost ?? 0}</div>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-cyan-400 pl-2 font-medium text-cyan-700">
                Size chart (in &amp; cm)
              </h3>
              <DesignerSizeChartReadonlyTables
                item={selectedItem}
                showMeasureImages
                onMeasureImageClick={(urls, idx) => openLightbox(urls, idx)}
              />
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-teal-400 pl-2 font-medium text-teal-700">
                Care
              </h3>
              <div className="rounded-xl border border-black/10 bg-gray-50 p-2.5 text-sm">
                <p className="whitespace-pre-wrap break-words text-gray-800">
                  {selectedItem.care?.description || "-"}
                </p>
                {Array.isArray(selectedItem.care?.instructions) &&
                selectedItem.care.instructions.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {selectedItem.care.instructions.map((inst, idx) => (
                      <li
                        key={`care-${idx}`}
                        className="rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          {resolveCareIconSrc(inst) ? (
                            <img
                              src={resolveCareIconSrc(inst)}
                              alt=""
                              className="h-8 w-8 rounded border border-gray-200 bg-white p-1 object-contain"
                              loading="lazy"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <span className="font-medium">{idx + 1}.</span>{" "}
                            {inst?.text || "-"}
                          </div>
                        </div>
                        {!resolveCareIconSrc(inst) && (inst?.iconKey || inst?.iconUrl) ? (
                          <span className="ml-1 break-all text-gray-500">
                            ({inst.iconKey || inst.iconUrl})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">No care instructions.</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-amber-400 pl-2 font-medium text-amber-700">All SKU IDs</h3>
              <div className="rounded-xl border border-black/10 bg-gray-50 p-2.5 text-sm">
                {getSkuIds(selectedItem).length ? getSkuIds(selectedItem).join(", ") : "-"}
              </div>
            </div>

            <div className="mt-3">
              <h3 className="mb-2 border-l-4 border-violet-400 pl-2 font-medium text-violet-700">Variants and Sizes</h3>
              <div className="space-y-1.5">
                {(selectedItem.variants || []).map((variant, idx) => {
                  const imgs = orderedVariantImages(variant);
                  const withUrl = imgs.filter((im) => variantImageSrc(im));
                  return (
                    <div key={`${variant?.color?.name || "variant"}-${idx}`} className="rounded-xl border border-black/10 p-2.5">
                      <div className="text-sm font-medium">
                        Variant {idx + 1}: {variant?.color?.name || "-"} ({variant?.color?.hex || "-"})
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Images: {imgs.length}
                        {withUrl.length ? ` · ${withUrl.length} with URL` : ""}
                      </div>
                      {withUrl.length ? (
                        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-black/5 bg-white/80 p-2">
                          <div className="flex flex-wrap gap-2">
                            {withUrl.map((im, i) => {
                              const src = variantImageSrc(im);
                              return (
                                <button
                                  key={`${src}-${i}`}
                                  type="button"
                                  onClick={() => openLightbox(withUrl.map(variantImageSrc), i)}
                                  className="shrink-0 rounded-lg border border-black/10 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20"
                                  title="Open image viewer"
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-24 w-24 rounded-lg object-cover hover:opacity-90"
                                    loading="lazy"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400">No image URLs for this variant.</p>
                      )}
                      <div className="mt-2 text-sm text-gray-700">
                        {(variant?.sizes || []).map((s, sIdx) => (
                          <div key={`${s?.size || "size"}-${sIdx}`} className="mb-1">
                            Size: {s?.size || "-"} | SKU: {s?.sku || "-"} | Barcode: {s?.barcode || "-"} | Planned: {s?.plannedQty ?? 0} | Produced: {s?.producedQty ?? 0}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {fullTextModal ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-inv-fulltext-title"
          onClick={() => setFullTextModal(null)}
        >
          <div
            className="max-h-[min(90vh,40rem)] w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
              <h2
                id="admin-inv-fulltext-title"
                className="min-w-0 truncate text-base font-semibold text-gray-900"
              >
                {fullTextModal.title}
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-black hover:text-white transition-colors"
                onClick={() => setFullTextModal(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[min(75vh,36rem)] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              <p className="whitespace-pre-wrap break-words">{fullTextModal.body}</p>
            </div>
          </div>
        </div>
      ) : null}

      <ListDesignerToCatalogModal
        open={Boolean(listModalDesigner)}
        designerRow={listModalDesigner}
        onClose={() => setListModalDesigner(null)}
        onPublished={async () => {
          setListModalDesigner(null);
          await fetchRows();
        }}
      />
    </div>
  );
};

export default DesignerInventory;



