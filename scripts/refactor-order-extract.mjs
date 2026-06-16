import fs from "fs";

const p = "src/admin/components/orders/order.jsx";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);

// Remove lines 169-474 (1-based): fulfilment + shipping helpers (now in other modules)
const head = lines.slice(0, 168);
const tail = lines.slice(474);

let text = [...head, ...tail].join("\n");

// Add imports after OrderAnalyticsPanel import
const importBlock = `import {
  canDownloadInvoice,
  dbgOrders,
  dbgOrdersVerbose,
  isNormalDeliveryLine,
  isLineManifestedOnCarrier,
  isSelfShippingLine,
  SHIPPING_PROVIDER_OPTIONS,
  shippingProviderLabel,
  extractShippingFallbackEntries,
  getItemShippingProvider,
  isDelhiveryLine,
  getDelhiveryWaybill,
  getNormalDeliveryDelhivery,
  itemNeedsShippingProviderOnProcessing,
  defaultShippingProviderForItem,
  orderHasItemsNeedingShippingProvider,
  buildStatusPayload,
  resolveItemDocIds,
  openPdfBlob,
  DelhiveryDetails,
} from "./orderShippingUtils.jsx";
import { OrderStatusBadge, OrderItemStatusBreakdown } from "./orderStatusBadge.jsx";
`;

if (!text.includes('from "./orderShippingUtils.jsx"')) {
  text = text.replace(
    'import { OrderAnalyticsPanel } from "./OrderAnalyticsPanel";',
    `import { OrderAnalyticsPanel } from "./OrderAnalyticsPanel";\n${importBlock}`,
  );
}

// Extend orderFilterUtils import
text = text.replace(
  "  summarizeOrderLineStatuses,\n} from \"./orderFilterUtils\";",
  `  summarizeOrderLineStatuses,
  isOrderMixedLines,
  getOrderLineStatusSummary,
} from "./orderFilterUtils";`,
);

// Replace getStatusBadge usage - remove function definitions inside Orders
text = text.replace(
  /  const getStatusBadge = \(status = "pending"\) => \{[\s\S]*?  \};\n\n  \/\*\* Single resolved status badge[\s\S]*?  \};\n\n  const statusOptions = ORDER_STATUS_OPTIONS;/,
  "  const statusOptions = ORDER_STATUS_OPTIONS;",
);

// Replace renderItemStatusBreakdown calls with OrderItemStatusBreakdown component
text = text.replace(/renderItemStatusBreakdown\(([^,)]+)(?:,\s*\{[^}]*\})?\)/g, "<OrderItemStatusBreakdown item={$1} />");
text = text.replace(/getStatusBadge\(([^)]+)\)/g, "<OrderStatusBadge status={$1} />");

fs.writeFileSync(p, text);
console.log("Patched order.jsx ->", text.split(/\r?\n/).length, "lines");
