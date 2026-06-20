import React from "react";
import { Field, fieldClass, FormSection } from "./sectionShared";
import {
  BIND_OFFER_TYPE_LABELS,
  BIND_OFFER_TYPES,
  BOGO_PRESETS,
  bogoMarketingToApi,
  describeBogoDeal,
  formatBogoMarketingText,
} from "../../utils/bindOffer.util";

export default function BindOfferFormSection({
  bindOfferForm,
  onChange,
  legacyDiscountActive,
  disabled,
}) {
  const setField = (name, value) => {
    onChange({ ...bindOfferForm, [name]: value });
  };

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setField(name, type === "checkbox" ? checked : value);
  };

  const handleEnableToggle = (e) => {
    const checked = e.target.checked;
    onChange({
      ...bindOfferForm,
      enableBindOffer: checked,
      ...(checked && bindOfferForm.offerType === "BUY_X_GET_Y_FREE"
        ? { bogoPaidQuantity: 1, bogoFreeQuantity: 1 }
        : {}),
    });
  };

  const applyBogoPreset = (preset) => {
    onChange({
      ...bindOfferForm,
      bogoPaidQuantity: preset.paidQuantity,
      bogoFreeQuantity: preset.freeQuantity,
      label: bindOfferForm.label || preset.label,
      badgeText: bindOfferForm.badgeText || preset.label,
    });
  };

  const bogoPreview = formatBogoMarketingText(
    bindOfferForm.bogoPaidQuantity,
    bindOfferForm.bogoFreeQuantity,
  );
  const bogoApi = bogoMarketingToApi(
    bindOfferForm.bogoPaidQuantity,
    bindOfferForm.bogoFreeQuantity,
  );

  return (
    <FormSection
      title="Bind offer"
      hint="BOGO, quantity discount, or cart threshold. Item prices are set in Inventory — this only controls deal rules."
    >
      <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
        <input
          type="checkbox"
          checked={bindOfferForm.enableBindOffer}
          onChange={handleEnableToggle}
          disabled={disabled}
          className="h-3.5 w-3.5 rounded border-border accent-brand-600"
        />
        Attach bind offer to this section
      </label>

      {legacyDiscountActive && bindOfferForm.enableBindOffer ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Turn off section discount above — bind offer and legacy discount are mutually exclusive.
        </p>
      ) : null}

      {bindOfferForm.enableBindOffer ? (
        <div className="space-y-3">
          <Field label="Offer type" required>
            <select
              name="offerType"
              value={bindOfferForm.offerType}
              onChange={handleFieldChange}
              disabled={disabled}
              className={fieldClass}
            >
              {BIND_OFFER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BIND_OFFER_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Label" hint="Shown in cart / checkout">
              <input
                type="text"
                name="label"
                value={bindOfferForm.label}
                onChange={handleFieldChange}
                disabled={disabled}
                className={fieldClass}
                placeholder="Buy 1 Get 1 Free"
                maxLength={120}
              />
            </Field>
            <Field label="Badge text" hint="Short chip on product card">
              <input
                type="text"
                name="badgeText"
                value={bindOfferForm.badgeText}
                onChange={handleFieldChange}
                disabled={disabled}
                className={fieldClass}
                placeholder="BOGO"
                maxLength={40}
              />
            </Field>
            <Field label="Priority" hint="Higher wins when sections overlap">
              <input
                type="number"
                name="priority"
                min="0"
                value={bindOfferForm.priority}
                onChange={handleFieldChange}
                disabled={disabled}
                className={fieldClass}
              />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-700">
            <input
              type="checkbox"
              name="showProgress"
              checked={bindOfferForm.showProgress}
              onChange={handleFieldChange}
              disabled={disabled}
              className="h-3.5 w-3.5 rounded border-border accent-brand-600"
            />
            Show progress hints in cart (e.g. “Add 1 more…”)
          </label>

          {bindOfferForm.offerType === "BUY_X_GET_Y_FREE" ? (
            <div className="rounded-lg border border-border bg-canvas-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                BOGO deal
              </p>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {BOGO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => applyBogoPreset(preset)}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-800 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Field
                  label="Customer pays for"
                  required
                  hint="Items charged at catalog price"
                >
                  <input
                    type="number"
                    name="bogoPaidQuantity"
                    min="1"
                    value={bindOfferForm.bogoPaidQuantity}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Gets free" required hint="Free units per deal">
                  <input
                    type="number"
                    name="bogoFreeQuantity"
                    min="1"
                    value={bindOfferForm.bogoFreeQuantity}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Max free / line" hint="Optional cap">
                  <input
                    type="number"
                    name="maxFreeUnitsPerLine"
                    min="1"
                    value={bindOfferForm.maxFreeUnitsPerLine}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                    placeholder="No cap"
                  />
                </Field>
              </div>

              {bogoPreview ? (
                <div className="mt-3 rounded-lg border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-[11px] text-violet-900">
                  <p className="font-semibold">{bogoPreview}</p>
                  <p className="mt-1 text-[10px] text-violet-800/90">
                    {describeBogoDeal(
                      bindOfferForm.bogoPaidQuantity,
                      bindOfferForm.bogoFreeQuantity,
                    )}
                  </p>
                  <p className="mt-1 text-[10px] text-violet-700/80">
                    Sent to API as buyQuantity {bogoApi.buyQuantity}, freeQuantity{" "}
                    {bogoApi.freeQuantity}.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {bindOfferForm.offerType === "BUY_N_GET_DISCOUNT" ? (
            <div className="rounded-lg border border-border bg-canvas-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Quantity discount rules
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Minimum quantity" required>
                  <input
                    type="number"
                    name="minQuantity"
                    min="1"
                    value={bindOfferForm.minQuantity}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Apply scope">
                  <select
                    name="qtyApplyScope"
                    value={bindOfferForm.qtyApplyScope}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  >
                    <option value="PER_LINE">Per cart line</option>
                    <option value="AGGREGATE_IN_OFFER">Aggregate in offer</option>
                  </select>
                </Field>
                <Field label="Discount type">
                  <select
                    name="qtyDiscountType"
                    value={bindOfferForm.qtyDiscountType}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  >
                    <option value="FLAT">Flat (₹)</option>
                    <option value="PERCENT">Percent (%)</option>
                  </select>
                </Field>
                <Field label="Discount value" required>
                  <input
                    type="number"
                    name="qtyDiscountValue"
                    min="0"
                    step="0.01"
                    value={bindOfferForm.qtyDiscountValue}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Max discount (₹)" hint="Optional">
                  <input
                    type="number"
                    name="qtyMaxDiscountAmount"
                    min="0"
                    value={bindOfferForm.qtyMaxDiscountAmount}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                    placeholder="No cap"
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {bindOfferForm.offerType === "CART_THRESHOLD_DISCOUNT" ? (
            <div className="rounded-lg border border-border bg-canvas-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Cart threshold rules
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Min eligible subtotal (₹)" required>
                  <input
                    type="number"
                    name="minEligibleSubtotal"
                    min="1"
                    value={bindOfferForm.minEligibleSubtotal}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Subtotal basis">
                  <select
                    name="eligibleSubtotalBasis"
                    value={bindOfferForm.eligibleSubtotalBasis}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  >
                    <option value="AFTER_ITEM_DISCOUNTS">After item discounts</option>
                    <option value="BEFORE_ITEM_DISCOUNTS">Before item discounts</option>
                  </select>
                </Field>
                <Field label="Discount type">
                  <select
                    name="thresholdDiscountType"
                    value={bindOfferForm.thresholdDiscountType}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  >
                    <option value="FLAT">Flat (₹)</option>
                    <option value="PERCENT">Percent (%)</option>
                  </select>
                </Field>
                <Field label="Discount value" required>
                  <input
                    type="number"
                    name="thresholdDiscountValue"
                    min="0"
                    step="0.01"
                    value={bindOfferForm.thresholdDiscountValue}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Max discount (₹)" hint="Optional">
                  <input
                    type="number"
                    name="thresholdMaxDiscountAmount"
                    min="0"
                    value={bindOfferForm.thresholdMaxDiscountAmount}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    className={fieldClass}
                    placeholder="No cap"
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </FormSection>
  );
}
