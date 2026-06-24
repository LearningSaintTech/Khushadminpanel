export const BIND_OFFER_TYPES = [
  "BUY_X_GET_Y_FREE",
  "BUY_N_GET_DISCOUNT",
  "CART_THRESHOLD_DISCOUNT",
];

export const BIND_OFFER_TYPE_LABELS = {
  BUY_X_GET_Y_FREE: "Buy X Get Y Free (BOGO)",
  BUY_N_GET_DISCOUNT: "Buy N — quantity discount",
  CART_THRESHOLD_DISCOUNT: "Cart threshold discount",
};

export const BOGO_FREE_APPLIES_TO = {
  SAME_SKU: "SAME_SKU",
  MIX_MATCH_IN_SCOPE: "MIX_MATCH_IN_SCOPE",
};

export const BOGO_FREE_APPLIES_TO_LABELS = {
  SAME_SKU: "Same product (per SKU)",
  MIX_MATCH_IN_SCOPE: "Mix & match (any eligible items in section)",
};

/** Quick presets — { paidQuantity, freeQuantity } */
export const BOGO_PRESETS = [
  { id: "b1g1", label: "Buy 1 Get 1 Free", paidQuantity: 1, freeQuantity: 1 },
  { id: "b2g1", label: "Buy 2 Get 1 Free", paidQuantity: 2, freeQuantity: 1 },
  { id: "b3g1", label: "Buy 3 Get 1 Free", paidQuantity: 3, freeQuantity: 1 },
];

/** API buyQuantity = paid + free per deal cycle */
export function bogoMarketingToApi(paidQuantity, freeQuantity, freeAppliesTo = BOGO_FREE_APPLIES_TO.SAME_SKU) {
  const paid = Number(paidQuantity) || 0;
  const free = Number(freeQuantity) || 0;
  return {
    buyQuantity: paid + free,
    freeQuantity: free,
    freeAppliesTo: freeAppliesTo || BOGO_FREE_APPLIES_TO.SAME_SKU,
  };
}

/** Reverse API rules → customer-facing paid / free counts */
export function bogoApiToMarketing(bogoRules) {
  const buyQuantity = Number(bogoRules?.buyQuantity) || 0;
  const freeQuantity = Number(bogoRules?.freeQuantity) || 0;
  if (buyQuantity < 1 || freeQuantity < 1) {
    return { paidQuantity: 1, freeQuantity: 1 };
  }
  const paidQuantity = Math.max(1, buyQuantity - freeQuantity);
  return { paidQuantity, freeQuantity };
}

export function formatBogoMarketingText(paidQuantity, freeQuantity) {
  const paid = Number(paidQuantity) || 0;
  const free = Number(freeQuantity) || 0;
  if (paid < 1 || free < 1) return "";
  return `Buy ${paid} Get ${free} Free`;
}

export function describeBogoDeal(paidQuantity, freeQuantity, freeAppliesTo = BOGO_FREE_APPLIES_TO.SAME_SKU) {
  const paid = Number(paidQuantity) || 0;
  const free = Number(freeQuantity) || 0;
  if (paid < 1 || free < 1) return "";
  const minCart = paid + free;
  if (freeAppliesTo === BOGO_FREE_APPLIES_TO.MIX_MATCH_IN_SCOPE) {
    return `Customer needs ${minCart} eligible items in cart (any mix) — ${free} cheapest free. Prices come from Inventory.`;
  }
  return `Customer needs ${minCart} items in cart (${paid} paid + ${free} free). Prices come from Inventory — no separate offer price.`;
}

export function defaultBindOfferFormState() {
  return {
    enableBindOffer: false,
    offerType: "BUY_X_GET_Y_FREE",
    label: "",
    badgeText: "",
    showProgress: true,
    priority: 0,
    bogoPaidQuantity: 1,
    bogoFreeQuantity: 1,
    bogoFreeAppliesTo: BOGO_FREE_APPLIES_TO.SAME_SKU,
    maxFreeUnitsPerLine: "",
    minQuantity: 2,
    qtyApplyScope: "PER_LINE",
    qtyDiscountType: "PERCENT",
    qtyDiscountValue: "",
    qtyMaxDiscountAmount: "",
    minEligibleSubtotal: "",
    thresholdDiscountType: "FLAT",
    thresholdDiscountValue: "",
    thresholdMaxDiscountAmount: "",
    eligibleSubtotalBasis: "AFTER_ITEM_DISCOUNTS",
  };
}

export function bindOfferFromSection(section) {
  const bo = section?.bindOffer;
  if (!bo?.offerType) return defaultBindOfferFormState();

  const state = {
    ...defaultBindOfferFormState(),
    enableBindOffer: true,
    offerType: bo.offerType,
    label: bo.label || "",
    badgeText: bo.badgeText || "",
    showProgress: bo.showProgress !== false,
    priority: Number(bo.priority) || 0,
  };

  if (bo.offerType === "BUY_X_GET_Y_FREE" && bo.bogoRules) {
    const { paidQuantity, freeQuantity } = bogoApiToMarketing(bo.bogoRules);
    state.bogoPaidQuantity = paidQuantity;
    state.bogoFreeQuantity = freeQuantity;
    state.bogoFreeAppliesTo =
      bo.bogoRules.freeAppliesTo || BOGO_FREE_APPLIES_TO.SAME_SKU;
    state.maxFreeUnitsPerLine =
      bo.bogoRules.maxFreeUnitsPerLine != null && bo.bogoRules.maxFreeUnitsPerLine !== ""
        ? bo.bogoRules.maxFreeUnitsPerLine
        : "";
  }

  if (bo.offerType === "BUY_N_GET_DISCOUNT" && bo.qtyDiscountRules) {
    const rules = bo.qtyDiscountRules;
    state.minQuantity = rules.minQuantity ?? 2;
    state.qtyApplyScope = rules.applyScope || "PER_LINE";
    state.qtyDiscountType = rules.discount?.type || "PERCENT";
    state.qtyDiscountValue =
      rules.discount?.value != null && rules.discount?.value !== ""
        ? rules.discount.value
        : "";
    state.qtyMaxDiscountAmount =
      rules.maxDiscountAmount != null && rules.maxDiscountAmount !== ""
        ? rules.maxDiscountAmount
        : "";
  }

  if (bo.offerType === "CART_THRESHOLD_DISCOUNT" && bo.cartThresholdRules) {
    const rules = bo.cartThresholdRules;
    state.minEligibleSubtotal =
      rules.minEligibleSubtotal != null && rules.minEligibleSubtotal !== ""
        ? rules.minEligibleSubtotal
        : "";
    state.thresholdDiscountType = rules.discount?.type || "FLAT";
    state.thresholdDiscountValue =
      rules.discount?.value != null && rules.discount?.value !== ""
        ? rules.discount.value
        : "";
    state.thresholdMaxDiscountAmount =
      rules.maxDiscountAmount != null && rules.maxDiscountAmount !== ""
        ? rules.maxDiscountAmount
        : "";
    state.eligibleSubtotalBasis = rules.eligibleSubtotalBasis || "AFTER_ITEM_DISCOUNTS";
  }

  return state;
}

function parseOptionalPositiveNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function buildBindOfferApiPayload(formState) {
  if (!formState?.enableBindOffer) return null;

  const payload = {
    offerType: formState.offerType,
    showProgress: formState.showProgress !== false,
    priority: Number(formState.priority) || 0,
  };

  const label = String(formState.label || "").trim();
  const badgeText = String(formState.badgeText || "").trim();
  if (label) payload.label = label;
  if (badgeText) payload.badgeText = badgeText;

  if (formState.offerType === "BUY_X_GET_Y_FREE") {
    const bogoRules = bogoMarketingToApi(
      formState.bogoPaidQuantity,
      formState.bogoFreeQuantity,
      formState.bogoFreeAppliesTo,
    );
    const maxFree = parseOptionalPositiveNumber(formState.maxFreeUnitsPerLine);
    if (maxFree != null) bogoRules.maxFreeUnitsPerLine = maxFree;
    payload.bogoRules = bogoRules;
  }

  if (formState.offerType === "BUY_N_GET_DISCOUNT") {
    const qtyDiscountRules = {
      minQuantity: Number(formState.minQuantity),
      applyScope: formState.qtyApplyScope || "PER_LINE",
      discount: {
        type: formState.qtyDiscountType,
        value: Number(formState.qtyDiscountValue),
      },
    };
    const maxDisc = parseOptionalPositiveNumber(formState.qtyMaxDiscountAmount);
    if (maxDisc != null) qtyDiscountRules.maxDiscountAmount = maxDisc;
    payload.qtyDiscountRules = qtyDiscountRules;
  }

  if (formState.offerType === "CART_THRESHOLD_DISCOUNT") {
    const cartThresholdRules = {
      minEligibleSubtotal: Number(formState.minEligibleSubtotal),
      discount: {
        type: formState.thresholdDiscountType,
        value: Number(formState.thresholdDiscountValue),
      },
      eligibleSubtotalBasis: formState.eligibleSubtotalBasis || "AFTER_ITEM_DISCOUNTS",
    };
    const maxDisc = parseOptionalPositiveNumber(formState.thresholdMaxDiscountAmount);
    if (maxDisc != null) cartThresholdRules.maxDiscountAmount = maxDisc;
    payload.cartThresholdRules = cartThresholdRules;
  }

  return payload;
}

export function validateBindOfferForm(formState, { hasLegacyDiscount = false } = {}) {
  if (!formState?.enableBindOffer) return "";

  if (hasLegacyDiscount) {
    return "Bind offer cannot be used together with section discount. Turn off one of them.";
  }

  if (!BIND_OFFER_TYPES.includes(formState.offerType)) {
    return "Select a valid bind offer type.";
  }

  if (formState.offerType === "BUY_X_GET_Y_FREE") {
    const paid = Number(formState.bogoPaidQuantity);
    const free = Number(formState.bogoFreeQuantity);
    if (!Number.isFinite(paid) || paid < 1) {
      return "Enter how many items the customer pays for (at least 1).";
    }
    if (!Number.isFinite(free) || free < 1) {
      return "Enter how many free items they get (at least 1).";
    }
    if (formState.maxFreeUnitsPerLine !== "" && formState.maxFreeUnitsPerLine != null) {
      const cap = Number(formState.maxFreeUnitsPerLine);
      if (!Number.isFinite(cap) || cap < 1) {
        return "Max free units per line must be empty or a number ≥ 1.";
      }
    }
  }

  if (formState.offerType === "BUY_N_GET_DISCOUNT") {
    const minQty = Number(formState.minQuantity);
    if (!Number.isFinite(minQty) || minQty < 1) {
      return "Minimum quantity must be at least 1.";
    }
    const val = Number(formState.qtyDiscountValue);
    if (formState.qtyDiscountValue === "" || !Number.isFinite(val) || val < 0) {
      return "Enter a valid quantity discount value.";
    }
    if (formState.qtyDiscountType === "PERCENT" && val > 100) {
      return "Quantity discount percent cannot exceed 100.";
    }
  }

  if (formState.offerType === "CART_THRESHOLD_DISCOUNT") {
    const minSub = Number(formState.minEligibleSubtotal);
    if (!Number.isFinite(minSub) || minSub < 1) {
      return "Minimum eligible subtotal must be at least ₹1.";
    }
    const val = Number(formState.thresholdDiscountValue);
    if (formState.thresholdDiscountValue === "" || !Number.isFinite(val) || val < 0) {
      return "Enter a valid cart threshold discount value.";
    }
    if (formState.thresholdDiscountType === "PERCENT" && val > 100) {
      return "Cart threshold discount percent cannot exceed 100.";
    }
  }

  return "";
}

export function formatBindOfferSummary(bindOffer) {
  if (!bindOffer?.offerType) return null;

  const label = bindOffer.label || bindOffer.badgeText;
  const typeLabel = BIND_OFFER_TYPE_LABELS[bindOffer.offerType] || bindOffer.offerType;

  if (bindOffer.offerType === "BUY_X_GET_Y_FREE" && bindOffer.bogoRules) {
    const { paidQuantity, freeQuantity } = bogoApiToMarketing(bindOffer.bogoRules);
    const text = formatBogoMarketingText(paidQuantity, freeQuantity);
    const mix =
      bindOffer.bogoRules.freeAppliesTo === BOGO_FREE_APPLIES_TO.MIX_MATCH_IN_SCOPE
        ? " (mix & match)"
        : "";
    return label ? `${text}${mix} (${label})` : `${text}${mix}`;
  }

  if (bindOffer.offerType === "BUY_N_GET_DISCOUNT" && bindOffer.qtyDiscountRules) {
    const rules = bindOffer.qtyDiscountRules;
    const d = rules.discount;
    const disc =
      d?.type === "PERCENT" ? `${d.value}% off` : d?.value != null ? `₹${d.value} off` : "discount";
    return `Buy ${rules.minQuantity}+ → ${disc}`;
  }

  if (bindOffer.offerType === "CART_THRESHOLD_DISCOUNT" && bindOffer.cartThresholdRules) {
    const rules = bindOffer.cartThresholdRules;
    const d = rules.discount;
    const disc =
      d?.type === "PERCENT" ? `${d.value}% off` : d?.value != null ? `₹${d.value} off` : "discount";
    return `Cart ₹${rules.minEligibleSubtotal}+ → ${disc}`;
  }

  return label || typeLabel;
}

export function formatBindOfferPreview(formState) {
  if (!formState?.enableBindOffer) return "Not enabled";
  if (formState.offerType === "BUY_X_GET_Y_FREE") {
    const text = formatBogoMarketingText(formState.bogoPaidQuantity, formState.bogoFreeQuantity);
    const api = bogoMarketingToApi(formState.bogoPaidQuantity, formState.bogoFreeQuantity, formState.bogoFreeAppliesTo);
    return `${text || "BOGO"} → API: buy ${api.buyQuantity}, free ${api.freeQuantity}`;
  }
  const payload = buildBindOfferApiPayload(formState);
  if (!payload) return "Not enabled";
  return formatBindOfferSummary(payload) || BIND_OFFER_TYPE_LABELS[payload.offerType];
}

/** Snapshot on order line items / pricing.bindOffers (API may use `applied` or `applications`). */
export function getBindOfferAppliedRows(bindOffers) {
  if (!bindOffers) return [];
  if (Array.isArray(bindOffers.applied) && bindOffers.applied.length) {
    return bindOffers.applied;
  }
  if (Array.isArray(bindOffers.applications) && bindOffers.applications.length) {
    return bindOffers.applications;
  }
  return [];
}

export function getTotalBindOfferDiscount(bindOffers) {
  if (!bindOffers) return 0;
  const direct = Number(
    bindOffers.totalBindOfferDiscount ?? bindOffers.totalDiscount ?? 0,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;
  return getBindOfferAppliedRows(bindOffers).reduce(
    (sum, row) => sum + (Number(row.discountAmount) || 0),
    0,
  );
}

export function getBindOfferBillLabel(bindOffers) {
  if (!bindOffers) return "Offer discount";
  const first = getBindOfferAppliedRows(bindOffers)[0];
  if (first?.label || first?.sectionTitle) {
    return first.label || first.sectionTitle;
  }
  return "Offer discount";
}

export function formatBindOfferSnapshotLabel(bindOffer) {
  if (!bindOffer?.offerType) return null;
  if (bindOffer.label) return bindOffer.label;

  const rules = bindOffer.rulesSnapshot || bindOffer.bogoRules;
  if (bindOffer.offerType === "BUY_X_GET_Y_FREE" && rules) {
    const { paidQuantity, freeQuantity } = bogoApiToMarketing(rules);
    const text = formatBogoMarketingText(paidQuantity, freeQuantity);
    if (!text) return null;
    if (rules.freeAppliesTo === BOGO_FREE_APPLIES_TO.MIX_MATCH_IN_SCOPE) {
      return `${text} (mix & match)`;
    }
    return text;
  }

  return BIND_OFFER_TYPE_LABELS[bindOffer.offerType] || bindOffer.offerType;
}

/** Per order line — free qty, discount, or offer label. */
export function getLineBindOfferNote(bindOffer) {
  if (!bindOffer?.offerType) return null;

  const parts = [];
  if (Number(bindOffer.freeQuantity) > 0) {
    parts.push(`${bindOffer.freeQuantity} free`);
  }
  if (Number(bindOffer.lineDiscount) > 0) {
    parts.push(`−₹${Number(bindOffer.lineDiscount).toLocaleString("en-IN")}`);
  }

  if (parts.length) {
    const label = formatBindOfferSnapshotLabel(bindOffer);
    return label ? `${label} · ${parts.join(" · ")}` : parts.join(" · ");
  }

  if (bindOffer.applied === false) {
    return formatBindOfferSnapshotLabel(bindOffer);
  }

  return formatBindOfferSnapshotLabel(bindOffer);
}

export function orderHasBindOfferDiscount(order) {
  if (getTotalBindOfferDiscount(order?.pricing?.bindOffers) > 0) return true;
  return (order?.items || []).some((it) => Number(it?.bindOffer?.lineDiscount) > 0);
}

export function resolveOrderBindOfferDiscount(order) {
  const fromSummary = getTotalBindOfferDiscount(order?.pricing?.bindOffers);
  if (fromSummary > 0) return fromSummary;
  return (order?.items || []).reduce(
    (sum, it) => sum + (Number(it?.bindOffer?.lineDiscount) || 0),
    0,
  );
}

export function describeBindOfferApplicationRow(row) {
  if (!row) return null;
  const label = row.label || row.sectionTitle || "Offer";
  const amount = Number(row.discountAmount) || 0;
  const lineCount = Array.isArray(row.lines) ? row.lines.length : 0;
  const isMixBogo =
    row.offerType === "BUY_X_GET_Y_FREE" &&
    lineCount > 1 &&
    row.lines?.some((ln) => Number(ln.freeQuantity) > 0);

  if (isMixBogo) {
    return `${label} · mix across ${lineCount} lines · −₹${amount.toLocaleString("en-IN")}`;
  }
  if (amount > 0) {
    return `${label} · −₹${amount.toLocaleString("en-IN")}`;
  }
  return label;
}
