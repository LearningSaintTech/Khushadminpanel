 // ItemForm.jsx - Complete form component for Create/Edit Item
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import {
  createItem,
  updateItem,
  getSingleItem,
} from "../../apis/itemapi";
import { getAllInventoryCodes } from "../../apis/inventoryCodeApi";
import {
  normalizeInventoryCodeOptionsResponse,
  SearchableInventoryCodeSelect,
} from "../../../components/inventory/SearchableInventoryCodeSelect.jsx";
import SkuUidsModal from "./SkuUidsModal.jsx";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import { designerItemToFormSizeCharts } from "../../../utils/designerSizeChartDisplay.js";
import {
  SIZE_CHART_PRESETS,
  garmentPresetCategoryLabel,
  inchesToCmText,
  mergeSizeChartsWithPreset,
  presetGenderKeyFromSkuGender,
} from "../../../utils/sizeChartPresets.js";
import { compressImageFilesForUpload } from "../../../utils/compressImageForUpload.js";

/** Friendly toast listing every backend validation / error message */
function showItemSaveErrorToasts(messages, isCreate) {
  const headline = isCreate
    ? "We couldn't create this product"
    : "We couldn't update this product";

  const normalized = (messages || []).map((m) => String(m || "").trim()).filter(Boolean);
  const isTimeout = normalized.some((m) => /timeout.*exceeded/i.test(m));

  if (!normalized.length) {
    toast.error(`${headline}. Please try again.`, { duration: 5000 });
    return;
  }

  if (isTimeout) {
    normalized.splice(
      0,
      normalized.length,
      "The upload is taking longer than usual. Large images can be slow — wait a bit and try again, or use smaller image files (under 2 MB each).",
    );
  }

  toast.custom(
    (t) => (
      <div className="max-w-[420px] rounded-xl border border-red-200 bg-white shadow-lg p-4 text-left">
        <div className="flex justify-between items-start gap-2">
          <p className="font-semibold text-red-900 text-sm">{headline}</p>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-stone-500 hover:text-gray-800 text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-red-700 mt-1 mb-2">
          Please fix the following and try again:
        </p>
        <ul className="text-sm text-red-800 space-y-1.5 list-disc pl-4 max-h-52 overflow-y-auto">
          {normalized.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    ),
    { duration: 12000, id: "item-form-save-errors" }
  );
}

/** Normalize variant image from API → string URL or { url, key } so updates keep existing assets */
function normalizeVariantImageFromApi(img) {
  if (img == null) return null;
  if (typeof img === "string") {
    const t = img.trim();
    return t || null;
  }
  if (typeof img === "object") {
    const url =
      img.url ||
      img.secure_url ||
      img.imageUrl ||
      img.href ||
      (typeof img.src === "string" ? img.src : "") ||
      "";
    const key = img.key || img.public_id || img.asset_id || "";
    if (url && key) return { url, key };
    if (url) return url;
    if (key) return { url: "", key };
  }
  return null;
}

function getVariantImageDisplaySrc(img) {
  if (img instanceof File) return null; // caller uses createObjectURL
  if (typeof img === "string") return img;
  if (img && typeof img === "object") {
    return (
      img.url ||
      img.secure_url ||
      img.imageUrl ||
      img.href ||
      ""
    );
  }
  return "";
}

function variantImageToPayloadEntry(img, idx) {
  const base = { order: idx + 1, slotIndex: idx };
  if (img instanceof File) {
    return { ...base, isNewUpload: true };
  }
  if (typeof img === "string" && img.trim()) {
    return { ...base, url: img.trim() };
  }
  if (img && typeof img === "object") {
    const url =
      img.url || img.secure_url || img.imageUrl || img.href || "";
    const key = img.key || img.public_id || img.asset_id;
    return {
      ...base,
      ...(url ? { url } : {}),
      ...(key ? { key } : {}),
    };
  }
  return base;
}

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

/** Closed-picker label: `Name (CODE)` when value matches an option, else raw value. */
function inventoryCodeButtonDisplay(options, value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const opt = options.find((o) => o.value === v || o.label === v);
  return opt ? `${opt.label} (${opt.value})` : v;
}

const DEFAULT_SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
const createDefaultSizes = () =>
  DEFAULT_SIZE_ORDER.map((size) => ({
    sku: "",
    size,
    stock: "",
    skuUidSeriesStart: "",
  }));

const ItemForm = () => {
  const { categoryId, subcategoryId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState(1);
  const [sizeChartCategory, setSizeChartCategory] = useState("upper");
  const [skuUidModalOpen, setSkuUidModalOpen] = useState(false);
  /** { src, revoke? } for variant image lightbox */
  const [zoomVariantImage, setZoomVariantImage] = useState(null);
  const fileInputRefs = useRef({}); // Track file inputs to prevent double-firing

  const [productTypeOptions, setProductTypeOptions] = useState([]);
  const [fitTypeOptions, setFitTypeOptions] = useState([]);
  const [colorCodeOptions, setColorCodeOptions] = useState([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeLoadError, setCodeLoadError] = useState("");

  const closeVariantZoom = () => {
    if (zoomVariantImage?.revoke) zoomVariantImage.revoke();
    setZoomVariantImage(null);
  };

  const openVariantImageZoom = (img) => {
    setZoomVariantImage((prev) => {
      if (prev?.revoke) prev.revoke();
      if (img instanceof File) {
        const src = URL.createObjectURL(img);
        return { src, revoke: () => URL.revokeObjectURL(src) };
      }
      if (typeof img === "string" && img) return { src: img };
      if (img && typeof img === "object") {
        const src =
          img.url || img.secure_url || img.imageUrl || img.href || "";
        if (src) return { src };
      }
      return null;
    });
  };
  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    metaTitle: "",
    metaDescription: "",
    metaTagsStr: "",
    price: "",
    discountedPrice: "",
    productId: "",
    skuCodeInputs: {
      styleNu: "",
      gender: "",
      productType: "",
      fitType: "",
    },
    defaultColor: "Black",
    isActive: true,

    variants: [
      {
        color: { name: "Black", hex: "#000000" },
        skuCodeInputs: { colour: "" },
        images: [],
        sizes: createDefaultSizes(),
      },
    ],

    categoryId: categoryId || "",
    subcategoryId: subcategoryId || "",

    filters: [],

    care: {
      description: "",
      instructions: [],
    },

    sizeCharts: designerItemToFormSizeCharts({}),

    shipping: {
      iconUrl: "",
      iconKey: "",
      title: "",
      estimatedDelivery: "",
      shippingCharges: "",
      iconFile: null,
    },

    codPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    returnPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    exchangePolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    cancellationPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },
  });

  const validateBasicTab = () => {
    const errors = {};

    if (!form.name?.trim()) {
      errors.name = "Product name is required.";
    }

    if (form.price === "" || form.price === null || Number(form.price) <= 0) {
      errors.price = "MRP must be greater than 0.";
    }

    if (
      form.discountedPrice !== "" &&
      form.discountedPrice !== null &&
      Number(form.discountedPrice) > Number(form.price || 0)
    ) {
      errors.discountedPrice = "Discounted price cannot be greater than actual price.";
    }

    // Required fields for SKU generation.
    // `gender` is optional because `styleNu` may already contain the full style+gender code.
    if (!form.skuCodeInputs?.styleNu?.trim()) {
      errors.styleNu = "Style nu is required.";
    }
    if (!form.skuCodeInputs?.productType?.trim()) {
      errors.productType = "Product type is required.";
    }
    if (!form.skuCodeInputs?.fitType?.trim()) {
      errors.fitType = "Fit type is required.";
    }

    return errors;
  };

  const isBasicTabValid = () => {
    const errors = validateBasicTab();
    return Object.keys(errors).length === 0;
  };

  const validateVariantsTab = () => {
    // At least one variant with a valid color name
    return form.variants.some(
      (variant) => variant?.color?.name && variant.color.name.trim()
    );
  };

  const validateSizesTab = () => {
    // At least one size across all variants with stock filled
    return form.variants.some((variant) =>
      Array.isArray(variant.sizes)
        ? variant.sizes.some((s) => s && s.size && s.stock !== "" && s.stock !== null)
        : false
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCodeLoading(true);
      setCodeLoadError("");
      try {
        const [categoryRes, fitRes, colorRes] = await Promise.all([
          getAllInventoryCodes({ type: "CATEGORY", limit: 200, isActive: true }),
          getAllInventoryCodes({ type: "FIT", limit: 200, isActive: true }),
          getAllInventoryCodes({ type: "COLOR", limit: 200, isActive: true }),
        ]);
        if (cancelled) return;
        setProductTypeOptions(normalizeInventoryCodeOptionsResponse(categoryRes));
        setFitTypeOptions(normalizeInventoryCodeOptionsResponse(fitRes));
        setColorCodeOptions(normalizeInventoryCodeOptionsResponse(colorRes));
      } catch (e) {
        if (!cancelled) {
          setCodeLoadError(
            extractBackendMessages(e).join("; ") || "Failed to load inventory codes.",
          );
        }
      } finally {
        if (!cancelled) setCodeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Map legacy rows where `productType` / `fitType` stored a display name instead of code. */
  useEffect(() => {
    if (codeLoading) return;
    if (productTypeOptions.length === 0 && fitTypeOptions.length === 0) return;
    setForm((prev) => {
      const nextSku = { ...(prev.skuCodeInputs || {}) };
      let changed = false;

      const syncField = (field, options) => {
        const raw = String(nextSku[field] || "").trim();
        if (!raw || !options.length) return;
        const byValue = options.find((o) => o.value === raw);
        if (byValue) return;
        const byLabel = options.find((o) => o.label === raw);
        if (byLabel && byLabel.value !== raw) {
          nextSku[field] = byLabel.value;
          changed = true;
        }
      };

      syncField("productType", productTypeOptions);
      syncField("fitType", fitTypeOptions);

      return changed ? { ...prev, skuCodeInputs: nextSku } : prev;
    });
  }, [codeLoading, productTypeOptions, fitTypeOptions, loading]);

  // Load item data if editing
  useEffect(() => {
  if (isEdit && id) {
    console.log("[useEffect] isEdit=true, id:", id);
    
    const loadItem = async () => {
      try {
        console.log("[loadItem] Start loading item");
        setLoading(true);

        console.log("[loadItem] Calling getSingleItem API with id:", id);
        const res = await getSingleItem(id);

        console.log("[loadItem] API response received:", res);

        // Handle response structure
        const itemData = res?.data?.data || res?.data?.item || res?.data || {};
        console.log("[loadItem] Parsed itemData:", itemData);

        if (itemData) {
          console.log("[loadItem] Setting form state with item data");
          setForm({
            name: itemData.name || "",
            shortDescription: itemData.shortDescription || "",
            longDescription: itemData.longDescription || "",
            metaTitle: itemData.metaTitle || "",
            metaDescription: itemData.metaDescription || "",
            metaTagsStr: metaTagsStrFromApi(itemData.metaTags),
            price: itemData.price || "",
            discountedPrice: itemData.discountedPrice || "",
            productId: itemData.productId || "",
            skuCodeInputs: {
              styleNu:
                itemData?.skuCodeInputs?.styleNu ||
                itemData?.skuCodeInputs?.styleGender ||
                "",
              gender: itemData?.skuCodeInputs?.gender || "",
              productType: itemData?.skuCodeInputs?.productType || "",
              fitType: itemData?.skuCodeInputs?.fitType || "",
            },
            defaultColor: itemData.defaultColor || "Black",
            isActive: itemData.isActive ?? true,

            variants: itemData.variants?.map((variant, vIdx) => {
              console.log(`[loadItem] Processing variant #${vIdx + 1}:`, variant.color?.name);

              const sizeMap = {};
              const defaultSizes = DEFAULT_SIZE_ORDER;
              if (variant.sizes) {
                variant.sizes.forEach((size) => {
                  sizeMap[size.size] = {
                    sku: size.sku || "",
                    size: size.size || "",
                    stock: size.stock || "",
                    skuUidSeriesStart:
                      size.skuUidSeriesStart != null && size.skuUidSeriesStart !== ""
                        ? String(size.skuUidSeriesStart)
                        : "",
                  };
                });
              }

              return {
                color: {
                  name: variant.color?.name || "",
                  hex: variant.color?.hex || "#000000",
                },
                skuCodeInputs: {
                  colour:
                    variant?.skuCodeInputs?.colour ||
                    variant?.skuCodeInputs?.color ||
                    "",
                },
                images:
                  (variant.images || [])
                    .map((img) => normalizeVariantImageFromApi(img))
                    .filter(Boolean) || [],
                sizes: defaultSizes.map(
                  (size) =>
                    sizeMap[size] || { sku: "", size, stock: "", skuUidSeriesStart: "" }
                ),
              };
            }) || [
              {
                color: { name: "Black", hex: "#000000" },
                skuCodeInputs: { colour: "" },
                images: [],
                sizes: createDefaultSizes(),
              },
            ],

            categoryId: itemData.categoryId || categoryId || "",
            subcategoryId: itemData.subcategoryId || subcategoryId || "",

            filters: itemData.filters?.map((f) => ({
              key: f.key || "",
              value: f.value || "",
            })) || [],

            care: {
              description: itemData.care?.description || "",
              instructions: itemData.care?.instructions?.map((inst, iIdx) => {
                console.log(`[loadItem] Processing care instruction #${iIdx + 1}`, inst.text);
                return {
                  iconUrl: inst.iconUrl || "",
                  iconKey: inst.iconKey || "",
                  text: inst.text || "",
                  iconFile: null,
                };
              }) || [],
            },

            sizeCharts: designerItemToFormSizeCharts(itemData),

            shipping: {
              iconUrl: itemData.shipping?.iconUrl || "",
              iconKey: itemData.shipping?.iconKey || "",
              title: itemData.shipping?.title || "",
              estimatedDelivery: itemData.shipping?.estimatedDelivery || "",
              shippingCharges: itemData.shipping?.shippingCharges || "",
              iconFile: null,
            },

            codPolicy: {
              iconUrl: itemData.codPolicy?.iconUrl || "",
              iconKey: itemData.codPolicy?.iconKey || "",
              text: itemData.codPolicy?.text || "",
              iconFile: null,
            },

            returnPolicy: {
              iconUrl: itemData.returnPolicy?.iconUrl || "",
              iconKey: itemData.returnPolicy?.iconKey || "",
              text: itemData.returnPolicy?.text || "",
              iconFile: null,
            },

            exchangePolicy: {
              iconUrl: itemData.exchangePolicy?.iconUrl || "",
              iconKey: itemData.exchangePolicy?.iconKey || "",
              text: itemData.exchangePolicy?.text || "",
              iconFile: null,
            },

            cancellationPolicy: {
              iconUrl: itemData.cancellationPolicy?.iconUrl || "",
              iconKey: itemData.cancellationPolicy?.iconKey || "",
              text: itemData.cancellationPolicy?.text || "",
              iconFile: null,
            },
          });

          console.log("[loadItem] Form state set successfully");
        }
      } catch (err) {
        console.error("[loadItem] Error loading item:", err);
        setBackendErrors(extractBackendMessages(err));
      } finally {
        console.log("[loadItem] Loading finished");
        setLoading(false);
      }
    };

    loadItem();
  }
}, [id, isEdit, categoryId, subcategoryId]);

  // Variant actions
  const addVariant = () => {
    console.log("[ItemForm] addVariant: current variants count:", form.variants.length);
    setForm((prev) => {
      const next = {
        ...prev,
        variants: [
          ...prev.variants,
          {
            color: { name: "", hex: "#000000" },
            skuCodeInputs: { colour: "" },
            images: [],
            sizes: createDefaultSizes(),
          },
        ],
      };
      console.log("[ItemForm] addVariant: new variants state:", next.variants);
      return next;
    });
  };

  const updateVariantColor = (index, field, value) => {
    console.log("[ItemForm] updateVariantColor:", { index, field, value });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index].color = { ...newVariants[index].color, [field]: value };
      console.log("[ItemForm] updateVariantColor: updated variant color:", newVariants[index].color);
      return { ...prev, variants: newVariants };
    });
  };

  const formHasPendingUploadFiles = useMemo(() => {
    const variantFiles = (form.variants || []).some((variant) =>
      (variant.images || []).some((img) => img instanceof File),
    );
    const measureFiles = ["in", "cm"].some((unit) =>
      (form.sizeCharts?.[unit]?.measureImages || []).some((img) => img instanceof File),
    );
    const policyFiles = [
      form.care?.instructions,
      form.shipping,
      form.codPolicy,
      form.returnPolicy,
      form.exchangePolicy,
      form.cancellationPolicy,
    ].some((block) => {
      if (Array.isArray(block)) {
        return block.some((row) => row?.iconFile instanceof File);
      }
      return block?.iconFile instanceof File;
    });
    return variantFiles || measureFiles || policyFiles;
  }, [form]);

  const addImageToVariant = (variantIndex, files) => {
    if (!files?.length) return;
    console.log("[ItemForm] addImageToVariant: variantIndex, files:", variantIndex, files);

    // IMPORTANT: clone FileList immediately so it doesn't get cleared
    const fileArray = Array.from(files);
    
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const existingImages = newVariants[variantIndex].images || [];

      // Create a Set to track existing file identifiers (name + size)
      const existingFileIds = new Set(
        existingImages
          .filter(img => img instanceof File)
          .map(img => `${img.name}-${img.size}`)
      );

      // Filter out duplicates by checking name and size
      const newFiles = fileArray.filter(file => {
        const fileId = `${file.name}-${file.size}`;
        if (existingFileIds.has(fileId)) {
          return false; // Skip duplicate
        }
        existingFileIds.add(fileId); // Track this file
        return true;
      });

      // Only add non-duplicate files
      if (newFiles.length > 0) {
        newVariants[variantIndex].images = [...existingImages, ...newFiles];
      }
      console.log("[ItemForm] addImageToVariant: new images length:", newVariants[variantIndex].images.length);
      return { ...prev, variants: newVariants };
    });
  };

  const removeImageFromVariant = (variantIndex, imageIndex) => {
    console.log("[ItemForm] removeImageFromVariant:", { variantIndex, imageIndex });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const currentImages = newVariants[variantIndex].images || [];
      const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        images: updatedImages,
      };
      console.log(
        "[ItemForm] removeImageFromVariant: remaining images:",
        updatedImages.length
      );
      return { ...prev, variants: newVariants };
    });
  };

  const updateSize = (variantIndex, sizeIndex, field, value) => {
    console.log("[ItemForm] updateSize:", { variantIndex, sizeIndex, field, value });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const sizeObj = newVariants[variantIndex].sizes[sizeIndex];
      newVariants[variantIndex].sizes[sizeIndex] = { ...sizeObj, [field]: value };
      console.log(
        "[ItemForm] updateSize: updated size:",
        newVariants[variantIndex].sizes[sizeIndex]
      );
      return { ...prev, variants: newVariants };
    });
  };

  // Filters actions
  const addFilter = () => {
    console.log("[ItemForm] addFilter: current filters:", form.filters);
    setForm((prev) => ({
      ...prev,
      filters: [...prev.filters, { key: "", value: "" }],
    }));
  };

  const updateFilter = (index, field, value) => {
    console.log("[ItemForm] updateFilter:", { index, field, value });
    setForm((prev) => {
      const newFilters = [...prev.filters];
      newFilters[index] = { ...newFilters[index], [field]: value };
      console.log("[ItemForm] updateFilter: new filters:", newFilters);
      return { ...prev, filters: newFilters };
    });
  };

  const removeFilter = (index) => {
    console.log("[ItemForm] removeFilter index:", index);
    setForm((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  // Care instructions handlers
  const addCareInstruction = () => {
    console.log("[ItemForm] addCareInstruction: current count:", form.care.instructions.length);
    setForm((prev) => ({
      ...prev,
      care: {
        ...prev.care,
        instructions: [
          ...prev.care.instructions,
          { iconUrl: "", iconKey: "", text: "", iconFile: null },
        ],
      },
    }));
  };

  const updateCareInstruction = (index, field, value) => {
    console.log("[ItemForm] updateCareInstruction:", { index, field, value });
    setForm((prev) => {
      const newInstructions = [...prev.care.instructions];
      newInstructions[index] = { ...newInstructions[index], [field]: value };
      return {
        ...prev,
        care: { ...prev.care, instructions: newInstructions },
      };
    });
  };

  const removeCareInstruction = (index) => {
    console.log("[ItemForm] removeCareInstruction index:", index);
    setForm((prev) => ({
      ...prev,
      care: {
        ...prev.care,
        instructions: prev.care.instructions.filter((_, i) => i !== index),
      },
    }));
  };

  const sizeChartLabelSuffix = (side) => (side === "cm" ? " (cm)" : " (in)");

  const addSizeChartHeader = (side) => {
    setForm((prev) => ({
      ...prev,
      sizeCharts: {
        ...prev.sizeCharts,
        [side]: {
          ...prev.sizeCharts[side],
          headers: [...(prev.sizeCharts[side].headers || []), { key: "", label: "" }],
        },
      },
    }));
  };

  const updateSizeChartHeader = (side, index, field, value) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      const newHeaders = [...(chart.headers || [])];
      const header = { ...(newHeaders[index] || {}) };

      if (field === "key") {
        header.key = String(value || "").trim();
        if (!String(header.label || "").trim() && header.key) {
          const pretty = header.key
            .replace(/[_\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          header.label =
            pretty.charAt(0).toUpperCase() + pretty.slice(1) + sizeChartLabelSuffix(side);
        }
      } else if (field === "label") {
        header.label = value;
        if (!String(header.key || "").trim() && String(value || "").trim()) {
          header.key = String(value)
            .toLowerCase()
            .replace(/\(.*?\)/g, "")
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "");
        }
      } else {
        header[field] = value;
      }

      newHeaders[index] = header;
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: { ...chart, headers: newHeaders },
        },
      };
    });
  };

  const removeSizeChartHeader = (side, index) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: {
            ...chart,
            headers: (chart.headers || []).filter((_, i) => i !== index),
          },
        },
      };
    });
  };

  const addSizeChartRow = (side) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      const measurements = {};
      (chart.headers || []).forEach((h) => {
        if (h.key) measurements[h.key] = "";
      });
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: {
            ...chart,
            rows: [...(chart.rows || []), { size: "", measurements }],
          },
        },
      };
    });
  };

  const updateSizeChartRow = (side, rowIndex, field, value) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      const newRows = [...(chart.rows || [])];
      const row = { ...(newRows[rowIndex] || {}) };

      if (field === "size") {
        row.size = value;
      } else {
        row.measurements = {
          ...(row.measurements || {}),
          [field]: value,
        };
      }

      newRows[rowIndex] = row;
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: { ...chart, rows: newRows },
        },
      };
    });
  };

  const removeSizeChartRow = (side, index) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: {
            ...chart,
            rows: (chart.rows || []).filter((_, i) => i !== index),
          },
        },
      };
    });
  };

  const addSizeChartImages = (side, files) => {
    if (!files?.length) return;
    const next = Array.from(files);
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: {
            ...chart,
            measureImages: [...(chart.measureImages || []), ...next],
          },
        },
      };
    });
  };

  const removeSizeChartImage = (side, index) => {
    setForm((prev) => {
      const chart = prev.sizeCharts[side];
      const imgs = [...(chart.measureImages || [])];
      imgs.splice(index, 1);
      return {
        ...prev,
        sizeCharts: {
          ...prev.sizeCharts,
          [side]: { ...chart, measureImages: imgs },
        },
      };
    });
  };

  const sizeChartPresetGender = presetGenderKeyFromSkuGender(form.skuCodeInputs?.gender);
  const activeSizeChartPreset = useMemo(() => {
    return (
      SIZE_CHART_PRESETS[sizeChartPresetGender]?.[sizeChartCategory] ||
      SIZE_CHART_PRESETS.unisex[sizeChartCategory]
    );
  }, [sizeChartPresetGender, sizeChartCategory]);

  const applySizeChartPreset = () => {
    setForm((prev) => {
      const g = presetGenderKeyFromSkuGender(prev.skuCodeInputs?.gender);
      const preset =
        SIZE_CHART_PRESETS[g]?.[sizeChartCategory] ||
        SIZE_CHART_PRESETS.unisex[sizeChartCategory];
      if (!preset?.headers) return prev;
      return {
        ...prev,
        sizeCharts: mergeSizeChartsWithPreset(prev.sizeCharts, preset),
      };
    });
  };

  /** Remove chosen policy icon (file + URL/key) — Policies tab */
  const clearPolicyIcon = (policyKey) => {
    setForm((prev) => ({
      ...prev,
      [policyKey]: {
        ...prev[policyKey],
        iconFile: null,
        iconUrl: "",
        iconKey: "",
      },
    }));
  };

  // Save handler
  const handleSave = async () => {
    console.log("[ItemForm] handleSave: starting with mode:", isEdit ? "edit" : "create");
    console.log("[ItemForm] handleSave: current form state:", form);

    const basicErrors = validateBasicTab();
    if (Object.keys(basicErrors).length > 0) {
      setFieldErrors(basicErrors);
      setActiveTab(1);
      const first = Object.values(basicErrors)[0];
      toast.error(
        first
          ? `Basic info: ${first}`
          : "Please fix the Basic tab before saving.",
        { duration: 4500 }
      );
      return;
    }

    try {
      setLoading(true);
      setBackendErrors([]);
      const formData = new FormData();

      // Basic text fields
      formData.append("name", form.name);
      formData.append("shortDescription", form.shortDescription);
      formData.append("longDescription", form.longDescription || "");
      formData.append("metaTitle", String(form.metaTitle || "").trim());
      formData.append("metaDescription", String(form.metaDescription || "").trim());
      formData.append("metaTags", metaTagsToJsonPayload(form.metaTagsStr));
      formData.append("price", form.price);
      formData.append("discountedPrice", form.discountedPrice || "");
      formData.append("productId", form.productId || "");
      formData.append("skuCodeInputs", JSON.stringify(form.skuCodeInputs || {}));
      formData.append("categoryId", categoryId);
      formData.append("subcategoryId", subcategoryId);
      formData.append("defaultColor", form.defaultColor);
      formData.append("isActive", String(form.isActive));

      // Variants - prepare JSON structure
      console.log("[ItemForm] handleSave: preparing variantsData from variants:", form.variants);
      const variantsData = form.variants
        .filter((variant) => {
          // Only include variants with valid color names
          return variant && variant.color && variant.color.name && variant.color.name.trim();
        })
        .map((variant) => {
          const colorName = variant.color.name.trim();
          const colorHex = (variant.color && variant.color.hex) ? variant.color.hex : "#000000";
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
              colour: variant?.skuCodeInputs?.colour || "",
            },
            images: variantImages.map((img, idx) => {
              // For existing URLs, include the URL; for new files, just order
              if (img instanceof File) {
                return { order: idx + 1 };
              } else if (typeof img === 'string' && img.length > 0) {
                return { order: idx + 1, url: img };
              } else if (img && typeof img === 'object' && img.url) {
                return { order: idx + 1, url: img.url };
              }
              return { order: idx + 1 };
            }),
            sizes: variantSizes
              .filter((s) => s && s.size && s.stock !== "" && s.stock !== null)
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

      // Ensure variantsData is valid before sending
      if (!Array.isArray(variantsData) || variantsData.length === 0) {
        throw new Error("At least one variant with a color name is required");
      }
      console.log("[ItemForm] handleSave: variantsData:", variantsData);

      // Build the new SKU generation requirement object per size line.
      // Backend uses this to generate `variants[].sizes[].sku`.
      const skuIdGenerationInputs = variantsData.flatMap((variant, variantIndex) => {
        const color =
          variant?.skuCodeInputs?.colour ||
          variant?.skuCodeInputs?.color ||
          variant?.color?.name ||
          "";

        return (Array.isArray(variant.sizes) ? variant.sizes : []).map((s, sizeIndex) => ({
          variantIndex,
          sizeIndex,
          // SKU generation requirement object (one per variant-size line).
          // `styleNu` is the "Style no." token; backend will append `gender` (if provided).
          styleNu: form?.skuCodeInputs?.styleNu || "",
          gender: form?.skuCodeInputs?.gender || "",
          productType: form?.skuCodeInputs?.productType || "",
          fitType: form?.skuCodeInputs?.fitType || "",
          color,
          size: s?.size || "",
          uidStartSeries: s?.skuUidSeriesStart,
        }));
      });

      formData.append(
        "skuIdGenerationInputs",
        JSON.stringify(skuIdGenerationInputs)
      );
      formData.append("variants", JSON.stringify(variantsData));

      // Variant images - multiple files per color variant (only File objects, not URLs)
      //
      // Backend updateItem (ItemService) only processes files where:
      //   fieldname.startsWith("variants[") && fieldname.includes(`variants[${colorName}]`)
      // So names like variants[0] are IGNORED — use variants[ColorName] (create) or
      // variants[ColorName][slotIndex] (edit) so uploads are received and slotted correctly.
      form.variants.forEach((variant, variantIndex) => {
        const colorName = variant.color.name?.trim();
        if (!colorName) return;

        variant.images.forEach((img, index) => {
          if (!(img instanceof File)) return;

          if (isEdit && id) {
            // Slot index matches the image position in the merged array (append = last index).
            // Backend must read this index (see loop note in ItemService.updateItem).
            formData.append(`variants[${colorName}][${index}]`, img);
          } else {
            formData.append(`variants[${colorName}]`, img);
            formData.append(`variants[${variantIndex}]`, img);
            formData.append(`variantImages[${colorName}]`, img);
            formData.append(`variantImages[${variantIndex}]`, img);
          }
        });
      });

      // Care instructions - JSON + icon files
      const careInstructions = form.care.instructions.map((inst, idx) => ({
        iconUrl: inst.iconUrl || "",
        iconKey: inst.iconKey || "",
        text: inst.text,
      }));
      const careData = {
        description: form.care.description,
        instructions: careInstructions,
      };
      formData.append("care", JSON.stringify(careData));

      form.care.instructions.forEach((inst, idx) => {
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
          if (img instanceof File) return { imageKey: `slot-${idx}` };
          if (typeof img === "string" && img.trim()) {
            return { url: img.trim(), imageKey: `existing-${idx}` };
          }
          if (img && typeof img === "object" && img.url) {
            return { url: img.url, imageKey: img.imageKey || `existing-${idx}` };
          }
          return { imageKey: `slot-${idx}` };
        });
        return { headers: cleanedHeaders, rows: cleanedRows, measureImage };
      };

      const inPayload = cleanChartSide(form.sizeCharts?.in);
      const cmPayload = cleanChartSide(form.sizeCharts?.cm);
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

      (form.sizeCharts?.in?.measureImages || []).forEach((file) => {
        if (file instanceof File) formData.append("measureImagesIn", file);
      });
      (form.sizeCharts?.cm?.measureImages || []).forEach((file) => {
        if (file instanceof File) formData.append("measureImagesCm", file);
      });

      // Shipping - JSON + icon file
      const shippingData = {
        iconUrl: form.shipping.iconUrl || "",
        iconKey: form.shipping.iconKey || "",
        title: form.shipping.title || "",
        estimatedDelivery: form.shipping.estimatedDelivery || "",
        shippingCharges: form.shipping.shippingCharges ? Number(form.shipping.shippingCharges) : undefined,
      };
      formData.append("shipping", JSON.stringify(shippingData));
      if (form.shipping.iconFile) {
        formData.append("shippingIcon", form.shipping.iconFile);
      }

      // COD Policy - JSON + icon file
      const codData = {
        iconUrl: form.codPolicy.iconUrl || "",
        iconKey: form.codPolicy.iconKey || "",
        text: form.codPolicy.text || "",
      };
      formData.append("codPolicy", JSON.stringify(codData));
      if (form.codPolicy.iconFile) {
        formData.append("codIcon", form.codPolicy.iconFile);
      }

      // Return Policy - JSON + icon file
      const returnData = {
        iconUrl: form.returnPolicy.iconUrl || "",
        iconKey: form.returnPolicy.iconKey || "",
        text: form.returnPolicy.text || "",
      };
      formData.append("returnPolicy", JSON.stringify(returnData));
      if (form.returnPolicy.iconFile) {
        formData.append("returnPolicyIcon", form.returnPolicy.iconFile);
      }

      // Exchange Policy - JSON + icon file
      const exchangeData = {
        iconUrl: form.exchangePolicy.iconUrl || "",
        iconKey: form.exchangePolicy.iconKey || "",
        text: form.exchangePolicy.text || "",
      };
      formData.append("exchangePolicy", JSON.stringify(exchangeData));
      if (form.exchangePolicy.iconFile) {
        formData.append("exchangePolicyIcon", form.exchangePolicy.iconFile);
      }

      // Cancellation Policy - JSON + icon file
      const cancellationData = {
        iconUrl: form.cancellationPolicy.iconUrl || "",
        iconKey: form.cancellationPolicy.iconKey || "",
        text: form.cancellationPolicy.text || "",
      };
      formData.append("cancellationPolicy", JSON.stringify(cancellationData));
      if (form.cancellationPolicy.iconFile) {
        formData.append("cancellationPolicyIcon", form.cancellationPolicy.iconFile);
      }

      // Filters - JSON array
      formData.append("filters", JSON.stringify(form.filters));
      console.log("[ItemForm] handleSave: filters:", form.filters);

      // Create or update based on mode
      if (isEdit && id) {
        console.log("[ItemForm] handleSave: sending updateItem with id:", id);
        await updateItem(id, formData);
        toast.success("Product updated successfully!", { duration: 2800 });
      } else {
        console.log("[ItemForm] handleSave: sending createItem");
        await createItem(formData);
        toast.success("Product created successfully!", { duration: 2800 });
      }

      console.log("[ItemForm] handleSave: navigation to items list");
      navigate(`/admin/items`);
    } catch (err) {
      const messages = extractBackendMessages(err);
      setBackendErrors(messages);
      showItemSaveErrorToasts(messages, !isEdit);
      setActiveTab(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-stone-600 hover:text-stone-900 flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight">
            {isEdit ? "Edit Product" : "Create New Product"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {isEdit ? "Update product details below" : "Fill in the details to create a new product"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            {backendErrors.length > 0 && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold mb-1">
                  We couldn&apos;t save this product. Please check the following:
                </div>
                <p className="text-red-700/90 mb-2 text-xs">
                  Fix the issues below, then try again. If something is unclear, share this list with your
                  backend team.
                </p>
                <ul className="list-disc list-inside space-y-1.5">
                  {backendErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Tabs */}
            <div className="flex border-b-2 border-border overflow-x-auto mb-8">
              {["Basic", "Variants", "Sizes", "Care", "Size Chart", "Policies", "Filters"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => {
                    const targetTab = i + 1;
                    if (targetTab === 1) {
                      setActiveTab(1);
                      return;
                    }

                    // Skip tab validation in edit flow
                    if (!isEdit) {
                      const basicErrors = validateBasicTab();
                      if (Object.keys(basicErrors).length > 0) {
                        setFieldErrors(basicErrors);
                        setActiveTab(1);
                        window.alert(
                          "Please complete the Basic tab before moving to the next step."
                        );
                        return;
                      }

                      if (targetTab >= 3 && !validateVariantsTab()) {
                        setActiveTab(2);
                        window.alert(
                          "Please complete the Variants tab (add at least one color) before moving to Sizes."
                        );
                        return;
                      }

                      if (targetTab >= 4 && !validateSizesTab()) {
                        setActiveTab(3);
                        window.alert(
                          "Please complete the Sizes tab (add stock for at least one size) before continuing."
                        );
                        return;
                      }
                    }

                    setFieldErrors({});
                    setActiveTab(targetTab);
                  }}
                  className={`flex-1 py-4 text-center font-semibold transition-all duration-200 whitespace-nowrap min-w-[100px] border-b-2 ${
                    activeTab === i + 1
                      ? "border-black text-black"
                      : `border-transparent ${
                          !isEdit && i + 1 > 1 && !isBasicTabValid()
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-stone-500 hover:text-stone-700"
                        }`
                  }`}
                  disabled={!isEdit && i + 1 > 1 && !isBasicTabValid()}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab 1 – Basic */}
            {activeTab === 1 && (
              <div className="space-y-6">
                {codeLoadError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {codeLoadError} You can still enter SKU segment codes manually if a list is
                    empty.
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Product ID / SKU
                  </label>
                  <input
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    placeholder="e.g. TSHIRT-OVERSIZE-006"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Style nu
                    </label>
                    <input
                      value={form.skuCodeInputs?.styleNu || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          skuCodeInputs: {
                            ...(prev.skuCodeInputs || {}),
                            styleNu: e.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. KHM009 (or KH009)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    />

                    <label className="block text-sm font-semibold text-stone-700 mb-2 mt-4">
                      Gender
                    </label>
                    <input
                      value={form.skuCodeInputs?.gender || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          skuCodeInputs: {
                            ...(prev.skuCodeInputs || {}),
                            gender: e.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. M / F / UNI"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    />

                    {fieldErrors.styleNu && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.styleNu}</p>
                    )}
                  </div>
                  <div>
                    {productTypeOptions.length === 0 && !codeLoading ? (
                      <>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          Product type (CATEGORY) <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={form.skuCodeInputs?.productType || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              skuCodeInputs: {
                                ...(prev.skuCodeInputs || {}),
                                productType: e.target.value.trim().toUpperCase(),
                              },
                            }))
                          }
                          placeholder="e.g. SHRT (must match active inventory CATEGORY code)"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                        <p className="mt-1 text-[11px] text-stone-500">
                          No category list loaded — enter the code from admin inventory codes.
                        </p>
                      </>
                    ) : (
                      <SearchableInventoryCodeSelect
                        label="Product type"
                        required
                        value={form.skuCodeInputs?.productType || ""}
                        buttonDisplay={inventoryCodeButtonDisplay(
                          productTypeOptions,
                          form.skuCodeInputs?.productType,
                        )}
                        options={productTypeOptions}
                        loading={codeLoading}
                        placeholder="Select category code"
                        onChange={(code) =>
                          setForm((prev) => ({
                            ...prev,
                            skuCodeInputs: {
                              ...(prev.skuCodeInputs || {}),
                              productType: code,
                            },
                          }))
                        }
                      />
                    )}
                    {fieldErrors.productType && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.productType}</p>
                    )}
                  </div>
                  <div>
                    {fitTypeOptions.length === 0 && !codeLoading ? (
                      <>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                          Fit type <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={form.skuCodeInputs?.fitType || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              skuCodeInputs: {
                                ...(prev.skuCodeInputs || {}),
                                fitType: e.target.value.trim(),
                              },
                            }))
                          }
                          placeholder="e.g. SL / RF / OV (must match active inventory FIT code)"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                        <p className="mt-1 text-[11px] text-stone-500">
                          No fit list loaded — enter the code from admin inventory codes.
                        </p>
                      </>
                    ) : (
                      <SearchableInventoryCodeSelect
                        label="Fit type"
                        required
                        value={form.skuCodeInputs?.fitType || ""}
                        buttonDisplay={inventoryCodeButtonDisplay(
                          fitTypeOptions,
                          form.skuCodeInputs?.fitType,
                        )}
                        options={fitTypeOptions}
                        loading={codeLoading}
                        placeholder="Select fit code"
                        onChange={(code) =>
                          setForm((prev) => ({
                            ...prev,
                            skuCodeInputs: {
                              ...(prev.skuCodeInputs || {}),
                              fitType: code,
                            },
                          }))
                        }
                      />
                    )}
                    {fieldErrors.fitType && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.fitType}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Short Description
                  </label>
                  <textarea
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    placeholder="Brief product summary for listings"
                    rows={3}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-y min-h-[4.5rem]"
                  />
                  {fieldErrors.shortDescription && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.shortDescription}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Detailed Description
                  </label>
                  <textarea
                    value={form.longDescription}
                    onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                    placeholder="Detailed product description"
                    rows={6}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-y min-h-[9rem]"
                  />
                  {fieldErrors.longDescription && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.longDescription}</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                  <p className="text-sm font-semibold text-slate-800">SEO (optional)</p>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Meta title
                    </label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                      placeholder="Page title for storefront / search"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Meta description
                    </label>
                    <textarea
                      value={form.metaDescription}
                      onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                      placeholder="Meta description"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-y min-h-[4.5rem]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={form.metaTagsStr}
                      onChange={(e) => setForm({ ...form, metaTagsStr: e.target.value })}
                      placeholder="Comma or semicolon separated (e.g. cotton, summer)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      MRP (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    {fieldErrors.price && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.discountedPrice}
                      onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                    />
                    {fieldErrors.discountedPrice && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.discountedPrice}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-brand-600 focus:ring-2 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900">
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  {colorCodeOptions.length === 0 && !codeLoading ? (
                    <>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">
                        Default color
                      </label>
                      <input
                        type="text"
                        value={form.defaultColor}
                        onChange={(e) => setForm({ ...form, defaultColor: e.target.value })}
                        placeholder="e.g. Black, BLK, or another catalog default"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                      />
                      <p className="mt-1 text-[11px] text-stone-500">
                        No colour list loaded — free text or colour code from inventory codes.
                      </p>
                    </>
                  ) : (
                    <SearchableInventoryCodeSelect
                      label="Default color"
                      required={false}
                      value={form.defaultColor || ""}
                      buttonDisplay={inventoryCodeButtonDisplay(
                        colorCodeOptions,
                        form.defaultColor,
                      )}
                      options={colorCodeOptions}
                      loading={codeLoading}
                      placeholder="Select colour code (optional)"
                      onChange={(code) => setForm((prev) => ({ ...prev, defaultColor: code }))}
                    />
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const errors = validateBasicTab();
                      if (Object.keys(errors).length > 0) {
                        setFieldErrors(errors);
                        return;
                      }
                      setFieldErrors({});
                      setActiveTab(2);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Variants
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2 – Variants */}
            {activeTab === 2 && (
              <div className="space-y-8">
                {form.variants.map((variant, vIdx) => (
                  <div key={vIdx} className="border-2 border-border rounded-xl p-6 bg-canvas-muted">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-xl border-2 border-border shadow-md"
                          style={{ backgroundColor: variant.color.hex }}
                          title="Color Preview"
                        />
                        <input
                          value={variant.color.name}
                          onChange={(e) => updateVariantColor(vIdx, "name", e.target.value)}
                          placeholder="Color name (e.g. Black, White, Red)"
                          className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-stone-700 whitespace-nowrap">
                          Hex Code:
                        </label>
                        <input
                          type="text"
                          value={variant.color.hex}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^#?[0-9A-Fa-f]{0,6}$/.test(value)) {
                              const hex = value.startsWith("#") ? value : `#${value}`;
                              updateVariantColor(vIdx, "hex", hex);
                            }
                          }}
                          placeholder="#000000"
                          className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
                          maxLength={7}
                        />
                        <input
                          type="color"
                          value={variant.color.hex}
                          onChange={(e) => updateVariantColor(vIdx, "hex", e.target.value)}
                          className="w-16 h-12 rounded-xl cursor-pointer border-2 border-border"
                          title="Pick Color"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        {colorCodeOptions.length === 0 && !codeLoading ? (
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-stone-700 whitespace-nowrap">
                              Colour (SKU segment):
                            </label>
                            <input
                              type="text"
                              value={variant?.skuCodeInputs?.colour || ""}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const newVariants = [...prev.variants];
                                  newVariants[vIdx] = {
                                    ...newVariants[vIdx],
                                    skuCodeInputs: {
                                      ...(newVariants[vIdx].skuCodeInputs || {}),
                                      colour: e.target.value,
                                    },
                                  };
                                  return { ...prev, variants: newVariants };
                                })
                              }
                              placeholder="e.g. BLK / RED / BLU"
                              className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                          </div>
                        ) : (
                          <SearchableInventoryCodeSelect
                            label="Colour code (SKU segment)"
                            required={false}
                            value={variant?.skuCodeInputs?.colour || ""}
                            buttonDisplay={inventoryCodeButtonDisplay(
                              colorCodeOptions,
                              variant?.skuCodeInputs?.colour,
                            )}
                            options={colorCodeOptions}
                            loading={codeLoading}
                            placeholder="Select colour code"
                            onChange={(code) =>
                              setForm((prev) => {
                                const newVariants = [...prev.variants];
                                const opt = colorCodeOptions.find((o) => o.value === code);
                                newVariants[vIdx] = {
                                  ...newVariants[vIdx],
                                  skuCodeInputs: {
                                    ...(newVariants[vIdx].skuCodeInputs || {}),
                                    colour: code,
                                  },
                                  color: {
                                    ...newVariants[vIdx].color,
                                    ...(code && opt?.label
                                      ? { name: opt.label }
                                      : {}),
                                  },
                                };
                                return { ...prev, variants: newVariants };
                              })
                            }
                          />
                        )}
                      </div>
                      {/* Color presets */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-stone-600">Quick colors:</span>
                        <div className="flex items-center gap-2 flex-wrap max-h-48 overflow-y-auto p-2">
                          {[
                            { name: "Black", hex: "#000000" },
                            { name: "White", hex: "#FFFFFF" },
                            { name: "Red", hex: "#FF0000" },
                            { name: "Blue", hex: "#0000FF" },
                            { name: "Green", hex: "#008000" },
                            { name: "Yellow", hex: "#FFFF00" },
                            { name: "Orange", hex: "#FFA500" },
                            { name: "Purple", hex: "#800080" },
                            { name: "Pink", hex: "#FFC0CB" },
                            { name: "Brown", hex: "#A52A2A" },
                            { name: "Gray", hex: "#808080" },
                            { name: "Navy", hex: "#000080" },
                          ].map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => {
                                setForm((prev) => {
                                  const next = [...prev.variants];
                                  next[vIdx] = {
                                    ...next[vIdx],
                                    color: {
                                      ...next[vIdx].color,
                                      hex: preset.hex,
                                      name: preset.name,
                                    },
                                  };
                                  return { ...prev, variants: next };
                                });
                              }}
                              className="w-10 h-10 rounded-lg border-2 border-border hover:border-gray-500 transition-all shadow-sm"
                              style={{ backgroundColor: preset.hex }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-stone-700 mb-3">Product Images</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {variant.images.map((file, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          <button
                            type="button"
                            onClick={() => openVariantImageZoom(file)}
                            className="block w-full aspect-square rounded-xl overflow-hidden border-2 border-border shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            title="Click to zoom"
                          >
                            <img
                              src={
                                file instanceof File
                                  ? URL.createObjectURL(file)
                                  : getVariantImageDisplaySrc(file) || ""
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImageFromVariant(vIdx, imgIdx)}
                            className="absolute top-2 right-2 bg-red-500 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg z-10"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <label className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                        <span className="text-3xl text-stone-400">+</span>
                        <span className="text-xs text-stone-500 mt-1 font-medium">Add image</span>
                        <input
                          ref={(el) => {
                            if (el) fileInputRefs.current[`variant-${vIdx}`] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (files?.length) {
                              // Prevent double-firing by checking if we're already processing
                              const inputKey = `variant-${vIdx}`;
                              const input = fileInputRefs.current[inputKey];
                              if (input?.disabled) return;

                              if (input) input.disabled = true;
                              try {
                                const compressed = await compressImageFilesForUpload(files);
                                addImageToVariant(vIdx, compressed);
                              } finally {
                                if (input) {
                                  input.value = "";
                                  input.disabled = false;
                                }
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another color variant
                </button>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Basic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEdit && !validateVariantsTab()) {
                        window.alert(
                          "Please complete the Variants tab (add at least one color) before moving to Sizes."
                        );
                        return;
                      }
                      setActiveTab(3);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Sizes
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3 – Sizes */}
            {activeTab === 3 && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                  <p className="text-sm text-indigo-950">
                    <span className="font-semibold">UID start series (per size):</span> optional first{" "}
                    <code className="text-xs bg-white/80 px-1 rounded">sku_uid</code> code when this sellable SKU’s
                    sequence is created. After sequences exist, changing this field does not rewind counters.
                  </p>
                  {isEdit && id ? (
                    <button
                      type="button"
                      onClick={() => setSkuUidModalOpen(true)}
                      className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800"
                    >
                      See all SKU UIDs
                    </button>
                  ) : (
                    <span className="text-xs text-indigo-800/80 shrink-0">
                      Save the product first to view / edit UID records.
                    </span>
                  )}
                </div>
                {form.variants.map((variant, vIdx) => (
                  <div key={vIdx} className="border-2 border-border rounded-xl p-6 bg-white">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg shadow-md" style={{ backgroundColor: variant.color.hex }} />
                      <span className="font-bold text-stone-900">{variant.color.name || "Unnamed Color"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {variant.sizes.map((size, sIdx) => (
                        <div key={sIdx} className="space-y-3 p-4 bg-canvas-muted rounded-xl border border-border">
                          <div className="font-bold text-stone-900">{size.size}</div>
                          <input
                            type="text"
                            placeholder="SKU (e.g. TSH-BLK-S)"
                            value={size.sku}
                            onChange={(e) => updateSize(vIdx, sIdx, "sku", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          />
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="UID start series (optional)"
                            value={size.skuUidSeriesStart ?? ""}
                            onChange={(e) => updateSize(vIdx, sIdx, "skuUidSeriesStart", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={size.stock}
                            onChange={(e) => updateSize(vIdx, sIdx, "stock", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Variants
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEdit && !validateSizesTab()) {
                        window.alert(
                          "Please complete the Sizes tab (add stock for at least one size) before moving to Care."
                        );
                        return;
                      }
                      setActiveTab(4);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Care
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4 – Care */}
            {activeTab === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Care Description
                  </label>
                  <textarea
                    value={form.care.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        care: { ...form.care, description: e.target.value },
                      })
                    }
                    placeholder="Proper care will help maintain fabric quality and color."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-stone-900">Care Instructions</h3>
                    <button
                      type="button"
                      onClick={addCareInstruction}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Instruction
                    </button>
                  </div>

                  {form.care.instructions.length === 0 ? (
                    <p className="text-stone-500 text-sm italic p-4 bg-canvas-muted rounded-xl">No care instructions added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {form.care.instructions.map((inst, index) => (
                        <div
                          key={index}
                          className="border-2 border-border rounded-xl p-4 bg-canvas-muted space-y-3"
                        >
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={inst.text}
                              onChange={(e) =>
                                updateCareInstruction(index, "text", e.target.value)
                              }
                              placeholder="Instruction text (e.g. Machine wash cold)"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                            <button
                              onClick={() => removeCareInstruction(index)}
                              className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={inst.iconUrl}
                              onChange={(e) =>
                                updateCareInstruction(index, "iconUrl", e.target.value)
                              }
                              placeholder="Icon URL"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                            <input
                              type="text"
                              value={inst.iconKey}
                              onChange={(e) =>
                                updateCareInstruction(index, "iconKey", e.target.value)
                              }
                              placeholder="Icon Key"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <label className="block">
                            <span className="text-sm font-semibold text-stone-700 mb-1 block">Icon File</span>
                            <input
                              type="file"
                              accept="image/*,.svg"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                updateCareInstruction(index, "iconFile", file);
                              }}
                              className="text-sm text-stone-600"
                            />
                        {(inst.iconFile || inst.iconUrl) && (
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-stone-500">
                              Preview:
                            </span>
                            <img
                              src={
                                inst.iconFile
                                  ? URL.createObjectURL(inst.iconFile)
                                  : inst.iconUrl
                              }
                              alt="Care icon preview"
                              className="h-8 w-8 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(3)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Sizes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(5)}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Size Chart
                  </button>
                </div>
              </div>
            )}

            {/* Tab 5 – Size Chart (dual tables: sizeCharts.in / sizeCharts.cm, same as designer inventory) */}
            {activeTab === 5 && (
              <div className="space-y-6">
                <p className="text-sm text-stone-600 rounded-xl border border-border bg-canvas-muted px-4 py-3">
                  Add separate measurement tables for inches and centimeters. Images upload as{" "}
                  <code className="text-xs bg-white px-1 py-0.5 rounded border">measureImagesIn</code> /{" "}
                  <code className="text-xs bg-white px-1 py-0.5 rounded border">measureImagesCm</code>{" "}
                  (same as designer inventory and catalog API).
                </p>

                <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-900">Templates (designer parity)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Units</label>
                      <input
                        type="text"
                        readOnly
                        value="Both (in & cm)"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-canvas-muted text-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Garment type (gender from Style: {sizeChartPresetGender})
                      </label>
                      <select
                        value={sizeChartCategory}
                        onChange={(e) => setSizeChartCategory(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="upper">Upper</option>
                        <option value="lower">Lower</option>
                        <option value="upper_lower">Upper + lower</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={applySizeChartPreset}
                        className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-indigo-300 bg-white text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
                      >
                        Apply preset (fills in + cm tables)
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-white/90 p-3">
                    <p className="mb-2 text-xs font-medium text-stone-700">
                      Template preview ({sizeChartPresetGender} ·{" "}
                      {garmentPresetCategoryLabel(sizeChartCategory)})
                    </p>
                    <p className="mb-1 text-[11px] font-semibold text-stone-700">Inches (in)</p>
                    <div className="overflow-x-auto rounded-lg border border-border bg-white mb-4">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead>
                          <tr className="bg-canvas-muted text-left">
                            <th className="p-2 font-semibold text-stone-700">Measurement</th>
                            {(activeSizeChartPreset?.sizes || []).map((sz) => (
                              <th key={sz} className="p-2 text-center font-semibold text-stone-700">
                                {sz}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(activeSizeChartPreset?.headers || []).map((h, rowIdx) => (
                            <tr key={`${h.key}-${rowIdx}`} className="border-t border-gray-100">
                              <td className="p-2 font-medium text-gray-800">{h.label || h.key}</td>
                              {(activeSizeChartPreset?.sizes || []).map((sz, colIdx) => {
                                const values = activeSizeChartPreset?.sampleValues?.[h.key] || [];
                                const cell = values[colIdx] ?? "—";
                                return (
                                  <td key={`${h.key}-${sz}-${colIdx}`} className="p-2 text-center text-stone-700">
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mb-1 text-[11px] font-semibold text-stone-700">Centimeters (cm) — from sample inches</p>
                    <div className="overflow-x-auto rounded-lg border border-border bg-white">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead>
                          <tr className="bg-canvas-muted text-left">
                            <th className="p-2 font-semibold text-stone-700">Measurement</th>
                            {(activeSizeChartPreset?.sizes || []).map((sz) => (
                              <th key={`cm-${sz}`} className="p-2 text-center font-semibold text-stone-700">
                                {sz}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(activeSizeChartPreset?.headers || []).map((h, rowIdx) => (
                            <tr key={`cm-${h.key}-${rowIdx}`} className="border-t border-gray-100">
                              <td className="p-2 font-medium text-gray-800">
                                {String(h.label || h.key || "")
                                  .replace("(in/cm)", "(cm)")
                                  .replace("(in)", "(cm)")}
                              </td>
                              {(activeSizeChartPreset?.sizes || []).map((sz, colIdx) => {
                                const values = activeSizeChartPreset?.sampleValues?.[h.key] || [];
                                const cell = values[colIdx] ?? "";
                                const cmCell = cell ? inchesToCmText(cell) : "—";
                                return (
                                  <td key={`cm-${h.key}-${sz}-${colIdx}`} className="p-2 text-center text-stone-700">
                                    {cmCell}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {(["in", "cm"]).map((side) => {
                  const chart = form.sizeCharts[side] || {
                    headers: [],
                    rows: [],
                    measureImages: [],
                  };
                  const sideTitle = side === "in" ? "Inches (in)" : "Centimeters (cm)";
                  const labelPh =
                    side === "in" ? "Label (e.g. Chest (in))" : "Label (e.g. Chest (cm))";
                  const fieldClass =
                    "w-full px-3 py-2 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all";

                  return (
                    <div
                      key={side}
                      className="rounded-xl border-2 border-indigo-100 bg-indigo-50/30 p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-stone-900">{sideTitle}</h3>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addSizeChartHeader(side)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                          >
                            + Header
                          </button>
                          <button
                            type="button"
                            onClick={() => addSizeChartRow(side)}
                            className="px-4 py-2 border-2 border-indigo-200 bg-white text-indigo-800 rounded-xl text-sm font-semibold hover:bg-indigo-50"
                          >
                            + Row
                          </button>
                        </div>
                      </div>

                      {(chart.headers || []).length === 0 ? (
                        <p className="text-stone-500 text-sm italic p-4 bg-white rounded-xl border border-border">
                          No headers for this table yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(chart.headers || []).map((header, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row gap-3 items-end bg-white p-3 rounded-xl border border-border"
                            >
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <label
                                  htmlFor={`itemform-sc-${side}-hdr-${idx}-key`}
                                  className="text-xs font-semibold text-stone-700"
                                >
                                  Column key #{idx + 1}{" "}
                                  <span className="font-normal text-stone-500">(API, e.g. chest)</span>
                                </label>
                                <input
                                  id={`itemform-sc-${side}-hdr-${idx}-key`}
                                  type="text"
                                  className={fieldClass}
                                  value={header.key}
                                  placeholder="chest, waist, length…"
                                  onChange={(e) =>
                                    updateSizeChartHeader(side, idx, "key", e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <label
                                  htmlFor={`itemform-sc-${side}-hdr-${idx}-label`}
                                  className="text-xs font-semibold text-stone-700"
                                >
                                  Display label #{idx + 1}
                                </label>
                                <input
                                  id={`itemform-sc-${side}-hdr-${idx}-label`}
                                  type="text"
                                  className={fieldClass}
                                  value={header.label}
                                  placeholder={labelPh}
                                  onChange={(e) =>
                                    updateSizeChartHeader(side, idx, "label", e.target.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSizeChartHeader(side, idx)}
                                className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 font-semibold text-sm shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {(chart.rows || []).length === 0 ? (
                        <p className="text-stone-500 text-sm italic p-4 bg-white rounded-xl border border-border">
                          No size rows for this table yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(chart.rows || []).map((row, rowIndex) => (
                            <div
                              key={rowIndex}
                              className="border-2 border-border rounded-xl p-4 bg-white space-y-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                Size row {rowIndex + 1}
                                {row.size ? (
                                  <span className="ml-2 normal-case text-gray-800">— {row.size}</span>
                                ) : null}
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex flex-col gap-1 sm:max-w-[180px]">
                                  <label
                                    htmlFor={`itemform-sc-${side}-row-${rowIndex}-size`}
                                    className="text-xs font-semibold text-stone-700"
                                  >
                                    Size label
                                  </label>
                                  <input
                                    id={`itemform-sc-${side}-row-${rowIndex}-size`}
                                    type="text"
                                    className={fieldClass}
                                    value={row.size}
                                    placeholder="S, M, L, XL…"
                                    onChange={(e) =>
                                      updateSizeChartRow(side, rowIndex, "size", e.target.value)
                                    }
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSizeChartRow(side, rowIndex)}
                                  className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 font-semibold text-sm self-end sm:mb-0.5"
                                >
                                  Remove row
                                </button>
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-semibold text-stone-700">
                                  Measurements ({sideTitle})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(chart.headers || []).map((h, hIdx) => {
                                    const colLabel = (h.label || h.key || "Column").trim() || "Column";
                                    const rowLabel = (row.size || `Row ${rowIndex + 1}`).trim();
                                    const cellId = `itemform-sc-${side}-r${rowIndex}-h${hIdx}-${String(h.key || "col").replace(/\s+/g, "-")}`;
                                    return (
                                      <div key={h.key || `h${hIdx}-${rowIndex}`} className="flex flex-col gap-1">
                                        <label htmlFor={cellId} className="text-xs font-semibold text-stone-700">
                                          <span className="text-stone-900">{colLabel}</span>
                                          <span className="font-normal text-stone-500">
                                            {" "}
                                            · {rowLabel}
                                          </span>
                                        </label>
                                        <input
                                          id={cellId}
                                          type="number"
                                          step="any"
                                          className={fieldClass}
                                          value={row.measurements?.[h.key] ?? ""}
                                          placeholder="0"
                                          onChange={(e) =>
                                            updateSizeChartRow(side, rowIndex, h.key, e.target.value)
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-800">
                            Measurement images (
                            {side === "in" ? "measureImagesIn" : "measureImagesCm"})
                          </h4>
                          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border-2 border-border bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-indigo-400 hover:bg-indigo-50">
                            + Add images
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => addSizeChartImages(side, e.target.files)}
                            />
                          </label>
                        </div>
                        {(chart.measureImages || []).length === 0 ? (
                          <p className="text-stone-500 text-sm italic p-4 bg-white rounded-xl border border-border">
                            No images for this unit
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {(chart.measureImages || []).map((img, idx) => (
                              <div key={idx} className="relative group flex flex-col gap-1">
                                <span className="text-center text-[11px] font-semibold text-stone-600">
                                  Guide image {idx + 1}
                                </span>
                                <img
                                  src={
                                    img instanceof File
                                      ? URL.createObjectURL(img)
                                      : typeof img === "string"
                                        ? img
                                        : img?.url || ""
                                  }
                                  alt={`Measurement guide ${idx + 1} (${sideTitle})`}
                                  className="aspect-square object-cover rounded-xl border-2 border-border shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSizeChartImage(side, idx)}
                                  className="absolute top-2 right-2 bg-red-500 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                  aria-label="Remove measurement image"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(4)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Care
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(6)}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Policies
                  </button>
                </div>
              </div>
            )}

            {/* Tab 6 – Policies */}
            {activeTab === 6 && (
              <div className="space-y-8">
                {/* Shipping */}
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-stone-900 mb-4">Shipping Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.shipping.title}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: { ...form.shipping, title: e.target.value },
                        })
                      }
                      placeholder="Title (e.g. Free Shipping)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      value={form.shipping.estimatedDelivery}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: {
                            ...form.shipping,
                            estimatedDelivery: e.target.value,
                          },
                        })
                      }
                      placeholder="Estimated Delivery (e.g. Delivery within 4-6 business days)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="number"
                      value={form.shipping.shippingCharges}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: {
                            ...form.shipping,
                            shippingCharges: e.target.value,
                          },
                        })
                      }
                      placeholder="Shipping Charges (₹)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.shipping.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: { ...form.shipping, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.shipping.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: { ...form.shipping, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-stone-700 mb-1 block">Shipping Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: {
                              ...form.shipping,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-stone-600"
                      />
                      {(form.shipping.iconFile || form.shipping.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-stone-500">Preview:</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => clearPolicyIcon("shipping")}
                              className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                              title="Remove icon"
                              aria-label="Remove shipping icon"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <img
                              src={
                                form.shipping.iconFile
                                  ? URL.createObjectURL(form.shipping.iconFile)
                                  : form.shipping.iconUrl
                              }
                              alt="Shipping icon preview"
                              className="h-10 w-10 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* COD Policy */}
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-stone-900 mb-4">COD Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.codPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          codPolicy: { ...form.codPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Cash on Delivery available)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.codPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: { ...form.codPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.codPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: { ...form.codPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-stone-700 mb-1 block">COD Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: {
                              ...form.codPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-stone-600"
                      />
                      {(form.codPolicy.iconFile || form.codPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-stone-500">Preview:</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => clearPolicyIcon("codPolicy")}
                              className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                              title="Remove icon"
                              aria-label="Remove COD icon"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <img
                              src={
                                form.codPolicy.iconFile
                                  ? URL.createObjectURL(form.codPolicy.iconFile)
                                  : form.codPolicy.iconUrl
                              }
                              alt="COD icon preview"
                              className="h-10 w-10 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Return Policy */}
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-stone-900 mb-4">Return Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.returnPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          returnPolicy: { ...form.returnPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. 7-day easy return policy)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.returnPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: { ...form.returnPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.returnPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: { ...form.returnPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-stone-700 mb-1 block">Return Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: {
                              ...form.returnPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-stone-600"
                      />
                      {(form.returnPolicy.iconFile || form.returnPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-stone-500">Preview:</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => clearPolicyIcon("returnPolicy")}
                              className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                              title="Remove icon"
                              aria-label="Remove return policy icon"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <img
                              src={
                                form.returnPolicy.iconFile
                                  ? URL.createObjectURL(form.returnPolicy.iconFile)
                                  : form.returnPolicy.iconUrl
                              }
                              alt="Return policy icon preview"
                              className="h-10 w-10 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Exchange Policy */}
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-stone-900 mb-4">Exchange Policy</h3>
                  <div className="space-y-4">
                    <textarea
                      value={form.exchangePolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          exchangePolicy: { ...form.exchangePolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Orders can be exchanged within 7 days of delivery)"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.exchangePolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: { ...form.exchangePolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.exchangePolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: { ...form.exchangePolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-stone-700 mb-1 block">Exchange Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: {
                              ...form.exchangePolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-stone-600"
                      />
                      {(form.exchangePolicy.iconFile || form.exchangePolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-stone-500">Preview:</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => clearPolicyIcon("exchangePolicy")}
                              className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                              title="Remove icon"
                              aria-label="Remove exchange policy icon"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <img
                              src={
                                form.exchangePolicy.iconFile
                                  ? URL.createObjectURL(form.exchangePolicy.iconFile)
                                  : form.exchangePolicy.iconUrl
                              }
                              alt="Exchange policy icon preview"
                              className="h-10 w-10 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-stone-900 mb-4">Cancellation Policy</h3>
                  <div className="space-y-4">
                    <textarea
                      value={form.cancellationPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cancellationPolicy: { ...form.cancellationPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Orders can be cancelled within 24 hours of placement)"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.cancellationPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: { ...form.cancellationPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.cancellationPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: { ...form.cancellationPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-stone-700 mb-1 block">Cancellation Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: {
                              ...form.cancellationPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-stone-600"
                      />
                      {(form.cancellationPolicy.iconFile || form.cancellationPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-stone-500">Preview:</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => clearPolicyIcon("cancellationPolicy")}
                              className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                              title="Remove icon"
                              aria-label="Remove cancellation policy icon"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                            <img
                              src={
                                form.cancellationPolicy.iconFile
                                  ? URL.createObjectURL(form.cancellationPolicy.iconFile)
                                  : form.cancellationPolicy.iconUrl
                              }
                              alt="Cancellation policy icon preview"
                              className="h-10 w-10 rounded border border-border object-contain bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(5)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Size Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(7)}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
                  >
                    Next: Filters
                  </button>
                </div>
              </div>
            )}

            {/* Tab 7 – Filters */}
            {activeTab === 7 && (
              <div className="space-y-6">
                <div className="border-2 border-border rounded-xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-stone-900">Filters / Tags</h3>
                    <button
                      type="button"
                      onClick={addFilter}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Filter
                    </button>
                  </div>

                  {form.filters.length === 0 ? (
                    <p className="text-stone-500 text-sm italic p-4 bg-canvas-muted rounded-xl">No filters added yet. Add filters like category, fabric, fit, sleeve, etc.</p>
                  ) : (
                    <div className="space-y-4">
                      {form.filters.map((filter, index) => (
                        <div key={index} className="flex gap-3 items-center bg-canvas-muted p-4 rounded-xl border border-border">
                          <input
                            value={filter.key}
                            onChange={(e) => updateFilter(index, "key", e.target.value)}
                            placeholder="Key (e.g. category, fabric, fit, sleeve)"
                            className="flex-1 px-4 py-2.5 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          />
                          <input
                            value={filter.value}
                            onChange={(e) => updateFilter(index, "value", e.target.value)}
                            placeholder="Value (e.g. tshirt, cotton, oversized, half sleeve)"
                            className="flex-1 px-4 py-2.5 text-sm rounded-lg border-2 border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          />
                          <button
                            onClick={() => removeFilter(index)}
                            className="text-red-600 hover:text-red-800 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(6)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-stone-700 hover:bg-brand-50/30 transition-all"
                  >
                    Back: Policies
                  </button>
                  <span className="text-sm text-stone-500 self-center hidden sm:inline">
                    Use Save below to create or update the product
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t-2 border-border mt-8">
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-3 border-2 border-border rounded-xl hover:bg-brand-50/30 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {formHasPendingUploadFiles ? "Uploading images…" : "Saving..."}
                  </span>
                ) : (
                  isEdit ? "Update Product" : "Create Product"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <SkuUidsModal
        itemId={id}
        open={skuUidModalOpen}
        onClose={() => setSkuUidModalOpen(false)}
      />

      {zoomVariantImage?.src && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={closeVariantZoom}
        >
          <button
            type="button"
            onClick={closeVariantZoom}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20"
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={zoomVariantImage.src}
            alt="Product variant"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ItemForm;
