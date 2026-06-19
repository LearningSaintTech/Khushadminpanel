import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import OrderAgentListPage from "../../list/OrderAgentListPage";
import { getStatusLabel, useOrderAgentStatusOptions } from "../../context/StatusOptionsContext";

export default function ExchangePage() {
  const [searchParams] = useSearchParams();
  const statusOptions = useOrderAgentStatusOptions();
  const statusFilter = searchParams.get("status") || "";

  const statusLabel = useMemo(
    () => getStatusLabel("exchange", statusFilter, statusOptions),
    [statusFilter, statusOptions],
  );

  return (
    <OrderAgentListPage
      title={statusLabel || "Exchange"}
      subtitle={statusLabel ? `Exchange lines in ${statusLabel.toLowerCase()}` : "Exchange requests and line items"}
      section="exchange"
      exchangeOnly
    />
  );
}
