import OrdersWorkspace from "./OrdersWorkspace.jsx";

export default function ExchangeOrdersPage() {
  return (
    <OrdersWorkspace
      exchangeOnly
      defaultViewMode="order"
      pageTitle="Exchange orders"
    />
  );
}
