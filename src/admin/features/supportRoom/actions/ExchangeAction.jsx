import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  supportCreateExchange,
  supportPatchExchange,
  supportScheduleExchange,
} from "../api/supportRoomApi";
import { getBackendErrorMessage } from "../supportRoom.constants";
import { getSingleItem } from "../../../apis/itemapi";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

function collectExchanges(order) {
  const out = [];
  for (const it of order?.items || []) {
    for (const ex of it.exchanges || []) {
      out.push({
        ...ex,
        lineSku: it.sku,
        lineItemId: String(it._id || it.itemId),
        line: it,
      });
    }
  }
  return out;
}

function productCatalogId(line) {
  if (!line) return "";
  const raw = line.itemId?._id || line.itemId || line.productId || line.product?._id;
  return raw != null ? String(raw) : "";
}

function colorNameOf(variant) {
  if (!variant) return "";
  if (typeof variant.color === "string") return variant.color.trim();
  return String(variant.color?.name || "").trim();
}

function sizeLabelOf(sizeRow) {
  if (sizeRow == null) return "";
  if (typeof sizeRow === "string" || typeof sizeRow === "number") {
    return String(sizeRow).trim();
  }
  return String(sizeRow.size || sizeRow.name || "").trim();
}

/** Build color list + sizes-per-color from catalog item.variants. */
function extractVariantOptions(catalogItem) {
  const variants = Array.isArray(catalogItem?.variants) ? catalogItem.variants : [];
  const colors = [];
  const sizesByColor = {};
  for (const v of variants) {
    const color = colorNameOf(v);
    if (!color) continue;
    if (!colors.includes(color)) colors.push(color);
    const sizes = (Array.isArray(v.sizes) ? v.sizes : [])
      .map(sizeLabelOf)
      .filter(Boolean);
    const existing = sizesByColor[color] || [];
    sizesByColor[color] = [...new Set([...existing, ...sizes])];
  }
  return { colors, sizesByColor };
}

function unwrapItemPayload(res) {
  const body =
    res?.data !== undefined && res?.success !== undefined ? res : res?.data || res;
  const payload = body?.data ?? body;
  return payload?.item || payload;
}

function inferPickupHint(item) {
  if (!item) return "Carrier resolved from original forward shipment on approve.";
  if (item?.shadowfax?.awb) {
    return "Forward was Shadowfax → approve will book Shadowfax reverse pickup.";
  }
  if (item?.delhivery?.waybill) {
    return "Forward was Delhivery → approve will book Delhivery reverse pickup.";
  }
  if (item?.shiprocket?.awb || item?.shiprocket?.orderId) {
    return "Forward was Shiprocket → pickup books via Shiprocket auto flow.";
  }
  return "Approve uses the same shipping-partner flow as Orders exchange approval.";
}

function toastPickupResult(pickup, kind = "Exchange") {
  if (!pickup) {
    toast.success(`${kind} scheduled flow completed`);
    return;
  }
  if (pickup.scheduled) {
    toast.success(pickup.message || `${kind} approved and pickup scheduled`);
  } else if (pickup.error || pickup.bookError || pickup.assignError) {
    toast.error(
      `${kind} approved but pickup incomplete: ${
        pickup.error || pickup.bookError || pickup.assignError
      }`
    );
  } else if (pickup.message) {
    toast.success(`${kind} approved. ${pickup.message}`);
  } else {
    toast.success(`${kind} approved`);
  }
}

function SizeColorFields({
  colors,
  sizes,
  color,
  size,
  onColor,
  onSize,
  loading,
  required,
  currentLabel,
}) {
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Desired color{required && hasColors ? " *" : ""}</label>
          {hasColors ? (
            <select
              className={fieldClass}
              value={color}
              onChange={(e) => onColor(e.target.value)}
              required={required}
              disabled={loading}
            >
              <option value="">{loading ? "Loading…" : "Select color…"}</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={fieldClass}
              value={color}
              onChange={(e) => onColor(e.target.value)}
              placeholder={loading ? "Loading variants…" : "No catalog colors — type carefully"}
              disabled={loading}
            />
          )}
        </div>
        <div>
          <label className={labelClass}>Desired size{required && hasSizes ? " *" : ""}</label>
          {hasSizes ? (
            <select
              className={fieldClass}
              value={size}
              onChange={(e) => onSize(e.target.value)}
              required={required}
              disabled={loading || (hasColors && !color)}
            >
              <option value="">
                {!color && hasColors ? "Pick color first…" : loading ? "Loading…" : "Select size…"}
              </option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={fieldClass}
              value={size}
              onChange={(e) => onSize(e.target.value)}
              placeholder={
                loading
                  ? "Loading variants…"
                  : hasColors && !color
                    ? "Pick color first"
                    : "No catalog sizes — type carefully"
              }
              disabled={loading}
            />
          )}
        </div>
      </div>
      {currentLabel ? (
        <p className="text-[11px] text-stone-500">Ordered as: {currentLabel}</p>
      ) : null}
    </div>
  );
}

export default function ExchangeAction({ order, onDone }) {
  const items = order?.items || [];
  const allExchanges = useMemo(() => collectExchanges(order), [order]);
  const openExchanges = useMemo(
    () =>
      allExchanges.filter((ex) =>
        ["exchangeRequested", "exchangeApproved", "pickupScheduled"].includes(ex.status)
      ),
    [allExchanges]
  );
  const scheduleableExchanges = useMemo(
    () =>
      allExchanges.filter((ex) =>
        ["exchangeRequested", "exchangeApproved"].includes(ex.status)
      ),
    [allExchanges]
  );

  const [mode, setMode] = useState("create"); // create | scheduleExisting | patch
  const [intent, setIntent] = useState("requested"); // requested | schedule
  const [itemId, setItemId] = useState("");
  const [exchangeReason, setExchangeReason] = useState("Wrong size");
  const [desiredSize, setDesiredSize] = useState("");
  const [desiredColor, setDesiredColor] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [patchSize, setPatchSize] = useState("");
  const [patchColor, setPatchColor] = useState("");
  const [supportReason, setSupportReason] = useState("");
  const [bookShadowfax, setBookShadowfax] = useState(true);
  const [bookDelhivery, setBookDelhivery] = useState(true);
  const [manualTrackingId, setManualTrackingId] = useState("");
  const [saving, setSaving] = useState(false);

  const [variantOptions, setVariantOptions] = useState({ colors: [], sizesByColor: {} });
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [patchVariantOptions, setPatchVariantOptions] = useState({
    colors: [],
    sizesByColor: {},
  });
  const [patchVariantsLoading, setPatchVariantsLoading] = useState(false);

  const selectedItem = useMemo(
    () => items.find((it) => String(it._id || it.itemId) === String(itemId)),
    [items, itemId]
  );

  const selectedPatchExchange = useMemo(
    () => openExchanges.find((x) => String(x._id || x.id) === String(exchangeId)),
    [openExchanges, exchangeId]
  );

  const createSizes = useMemo(() => {
    if (!desiredColor) return [];
    return variantOptions.sizesByColor[desiredColor] || [];
  }, [variantOptions, desiredColor]);

  const patchSizes = useMemo(() => {
    if (!patchColor) return [];
    return patchVariantOptions.sizesByColor[patchColor] || [];
  }, [patchVariantOptions, patchColor]);

  const orderedLabel = selectedItem
    ? [selectedItem.variant?.color, selectedItem.variant?.size].filter(Boolean).join(" / ") ||
      "—"
    : "";

  // Load catalog variants when create-line changes
  useEffect(() => {
    let cancelled = false;
    const catalogId = productCatalogId(selectedItem);
    setVariantOptions({ colors: [], sizesByColor: {} });
    if (!catalogId) {
      setDesiredColor(selectedItem?.variant?.color || "");
      setDesiredSize(selectedItem?.variant?.size || "");
      return undefined;
    }
    setVariantsLoading(true);
    (async () => {
      try {
        const res = await getSingleItem(catalogId);
        if (cancelled) return;
        const opts = extractVariantOptions(unwrapItemPayload(res));
        setVariantOptions(opts);
        const orderedColor = String(selectedItem?.variant?.color || "").trim();
        const orderedSize = String(selectedItem?.variant?.size || "").trim();
        const nextColor =
          orderedColor && opts.colors.includes(orderedColor)
            ? orderedColor
            : opts.colors[0] || orderedColor || "";
        const sizesFor = opts.sizesByColor[nextColor] || [];
        const nextSize =
          orderedSize && sizesFor.includes(orderedSize)
            ? orderedSize
            : sizesFor[0] || orderedSize || "";
        setDesiredColor(nextColor);
        setDesiredSize(nextSize);
      } catch {
        if (!cancelled) {
          setVariantOptions({ colors: [], sizesByColor: {} });
          setDesiredColor(selectedItem?.variant?.color || "");
          setDesiredSize(selectedItem?.variant?.size || "");
          toast.error("Could not load item sizes/colors — type carefully");
        }
      } finally {
        if (!cancelled) setVariantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, selectedItem]);

  // Load catalog variants when patching an open exchange
  useEffect(() => {
    let cancelled = false;
    if (mode !== "patch" || !selectedPatchExchange) {
      setPatchVariantOptions({ colors: [], sizesByColor: {} });
      return undefined;
    }
    const line = selectedPatchExchange.line;
    const catalogId = productCatalogId(line);
    setPatchVariantsLoading(true);
    (async () => {
      try {
        if (!catalogId) {
          setPatchVariantOptions({ colors: [], sizesByColor: {} });
          return;
        }
        const res = await getSingleItem(catalogId);
        if (cancelled) return;
        const opts = extractVariantOptions(unwrapItemPayload(res));
        setPatchVariantOptions(opts);
        const nextColor =
          (selectedPatchExchange.desiredColor &&
            opts.colors.includes(selectedPatchExchange.desiredColor) &&
            selectedPatchExchange.desiredColor) ||
          opts.colors[0] ||
          selectedPatchExchange.desiredColor ||
          "";
        const sizesFor = opts.sizesByColor[nextColor] || [];
        const nextSize =
          (selectedPatchExchange.desiredSize &&
            sizesFor.includes(selectedPatchExchange.desiredSize) &&
            selectedPatchExchange.desiredSize) ||
          sizesFor[0] ||
          selectedPatchExchange.desiredSize ||
          "";
        setPatchColor(nextColor);
        setPatchSize(nextSize);
      } catch {
        if (!cancelled) {
          setPatchVariantOptions({ colors: [], sizesByColor: {} });
        }
      } finally {
        if (!cancelled) setPatchVariantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, exchangeId, selectedPatchExchange]);

  const onCreateColor = (color) => {
    setDesiredColor(color);
    const sizes = variantOptions.sizesByColor[color] || [];
    setDesiredSize((prev) => (sizes.includes(prev) ? prev : sizes[0] || ""));
  };

  const onPatchColor = (color) => {
    setPatchColor(color);
    const sizes = patchVariantOptions.sizesByColor[color] || [];
    setPatchSize((prev) => (sizes.includes(prev) ? prev : sizes[0] || ""));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!supportReason.trim()) {
      toast.error("Support reason is required");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        if (!itemId) {
          toast.error("Select an item");
          setSaving(false);
          return;
        }
        if (variantOptions.colors.length && !desiredColor) {
          toast.error("Select a desired color");
          setSaving(false);
          return;
        }
        if ((variantOptions.sizesByColor[desiredColor] || []).length && !desiredSize) {
          toast.error("Select a desired size");
          setSaving(false);
          return;
        }
        const res = await supportCreateExchange(order.orderId, itemId, {
          exchangeReason,
          reason: exchangeReason,
          desiredSize: desiredSize || undefined,
          desiredColor: desiredColor || undefined,
          supportReason,
          intent,
          bookShadowfax: intent === "schedule" ? bookShadowfax : undefined,
          bookDelhivery: intent === "schedule" ? bookDelhivery : undefined,
          manualTrackingId:
            intent === "schedule" && manualTrackingId.trim()
              ? manualTrackingId.trim()
              : undefined,
        });
        const data = res?.data?.data || res?.data || {};
        if (intent === "schedule") {
          toastPickupResult(data.pickupResult, "Exchange");
        } else {
          toast.success("Exchange requested on behalf of customer");
        }
      } else if (mode === "scheduleExisting") {
        if (!exchangeId) {
          toast.error("Select an exchange to schedule");
          setSaving(false);
          return;
        }
        const res = await supportScheduleExchange(exchangeId, {
          supportReason,
          adminRemark: supportReason,
          bookShadowfax,
          bookDelhivery,
          manualTrackingId: manualTrackingId.trim() || undefined,
        });
        const data = res?.data?.data || res?.data || {};
        toastPickupResult(data.pickupResult, "Exchange");
      } else {
        if (!exchangeId) {
          toast.error("Select an exchange to patch");
          setSaving(false);
          return;
        }
        if (patchVariantOptions.colors.length && !patchColor) {
          toast.error("Select a desired color");
          setSaving(false);
          return;
        }
        if ((patchVariantOptions.sizesByColor[patchColor] || []).length && !patchSize) {
          toast.error("Select a desired size");
          setSaving(false);
          return;
        }
        await supportPatchExchange(exchangeId, {
          desiredSize: patchSize,
          desiredColor: patchColor,
          reason: supportReason,
          supportReason,
        });
        toast.success("Exchange updated");
      }
      onDone?.();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Exchange action failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { id: "create", label: "Create" },
          { id: "scheduleExisting", label: "Schedule open" },
          { id: "patch", label: "Fix open (size/color)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-lg px-3 py-1.5 ${
              mode === tab.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <>
          <div>
            <label className={labelClass}>Outcome *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  intent === "requested"
                    ? "border-brand-400 bg-brand-50"
                    : "border-stone-200"
                }`}
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={intent === "requested"}
                  onChange={() => setIntent("requested")}
                />
                <span className="text-sm font-medium">Requested</span>
                <span className="block text-[11px] text-stone-500 mt-0.5">
                  Create exchange only — approve later like a customer request.
                </span>
              </label>
              <label
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  intent === "schedule"
                    ? "border-brand-400 bg-brand-50"
                    : "border-stone-200"
                }`}
              >
                <input
                  type="radio"
                  className="mr-2"
                  checked={intent === "schedule"}
                  onChange={() => setIntent("schedule")}
                />
                <span className="text-sm font-medium">Schedule</span>
                <span className="block text-[11px] text-stone-500 mt-0.5">
                  Create → approve → book reverse pickup with shipping partner (Orders flow).
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Delivered line *</label>
            <select
              className={fieldClass}
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {items.map((it) => {
                const id = String(it._id || it.itemId);
                const variantBit = [it.variant?.color, it.variant?.size]
                  .filter(Boolean)
                  .join("/");
                return (
                  <option key={id} value={id}>
                    {(it.sku || "Item") +
                      (variantBit ? ` · ${variantBit}` : "") +
                      ` · ${it.status}`}
                  </option>
                );
              })}
            </select>
            {selectedItem ? (
              <p className="mt-1 text-[11px] text-stone-500">{inferPickupHint(selectedItem)}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Exchange reason *</label>
            <input
              className={fieldClass}
              value={exchangeReason}
              onChange={(e) => setExchangeReason(e.target.value)}
              required
            />
          </div>
          <SizeColorFields
            colors={variantOptions.colors}
            sizes={createSizes}
            color={desiredColor}
            size={desiredSize}
            onColor={onCreateColor}
            onSize={setDesiredSize}
            loading={variantsLoading}
            required
            currentLabel={orderedLabel}
          />
        </>
      ) : null}

      {mode === "scheduleExisting" ? (
        <div>
          <label className={labelClass}>Open exchange to approve + schedule *</label>
          <select
            className={fieldClass}
            value={exchangeId}
            onChange={(e) => setExchangeId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {scheduleableExchanges.map((ex) => {
              const id = String(ex._id || ex.id);
              return (
                <option key={id} value={id}>
                  {(ex.lineSku || "Exchange") +
                    ` · ${ex.status}` +
                    (ex.desiredColor || ex.desiredSize
                      ? ` · want ${[ex.desiredColor, ex.desiredSize].filter(Boolean).join("/")}`
                      : "")}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-stone-500">
            Uses the same approve + shipping-partner booking path as Orders.
          </p>
        </div>
      ) : null}

      {mode === "patch" ? (
        <>
          <div>
            <label className={labelClass}>Open exchange *</label>
            <select
              className={fieldClass}
              value={exchangeId}
              onChange={(e) => setExchangeId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {openExchanges.map((ex) => {
                const id = String(ex._id || ex.id);
                return (
                  <option key={id} value={id}>
                    {(ex.lineSku || "Exchange") +
                      ` · ${ex.status}` +
                      (ex.desiredColor || ex.desiredSize
                        ? ` · want ${[ex.desiredColor, ex.desiredSize].filter(Boolean).join("/")}`
                        : "")}
                  </option>
                );
              })}
            </select>
          </div>
          <SizeColorFields
            colors={patchVariantOptions.colors}
            sizes={patchSizes}
            color={patchColor}
            size={patchSize}
            onColor={onPatchColor}
            onSize={setPatchSize}
            loading={patchVariantsLoading}
            required
            currentLabel={
              selectedPatchExchange?.line
                ? [selectedPatchExchange.line.variant?.color, selectedPatchExchange.line.variant?.size]
                    .filter(Boolean)
                    .join(" / ") || "—"
                : ""
            }
          />
        </>
      ) : null}

      {(mode === "create" && intent === "schedule") || mode === "scheduleExisting" ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Shipping partner options
          </p>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={bookShadowfax}
              onChange={(e) => setBookShadowfax(e.target.checked)}
            />
            Book with Shadowfax if method is Shadowfax manual
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={bookDelhivery}
              onChange={(e) => setBookDelhivery(e.target.checked)}
            />
            Book with Delhivery if method is Delhivery manual
          </label>
          <div>
            <label className={labelClass}>Manual reverse AWB (optional)</label>
            <input
              className={fieldClass}
              value={manualTrackingId}
              onChange={(e) => setManualTrackingId(e.target.value)}
              placeholder="Only if already booked outside system"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Support reason *</label>
        <textarea
          className={`${fieldClass} min-h-[64px]`}
          value={supportReason}
          onChange={(e) => setSupportReason(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {saving
          ? "Saving…"
          : mode === "create"
            ? intent === "schedule"
              ? "Create & schedule pickup"
              : "Create exchange request"
            : mode === "scheduleExisting"
              ? "Approve & schedule pickup"
              : "Patch exchange"}
      </button>
    </form>
  );
}
