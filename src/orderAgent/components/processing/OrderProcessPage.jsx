import OrderAgentListPage from "../../list/OrderAgentListPage";

export default function OrderProcessPage() {
  return (
    <OrderAgentListPage
      title="Order process"
      subtitle="PROCESSING queue — pack and manifest"
      section="orders"
      fixedItemStatus="PROCESSING"
    />
  );
}
