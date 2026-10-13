/** Broadcast audience state helpers (shared by AdminBroadcastPage and BroadcastAudienceSection). */

export const EMPTY_SEGMENT_FILTERS = {
  orderCount: { min: "", max: "" },
  lastOrder: { mode: "any", days: "", from: "", to: "" },
  orderValue: { basis: "total", min: "", max: "" },
};

export const DEFAULT_AUDIENCE = { type: "all", segmentId: "", filters: EMPTY_SEGMENT_FILTERS };

/** Strip empty strings so the backend only sees filters that were filled in. */
export function audienceToPayload(audience) {
  if (!audience || audience.type !== "customerSegment") return { type: "all" };
  if (audience.segmentId) return { type: "customerSegment", segmentId: audience.segmentId };
  const f = audience.filters || EMPTY_SEGMENT_FILTERS;
  const num = (v) => (v === "" || v == null ? null : Number(v));
  return {
    type: "customerSegment",
    filters: {
      orderCount: { min: num(f.orderCount.min), max: num(f.orderCount.max) },
      lastOrder: {
        mode: f.lastOrder.mode,
        days: num(f.lastOrder.days),
        from: f.lastOrder.from || null,
        to: f.lastOrder.to || null,
      },
      orderValue: { basis: f.orderValue.basis, min: num(f.orderValue.min), max: num(f.orderValue.max) },
    },
  };
}
