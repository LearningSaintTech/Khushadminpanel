/**
 * Builds multipart FormData for POST /items/create (same field layout as ItemForm.jsx handleSave, create path).
 * @param {object} form - Shape aligned with ItemForm `form` state
 * @param {string} categoryId
 * @param {string} subcategoryId
 * @param {{ isEdit?: boolean, id?: string }} options - Pass isEdit true + id only for update flows (variant file slot names).
 */
export function buildItemCreateFormData(form, categoryId, subcategoryId, options = {}) {
  const { isEdit = false, id = null } = options;
  const formData = new FormData();

  formData.append("name", form.name);
  formData.append("shortDescription", form.shortDescription);
  formData.append("longDescription", form.longDescription || "");
  formData.append("price", form.price);
  formData.append("discountedPrice", form.discountedPrice || "");
  formData.append("productId", form.productId || "");
  formData.append("skuCodeInputs", JSON.stringify(form.skuCodeInputs || {}));
  formData.append("categoryId", categoryId);
  formData.append("subcategoryId", subcategoryId);
  formData.append("defaultColor", form.defaultColor);
  formData.append("isActive", String(form.isActive !== false));

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
            return { order: idx + 1 };
          }
          if (typeof img === "string" && img.length > 0) {
            return { order: idx + 1, url: img };
          }
          if (img && typeof img === "object" && img.url) {
            return { order: idx + 1, url: img.url };
          }
          return { order: idx + 1 };
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

  return formData;
}

function orderedVariantImages(variant) {
  const raw = Array.isArray(variant?.images) ? variant.images : [];
  return [...raw].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));
}

function variantImageSrc(img) {
  if (!img) return "";
  if (typeof img === "string") return img.trim();
  if (typeof img?.url === "string") return img.url.trim();
  return "";
}

/**
 * Map a designer inventory document (API shape) into ItemForm-like state for catalog create.
 */
export function designerInventoryToItemFormState(designer) {
  const desc = (designer.description || "").trim();
  const styleLabel = (designer.styleName || designer.StyleNumber || "Product").trim();
  const shortDescription = (desc.slice(0, 70) || styleLabel.slice(0, 70)).slice(0, 70);
  let longDescription = desc.slice(0, 150);
  if (longDescription.length < 10) {
    longDescription = shortDescription.slice(0, 150);
  }

  const metaLines = [];
  if (designer.fabric?.name || designer.fabric?.gsm) {
    metaLines.push(
      `Fabric: ${[designer.fabric?.name, designer.fabric?.gsm ? `${designer.fabric.gsm} GSM` : ""].filter(Boolean).join(", ")}`
    );
  }
  if (designer.costs && typeof designer.costs.totalCost === "number") {
    metaLines.push(`Designer cost total: ${designer.costs.totalCost}`);
  }
  if (metaLines.length) {
    const extra = metaLines.join(". ").slice(0, 80);
    longDescription = `${longDescription} ${extra}`.trim().slice(0, 150);
  }

  const variants = (designer.variants || [])
    .filter((v) => v?.color?.name)
    .map((v) => {
      const imgs = orderedVariantImages(v)
        .map((im) => variantImageSrc(im))
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

  return {
    name: styleLabel.slice(0, 120),
    shortDescription,
    longDescription,
    price: "",
    discountedPrice: "",
    productId: "",
    skuCodeInputs: {
      styleNu: designer.StyleNumber || designer.skuCodeInputs?.styleNu || "",
      gender: designer.gender || designer.skuCodeInputs?.gender || "",
      productType: designer.productType || designer.skuCodeInputs?.productType || "",
      fitType: designer.fitType || designer.skuCodeInputs?.fitType || "",
    },
    defaultColor: (designer.defaultColor || designer.variants?.[0]?.color?.name || "Black").trim() || "Black",
    isActive: true,
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
      description: "",
      instructions: [],
    },
    sizeChart: {
      unit: "in",
      headers: [
        { key: "chest", label: "Chest" },
        { key: "length", label: "Length" },
      ],
      rows: [],
      measureImages: [],
    },
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
  };
}
