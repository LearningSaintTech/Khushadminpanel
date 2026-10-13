/**
 * One customer name across the admin panel.
 *
 * Customer = account profile name → shipping-address name → "—".
 * The shipping recipient (address.name) is a separate "Ship to" value, shown only when it
 * differs from the customer name — never merged into the customer name.
 *
 * Accepts list rows (`user`), detail payloads (`userId` populated) and Mfg contexts.
 */
export function resolveOrderCustomer(orderOrCtx) {
  const src = orderOrCtx || {};
  const profile =
    (src.user && typeof src.user === "object" ? src.user : null) ||
    (src.userId && typeof src.userId === "object" ? src.userId : null) ||
    null;
  const address = src.address && typeof src.address === "object" ? src.address : null;
  const billName = String(profile?.name || "").trim();
  const shipName = String(address?.name || "").trim();
  const name = billName || shipName || "";
  const countryCode = String(profile?.countryCode || "").trim();
  const billPhone = String(profile?.phoneNumber || profile?.phone || "").trim();
  const shipPhone = String(address?.phone || address?.phoneNumber || "").trim();
  const phoneDigits = billPhone || shipPhone || "";
  const phone = phoneDigits ? `${countryCode && billPhone ? countryCode : ""}${phoneDigits}` : "";
  const email = String(profile?.email || "").trim();
  const shipToName =
    shipName && name && shipName.toLowerCase() !== name.toLowerCase() ? shipName : "";
  return {
    profile,
    address,
    billName,
    shipName,
    name: name || "—",
    /** Recipient name when it differs from the customer; "" otherwise. */
    shipToName,
    countryCode,
    billPhone,
    shipPhone,
    phone: phone || "—",
    email: email || "—",
  };
}

export const getCustomerDisplayName = (row) => resolveOrderCustomer(row).name;
