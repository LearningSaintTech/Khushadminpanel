import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import { createDesignerItem, getDesignerItemById, updateDesignerItem } from "../../apis/designerApi";

function isLocalPickedFile(img) {
  if (img == null || typeof img !== "object") return false;
  if (typeof File !== "undefined" && img instanceof File) return true;
  if (typeof Blob !== "undefined" && img instanceof Blob) return true;
  return false;
}

function previewKeyForImage(img, idx) {
  if (isLocalPickedFile(img)) {
    return `f-${img.name}-${img.size}-${img.lastModified}-${idx}`;
  }
  if (typeof img === "string") return `s-${idx}-${img.slice(0, 48)}`;
  return `u-${idx}-${img?.url || ""}-${img?.imageKey || ""}`;
}

/** Sort by `order` for display; keep array index for remove(). Local Files have no order → stable order. */
function variantImagesForDisplay(variant) {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return raw
    .map((img, originalIndex) => ({ img, originalIndex }))
    .sort((a, b) => (Number(a.img?.order) || 0) - (Number(b.img?.order) || 0));
}

/** useLayoutEffect so blob previews paint in the same frame as the new file list (useEffect can look “stuck”). */
function VariantImagePreview({ image }) {
  const [src, setSrc] = useState("");

  useLayoutEffect(() => {
    if (!image) {
      setSrc("");
      return undefined;
    }
    if (isLocalPickedFile(image)) {
      const u = URL.createObjectURL(image);
      setSrc(u);
      return () => URL.revokeObjectURL(u);
    }
    if (typeof image === "string") {
      setSrc(image);
      return undefined;
    }
    setSrc(typeof image?.url === "string" ? image.url : "");
    return undefined;
  }, [image]);

  if (!src) {
    return <div className="h-20 w-20 shrink-0 rounded-md border border-dashed border-amber-200 bg-white" />;
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      className="h-20 w-20 shrink-0 rounded-md border border-amber-100 object-cover"
    />
  );
}

const emptySize = () => ({
  sku: "",
  size: "M",
  plannedQty: 0,
  producedQty: 0,
  barcode: "",
});

const emptyVariant = () => ({
  color: { name: "", hex: "#000000", isMultipleImages: false, totalImages: 0 },
  sizes: [emptySize()],
  images: [],
});

const emptyFabric = () => ({
  name: "",
  gsm: 0,
  width: "",
  lining: "",
  meter: 0,
  costPerMeter: 0,
});

const emptyCosts = () => ({
  trimCost: 0,
  stitchingCost: 0,
  finishingCost: 0,
});

const DesignerInventoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadItem, setLoadItem] = useState(isEdit);
  const [form, setForm] = useState({
    StyleNumber: "",
    designerName: "",
    employeeId: "",
    description: "",
    productType: "",
    fitType: "",
    gender: "men",
    defaultColor: "",
    fabric: emptyFabric(),
    costs: emptyCosts(),
    variants: [emptyVariant()],
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoadItem(true);
      try {
        const res = await getDesignerItemById(id);
        if (res?.success && res.data) {
          const d = res.data;
          setForm({
            StyleNumber: d.StyleNumber || "",
            designerName: d.designerName || "",
            employeeId: d.employeeId || "",
            description: d.description || "",
            productType: d.productType || "",
            fitType: d.fitType || "",
            gender: d.gender || "men",
            defaultColor: d.defaultColor || "",
            fabric: { ...emptyFabric(), ...(d.fabric || {}) },
            costs: { ...emptyCosts(), ...(d.costs || {}) },
            variants:
              Array.isArray(d.variants) && d.variants.length > 0
                ? d.variants.map((v) => ({
                    color: {
                      name: v.color?.name || "",
                      hex: v.color?.hex || "#000000",
                      totalImages: v.images?.length ?? v.color?.totalImages ?? 0,
                      isMultipleImages: (v.images?.length || 0) > 1,
                    },
                    sizes: (v.sizes || [emptySize()]).map((s) => ({
                      sku: s.sku || "",
                      size: s.size || "M",
                      plannedQty: s.plannedQty ?? 0,
                      producedQty: s.producedQty ?? 0,
                      barcode: s.barcode || "",
                    })),
                    images: Array.isArray(v.images) ? v.images : [],
                  }))
                : [emptyVariant()],
          });
        }
      } finally {
        setLoadItem(false);
      }
    })();
  }, [id, isEdit]);

  const setFabric = (k, v) => setForm((s) => ({ ...s, fabric: { ...s.fabric, [k]: v } }));
  const setCosts = (k, v) => setForm((s) => ({ ...s, costs: { ...s.costs, [k]: v } }));

  const updateVariant = (idx, fn) =>
    setForm((s) => {
      const variants = [...s.variants];
      variants[idx] = fn(variants[idx]);
      return { ...s, variants };
    });

  const addVariant = () => setForm((s) => ({ ...s, variants: [...s.variants, emptyVariant()] }));
  const removeVariant = (idx) =>
    setForm((s) => ({
      ...s,
      variants: s.variants.length > 1 ? s.variants.filter((_, i) => i !== idx) : s.variants,
    }));

  const addSize = (vIdx) =>
    updateVariant(vIdx, (v) => ({ ...v, sizes: [...v.sizes, emptySize()] }));
  const removeSize = (vIdx, sIdx) =>
    updateVariant(vIdx, (v) => ({
      ...v,
      sizes: v.sizes.length > 1 ? v.sizes.filter((_, i) => i !== sIdx) : v.sizes,
    }));

  const addVariantImages = (vIdx, e) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next = Array.from(list);
    updateVariant(vIdx, (v) => {
      const images = [...(Array.isArray(v.images) ? v.images : []), ...next];
      return {
        ...v,
        images,
        color: {
          ...v.color,
          totalImages: images.length,
          isMultipleImages: images.length > 1,
        },
      };
    });
    e.target.value = "";
  };

  const removeVariantImage = (vIdx, imgIdx) =>
    updateVariant(vIdx, (v) => {
      const images = (v.images || []).filter((_, i) => i !== imgIdx);
      return {
        ...v,
        images,
        color: {
          ...v.color,
          totalImages: images.length,
          isMultipleImages: images.length > 1,
        },
      };
    });

  const buildVariantsForPayload = () =>
    form.variants.map((variant) => {
      const imgs = Array.isArray(variant.images) ? variant.images : [];
      return {
        color: {
          ...variant.color,
          totalImages: imgs.length,
          isMultipleImages: imgs.length > 1,
        },
        sizes: variant.sizes,
        images: imgs.map((img, idx) => {
          if (isLocalPickedFile(img)) return { order: idx + 1 };
          if (typeof img === "string" && img) return { order: idx + 1, url: img };
          if (img && typeof img === "object" && img.url) {
            return { order: idx + 1, url: img.url, imageKey: img.imageKey || "" };
          }
          return { order: idx + 1 };
        }),
      };
    });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("StyleNumber", form.StyleNumber);
      formData.append("designerName", form.designerName);
      formData.append("employeeId", form.employeeId);
      formData.append("description", form.description || "");
      formData.append("productType", form.productType);
      formData.append("fitType", form.fitType);
      formData.append("gender", form.gender);
      formData.append("defaultColor", form.defaultColor || "");
      formData.append("fabric", JSON.stringify(form.fabric));
      formData.append("costs", JSON.stringify(form.costs));
      formData.append("variants", JSON.stringify(buildVariantsForPayload()));

      form.variants.forEach((variant) => {
        const colorName = variant.color.name?.trim();
        if (!colorName) return;
        (variant.images || []).forEach((img, index) => {
          if (!isLocalPickedFile(img)) return;
          if (isEdit && id) {
            formData.append(`variants[${colorName}][${index}]`, img);
          } else {
            formData.append(`variants[${colorName}]`, img);
          }
        });
      });

      if (isEdit) await updateDesignerItem(id, formData);
      else await createDesignerItem(formData);
      navigate("/designer/inventory");
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || err?.response?.data?.message || "Save failed. Check required fields and inventory codes.";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadItem) {
    return (
      <div className="flex items-center gap-2 text-sm text-indigo-800">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading item…
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="max-w-6xl space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{isEdit ? "Edit item" : "Create item"}</h1>
        <p className="text-xs text-gray-500">All fields sync with designer inventory on the server.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/25 p-3 shadow-sm">
        {submitError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</div>
        ) : null}
        <h2 className="border-l-4 border-indigo-500 pl-2 text-sm font-semibold text-indigo-900">Core</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["StyleNumber", "Style number", true],
            ["designerName", "Designer name", true],
            ["employeeId", "Employee ID", true],
            ["productType", "Product type", true],
            ["fitType", "Fit type", true],
            ["defaultColor", "Default color", false],
          ].map(([key, label, req]) => (
            <div key={key}>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
              <input
                className={fieldClass}
                value={form[key] || ""}
                onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
                required={req}
              />
            </div>
          ))}
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">Gender</label>
            <select
              className={fieldClass}
              value={form.gender}
              onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}
            >
              <option value="men">men</option>
              <option value="women">women</option>
              <option value="unisex">unisex</option>
              <option value="kids">kids</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">Description</label>
            <textarea
              className={fieldClass + " min-h-[56px]"}
              rows={2}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>

        <h2 className="border-l-4 border-emerald-500 pl-2 text-sm font-semibold text-emerald-900">Fabric</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {[
            ["name", "Name", "text"],
            ["gsm", "GSM", "number"],
            ["width", "Width", "text"],
            ["lining", "Lining", "text"],
            ["meter", "Meter", "number"],
            ["costPerMeter", "Cost / meter", "number"],
          ].map(([k, label, type]) => (
            <div key={k}>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
              <input
                type={type}
                className={fieldClass}
                value={form.fabric[k]}
                onChange={(e) => setFabric(k, type === "number" ? Number(e.target.value) || 0 : e.target.value)}
              />
            </div>
          ))}
        </div>

        <h2 className="border-l-4 border-violet-500 pl-2 text-sm font-semibold text-violet-900">Costs</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {[
            ["trimCost", "Trim"],
            ["stitchingCost", "Stitching"],
            ["finishingCost", "Finishing"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
              <input
                type="number"
                className={fieldClass}
                value={form.costs[k]}
                onChange={(e) => setCosts(k, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="border-l-4 border-amber-500 pl-2 text-sm font-semibold text-amber-900">Variants & sizes</h2>
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            <Plus size={14} /> Variant
          </button>
        </div>

        <div className="space-y-2">
          {form.variants.map((variant, vIdx) => {
            const displayImages = variantImagesForDisplay(variant);
            return (
            <div
              key={vIdx}
              className="rounded-lg border border-amber-100 bg-amber-50/30 p-2"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-900">Variant {vIdx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeVariant(vIdx)}
                  className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div>
                  <label className="mb-0.5 block text-xs text-gray-600">Color name</label>
                  <input
                    className={fieldClass}
                    value={variant.color.name}
                    onChange={(e) =>
                      updateVariant(vIdx, (v) => ({
                        ...v,
                        color: { ...v.color, name: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-600">Hex</label>
                  <input
                    className={fieldClass}
                    value={variant.color.hex}
                    onChange={(e) =>
                      updateVariant(vIdx, (v) => ({
                        ...v,
                        color: { ...v.color, hex: e.target.value.toUpperCase() },
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="mb-2 rounded-md border border-amber-200/80 bg-white/60 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700">Variant images</span>
                  <label className="relative inline-flex cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                    <ImagePlus size={14} className="pointer-events-none shrink-0" />
                    <span className="pointer-events-none">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(e) => addVariantImages(vIdx, e)}
                    />
                  </label>
                </div>
                {displayImages.length === 0 ? (
                  <p className="text-xs text-gray-500">No images yet — add photos for this color (same flow as main inventory).</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto rounded-md border border-amber-100/90 bg-white/90 p-2">
                    <ul className="flex flex-wrap gap-2">
                      {displayImages.map(({ img, originalIndex }) => (
                        <li key={previewKeyForImage(img, originalIndex)} className="relative shrink-0">
                          <VariantImagePreview image={img} />
                          <button
                            type="button"
                            onClick={() => removeVariantImage(vIdx, originalIndex)}
                            className="absolute -right-1 -top-1 rounded-full bg-rose-600 p-0.5 text-white shadow hover:bg-rose-700"
                            aria-label="Remove image"
                          >
                            <Trash2 size={10} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Sizes</span>
                  <button
                    type="button"
                    onClick={() => addSize(vIdx)}
                    className="text-xs font-medium text-indigo-700 hover:underline"
                  >
                    + Size
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-left text-gray-700">
                        <th className="p-1.5">Size</th>
                        <th className="p-1.5">SKU</th>
                        <th className="p-1.5">Barcode</th>
                        <th className="p-1.5">Planned</th>
                        <th className="p-1.5">Produced</th>
                        <th className="p-1.5 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {variant.sizes.map((sz, sIdx) => (
                        <tr key={sIdx} className="border-t border-gray-200">
                          <td className="p-1">
                            <input
                              className={fieldClass + " py-1"}
                              value={sz.size}
                              onChange={(e) =>
                                updateVariant(vIdx, (v) => {
                                  const sizes = [...v.sizes];
                                  sizes[sIdx] = { ...sizes[sIdx], size: e.target.value.toUpperCase() };
                                  return { ...v, sizes };
                                })
                              }
                              required
                            />
                          </td>
                          <td className="p-1">
                            <input
                              className={fieldClass + " py-1"}
                              value={sz.sku}
                              onChange={(e) =>
                                updateVariant(vIdx, (v) => {
                                  const sizes = [...v.sizes];
                                  sizes[sIdx] = { ...sizes[sIdx], sku: e.target.value };
                                  return { ...v, sizes };
                                })
                              }
                            />
                          </td>
                          <td className="p-1">
                            <input
                              className={fieldClass + " py-1"}
                              value={sz.barcode || ""}
                              onChange={(e) =>
                                updateVariant(vIdx, (v) => {
                                  const sizes = [...v.sizes];
                                  sizes[sIdx] = { ...sizes[sIdx], barcode: e.target.value };
                                  return { ...v, sizes };
                                })
                              }
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              className={fieldClass + " py-1"}
                              value={sz.plannedQty}
                              onChange={(e) =>
                                updateVariant(vIdx, (v) => {
                                  const sizes = [...v.sizes];
                                  sizes[sIdx] = { ...sizes[sIdx], plannedQty: Number(e.target.value) || 0 };
                                  return { ...v, sizes };
                                })
                              }
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              className={fieldClass + " py-1"}
                              value={sz.producedQty}
                              onChange={(e) =>
                                updateVariant(vIdx, (v) => {
                                  const sizes = [...v.sizes];
                                  sizes[sIdx] = { ...sizes[sIdx], producedQty: Number(e.target.value) || 0 };
                                  return { ...v, sizes };
                                })
                              }
                            />
                          </td>
                          <td className="p-1">
                            <button
                              type="button"
                              onClick={() => removeSize(vIdx, sIdx)}
                              className="rounded p-1 text-rose-600 hover:bg-rose-50"
                              aria-label="Remove size"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
};

export default DesignerInventoryForm;
