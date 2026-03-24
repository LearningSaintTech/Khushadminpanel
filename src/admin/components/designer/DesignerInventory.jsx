import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { changeDesignerInventoryStatus, exportDesignerInventory, getDesignerInventory } from "../../apis/Designerapi";

const DesignerInventory = () => {
  const [params] = useSearchParams();
  const presetDesignerId = params.get("designerId") || "";
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [exportingType, setExportingType] = useState("");
  const [error, setError] = useState("");
  const [busyStatusId, setBusyStatusId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

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
  }, [page, status, search, presetDesignerId]);

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

  const onExport = async (type) => {
    setExportingType(type);
    setError("");
    try {
      const res = await exportDesignerInventory(type, {
        search,
        status,
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
    <div className="bg-white text-black p-3 sm:p-4">
      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Designer Inventory</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Review inventory submissions and update approval status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("csv")}>{exportingType === "csv" ? "Exporting..." : "CSV"}</button>
          <button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("excel")}>{exportingType === "excel" ? "Exporting..." : "Excel"}</button>
          <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportingType !== ""} onClick={() => onExport("pdf")}>{exportingType === "pdf" ? "Exporting..." : "PDF"}</button>
        </div>
      </div>

      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search by designer, style number, SKU ID" />
        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5 sm:min-w-[170px]" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All status</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
      </div>
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="p-2.5 text-left font-semibold text-gray-700">Style</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Designer</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Product</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Gender</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">SKU IDs</th>
              <th className="p-2.5 text-left font-semibold text-gray-700">Status</th>
              <th className="p-2.5 text-right font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-4 text-gray-500">Loading...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="p-4 text-gray-500">No records.</td></tr> : rows.map((r) => (
              <tr key={r._id} className="border-t border-black/5">
                <td className="p-2.5">
                  <div className="font-medium">{r.StyleNumber || "-"}</div>
                  <div className="text-xs text-gray-500">{r.employeeId || "-"}</div>
                </td>
                <td className="p-2.5 text-gray-700">{r.designerName}</td>
                <td className="p-2.5 text-gray-700">{r.productType} / {r.fitType}</td>
                <td className="p-2.5">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getGenderClasses(r.gender)}`}>
                    {r.gender || "-"}
                  </span>
                </td>
                <td className="p-2.5">
                  <div className="max-w-[320px] truncate text-xs text-gray-700">
                    {getSkuIds(r).slice(0, 3).join(", ") || "-"}
                  </div>
                  {getSkuIds(r).length > 3 ? (
                    <div className="text-[11px] text-gray-500">+{getSkuIds(r).length - 3} more</div>
                  ) : null}
                </td>
                <td className="p-2.5">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClasses(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-2.5">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 text-gray-700 hover:bg-black hover:text-white transition-colors"
                    onClick={() => setSelectedItem(r)}
                    title="View details"
                    aria-label="View details"
                  >
                    <Eye size={14} />
                  </button>
                  <select className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled={busyStatusId === r._id} value={r.status} onChange={(e) => onChangeStatus(r._id, e.target.value)}>
                    <option value="draft">draft</option>
                    <option value="submitted">submitted</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 sm:p-4 shadow-xl">
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
              <div><span className="font-medium">Product Type:</span> {selectedItem.productType || "-"}</div>
              <div><span className="font-medium">Fit Type:</span> {selectedItem.fitType || "-"}</div>
              <div><span className="font-medium">Gender:</span> {selectedItem.gender || "-"}</div>
              <div><span className="font-medium">Total Production Qty:</span> {selectedItem.totalProductionQty ?? 0}</div>
              <div><span className="font-medium">Default Color:</span> {selectedItem.defaultColor || "-"}</div>
              <div><span className="font-medium">Top SKU ID:</span> {selectedItem?.sku?.skuId || "-"}</div>
              <div><span className="font-medium">Description:</span> {selectedItem.description || "-"}</div>
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
    </div>
  );
};

export default DesignerInventory;



