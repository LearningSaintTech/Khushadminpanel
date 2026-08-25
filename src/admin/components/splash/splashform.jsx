import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crop, Loader2, Trash2, X, ZoomIn } from "lucide-react";
import {
  createBanner,
  updateBanner,
  getSingleBanner,
} from "../../apis/homebannerapi";
import { getAllCategories } from "../../apis/categoryapi";
import { getSubcategoriesByCategory } from "../../apis/subcategoryapis";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

const LOG = "[BannerForm]";
const DEFAULT_CROP = { x: 5, y: 5, w: 90, h: 90 };

const BANNER_TYPES = [
  { value: "NORMAL", label: "Normal" },
  { value: "CATEGORY", label: "Category" },
  { value: "SUBCATEGORY", label: "Subcategory" },
  { value: "PROMO", label: "Promo" },
  { value: "PERCENT", label: "Percent" },
  { value: "FLAT", label: "Flat" },
  { value: "FLASH", label: "Flash" },
];

const DISCOUNT_TYPES = [
  { value: "PERCENT", label: "Percent (%)" },
  { value: "FLAT", label: "Flat (₹)" },
  { value: "FLASH", label: "Flash deal" },
];

/** Three distinct media slots matching Banner schema. */
const MEDIA_SLOTS = [
  {
    key: "desktop",
    field: "desktopBanner",
    label: "Desktop banner",
    hint: "Wide landscape for desktop / large screens",
    placeholder: "Upload desktop images or one video",
  },
  {
    key: "mobile",
    field: "mobileBanner",
    label: "App mobile banner",
    hint: "Native app mobile viewport (portrait-friendly)",
    placeholder: "Upload app mobile images or one video",
  },
  {
    key: "websiteMobile",
    field: "websiteMobileBanner",
    label: "Website mobile banner",
    hint: "Responsive website / m-site (separate from app)",
    placeholder: "Upload website-mobile images or one video",
  },
];

const emptyMediaMap = () =>
  MEDIA_SLOTS.reduce((acc, slot) => {
    acc[slot.key] = [];
    return acc;
  }, {});

const fieldClass =
  "block w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function FormSection({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-2.5 border-b border-border pb-2">
        <h2 className="text-xs font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-[10px] text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-0.5 text-[10px] text-stone-400">{hint}</p> : null}
    </div>
  );
}

function normalizeBannerItems(media) {
  if (!media) return [];
  if (Array.isArray(media.items)) {
    return media.items.filter((item) => item?.url || item?.key);
  }
  if (media.url) return [{ url: media.url, key: media.key }];
  return [];
}

function getBannerItemKey(item) {
  if (!item) return null;
  return item.key || item.imageKey || item._id || null;
}

function collectBannerKeys(items) {
  return items.map(getBannerItemKey).filter(Boolean);
}

function parseBannerNavigation(raw) {
  if (raw == null || raw === "") {
    return { navigate: "", externalLink: "" };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return {
            navigate: String(parsed.navigate || parsed.path || ""),
            externalLink: String(parsed.externalLink || ""),
          };
        }
      } catch {
        /* plain path */
      }
    }
    return { navigate: trimmed, externalLink: "" };
  }
  return {
    navigate: String(raw.navigate || raw.path || ""),
    externalLink: String(raw.externalLink || ""),
  };
}

function appendBannerNavigation(formData, navigate, externalLink) {
  const payload = { navigate: navigate.trim() };
  if (externalLink.trim()) {
    payload.externalLink = externalLink.trim();
  }
  formData.append("navigation", JSON.stringify(payload));
  formData.append("navigation[navigate]", payload.navigate);
  if (payload.externalLink) {
    formData.append("navigation[externalLink]", payload.externalLink);
  }
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function inferMediaType(files, existingItems) {
  const fromFiles = files.some(
    (f) =>
      f?.type?.startsWith("video/") ||
      f?.name?.toLowerCase().endsWith(".mp4") ||
      f?.name?.toLowerCase().endsWith(".webm") ||
      f?.name?.toLowerCase().endsWith(".mov"),
  );
  if (fromFiles) return "video";
  const fromExisting = existingItems.some((item) =>
    /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(String(item?.url || "")),
  );
  if (fromExisting) return "video";
  if (files.length > 0 || existingItems.length > 0) return "image";
  return "";
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(String(url || ""));
}

function isVideoFile(file) {
  return (
    file?.type?.startsWith("video/") ||
    /\.(mp4|webm|mov)$/i.test(file?.name || "")
  );
}

function isSvgFile(file) {
  return (
    file?.type === "image/svg+xml" ||
    file?.name?.toLowerCase().endsWith(".svg")
  );
}

function loadImage(src, useCrossOrigin = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCrossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for crop"));
    img.src = src;
  });
}

function percentToPixels(nw, nh, pct) {
  const x = Math.max(0, Math.min(100, pct.x));
  const y = Math.max(0, Math.min(100, pct.y));
  const w = Math.max(1, Math.min(100 - x, pct.w));
  const h = Math.max(1, Math.min(100 - y, pct.h));
  return {
    x: Math.round((x / 100) * nw),
    y: Math.round((y / 100) * nh),
    width: Math.round((w / 100) * nw),
    height: Math.round((h / 100) * nh),
  };
}

async function cropImageToFile(src, cropPct, fileName, useCrossOrigin = false) {
  const img = await loadImage(src, useCrossOrigin);
  const { x, y, width, height } = percentToPixels(
    img.naturalWidth,
    img.naturalHeight,
    cropPct,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

  const mime =
    fileName?.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, 0.92),
  );
  if (!blob) throw new Error("Crop failed");
  return new File([blob], fileName || "cropped-banner.jpg", { type: mime });
}

function FormErrors({ errors, onDismiss }) {
  if (!errors?.length) return null;
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold text-danger">
          Please fix the following:
        </p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 text-danger hover:bg-danger/10"
            aria-label="Dismiss errors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-danger">
        {errors.map((msg, i) => (
          <li key={`${msg}-${i}`}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

const BannerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("NORMAL");
  const [discountType, setDiscountType] = useState("");
  const [discount, setDiscount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [navigation, setNavigation] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  const [mediaFiles, setMediaFiles] = useState(emptyMediaMap);
  const [mediaExisting, setMediaExisting] = useState(emptyMediaMap);
  const [mediaInitialKeys, setMediaInitialKeys] = useState(emptyMediaMap);

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [zoomPreview, setZoomPreview] = useState(null);
  const [cropSession, setCropSession] = useState(null);
  const [cropPct, setCropPct] = useState(DEFAULT_CROP);
  const [cropPreviewUrl, setCropPreviewUrl] = useState("");
  const [cropBusy, setCropBusy] = useState(false);
  const previewUrlRef = useRef("");

  const needsCategory = type === "CATEGORY" || type === "SUBCATEGORY";
  const needsSubcategory = type === "SUBCATEGORY";
  const needsDiscount =
    type === "PERCENT" || type === "FLAT" || type === "FLASH";

  const clearErrors = () => setFormErrors([]);
  const setErrors = (msgs) => {
    const list = Array.isArray(msgs) ? msgs : msgs ? [String(msgs)] : [];
    setFormErrors(list.filter(Boolean));
  };

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await getAllCategories(1, 500);
        const data = res?.data?.data || res?.data || {};
        const list = data.categories || data || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(`${LOG} loadCategories failed`, err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!needsCategory || !categoryId) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSubcategoriesLoading(true);
      try {
        const res = await getSubcategoriesByCategory(categoryId, 1, 500);
        if (cancelled) return;
        const data = res?.data?.data || res?.data || {};
        const list =
          data.subcategories || data.subCategories || data.items || data || [];
        setSubcategories(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(`${LOG} loadSubcategories failed`, err);
        if (!cancelled) setSubcategories([]);
      } finally {
        if (!cancelled) setSubcategoriesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [needsCategory, categoryId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchBanner = async () => {
      setLoading(true);
      clearErrors();
      try {
        const data = await getSingleBanner(id);
        if (cancelled) return;
        const banner = data?.data || data || {};

        setTitle(banner.title || "");
        setText(banner.text || "");
        setType(banner.type || "NORMAL");
        setDiscountType(banner.discountType || "");
        setDiscount(banner.discount != null ? String(banner.discount) : "");
        setStartDate(toDatetimeLocalValue(banner.startDate));
        setEndDate(toDatetimeLocalValue(banner.endDate));
        setIsActive(banner.isActive !== false);
        const nav = parseBannerNavigation(banner.navigation);
        setNavigation(nav.navigate);
        setExternalLink(nav.externalLink);

        const cat = banner.categoryId;
        setCategoryId(
          typeof cat === "string" ? cat : cat?._id ? String(cat._id) : "",
        );
        const sub = banner.subcategoryId;
        setSubcategoryId(
          typeof sub === "string" ? sub : sub?._id ? String(sub._id) : "",
        );

        const nextExisting = emptyMediaMap();
        const nextKeys = emptyMediaMap();
        MEDIA_SLOTS.forEach((slot) => {
          const items = normalizeBannerItems(banner[slot.field]);
          nextExisting[slot.key] = items;
          nextKeys[slot.key] = collectBannerKeys(items);
        });
        setMediaExisting(nextExisting);
        setMediaInitialKeys(nextKeys);
        setMediaFiles(emptyMediaMap());
      } catch (err) {
        if (!cancelled) setErrors(extractBackendMessages(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBanner();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mediaPreviews = useMemo(() => {
    const map = {};
    MEDIA_SLOTS.forEach((slot) => {
      map[slot.key] = (mediaFiles[slot.key] || []).map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
    });
    return map;
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      MEDIA_SLOTS.forEach((slot) => {
        (mediaPreviews[slot.key] || []).forEach((p) =>
          URL.revokeObjectURL(p.url),
        );
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [mediaPreviews]);

  const validateFiles = (files, label) => {
    if (files.length === 0) return null;
    if (files.length > 1 && files.some(isVideoFile)) {
      return `${label}: use images only when uploading multiple files (one video max).`;
    }
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        return `${label}: each file must be under 10MB.`;
      }
    }
    return null;
  };

  const handleMultiFileChange = (e, slotKey) => {
    const slot = MEDIA_SLOTS.find((s) => s.key === slotKey);
    const picked = Array.from(e.target.files || []);
    if (!picked.length || !slot) return;

    const err = validateFiles(picked, slot.label);
    if (err) {
      setErrors([err]);
      return;
    }

    setMediaFiles((prev) => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] || []), ...picked],
    }));
    clearErrors();
    e.target.value = "";
  };

  const appendBannerUpdateKeys = (formData, field, existingItems, initialKeys) => {
    const keepKeys = collectBannerKeys(existingItems);
    const removeKeys = initialKeys.filter((k) => !keepKeys.includes(k));
    const keepJson = JSON.stringify(keepKeys);
    const removeJson = JSON.stringify(removeKeys);

    formData.append(`${field}KeepKeys`, keepJson);
    if (removeKeys.length > 0) {
      formData.append(`${field}RemoveKeys`, removeJson);
    }

    const cap = field.charAt(0).toUpperCase() + field.slice(1);
    formData.append(`keep${cap}Keys`, keepJson);
    if (removeKeys.length > 0) {
      formData.append(`remove${cap}Keys`, removeJson);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("type", type);
    formData.append("isActive", String(isActive));
    if (text.trim()) formData.append("text", text.trim());

    if (discountType) formData.append("discountType", discountType);
    if (discount !== "") formData.append("discount", String(discount));

    const startIso = fromDatetimeLocalValue(startDate);
    const endIso = fromDatetimeLocalValue(endDate);
    if (startIso) formData.append("startDate", startIso);
    if (endIso) formData.append("endDate", endIso);

    appendBannerNavigation(formData, navigation, externalLink);

    if (needsCategory && categoryId) {
      formData.append("categoryId", categoryId);
    }
    if (needsSubcategory && subcategoryId) {
      formData.append("subcategoryId", subcategoryId);
    }

    MEDIA_SLOTS.forEach((slot) => {
      const files = mediaFiles[slot.key] || [];
      const existing = mediaExisting[slot.key] || [];
      const initialKeys = mediaInitialKeys[slot.key] || [];

      if (isEdit) {
        appendBannerUpdateKeys(formData, slot.field, existing, initialKeys);
      }

      const mediaType = inferMediaType(files, existing);
      if (mediaType) {
        formData.append(`${slot.field}Type`, mediaType);
        formData.append(`${slot.field}[type]`, mediaType);
      }

      files.forEach((file) => {
        formData.append(slot.field, file);
      });
    });

    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const clientErrors = [];
    if (!title.trim()) clientErrors.push("Title is required.");
    if (!type) clientErrors.push("Banner type is required.");
    if (needsCategory && !categoryId) {
      clientErrors.push("Select a category for this banner type.");
    }
    if (needsSubcategory && !subcategoryId) {
      clientErrors.push("Select a subcategory for SUBCATEGORY banners.");
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      clientErrors.push("End date must be after start date.");
    }

    const hasAnyMedia = MEDIA_SLOTS.some(
      (slot) =>
        (mediaFiles[slot.key] || []).length > 0 ||
        (mediaExisting[slot.key] || []).length > 0,
    );
    if (!hasAnyMedia) {
      clientErrors.push(
        isEdit
          ? "Keep at least one media item, or upload a new file."
          : "Upload media in at least one slot (desktop, app mobile, or website mobile).",
      );
    }

    MEDIA_SLOTS.forEach((slot) => {
      const err = validateFiles(mediaFiles[slot.key] || [], slot.label);
      if (err) clientErrors.push(err);
    });

    if (clientErrors.length) {
      setErrors(clientErrors);
      return;
    }

    const formData = buildFormData();
    setLoading(true);
    try {
      if (isEdit) {
        await updateBanner(id, formData);
      } else {
        await createBanner(formData);
      }
      navigate(`${basePath}/splash`);
    } catch (err) {
      setErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
    }
  };

  const openZoom = (url, name, isVideo = false) => {
    if (!url) return;
    setZoomPreview({ url, name: name || "Banner", isVideo });
  };

  const openCrop = (session) => {
    if (session.isVideo || session.isSvg) return;
    setCropPct(DEFAULT_CROP);
    setCropSession(session);
  };

  const closeCrop = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setCropPreviewUrl("");
    setCropSession(null);
    setCropBusy(false);
  };

  const updateCropPreview = useCallback(async () => {
    if (!cropSession?.src) return;
    try {
      const file = await cropImageToFile(
        cropSession.src,
        cropPct,
        cropSession.fileName,
        cropSession.useCrossOrigin,
      );
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setCropPreviewUrl(url);
    } catch {
      setCropPreviewUrl("");
    }
  }, [cropSession, cropPct]);

  useEffect(() => {
    if (!cropSession) return;
    const t = setTimeout(updateCropPreview, 200);
    return () => clearTimeout(t);
  }, [cropSession, cropPct, updateCropPreview]);

  const applyCrop = async () => {
    if (!cropSession) return;
    setCropBusy(true);
    clearErrors();
    try {
      const cropped = await cropImageToFile(
        cropSession.src,
        cropPct,
        cropSession.fileName,
        cropSession.useCrossOrigin,
      );
      const { bannerKey, kind, index } = cropSession;

      if (kind === "new") {
        setMediaFiles((prev) => ({
          ...prev,
          [bannerKey]: (prev[bannerKey] || []).map((f, i) =>
            i === index ? cropped : f,
          ),
        }));
      } else {
        setMediaFiles((prev) => ({
          ...prev,
          [bannerKey]: [...(prev[bannerKey] || []), cropped],
        }));
        setMediaExisting((prev) => ({
          ...prev,
          [bannerKey]: (prev[bannerKey] || []).filter((_, i) => i !== index),
        }));
      }
      closeCrop();
    } catch (err) {
      setErrors([
        "Could not crop image. If this is an existing CDN image, try re-uploading instead.",
        ...extractBackendMessages(err),
      ]);
      setCropBusy(false);
    }
  };

  const removeNewFile = (bannerKey, index) => {
    setMediaFiles((prev) => ({
      ...prev,
      [bannerKey]: (prev[bannerKey] || []).filter((_, i) => i !== index),
    }));
  };

  const removeExistingItem = (bannerKey, index) => {
    setMediaExisting((prev) => ({
      ...prev,
      [bannerKey]: (prev[bannerKey] || []).filter((_, i) => i !== index),
    }));
  };

  const renderThumb = ({
    src,
    isVideo,
    isSvg,
    label,
    onZoom,
    onCrop,
    onRemove,
    canCrop,
  }) => (
    <div className="group relative h-28 w-28 overflow-hidden rounded-xl border border-border bg-canvas-muted shadow-sm">
      {isVideo ? (
        <video src={src} className="h-full w-full object-cover" muted />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onZoom}
          className="rounded-lg bg-white/95 p-1.5 text-stone-800 shadow hover:bg-white"
          title="Zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        {canCrop && !isVideo && !isSvg && (
          <button
            type="button"
            onClick={onCrop}
            className="rounded-lg bg-white/95 p-1.5 text-stone-800 shadow hover:bg-white"
            title="Crop"
          >
            <Crop className="h-4 w-4" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg bg-danger/95 p-1.5 text-white shadow hover:opacity-90"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {label && (
        <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
          {label}
        </span>
      )}
    </div>
  );

  const renderMediaGrid = (slot) => {
    const existingItems = mediaExisting[slot.key] || [];
    const filePreviews = mediaPreviews[slot.key] || [];
    const mediaType = inferMediaType(mediaFiles[slot.key] || [], existingItems);

    return (
      <div
        key={slot.key}
        className="rounded-lg border border-border bg-canvas-muted/30 p-3"
      >
        <div className="mb-2">
          <p className="text-[11px] font-semibold text-stone-900">{slot.label}</p>
          <p className="text-[10px] text-stone-500">{slot.hint}</p>
          {mediaType ? (
            <span className="mt-1 inline-flex rounded-full border border-border bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-600">
              {mediaType}
            </span>
          ) : null}
        </div>

        <input
          type="file"
          name={slot.field}
          accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm"
          multiple
          onChange={(e) => handleMultiFileChange(e, slot.key)}
          className="block w-full text-[11px] text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="mt-1 text-[10px] text-stone-400">{slot.placeholder}</p>
        {isEdit ? (
          <p className="mt-1 text-[10px] text-brand-700">
            Kept server images stay. New files are appended. Remove only deletes.
          </p>
        ) : null}

        {(existingItems.length > 0 || filePreviews.length > 0) && (
          <p className="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10px] font-medium text-brand-900">
            {existingItems.length > 0 ? (
              <span>{existingItems.length} on server</span>
            ) : null}
            {filePreviews.length > 0 ? (
              <span>
                {existingItems.length > 0 ? " + " : ""}
                {filePreviews.length} new
              </span>
            ) : null}
            <span className="text-brand-700">
              {" "}
              = {existingItems.length + filePreviews.length} total
            </span>
          </p>
        )}

        {existingItems.length > 0 && (
          <div className="mt-2">
            <p className="mb-1.5 text-[10px] font-medium text-stone-600">
              On server ({existingItems.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {existingItems.map((item, idx) => {
                const video = isVideoUrl(item.url);
                return (
                  <React.Fragment key={`${item.key || item.url}-${idx}`}>
                    {renderThumb({
                      src: item.url,
                      isVideo: video,
                      isSvg: /\.svg(\?|#|$)/i.test(item.url || ""),
                      label: "Server",
                      onZoom: () =>
                        openZoom(item.url, `${slot.label} ${idx + 1}`, video),
                      onCrop: () =>
                        openCrop({
                          kind: "existing",
                          bannerKey: slot.key,
                          index: idx,
                          src: item.url,
                          fileName: `cropped-${slot.field}-${idx + 1}.jpg`,
                          useCrossOrigin: true,
                          isVideo: video,
                          isSvg: /\.svg(\?|#|$)/i.test(item.url || ""),
                        }),
                      onRemove: () => removeExistingItem(slot.key, idx),
                      canCrop: true,
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {filePreviews.length > 0 && (
          <div className="mt-2">
            <p className="mb-1.5 text-[10px] font-medium text-stone-600">
              New uploads ({filePreviews.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {filePreviews.map(({ file, url }, idx) => {
                const video = isVideoFile(file);
                const svg = isSvgFile(file);
                return (
                  <div key={`${file.name}-${idx}-${file.lastModified}`}>
                    {renderThumb({
                      src: url,
                      isVideo: video,
                      isSvg: svg,
                      label: file.name,
                      onZoom: () => openZoom(url, file.name, video),
                      onCrop: () =>
                        openCrop({
                          kind: "new",
                          bannerKey: slot.key,
                          index: idx,
                          src: url,
                          fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
                          useCrossOrigin: false,
                          isVideo: video,
                          isSvg: svg,
                        }),
                      onRemove: () => removeNewFile(slot.key, idx),
                      canCrop: true,
                    })}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setMediaFiles((prev) => ({ ...prev, [slot.key]: [] }))
              }
              className="mt-1.5 text-[10px] text-danger hover:underline"
            >
              Clear new {slot.label.toLowerCase()} files
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);
    if (nextType !== "CATEGORY" && nextType !== "SUBCATEGORY") {
      setCategoryId("");
      setSubcategoryId("");
    }
    if (nextType !== "SUBCATEGORY") {
      setSubcategoryId("");
    }
    if (nextType === "PERCENT" || nextType === "FLAT" || nextType === "FLASH") {
      setDiscountType(nextType);
    }
  };

  return (
    <div className="pb-20 text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/splash`)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-canvas-muted"
        >
          ← Back
        </button>
        <h1 className="text-base font-bold tracking-tight sm:text-lg">
          {isEdit ? "Edit homepage banner" : "Create homepage banner"}
        </h1>
      </div>

      <div className="mx-auto max-w-5xl">
        {loading && isEdit ? (
          <div className="flex justify-center gap-2 py-16 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormErrors errors={formErrors} onDismiss={clearErrors} />

            <FormSection
              title="Basics"
              hint="Core banner identity and status."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Title" required>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Summer Sale — Up to 40% off"
                    required
                  />
                </Field>
                <Field label="Banner type" required>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className={fieldClass}
                  >
                    {BANNER_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                label="Banner text"
                hint="Short supporting copy shown with the banner."
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`${fieldClass} min-h-[64px] resize-y`}
                  placeholder="e.g. Free shipping on orders above ₹999. Limited time only."
                  rows={3}
                />
              </Field>

              <label className="inline-flex items-center gap-2 text-[11px] text-stone-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                Active (visible to users)
              </label>
            </FormSection>

            {(needsCategory || needsDiscount) && (
              <FormSection
                title="Targeting & discount"
                hint="Shown based on banner type. Fill only what applies."
              >
                {needsCategory && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Field label="Category" required>
                      <select
                        value={categoryId}
                        onChange={(e) => {
                          setCategoryId(e.target.value);
                          setSubcategoryId("");
                        }}
                        disabled={categoriesLoading}
                        className={fieldClass}
                      >
                        <option value="">
                          {categoriesLoading
                            ? "Loading categories…"
                            : "Select category"}
                        </option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name || cat.title || "Unnamed"}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {needsSubcategory && (
                      <Field label="Subcategory" required>
                        <select
                          value={subcategoryId}
                          onChange={(e) => setSubcategoryId(e.target.value)}
                          disabled={!categoryId || subcategoriesLoading}
                          className={fieldClass}
                        >
                          <option value="">
                            {!categoryId
                              ? "Select category first"
                              : subcategoriesLoading
                                ? "Loading subcategories…"
                                : "Select subcategory"}
                          </option>
                          {subcategories.map((sub) => (
                            <option key={sub._id} value={sub._id}>
                              {sub.name || sub.title || "Unnamed"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </div>
                )}

                {needsDiscount ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Field
                      label="Discount type"
                      hint="Schema: PERCENT | FLAT | FLASH"
                    >
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">No discount type</option>
                        {DISCOUNT_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Discount value"
                      hint={
                        discountType === "FLAT"
                          ? "Amount in ₹"
                          : discountType === "PERCENT"
                            ? "Percentage 0–100"
                            : "Optional numeric value"
                      }
                    >
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        min="0"
                        step="0.01"
                        className={fieldClass}
                        placeholder={
                          discountType === "FLAT"
                            ? "e.g. 200"
                            : discountType === "PERCENT"
                              ? "e.g. 40"
                              : "e.g. 10"
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </FormSection>
            )}

            {!needsDiscount && (
              <FormSection
                title="Optional discount"
                hint="Optional even for NORMAL / CATEGORY / PROMO banners."
              >
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Field label="Discount type">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">No discount type</option>
                      {DISCOUNT_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Discount value">
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      min="0"
                      step="0.01"
                      className={fieldClass}
                      placeholder="e.g. 20"
                    />
                  </Field>
                </div>
              </FormSection>
            )}

            <FormSection
              title="Schedule"
              hint="Optional start / end window for this banner."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Start date">
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={fieldClass}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Navigation"
              hint="Where tapping the banner should go."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field
                  label="In-app path"
                  hint="navigation.navigate — e.g. /summer or /category/… "
                >
                  <input
                    type="text"
                    value={navigation}
                    onChange={(e) => setNavigation(e.target.value)}
                    className={fieldClass}
                    placeholder="/summer-sale"
                  />
                </Field>
                <Field
                  label="External link"
                  hint="navigation.externalLink — optional full URL"
                >
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className={fieldClass}
                    placeholder="https://example.com/campaign"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Media slots"
              hint="Three distinct slots from the Banner schema. Upload multiple images per slot, or one video."
            >
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {MEDIA_SLOTS.map((slot) => renderMediaGrid(slot))}
              </div>
            </FormSection>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-white/95 px-3 py-2 backdrop-blur-sm lg:left-[var(--sidebar-width,0)]">
              <div className="mx-auto flex max-w-5xl justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/splash`)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || cropBusy}
                  className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving…"
                    : isEdit
                      ? "Update banner"
                      : "Create banner"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {zoomPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setZoomPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoomPreview(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Close zoom"
          >
            <X className="h-7 w-7" />
          </button>
          <div
            className="flex max-h-[90vh] max-w-[95vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {zoomPreview.isVideo ? (
              <video
                src={zoomPreview.url}
                controls
                className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={zoomPreview.url}
                alt={zoomPreview.name}
                className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            )}
          </div>
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white">
            {zoomPreview.name}
          </p>
        </div>
      )}

      {cropSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <Crop className="h-5 w-5" />
                Crop banner
              </h2>
              <button
                type="button"
                onClick={closeCrop}
                className="rounded-lg p-2 text-stone-500 hover:bg-canvas-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="relative mx-auto aspect-video max-h-48 overflow-hidden rounded-xl bg-canvas-muted">
                <img
                  src={cropSession.src}
                  alt="Crop source"
                  className="h-full w-full object-contain"
                  crossOrigin={
                    cropSession.useCrossOrigin ? "anonymous" : undefined
                  }
                />
                <div
                  className="pointer-events-none absolute border-2 border-brand-500 bg-brand-500/20"
                  style={{
                    left: `${cropPct.x}%`,
                    top: `${cropPct.y}%`,
                    width: `${cropPct.w}%`,
                    height: `${cropPct.h}%`,
                  }}
                />
              </div>

              {[
                { key: "x", label: "Left %" },
                { key: "y", label: "Top %" },
                { key: "w", label: "Width %" },
                { key: "h", label: "Height %" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1 flex justify-between text-xs font-medium text-stone-600">
                    <span>{label}</span>
                    <span>{cropPct[key]}%</span>
                  </label>
                  <input
                    type="range"
                    min={key === "w" || key === "h" ? 10 : 0}
                    max={95}
                    value={cropPct[key]}
                    onChange={(e) =>
                      setCropPct((p) => ({
                        ...p,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-brand-600"
                  />
                </div>
              ))}

              {cropPreviewUrl && (
                <div>
                  <p className="mb-2 text-xs font-medium text-stone-600">
                    Preview
                  </p>
                  <img
                    src={cropPreviewUrl}
                    alt="Crop preview"
                    className="mx-auto max-h-32 rounded-lg border border-border object-contain"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={cropBusy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {cropBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Apply crop
                </button>
                <button
                  type="button"
                  onClick={closeCrop}
                  className="rounded-xl border border-border px-4 py-2.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerForm;
