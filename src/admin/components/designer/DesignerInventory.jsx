import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  Pencil,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  approveDesignerCatalogSync,
  dismissDesignerCatalogPending,
  changeDesignerInventoryStatus,
  exportDesignerInventory,
  getDesignerInventory,
  getDesignerInventoryById,
  regenerateDesignerSku,
  patchDesignerInventoryListed,
  unwrapDesignerInventoryItem,
} from "../../apis/Designerapi";
import { getAllCategories } from "../../apis/categoryapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";
import { getSingleItem } from "../../apis/itemapi";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  catalogSkusMissingOnDesigner,
  summarizeMissingCatalogSkus,
} from "../../utils/catalogDesignerSyncPreflight.js";
import ListDesignerToCatalogModal from "./ListDesignerToCatalogModal.jsx";
import SyncCatalogToDesignerModal from "./SyncCatalogToDesignerModal.jsx";
import DesignerSizeChartReadonlyTables from "../../../components/designer/DesignerSizeChartReadonlyTables.jsx";
import { resolveCareIconSrc } from "../../../utils/resolveCareIconSrc.js";
import {
  inferVariantMediaTypeFromUrl,
  isVariantVideoMedia,
  variantMediaUrl,
} from "../../../utils/variantMedia.js";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  alertDanger,
  btnIconEdit,
  btnOutline,
  btnPrimary,
  inputClass,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./designerShared";

const LIMIT_OPTIONS = [10, 20, 50, 100];

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
  const pending = r.catalogItemId && r.catalogUpdateStatus === "pending";
  const busy = busyApproveCatalogId === r._id || busyDismissCatalogId === r._id;
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
      {pending ? (
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
          disabled={busy}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            // reset back to placeholder
            e.target.value = "";
            if (v === "apply") onApprove(r);
            if (v === "dismiss") onDismiss(r);
          }}
          title="Catalog sync actions"
        >
          <option value="">
            {busyApproveCatalogId === r._id
              ? "Applying…"
              : busyDismissCatalogId === r._id
                ? "Clearing…"
                : "Actions…"}
          </option>
          <option value="apply">Apply to catalog</option>
          <option value="dismiss">Dismiss pending</option>
        </select>
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

function normalizeIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "",
      )
      .filter(Boolean);
  }
  if (typeof value === "object" && value._id) return [String(value._id)];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseCatalogCategoriesResponse(res) {
  const data = res?.data?.data || res?.data || {};
  const list = data.categories || data;
  return Array.isArray(list) ? list : [];
}

function parseCatalogSubcategoriesResponse(res) {
  const data = res?.data?.data || res?.data || {};
  const list = data.subcategories || data.subCategories || data;
  return Array.isArray(list) ? list : [];
}

function catalogCategoryLabel(cat) {
  return String(cat?.name || cat?.title || cat?.categoryName || "Category").trim();
}

function catalogSubcategoryLabel(sub) {
  return String(sub?.name || sub?.title || sub?.subcategoryName || "Subcategory").trim();
}

function canAdminListItem(row) {
  return String(row?.status || "").toLowerCase() === "approved";
}

const STATUS_CONFIRM = {
  rejected: "Reject this designer item? The designer can edit and resubmit.",
  archived: "Archive this item? It will be hidden from active review.",
};

const getSkuIds = (item) => {
  const skus = [];
  for (const variant of item?.variants || []) {
    for (const size of variant?.sizes || []) {
      if (size?.sku) skus.push(size.sku);
    }
  }
  return [...new Set(skus)];
};

const DesignerInventory = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const presetDesignerId = params.get("designerId") || "";
  const openSyncFromUrl = params.get("syncCatalog") === "1";
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState("");
  const [listedFilter, setListedFilter] = useState("");
  const [catalogSyncFilter, setCatalogSyncFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
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
  const [selectedItemTab, setSelectedItemTab] = useState("overview"); // overview | details | production | variants | skus
  const [listModalDesigner, setListModalDesigner] = useState(null);
  const [syncCatalogOpen, setSyncCatalogOpen] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [fullTextModal, setFullTextModal] = useState(null);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [subcategoryLabels, setSubcategoryLabels] = useState({});
  const [subcategoryLabelsLoading, setSubcategoryLabelsLoading] = useState(false);

  // Visible columns (desktop table)
  const DESIGNER_INV_COLUMNS_STORAGE_KEY = "khush_admin_designer_inventory_visible_columns";
  const DESIGNER_INV_TABLE_COLUMNS = [
    { key: "style", label: "Style", defaultVisible: true, alwaysVisible: true },
    { key: "designer", label: "Designer", defaultVisible: true, alwaysVisible: true },
    { key: "product", label: "Product", defaultVisible: true },
    { key: "shortDescription", label: "Short Description", defaultVisible: false },
    { key: "longDescription", label: "Long Description", defaultVisible: false },
    { key: "seo", label: "SEO", defaultVisible: false },
    { key: "price", label: "Price", defaultVisible: true },
    { key: "gender", label: "Gender", defaultVisible: false },
    { key: "skuIds", label: "SKU IDs", defaultVisible: false },
    { key: "status", label: "Status", defaultVisible: true, alwaysVisible: true },
    { key: "catalogSync", label: "Catalog sync", defaultVisible: true },
    { key: "listed", label: "Listed", defaultVisible: true, alwaysVisible: true },
    { key: "action", label: "Action", defaultVisible: true, alwaysVisible: true },
  ];

  const defaultDesignerInvVisibleKeys = () =>
    DESIGNER_INV_TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);

  const loadDesignerInvVisibleKeys = () => {
    const fallback = defaultDesignerInvVisibleKeys();
    try {
      const raw = localStorage.getItem(DESIGNER_INV_COLUMNS_STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return fallback;
      const valid = new Set(DESIGNER_INV_TABLE_COLUMNS.map((c) => c.key));
      const keys = [...new Set(parsed.filter((k) => valid.has(k)))];
      DESIGNER_INV_TABLE_COLUMNS.filter((c) => c.alwaysVisible).forEach((c) => {
        if (!keys.includes(c.key)) keys.unshift(c.key);
      });
      return keys.length ? keys : fallback;
    } catch {
      return fallback;
    }
  };

  const persistDesignerInvVisibleKeys = (keys) => {
    try {
      localStorage.setItem(DESIGNER_INV_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      /* ignore */
    }
  };

  const [visibleColumnKeys, setVisibleColumnKeys] = useState(loadDesignerInvVisibleKeys);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const mergeRowFromApi = (id, data) => {
    if (!id || !data) return;
    setRows((prev) => prev.map((row) => (row._id === id ? { ...row, ...data } : row)));
    setSelectedItem((prev) => (prev?._id === id ? { ...prev, ...data } : prev));
  };

  const resolveCategoryName = (id) => {
    const key = String(id || "").trim();
    if (!key) return "—";
    const cat = catalogCategories.find((c) => String(c._id) === key);
    return cat ? catalogCategoryLabel(cat) : key;
  };

  const resolveSubcategoryName = (id) => {
    const key = String(id || "").trim();
    if (!key) return "—";
    return subcategoryLabels[key] || key;
  };

  const variantMediaSrc = (img) => variantMediaUrl(img);

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
    const query = {
      page,
      limit,
      search,
      status,
      designerId: presetDesignerId,
      isListed: listedFilter,
      catalogUpdateStatus: catalogSyncFilter,
    };
    try {
      const res = await getDesignerInventory(query);
      if (res?.success) {
        setRows(res.data?.items || []);
        const pag = res.data?.pagination || {};
        setPagination({
          totalPages: pag.totalPages || 1,
          total: pag.total ?? res.data?.items?.length ?? 0,
        });
      } else {
        setError(res?.message || "Failed to fetch inventory.");
      }
    } catch (err) {
      const msgs = extractBackendMessages(err);
      setError(msgs.length ? msgs.join("\n") : err?.message || "Failed to fetch inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openSyncFromUrl) setSyncCatalogOpen(true);
  }, [openSyncFromUrl]);

  useEffect(() => {
    fetchRows();
  }, [page, limit, status, listedFilter, catalogSyncFilter, search, presetDesignerId]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [page, limit, status, listedFilter, catalogSyncFilter, search, presetDesignerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAllCategories(1, 500);
        setCatalogCategories(parseCatalogCategoriesResponse(res));
      } catch {
        setCatalogCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setSubcategoryLabels({});
      setSubcategoryLabelsLoading(false);
      return undefined;
    }
    const categoryIds = [
      ...new Set(
        [
          selectedItem.categoryId,
          ...normalizeIdList(selectedItem.secondaryCategoryId),
        ].filter(Boolean),
      ),
    ];
    if (categoryIds.length === 0) return undefined;
    let cancelled = false;
    setSubcategoryLabelsLoading(true);
    (async () => {
      const labels = {};
      try {
        await Promise.all(
          categoryIds.map(async (catId) => {
            const res = await getSubcategoriesByCategory(catId, 1, 200);
            parseCatalogSubcategoriesResponse(res).forEach((sub) => {
              if (sub?._id) labels[String(sub._id)] = catalogSubcategoryLabel(sub);
            });
          }),
        );
      } catch {
        /* partial labels ok */
      }
      if (!cancelled) {
        setSubcategoryLabels(labels);
        setSubcategoryLabelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const onChangeStatus = async (row, nextStatus) => {
    const id = row?._id;
    const prevStatus = row?.status;
    if (!id || !nextStatus || nextStatus === prevStatus) return;

    const confirmMsg = STATUS_CONFIRM[nextStatus];
    if (confirmMsg && !window.confirm(confirmMsg)) {
      await fetchRows();
      return;
    }

    setBusyStatusId(id);
    setError("");
    console.log("[DesignerInventory] change status", { id, nextStatus });
    try {
      const res = await changeDesignerInventoryStatus(id, nextStatus);
      const updated = unwrapDesignerInventoryItem(res);
      if (updated) mergeRowFromApi(id, updated);
      toast.success(`Status set to ${nextStatus}.`);
      await fetchRows();
    } catch (err) {
      const msgs = extractBackendMessages(err);
      const msg = msgs.length ? msgs.join("; ") : err?.message || "Failed to update status.";
      setError(msg);
      toast.error(msg);
      await fetchRows();
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
      if (!canAdminListItem(r)) {
        toast.error("Approve the item before listing it on the catalog.");
        await fetchRows();
        return;
      }
      console.log("[DesignerInventory] open list-to-catalog modal", { id: r._id });
      setListModalDesigner(r);
      return;
    }
    if (!r.isListed) return;
    const ok = window.confirm(
      "Mark this item as not listed? It stays approved but is hidden from catalog listing.",
    );
    if (!ok) {
      await fetchRows();
      return;
    }
    setBusyListedId(r._id);
    setError("");
    console.log("[DesignerInventory] unlist", { id: r._id });
    try {
      const res = await patchDesignerInventoryListed(r._id, { isListed: false });
      const updated = unwrapDesignerInventoryItem(res);
      if (updated) mergeRowFromApi(r._id, updated);
      toast.success("Item marked as not listed.");
      await fetchRows();
    } catch (err) {
      const msgs = extractBackendMessages(err);
      const msg = msgs.length ? msgs.join("; ") : err?.message || "Failed to update listing.";
      setError(msg);
      toast.error(msg);
      await fetchRows();
    } finally {
      setBusyListedId("");
    }
  };

  const quickApprove = (row) => onChangeStatus(row, "approved");

  const parseCatalogItemResponse = (res) => {
    if (!res || typeof res !== "object") return null;
    const d = res.data;
    if (d && typeof d === "object") {
      if (d.data) return d.data;
      if (d.item) return d.item;
      if (d.product) return d.product;
      if (d.variants || d.productId || d.name) return d;
    }
    if (res.variants || res.productId || res.name) return res;
    return null;
  };

  const handleApproveCatalogSync = async (r) => {
    if (!r?._id) return;
    if (!r.catalogItemId) {
      setError("This designer row has no linked catalog item id.");
      return;
    }
    const ok = window.confirm(
      "Apply this designer row to the linked main catalog item? Every SKU that still exists on the catalog item must also exist on this designer row (same SKU string). Extra rows on the designer copy are ignored for this check. Continue?"
    );
    if (!ok) return;
    setBusyApproveCatalogId(r._id);
    setError("");
    try {
      const [invRes, catRes] = await Promise.all([
        getDesignerInventoryById(r._id),
        getSingleItem(String(r.catalogItemId)),
      ]);
      if (!invRes?.success || !invRes.data) {
        setError(invRes?.message || "Could not load designer inventory row.");
        return;
      }
      const designerDoc = invRes.data;
      const catalogDoc = parseCatalogItemResponse(catRes);

      if (!catalogDoc) {
        setError(
          catRes?.message ||
            "Could not load the linked catalog item. Check listing / catalog item id."
        );
        return;
      }

      const missing = catalogSkusMissingOnDesigner(designerDoc, catalogDoc);
      if (missing.length) {
        const detail = summarizeMissingCatalogSkus(missing);
        setError(
          [
            `The designer row is missing ${missing.length} catalog SKU(s). Add these sizes/SKUs on the designer inventory (same SKU strings as main inventory), or remove them from the catalog item first.`,
            "",
            detail,
            "",
            `Catalog item id: ${String(r.catalogItemId)}`,
          ].join("\n")
        );
        return;
      }

      const res = await approveDesignerCatalogSync(r._id);
      console.log("[DesignerInventory] approve catalog sync response", res);
      const updated = unwrapDesignerInventoryItem(res);
      if (updated) mergeRowFromApi(r._id, updated);
      toast.success("Designer changes applied to catalog item.");
      await fetchRows();
    } catch (err) {
      const msgs = extractBackendMessages(err);
      setError(msgs.length ? msgs.join("\n") : err?.message || "Failed to apply catalog update.");
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
      console.log("[DesignerInventory] dismiss catalog pending response", res);
      const updated = unwrapDesignerInventoryItem(res);
      if (updated) mergeRowFromApi(r._id, updated);
      toast.success("Pending catalog flag cleared.");
      await fetchRows();
    } catch (err) {
      const msgs = extractBackendMessages(err);
      setError(msgs.length ? msgs.join("\n") : err?.message || "Failed to dismiss pending catalog update.");
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

  const toLightboxSlides = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        if (typeof item === "string") {
          const src = item.trim();
          return src
            ? { src, isVideo: inferVariantMediaTypeFromUrl(src) === "video" }
            : null;
        }
        if (item && typeof item === "object" && typeof item.src === "string") {
          const src = item.src.trim();
          return src
            ? { src, isVideo: Boolean(item.isVideo) }
            : null;
        }
        const src = variantMediaUrl(item);
        return src ? { src, isVideo: isVariantVideoMedia(item) } : null;
      })
      .filter(Boolean);
  };

  const openLightbox = (items, index = 0) => {
    const slides = toLightboxSlides(items);
    if (!slides.length) return;
    const safeIndex = Math.min(Math.max(index, 0), slides.length - 1);
    setLightbox({ open: true, slides, index: safeIndex });
  };

  const closeLightbox = () => setLightbox({ open: false, slides: [], index: 0 });

  const moveLightbox = (dir) => {
    setLightbox((prev) => {
      if (!prev.open || prev.slides.length === 0) return prev;
      const n = prev.slides.length;
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
        setSelectedItemTab("overview");
        return;
      }
    } catch {
      // Fallback to row data if detail fetch fails.
    }
    setSelectedItem(row);
    setSelectedItemTab("overview");
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

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);
  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const rangeStart = total === 0 ? 0 : rowIndexBase + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto overflow-y-visible`}
        onSubmit={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate(ap("designer"))
          }
          className={btnOutline}
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Designer inventory
        </h1>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            className={`${inputClass} w-full pl-8`}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search style, designer…"
          />
        </div>
        <select
          className={`${inputClass} w-[124px] shrink-0`}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All status</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
        <select
          className={`${inputClass} w-[116px] shrink-0`}
          value={listedFilter}
          onChange={(e) => {
            setPage(1);
            setListedFilter(e.target.value);
          }}
        >
          <option value="">All listing</option>
          <option value="true">Listed</option>
          <option value="false">Not listed</option>
        </select>
        <select
          className={`${inputClass} w-[148px] shrink-0`}
          value={catalogSyncFilter}
          onChange={(e) => {
            setPage(1);
            setCatalogSyncFilter(e.target.value);
          }}
        >
          <option value="">All catalog sync</option>
          <option value="pending">Pending sync</option>
        </select>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setSyncCatalogOpen(true)}
          title="Import main catalog items missing on designer panel"
        >
          Sync from catalog
        </button>
        <select
          className={`${inputClass} w-[108px] shrink-0`}
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(parseInt(e.target.value, 10) || 20);
          }}
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setColumnsOpen((o) => !o)}
            className={btnOutline}
            aria-expanded={columnsOpen}
            aria-haspopup="dialog"
            title="Choose columns to show"
          >
            <Columns3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Columns
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900">
              {visibleColumnKeys.length}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${columnsOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {columnsOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-stone-900/20"
                aria-label="Close column picker"
                onClick={() => setColumnsOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Visible columns"
                className="fixed z-50 flex max-h-[min(70vh,22rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col rounded-xl border border-border bg-white p-2 shadow-xl left-1/2 top-[max(5rem,12vh)] -translate-x-1/2"
              >
                <p className="shrink-0 px-1.5 pb-1.5 text-[11px] font-semibold text-stone-700">
                  Visible columns
                </p>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
                  {DESIGNER_INV_TABLE_COLUMNS.map((col) => {
                    const checked = visibleColumnKeys.includes(col.key);
                    const locked = !!col.alwaysVisible;
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[12px] ${
                          locked
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-canvas-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => {
                            if (locked) return;
                            setVisibleColumnKeys((prev) => {
                              const has = prev.includes(col.key);
                              const next = has
                                ? prev.filter((k) => k !== col.key)
                                : [...prev, col.key];
                              const always = DESIGNER_INV_TABLE_COLUMNS.filter(
                                (c) => c.alwaysVisible,
                              ).map((c) => c.key);
                              const merged = [...new Set([...always, ...next])];
                              persistDesignerInvVisibleKeys(merged);
                              return merged;
                            });
                          }}
                          className="h-3.5 w-3.5 rounded border-border text-brand-600"
                        />
                        {col.label}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex shrink-0 items-center justify-between border-t border-border pt-2">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-brand-700 hover:text-brand-900"
                    onClick={() => {
                      const next = DESIGNER_INV_TABLE_COLUMNS.map((c) => c.key);
                      setVisibleColumnKeys(next);
                      persistDesignerInvVisibleKeys(next);
                    }}
                  >
                    Show all
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-stone-700 hover:text-stone-900"
                    onClick={() => {
                      const next = defaultDesignerInvVisibleKeys();
                      setVisibleColumnKeys(next);
                      persistDesignerInvVisibleKeys(next);
                    }}
                  >
                    Reset default
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className={`${btnOutline} !text-success`}
          disabled={exportingType !== ""}
          onClick={() => onExport("csv")}
        >
          {exportingType === "csv" ? "Exporting…" : "CSV"}
        </button>
        <button
          type="button"
          className={`${btnOutline} !text-brand-700`}
          disabled={exportingType !== ""}
          onClick={() => onExport("excel")}
        >
          {exportingType === "excel" ? "Exporting…" : "Excel"}
        </button>
        <button
          type="button"
          className={`${btnOutline} !text-danger`}
          disabled={exportingType !== ""}
          onClick={() => onExport("pdf")}
        >
          {exportingType === "pdf" ? "Exporting…" : "PDF"}
        </button>
        <button
          type="button"
          className={btnOutline}
          disabled={
            exportingType !== "" ||
            regeneratingAll ||
            regeneratingSelected ||
            selectedRowIds.length === 0
          }
          onClick={onRegenerateSelectedSkuIds}
          title="Regenerate SKU IDs only for selected rows"
        >
          {regeneratingSelected
            ? `Regen… (${selectedRegenProgress.done}/${selectedRegenProgress.total})`
            : `Regen selected${selectedRowIds.length ? ` (${selectedRowIds.length})` : ""}`}
        </button>
        <button
          type="button"
          className={btnOutline}
          disabled={exportingType !== "" || regeneratingAll || regeneratingSelected}
          onClick={onRegenerateAllSkuIds}
          title="Regenerate all SKU IDs for the current filters"
        >
          {regeneratingAll ? "Regenerating…" : "Regen all SKUs"}
        </button>
      </form>

      {error ? <div className={`${alertDanger} mb-2 whitespace-pre-wrap`}>{error}</div> : null}

      {/* Card layout: small / split viewports (incl. narrow MacBook) */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="flex justify-center rounded-xl border border-border bg-white py-10 text-gray-500">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-white py-10 text-center text-sm text-gray-500">
            No records.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r._id}
              className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
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
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
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
                  onChange={(e) => onChangeStatus(r, e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="submitted">submitted</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="archived">archived</option>
                </select>
                {String(r.status || "").toLowerCase() === "submitted" ? (
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    disabled={busyStatusId === r._id}
                    onClick={() => quickApprove(r)}
                  >
                    Approve
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Wide table: lg+ (full-width laptop / desktop) */}
      <div className={`hidden lg:block ${tableScrollShell}`}>
          <table className="w-full min-w-[84rem] table-auto text-[11px] xl:min-w-0">
            <thead className={tableHeadClass}>
              <tr>
                <th className={`${thClass} w-10 text-center`}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible items"
                    className="h-3.5 w-3.5 rounded border-border text-brand-600"
                  />
                </th>
                <th className={`${thClass} w-10 text-center`}>#</th>
                {visibleColumnKeys.includes("style") && (
                  <th className={thClass}>Style</th>
                )}
                {visibleColumnKeys.includes("designer") && (
                  <th className={thClass}>Designer</th>
                )}
                {visibleColumnKeys.includes("product") && (
                  <th className={thClass}>Product</th>
                )}
                {visibleColumnKeys.includes("shortDescription") && (
                  <th className={thClass}>Short Description</th>
                )}
                {visibleColumnKeys.includes("longDescription") && (
                  <th className={thClass}>Long Description</th>
                )}
                {visibleColumnKeys.includes("seo") && (
                  <th className={thClass}>SEO</th>
                )}
                {visibleColumnKeys.includes("price") && (
                  <th className={`${thClass} w-[6.5rem] whitespace-nowrap`}>Price</th>
                )}
                {visibleColumnKeys.includes("gender") && (
                  <th className={`${thClass} w-[5.5rem] whitespace-nowrap`}>Gender</th>
                )}
                {visibleColumnKeys.includes("skuIds") && (
                  <th className={thClass}>SKU IDs</th>
                )}
                {visibleColumnKeys.includes("status") && (
                  <th className={`${thClass} w-[6.5rem] whitespace-nowrap`}>Status</th>
                )}
                {visibleColumnKeys.includes("catalogSync") && (
                  <th className={thClass}>Catalog sync</th>
                )}
                {visibleColumnKeys.includes("listed") && (
                  <th className={`${thClass} w-[7.5rem] whitespace-nowrap`}>Listed</th>
                )}
                {visibleColumnKeys.includes("action") && (
                  <th className={`${thClass} w-[12rem] text-right whitespace-nowrap`}>Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-stone-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r._id} className="hover:bg-canvas-muted/50">
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(r._id)}
                        onChange={() => toggleSelectRow(r._id)}
                        aria-label={`Select item ${r.StyleNumber || r._id}`}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-center text-[11px] tabular-nums text-gray-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    {visibleColumnKeys.includes("style") && (
                      <td className="min-w-0 px-2 py-2 align-top">
                        <div className="truncate font-semibold text-gray-900">{r.StyleNumber || "-"}</div>
                        <div className="truncate text-[10px] text-gray-500">{r.employeeId || "-"}</div>
                      </td>
                    )}
                    {visibleColumnKeys.includes("designer") && (
                      <td className="min-w-0 px-2 py-2 align-top text-gray-700">
                        <span className="line-clamp-2 break-words text-[11px]">{r.designerName}</span>
                      </td>
                    )}
                    {visibleColumnKeys.includes("product") && (
                      <td className="min-w-0 px-2 py-2 align-top text-gray-700">
                        <span className="line-clamp-3 break-words text-[11px]">
                          {r.productType || "—"}
                          {r.productTypeCode ? (
                            <span className="text-gray-500"> [{r.productTypeCode}]</span>
                          ) : null}{" "}
                          / {r.fitType || "—"}
                        </span>
                      </td>
                    )}
                    {visibleColumnKeys.includes("shortDescription") && (
                      <td className="min-w-0 px-2 py-2 align-top">
                        <InventoryTableTextPeek
                          text={r.shortDescription}
                          modalTitle="Short description"
                          previewLen={ADMIN_TABLE_SHORT_PEEK}
                          onOpenFull={setFullTextModal}
                        />
                      </td>
                    )}
                    {visibleColumnKeys.includes("longDescription") && (
                      <td className="min-w-0 px-2 py-2 align-top">
                        <InventoryTableTextPeek
                          text={r.longDescription}
                          modalTitle="Long description"
                          previewLen={ADMIN_TABLE_LONG_PEEK}
                          onOpenFull={setFullTextModal}
                        />
                      </td>
                    )}
                    {visibleColumnKeys.includes("seo") && (
                      <td
                        className="min-w-0 max-w-[9rem] px-2 py-2 align-top text-[11px] text-gray-700 xl:max-w-none"
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
                    )}
                    {visibleColumnKeys.includes("price") && (
                      <td className="px-2 py-2 align-top text-gray-700">
                        <div className="text-[11px] tabular-nums">
                          <span className="text-gray-500">MRP:</span> {Number(r.mrp ?? 0)}
                        </div>
                        <div className="text-[11px] tabular-nums">
                          <span className="text-gray-500">Disc:</span> {Number(r.discountPrice ?? 0)}
                        </div>
                      </td>
                    )}
                    {visibleColumnKeys.includes("gender") && (
                      <td className="px-2 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getGenderClasses(r.gender)}`}
                        >
                          {r.gender || "-"}
                        </span>
                      </td>
                    )}
                    {visibleColumnKeys.includes("skuIds") && (
                      <td className="min-w-0 px-2 py-2 align-top">
                        {(() => {
                          const skus = getSkuIds(r);
                          const preview = skus.slice(0, 2).join(", ");
                          const more = Math.max(0, skus.length - 2);
                          const full = skus.join(", ");
                          return (
                            <div className="flex min-w-0 items-start gap-1.5">
                              <div className="min-w-0 flex-1">
                                <div
                                  className="truncate text-[11px] text-gray-700 xl:max-w-[14rem] xl:whitespace-normal xl:break-words"
                                  title={full || undefined}
                                >
                                  {preview || "—"}
                                </div>
                                {more > 0 ? (
                                  <div className="text-[11px] text-gray-500">+{more} more</div>
                                ) : null}
                              </div>
                              {skus.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFullTextModal({
                                      title: "SKU IDs",
                                      body: full || "—",
                                    })
                                  }
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  title="View full SKU IDs"
                                  aria-label="View full SKU IDs"
                                >
                                  <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </button>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    {visibleColumnKeys.includes("status") && (
                      <td className="px-2 py-2 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusClasses(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    )}
                    {visibleColumnKeys.includes("catalogSync") && (
                      <td className="min-w-0 px-2 py-2 align-top">
                        <CatalogSyncControls
                          row={r}
                          busyApproveCatalogId={busyApproveCatalogId}
                          busyDismissCatalogId={busyDismissCatalogId}
                          onApprove={handleApproveCatalogSync}
                          onDismiss={handleDismissCatalogPending}
                        />
                      </td>
                    )}
                    {visibleColumnKeys.includes("listed") && (
                      <td className="px-2 py-2 align-top whitespace-nowrap">
                        <select
                          className="min-w-[7.5rem] rounded-md border border-teal-200 bg-teal-50 px-1.5 py-1 text-[11px] font-medium text-teal-900 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={busyListedId === r._id}
                          value={listedSelectValue(r)}
                          onChange={(e) => handleListedSelect(r, e)}
                        >
                          <option value="false">Not listed</option>
                          <option value="true">Listed</option>
                        </select>
                      </td>
                    )}
                    {visibleColumnKeys.includes("action") && (
                      <td className="px-2 py-2 align-top text-right whitespace-nowrap">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          <button
                            type="button"
                            className={btnIconEdit}
                            onClick={() => openInventoryDetails(r)}
                            title="View details"
                            aria-label="View details"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={btnIconEdit}
                            onClick={() => navigate(ap(`designer/inventory/edit/${r._id}`))}
                            title="Edit details & images"
                            aria-label="Edit details and images"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <select
                            className="min-w-[7rem] rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[11px] font-medium text-indigo-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={busyStatusId === r._id}
                            value={r.status}
                            onChange={(e) => onChangeStatus(r, e.target.value)}
                          >
                            <option value="draft">draft</option>
                            <option value="submitted">submitted</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                            <option value="archived">archived</option>
                          </select>
                          {String(r.status || "").toLowerCase() === "submitted" ? (
                            <button
                              type="button"
                              className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                              disabled={busyStatusId === r._id}
                              onClick={() => quickApprove(r)}
                              title="Approve"
                            >
                              OK
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 items"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> total · Page{" "}
              <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
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
          {lightbox.slides[lightbox.index]?.isVideo ? (
            <video
              src={lightbox.slides[lightbox.index].src}
              controls
              playsInline
              className="max-h-[88vh] max-w-[92vw] rounded-xl bg-black object-contain"
            />
          ) : (
            <img
              src={lightbox.slides[lightbox.index]?.src}
              alt=""
              className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain"
            />
          )}
          <button
            type="button"
            className="absolute right-2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-4"
            onClick={() => moveLightbox(1)}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white">
            {lightbox.index + 1} / {lightbox.slides.length}
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[88vh] w-full min-w-0 max-w-5xl overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
            <div className="sticky top-0 z-10 border-b border-black/10 bg-white">
              <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
                <div className="min-w-0">
                  <h2 className="truncate text-[13px] font-semibold text-gray-900">
                    Inventory Details
                  </h2>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500">
                    {selectedItem.StyleNumber || "—"} · {selectedItem.designerName || "—"}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-black hover:text-white transition-colors"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
              </div>

              <div className="px-3 pb-2 sm:px-4">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["overview", "Overview"],
                    ["details", "Details"],
                    ["production", "Production"],
                    ["variants", "Variants"],
                    ["skus", "SKUs"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedItemTab(key)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                        selectedItemTab === key
                          ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[calc(88vh-6.5rem)] overflow-y-auto p-3 text-[12px] text-gray-800 sm:p-4">
              {selectedItemTab === "overview" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div><span className="font-medium">Style:</span> {selectedItem.StyleNumber || "-"}</div>
                    <div><span className="font-medium">Designer:</span> {selectedItem.designerName || "-"}</div>
                    <div><span className="font-medium">Employee ID:</span> {selectedItem.employeeId || "-"}</div>
                    <div><span className="font-medium">Status:</span> {selectedItem.status || "-"}</div>
                    <div><span className="font-medium">Listed:</span> {selectedItem.isListed ? "Yes" : "No"}</div>
                    <div><span className="font-medium">Catalog item ID:</span> {selectedItem.catalogItemId ? String(selectedItem.catalogItemId) : "—"}</div>
                  </div>

                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                    <p className="mb-2 text-[11px] font-semibold text-indigo-900">Admin actions</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-50"
                        onClick={() => {
                          const itemId = selectedItem?._id;
                          if (!itemId) return;
                          setSelectedItem(null);
                          navigate(ap(`designer/inventory/edit/${itemId}`));
                        }}
                        title="Edit product details and images before approval"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit details & images
                      </button>
                      <label className="text-[11px] text-gray-700">
                        Status
                        <select
                          className="ml-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-900 disabled:opacity-50"
                          disabled={busyStatusId === selectedItem._id}
                          value={selectedItem.status || "draft"}
                          onChange={(e) => onChangeStatus(selectedItem, e.target.value)}
                        >
                          <option value="draft">draft</option>
                          <option value="submitted">submitted</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                          <option value="archived">archived</option>
                        </select>
                      </label>
                      <label className="text-[11px] text-gray-700">
                        Listed
                        <select
                          className="ml-1 rounded-md border border-teal-200 bg-white px-2 py-1 text-[11px] font-medium text-teal-900 disabled:opacity-50"
                          disabled={busyListedId === selectedItem._id}
                          value={listedSelectValue(selectedItem)}
                          onChange={(e) => handleListedSelect(selectedItem, e)}
                        >
                          <option value="false">Not listed</option>
                          <option value="true">Listed</option>
                        </select>
                      </label>
                      {String(selectedItem.status || "").toLowerCase() === "submitted" ? (
                        <button
                          type="button"
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                          disabled={busyStatusId === selectedItem._id}
                          onClick={() => quickApprove(selectedItem)}
                        >
                          Quick approve
                        </button>
                      ) : null}
                    </div>
                    {!canAdminListItem(selectedItem) && !selectedItem.isListed ? (
                      <p className="mt-2 text-[11px] text-amber-800">
                        Approve this item before setting Listed to Yes.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                    <p className="mb-2 text-[11px] font-semibold text-slate-900">Store categories</p>
                    {subcategoryLabelsLoading ? (
                      <p className="text-[11px] text-gray-500">Loading names…</p>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-gray-600">Primary category</dt>
                        <dd>{resolveCategoryName(selectedItem.categoryId)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Primary subcategory</dt>
                        <dd>{resolveSubcategoryName(selectedItem.subcategoryId)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-gray-600">Secondary categories</dt>
                        <dd>
                          {normalizeIdList(selectedItem.secondaryCategoryId).length > 0 ? (
                            <ul className="mt-0.5 list-inside list-disc">
                              {normalizeIdList(selectedItem.secondaryCategoryId).map((id) => (
                                <li key={id}>{resolveCategoryName(id)}</li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-gray-600">Secondary subcategories</dt>
                        <dd>
                          {normalizeIdList(selectedItem.secondarySubcategoryId).length > 0 ? (
                            <ul className="mt-0.5 list-inside list-disc">
                              {normalizeIdList(selectedItem.secondarySubcategoryId).map((id) => (
                                <li key={id}>{resolveSubcategoryName(id)}</li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : null}

              {selectedItemTab === "details" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <span className="font-medium">Product type:</span> {selectedItem.productType || "—"}
                      {selectedItem.productTypeCode ? (
                        <span className="text-gray-600"> ({selectedItem.productTypeCode})</span>
                      ) : null}
                    </div>
                    <div><span className="font-medium">Fit:</span> {selectedItem.fitType || "—"}</div>
                    <div><span className="font-medium">Gender:</span> {selectedItem.gender || "—"}</div>
                    <div><span className="font-medium">MRP:</span> {Number(selectedItem.mrp ?? 0)}</div>
                    <div><span className="font-medium">Discount:</span> {Number(selectedItem.discountPrice ?? 0)}</div>
                    <div><span className="font-medium">Default color:</span> {selectedItem.defaultColor || "—"}</div>
                  </div>

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

                  <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                    <p className="mb-2 text-[11px] font-semibold text-slate-900">SEO</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                </div>
              ) : null}

              {selectedItemTab === "production" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-gray-50 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-emerald-700">Fabric</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div><span className="font-medium">Name:</span> {selectedItem.fabric?.name || "-"}</div>
                      <div><span className="font-medium">GSM:</span> {selectedItem.fabric?.gsm ?? 0}</div>
                      <div><span className="font-medium">Width:</span> {selectedItem.fabric?.width || "-"}</div>
                      <div><span className="font-medium">Lining:</span> {selectedItem.fabric?.lining || "-"}</div>
                      <div><span className="font-medium">Meter:</span> {selectedItem.fabric?.meter ?? 0}</div>
                      <div><span className="font-medium">Cost/m:</span> {selectedItem.fabric?.costPerMeter ?? 0}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-gray-50 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-indigo-700">Costing</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div><span className="font-medium">Trim:</span> {selectedItem.costs?.trimCost ?? 0}</div>
                      <div><span className="font-medium">Stitching:</span> {selectedItem.costs?.stitchingCost ?? 0}</div>
                      <div><span className="font-medium">Finishing:</span> {selectedItem.costs?.finishingCost ?? 0}</div>
                      <div><span className="font-medium">Fabric total:</span> {selectedItem.costs?.totalFabricCost ?? 0}</div>
                      <div><span className="font-medium">Total:</span> {selectedItem.costs?.totalCost ?? 0}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-gray-50 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-cyan-700">Size chart</p>
                    <DesignerSizeChartReadonlyTables
                      item={selectedItem}
                      showMeasureImages
                      onMeasureImageClick={(urls, idx) => openLightbox(urls, idx)}
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-gray-50 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-teal-700">Care</p>
                    <p className="whitespace-pre-wrap break-words text-gray-800">
                      {selectedItem.care?.description || "-"}
                    </p>
                    {Array.isArray(selectedItem.care?.instructions) &&
                    selectedItem.care.instructions.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {selectedItem.care.instructions.map((inst, idx) => (
                          <li
                            key={`care-${idx}`}
                            className="rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              {resolveCareIconSrc(inst) ? (
                                <img
                                  src={resolveCareIconSrc(inst)}
                                  alt=""
                                  className="h-7 w-7 rounded border border-gray-200 bg-white p-1 object-contain"
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
                      <p className="mt-1 text-[11px] text-gray-500">No care instructions.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {selectedItemTab === "skus" ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-border bg-gray-50 p-2.5">
                    {(() => {
                      const skus = getSkuIds(selectedItem);
                      const has = skus.length > 0;
                      const text = has ? skus.join("\n") : "";
                      return (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-amber-700">
                              All SKU IDs
                              <span className="ml-1 text-gray-500">({skus.length})</span>
                            </p>
                            <button
                              type="button"
                              disabled={!has}
                              onClick={() => copyTextToClipboard(text, "SKU IDs copied")}
                              className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                              title="Copy all SKUs"
                            >
                              Copy
                            </button>
                          </div>
                          {!has ? (
                            <p className="mt-2 text-[11px] text-gray-500">No SKUs.</p>
                          ) : (
                            <>
                              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {skus.map((sku) => (
                                  <div
                                    key={sku}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-2 py-1"
                                    title={sku}
                                  >
                                    <span className="min-w-0 truncate font-mono text-[11px] text-gray-800">
                                      {sku}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyTextToClipboard(sku, "SKU copied")}
                                      className="shrink-0 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
                                      title="Copy SKU"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-white p-2">
                                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-gray-700">
{text}
                                </pre>
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}

              {selectedItemTab === "variants" ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-border bg-white p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-violet-700">
                      Variants and Sizes
                      <span className="ml-1 text-gray-500">
                        ({(selectedItem.variants || []).length})
                      </span>
                    </p>
                    <div className="space-y-2">
                      {(selectedItem.variants || []).map((variant, idx) => {
                        const imgs = orderedVariantImages(variant);
                        const withMedia = imgs.filter((im) => variantMediaSrc(im));
                        return (
                          <div
                            key={`${variant?.color?.name || "variant"}-${idx}`}
                            className="rounded-lg border border-border bg-white p-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold text-gray-900">
                                  Variant {idx + 1}: {variant?.color?.name || "-"}{" "}
                                  <span className="font-normal text-gray-500">
                                    ({variant?.color?.hex || "-"})
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-gray-500">
                                  Media: {imgs.length}
                                  {withMedia.length ? ` · ${withMedia.length} with URL` : ""}
                                </div>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                Sizes: {(variant?.sizes || []).length}
                              </span>
                            </div>
                            {withMedia.length ? (
                              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-black/5 bg-slate-50 p-2">
                                <div className="flex flex-wrap gap-2">
                                  {withMedia.map((im, i) => {
                                    const src = variantMediaSrc(im);
                                    const isVideo = isVariantVideoMedia(im);
                                    return (
                                      <button
                                        key={`${src}-${i}`}
                                        type="button"
                                        onClick={() => openLightbox(withMedia, i)}
                                        className="relative shrink-0 rounded-lg border border-border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20"
                                        title={isVideo ? "Open video viewer" : "Open image viewer"}
                                      >
                                        {isVideo ? (
                                          <>
                                            <video
                                              src={src}
                                              muted
                                              playsInline
                                              preload="metadata"
                                              className="h-20 w-20 rounded-lg object-cover hover:opacity-90"
                                            />
                                            <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
                                              Video
                                            </span>
                                          </>
                                        ) : (
                                          <img
                                            src={src}
                                            alt=""
                                            className="h-20 w-20 rounded-lg object-cover hover:opacity-90"
                                            loading="lazy"
                                          />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-gray-400">No media URLs for this variant.</p>
                            )}
                            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                              <table className="w-full min-w-[520px] border-collapse text-[11px]">
                                <thead className="bg-slate-50">
                                  <tr className="border-b border-slate-200 text-left text-slate-600">
                                    <th className="px-2 py-1.5 font-semibold">Size</th>
                                    <th className="px-2 py-1.5 font-semibold">SKU</th>
                                    <th className="px-2 py-1.5 font-semibold">Planned</th>
                                    <th className="px-2 py-1.5 font-semibold">Produced</th>
                                    <th className="px-2 py-1.5 font-semibold">Barcode</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {(variant?.sizes || []).map((s, sIdx) => (
                                    <tr
                                      key={`${s?.size || "size"}-${sIdx}`}
                                      className="border-b border-slate-100 text-slate-800"
                                    >
                                      <td className="px-2 py-1.5 font-semibold">
                                        {s?.size || "—"}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="min-w-0 truncate font-mono text-[11px]">
                                            {s?.sku || "—"}
                                          </span>
                                          {s?.sku ? (
                                            <button
                                              type="button"
                                              onClick={() => copyTextToClipboard(s.sku, "SKU copied")}
                                              className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                                              title="Copy SKU"
                                            >
                                              Copy
                                            </button>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 tabular-nums">
                                        {s?.plannedQty ?? "—"}
                                      </td>
                                      <td className="px-2 py-1.5 tabular-nums">
                                        {s?.producedQty ?? "—"}
                                      </td>
                                      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600">
                                        {s?.barcode || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
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
            className="max-h-[min(90vh,40rem)] w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
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
            <div className="max-h-[min(75vh,36rem)] overflow-y-auto px-4 py-4 text-[12px] leading-relaxed text-gray-800">
              <p className="whitespace-pre-wrap break-words">{fullTextModal.body}</p>
            </div>
          </div>
        </div>
      ) : null}

      <ListDesignerToCatalogModal
        open={Boolean(listModalDesigner)}
        designerRow={listModalDesigner}
        onClose={() => setListModalDesigner(null)}
        onPublished={async (updatedRow) => {
          console.log("[DesignerInventory] catalog published", updatedRow);
          setListModalDesigner(null);
          if (updatedRow?._id) mergeRowFromApi(updatedRow._id, updatedRow);
          await fetchRows();
        }}
      />

      <SyncCatalogToDesignerModal
        open={syncCatalogOpen}
        presetDesignerId={presetDesignerId}
        onClose={() => setSyncCatalogOpen(false)}
        onImported={async () => {
          await fetchRows();
        }}
      />
    </div>
  );
};

export default DesignerInventory;



