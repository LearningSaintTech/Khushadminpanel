/**
 * Orders feature — keep vs cut (ops core).
 * Locked for Admin Orders Cleanup plan.
 *
 * KEEP
 * - Order/item list + filters (status, payment, city, date, provider, search)
 * - Order detail: lines, payment, address, notes, docs (label/manifest/invoice)
 * - Line status change (context-aware forward / return / exchange)
 * - PROCESSING → shipping provider modal
 * - Driver assign when required
 * - Return/exchange approve + reverse pickup
 * - AWB / tracking + carrier webhook timeline
 * - Stale orders page
 *
 * CUT / DEMOTE
 * - Duplicate status changers: primary = detail StatusActionSelect; bulk only when rows selected
 * - Per-row status <select> in detail table → read-only badge (edit via focused line panel)
 * - Whole-order status control → Advanced (collapsed)
 * - Duplicate sidebar “Exchange Orders” top-level link
 * - Debug / VITE_DEBUG_ORDERS noise in production UI
 *
 * DEFER
 * - Order Agent shared components
 * - Full portals/admin tree move
 * - Backend after-sales engines / mode=full
 */
export const ORDERS_FEATURE_KEEP_CUT = {
  version: 1,
  keep: [
    "list",
    "detail",
    "lineStatus",
    "shippingProviderModal",
    "driverAssign",
    "returnExchangeApprove",
    "tracking",
    "stale",
  ],
  demote: ["wholeOrderStatus", "perRowStatusSelect"],
  cut: ["duplicateExchangeSidebarLink"],
};
