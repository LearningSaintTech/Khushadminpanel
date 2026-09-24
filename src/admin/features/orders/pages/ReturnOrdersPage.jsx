import OrdersWorkspace from "./OrdersWorkspace.jsx";

export default function ReturnOrdersPage() {
  return (
    <OrdersWorkspace
      returnOnly
      defaultViewMode="item"
      pageTitle="Return pickup orders"
    />
  );
}
