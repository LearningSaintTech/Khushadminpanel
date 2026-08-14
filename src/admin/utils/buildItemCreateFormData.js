import { normalizeIdList } from "./catalogCategoryDisplay.js";
import { designerItemToFormSizeCharts } from "../../utils/designerSizeChartDisplay.js";
import {
  inferVariantMediaType,
  normalizeVariantMediaSlot,
} from "../../utils/variantMedia.js";
import { getCdnBaseUrl } from "../../utils/apiConfig.js";

/**
 * Builds multipart FormData for POST /items/create (same field layout as ItemForm.jsx handleSave, create path).
 * @param {object} form - Shape aligned with ItemForm `form` state
 * @param {string} categoryId
 * @param {string} subcategoryId
 * @param {{ isEdit?: boolean, id?: string }} options - Pass isEdit true + id only for update flows (variant file slot names).
 */
function metaTagsStrFromApi(tags) {
  if (!Array.isArray(tags)) return "";
  return tags.map((t) => String(t ?? "").trim()).filter(Boolean).join(", ");
}

function metaTagsToJsonPayload(str) {
  const arr = String(str || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
}

/** Date input value (yyyy-mm-dd) from API Date / ISO string. */
export function launchDateToInputValue(val) {
  if (!val) return "";
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO date for item create/update, or empty string to clear. */
export function launchDateToApiValue(val) {
  const s = String(val || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function buildItemCreateFormData(form, categoryId, subcategoryId, options = {}) {
  const { isEdit = false, id = null } = options;
  console.log("[buildItemCreateFormData] start", {
    isEdit,
    categoryId,
    subcategoryId,
    name: form?.name,
    productId: form?.productId,
    variantCount: form?.variants?.length ?? 0,
  });
  const formData = new FormData();

  formData.append("name", form.name);
  formData.append("shortDescription", form.shortDescription);
  formData.append("longDescription", form.longDescription || "");
  formData.append("metaTitle", String(form.metaTitle ?? "").trim());
  formData.append("metaDescription", String(form.metaDescription ?? "").trim());
  formData.append("metaTags", metaTagsToJsonPayload(form.metaTagsStr));
  formData.append("price", form.price);
  formData.append("discountedPrice", form.discountedPrice || "");
  formData.append("productId", form.productId || "");
  formData.append("skuCodeInputs", JSON.stringify(form.skuCodeInputs || {}));
  formData.append("categoryId", categoryId);
  formData.append("subcategoryId", subcategoryId);
  const secondaryCategoryId = normalizeIdList(
    options.secondaryCategoryId ?? form.secondaryCategoryId,
  ).filter((id) => id !== String(categoryId || ""));
  const secondarySubcategoryId = normalizeIdList(
    options.secondarySubcategoryId ?? form.secondarySubcategoryId,
  ).filter((id) => id !== String(subcategoryId || ""));
  formData.append("secondaryCategoryId", JSON.stringify(secondaryCategoryId));
  formData.append("secondarySubcategoryId", JSON.stringify(secondarySubcategoryId));
  formData.append("defaultColor", form.defaultColor);
  formData.append("isActive", String(form.isActive !== false));
  formData.append("isComingSoon", String(Boolean(form.isComingSoon)));
  formData.append("launchDate", launchDateToApiValue(form.launchDate));

  const variantsData = (form.variants || [])
    .filter((variant) => variant && variant.color && variant.color.name && variant.color.name.trim())
    .map((variant) => {
      const colorName = variant.color.name.trim();
      const colorHex = variant.color && variant.color.hex ? variant.color.hex : "#000000";
      const variantImages = Array.isArray(variant.images) ? variant.images : [];
      const variantSizes = Array.isArray(variant.sizes) ? variant.sizes : [];

      return {
        color: {
          name: colorName,
          hex: colorHex,
          isMultipleImages: variantImages.length > 1,
          totalImages: variantImages.length,
        },
        skuCodeInputs: {
          colour: variant?.skuCodeInputs?.colour || variant?.skuCodeInputs?.color || "",
        },
        images: variantImages.map((img, idx) => {
          if (img instanceof File) {
            return { order: idx + 1, type: inferVariantMediaType(img), thumbnail: "" };
          }
          if (typeof img === "string" && img.length > 0) {
            return {
              order: idx + 1,
              url: img,
              type: inferVariantMediaType(img),
              thumbnail: "",
            };
          }
          if (img && typeof img === "object" && (img.url || img.imageKey || img.key)) {
            return {
              order: idx + 1,
              url: String(img.url || "").trim(),
              imageKey: img.imageKey || img.key || "",
              type: img.type || inferVariantMediaType(img),
              thumbnail: img.thumbnail != null ? String(img.thumbnail) : "",
            };
          }
          return { order: idx + 1, type: "image", thumbnail: "" };
        }),
        sizes: variantSizes
          .filter((s) => s && s.size && s.stock !== "" && s.stock !== null && s.stock !== undefined)
          .map((s) => {
            const row = {
              sku: (s.sku && s.sku.trim()) || "",
              size: s.size.trim(),
              stock: Number(s.stock) || 0,
            };
            const start = s.skuUidSeriesStart;
            if (
              start !== "" &&
              start != null &&
              String(start).trim() !== "" &&
              !Number.isNaN(Number(start))
            ) {
              const n = Number(start);
              if (Number.isInteger(n) && n >= 0) row.skuUidSeriesStart = n;
            }
            return row;
          }),
      };
    });

  if (!Array.isArray(variantsData) || variantsData.length === 0) {
    throw new Error("At least one variant with a color name is required");
  }

  const skuIdGenerationInputs = variantsData.flatMap((variant, variantIndex) => {
    const color =
      variant?.skuCodeInputs?.colour ||
      variant?.skuCodeInputs?.color ||
      variant?.color?.name ||
      "";

    return (Array.isArray(variant.sizes) ? variant.sizes : []).map((s, sizeIndex) => ({
      variantIndex,
      sizeIndex,
      styleNu: form?.skuCodeInputs?.styleNu || "",
      gender: form?.skuCodeInputs?.gender || "",
      productType: form?.skuCodeInputs?.productType || "",
      fitType: form?.skuCodeInputs?.fitType || "",
      color,
      size: s?.size || "",
      uidStartSeries: s?.skuUidSeriesStart,
    }));
  });

  formData.append("skuIdGenerationInputs", JSON.stringify(skuIdGenerationInputs));
  formData.append("variants", JSON.stringify(variantsData));

  (form.variants || []).forEach((variant, variantIndex) => {
    const colorName = variant.color?.name?.trim();
    if (!colorName) return;

    (variant.images || []).forEach((img, index) => {
      if (!(img instanceof File)) return;

      if (isEdit && id) {
        formData.append(`variants[${colorName}][${index}]`, img);
      } else {
        formData.append(`variants[${colorName}]`, img);
        formData.append(`variants[${variantIndex}]`, img);
        formData.append(`variantImages[${colorName}]`, img);
        formData.append(`variantImages[${variantIndex}]`, img);
      }
    });
  });

  const careInstructions = (form.care?.instructions || []).map((inst, idx) => ({
    iconUrl: inst.iconUrl || "",
    iconKey: inst.iconKey || "",
    text: inst.text,
  }));
  const careData = {
    description: form.care?.description || "",
    instructions: careInstructions,
  };
  formData.append("care", JSON.stringify(careData));

  (form.care?.instructions || []).forEach((inst, idx) => {
    if (inst.iconFile) {
      formData.append(`careInstructionIcons[${idx}]`, inst.iconFile);
    }
  });

  const cleanChartSide = (chart) => {
    if (!chart) {
      return { headers: [], rows: [], measureImage: [] };
    }
    const cleanedHeaders = (chart.headers || []).filter((h) => h && h.key && h.key.trim());
    const cleanedRows = (chart.rows || [])
      .filter((row) => {
        if (!row || !row.size || !row.size.toString().trim()) return false;
        const measurements = row.measurements || {};
        return Object.values(measurements).some(
          (val) => val !== "" && val !== null && val !== undefined
        );
      })
      .map((row) => ({
        size: row.size,
        measurements: row.measurements || {},
      }));
    const imgs = chart.measureImages || [];
    const measureImage = imgs.map((img, idx) => {
      if (img instanceof File) {
        return { imageKey: `slot-${idx}` };
      }
      if (typeof img === "string" && img.trim()) {
        return { url: img.trim(), imageKey: `existing-${idx}` };
      }
      if (img && typeof img === "object") {
        const url = typeof img.url === "string" ? img.url.trim() : "";
        const imageKey = typeof img.imageKey === "string" ? img.imageKey.trim() : "";
        if (url || imageKey) {
          return {
            ...(url ? { url } : {}),
            imageKey: imageKey || `existing-${idx}`,
          };
        }
      }
      return { imageKey: `slot-${idx}` };
    });
    return { headers: cleanedHeaders, rows: cleanedRows, measureImage };
  };

  const sc = form.sizeCharts;
  const hasDual =
    sc &&
    typeof sc === "object" &&
    ((sc.in?.headers?.length ||
      sc.in?.rows?.length ||
      (sc.in?.measureImages || []).length > 0) ||
      (sc.cm?.headers?.length ||
        sc.cm?.rows?.length ||
        (sc.cm?.measureImages || []).length > 0));

  if (hasDual) {
    const inPayload = cleanChartSide(sc.in);
    const cmPayload = cleanChartSide(sc.cm);
    formData.append(
      "sizeCharts",
      JSON.stringify({
        in: {
          headers: inPayload.headers,
          rows: inPayload.rows,
          measureImage: inPayload.measureImage,
        },
        cm: {
          headers: cmPayload.headers,
          rows: cmPayload.rows,
          measureImage: cmPayload.measureImage,
        },
      })
    );
    (sc.in?.measureImages || []).forEach((file) => {
      if (file instanceof File) formData.append("measureImagesIn", file);
    });
    (sc.cm?.measureImages || []).forEach((file) => {
      if (file instanceof File) formData.append("measureImagesCm", file);
    });
  } else {
    const cleanedHeaders = (form.sizeChart?.headers || []).filter((h) => h && h.key && h.key.trim());
    const cleanedRows = (form.sizeChart?.rows || [])
      .filter((row) => {
        if (!row || !row.size || !row.size.toString().trim()) return false;
        const measurements = row.measurements || {};
        return Object.values(measurements).some(
          (val) => val !== "" && val !== null && val !== undefined
        );
      })
      .map((row) => ({
        size: row.size,
        measurements: row.measurements || {},
      }));
    const sizeChartData = {
      unit: form.sizeChart?.unit || "in",
      headers: cleanedHeaders,
      rows: cleanedRows,
      measureImage: (form.sizeChart?.measureImages || []).map((_, idx) => ({
        imageKey: `measureImages/${idx}`,
      })),
    };
    formData.append("sizeChart", JSON.stringify(sizeChartData));
    (form.sizeChart?.measureImages || []).forEach((file) => {
      if (file instanceof File) {
        formData.append("measureImages", file);
      }
    });
  }

  const shippingData = {
    iconUrl: form.shipping?.iconUrl || "",
    iconKey: form.shipping?.iconKey || "",
    title: form.shipping?.title || "",
    estimatedDelivery: form.shipping?.estimatedDelivery || "",
    shippingCharges: form.shipping?.shippingCharges ? Number(form.shipping.shippingCharges) : undefined,
  };
  formData.append("shipping", JSON.stringify(shippingData));
  if (form.shipping?.iconFile) {
    formData.append("shippingIcon", form.shipping.iconFile);
  }

  const codData = {
    iconUrl: form.codPolicy?.iconUrl || "",
    iconKey: form.codPolicy?.iconKey || "",
    text: form.codPolicy?.text || "",
  };
  formData.append("codPolicy", JSON.stringify(codData));
  if (form.codPolicy?.iconFile) {
    formData.append("codIcon", form.codPolicy.iconFile);
  }

  const returnData = {
    iconUrl: form.returnPolicy?.iconUrl || "",
    iconKey: form.returnPolicy?.iconKey || "",
    text: form.returnPolicy?.text || "",
  };
  formData.append("returnPolicy", JSON.stringify(returnData));
  if (form.returnPolicy?.iconFile) {
    formData.append("returnPolicyIcon", form.returnPolicy.iconFile);
  }

  const exchangeData = {
    iconUrl: form.exchangePolicy?.iconUrl || "",
    iconKey: form.exchangePolicy?.iconKey || "",
    text: form.exchangePolicy?.text || "",
  };
  formData.append("exchangePolicy", JSON.stringify(exchangeData));
  if (form.exchangePolicy?.iconFile) {
    formData.append("exchangePolicyIcon", form.exchangePolicy.iconFile);
  }

  const cancellationData = {
    iconUrl: form.cancellationPolicy?.iconUrl || "",
    iconKey: form.cancellationPolicy?.iconKey || "",
    text: form.cancellationPolicy?.text || "",
  };
  formData.append("cancellationPolicy", JSON.stringify(cancellationData));
  if (form.cancellationPolicy?.iconFile) {
    formData.append("cancellationPolicyIcon", form.cancellationPolicy.iconFile);
  }

  formData.append("filters", JSON.stringify(form.filters || []));

  console.log("[buildItemCreateFormData] done", {
    variantJsonCount: variantsData.length,
    skuIdGenerationCount: skuIdGenerationInputs.length,
  });
  return formData;
}

function orderedVariantImages(variant) {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
}

/**
 * Map a designer inventory document (API shape) into ItemForm-like state for catalog create.
 */
export function designerInventoryToItemFormState(designer) {
  console.log("[designerInventoryToItemFormState] map designer → catalog form", {
    id: designer?._id,
    StyleNumber: designer?.StyleNumber,
    status: designer?.status,
    categoryId: designer?.categoryId,
    subcategoryId: designer?.subcategoryId,
    variantCount: designer?.variants?.length ?? 0,
  });
  const desc = (designer.description || "").trim();
  const styleLabel = (designer.styleName || designer.StyleNumber || "Product").trim();
  const shortDescription = String(
    designer.shortDescription || desc || styleLabel || ""
  ).trim();
  const longDescription = String(
    designer.longDescription || desc || shortDescription || styleLabel || ""
  ).trim();

  const variants = (designer.variants || [])
    .filter((v) => v?.color?.name)
    .map((v) => {
      const imgs = orderedVariantImages(v)
        .map((im) => normalizeVariantMediaSlot(im, { cdnBase: getCdnBaseUrl() }))
        .filter(Boolean);
      const sizes = (v.sizes || [])
        .filter((s) => s && s.size)
        .map((s) => {
          const stock = s.producedQty ?? s.plannedQty ?? s.stock ?? 0;
          return {
            sku: (s.sku && String(s.sku).trim()) || "",
            size: String(s.size || "").trim().toUpperCase(),
            stock: stock === "" || stock == null ? 0 : Number(stock) || 0,
            skuUidSeriesStart:
              s.skuUidSeriesStart != null && s.skuUidSeriesStart !== ""
                ? String(s.skuUidSeriesStart)
                : "",
          };
        })
        .filter((s) => s.size);

      return {
        color: {
          name: v.color.name.trim(),
          hex: v.color.hex || "#000000",
        },
        skuCodeInputs: {
          colour: v.skuCodeInputs?.colour || v.skuCodeInputs?.color || "",
        },
        images: imgs,
        sizes,
      };
    })
    .filter((v) => v.sizes.length > 0);

  const careInstructions = Array.isArray(designer?.care?.instructions)
    ? designer.care.instructions.map((inst) => ({
        iconUrl: inst?.iconUrl || "",
        iconKey: inst?.iconKey || "",
        text: inst?.text || "",
        iconFile: null,
      }))
    : [];

  const mrp = designer.mrp;
  const disc = designer.discountPrice;
  return {
    name: styleLabel,
    shortDescription,
    longDescription,
    metaTitle: String(designer.metaTitle ?? "").trim(),
    metaDescription: String(designer.metaDescription ?? "").trim(),
    metaTagsStr: metaTagsStrFromApi(designer.metaTags),
    price: mrp !== undefined && mrp !== null && mrp !== "" ? String(mrp) : "",
    discountedPrice:
      disc !== undefined && disc !== null && disc !== "" ? String(disc) : "",
    productId: String(
      designer.StyleNumber || designer.skuCodeInputs?.styleNu || ""
    ).trim(),
    skuCodeInputs: {
      styleNu: designer.StyleNumber || designer.skuCodeInputs?.styleNu || "",
      gender: designer.gender || designer.skuCodeInputs?.gender || "",
      productType:
        designer.productTypeCode ||
        designer.skuCodeInputs?.productTypeCode ||
        designer.skuCodeInputs?.productType ||
        designer.productType ||
        "",
      fitType: designer.fitType || designer.skuCodeInputs?.fitType || "",
    },
    defaultColor: (designer.defaultColor || designer.variants?.[0]?.color?.name || "Black").trim() || "Black",
    isActive: true,
    isComingSoon: Boolean(designer.isComingSoon),
    launchDate: launchDateToInputValue(designer.launchDate),
    variants: variants.length
      ? variants
      : [
          {
            color: { name: "Default", hex: "#000000" },
            skuCodeInputs: { colour: "" },
            images: [],
            sizes: [{ sku: "", size: "M", stock: 0, skuUidSeriesStart: "" }],
          },
        ],
    filters: [],
    care: {
      description: designer?.care?.description || "",
      instructions: careInstructions,
    },
    sizeCharts: designerItemToFormSizeCharts(designer),
    shipping: {
      iconUrl: "",
      iconKey: "",
      title: "",
      estimatedDelivery: "",
      shippingCharges: "",
      iconFile: null,
    },
    codPolicy: { iconUrl: "", iconKey: "", text: "", iconFile: null },
    returnPolicy: { iconUrl: "", iconKey: "", text: "", iconFile: null },
    exchangePolicy: { iconUrl: "", iconKey: "", text: "", iconFile: null },
    cancellationPolicy: { iconUrl: "", iconKey: "", text: "", iconFile: null },
    secondaryCategoryId: normalizeIdList(designer.secondaryCategoryId),
    secondarySubcategoryId: normalizeIdList(designer.secondarySubcategoryId),
  };
}
