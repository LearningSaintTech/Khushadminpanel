import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import OrderAgentListPage from "../../list/OrderAgentListPage";
import { getStatusLabel, useOrderAgentStatusOptions } from "../../context/StatusOptionsContext";

export default function ReturnsPage() {
  const [searchParams] = useSearchParams();
  const statusOptions = useOrderAgentStatusOptions();
  const statusFilter = searchParams.get("status") || "";

  const statusLabel = useMemo(
    () => getStatusLabel("returns", statusFilter, statusOptions),
    [statusFilter, statusOptions],
  );

  return (
    <OrderAgentListPage
      title={statusLabel || "Returns"}
      subtitle={statusLabel ? `Returns in ${statusLabel.toLowerCase()}` : "Return requests and refund lines"}
      section="returns"
      returnOnly
    />
  );
}
