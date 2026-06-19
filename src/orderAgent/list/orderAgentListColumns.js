export const ORDER_AGENT_ITEM_COLUMNS_STORAGE_KEY = "khush_order_agent_item_visible_columns";
export const ORDER_AGENT_ORDER_COLUMNS_STORAGE_KEY = "khush_order_agent_order_visible_columns";

/** By item — one row per line. */
export const ORDER_AGENT_ITEM_COLUMNS = [
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Date & time", defaultVisible: true },
  { key: "orderDateTime", label: "Order date & time", defaultVisible: false },
  { key: "customer", label: "Customer name", defaultVisible: true },
  { key: "phone", label: "Customer phone", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: false },
  { key: "notes", label: "Notes", defaultVisible: false },
  { key: "product", label: "Dress / product name", defaultVisible: true },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "sku", label: "Line SKU", defaultVisible: true },
  { key: "variantSku", label: "Variant SKU", defaultVisible: false },
  { key: "size", label: "Size", defaultVisible: true },
  { key: "color", label: "Color", defaultVisible: true },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "city", label: "City", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "orderAmount", label: "Order amount", defaultVisible: true },
  { key: "walletUsed", label: "Wallet used", defaultVisible: false },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "gatewayOrderId", label: "Gateway order ID", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true, alwaysVisible: true },
  { key: "courier", label: "Courier / Shiprocket", defaultVisible: false },
];

/** By order — one row per order (line fields show first line or stacked). */
export const ORDER_AGENT_ORDER_COLUMNS = [
  { key: "image", label: "Image", defaultVisible: true },
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "date", label: "Date & time", defaultVisible: true },
  { key: "orderDateTime", label: "Order date & time", defaultVisible: false },
  { key: "customer", label: "Customer name", defaultVisible: true },
  { key: "phone", label: "Customer phone", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: false },
  { key: "notes", label: "Notes", defaultVisible: false },
  { key: "qty", label: "Quantity", defaultVisible: true },
  { key: "product", label: "Dress / product name", defaultVisible: true },
  { key: "productId", label: "Catalog product ID", defaultVisible: false },
  { key: "sku", label: "Line SKU", defaultVisible: false },
  { key: "variantSku", label: "Variant SKU", defaultVisible: false },
  { key: "size", label: "Size", defaultVisible: false },
  { key: "color", label: "Color", defaultVisible: false },
  { key: "pincode", label: "Ship-to pincode", defaultVisible: false },
  { key: "city", label: "City", defaultVisible: false },
  { key: "storeLink", label: "Store link", defaultVisible: false },
  { key: "orderAmount", label: "Order amount", defaultVisible: true },
  { key: "walletUsed", label: "Wallet used", defaultVisible: false },
  { key: "payment", label: "Payment (order)", defaultVisible: false },
  { key: "gatewayOrderId", label: "Gateway order ID", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true, alwaysVisible: true },
  { key: "courier", label: "Courier / Shiprocket", defaultVisible: true },
];

export const ORDER_AGENT_STALE_COLUMNS = [
  { key: "orderId", label: "Order ID", defaultVisible: true, alwaysVisible: true },
  { key: "sku", label: "Line SKU", defaultVisible: true },
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "city", label: "City", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "hoursStale", label: "Stale (hrs)", defaultVisible: true },
  { key: "payment", label: "Payment", defaultVisible: false },
  { key: "updatedAt", label: "Updated", defaultVisible: true },
];
