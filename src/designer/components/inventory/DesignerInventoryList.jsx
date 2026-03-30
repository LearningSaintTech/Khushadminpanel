import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeDesignerItemStatus,
  deleteDesignerItem,
  listDesignerItems,
  regenerateDesignerSku,
} from "../../apis/designerApi";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2, RefreshCw, Send, Plus, Loader2, X } from "lucide-react";

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

const DesignerInventoryList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [listErrors, setListErrors] = useState([]);
  const [actionErrors, setActionErrors] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useLayoutEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const fetchRows = async () => {
    setLoading(true);
    setListErrors([]);
    try {
      const res = await listDesignerItems({
        page,
        limit: 10,
        ...(status ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
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
  }, [page, status, debouncedSearch]);

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

  return (
    <div className="space-y-3">
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/90">
            <tr>
              <th className="p-2.5 text-left font-semibold text-gray-700">Style</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Product</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Price</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Gender</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">SKUs</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Qty</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Status</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Listed</th>
              <th className="p-2.5 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-indigo-800">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No records.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-100">
                  <td className="p-2.5">
                    <div className="font-medium text-gray-900">{r.StyleNumber}</div>
                    <div className="text-xs text-gray-500">{r.styleName || "-"}</div>
                    <div className="text-xs text-gray-500">{r.employeeId}</div>
                  </td>
                  <td className="p-2.5 text-gray-700">
                    {r.productType} / {r.fitType}
                  </td>
                  <td className="p-2.5 text-gray-700">
                    <div className="text-xs">MRP: {Number(r.mrp ?? 0)}</div>
                    <div className="text-xs">Disc: {Number(r.discountPrice ?? 0)}</div>
                  </td>
                  <td className="p-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}>
                      {r.gender || "-"}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="max-w-[140px] truncate text-xs text-gray-600">
                      {getSkuIds(r).slice(0, 2).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="p-2.5 text-gray-700">{r.totalProductionQty ?? 0}</td>
                  <td className="p-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isListed ? "bg-teal-100 text-teal-800 ring-1 ring-teal-200" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                      }`}
                      title="Set by admin for catalog visibility"
                    >
                      {r.isListed ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <button
                        type="button"
                        title="View"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        onClick={() => setSelected(r)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                        onClick={() => navigate(`/designer/inventory/edit/${r._id}`)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Regenerate SKU"
                        disabled={busyId === r._id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        onClick={() => run(r._id, () => regenerateDesignerSku(r._id))}
                      >
                        <RefreshCw size={14} className={busyId === r._id ? "animate-spin" : ""} />
                      </button>
                      {showSubmitButton(r.status) ? (
                        <button
                          type="button"
                          title="Submit"
                          disabled={busyId === r._id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          onClick={() => run(r._id, () => changeDesignerItemStatus(r._id, "submitted"))}
                        >
                          <Send size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        title="Delete"
                        disabled={busyId === r._id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        onClick={() => run(r._id, () => deleteDesignerItem(r._id))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4">
          <div className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl sm:mt-8">
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
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-4 pb-4">
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
                <span className="font-medium text-gray-600">Employee:</span> {selected.employeeId}
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
                <span className="font-medium text-gray-600">Product / fit:</span> {selected.productType} / {selected.fitType}
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
              <div className="sm:col-span-2">
                <span className="font-medium text-gray-600">Description:</span> {selected.description || "—"}
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

            <div className="mt-3 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <h3 className="text-xs font-semibold text-indigo-900">Variants &amp; images</h3>
              {(selected.variants || []).length === 0 ? (
                <p className="text-xs text-gray-500">No variants.</p>
              ) : (
                (selected.variants || []).map((variant, vIdx) => {
                  const imgs = orderedVariantImages(variant);
                  const withUrl = imgs.filter((im) => variantImageSrc(im));
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
                        {imgs.length} image slot{imgs.length !== 1 ? "s" : ""}
                        {withUrl.length ? ` · ${withUrl.length} with URL` : ""}
                      </p>
                      {withUrl.length ? (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                          <div className="flex flex-wrap gap-2">
                            {withUrl.map((im, i) => {
                              const src = variantImageSrc(im);
                              return (
                                <button
                                  key={`${src}-${i}`}
                                  type="button"
                                  onClick={() => openLightbox(withUrl.map(variantImageSrc), i)}
                                  className="shrink-0 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  title="Open image viewer"
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-20 w-20 rounded-lg object-cover hover:opacity-90 sm:h-24 sm:w-24"
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
    </div>
  );
};

export default DesignerInventoryList;



