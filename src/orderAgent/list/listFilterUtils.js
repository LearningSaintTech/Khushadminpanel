/** Maps UI payment tab → API query (pending Razorpay/Nimble, not COD). */
export const PAYMENT_FILTER_TABS = [
  { value: "", label: "All payments" },
  { value: "pending_online", label: "Pending online (not COD)" },
];

export const LINE_CONSISTENCY_TABS = [
  { value: "", label: "All lines" },
  { value: "mixed", label: "Mixed" },
  { value: "uniform", label: "Not mixed" },
];

export function paymentFilterToQuery(paymentFilter) {
  if (paymentFilter === "pending_online") {
    return { paymentStatus: "PENDING", paymentMode: "ONLINE" };
  }
  return { paymentStatus: "", paymentMode: "" };
}

export function apiErrMessage(err, fallback) {
  return typeof err === "string" ? err : err?.response?.data?.message || err?.message || fallback;
}

/** Unwrap apiConnector / successResponse payloads ({ data: { ... } }). */
export function unwrapApiData(res) {
  const body = res?.data ?? res ?? {};
  return body?.data ?? body;
}
