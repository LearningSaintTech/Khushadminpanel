import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import toast from "react-hot-toast";
import { getAllCategories } from "../../apis/categoryapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";
import { getDesignerInventoryById } from "../../apis/Designerapi";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import SafeExternalLink from "../../../components/SafeExternalLink.jsx";
import { getSafeHttpHref } from "../../../utils/safeUrl.util.js";
import { designerInventoryToItemFormState } from "../../utils/buildItemCreateFormData";
import {
  catalogCategoryLabel,
  catalogSubcategoryLabel,
  groupSecondarySubsByCategory,
  normalizeIdList,
  parseCatalogCategoriesResponse,
  parseCatalogSubcategoriesResponse,
} from "../../utils/catalogCategoryDisplay";
import { publishDesignerToCatalog, findExistingCatalogItemForDesigner } from "../../utils/publishDesignerToCatalog";
import {
  SIZE_CHART_PRESETS,
  garmentPresetCategoryLabel,
  mergeSizeChartsWithPreset,
  presetGenderKeyFromSkuGender,
} from "../../../utils/sizeChartPresets.js";
import DesignerSizeChartReadonlyTables from "../../../components/designer/DesignerSizeChartReadonlyTables.jsx";
import { resolveCareIconSrc } from "../../../utils/resolveCareIconSrc.js";
import { isVariantVideoMedia, resolveVariantMediaUrl, variantMediaUrl } from "../../../utils/variantMedia.js";
import { getCdnBaseUrl } from "../../../utils/apiConfig.js";
import { btnOutline, btnPrimary, fieldClass } from "./designerShared";

const sectionTitle =
  "mb-2 border-l-4 border-brand-500 pl-2 text-[12px] font-semibold text-stone-900";
const detailGrid = "grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2 lg:grid-cols-3";
const detailBox = "rounded-xl border border-border bg-canvas-muted/50 p-3";

function variantFormImageLabel(im) {
  if (typeof im === "string") return im;
  if (im && typeof im === "object" && im.url) {
    const tag = im.type ? `[${im.type}] ` : "";
    return `${tag}${im.url}`;
  }
  return variantMediaUrl(im);
}

function orderedVariantImages(variant) {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
}

function toFormMeasureImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((img) => {
      if (!img) return null;
      if (typeof img === "string") return img.trim() || null;
      const url = typeof img?.url === "string" ? img.url.trim() : "";
      const imageKey = typeof img?.imageKey === "string" ? img.imageKey.trim() : "";
      if (!url && !imageKey) return null;
      // Keep both URL + key (or key-only) so payload builder can preserve entries.
      return { ...(url ? { url } : {}), ...(imageKey ? { imageKey } : {}) };
    })
    .filter(Boolean);
}

function sourceDesignerChartsToFormSizeCharts(sourceDesigner) {
  const empty = { headers: [], rows: [], measureImages: [] };
  const sc = sourceDesigner?.sizeCharts;
  if (sc && (sc.in || sc.cm)) {
    return {
      in: {
        headers: Array.isArray(sc?.in?.headers) ? sc.in.headers : [],
        rows: Array.isArray(sc?.in?.rows) ? sc.in.rows : [],
        measureImages: toFormMeasureImages(sc?.in?.measureImage),
      },
      cm: {
        headers: Array.isArray(sc?.cm?.headers) ? sc.cm.headers : [],
        rows: Array.isArray(sc?.cm?.rows) ? sc.cm.rows : [],
        measureImages: toFormMeasureImages(sc?.cm?.measureImage),
      },
    };
  }
  const leg = sourceDesigner?.sizeChart;
  const unit = leg?.unit === "cm" ? "cm" : "in";
  const one = {
    headers: Array.isArray(leg?.headers) ? leg.headers : [],
    rows: Array.isArray(leg?.rows) ? leg.rows : [],
    measureImages: toFormMeasureImages(leg?.measureImage),
  };
  return {
    in: unit === "in" ? one : empty,
    cm: unit === "cm" ? one : empty,
  };
}

function sideHasMeasureImages(side) {
  const imgs = Array.isArray(side?.measureImages) ? side.measureImages : [];
  return imgs.some((img) => {
    if (!img) return false;
    if (typeof img === "string") return Boolean(img.trim());
    if (typeof img === "object") {
      const url = typeof img.url === "string" ? img.url.trim() : "";
      const imageKey = typeof img.imageKey === "string" ? img.imageKey.trim() : "";
      return Boolean(url || imageKey);
    }
    return false;
  });
}

function ensureSizeChartMeasureImagesFromSource(form, sourceDesigner) {
  const fromSource = sourceDesignerChartsToFormSizeCharts(sourceDesigner);
  const next = {
    ...(form || {}),
    sizeCharts: {
      in: { ...(form?.sizeCharts?.in || {}), measureImages: form?.sizeCharts?.in?.measureImages || [] },
      cm: { ...(form?.sizeCharts?.cm || {}), measureImages: form?.sizeCharts?.cm?.measureImages || [] },
    },
  };
  if (!sideHasMeasureImages(next.sizeCharts.in) && sideHasMeasureImages(fromSource.in)) {
    next.sizeCharts.in.measureImages = fromSource.in.measureImages;
  }
  if (!sideHasMeasureImages(next.sizeCharts.cm) && sideHasMeasureImages(fromSource.cm)) {
    next.sizeCharts.cm.measureImages = fromSource.cm.measureImages;
  }
  return next;
}

function allSkusFromDesigner(d) {
  const skus = [];
  for (const v of d?.variants || []) {
    for (const s of v?.sizes || []) {
      if (s?.sku) skus.push(String(s.sku).trim());
    }
  }
  return [...new Set(skus.filter(Boolean))];
}

function StoreCategoriesSummary({
  designer,
  categories,
  subsByCategory,
  labelsLoading,
}) {
  if (!designer) return null;
  const primaryCat = categories.find((c) => String(c._id) === String(designer.categoryId || ""));
  const primarySubName =
    (subsByCategory[designer.categoryId] || []).find(
      (s) => String(s._id) === String(designer.subcategoryId || ""),
    ) || null;
  const secondaryCats = normalizeIdList(designer.secondaryCategoryId);
  const secondarySubs = normalizeIdList(designer.secondarySubcategoryId);
  const grouped = groupSecondarySubsByCategory(
    secondaryCats,
    secondarySubs,
    subsByCategory,
  );

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
      <h3 className="mb-2 border-l-4 border-teal-600 pl-2 text-sm font-semibold text-teal-950">
        Store categories (saved on designer — copied to catalog on publish)
      </h3>
      {labelsLoading ? (
        <p className="text-xs text-gray-600">Loading category names…</p>
      ) : null}
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-lg border border-white/80 bg-white/90 p-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-teal-800">Primary</dt>
          <dd className="mt-1 text-gray-900">
            {primaryCat ? catalogCategoryLabel(primaryCat) : designer.categoryId || "—"}
            <span className="text-gray-500"> → </span>
            {primarySubName
              ? catalogSubcategoryLabel(primarySubName)
              : designer.subcategoryId || "—"}
          </dd>
        </div>
        {grouped.length > 0 ? (
          <div className="sm:col-span-2 rounded-lg border border-white/80 bg-white/90 p-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Secondary (cross-listing)
            </dt>
            <dd className="mt-1 space-y-2">
              {grouped.map(({ categoryId, subcategoryIds }) => {
                const cat = categories.find((c) => String(c._id) === String(categoryId));
                const subs = (subsByCategory[categoryId] || []).filter((s) =>
                  subcategoryIds.includes(String(s._id)),
                );
                return (
                  <div key={categoryId} className="text-sm text-gray-900">
                    <span className="font-medium">
                      {cat ? catalogCategoryLabel(cat) : categoryId}
                    </span>
                    {subs.length > 0 ? (
                      <ul className="mt-0.5 list-inside list-disc text-gray-700">
                        {subs.map((sub) => (
                          <li key={sub._id}>{catalogSubcategoryLabel(sub)}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ml-1 text-gray-500">(no subcategories selected)</span>
                    )}
                  </div>
                );
              })}
            </dd>
          </div>
        ) : (
          <div className="sm:col-span-2 text-xs text-gray-600">No secondary categories on this item.</div>
        )}
      </dl>
    </div>
  );
}

function DesignerSourceDetails({ d }) {
  if (!d) return null;
  const allSkus = allSkusFromDesigner(d);
  return (
    <>
      <div className={detailBox}>
        <h3 className={sectionTitle}>Designer submission</h3>
        <div className={detailGrid}>
          <div>
            <span className="font-medium text-gray-700">Style number:</span> {d.StyleNumber || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Style name:</span> {d.styleName || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Designer:</span> {d.designerName || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Employee ID:</span> {d.employeeId || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span> {d.status || "—"}
            {String(d.status || "").toLowerCase() !== "approved" ? (
              <span className="ml-1 text-amber-700">(approve in inventory before listing)</span>
            ) : null}
          </div>
          <div>
            <span className="font-medium text-gray-700">Gender:</span> {d.gender || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Product / fit:</span>{" "}
            {d.productType || "—"}
            {d.productTypeCode ? ` (${d.productTypeCode})` : ""} / {d.fitType || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Default color:</span> {d.defaultColor || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Total production qty:</span> {d.totalProductionQty ?? 0}
          </div>
          <div>
            <span className="font-medium text-gray-700">Top SKU ID:</span> {d?.sku?.skuId || "—"}
          </div>
          <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-gray-200 bg-white/90 p-2 text-xs text-gray-700">
            <span className="font-semibold text-gray-800">Saved SKU code inputs (item):</span>{" "}
            styleNu: {d.skuCodeInputs?.styleNu || "—"} · gender: {d.skuCodeInputs?.gender || "—"} · styleGender:{" "}
            {d.skuCodeInputs?.styleGender || "—"} · productType: {d.skuCodeInputs?.productType || "—"} · fitType:{" "}
            {d.skuCodeInputs?.fitType || "—"}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-gray-700">All size SKUs:</span>{" "}
            <span className="break-all text-gray-800">{allSkus.length ? allSkus.join(", ") : "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span>{" "}
            {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Updated:</span>{" "}
            {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—"}
          </div>
        </div>
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>Full description (designer)</h3>
        <p className="whitespace-pre-wrap break-words text-[12px] text-gray-800">
          {(d.description || "").trim() || "—"}
        </p>
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>SEO (designer)</h3>
        <div className={detailGrid}>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-gray-700">Meta title:</span>{" "}
            <span className="text-gray-800">{String(d.metaTitle || "").trim() || "—"}</span>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-gray-700">Meta description:</span>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] text-gray-800">
              {String(d.metaDescription || "").trim() || "—"}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-gray-700">Tags:</span>{" "}
            <span className="break-all text-gray-800">
              {Array.isArray(d.metaTags) && d.metaTags.length > 0 ? d.metaTags.join(", ") : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>Care instructions (designer)</h3>
        <p className="mb-2 whitespace-pre-wrap break-words text-[12px] text-gray-800">
          {d?.care?.description?.trim() || "—"}
        </p>
        {Array.isArray(d?.care?.instructions) && d.care.instructions.length > 0 ? (
          <ul className="space-y-1 text-[11px] text-gray-700">
            {d.care.instructions.map((inst, idx) => (
              <li key={`care-${idx}`} className="rounded border border-gray-200 bg-white p-2">
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
                    <span>{inst?.text || "—"}</span>
                  </div>
                </div>
                {!resolveCareIconSrc(inst) && (inst?.iconKey || inst?.iconUrl) && (
                  <span className="ml-1 break-all text-gray-500">
                    ({inst?.iconKey || inst?.iconUrl})
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">No care instructions.</p>
        )}
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>Fabric</h3>
        <div className={detailGrid}>
          <div>
            <span className="font-medium text-gray-700">Name:</span> {d.fabric?.name || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">GSM:</span> {d.fabric?.gsm ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Width:</span> {d.fabric?.width || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Lining:</span> {d.fabric?.lining || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Meter:</span> {d.fabric?.meter ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Cost / meter:</span> {d.fabric?.costPerMeter ?? "—"}
          </div>
        </div>
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>Costing (designer)</h3>
        <div className={detailGrid}>
          <div>
            <span className="font-medium text-gray-700">Trim:</span> {d.costs?.trimCost ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Stitching:</span> {d.costs?.stitchingCost ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Finishing:</span> {d.costs?.finishingCost ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Total fabric cost:</span> {d.costs?.totalFabricCost ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Total cost:</span> {d.costs?.totalCost ?? "—"}
          </div>
        </div>
      </div>

      <div className={detailBox}>
        <h3 className={sectionTitle}>Size chart (in &amp; cm)</h3>
        <DesignerSizeChartReadonlyTables
          item={d}
          outerClassName="space-y-3"
          tableWrapClass="overflow-x-auto rounded-lg border border-gray-200 bg-white"
          showMeasureImages
        />
      </div>

      <div className={detailBox}>
        <h3 className={`${sectionTitle} flex flex-wrap items-center gap-1.5`}>
          <Video className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
          Variants, images &amp; video · sizes
        </h3>
        <div className="space-y-4">
          {(d.variants || []).map((variant, idx) => {
            const imgs = orderedVariantImages(variant);
            const withMedia = imgs
              .map((im) => {
                const src = variantMediaUrl(im);
                return src ? { im, src } : null;
              })
              .filter(Boolean);
            return (
              <div
                key={`${variant?.color?.name || "v"}-${idx}`}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="text-[12px] font-semibold text-gray-900">
                  Variant {idx + 1}: {variant?.color?.name || "—"}{" "}
                  <span className="font-normal text-gray-600">({variant?.color?.hex || "—"})</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Multiple images: {variant?.color?.isMultipleImages ? "Yes" : "No"} · Declared total images:{" "}
                  {variant?.color?.totalImages ?? "—"}
                </div>
                {withMedia.length > 0 ? (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-gray-600">Media ({withMedia.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {withMedia.map(({ im, src }, i) => {
                        const safeSrc = getSafeHttpHref(src);
                        if (!safeSrc) return null;
                        return (
                        <SafeExternalLink
                          key={`${safeSrc}-${i}`}
                          href={safeSrc}
                          className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200"
                          title={safeSrc}
                        >
                          {isVariantVideoMedia(im) ? (
                            <video
                              src={safeSrc}
                              className="h-20 w-20 object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img src={safeSrc} alt="" className="h-20 w-20 object-cover" loading="lazy" />
                          )}
                        </SafeExternalLink>
                        );
                      })}
                    </div>
                    <p className="mt-1 break-all text-[11px] text-gray-500">
                      {withMedia.map((x) => x.src).join(" · ")}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">No media URLs on this variant.</p>
                )}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="py-1.5 pr-2 font-medium">Size</th>
                        <th className="py-1.5 pr-2 font-medium">SKU</th>
                        <th className="py-1.5 pr-2 font-medium">Barcode</th>
                        <th className="py-1.5 pr-2 font-medium">Planned</th>
                        <th className="py-1.5 pr-2 font-medium">Produced</th>
                        <th className="py-1.5 font-medium">Stock (→ catalog)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(variant?.sizes || []).map((s, sIdx) => (
                        <tr key={`${s?.size}-${sIdx}`} className="border-b border-gray-100 text-gray-800">
                          <td className="py-1.5 pr-2">{s?.size || "—"}</td>
                          <td className="py-1.5 pr-2 font-mono text-[11px]">{s?.sku || "—"}</td>
                          <td className="py-1.5 pr-2 font-mono text-[11px]">{s?.barcode || "—"}</td>
                          <td className="py-1.5 pr-2">{s?.plannedQty ?? "—"}</td>
                          <td className="py-1.5 pr-2">{s?.producedQty ?? "—"}</td>
                          <td className="py-1.5">
                            {s?.producedQty ?? s?.plannedQty ?? s?.stock ?? "—"}
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
    </>
  );
}

export default function ListDesignerToCatalogModal({ open, designerRow, onClose, onPublished }) {
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [sourceDesigner, setSourceDesigner] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [sizeChartCategory, setSizeChartCategory] = useState("upper");
  const [subsByCategory, setSubsByCategory] = useState({});
  const [categoryLabelsLoading, setCategoryLabelsLoading] = useState(false);
  const [existingCatalog, setExistingCatalog] = useState(null);
  const [checkingCatalog, setCheckingCatalog] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (designerRow && String(designerRow.status || "").toLowerCase() !== "approved") {
      console.warn("[ListDesignerToCatalogModal] item not approved", designerRow?.status);
      toast.error("Approve this item in Designer Inventory before publishing to catalog.");
      onClose?.();
      return;
    }
    (async () => {
      setLoadErr("");
      setLoadingDoc(true);
      setForm(null);
      setSourceDesigner(null);
      setCategoryId("");
      setSubcategoryId("");
      setSizeChartCategory("upper");
      try {
        const [catRes, invRes] = await Promise.all([
          getAllCategories(1, 80, ""),
          designerRow?._id ? getDesignerInventoryById(designerRow._id) : Promise.resolve(null),
        ]);

        setCategories(parseCatalogCategoriesResponse(catRes));

        if (invRes?.success && invRes.data) {
          const doc = invRes.data;
          console.log("[ListDesignerToCatalogModal] loaded designer item", {
            id: doc._id,
            status: doc.status,
            categoryId: doc.categoryId,
            subcategoryId: doc.subcategoryId,
          });
          setSourceDesigner(doc);
          setForm(designerInventoryToItemFormState(doc));
          if (doc.categoryId) setCategoryId(String(doc.categoryId));
          if (doc.subcategoryId) setSubcategoryId(String(doc.subcategoryId));
          if (doc.catalogItemId && !doc.isListed) {
            setExistingCatalog({
              _id: String(doc.catalogItemId),
              productId: doc.StyleNumber || doc.skuCodeInputs?.styleNu || "",
              name: doc.styleName || doc.StyleNumber,
            });
          }
        } else {
          setLoadErr(invRes?.message || "Could not load designer inventory.");
        }
      } catch (e) {
        setLoadErr(e?.message || "Failed to load data.");
      } finally {
        setLoadingDoc(false);
      }
    })();
  }, [open, designerRow?._id]);

  useEffect(() => {
    if (!open || !sourceDesigner || !form?.productId?.trim()) {
      setExistingCatalog(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingCatalog(true);
      try {
        const hit = await findExistingCatalogItemForDesigner({
          productId: form.productId,
          designerRow: sourceDesigner,
        });
        if (!cancelled) setExistingCatalog(hit);
      } catch {
        if (!cancelled) setExistingCatalog(null);
      } finally {
        if (!cancelled) setCheckingCatalog(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, sourceDesigner, form?.productId]);

  useEffect(() => {
    if (!open || !sourceDesigner) {
      setSubsByCategory({});
      return undefined;
    }
    const categoryIds = [
      ...new Set(
        [
          sourceDesigner.categoryId,
          ...normalizeIdList(sourceDesigner.secondaryCategoryId),
        ].filter(Boolean),
      ),
    ];
    if (categoryIds.length === 0) return undefined;
    let cancelled = false;
    setCategoryLabelsLoading(true);
    (async () => {
      const map = {};
      try {
        await Promise.all(
          categoryIds.map(async (catId) => {
            const res = await getSubcategoriesByCategory(catId, 1, 200);
            map[catId] = parseCatalogSubcategoriesResponse(res);
          }),
        );
      } catch {
        /* partial */
      }
      if (!cancelled) {
        setSubsByCategory(map);
        setCategoryLabelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sourceDesigner]);

  useEffect(() => {
    if (!open || !categoryId) {
      setSubcategories([]);
      return;
    }
    (async () => {
      try {
        const res = await getSubcategoriesByCategory(categoryId, 1, 80, "");
        setSubcategories(parseCatalogSubcategoriesResponse(res));
      } catch {
        setSubcategories([]);
      }
    })();
  }, [open, categoryId]);

  if (!open || !designerRow) return null;

  const validate = () => {
    if (!categoryId) return "Choose a category.";
    if (!subcategoryId) return "Choose a subcategory.";
    if (!form?.name?.trim()) return "Product name is required.";
    if (form.price === "" || form.price == null || Number(form.price) <= 0) return "MRP must be greater than 0.";
    const mrpNum = Number(form.price);
    const discRaw = form.discountedPrice;
    if (
      discRaw !== "" &&
      discRaw != null &&
      !Number.isNaN(mrpNum) &&
      Number(discRaw) > mrpNum
    ) {
      return "Discounted price cannot be greater than MRP.";
    }
    if (!form.productId?.trim()) return "Product ID is required (unique catalog id).";
    if (!form.shortDescription?.trim()) return "Short description is required.";
    if (!form.longDescription?.trim()) return "Long description is required.";
    if (!form.skuCodeInputs?.styleNu?.trim()) return "Style number (SKU inputs) is required.";
    if (!form.skuCodeInputs?.productType?.trim()) return "Product type (SKU inputs) is required.";
    if (!form.skuCodeInputs?.fitType?.trim()) return "Fit type (SKU inputs) is required.";
    if (!form.defaultColor?.trim()) return "Default color is required.";
    if (!form.variants?.length) return "No variants with sizes — check designer inventory.";
    return "";
  };

  const handleSubmit = async (e, { linkOnly = false } = {}) => {
    e.preventDefault();
    const err = validate();
    if (err && !linkOnly) {
      toast.error(err);
      return;
    }
    if (linkOnly && !existingCatalog) {
      toast.error("No matching catalog item found for this Product ID.");
      return;
    }
    setSaving(true);
    try {
      const formForSubmit = ensureSizeChartMeasureImagesFromSource(form, sourceDesigner);
      console.log("[ListDesignerToCatalogModal] submit — publish flow", {
        designerInventoryId: designerRow._id,
        categoryId,
        subcategoryId,
        productId: formForSubmit.productId,
        linkOnly,
        existingCatalogId: existingCatalog?._id,
      });
      const result = await publishDesignerToCatalog({
        designerInventoryId: designerRow._id,
        designerRow: sourceDesigner,
        form: formForSubmit,
        categoryId,
        subcategoryId,
        linkOnly: linkOnly || Boolean(existingCatalog),
      });
      console.log("[ListDesignerToCatalogModal] publish complete", {
        mode: result.mode,
        catalogItemId: result.catalogItemId,
        updatedDesigner: result.updatedDesigner,
      });
      toast.success(
        result.mode === "link"
          ? `Linked to existing catalog item (${result.catalogItem?.productId || result.catalogItemId}).`
          : "Catalog item created and designer row marked as listed."
      );
      onPublished?.(result.updatedDesigner);
      onClose?.();
    } catch (raw) {
      const messages = extractBackendMessages(raw);
      if (messages?.length) {
        toast.error(messages[0], { duration: 6000 });
      } else {
        toast.error(raw?.message || "Save failed.", { duration: 5000 });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Publish to main inventory</h2>
            <p className="text-[11px] text-stone-500">
              Style {designerRow.StyleNumber || "—"} · Prefilled from designer; add catalog fields and save.
            </p>
          </div>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>

        <div className="px-4 py-3">
          {loadingDoc ? (
            <p className="text-[12px] text-gray-500">Loading designer item…</p>
          ) : loadErr ? (
            <p className="text-[12px] text-red-600">{loadErr}</p>
          ) : form ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DesignerSourceDetails d={sourceDesigner} />

              <StoreCategoriesSummary
                designer={sourceDesigner}
                categories={categories}
                subsByCategory={subsByCategory}
                labelsLoading={categoryLabelsLoading}
              />

              <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-3">
                <h3 className="mb-2 border-l-4 border-indigo-600 pl-2 text-[12px] font-semibold text-gray-900">
                  Main inventory (catalog) — edit & submit
                </h3>
                <p className="mb-3 text-[11px] text-gray-600">
                  Primary category and subcategory below are sent to main inventory when creating a
                  new item. If a catalog item with the same Product ID (or SKU) already exists, we
                  link to it instead of creating a duplicate.
                </p>
                {checkingCatalog ? (
                  <p className="mb-3 text-[11px] text-stone-500">Checking main inventory…</p>
                ) : null}
                {existingCatalog ? (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
                    <p className="font-semibold">Catalog item already exists — link only</p>
                    <p className="mt-1">
                      Found <span className="font-mono">{existingCatalog.productId}</span>
                      {existingCatalog.name ? ` · ${existingCatalog.name}` : ""}. Submit will link
                      this designer row (no new catalog create).
                    </p>
                  </div>
                ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Primary catalog category *
                  </label>
                  <select
                    className={fieldClass}
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId("");
                    }}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name || c.title || c._id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Primary catalog subcategory *
                  </label>
                  <select
                    className={fieldClass}
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    required
                    disabled={!categoryId}
                  >
                    <option value="">Select subcategory</option>
                    {subcategories.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name || s.title || s._id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Product name *</label>
                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Product ID * (unique)</label>
                  <input
                    className={fieldClass}
                    value={form.productId}
                    onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                    placeholder="e.g. KP-STYLE-001"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">MRP *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={fieldClass}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Discounted price</label>
                  <input
                    type="number"
                    min="0"
                    max={form.price !== "" && form.price != null ? Number(form.price) : undefined}
                    className={fieldClass}
                    value={form.discountedPrice}
                    onChange={(e) => setForm((f) => ({ ...f, discountedPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Default color *</label>
                  <input
                    className={fieldClass}
                    value={form.defaultColor}
                    onChange={(e) => setForm((f) => ({ ...f, defaultColor: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="ldc-active"
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label htmlFor="ldc-active" className="text-[12px] text-gray-700">
                    Active in catalog
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Short description *
                  </label>
                  <input
                    className={fieldClass}
                    value={form.shortDescription}
                    onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Long description *
                  </label>
                  <textarea
                    className={fieldClass + " min-h-[72px]"}
                    value={form.longDescription}
                    onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                    required
                  />
                </div>

                <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                  <h4 className="mb-2 text-xs font-semibold text-slate-900">SEO (catalog)</h4>
                  <p className="mb-2 text-[11px] text-gray-600">
                    Prefilled from designer when present. Sent with the new catalog item.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">Meta title</label>
                      <input
                        className={fieldClass}
                        value={form.metaTitle ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">Meta description</label>
                      <textarea
                        className={fieldClass + " min-h-[56px]"}
                        value={form.metaDescription ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">Tags</label>
                      <input
                        className={fieldClass}
                        value={form.metaTagsStr ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, metaTagsStr: e.target.value }))}
                        placeholder="Comma or semicolon separated"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-lg border border-indigo-100 bg-white/80 p-2.5">
                  <h4 className="mb-2 text-xs font-semibold text-indigo-900">
                    Size chart preset (catalog payload)
                  </h4>
                  <p className="mb-2 text-[11px] text-gray-600">
                    Fills in both in and cm measurement tables on the catalog item. Preset group follows the{" "}
                    <span className="font-medium">Gender token</span> under SKU generation below. Existing measure
                    image slots are merged like main inventory ItemForm.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-[160px] flex-1">
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">Garment type</label>
                      <select
                        className={fieldClass}
                        value={sizeChartCategory}
                        onChange={(e) => setSizeChartCategory(e.target.value)}
                      >
                        <option value="upper">Upper</option>
                        <option value="lower">Lower</option>
                        <option value="upper_lower">Upper + lower</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-gray-500 sm:mb-2 sm:flex-1">
                      Group: {presetGenderKeyFromSkuGender(form?.skuCodeInputs?.gender)} ·{" "}
                      {garmentPresetCategoryLabel(sizeChartCategory)}
                    </p>
                    <button
                      type="button"
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
                      onClick={() => {
                        const g = presetGenderKeyFromSkuGender(form?.skuCodeInputs?.gender);
                        const genderKey = SIZE_CHART_PRESETS[g] ? g : "unisex";
                        const preset =
                          SIZE_CHART_PRESETS[genderKey]?.[sizeChartCategory] ||
                          SIZE_CHART_PRESETS.unisex?.[sizeChartCategory];
                        if (!preset) {
                          toast.error("No preset for this combination.");
                          return;
                        }
                        setForm((f) => ({
                          ...f,
                          sizeCharts: mergeSizeChartsWithPreset(
                            f.sizeCharts || { in: {}, cm: {} },
                            preset,
                          ),
                        }));
                        toast.success("Size chart preset applied to catalog payload.");
                      }}
                    >
                      Apply preset
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-lg border border-indigo-100 bg-white/80 p-2.5">
                  <h4 className="mb-2 text-xs font-semibold text-indigo-900">
                    Care (will be saved to catalog item)
                  </h4>
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Care description
                  </label>
                  <textarea
                    className={fieldClass + " min-h-[56px]"}
                    value={form?.care?.description || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        care: { ...(f.care || { instructions: [] }), description: e.target.value },
                      }))
                    }
                    placeholder="Care description..."
                  />
                  <div className="mt-2 space-y-2">
                    {(form?.care?.instructions || []).map((inst, idx) => (
                      <div key={`care-edit-${idx}`} className="rounded border border-indigo-100 bg-white p-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          className={fieldClass + " sm:col-span-2"}
                          value={inst?.text || ""}
                          onChange={(e) =>
                            setForm((f) => {
                              const rows = [...(f.care?.instructions || [])];
                              rows[idx] = { ...(rows[idx] || {}), text: e.target.value };
                              return {
                                ...f,
                                care: { ...(f.care || {}), instructions: rows },
                              };
                            })
                          }
                          placeholder={`Instruction ${idx + 1}`}
                        />
                        <input
                          className={fieldClass}
                          value={inst?.iconKey || inst?.iconUrl || ""}
                          onChange={(e) =>
                            setForm((f) => {
                              const rows = [...(f.care?.instructions || [])];
                              const rawValue = e.target.value;
                              const resolved = resolveCareIconSrc({
                                iconKey: rawValue,
                                iconUrl: "",
                              });
                              rows[idx] = {
                                ...(rows[idx] || {}),
                                iconKey: rawValue,
                                iconUrl:
                                  resolved && !resolved.startsWith("blob:")
                                    ? resolved
                                    : rows[idx]?.iconUrl || "",
                                iconFile: null,
                                iconPreviewUrl: "",
                              };
                              return {
                                ...f,
                                care: { ...(f.care || {}), instructions: rows },
                              };
                            })
                          }
                          placeholder="icon key/url"
                        />
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
                              Or upload custom icon
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              className={fieldClass}
                              onChange={(e) =>
                                setForm((f) => {
                                  const rows = [...(f.care?.instructions || [])];
                                  const file = e.target.files?.[0] || null;
                                  rows[idx] = {
                                    ...(rows[idx] || {}),
                                    iconFile: file,
                                    iconPreviewUrl: file ? URL.createObjectURL(file) : "",
                                    ...(file ? { iconKey: "", iconUrl: "" } : {}),
                                  };
                                  return {
                                    ...f,
                                    care: { ...(f.care || {}), instructions: rows },
                                  };
                                })
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            {(() => {
                              const src =
                                inst?.iconPreviewUrl ||
                                resolveCareIconSrc(inst);
                              return src ? (
                                <img
                                  src={src}
                                  alt=""
                                  className="h-10 w-10 rounded border border-gray-200 bg-white p-1 object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded border border-dashed border-gray-200 bg-gray-50" />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <h3 className="mb-2 text-xs font-semibold text-indigo-900">SKU generation (from designer)</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["styleNu", "Style no."],
                    ["gender", "Gender token"],
                    ["productType", "Product type"],
                    ["fitType", "Fit type"],
                  ].map(([k, label]) => (
                    <div key={k}>
                      <label className="mb-0.5 block text-xs text-gray-600">{label}</label>
                      <input
                        className={fieldClass}
                        value={form.skuCodeInputs[k] || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            skuCodeInputs: { ...f.skuCodeInputs, [k]: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <h3 className="mb-2 border-l-4 border-amber-500 pl-2 text-xs font-semibold text-amber-900">
                  Payload preview (what will be created)
                </h3>
                <p className="mb-2 text-[11px] text-amber-900/80">
                  Same variant colors and image URLs as designer; stock per size uses produced → planned → 0. Edit SKU
                  tokens above if generation should change.
                </p>
                <ul className="space-y-3 text-xs text-gray-800">
                  {(form.variants || []).map((v, i) => (
                    <li key={`${v.color?.name}-${i}`} className="rounded-lg border border-amber-100/80 bg-white/80 p-2">
                      <div className="font-semibold text-gray-900">
                        {v.color?.name} <span className="font-normal text-gray-500">({v.color?.hex})</span>
                      </div>
                      <div className="mt-1 text-gray-600">
                        Media in payload: {v.images?.length || 0}
                        {Array.isArray(v.images) && v.images.length ? (
                          <span className="mt-1 flex flex-wrap items-start gap-1.5">
                            {v.images.map((im, k) => {
                              const mediaSrc = resolveVariantMediaUrl(im, getCdnBaseUrl()) || variantMediaUrl(im);
                              if (!mediaSrc) return null;
                              return isVariantVideoMedia(im) ? (
                                <video
                                  key={`pv-${k}`}
                                  src={mediaSrc}
                                  className="h-9 w-9 shrink-0 rounded border border-amber-200/80 object-cover bg-black"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  key={`pi-${k}`}
                                  src={mediaSrc}
                                  alt=""
                                  className="h-9 w-9 shrink-0 rounded border border-amber-200/80 object-cover"
                                  loading="lazy"
                                />
                              );
                            })}
                            <span className="min-w-0 break-all text-[10px] text-gray-500">
                              {v.images
                                .map((im) => variantFormImageLabel(im))
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-gray-700">
                        {(v.sizes || []).map((s, j) => (
                          <li key={j}>
                            {s.size}: SKU {s.sku || "(generated)"} · stock {s.stock}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving
                    ? existingCatalog
                      ? "Linking…"
                      : "Creating…"
                    : existingCatalog
                      ? "Link to existing catalog & mark listed"
                      : "Create catalog item & mark listed"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
