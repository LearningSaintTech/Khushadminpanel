import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import {
  createDesignerItem,
  getDesignerInventoryCodes,
  getDesignerItemById,
  updateDesignerItem,
} from "../../apis/designerApi";
import { extractBackendMessages } from "../../../admin/utils/extractBackendMessages";
import {
  SIZE_CHART_PRESETS,
  inchesToCmText,
  mergeSizeChartsWithPreset,
} from "../../../utils/sizeChartPresets.js";

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
  return measureImage.map((img) => img?.url || img);
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

const toNumberOrZero = (value) => {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
    .filter((row, idx, arr) => arr.findIndex((x) => x.value === row.value) === idx);
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
          opt.value.toLowerCase().includes(normalizedSearch)
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
      <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
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
              <div className="px-2 py-2 text-xs text-gray-500">No matching options</div>
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
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeLoadError, setCodeLoadError] = useState("");
  const [sizeChartCategory, setSizeChartCategory] = useState("upper");
  const [form, setForm] = useState({
    StyleNumber: "",
    styleName: "",
    designerName: "",
    employeeId: "",
    description: "",
    productType: "",
    productTypeCode: "",
    fitType: "",
    gender: "men",
    defaultColor: "",
    mrp: 0,
    discountPrice: 0,
    fabric: emptyFabric(),
    costs: emptyCosts(),
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
          setForm({
            StyleNumber: d.StyleNumber || "",
            styleName: d.styleName || "",
            designerName: d.designerName || "",
            employeeId: d.employeeId || "",
            description: d.description || "",
            productType: d.productType || "",
            productTypeCode:
              d.productTypeCode || d.skuCodeInputs?.productTypeCode || "",
            fitType: d.fitType || "",
            gender: d.gender || "men",
            defaultColor: d.defaultColor || "",
            mrp: d.mrp ?? 0,
            discountPrice: d.discountPrice ?? 0,
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
            sizeCharts: loadSizeChartsFromDesignerItem(d),
          });
        } else {
          setLoadItemErrors(extractBackendMessages(res || { message: "Could not load item." }));
        }
      } catch (e) {
        setLoadItemErrors(extractBackendMessages(e));
      } finally {
        setLoadItem(false);
      }
    })();
  }, [id, isEdit]);

  /** When CATEGORY options load (and edit fetch finished), infer missing `productTypeCode` from legacy `productType` and sync display name. */
  useEffect(() => {
    if (productTypeOptions.length === 0 || loadItem) return;
    setForm((s) => {
      let code = String(s.productTypeCode || "").trim();
      if (!code) {
        code = inferProductTypeCodeFromLegacy(s.productType, productTypeOptions);
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
        console.error("[DesignerInventoryForm] Failed to load code options:", err);
        setCodeLoadError(
          extractBackendMessages(err)?.[0] || "Could not load product/fit/color codes."
        );
      } finally {
        setCodeLoading(false);
      }
    })();
  }, []);

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

  // Size chart handlers — `side` is "in" | "cm" (matches API `sizeCharts`)
  const addSizeChartHeader = (side) => {
    setForm((s) => ({
      ...s,
      sizeCharts: {
        ...s.sizeCharts,
        [side]: {
          ...s.sizeCharts[side],
          headers: [...(s.sizeCharts[side].headers || []), { key: "", label: "" }],
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
          header.label = pretty.charAt(0).toUpperCase() + pretty.slice(1) + defaultLabelSuffix(side);
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
    setSubmitErrors([]);
    try {
      const formData = new FormData();
      formData.append("StyleNumber", form.StyleNumber);
      formData.append("styleName", form.styleName || "");
      formData.append("designerName", form.designerName);
      formData.append("employeeId", form.employeeId);
      formData.append("description", form.description || "");
      formData.append("productTypeCode", String(form.productTypeCode || "").trim());
      if (String(form.productType || "").trim()) {
        formData.append("productType", String(form.productType).trim());
      }
      formData.append("fitType", form.fitType);
      formData.append("gender", form.gender);
      formData.append("defaultColor", form.defaultColor || "");
      formData.append("mrp", String(toNumberOrZero(form.mrp)));
      formData.append("discountPrice", String(toNumberOrZero(form.discountPrice)));
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
      formData.append("variants", JSON.stringify(buildVariantsForPayload()));

      const buildChartPayload = (side) => {
        const chart = form.sizeCharts[side];
        const cleanedHeaders = (chart.headers || []).filter(
          (h) => h && h.key && String(h.key).trim()
        );
        const cleanedRows = (chart.rows || [])
          .filter((row) => {
            if (!row || !row.size || !String(row.size).trim()) return false;
            const measurements = row.measurements || {};
            return Object.values(measurements).some(
              (val) => val !== "" && val !== null && val !== undefined
            );
          })
          .map((row) => ({
            size: row.size,
            measurements: row.measurements || {},
          }));
        return {
          headers: cleanedHeaders,
          rows: cleanedRows,
          measureImage: (chart.measureImages || []).map((_, idx) => ({
            imageKey: `${side === "in" ? "measureImagesIn" : "measureImagesCm"}/${idx}`,
          })),
        };
      };

      const sizeChartsPayload = {
        in: buildChartPayload("in"),
        cm: buildChartPayload("cm"),
      };
      formData.append("sizeCharts", JSON.stringify(sizeChartsPayload));

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

      if (isEdit) await updateDesignerItem(id, formData);
      else await createDesignerItem(formData);
      navigate("/designer/inventory");
    } catch (err) {
      const msgs = extractBackendMessages(err);
      setSubmitErrors(msgs.length ? msgs : ["Save failed. Check required fields and inventory codes."]);
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

  return (
    <div className="max-w-6xl space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{isEdit ? "Edit item" : "Create item"}</h1>
        <p className="text-xs text-gray-500">
          All fields sync with designer inventory on the server. Pick a category code for product type; the display
          name is taken from inventory codes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/25 p-3 shadow-sm">
        {submitErrors.length > 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p className="font-semibold text-rose-950">Could not save — please fix the following:</p>
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
        <h2 className="border-l-4 border-indigo-500 pl-2 text-sm font-semibold text-indigo-900">Core</h2>
        {isEdit && readOnlyListed !== null ? (
          <p className="text-xs text-gray-600">
            Catalog listing (set by admin):{" "}
            <span className={readOnlyListed ? "font-medium text-teal-800" : "text-gray-500"}>
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
              <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
              <input
                className={fieldClass}
                value={form[key] || ""}
                onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
                required={req}
              />
            </div>
          ))}
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
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">MRP</label>
            <input
              type="number"
              min="0"
              className={fieldClass}
              value={form.mrp}
              onChange={(e) => setForm((s) => ({ ...s, mrp: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-gray-700">Discount price</label>
            <input
              type="number"
              min="0"
              className={fieldClass}
              value={form.discountPrice}
              onChange={(e) => setForm((s) => ({ ...s, discountPrice: e.target.value }))}
            />
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
                onChange={(e) => setFabric(k, type === "number" ? e.target.value : e.target.value)}
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
                onChange={(e) => setCosts(k, e.target.value)}
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
                    </>
                  )}
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
                                  sizes[sIdx] = { ...sizes[sIdx], plannedQty: e.target.value };
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
                                  sizes[sIdx] = { ...sizes[sIdx], producedQty: e.target.value };
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

        {/* Size Chart */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
          <h2 className="text-sm font-semibold text-indigo-900">Size Chart</h2>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-gray-700">Units</label>
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

          <div className="mt-3 rounded-lg border border-indigo-100 bg-white/90 p-2">
            <p className="mb-2 text-xs font-medium text-gray-700">
              Template preview ({form.gender} - {sizeChartCategory})
            </p>
            <p className="mb-1 text-[11px] font-semibold text-gray-700">Inches (in)</p>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 font-semibold text-gray-700">Measurement</th>
                    {(activePreset.sizes || []).map((sz) => (
                      <th key={sz} className="p-2 text-center font-semibold text-gray-700">
                        {sz}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activePreset.headers || []).map((h, rowIdx) => (
                    <tr key={`${h.key}-${rowIdx}`} className="border-t border-gray-100">
                      <td className="p-2 font-medium text-gray-800">{h.label || h.key}</td>
                      {(activePreset.sizes || []).map((sz, colIdx) => {
                        const values = activePreset.sampleValues?.[h.key] || [];
                        const cell = values[colIdx] ?? "—";
                        return (
                          <td key={`${h.key}-${sz}-${colIdx}`} className="p-2 text-center text-gray-700">
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 mb-1 text-[11px] font-semibold text-gray-700">Centimeters (cm)</p>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 font-semibold text-gray-700">Measurement</th>
                    {(activePreset.sizes || []).map((sz) => (
                      <th key={`cm-${sz}`} className="p-2 text-center font-semibold text-gray-700">
                        {sz}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activePreset.headers || []).map((h, rowIdx) => (
                    <tr key={`cm-${h.key}-${rowIdx}`} className="border-t border-gray-100">
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
                          <td key={`cm-${h.key}-${sz}-${colIdx}`} className="p-2 text-center text-gray-700">
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

          {(["in", "cm"]).map((side) => {
            const chart = form.sizeCharts[side];
            const sideTitle = side === "in" ? "Inches (in)" : "Centimeters (cm)";
            const labelPh =
              side === "in" ? "Label (e.g. Chest (in))" : "Label (e.g. Chest (cm))";
            return (
              <div
                key={side}
                className="mt-4 rounded-lg border border-indigo-200/80 bg-white/70 p-3 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-indigo-950">{sideTitle}</h3>
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
                          onChange={(e) => updateSizeChartHeader(side, idx, "key", e.target.value)}
                        />
                        <input
                          className={fieldClass}
                          value={header.label}
                          placeholder={labelPh}
                          onChange={(e) => updateSizeChartHeader(side, idx, "label", e.target.value)}
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
                              updateSizeChartRow(side, rowIndex, "size", e.target.value)
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
                                updateSizeChartRow(side, rowIndex, h.key, e.target.value)
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
                      Measurement images ({side === "in" ? "measureImagesIn" : "measureImagesCm"})
                    </h4>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                      + Add
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addSizeChartImages(side, e.target.files)}
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

