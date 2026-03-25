import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createItem } from "../../apis/itemapi";
import { getAllCategories } from "../../apis/categoryapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";
import { getDesignerInventoryById, patchDesignerInventoryListed } from "../../apis/Designerapi";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import {
  buildItemCreateFormData,
  designerInventoryToItemFormState,
} from "../../utils/buildItemCreateFormData";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const sectionTitle = "mb-2 border-l-4 border-indigo-500 pl-2 text-sm font-semibold text-gray-900";
const detailGrid = "grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3";
const detailBox = "rounded-xl border border-gray-200 bg-gray-50/90 p-3";

function variantImageSrc(img) {
  if (!img) return "";
  if (typeof img === "string") return img.trim();
  if (typeof img?.url === "string") return img.url.trim();
  return "";
}

function orderedVariantImages(variant) {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
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
          </div>
          <div>
            <span className="font-medium text-gray-700">Gender:</span> {d.gender || "—"}
          </div>
          <div>
            <span className="font-medium text-gray-700">Product / fit:</span> {d.productType || "—"} / {d.fitType || "—"}
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
        <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
          {(d.description || "").trim() || "—"}
        </p>
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
        <h3 className={sectionTitle}>Variants, images & sizes</h3>
        <div className="space-y-4">
          {(d.variants || []).map((variant, idx) => {
            const imgs = orderedVariantImages(variant);
            const withUrl = imgs.map((im) => variantImageSrc(im)).filter(Boolean);
            return (
              <div
                key={`${variant?.color?.name || "v"}-${idx}`}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="text-sm font-semibold text-gray-900">
                  Variant {idx + 1}: {variant?.color?.name || "—"}{" "}
                  <span className="font-normal text-gray-600">({variant?.color?.hex || "—"})</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Multiple images: {variant?.color?.isMultipleImages ? "Yes" : "No"} · Declared total images:{" "}
                  {variant?.color?.totalImages ?? "—"}
                </div>
                {withUrl.length > 0 ? (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-gray-600">Images ({withUrl.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {withUrl.map((src, i) => (
                        <a
                          key={`${src}-${i}`}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block shrink-0 overflow-hidden rounded-lg border border-gray-200"
                          title={src}
                        >
                          <img src={src} alt="" className="h-20 w-20 object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                    <p className="mt-1 break-all text-[11px] text-gray-500">{withUrl.join(" · ")}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">No image URLs on this variant.</p>
                )}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-xs">
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

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadErr("");
      setLoadingDoc(true);
      setForm(null);
      setSourceDesigner(null);
      setCategoryId("");
      setSubcategoryId("");
      try {
        const [catRes, invRes] = await Promise.all([
          getAllCategories(1, 80, ""),
          designerRow?._id ? getDesignerInventoryById(designerRow._id) : Promise.resolve(null),
        ]);

        const catRoot = catRes?.data?.data || catRes?.data || {};
        const catList = catRoot.categories || catRoot || [];
        setCategories(Array.isArray(catList) ? catList : []);

        if (invRes?.success && invRes.data) {
          setSourceDesigner(invRes.data);
          setForm(designerInventoryToItemFormState(invRes.data));
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
    if (!open || !categoryId) {
      setSubcategories([]);
      return;
    }
    (async () => {
      try {
        const res = await getSubcategoriesByCategory(categoryId, 1, 80, "");
        const root = res?.data?.data || res?.data || {};
        const list = root.subcategories || root.subCategories || root || [];
        setSubcategories(Array.isArray(list) ? list : []);
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
    if (!form.productId?.trim()) return "Product ID is required (unique catalog id).";
    if (!form.shortDescription?.trim()) return "Short description is required.";
    if (!form.longDescription?.trim()) return "Long description is required.";
    if (form.shortDescription.length > 70) return "Short description max 70 characters.";
    if (form.longDescription.length > 150) return "Long description max 150 characters.";
    if (!form.skuCodeInputs?.styleNu?.trim()) return "Style number (SKU inputs) is required.";
    if (!form.skuCodeInputs?.productType?.trim()) return "Product type (SKU inputs) is required.";
    if (!form.skuCodeInputs?.fitType?.trim()) return "Fit type (SKU inputs) is required.";
    if (!form.defaultColor?.trim()) return "Default color is required.";
    if (!form.variants?.length) return "No variants with sizes — check designer inventory.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const fd = buildItemCreateFormData(form, categoryId, subcategoryId);
      const res = await createItem(fd);
      const created = res?.data;
      const catalogItemId = created?._id;
      if (!catalogItemId) {
        throw new Error("Catalog create did not return an item id.");
      }
      await patchDesignerInventoryListed(designerRow._id, {
        isListed: true,
        catalogItemId: String(catalogItemId),
      });
      toast.success("Listed in catalog and linked to main inventory.");
      onPublished?.();
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
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Publish to main inventory</h2>
            <p className="text-xs text-gray-500">
              Style {designerRow.StyleNumber || "—"} · Prefilled from designer; add catalog fields and save.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>

        <div className="px-4 py-3">
          {loadingDoc ? (
            <p className="text-sm text-gray-500">Loading designer item…</p>
          ) : loadErr ? (
            <p className="text-sm text-red-600">{loadErr}</p>
          ) : form ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DesignerSourceDetails d={sourceDesigner} />

              <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-3">
                <h3 className="mb-2 border-l-4 border-indigo-600 pl-2 text-sm font-semibold text-gray-900">
                  Main inventory (catalog) — edit & submit
                </h3>
                <p className="mb-3 text-xs text-gray-600">
                  Fields below are sent to main item inventory. Short/long descriptions are limited for the catalog;
                  the full designer text stays in the section above.
                </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Category *</label>
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
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">Subcategory *</label>
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
                  <label htmlFor="ldc-active" className="text-sm text-gray-700">
                    Active in catalog
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Short description * (max 70)
                  </label>
                  <input
                    className={fieldClass}
                    maxLength={70}
                    value={form.shortDescription}
                    onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700">
                    Long description * (max 150)
                  </label>
                  <textarea
                    className={fieldClass + " min-h-[72px]"}
                    maxLength={150}
                    value={form.longDescription}
                    onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                    required
                  />
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
                        Images in payload: {v.images?.length || 0}
                        {Array.isArray(v.images) && v.images.length
                          ? (
                              <span className="ml-1 break-all text-[10px] text-gray-500">
                                {v.images.slice(0, 2).join(" · ")}
                                {v.images.length > 2 ? " …" : ""}
                              </span>
                            )
                          : null}
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

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create catalog item & mark listed"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
