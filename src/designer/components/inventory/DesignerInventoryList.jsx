import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeDesignerItemStatus,
  deleteDesignerItem,
  listDesignerItems,
  regenerateDesignerSku,
} from "../../apis/designerApi";
import { getAllCategories } from "../../../admin/apis/categoryapi";
import { getSubcategoriesByCategory } from "../../../admin/apis/subcategoryapis";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import {
  formatProductTypeAndFit,
  formatProductTypeAndFitDetail,
} from "../../utils/inventoryDisplay";
import DesignerSizeChartReadonlyTables from "../../../components/designer/DesignerSizeChartReadonlyTables.jsx";
import { isVariantVideoMedia, variantMediaUrl } from "../../../utils/variantMedia.js";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Send,
  Plus,
  Loader2,
  X,
  Info,
} from "lucide-react";

/** Show preview + “i” to open full copy when text is longer than this. */
const SHORT_DESC_PREVIEW_LEN = 160;
const LONG_DESC_PREVIEW_LEN = 320;
const MAIN_DESC_PREVIEW_LEN = 200;
const variantMediaSrc = (img) => variantMediaUrl(img);
function DescriptionWithInfo({ label, value, previewLen, onOpenFull }) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return (
      <div className="sm:col-span-2">
        <span className="font-medium text-gray-600">{label}</span>{" "}
        <span className="text-gray-800">—</span>
      </div>
    );
  }
  const needsInfo = raw.length > previewLen;
  return (
    <div className="sm:col-span-2 min-w-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium text-gray-600">{label}</span>
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

const getStatusClasses = (value) => {
  const s = String(value || "").toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (s === "submitted") return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (s === "rejected") return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
  if (s === "archived") return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
};

const getGenderClasses = (value) => {
  const g = String(value || "").toLowerCase();
  if (g === "women") return "bg-pink-100 text-pink-800 ring-1 ring-pink-200";
  if (g === "men") return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
  if (g === "kids") return "bg-violet-100 text-violet-800 ring-1 ring-violet-200";
  if (g === "unisex") return "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
};

/** Hide Submit once item is in review pipeline (submitted+) or archived. Still show for draft / rejected (resubmit). */
const showSubmitButton = (status) => {
  const s = String(status || "").toLowerCase();
  if (!s || s === "draft" || s === "rejected") return true;
  return false;
};

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

const getSkuIds = (item) => {
  const skus = [];
  for (const variant of item?.variants || []) {
    for (const size of variant?.sizes || []) {
      if (size?.sku) skus.push(size.sku);
    }
  }
  return [...new Set(skus)];
};

// const variantMediaSrc = (img) => variantMediaUrl(img);

const orderedVariantImages = (variant) => {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
};

const DesignerInventoryList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [status, setStatus] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogCategoriesLoading, setCatalogCategoriesLoading] = useState(false);
  const [subcategoryLabels, setSubcategoryLabels] = useState({});
  const [subcategoryLabelsLoading, setSubcategoryLabelsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, slides: [], index: 0 });
  const [listErrors, setListErrors] = useState([]);
  const [actionErrors, setActionErrors] = useState([]);
  /** Full description / copy overlay (short or long text). */
  const [fullTextModal, setFullTextModal] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useLayoutEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, categoryFilter]);

  useEffect(() => {
    (async () => {
      setCatalogCategoriesLoading(true);
      try {
        const res = await getAllCategories(1, 500);
        setCatalogCategories(parseCatalogCategoriesResponse(res));
      } catch {
        setCatalogCategories([]);
      } finally {
        setCatalogCategoriesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) {
      setSubcategoryLabels({});
      setSubcategoryLabelsLoading(false);
      return undefined;
    }
    const categoryIds = [
      ...new Set(
        [selected.categoryId, ...normalizeIdList(selected.secondaryCategoryId)].filter(
          Boolean,
        ),
      ),
    ];
    if (categoryIds.length === 0) {
      setSubcategoryLabels({});
      return undefined;
    }
    let cancelled = false;
    setSubcategoryLabelsLoading(true);
    (async () => {
      const labels = {};
      try {
        await Promise.all(
          categoryIds.map(async (catId) => {
            const res = await getSubcategoriesByCategory(catId, 1, 200);
            const subs = parseCatalogSubcategoriesResponse(res);
            subs.forEach((sub) => {
              if (sub?._id) labels[String(sub._id)] = catalogSubcategoryLabel(sub);
            });
          }),
        );
      } catch {
        /* keep partial labels */
      }
      if (!cancelled) {
        setSubcategoryLabels(labels);
        setSubcategoryLabelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

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

  const fetchRows = async () => {
    setLoading(true);
    setListErrors([]);
    try {
      const res = await listDesignerItems({
        page,
        limit: 10,
        ...(status ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      });
      if (res?.success) {
        setRows(res.data?.items || []);
        setPagination(res.data?.pagination || { totalPages: 1 });
      } else {
        setListErrors(extractBackendMessages(res || { message: "Could not load inventory." }));
      }
    } catch (e) {
      setListErrors(extractBackendMessages(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, status, debouncedSearch, categoryFilter]);

  const run = async (id, fn) => {
    setBusyId(id);
    setActionErrors([]);
    try {
      await fn();
      await fetchRows();
    } catch (e) {
      setActionErrors(extractBackendMessages(e));
    } finally {
      setBusyId("");
    }
  };

  const renderRowActions = (r) => (
    <div className="flex flex-wrap items-center justify-end gap-1 sm:whitespace-nowrap">
      <button
        type="button"
        title="View"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
        onClick={() => setSelected(r)}
      >
        <Eye size={14} />
      </button>
      <button
        type="button"
        title="Edit"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
        onClick={() => navigate(`/designer/inventory/edit/${r._id}`)}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        title="Regenerate SKU"
        disabled={busyId === r._id}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        onClick={() => run(r._id, () => regenerateDesignerSku(r._id))}
      >
        <RefreshCw size={14} className={busyId === r._id ? "animate-spin" : ""} />
      </button>
      {showSubmitButton(r.status) ? (
        <button
          type="button"
          title="Submit"
          disabled={busyId === r._id}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          onClick={() => run(r._id, () => changeDesignerItemStatus(r._id, "submitted"))}
        >
          <Send size={14} />
        </button>
      ) : null}
      <button
        type="button"
        title="Delete"
        disabled={busyId === r._id}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        onClick={() => run(r._id, () => deleteDesignerItem(r._id))}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );




  const openLightbox = (images, index = 0) => {
    if (!Array.isArray(images) || images.length === 0) return;
    const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
    setLightbox({ open: true, images, index: safeIndex });
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
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 px-2 pb-8 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My inventory</h1>
          <p className="text-xs text-gray-500">Track styles, status, and SKUs.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/designer/inventory/create")}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Create item
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="Search style, SKU, employee…"
          value={search}
          onChange={(e) => {
            setActionErrors([]);
            setSearch(e.target.value);
          }}
        />
        <select
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 outline-none sm:min-w-[160px]"
          value={status}
          onChange={(e) => {
            setActionErrors([]);
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
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:min-w-[180px]"
          value={categoryFilter}
          disabled={catalogCategoriesLoading}
          onChange={(e) => {
            setActionErrors([]);
            setCategoryFilter(e.target.value);
          }}
        >
          <option value="">
            {catalogCategoriesLoading ? "Loading categories…" : "All categories"}
          </option>
          {catalogCategories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {catalogCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {listErrors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <p className="font-semibold text-rose-950">Could not load list</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-rose-800">
            {listErrors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {actionErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">Action failed</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amber-900">
            {actionErrors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Card layout: phones, tablets, narrow laptop / MacBook split view */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-10 text-indigo-800">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
            No records.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r._id}
              className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900">{r.StyleNumber}</div>
                  <div className="truncate text-xs text-gray-500">{r.styleName || "—"}</div>
                  <div className="text-xs text-gray-500">{r.employeeId || "—"}</div>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-700 sm:grid-cols-2">
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">Product</dt>
                  <dd className="mt-0.5 break-words">{formatProductTypeAndFit(r)}</dd>
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
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}
                    >
                      {r.gender || "—"}
                    </span>
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="font-medium text-gray-500">SKUs</dt>
                  <dd className="mt-0.5 break-all text-[11px] text-gray-600">
                    {getSkuIds(r).length ? getSkuIds(r).join(", ") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Qty</dt>
                  <dd className="mt-0.5">{r.totalProductionQty ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Listed</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isListed
                          ? "bg-teal-100 text-teal-800 ring-1 ring-teal-200"
                          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                      }`}
                    >
                      {r.isListed ? "Yes" : "No"}
                    </span>
                  </dd>
                </div>
              </dl>
              {r.catalogItemId ? (
                <p className="mt-2 text-[10px] leading-snug text-gray-600">
                  Store:{" "}
                  <span
                    className={
                      r.catalogUpdateStatus === "pending"
                        ? "font-semibold text-amber-700"
                        : "text-gray-700"
                    }
                  >
                    {r.catalogUpdateStatus === "pending"
                      ? "Update pending admin approval"
                      : "Up to date"}
                  </span>
                </p>
              ) : null}
              <div className="mt-4 border-t border-gray-100 pt-3">{renderRowActions(r)}</div>
            </div>
          ))
        )}
      </div>

      {/* Table: large screens & full-width MacBook */}
      <div className="hidden min-w-0 lg:block">
        <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[56rem] table-fixed text-sm xl:min-w-0 xl:table-auto">
          <thead className="bg-gray-50/90">
            <tr>
              <th className="w-[14%] p-2.5 text-left font-semibold text-black xl:w-auto">Style</th>
              <th className="w-[18%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Product</th>
              <th className="w-[10%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Price</th>
              <th className="w-[8%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Gender</th>
              <th className="w-[12%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">SKUs</th>
              <th className="w-[6%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Qty</th>
              <th className="w-[10%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Status</th>
              <th className="w-[10%] p-2.5 text-left font-semibold text-gray-700 xl:w-auto">Listed</th>
              <th className="w-[12%] p-2.5 text-right font-semibold text-gray-700 xl:w-auto">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-indigo-800">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No records.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-100">
                  <td className="min-w-0 p-2.5 align-top">
                    <div className="truncate font-medium text-gray-900">{r.StyleNumber}</div>
                    <div className="truncate text-xs text-gray-500">{r.styleName || "-"}</div>
                    <div className="truncate text-xs text-gray-500">{r.employeeId || "—"}</div>
                  </td>
                  <td className="min-w-0 p-2.5 align-top text-gray-700">
                    <span className="line-clamp-3 break-words text-xs xl:text-sm">
                      {formatProductTypeAndFit(r)}
                    </span>
                  </td>
                  <td className="p-2.5 align-top text-gray-700">
                    <div className="text-xs">MRP: {Number(r.mrp ?? 0)}</div>
                    <div className="text-xs">Disc: {Number(r.discountPrice ?? 0)}</div>
                  </td>
                  <td className="p-2.5 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}>
                      {r.gender || "-"}
                    </span>
                  </td>
                  <td className="min-w-0 p-2.5 align-top">
                    <div className="break-all text-xs text-gray-600 xl:line-clamp-2 xl:break-words">
                      {getSkuIds(r).slice(0, 2).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="p-2.5 align-top text-gray-700">{r.totalProductionQty ?? 0}</td>
                  <td className="p-2.5 align-top">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="min-w-0 p-2.5 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isListed ? "bg-teal-100 text-teal-800 ring-1 ring-teal-200" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                      }`}
                      title="Set by admin for catalog visibility"
                    >
                      {r.isListed ? "Yes" : "No"}
                    </span>
                    {r.catalogItemId ? (
                      <div className="mt-1 text-[10px] leading-snug text-gray-600 xl:max-w-[10rem]" title="Main catalog item linked by admin">
                        Store:{" "}
                        <span
                          className={
                            r.catalogUpdateStatus === "pending"
                              ? "font-semibold text-amber-700"
                              : "text-gray-700"
                          }
                        >
                          {r.catalogUpdateStatus === "pending"
                            ? "Update pending admin approval"
                            : "Up to date"}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2.5 align-top text-right">{renderRowActions(r)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          Page {page} / {pagination.totalPages || 1}
        </span>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page >= (pagination.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
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

      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4">
          <div className="mx-auto mt-4 w-full min-w-0 max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl sm:mt-8">
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">Item details</h2>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] min-w-0 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="font-medium text-gray-600">Style:</span> {selected.StyleNumber}
              </div>
              <div>
                <span className="font-medium text-gray-600">Style name:</span> {selected.styleName || "—"}
              </div>
              <div>
                <span className="font-medium text-gray-600">Designer:</span> {selected.designerName}
              </div>
              <div>
                <span className="font-medium text-gray-600">Employee:</span> {selected.employeeId || "—"}
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>{" "}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Listed (catalog):</span>{" "}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    selected.isListed ? "bg-teal-100 text-teal-800 ring-1 ring-teal-200" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                  }`}
                >
                  {selected.isListed ? "Yes" : "No"}
                </span>
                <span className="ml-1 text-xs text-gray-400">(admin)</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Product / fit:</span>{" "}
                {formatProductTypeAndFitDetail(selected)}
              </div>
              <div className="sm:col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <h3 className="mb-2 text-xs font-semibold text-indigo-900">Store categories</h3>
                {subcategoryLabelsLoading ? (
                  <p className="text-xs text-gray-500">Loading category names…</p>
                ) : null}
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-gray-600">Primary category</dt>
                    <dd className="mt-0.5 text-gray-900">
                      {resolveCategoryName(selected.categoryId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Primary subcategory</dt>
                    <dd className="mt-0.5 text-gray-900">
                      {resolveSubcategoryName(selected.subcategoryId)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-600">Secondary categories</dt>
                    <dd className="mt-0.5 text-gray-900">
                      {normalizeIdList(selected.secondaryCategoryId).length > 0 ? (
                        <ul className="list-inside list-disc space-y-0.5">
                          {normalizeIdList(selected.secondaryCategoryId).map((id) => (
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
                    <dd className="mt-0.5 text-gray-900">
                      {normalizeIdList(selected.secondarySubcategoryId).length > 0 ? (
                        <ul className="list-inside list-disc space-y-0.5">
                          {normalizeIdList(selected.secondarySubcategoryId).map((id) => (
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
              <div>
                <span className="font-medium text-gray-600">MRP:</span> {Number(selected.mrp ?? 0)}
              </div>
              <div>
                <span className="font-medium text-gray-600">Discount price:</span> {Number(selected.discountPrice ?? 0)}
              </div>
              <div>
                <span className="font-medium text-gray-600">Gender:</span>{" "}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getGenderClasses(selected.gender)}`}>
                  {selected.gender}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total qty:</span> {selected.totalProductionQty ?? 0}
              </div>
              <div>
                <span className="font-medium text-gray-600">Top SKU ID:</span> {selected?.sku?.skuId || "—"}
              </div>
              <DescriptionWithInfo
                label="Description:"
                value={selected.description}
                previewLen={MAIN_DESC_PREVIEW_LEN}
                onOpenFull={setFullTextModal}
              />
              <DescriptionWithInfo
                label="Short description:"
                value={selected.shortDescription}
                previewLen={SHORT_DESC_PREVIEW_LEN}
                onOpenFull={setFullTextModal}
              />
              <DescriptionWithInfo
                label="Long description:"
                value={selected.longDescription}
                previewLen={LONG_DESC_PREVIEW_LEN}
                onOpenFull={setFullTextModal}
              />
              <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
                <p className="mb-1 text-xs font-semibold text-slate-800">SEO</p>
                <div className="space-y-1 text-xs text-gray-800">
                  <div>
                    <span className="font-medium text-gray-600">Meta title:</span> {selected.metaTitle || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Meta description:</span>{" "}
                    <span className="whitespace-pre-wrap">{selected.metaDescription || "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tags:</span>{" "}
                    {Array.isArray(selected.metaTags) && selected.metaTags.length > 0
                      ? selected.metaTags.join(", ")
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5">
              <h3 className="mb-1 text-xs font-semibold text-emerald-900">Fabric</h3>
              <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                <div>Name: {selected.fabric?.name || "—"}</div>
                <div>GSM: {selected.fabric?.gsm ?? 0}</div>
                <div>Width: {selected.fabric?.width || "—"}</div>
                <div>Lining: {selected.fabric?.lining || "—"}</div>
                <div>Meter: {selected.fabric?.meter ?? 0}</div>
                <div>Cost/m: {selected.fabric?.costPerMeter ?? 0}</div>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/40 p-2.5">
              <h3 className="mb-1 text-xs font-semibold text-violet-900">Costs</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Trim: {selected.costs?.trimCost ?? 0}</div>
                <div>Stitch: {selected.costs?.stitchingCost ?? 0}</div>
                <div>Finish: {selected.costs?.finishingCost ?? 0}</div>
                <div>Total: {selected.costs?.totalCost ?? 0}</div>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/30 p-2.5 text-xs">
              <span className="font-semibold text-amber-900">All SKUs:</span>{" "}
              {getSkuIds(selected).length ? getSkuIds(selected).join(", ") : "—"}
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-cyan-100 bg-cyan-50/30 p-3">
              <h3 className="text-xs font-semibold text-cyan-900">Size chart</h3>
              <DesignerSizeChartReadonlyTables
                item={selected}
                outerClassName="space-y-2"
                tableWrapClass="overflow-x-auto rounded-md border border-cyan-100 bg-white/90 p-2"
                showMeasureImages
                onMeasureImageClick={(images, idx) => openLightbox(images, idx)}
              />
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <h3 className="text-xs font-semibold text-indigo-900">Variants &amp; media</h3>
              {(selected.variants || []).length === 0 ? (
                <p className="text-xs text-gray-500">No variants.</p>
              ) : (
                (selected.variants || []).map((variant, vIdx) => {
                  const imgs = orderedVariantImages(variant);
                  const withMedia = imgs.filter((im) => variantMediaSrc(im));
                  return (
                    <div
                      key={`${variant?.color?.name || "v"}-${vIdx}`}
                      className="rounded-lg border border-indigo-100/80 bg-white/90 p-2.5"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        Variant {vIdx + 1}: {variant?.color?.name || "—"}{" "}
                        <span className="font-normal text-gray-500">({variant?.color?.hex || "—"})</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {imgs.length} media slot{imgs.length !== 1 ? "s" : ""}
                        {withMedia.length ? ` · ${withMedia.length} with URL` : ""}
                      </p>
                      {withMedia.length ? (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                          <div className="flex flex-wrap gap-2">
                            {withMedia.map((im, i) => {
                              const src = variantMediaSrc(im);
                              const isVideo = isVariantVideoMedia(im);
                              return (
                                <button
                                  key={`${src}-${i}`}
                                  type="button"
                                  onClick={() => openLightbox(withMedia, i)}
                                  className="relative shrink-0 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  title={isVideo ? "Open video viewer" : "Open image viewer"}
                                >
                                  {isVideo ? (
                                    <>
                                      <video
                                        src={src}
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="h-20 w-20 rounded-lg object-cover hover:opacity-90 sm:h-24 sm:w-24"
                                      />
                                      <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white sm:text-[9px]">
                                        Video
                                      </span>
                                    </>
                                  ) : (
                                    <img
                                      src={src}
                                      alt=""
                                      className="h-20 w-20 rounded-lg object-cover hover:opacity-90 sm:h-24 sm:w-24"
                                      loading="lazy"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400">No media URLs for this variant.</p>
                      )}
                      <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-[11px] text-gray-700">
                        {(variant?.sizes || []).map((s, sIdx) => (
                          <div key={`${s?.sku || s?.size || "sz"}-${sIdx}`}>
                            {s?.size || "—"} · SKU {s?.sku || "—"} · Planned {s?.plannedQty ?? 0} · Produced{" "}
                            {s?.producedQty ?? 0}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
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
          aria-labelledby="full-text-modal-title"
          onClick={() => setFullTextModal(null)}
        >
          <div
            className="max-h-[min(90vh,40rem)] w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h2 id="full-text-modal-title" className="min-w-0 truncate text-base font-semibold text-gray-900">
                {fullTextModal.title}
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
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
    </div>
  );
};

export default DesignerInventoryList;



