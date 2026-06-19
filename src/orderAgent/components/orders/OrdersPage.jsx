import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import OrderAgentListPage from "../../list/OrderAgentListPage";
import {
  getShippingProviderLabel,
  getStatusLabel,
  useOrderAgentStatusOptions,
} from "../../context/StatusOptionsContext";

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const statusOptions = useOrderAgentStatusOptions();
  const statusFilter = searchParams.get("status") || "";
  const providerFilter = searchParams.get("provider") || "";

  const statusLabel = useMemo(
    () => getStatusLabel("orders", statusFilter, statusOptions),
    [statusFilter, statusOptions],
  );

  const providerLabel = useMemo(
    () => getShippingProviderLabel(providerFilter, statusOptions),
    [providerFilter, statusOptions],
  );

  const title = providerLabel || statusLabel || "Orders";
  const subtitle = providerLabel
    ? `Orders fulfilled via ${providerLabel}`
    : statusLabel
      ? `Showing orders in ${statusLabel.toLowerCase()}`
      : "Fulfilment queue — confirm, process, ship, and deliver";

  return (
    <OrderAgentListPage
      title={title}
      subtitle={subtitle}
      section="orders"
      showProviderFilter
    />
  );
}
