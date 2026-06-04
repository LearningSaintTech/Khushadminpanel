import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crop, Loader2, Trash2, X, ZoomIn } from "lucide-react";
import {
  createBanner,
  updateBanner,
  getSingleBanner,
} from "../../apis/homebannerapi";
import { getAllCategories } from "../../apis/categoryapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { extractBackendMessages } from "../../utils/extractBackendMessages";

const LOG = "[BannerForm]";
const DEFAULT_CROP = { x: 5, y: 5, w: 90, h: 90 };

const fieldClass =
  "block w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-canvas-muted";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500";

function logFormDataEntries(formData, label = "FormData") {
  const entries = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      entries.push({
        key,
        fileName: value.name,
        size: value.size,
        type: value.type,
      });
    } else {
      entries.push({ key, value });
    }
  }
  console.log(`${LOG} ${label} entries (${entries.length}):`, entries);
}

function logBannerMediaState(label, state) {
  console.log(`${LOG} ${label}:`, state);
}

function normalizeBannerItems(media) {
  if (!media) return [];
  if (Array.isArray(media.items)) {
    return media.items.filter((item) => item?.url || item?.key);
  }
  if (media.url) return [{ url: media.url, key: media.key }];
  return [];
}

/** Stable id for keep/remove on update (prefer S3 key, fallback Mongo _id) */
function getBannerItemKey(item) {
  if (!item) return null;
  return item.key || item.imageKey || item._id || null;
}

function collectBannerKeys(items) {
  return items.map(getBannerItemKey).filter(Boolean);
}

/** Parse navigation whether API returns an object or a JSON string (legacy records). */
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
        /* plain path string */
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
  // Whole object — backend should replace `navigation` instead of dot-path $set
  formData.append("navigation", JSON.stringify(payload));
  formData.append("navigation[navigate]", payload.navigate);
  if (payload.externalLink) {
    formData.append("navigation[externalLink]", payload.externalLink);
  }
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(String(url || ""));
}

function isVideoFile(file) {
  return (
    file?.type?.startsWith("video/") ||
    file?.name?.toLowerCase().endsWith(".mp4")
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
  const [type, setType] = useState("NORMAL");
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discount, setDiscount] = useState("");
  const [navigation, setNavigation] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [desktopBannerFiles, setDesktopBannerFiles] = useState([]);
  const [desktopExistingItems, setDesktopExistingItems] = useState([]);
  const [initialDesktopKeys, setInitialDesktopKeys] = useState([]);
  const [mobileBannerFiles, setMobileBannerFiles] = useState([]);
  const [mobileExistingItems, setMobileExistingItems] = useState([]);
  const [initialMobileKeys, setInitialMobileKeys] = useState([]);

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [zoomPreview, setZoomPreview] = useState(null);
  const [cropSession, setCropSession] = useState(null);
  const [cropPct, setCropPct] = useState(DEFAULT_CROP);
  const [cropPreviewUrl, setCropPreviewUrl] = useState("");
  const [cropBusy, setCropBusy] = useState(false);
  const previewUrlRef = useRef("");

  const clearErrors = () => setFormErrors([]);

  const setErrors = (msgs) => {
    const list = Array.isArray(msgs) ? msgs : msgs ? [String(msgs)] : [];
    const filtered = list.filter(Boolean);
    if (filtered.length > 0) {
      console.warn(`${LOG} validation/API errors:`, filtered);
    }
    setFormErrors(filtered);
  };

  useEffect(() => {
    console.log(`${LOG} mount`, { mode: isEdit ? "edit" : "create", id: id || null });
  }, [isEdit, id]);

  useEffect(() => {
    const loadCategories = async () => {
      console.log(`${LOG} loadCategories start`);
      setCategoriesLoading(true);
      try {
        const res = await getAllCategories(1, 500);
        const data = res?.data?.data || res?.data || {};
        const list = data.categories || data || [];
        const final = Array.isArray(list) ? list : [];
        console.log(`${LOG} loadCategories success`, { count: final.length });
        setCategories(final);
      } catch (err) {
        console.error(`${LOG} loadCategories failed`, err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const fetchBanner = async () => {
      console.log(`${LOG} fetchBanner start`, { id });
      setLoading(true);
      clearErrors();
      try {
        const data = await getSingleBanner(id);
        if (cancelled) {
          console.log(`${LOG} fetchBanner skipped (stale)`, { id });
          return;
        }
        console.log(`${LOG} fetchBanner raw response:`, data);
        const banner = data?.data || data || {};
        console.log(`${LOG} fetchBanner parsed banner:`, banner);

        setTitle(banner.title || "");
        setType(banner.type || "NORMAL");
        setDiscountType(banner.discountType || "PERCENT");
        setDiscount(banner.discount != null ? String(banner.discount) : "");
        const nav = parseBannerNavigation(banner.navigation);
        setNavigation(nav.navigate);
        setExternalLink(nav.externalLink);

        const cat = banner.categoryId;
        setCategoryId(
          typeof cat === "string" ? cat : cat?._id ? String(cat._id) : "",
        );

        const desktopItems = normalizeBannerItems(banner.desktopBanner);
        const mobileItems = normalizeBannerItems(banner.mobileBanner);
        const deskKeys = collectBannerKeys(desktopItems);
        const mobKeys = collectBannerKeys(mobileItems);
        console.log(`${LOG} fetchBanner media`, {
          desktopCount: desktopItems.length,
          mobileCount: mobileItems.length,
          initialDesktopKeys: deskKeys,
          initialMobileKeys: mobKeys,
          desktopItems,
          mobileItems,
        });
        setDesktopExistingItems(desktopItems);
        setMobileExistingItems(mobileItems);
        setInitialDesktopKeys(deskKeys);
        setInitialMobileKeys(mobKeys);
        setDesktopBannerFiles([]);
        setMobileBannerFiles([]);
      } catch (err) {
        if (!cancelled) {
          console.error(`${LOG} fetchBanner failed`, err);
          setErrors(extractBackendMessages(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log(`${LOG} fetchBanner end`);
        }
      }
    };

    fetchBanner();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const desktopFilePreviews = useMemo(
    () =>
      desktopBannerFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [desktopBannerFiles],
  );

  const mobileFilePreviews = useMemo(
    () =>
      mobileBannerFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [mobileBannerFiles],
  );

  useEffect(() => {
    return () => {
      desktopFilePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      mobileFilePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [desktopFilePreviews, mobileFilePreviews]);

  const validateFiles = (files, label) => {
    if (files.length === 0) return null;
    if (files.length > 1 && files.some(isVideoFile)) {
      return `${label}: use images only when uploading multiple files (no video).`;
    }
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        return `${label}: each file must be under 10MB.`;
      }
    }
    return null;
  };

  const handleMultiFileChange = (e, setFiles, existingOnServerCount = 0) => {
    const picked = Array.from(e.target.files || []);
    const slot = e.target.name;
    console.log(`${LOG} handleMultiFileChange`, {
      slot,
      pickedCount: picked.length,
      existingOnServerCount,
      files: picked.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    });
    if (picked.length === 0) return;

    const label = slot === "desktopBanner" ? "Desktop" : "Mobile";
    const err = validateFiles(picked, label);
    if (err) {
      setErrors([err]);
      return;
    }

    setFiles((prev) => {
      const next = [...prev, ...picked];
      console.log(`${LOG} ${slot} media after add`, {
        newUploadsCount: next.length,
        existingOnServerCount,
        totalVisible: existingOnServerCount + next.length,
        newFileNames: next.map((f) => f.name),
      });
      return next;
    });
    clearErrors();
    e.target.value = "";
  };

  const appendBannerUpdateKeys = (formData, slot, existingItems, initialKeys) => {
    const keepKeys = collectBannerKeys(existingItems);
    const removeKeys = initialKeys.filter((k) => !keepKeys.includes(k));
    const keepJson = JSON.stringify(keepKeys);
    const removeJson = JSON.stringify(removeKeys);

    console.log(`${LOG} appendBannerUpdateKeys [${slot}]`, {
      initialKeys,
      keepKeys,
      removeKeys,
      existingCount: existingItems.length,
    });

    formData.append(`${slot}KeepKeys`, keepJson);
    if (removeKeys.length > 0) {
      formData.append(`${slot}RemoveKeys`, removeJson);
    }

    const cap = slot.charAt(0).toUpperCase() + slot.slice(1);
    formData.append(`keep${cap}Keys`, keepJson);
    if (removeKeys.length > 0) {
      formData.append(`remove${cap}Keys`, removeJson);
    }
  };

  const buildFormData = () => {
    console.log(`${LOG} buildFormData start`, { isEdit, id });
    logBannerMediaState("state before build", {
      desktopExisting: desktopExistingItems,
      mobileExisting: mobileExistingItems,
      initialDesktopKeys,
      initialMobileKeys,
      newDesktopFiles: desktopBannerFiles.map((f) => f.name),
      newMobileFiles: mobileBannerFiles.map((f) => f.name),
    });

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("type", type);
    formData.append("discountType", discountType);
    formData.append("discount", discount === "" ? "0" : String(discount));
    appendBannerNavigation(formData, navigation, externalLink);
    if (type === "CATEGORY" && categoryId) {
      formData.append("categoryId", categoryId);
    }

    if (isEdit) {
      appendBannerUpdateKeys(
        formData,
        "desktopBanner",
        desktopExistingItems,
        initialDesktopKeys,
      );
      appendBannerUpdateKeys(
        formData,
        "mobileBanner",
        mobileExistingItems,
        initialMobileKeys,
      );
    }

    desktopBannerFiles.forEach((file) => {
      formData.append("desktopBanner", file);
    });
    mobileBannerFiles.forEach((file) => {
      formData.append("mobileBanner", file);
    });

    logFormDataEntries(formData, isEdit ? "UPDATE payload" : "CREATE payload");
    console.log(`${LOG} buildFormData end`);
    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    console.log(`${LOG} handleSubmit start`, {
      isEdit,
      id,
      title,
      type,
      categoryId,
    });

    const clientErrors = [];
    if (!title.trim()) clientErrors.push("Title is required.");
    if (!navigation.trim()) {
      clientErrors.push("Navigation path is required (navigation.navigate / navigation[navigate]).");
    }
    if (type === "CATEGORY" && !categoryId) {
      clientErrors.push("Select a category for CATEGORY banners.");
    }

    const hasDesktop =
      desktopBannerFiles.length > 0 || desktopExistingItems.length > 0;
    const hasMobile =
      mobileBannerFiles.length > 0 || mobileExistingItems.length > 0;
    if (!hasDesktop && !hasMobile) {
      clientErrors.push(
        isEdit
          ? "Keep at least one desktop or mobile banner, or upload a new image."
          : "Upload at least one desktop or mobile banner image.",
      );
    }

    const desktopErr = validateFiles(desktopBannerFiles, "Desktop");
    const mobileErr = validateFiles(mobileBannerFiles, "Mobile");
    if (desktopErr) clientErrors.push(desktopErr);
    if (mobileErr) clientErrors.push(mobileErr);

    if (clientErrors.length) {
      console.warn(`${LOG} handleSubmit client validation failed`, clientErrors);
      setErrors(clientErrors);
      return;
    }

    console.log(`${LOG} handleSubmit validation passed`, {
      hasDesktop,
      hasMobile,
      desktopExistingCount: desktopExistingItems.length,
      mobileExistingCount: mobileExistingItems.length,
      newDesktopCount: desktopBannerFiles.length,
      newMobileCount: mobileBannerFiles.length,
    });

    const formData = buildFormData();

    setLoading(true);
    try {
      let response;
      if (isEdit) {
        console.log(`${LOG} calling updateBanner`, { id });
        response = await updateBanner(id, formData);
        console.log(`${LOG} updateBanner success`, response);
      } else {
        console.log(`${LOG} calling createBanner`);
        response = await createBanner(formData);
        console.log(`${LOG} createBanner success`, response);
      }
      navigate(`${basePath}/splash`);
    } catch (err) {
      console.error(`${LOG} handleSubmit failed`, {
        isEdit,
        id,
        err,
        messages: extractBackendMessages(err),
      });
      setErrors(extractBackendMessages(err));
    } finally {
      setLoading(false);
      console.log(`${LOG} handleSubmit end`);
    }
  };

  const openZoom = (url, name, isVideo = false) => {
    if (!url) return;
    console.log(`${LOG} openZoom`, { name, isVideo, url: url?.slice?.(0, 80) });
    setZoomPreview({ url, name: name || "Banner", isVideo });
  };

  const openCrop = (session) => {
    if (session.isVideo || session.isSvg) return;
    console.log(`${LOG} openCrop`, session);
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
    console.log(`${LOG} applyCrop start`, { cropSession, cropPct });
    setCropBusy(true);
    clearErrors();
    try {
      const cropped = await cropImageToFile(
        cropSession.src,
        cropPct,
        cropSession.fileName,
        cropSession.useCrossOrigin,
      );

      const setFiles =
        cropSession.bannerKey === "desktop"
          ? setDesktopBannerFiles
          : setMobileBannerFiles;
      const setExisting =
        cropSession.bannerKey === "desktop"
          ? setDesktopExistingItems
          : setMobileExistingItems;

      if (cropSession.kind === "new") {
        setFiles((prev) =>
          prev.map((f, i) => (i === cropSession.index ? cropped : f)),
        );
        console.log(`${LOG} applyCrop replaced new file at index`, cropSession.index);
      } else {
        setFiles((prev) => [...prev, cropped]);
        setExisting((prev) => prev.filter((_, i) => i !== cropSession.index));
        console.log(`${LOG} applyCrop moved existing to new uploads`, {
          bannerKey: cropSession.bannerKey,
          removedIndex: cropSession.index,
          croppedName: cropped.name,
        });
      }
      closeCrop();
    } catch (err) {
      console.error(`${LOG} applyCrop failed`, err);
      setErrors([
        "Could not crop image. If this is an existing CDN image, try re-uploading the file instead.",
        ...extractBackendMessages(err),
      ]);
      setCropBusy(false);
    }
  };

  const removeNewFile = (bannerKey, index) => {
    console.log(`${LOG} removeNewFile`, { bannerKey, index });
    const setter =
      bannerKey === "desktop" ? setDesktopBannerFiles : setMobileBannerFiles;
    setter((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      console.log(`${LOG} removeNewFile done`, {
        bannerKey,
        removed: removed?.name,
        remaining: next.map((f) => f.name),
      });
      return next;
    });
  };

  const removeExistingItem = (bannerKey, index) => {
    console.log(`${LOG} removeExistingItem`, { bannerKey, index });
    const setter =
      bannerKey === "desktop" ? setDesktopExistingItems : setMobileExistingItems;
    const initial =
      bannerKey === "desktop" ? initialDesktopKeys : initialMobileKeys;
    setter((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      const removedKey = getBannerItemKey(removed);
      console.log(`${LOG} removeExistingItem done`, {
        bannerKey,
        removedKey,
        removedUrl: removed?.url,
        remainingKeys: collectBannerKeys(next),
        willSendRemoveOnUpdate: initial.includes(removedKey),
      });
      return next;
    });
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
    <div className="group relative h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      {isVideo ? (
        <video src={src} className="h-full w-full object-cover" muted />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onZoom}
          className="rounded-lg bg-white/95 p-1.5 text-slate-800 shadow hover:bg-white"
          title="Zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        {canCrop && !isVideo && !isSvg && (
          <button
            type="button"
            onClick={onCrop}
            className="rounded-lg bg-white/95 p-1.5 text-slate-800 shadow hover:bg-white"
            title="Crop"
          >
            <Crop className="h-4 w-4" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg bg-red-500/95 p-1.5 text-white shadow hover:bg-red-600"
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

  const renderMediaGrid = (
    existingItems,
    filePreviews,
    fileInputName,
    bannerKey,
    sectionLabel,
    onClearNew,
  ) => (
    <div className="space-y-3">
      <label className={labelClass}>{sectionLabel}</label>
      <input
        type="file"
        name={fileInputName}
        accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4"
        multiple
        onChange={(e) =>
          handleMultiFileChange(
            e,
            bannerKey === "desktop" ? setDesktopBannerFiles : setMobileBannerFiles,
            existingItems.length,
          )
        }
        className="block w-full text-[11px] text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
      />
      <p className="text-[10px] text-stone-500">
        Upload multiple images. Hover a thumbnail to zoom, crop, or remove.
        {isEdit && (
          <span className="mt-1 block text-brand-700">
            On update, images still listed here are kept. New files are added.
            Use remove only when you want to delete a server image.
          </span>
        )}
      </p>

      {(existingItems.length > 0 || filePreviews.length > 0) && (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[10px] font-medium text-brand-900">
          {existingItems.length > 0 && (
            <span>{existingItems.length} on server</span>
          )}
          {filePreviews.length > 0 && (
            <span>
              {existingItems.length > 0 ? " + " : ""}
              {filePreviews.length} new upload
              {filePreviews.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-brand-700">
            {" "}
            = {existingItems.length + filePreviews.length} shown total
          </span>
        </p>
      )}

      {existingItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">
            {isEdit ? "On server" : "Saved"} ({existingItems.length})
          </p>
          <div className="flex flex-wrap gap-3">
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
                      openZoom(item.url, `${bannerKey} ${idx + 1}`, video),
                    onCrop: () =>
                      openCrop({
                        kind: "existing",
                        bannerKey,
                        index: idx,
                        src: item.url,
                        fileName: `cropped-${bannerKey}-${idx + 1}.jpg`,
                        useCrossOrigin: true,
                        isVideo: video,
                        isSvg: /\.svg(\?|#|$)/i.test(item.url || ""),
                      }),
                    onRemove: () => removeExistingItem(bannerKey, idx),
                    canCrop: true,
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {filePreviews.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">
            New uploads ({filePreviews.length})
          </p>
          <div className="flex flex-wrap gap-3">
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
                        bannerKey,
                        index: idx,
                        src: url,
                        fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
                        useCrossOrigin: false,
                        isVideo: video,
                        isSvg: svg,
                      }),
                    onRemove: () => removeNewFile(bannerKey, idx),
                    canCrop: true,
                  })}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClearNew}
            className="mt-2 text-xs text-rose-600 hover:underline"
          >
            Clear all new {bannerKey} files
          </button>
        </div>
      )}
    </div>
  );

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

      <div className="mx-auto max-w-4xl">
        {loading && isEdit ? (
          <div className="flex justify-center gap-2 py-16 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <FormErrors errors={formErrors} onDismiss={clearErrors} />

            <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={fieldClass}
                  placeholder="Sale 🔥"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Banner type <span className="text-danger">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    if (e.target.value !== "CATEGORY") setCategoryId("");
                  }}
                  className={fieldClass}
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="CATEGORY">CATEGORY</option>
                </select>
              </div>
            </div>

            {type === "CATEGORY" && (
              <div className="mt-2.5">
                <label className={labelClass}>
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categoriesLoading}
                  className={fieldClass}
                >
                  <option value="">
                    {categoriesLoading ? "Loading categories…" : "Select category"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name || cat.title || "Unnamed"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Discount type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className={fieldClass}
                >
                  <option value="PERCENT">PERCENT</option>
                  <option value="FLAT">FLAT</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Discount</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min="0"
                  step="0.01"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  navigation.navigate <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={navigation}
                  onChange={(e) => setNavigation(e.target.value)}
                  className={fieldClass}
                  placeholder="/summer"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>External link (optional)</label>
                <input
                  type="text"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  className={fieldClass}
                  placeholder="Optional external URL"
                />
              </div>
            </div>
            </section>

            <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderMediaGrid(
                desktopExistingItems,
                desktopFilePreviews,
                "desktopBanner",
                "desktop",
                "Desktop banner (multiple images)",
                () => setDesktopBannerFiles([]),
              )}
              {renderMediaGrid(
                mobileExistingItems,
                mobileFilePreviews,
                "mobileBanner",
                "mobile",
                "Mobile banner (multiple images)",
                () => setMobileBannerFiles([]),
              )}
            </div>

            </section>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-white/95 px-3 py-2 backdrop-blur-sm lg:left-[var(--sidebar-width,0)]">
              <div className="mx-auto flex max-w-4xl justify-end gap-2">
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
                  {loading ? "Saving…" : isEdit ? "Update banner" : "Create banner"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Zoom modal */}
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

      {/* Crop modal */}
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
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Crop className="h-5 w-5" />
                Crop banner
              </h2>
              <button
                type="button"
                onClick={closeCrop}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="relative mx-auto aspect-video max-h-48 overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={cropSession.src}
                  alt="Crop source"
                  className="h-full w-full object-contain"
                  crossOrigin={cropSession.useCrossOrigin ? "anonymous" : undefined}
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
                  <label className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                    <span>{label}</span>
                    <span>{cropPct[key]}%</span>
                  </label>
                  <input
                    type="range"
                    min={key === "w" || key === "h" ? 10 : 0}
                    max={key === "x" || key === "w" ? 95 : 95}
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
                  <p className="mb-2 text-xs font-medium text-slate-600">Preview</p>
                  <img
                    src={cropPreviewUrl}
                    alt="Crop preview"
                    className="mx-auto max-h-32 rounded-lg border border-slate-200 object-contain"
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
