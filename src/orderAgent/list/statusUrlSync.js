/** Case-insensitive match for URL status vs sidebar / dropdown option values. */
export function statusParamsMatch(a, b) {
  if (!a || !b) return a === b;
  return a === b || String(a).toUpperCase() === String(b).toUpperCase();
}

/** Map URL status to the canonical option value used by filters and API. */
export function resolveStatusFromOptions(urlStatus, options = []) {
  if (!urlStatus) return "";
  const exact = options.find((o) => o.value === urlStatus);
  if (exact) return exact.value;
  const upper = String(urlStatus).toUpperCase();
  const match = options.find(
    (o) => o.value && String(o.value).toUpperCase() === upper,
  );
  return match?.value ?? urlStatus;
}

/** Ensure the current URL status is always a selectable dropdown option. */
export function buildStatusSelectOptions(baseOptions, resolvedStatus, fallbackLabel) {
  const base =
    baseOptions.length > 0
      ? baseOptions
      : [{ value: "", label: "All statuses" }];
  if (!resolvedStatus) return base;
  if (base.some((o) => o.value === resolvedStatus)) return base;
  const label = fallbackLabel || resolvedStatus.replace(/_/g, " ");
  return [...base, { value: resolvedStatus, label }];
}

/** True when urlStatus exists in the section's live status options. */
export function isStatusValidForSection(urlStatus, rawOptions = []) {
  if (!urlStatus) return true;
  return rawOptions.some((o) => o.value && statusParamsMatch(o.value, urlStatus));
}

/** Map URL provider to canonical shipping-provider option value. */
export function resolveProviderFromOptions(urlProvider, options = []) {
  if (!urlProvider) return "";
  const exact = options.find((o) => o.value === urlProvider);
  if (exact) return exact.value;
  const upper = String(urlProvider).toUpperCase();
  const match = options.find(
    (o) => o.value && String(o.value).toUpperCase() === upper,
  );
  return match?.value ?? urlProvider;
}

export function buildProviderSelectOptions(baseOptions, resolvedProvider, fallbackLabel) {
  if (!resolvedProvider) return baseOptions;
  if (baseOptions.some((o) => o.value === resolvedProvider)) return baseOptions;
  const label = fallbackLabel || resolvedProvider;
  return [...baseOptions, { value: resolvedProvider, label }];
}
