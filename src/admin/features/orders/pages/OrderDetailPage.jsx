import OrdersWorkspace from "./OrdersWorkspace.jsx";

/**
 * Order detail is currently an in-workspace panel (selectedOrder).
 * Deep-link via ?orderId= / returnId / exchangeId on the list page.
 * This page reuses the workspace until a dedicated route split is warranted.
 */
export default function OrderDetailPage(props) {
  return <OrdersWorkspace {...props} />;
}
