import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import {
  createDesignerItem,
  designerApi,
  getDesignerListingTemplateById,
  getDesignerSizeChartById,
  getDesignerInventoryCodes,
  getDesignerItemById,
  listDesignerListingTemplates,
  listDesignerSizeCharts,
  updateDesignerItem,
} from "../../apis/designerApi";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import {
  SIZE_CHART_PRESETS,
  garmentPresetCategoryLabel,
  inchesToCmText,
  mergeSizeChartsWithPreset,
} from "../../../utils/sizeChartPresets.js";
import { CARE_ICON_OPTIONS } from "../../../utils/designerCareIconOptions.js";

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
    return (
      <div className="h-20 w-20 shrink-0 rounded-md border border-dashed border-amber-200 bg-white" />
    );
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

const emptyCareInstruction = () => ({
  iconUrl: "",
  iconKey: "",
  text: "",
  iconFile: null,
});

const emptyCare = () => ({
  description: "",
  instructions: [],
});

/** One unit table (inches or cm) — matches API `sizeCharts.in` / `sizeCharts.cm`. */
const emptyChartSide = () => ({
  headers: [],
  rows: [],
  measureImages: [],
});

const emptySizeCharts = () => ({
  in: emptyChartSide(),
  cm: emptyChartSide(),
});

function mapApiRowsToForm(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const measurements = r?.measurements;
    const asObj =
      measurements instanceof Map
        ? Object.fromEntries(measurements.entries())
        : measurements && typeof measurements === "object"
          ? measurements
          : {};
    return { size: r?.size || "", measurements: asObj };
  });
}

function mapApiMeasureImagesToForm(measureImage) {
  if (!Array.isArray(measureImage)) return [];
  return measureImage
    .map((img) => {
      if (!img) return null;
      if (typeof img === "string") return img;
      if (typeof img === "object") {
        const url = String(img.url || "").trim();
        const imageKey = String(img.imageKey || "").trim();
        if (url || imageKey) return { url, imageKey };
      }
      return null;
    })
    .filter(Boolean);
}

function loadSizeChartsFromDesignerItem(d) {
  const sc = d.sizeCharts;
  if (sc && typeof sc === "object" && (sc.in || sc.cm)) {
    return {
      in: {
        headers: Array.isArray(sc.in?.headers) ? sc.in.headers : [],
        rows: mapApiRowsToForm(sc.in?.rows),
        measureImages: mapApiMeasureImagesToForm(sc.in?.measureImage),
      },
      cm: {
        headers: Array.isArray(sc.cm?.headers) ? sc.cm.headers : [],
        rows: mapApiRowsToForm(sc.cm?.rows),
        measureImages: mapApiMeasureImagesToForm(sc.cm?.measureImage),
      },
    };
  }
  const leg = d.sizeChart;
  const next = emptySizeCharts();
  const u = leg?.unit === "cm" ? "cm" : "in";
  next[u] = {
    headers: Array.isArray(leg?.headers) ? leg.headers : [],
    rows: mapApiRowsToForm(leg?.rows),
    measureImages: mapApiMeasureImagesToForm(leg?.measureImage),
  };
  return next;
}

/** Same as `mapDesignerItemToForm` but clears generated IDs so a new item can be saved. */
function mapImportedDesignerItemToForm(d) {
  const base = mapDesignerItemToForm(d);
  return {
    ...base,
    variants: (base.variants || []).map((v) => ({
      ...v,
      sizes: (v.sizes || []).map((s) => ({
        ...s,
        sku: "",
        barcode: "",
      })),
    })),
  };
}

function mapDesignerItemToForm(d) {
  return {
    StyleNumber: d.StyleNumber || "",
    styleName: d.styleName || "",
    designerName: d.designerName || "",
    employeeId: d.employeeId || "",
    longDescription: d.longDescription || "",
    shortDescription: d.shortDescription || "",
    metaTitle: d.metaTitle || "",
    metaDescription: d.metaDescription || "",
    metaTagsStr: Array.isArray(d.metaTags)
      ? d.metaTags.map((t) => String(t || "").trim()).filter(Boolean).join(", ")
      : "",
    productType: d.productType || "",
    productTypeCode: d.productTypeCode || d.skuCodeInputs?.productTypeCode || "",
    fitType: d.fitType || "",
    gender: d.gender || "men",
    defaultColor: d.defaultColor || "",
    mrp: d.mrp ?? 0,
    discountPrice: d.discountPrice ?? 0,
    fabric: { ...emptyFabric(), ...(d.fabric || {}) },
    costs: { ...emptyCosts(), ...(d.costs || {}) },
    care: {
      ...emptyCare(),
      ...(d.care || {}),
      instructions: Array.isArray(d.care?.instructions)
        ? d.care.instructions.map((inst) => ({
            iconUrl: inst?.iconUrl || "",
            iconKey: inst?.iconKey || "",
            text: inst?.text || "",
            iconFile: null,
          }))
        : [],
    },
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
    sizeCharts: loadSizeChartsFromDesignerItem(d),
  };
}

const toNumberOrZero = (value) => {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const chartMeetsRequirement = (body) => {
  const headers = Array.isArray(body?.headers) ? body.headers : [];
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const images = Array.isArray(body?.measureImage) ? body.measureImage : [];
  if (headers.length === 0 || rows.length === 0) return false;
  const keys = headers.map((h) => String(h?.key || "").trim()).filter(Boolean);
  if (keys.length === 0) return false;
  const hasImage = images.some(
    (img) =>
      img &&
      (String(img.url || "").trim() || String(img.imageKey || "").trim()),
  );
  if (!hasImage) return false;
  return rows.every((row) =>
    keys.every((key) => Number.isFinite(Number(row?.measurements?.[key]))),
  );
};

function normalizeCodeOptionsResponse(res) {
  const root = res?.data ?? res ?? {};
  const payload = root?.data ?? root;
  const list =
    payload?.items ||
    payload?.inventoryCodes ||
    payload?.codes ||
    payload?.data ||
    (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(list)) return [];

  return list
    .filter((row) => row?.isActive !== false)
    .map((row) => ({
      value: String(row?.code || row?.name || "").trim(),
      label: String(row?.name || row?.code || "").trim(),
    }))
    .filter((row) => row.value.length > 0)
    .filter(
      (row, idx, arr) => arr.findIndex((x) => x.value === row.value) === idx,
    );
}

/** Match legacy rows where `productType` stored a code or a display name before `productTypeCode` existed. */
function inferProductTypeCodeFromLegacy(productType, options) {
  const raw = String(productType || "").trim();
  if (!raw || !Array.isArray(options) || options.length === 0) return "";
  const byValue = options.find((o) => o.value === raw);
  if (byValue) return byValue.value;
  const byLabel = options.find((o) => o.label === raw);
  if (byLabel) return byLabel.value;
  return "";
}

function SearchableCodeSelect({
  label,
  required,
  value,
  onChange,
  options,
  loading,
  placeholder,
  allowCustom = false,
  /** Shown on the main button when set; falls back to `value` (e.g. show "Name (CODE)" while `value` stays the code). */
  buttonDisplay,
}) {
  const wrapperRef = useRef(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(normalizedSearch) ||
          opt.value.toLowerCase().includes(normalizedSearch),
      )
    : options;

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-0.5 block text-xs font-medium text-gray-700">
        {label}
      </label>
      <div className="space-y-1">
        <input
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder={loading ? "Loading options..." : "Search options..."}
          value={search}
          onChange={(e) => {
            const next = e.target.value;
            setSearch(next);
            if (allowCustom) onChange(next);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          disabled={loading}
        />
        <input type="hidden" value={value || ""} required={required} readOnly />
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-left text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
          disabled={loading}
        >
          {buttonDisplay != null && String(buttonDisplay).trim() !== ""
            ? buttonDisplay
            : value || placeholder}
        </button>
        {open && !loading ? (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full border-b border-gray-100 px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-xs text-gray-500">
                No matching options
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="w-full border-b border-gray-100 px-2 py-1.5 text-left text-sm hover:bg-indigo-50"
                >
                  {opt.label} ({opt.value})
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const DesignerInventoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitErrors, setSubmitErrors] = useState([]);
  const [loadItem, setLoadItem] = useState(isEdit);
  /** Admin-only field; shown read-only on edit. */
  const [readOnlyListed, setReadOnlyListed] = useState(null);
  const [loadItemErrors, setLoadItemErrors] = useState([]);
  const [productTypeOptions, setProductTypeOptions] = useState([]);
  const [fitTypeOptions, setFitTypeOptions] = useState([]);
  const [colorCodeOptions, setColorCodeOptions] = useState([]);
  const [sizeChartTemplates, setSizeChartTemplates] = useState([]);
  const [selectedSizeChartTemplateId, setSelectedSizeChartTemplateId] = useState("");
  const [sizeChartTemplateLoading, setSizeChartTemplateLoading] = useState(false);
  const [sizeChartTemplateError, setSizeChartTemplateError] = useState("");
  const [listingTemplates, setListingTemplates] = useState([]);
  const [selectedDescListingTemplateId, setSelectedDescListingTemplateId] = useState("");
  const [selectedCareListingTemplateId, setSelectedCareListingTemplateId] = useState("");
  const [listingTemplateLoading, setListingTemplateLoading] = useState(false);
  const [listingTemplateError, setListingTemplateError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeLoadError, setCodeLoadError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [sizeChartCategory, setSizeChartCategory] = useState("upper");
  const [createMode, setCreateMode] = useState("scratch");
  const [importItems, setImportItems] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedImportItemId, setSelectedImportItemId] = useState("");
  const [form, setForm] = useState({
    StyleNumber: "",
    styleName: "",
    designerName: "",
    employeeId: "",
    longDescription: "",
    shortDescription: "",
    metaTitle: "",
    metaDescription: "",
    metaTagsStr: "",
    productType: "",
    productTypeCode: "",
    fitType: "",
    gender: "men",
    defaultColor: "",
    mrp: 0,
    discountPrice: 0,
    fabric: emptyFabric(),
    costs: emptyCosts(),
    care: emptyCare(),
    variants: [emptyVariant()],
    sizeCharts: emptySizeCharts(),
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoadItem(true);
      setLoadItemErrors([]);
      try {
        const res = await getDesignerItemById(id);
        if (res?.success && res.data) {
          const d = res.data;
          setReadOnlyListed(Boolean(d.isListed));
          setForm(mapDesignerItemToForm(d));
        } else {
          setLoadItemErrors(
            extractBackendMessages(res || { message: "Could not load item." }),
          );
        }
      } catch (e) {
        setLoadItemErrors(extractBackendMessages(e));
      } finally {
        setLoadItem(false);
      }
    })();
  }, [id, isEdit]);

  /** Prefill designer-facing fields from auth profile when creating a new item. */
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await designerApi.getProfile();
        if (cancelled || !res?.success) return;
        const d = res.data;
        if (!d || typeof d !== "object") return;
        setForm((s) => ({
          ...s,
          designerName: d.name || s.designerName,
          employeeId: d.employeeId || s.employeeId,
        }));
      } catch {
        /* not logged in as designer or profile unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || createMode !== "import") return;
    (async () => {
      setImportLoading(true);
      try {
        const res = await designerApi.listInventory({
          page: 1,
          limit: 100,
        });
        const payload = res?.data ?? {};
        const items = Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload.inventory)
            ? payload.inventory
            : [];
        setImportItems(items);
      } catch (err) {
        setSubmitErrors(extractBackendMessages(err));
      } finally {
        setImportLoading(false);
      }
    })();
  }, [isEdit, createMode]);

  const importSelectedItem = async () => {
    if (!selectedImportItemId) {
      setSubmitErrors(["Select an item to import first."]);
      return;
    }
    setLoading(true);
    setSubmitErrors([]);
    try {
      const res = await getDesignerItemById(selectedImportItemId);
      const d = res?.data;
      if (!d) throw new Error("Could not load selected item.");
      setForm(mapImportedDesignerItemToForm(d));
    } catch (err) {
      setSubmitErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
    }
  };

  /** When CATEGORY options load (and edit fetch finished), infer missing `productTypeCode` from legacy `productType` and sync display name. */
  useEffect(() => {
    if (productTypeOptions.length === 0 || loadItem) return;
    setForm((s) => {
      let code = String(s.productTypeCode || "").trim();
      if (!code) {
        code = inferProductTypeCodeFromLegacy(
          s.productType,
          productTypeOptions,
        );
      }
      if (!code) return s;
      const opt = productTypeOptions.find((o) => o.value === code);
      const name = opt?.label || s.productType;
      if (s.productTypeCode === code && s.productType === name) return s;
      return { ...s, productTypeCode: code, productType: name };
    });
  }, [productTypeOptions, loadItem]);

  useEffect(() => {
    (async () => {
      setCodeLoading(true);
      setCodeLoadError("");
      try {
        const [categoryRes, fitRes, colorRes] = await Promise.all([
          getDesignerInventoryCodes({ type: "CATEGORY", limit: 200 }),
          getDesignerInventoryCodes({ type: "FIT", limit: 200 }),
          getDesignerInventoryCodes({ type: "COLOR", limit: 200 }),
        ]);

        const categoryOptions = normalizeCodeOptionsResponse(categoryRes);
        const fitOptions = normalizeCodeOptionsResponse(fitRes);
        const colorOptions = normalizeCodeOptionsResponse(colorRes);

        setProductTypeOptions(categoryOptions);
        setFitTypeOptions(fitOptions);
        setColorCodeOptions(colorOptions);
      } catch (err) {
        console.error(
          "[DesignerInventoryForm] Failed to load code options:",
          err,
        );
        setCodeLoadError(
          extractBackendMessages(err)?.[0] ||
            "Could not load product/fit/color codes.",
        );
      } finally {
        setCodeLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setSizeChartTemplateLoading(true);
      setSizeChartTemplateError("");
      try {
        const res = await listDesignerSizeCharts({ page: 1, limit: 100, isActive: true });
        if (res?.success) {
          setSizeChartTemplates(res?.data?.items || []);
        } else {
          setSizeChartTemplateError("Could not load size chart templates.");
        }
      } catch {
        setSizeChartTemplateError("Could not load size chart templates.");
      } finally {
        setSizeChartTemplateLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setListingTemplateLoading(true);
      setListingTemplateError("");
      try {
        const res = await listDesignerListingTemplates({ page: 1, limit: 100, isActive: true });
        if (res?.success) {
          setListingTemplates(res?.data?.items || []);
        } else {
          setListingTemplateError("Could not load listing templates.");
        }
      } catch {
        setListingTemplateError("Could not load listing templates.");
      } finally {
        setListingTemplateLoading(false);
      }
    })();
  }, []);

  const setFabric = (k, v) =>
    setForm((s) => ({ ...s, fabric: { ...s.fabric, [k]: v } }));
  const setCosts = (k, v) =>
    setForm((s) => ({ ...s, costs: { ...s.costs, [k]: v } }));
  const setCareDescription = (value) =>
    setForm((s) => ({
      ...s,
      care: { ...(s.care || emptyCare()), description: value },
    }));

  const addCareInstruction = () =>
    setForm((s) => ({
      ...s,
      care: {
        ...(s.care || emptyCare()),
        instructions: [
          ...((s.care && Array.isArray(s.care.instructions)
            ? s.care.instructions
            : [])),
          emptyCareInstruction(),
        ],
      },
    }));

  const updateCareInstruction = (index, key, value) =>
    setForm((s) => {
      const current = (s.care && Array.isArray(s.care.instructions)
        ? s.care.instructions
        : []
      ).slice();
      const prev = current[index] || emptyCareInstruction();
      current[index] = { ...prev, [key]: value };
      return { ...s, care: { ...(s.care || emptyCare()), instructions: current } };
    });

  const removeCareInstruction = (index) =>
    setForm((s) => ({
      ...s,
      care: {
        ...(s.care || emptyCare()),
        instructions: (s.care?.instructions || []).filter((_, i) => i !== index),
      },
    }));

  const updateVariant = (idx, fn) =>
    setForm((s) => {
      const variants = [...s.variants];
      variants[idx] = fn(variants[idx]);
      return { ...s, variants };
    });

  const addVariant = () =>
    setForm((s) => ({ ...s, variants: [...s.variants, emptyVariant()] }));
  const removeVariant = (idx) =>
    setForm((s) => ({
      ...s,
      variants:
        s.variants.length > 1
          ? s.variants.filter((_, i) => i !== idx)
          : s.variants,
    }));

  const addSize = (vIdx) =>
    updateVariant(vIdx, (v) => ({ ...v, sizes: [...v.sizes, emptySize()] }));
  const removeSize = (vIdx, sIdx) =>
    updateVariant(vIdx, (v) => ({
      ...v,
      sizes:
        v.sizes.length > 1 ? v.sizes.filter((_, i) => i !== sIdx) : v.sizes,
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

  // Size chart handlers — `side` is "in" | "cm" (matches API `sizeCharts`)
  const addSizeChartHeader = (side) => {
    setForm((s) => ({
      ...s,
      sizeCharts: {
        ...s.sizeCharts,
        [side]: {
          ...s.sizeCharts[side],
          headers: [
            ...(s.sizeCharts[side].headers || []),
            { key: "", label: "" },
          ],
        },
      },
    }));
  };

  const defaultLabelSuffix = (side) => (side === "cm" ? " (cm)" : " (in)");

  const updateSizeChartHeader = (side, index, field, value) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
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
            pretty.charAt(0).toUpperCase() +
            pretty.slice(1) +
            defaultLabelSuffix(side);
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
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: { ...chart, headers: newHeaders },
        },
      };
    });
  };

  const removeSizeChartHeader = (side, index) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            headers: (chart.headers || []).filter((_, i) => i !== index),
          },
        },
      };
    });
  };

  const addSizeChartRow = (side) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const measurements = {};
      (chart.headers || []).forEach((h) => {
        if (h.key) measurements[h.key] = "";
      });
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            rows: [...(chart.rows || []), { size: "", measurements }],
          },
        },
      };
    });
  };

  const updateSizeChartRow = (side, rowIndex, field, value) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
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
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: { ...chart, rows: newRows },
        },
      };
    });
  };

  const removeSizeChartRow = (side, index) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
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
    setForm((s) => {
      const chart = s.sizeCharts[side];
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: {
            ...chart,
            measureImages: [...(chart.measureImages || []), ...next],
          },
        },
      };
    });
  };

  const removeSizeChartImage = (side, index) => {
    setForm((s) => {
      const chart = s.sizeCharts[side];
      const imgs = [...(chart.measureImages || [])];
      imgs.splice(index, 1);
      return {
        ...s,
        sizeCharts: {
          ...s.sizeCharts,
          [side]: { ...chart, measureImages: imgs },
        },
      };
    });
  };

  const applySizeChartPreset = () => {
    const genderKey = SIZE_CHART_PRESETS[form.gender] ? form.gender : "unisex";
    const preset = SIZE_CHART_PRESETS[genderKey]?.[sizeChartCategory];
    if (!preset) return;
    setForm((s) => ({
      ...s,
      sizeCharts: mergeSizeChartsWithPreset(s.sizeCharts, preset),
    }));
  };

  const applyExistingSizeChartTemplate = async () => {
    if (!selectedSizeChartTemplateId) return;
    setLoading(true);
    setSubmitErrors([]);
    try {
      const res = await getDesignerSizeChartById(selectedSizeChartTemplateId);
      const row = res?.data || res?.template || null;
      if (!row) throw new Error("Template data not found.");
      setForm((s) => ({
        ...s,
        sizeCharts: loadSizeChartsFromDesignerItem(row),
      }));
    } catch (err) {
      setSubmitErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
    }
  };

  const applyListingTemplateDescriptions = async () => {
    if (!selectedDescListingTemplateId) return;
    setLoading(true);
    setSubmitErrors([]);
    try {
      const res = await getDesignerListingTemplateById(selectedDescListingTemplateId);
      const row = res?.data;
      if (!row) throw new Error("Template not found.");
      setForm((s) => ({
        ...s,
        shortDescription: row.shortDescription ?? s.shortDescription,
        longDescription: row.longDescription ?? s.longDescription,
        metaTitle: row.metaTitle ?? s.metaTitle,
        metaDescription: row.metaDescription ?? s.metaDescription,
        metaTagsStr:
          Array.isArray(row.metaTags) && row.metaTags.some((t) => String(t || "").trim())
            ? row.metaTags.map((t) => String(t || "").trim()).filter(Boolean).join(", ")
            : s.metaTagsStr,
      }));
    } catch (err) {
      setSubmitErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
    }
  };

  const applyListingTemplateCare = async () => {
    if (!selectedCareListingTemplateId) return;
    setLoading(true);
    setSubmitErrors([]);
    try {
      const res = await getDesignerListingTemplateById(selectedCareListingTemplateId);
      const row = res?.data;
      if (!row) throw new Error("Template not found.");
      const care = row.care && typeof row.care === "object" ? row.care : {};
      const instructions = Array.isArray(care.instructions)
        ? care.instructions.map((inst) => {
            let iconKey = inst?.iconKey || "";
            let iconUrl = String(inst?.iconUrl || "").trim();
            if (iconKey && !iconUrl) {
              const opt = CARE_ICON_OPTIONS.find((o) => o.iconKey === iconKey);
              if (opt) iconUrl = String(opt.iconUrl || "");
            }
            return {
              iconUrl,
              iconKey,
              text: inst?.text || "",
              iconFile: null,
            };
          })
        : [];
      setForm((s) => ({
        ...s,
        care: {
          description: care.description || "",
          instructions,
        },
      }));
    } catch (err) {
      setSubmitErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
    }
  };

  const buildVariantsForPayload = () =>
    form.variants.map((variant) => {
      const imgs = Array.isArray(variant.images) ? variant.images : [];
      return {
        color: {
          ...variant.color,
          totalImages: imgs.length,
          isMultipleImages: imgs.length > 1,
        },
        sizes: (variant.sizes || []).map((s) => ({
          ...s,
          plannedQty: toNumberOrZero(s.plannedQty),
          producedQty: toNumberOrZero(s.producedQty),
        })),
        images: imgs.map((img, idx) => {
          if (isLocalPickedFile(img)) return { order: idx + 1 };
          if (typeof img === "string" && img)
            return { order: idx + 1, url: img };
          if (img && typeof img === "object" && img.url) {
            return {
              order: idx + 1,
              url: img.url,
              imageKey: img.imageKey || "",
            };
          }
          return { order: idx + 1 };
        }),
      };
    });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitErrors([]);
    try {
      const careDescription = String(form.care?.description || "").trim();
      const careInstructions = Array.isArray(form.care?.instructions)
        ? form.care.instructions
        : [];
      if (!careDescription) {
        throw new Error("Care description is required.");
      }
      if (careInstructions.length === 0) {
        throw new Error("Add at least one care instruction.");
      }
      for (let i = 0; i < careInstructions.length; i += 1) {
        const inst = careInstructions[i] || {};
        if (!String(inst.text || "").trim()) {
          throw new Error(`Care instruction ${i + 1}: text is required.`);
        }
        const hasIconRef = String(inst.iconKey || "").trim().length > 0;
        const hasIconFile = isLocalPickedFile(inst.iconFile);
        const hasIconUrl = String(inst.iconUrl || "").trim().length > 0;
        if (!hasIconRef && !hasIconFile && !hasIconUrl) {
          throw new Error(
            `Care instruction ${i + 1}: icon is required (select reference icon or upload custom icon).`,
          );
        }
      }

      const employeeId = String(form.employeeId || "").trim();
      if (!employeeId) {
        throw new Error("Employee ID is required.");
      }

      const formData = new FormData();
      formData.append("StyleNumber", form.StyleNumber);
      formData.append("styleName", form.styleName || "");
      formData.append("designerName", form.designerName);
      formData.append("employeeId", employeeId);
      formData.append("longDescription", form.longDescription || "");
      formData.append("shortDescription", form.shortDescription || "");
      formData.append("metaTitle", form.metaTitle || "");
      formData.append("metaDescription", form.metaDescription || "");
      formData.append("metaTags", form.metaTagsStr || "");
      formData.append("productType", form.productType);
      const productTypeCode = String(form.productTypeCode || "").trim().toUpperCase();
      if (!productTypeCode) {
        throw new Error(
          "Product type code is required. Select a category from the list or enter the CATEGORY code if the list is empty.",
        );
      }
      formData.append("productTypeCode", productTypeCode);
      formData.append("fitType", form.fitType);
      formData.append("gender", form.gender);
      formData.append("defaultColor", form.defaultColor || "");
      formData.append("mrp", String(toNumberOrZero(form.mrp)));
      formData.append(
        "discountPrice",
        String(toNumberOrZero(form.discountPrice)),
      );
      const normalizedFabric = {
        ...form.fabric,
        gsm: toNumberOrZero(form.fabric?.gsm),
        meter: toNumberOrZero(form.fabric?.meter),
        costPerMeter: toNumberOrZero(form.fabric?.costPerMeter),
      };
      const normalizedCosts = {
        ...form.costs,
        trimCost: toNumberOrZero(form.costs?.trimCost),
        stitchingCost: toNumberOrZero(form.costs?.stitchingCost),
        finishingCost: toNumberOrZero(form.costs?.finishingCost),
      };

      formData.append("fabric", JSON.stringify(normalizedFabric));
      formData.append("costs", JSON.stringify(normalizedCosts));
      const payloadCareInstructions = (form.care?.instructions || []).map((inst) => ({
        text: inst?.text || "",
        iconKey: inst?.iconKey || "",
        iconUrl: inst?.iconUrl || "",
      }));
      formData.append(
        "care",
        JSON.stringify({
          description: careDescription,
          instructions: payloadCareInstructions,
        }),
      );
      formData.append("variants", JSON.stringify(buildVariantsForPayload()));

      const buildChartPayload = (side) => {
        const chart = form.sizeCharts[side];
        const cleanedHeaders = (chart.headers || []).filter(
          (h) => h && h.key && String(h.key).trim(),
        );
        const headerKeys = cleanedHeaders.map((h) => String(h.key).trim());
        const cleanedRows = (chart.rows || [])
          .filter((row) => {
            if (!row || !row.size || !String(row.size).trim()) return false;
            const measurements = row.measurements || {};
            return headerKeys.every((key) =>
              Number.isFinite(Number(measurements[key])),
            );
          })
          .map((row) => ({
            size: String(row.size).trim(),
            measurements: headerKeys.reduce((acc, key) => {
              acc[key] = Number(row.measurements?.[key]);
              return acc;
            }, {}),
          }));
        const cleanedMeasureImage = (chart.measureImages || [])
          .map((img, idx) => {
            if (isLocalPickedFile(img)) {
              return {
                imageKey: `${side === "in" ? "measureImagesIn" : "measureImagesCm"}/${idx}`,
              };
            }
            if (typeof img === "string" && String(img).trim()) {
              return { url: String(img).trim() };
            }
            if (img && typeof img === "object") {
              const url = String(img.url || "").trim();
              const imageKey = String(img.imageKey || "").trim();
              const isUploadSlotPlaceholder =
                imageKey.startsWith("measureImagesIn/") ||
                imageKey.startsWith("measureImagesCm/");
              if (url || (imageKey && !isUploadSlotPlaceholder)) {
                return { url, imageKey };
              }
            }
            return null;
          })
          .filter(Boolean);
        return {
          headers: cleanedHeaders,
          rows: cleanedRows,
          measureImage: cleanedMeasureImage,
        };
      };

      const sizeChartsPayload = {
        in: buildChartPayload("in"),
        cm: buildChartPayload("cm"),
      };
      if (
        !chartMeetsRequirement(sizeChartsPayload.in) &&
        !chartMeetsRequirement(sizeChartsPayload.cm)
      ) {
        throw new Error(
          "Size chart must have headers, at least one complete row (all measurement columns numeric), and at least one measure image in IN or CM.",
        );
      }
      formData.append("sizeCharts", JSON.stringify(sizeChartsPayload));
      if (selectedSizeChartTemplateId) {
        formData.append("sizeChartTemplateId", selectedSizeChartTemplateId);
      }

      (form.sizeCharts.in.measureImages || []).forEach((img) => {
        if (isLocalPickedFile(img)) formData.append("measureImagesIn", img);
      });
      (form.sizeCharts.cm.measureImages || []).forEach((img) => {
        if (isLocalPickedFile(img)) formData.append("measureImagesCm", img);
      });

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

      (form.care?.instructions || []).forEach((inst, idx) => {
        if (isLocalPickedFile(inst?.iconFile)) {
          formData.append(`careInstructionIcons[${idx}]`, inst.iconFile);
        }
      });

      if (isEdit) await updateDesignerItem(id, formData);
      else await createDesignerItem(formData);
      navigate("/designer/inventory");
    } catch (err) {
      const msgs = extractBackendMessages(err);
      setSubmitErrors(
        msgs.length
          ? msgs
          : ["Save failed. Check required fields and inventory codes."],
      );
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

  if (isEdit && loadItemErrors.length > 0) {
    return (
      <div className="max-w-2xl space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-semibold">Could not load this item</p>
        <ul className="list-disc space-y-1 pl-5">
          {loadItemErrors.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
        <button
          type="button"
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-rose-800 hover:bg-rose-100"
          onClick={() => navigate("/designer/inventory")}
        >
          Back to inventory
        </button>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const activePreset =
    SIZE_CHART_PRESETS[form.gender]?.[sizeChartCategory] ||
    SIZE_CHART_PRESETS.unisex?.[sizeChartCategory];
  const chartStatus = (() => {
    const normalizePreview = (side) => {
      const chart = form.sizeCharts?.[side] || {};
      const headers = (chart.headers || []).filter(
        (h) => h && String(h.key || "").trim(),
      );
      const keys = headers.map((h) => String(h.key).trim());
      const rows = (chart.rows || [])
        .filter((row) => row && String(row.size || "").trim())
        .map((row) => ({
          size: String(row.size || "").trim(),
          measurements: keys.reduce((acc, key) => {
            acc[key] = Number(row.measurements?.[key]);
            return acc;
          }, {}),
        }));
      const measureImage = (chart.measureImages || [])
        .map((img) => {
          if (isLocalPickedFile(img)) return { imageKey: "local-upload" };
          if (typeof img === "string" && String(img).trim()) {
            return { url: String(img).trim() };
          }
          if (img && typeof img === "object") {
            const url = String(img.url || "").trim();
            const imageKey = String(img.imageKey || "").trim();
            const isUploadSlotPlaceholder =
              imageKey.startsWith("measureImagesIn/") ||
              imageKey.startsWith("measureImagesCm/");
            if (url || (imageKey && !isUploadSlotPlaceholder)) {
              return { url, imageKey };
            }
          }
          return null;
        })
        .filter(Boolean);
      return { headers, rows, measureImage };
    };
    const inValid = chartMeetsRequirement(normalizePreview("in"));
    const cmValid = chartMeetsRequirement(normalizePreview("cm"));
    return { inValid, cmValid, anyValid: inValid || cmValid };
  })();
  const steps = [
    { id: 1, label: "Core" },
    { id: 2, label: "Fabric & Costs" },
    { id: 3, label: "Care" },
    { id: 4, label: "Variants" },
    { id: 5, label: "Size Chart & Save" },
  ];
  const validateStep = (step) => {
    if (step === 1) {
      const errors = [];
      if (!String(form.StyleNumber || "").trim()) errors.push("Style number is required.");
      if (!String(form.styleName || "").trim()) errors.push("Style name is required.");
      if (!String(form.designerName || "").trim()) errors.push("Designer name is required.");
      if (!String(form.employeeId || "").trim()) errors.push("Employee ID is required.");
      if (!String(form.productTypeCode || "").trim()) {
        errors.push("Product type code is required.");
      }
      if (!String(form.fitType || "").trim()) errors.push("Fit type is required.");
      if (!String(form.shortDescription || "").trim()) {
        errors.push("Short description is required.");
      }
      if (!String(form.longDescription || "").trim()) {
        errors.push("Long description is required.");
      }
      return errors;
    }
    if (step === 2) return [];
    if (step === 3) {
      const errors = [];
      if (!String(form.care?.description || "").trim()) {
        errors.push("Care description is required.");
      }
      const instructions = Array.isArray(form.care?.instructions)
        ? form.care.instructions
        : [];
      if (instructions.length === 0) {
        errors.push("Add at least one care instruction.");
      }
      instructions.forEach((inst, idx) => {
        if (!String(inst?.text || "").trim()) {
          errors.push(`Care instruction ${idx + 1}: text is required.`);
        }
        const hasIconRef = String(inst?.iconKey || "").trim().length > 0;
        const hasIconFile = isLocalPickedFile(inst?.iconFile);
        const hasIconUrl = String(inst?.iconUrl || "").trim().length > 0;
        if (!hasIconRef && !hasIconFile && !hasIconUrl) {
          errors.push(`Care instruction ${idx + 1}: icon is required.`);
        }
      });
      return errors;
    }
    if (step === 4) {
      const errors = [];
      const variants = Array.isArray(form.variants) ? form.variants : [];
      if (variants.length === 0) errors.push("Add at least one variant.");
      variants.forEach((variant, idx) => {
        if (!String(variant?.color?.name || "").trim()) {
          errors.push(`Variant ${idx + 1}: color name is required.`);
        }
        if (!String(variant?.color?.hex || "").trim()) {
          errors.push(`Variant ${idx + 1}: color hex is required.`);
        }
        const sizes = Array.isArray(variant?.sizes) ? variant.sizes : [];
        if (sizes.length === 0) {
          errors.push(`Variant ${idx + 1}: add at least one size.`);
        }
        sizes.forEach((s, sIdx) => {
          if (!String(s?.size || "").trim()) {
            errors.push(`Variant ${idx + 1} size ${sIdx + 1}: size is required.`);
          }
        });
      });
      return errors;
    }
    if (step === 5) {
      return chartStatus.anyValid
        ? []
        : [
            "Size chart must be valid in IN or CM (headers, complete numeric rows, and at least one image).",
          ];
    }
    return [];
  };
  const canMoveToStep = (targetStep) => {
    if (targetStep <= currentStep) return true;
    for (let s = 1; s < targetStep; s += 1) {
      const errors = validateStep(s);
      if (errors.length > 0) {
        setSubmitErrors(errors);
        setCurrentStep(s);
        return false;
      }
    }
    return true;
  };
  const goToStep = (targetStep) => {
    setSubmitErrors([]);
    if (canMoveToStep(targetStep)) {
      setCurrentStep(targetStep);
    }
  };
  const goNextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setSubmitErrors(errors);
      return;
    }
    setSubmitErrors([]);
    setCurrentStep((s) => Math.min(steps.length, s + 1));
  };
  const stepErrors = {
    1: validateStep(1),
    2: validateStep(2),
    3: validateStep(3),
    4: validateStep(4),
    5: validateStep(5),
  };
  const isStepComplete = (stepId) => (stepErrors[stepId] || []).length === 0;

  return (
    <div className="max-w-6xl space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {isEdit ? "Edit item" : "Create item"}
        </h1>
        <p className="text-xs text-gray-500">
          All fields sync with designer inventory on the server. Pick a category
          code for product type; the display name is taken from inventory codes.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/25 p-3 shadow-sm"
      >
        {submitErrors.length > 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p className="font-semibold text-rose-950">
              Could not save — please fix the following:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-800">
              {submitErrors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {codeLoadError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {codeLoadError} You can still type values manually.
          </div>
        ) : null}
        <div className="rounded-lg border border-indigo-100 bg-white p-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-900">
              Step {currentStep} of {steps.length}
            </p>
            <p className="text-xs text-gray-600">{steps[currentStep - 1]?.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                  currentStep === step.id
                    ? "bg-indigo-600 text-white"
                    : isStepComplete(step.id)
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {step.label}
                  {isStepComplete(step.id) ? (
                    <span
                      className={`text-[10px] ${
                        currentStep === step.id ? "text-emerald-100" : "text-emerald-700"
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
        {!isEdit && currentStep === 1 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="mb-2 text-xs font-semibold text-slate-800">
              Create mode
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateMode("scratch")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  createMode === "scratch"
                    ? "border-indigo-300 bg-indigo-100 text-indigo-900"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Create from scratch
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("import")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  createMode === "import"
                    ? "border-indigo-300 bg-indigo-100 text-indigo-900"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Import existing
              </button>
            </div>
            {createMode === "import" ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  value={selectedImportItemId}
                  onChange={(e) => setSelectedImportItemId(e.target.value)}
                  disabled={importLoading}
                >
                  <option value="">
                    {importLoading
                      ? "Loading items..."
                      : "Select an existing item"}
                  </option>
                  {importItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.StyleNumber} - {item.styleName || "Untitled"} (
                      {item.productType || "No product type"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={importSelectedItem}
                  disabled={loading || importLoading || !selectedImportItemId}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import to form
                </button>
              </div>
            ) : null}
            {createMode === "import" ? (
              <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                Import copies short/long descriptions, fabric, costs, care, variants, and size
                charts. Per-size SKU and barcode are cleared so the server can assign new values.
              </p>
            ) : null}
          </div>
        ) : null}
        {currentStep === 1 ? (
          <>
        <h2 className="border-l-4 border-indigo-500 pl-2 text-sm font-semibold text-indigo-900">
          Core
        </h2>
        {isEdit && readOnlyListed !== null ? (
          <p className="text-xs text-gray-600">
            Catalog listing (set by admin):{" "}
            <span
              className={
                readOnlyListed ? "font-medium text-teal-800" : "text-gray-500"
              }
            >
              {readOnlyListed ? "Listed" : "Not listed"}
            </span>
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["StyleNumber", "Style number", true],
            ["styleName", "Style name", true],
            ["designerName", "Designer name", true],
            ["employeeId", "Employee ID", true],
          ].map(([key, label, req]) => (
            <div key={key}>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                {label}
              </label>
              <input
                className={fieldClass}
                value={form[key] || ""}
                onChange={(e) => {
                  const value =
                    key === "employeeId"
                      ? e.target.value.replace(/\s+/g, "")
                      : e.target.value;
                  setForm((s) => ({ ...s, [key]: value }));
                }}
                required={req}
              />
            </div>
          ))}
          {productTypeOptions.length === 0 && !codeLoading ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                Product type code (CATEGORY)
              </label>
              <input
                className={fieldClass}
                value={form.productTypeCode}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    productTypeCode: e.target.value.trim().toUpperCase(),
                  }))
                }
                required
                placeholder="e.g. SHIRT (must match active inventory CATEGORY code)"
              />
              <p className="mt-0.5 text-[11px] text-gray-500">
                No category list loaded — enter the code from admin inventory codes. Display name is set by the server from this code.
              </p>
            </div>
          ) : (
            <SearchableCodeSelect
              label="Product type"
              required
              value={form.productTypeCode}
              buttonDisplay={
                form.productType && form.productTypeCode
                  ? `${form.productType} (${form.productTypeCode})`
                  : form.productType || form.productTypeCode || ""
              }
              options={productTypeOptions}
              loading={codeLoading}
              placeholder="Select category code"
              onChange={(code) => {
                const opt = productTypeOptions.find((o) => o.value === code);
                setForm((s) => ({
                  ...s,
                  productTypeCode: code,
                  productType: opt?.label || (code ? s.productType : ""),
                }));
              }}
            />
          )}
          <SearchableCodeSelect
            label="Fit type"
            required
            value={form.fitType}
            options={fitTypeOptions}
            loading={codeLoading}
            placeholder="Select fit type"
            onChange={(val) => setForm((s) => ({ ...s, fitType: val }))}
          />
          <SearchableCodeSelect
            label="Color code"
            required={false}
            value={form.defaultColor}
            options={colorCodeOptions}
            loading={codeLoading}
            placeholder="Select color code"
            onChange={(val) => setForm((s) => ({ ...s, defaultColor: val }))}
          />
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Gender
            </label>
            <select
              className={fieldClass}
              value={form.gender}
              onChange={(e) =>
                setForm((s) => ({ ...s, gender: e.target.value }))
              }
            >
              <option value="men">men</option>
              <option value="women">women</option>
              <option value="unisex">unisex</option>
              <option value="kids">kids</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              MRP
            </label>
            <input
              type="number"
              min="0"
              className={fieldClass}
              value={form.mrp}
              onChange={(e) => setForm((s) => ({ ...s, mrp: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Discount price
            </label>
            <input
              type="number"
              min="0"
              className={fieldClass}
              value={form.discountPrice}
              onChange={(e) =>
                setForm((s) => ({ ...s, discountPrice: e.target.value }))
              }
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Short Description
            </label>
            <input
              className={fieldClass}
              value={form.shortDescription}
              onChange={(e) =>
                setForm((s) => ({ ...s, shortDescription: e.target.value }))
              }
              placeholder="Enter short description (1-2 lines)"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Long Description
            </label>
            <textarea
              className={fieldClass + " min-h-[56px]"}
              rows={2}
              value={form.longDescription}
              onChange={(e) =>
                setForm((s) => ({ ...s, longDescription: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Meta title (SEO)
            </label>
            <input
              className={fieldClass}
              value={form.metaTitle}
              onChange={(e) =>
                setForm((s) => ({ ...s, metaTitle: e.target.value }))
              }
              placeholder="Optional page title for storefront / search"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Meta description (SEO)
            </label>
            <textarea
              className={fieldClass + " min-h-[48px]"}
              rows={2}
              value={form.metaDescription}
              onChange={(e) =>
                setForm((s) => ({ ...s, metaDescription: e.target.value }))
              }
              placeholder="Optional meta description"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Tags
            </label>
            <input
              className={fieldClass}
              value={form.metaTagsStr}
              onChange={(e) =>
                setForm((s) => ({ ...s, metaTagsStr: e.target.value }))
              }
              placeholder="Comma or semicolon separated (e.g. cotton, summer, kurta)"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-violet-100 bg-violet-50/50 p-2">
            <p className="mb-1 text-xs font-semibold text-violet-900">
              {"Listing template — descriptions & SEO"}
            </p>
            <p className="mb-2 text-[11px] text-violet-800/90">
              Create and edit saved snippets in the sidebar under{" "}
              <span className="font-medium">Listing templates</span> (short/long copy, meta title/description/tags,
              care — same pattern as size chart templates).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                  Use saved template
                </label>
                <select
                  className={fieldClass}
                  value={selectedDescListingTemplateId}
                  onChange={(e) => setSelectedDescListingTemplateId(e.target.value)}
                  disabled={listingTemplateLoading}
                >
                  <option value="">
                    {listingTemplateLoading ? "Loading…" : "Select template"}
                  </option>
                  {listingTemplates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={applyListingTemplateDescriptions}
                disabled={!selectedDescListingTemplateId || listingTemplateLoading || loading}
                className="rounded-lg border border-violet-300 bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {"Apply descriptions & SEO"}
              </button>
            </div>
            {listingTemplateError ? (
              <p className="mt-1 text-[11px] text-rose-700">{listingTemplateError}</p>
            ) : null}
          </div>
        </div>
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
        <h2 className="border-l-4 border-emerald-500 pl-2 text-sm font-semibold text-emerald-900">
          Fabric
        </h2>
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
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                {label}
              </label>
              <input
                type={type}
                className={fieldClass}
                value={form.fabric[k]}
                onChange={(e) =>
                  setFabric(
                    k,
                    type === "number" ? e.target.value : e.target.value,
                  )
                }
              />
            </div>
          ))}
        </div>

        <h2 className="border-l-4 border-violet-500 pl-2 text-sm font-semibold text-violet-900">
          Costs
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {[
            ["trimCost", "Trim"],
            ["stitchingCost", "Stitching"],
            ["finishingCost", "Finishing"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                {label}
              </label>
              <input
                type="number"
                className={fieldClass}
                value={form.costs[k]}
                onChange={(e) => setCosts(k, e.target.value)}
              />
            </div>
          ))}
        </div>
          </>
        ) : null}

        {currentStep === 3 ? (
          <>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-2">
          <p className="mb-1 text-xs font-semibold text-cyan-900">Listing template — care</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                Use saved template
              </label>
              <select
                className={fieldClass}
                value={selectedCareListingTemplateId}
                onChange={(e) => setSelectedCareListingTemplateId(e.target.value)}
                disabled={listingTemplateLoading}
              >
                <option value="">
                  {listingTemplateLoading ? "Loading…" : "Select template"}
                </option>
                {listingTemplates.map((tpl) => (
                  <option key={tpl._id} value={tpl._id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyListingTemplateCare}
              disabled={!selectedCareListingTemplateId || listingTemplateLoading || loading}
              className="rounded-lg border border-cyan-400 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Apply to care
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="border-l-4 border-cyan-500 pl-2 text-sm font-semibold text-cyan-900">
            Care
          </h2>
          <button
            type="button"
            onClick={addCareInstruction}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-900 hover:bg-cyan-100"
          >
            <Plus size={14} /> Instruction
          </button>
        </div>
        <div className="space-y-2 rounded-lg border border-cyan-100 bg-cyan-50/30 p-2">
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">
              Care description
            </label>
            <textarea
              className={fieldClass + " min-h-[52px]"}
              rows={2}
              value={form.care?.description || ""}
              onChange={(e) => setCareDescription(e.target.value)}
              required
              placeholder="Proper care will help maintain fabric quality and color."
            />
          </div>

          {(form.care?.instructions || []).length === 0 ? (
            <p className="rounded-md bg-white p-2 text-xs text-gray-500">
              Add at least one care instruction.
            </p>
          ) : (
            <div className="space-y-2">
              {(form.care?.instructions || []).map((inst, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-cyan-100 bg-white p-2"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-cyan-900">
                      Instruction {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCareInstruction(idx)}
                      className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        Text
                      </label>
                      <input
                        className={fieldClass}
                        value={inst?.text || ""}
                        onChange={(e) =>
                          updateCareInstruction(idx, "text", e.target.value)
                        }
                        required
                        placeholder="Machine wash cold"
                      />
                    </div>

                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        Icon reference (optional)
                      </label>
                      <select
                        className={fieldClass}
                        value={
                          CARE_ICON_OPTIONS.some((row) => row.iconKey === (inst?.iconKey || ""))
                            ? inst?.iconKey || ""
                            : ""
                        }
                        onChange={(e) => {
                          const key = e.target.value;
                          const opt = CARE_ICON_OPTIONS.find(
                            (row) => row.iconKey === key,
                          );
                          updateCareInstruction(idx, "iconKey", key);
                          updateCareInstruction(
                            idx,
                            "iconUrl",
                            opt?.iconUrl || inst?.iconUrl || "",
                          );
                          if (key) updateCareInstruction(idx, "iconFile", null);
                        }}
                        required={!inst?.iconFile && !inst?.iconUrl}
                      >
                        <option value="">Select icon</option>
                        {CARE_ICON_OPTIONS.map((opt) => (
                          <option key={opt.iconKey} value={opt.iconKey}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700">
                        Or upload custom icon (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className={fieldClass}
                        required={!inst?.iconKey && !inst?.iconUrl}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateCareInstruction(idx, "iconFile", file);
                          if (file) {
                            updateCareInstruction(idx, "iconKey", "");
                            updateCareInstruction(idx, "iconUrl", "");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {(inst?.iconFile || inst?.iconUrl) && (
                    <div className="mt-2 flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
                      <img
                        src={
                          inst?.iconFile
                            ? URL.createObjectURL(inst.iconFile)
                            : inst.iconUrl
                        }
                        alt=""
                        className="h-8 w-8 rounded border border-gray-200 bg-white p-1 object-contain"
                      />
                      <span className="truncate text-xs text-gray-600">
                        {inst?.iconFile?.name ||
                          inst?.iconKey ||
                          "Selected icon"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        ) : null}

        {currentStep === 4 ? (
          <>
        <div className="flex items-center justify-between gap-2">
          <h2 className="border-l-4 border-amber-500 pl-2 text-sm font-semibold text-amber-900">
            Variants & sizes
          </h2>
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
                  <span className="text-xs font-semibold text-amber-900">
                    Variant {vIdx + 1}
                  </span>
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
                    {colorCodeOptions.length > 0 ? (
                      <SearchableCodeSelect
                        label="Color name"
                        required
                        value={variant.color.name}
                        options={colorCodeOptions}
                        loading={codeLoading}
                        placeholder="Select color code"
                        onChange={(val) =>
                          updateVariant(vIdx, (v) => ({
                            ...v,
                            color: { ...v.color, name: val },
                          }))
                        }
                      />
                    ) : (
                      <>
                        <label className="mb-0.5 block text-xs text-gray-600">
                          Color name
                        </label>
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
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs text-gray-600">
                      Hex
                    </label>
                    <input
                      className={fieldClass}
                      value={variant.color.hex}
                      onChange={(e) =>
                        updateVariant(vIdx, (v) => ({
                          ...v,
                          color: {
                            ...v.color,
                            hex: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="mb-2 rounded-md border border-amber-200/80 bg-white/60 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      Variant images
                    </span>
                    <label className="relative inline-flex cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                      <ImagePlus
                        size={14}
                        className="pointer-events-none shrink-0"
                      />
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
                    <p className="text-xs text-gray-500">
                      No images yet — add photos for this color (same flow as
                      main inventory).
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto rounded-md border border-amber-100/90 bg-white/90 p-2">
                      <ul className="flex flex-wrap gap-2">
                        {displayImages.map(({ img, originalIndex }) => (
                          <li
                            key={previewKeyForImage(img, originalIndex)}
                            className="relative shrink-0"
                          >
                            <VariantImagePreview image={img} />
                            <button
                              type="button"
                              onClick={() =>
                                removeVariantImage(vIdx, originalIndex)
                              }
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
                    <span className="text-xs font-medium text-gray-700">
                      Sizes
                    </span>
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
                                    sizes[sIdx] = {
                                      ...sizes[sIdx],
                                      size: e.target.value.toUpperCase(),
                                    };
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
                                    sizes[sIdx] = {
                                      ...sizes[sIdx],
                                      sku: e.target.value,
                                    };
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
                                    sizes[sIdx] = {
                                      ...sizes[sIdx],
                                      barcode: e.target.value,
                                    };
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
                                    sizes[sIdx] = {
                                      ...sizes[sIdx],
                                      plannedQty: e.target.value,
                                    };
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
                                    sizes[sIdx] = {
                                      ...sizes[sIdx],
                                      producedQty: e.target.value,
                                    };
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
          </>
        ) : null}

        {/* Size Chart */}
        {currentStep === 5 ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-indigo-900">Size Chart</h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  chartStatus.inValid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                IN {chartStatus.inValid ? "valid" : "missing"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  chartStatus.cmValid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                CM {chartStatus.cmValid ? "valid" : "missing"}
              </span>
            </div>
          </div>
          {!chartStatus.anyValid ? (
            <p className="mt-1 text-xs text-amber-800">
              Add complete chart data on IN or CM: headers, numeric values for each
              measurement column, and at least one measure image.
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                Units
              </label>
              <input
                className={fieldClass + " bg-gray-50 text-gray-700"}
                value="Both (in & cm)"
                readOnly
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">
                Garment type ({form.gender})
              </label>
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
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={applySizeChartPreset}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
              >
                Apply preset (fills in + cm tables)
              </button>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-indigo-200 bg-white p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                  Use existing size chart template
                </label>
                <select
                  className={fieldClass}
                  value={selectedSizeChartTemplateId}
                  onChange={(e) => setSelectedSizeChartTemplateId(e.target.value)}
                  disabled={sizeChartTemplateLoading}
                >
                  <option value="">
                    {sizeChartTemplateLoading ? "Loading templates..." : "Select template"}
                  </option>
                  {sizeChartTemplates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={applyExistingSizeChartTemplate}
                  disabled={!selectedSizeChartTemplateId || sizeChartTemplateLoading || loading}
                  className="rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Apply template
                </button>
              </div>
            </div>
            {sizeChartTemplateError ? (
              <p className="mt-1 text-xs text-rose-700">{sizeChartTemplateError}</p>
            ) : null}
          </div>

          <div className="mt-3 rounded-lg border border-indigo-100 bg-white/90 p-2">
            <p className="mb-2 text-xs font-medium text-gray-700">
              Template preview ({form.gender} -{" "}
              {garmentPresetCategoryLabel(sizeChartCategory)})
            </p>
            <p className="mb-1 text-[11px] font-semibold text-gray-700">
              Inches (in)
            </p>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 font-semibold text-gray-700">
                      Measurement
                    </th>
                    {(activePreset.sizes || []).map((sz) => (
                      <th
                        key={sz}
                        className="p-2 text-center font-semibold text-gray-700"
                      >
                        {sz}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activePreset.headers || []).map((h, rowIdx) => (
                    <tr
                      key={`${h.key}-${rowIdx}`}
                      className="border-t border-gray-100"
                    >
                      <td className="p-2 font-medium text-gray-800">
                        {h.label || h.key}
                      </td>
                      {(activePreset.sizes || []).map((sz, colIdx) => {
                        const values = activePreset.sampleValues?.[h.key] || [];
                        const cell = values[colIdx] ?? "—";
                        return (
                          <td
                            key={`${h.key}-${sz}-${colIdx}`}
                            className="p-2 text-center text-gray-700"
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 mb-1 text-[11px] font-semibold text-gray-700">
              Centimeters (cm)
            </p>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 font-semibold text-gray-700">
                      Measurement
                    </th>
                    {(activePreset.sizes || []).map((sz) => (
                      <th
                        key={`cm-${sz}`}
                        className="p-2 text-center font-semibold text-gray-700"
                      >
                        {sz}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activePreset.headers || []).map((h, rowIdx) => (
                    <tr
                      key={`cm-${h.key}-${rowIdx}`}
                      className="border-t border-gray-100"
                    >
                      <td className="p-2 font-medium text-gray-800">
                        {String(h.label || h.key || "")
                          .replace("(in/cm)", "(cm)")
                          .replace("(in)", "(cm)")}
                      </td>
                      {(activePreset.sizes || []).map((sz, colIdx) => {
                        const values = activePreset.sampleValues?.[h.key] || [];
                        const cell = values[colIdx] ?? "";
                        const cmCell = cell ? inchesToCmText(cell) : "—";
                        return (
                          <td
                            key={`cm-${h.key}-${sz}-${colIdx}`}
                            className="p-2 text-center text-gray-700"
                          >
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

          {["in", "cm"].map((side) => {
            const chart = form.sizeCharts[side];
            const sideTitle =
              side === "in" ? "Inches (in)" : "Centimeters (cm)";
            const labelPh =
              side === "in"
                ? "Label (e.g. Chest (in))"
                : "Label (e.g. Chest (cm))";
            return (
              <div
                key={side}
                className="mt-4 rounded-lg border border-indigo-200/80 bg-white/70 p-3 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-indigo-950">
                    {sideTitle}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addSizeChartHeader(side)}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      + Header
                    </button>
                    <button
                      type="button"
                      onClick={() => addSizeChartRow(side)}
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
                    >
                      + Row
                    </button>
                  </div>
                </div>

                {chart.headers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg p-3">
                    No headers for this table yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chart.headers.map((header, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row gap-2 items-stretch bg-white/80 border border-gray-200 rounded-lg p-2"
                      >
                        <input
                          className={fieldClass}
                          value={header.key}
                          placeholder="Key (e.g. chest, length)"
                          onChange={(e) =>
                            updateSizeChartHeader(
                              side,
                              idx,
                              "key",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          className={fieldClass}
                          value={header.label}
                          placeholder={labelPh}
                          onChange={(e) =>
                            updateSizeChartHeader(
                              side,
                              idx,
                              "label",
                              e.target.value,
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeSizeChartHeader(side, idx)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {chart.rows.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg p-3">
                    No size rows for this table yet
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {chart.rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="border border-gray-200 rounded-lg bg-white/80 p-2 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                          <input
                            className={fieldClass}
                            value={row.size}
                            placeholder="Size (e.g. S, M, L)"
                            onChange={(e) =>
                              updateSizeChartRow(
                                side,
                                rowIndex,
                                "size",
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeSizeChartRow(side, rowIndex)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(chart.headers || []).map((h) => (
                            <input
                              key={h.key}
                              type="number"
                              step="any"
                              className={fieldClass}
                              value={row.measurements?.[h.key] ?? ""}
                              placeholder={h.label || h.key}
                              onChange={(e) =>
                                updateSizeChartRow(
                                  side,
                                  rowIndex,
                                  h.key,
                                  e.target.value,
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-700">
                      Measurement images (
                      {side === "in" ? "measureImagesIn" : "measureImagesCm"})
                    </h4>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                      + Add
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          addSizeChartImages(side, e.target.files)
                        }
                      />
                    </label>
                  </div>
                  {chart.measureImages.length === 0 ? (
                    <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg p-3">
                      No images for this unit
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {chart.measureImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={
                              isLocalPickedFile(img)
                                ? URL.createObjectURL(img)
                                : typeof img === "string"
                                  ? img
                                  : img?.url || ""
                            }
                            alt=""
                            className="aspect-square object-cover rounded-xl border border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeSizeChartImage(side, idx)}
                            className="absolute top-2 right-2 bg-rose-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
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
        </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1 || loading}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Back
          </button>
          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={goNextStep}
              disabled={loading}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DesignerInventoryForm;
