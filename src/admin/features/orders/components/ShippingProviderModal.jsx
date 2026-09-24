/**
 * Shipping provider modal remains in OrdersWorkspace for now (tightly coupled state).
 * This module documents the feature boundary for later extract.
 */
export const SHIPPING_PROVIDERS = [
  { value: "SHIPROCKET", label: "Shiprocket" },
  { value: "DELHIVERY", label: "Delhivery" },
  { value: "SHADOWFAX", label: "Shadowfax" },
  { value: "SELF_SHIPPING", label: "Self shipping" },
];
