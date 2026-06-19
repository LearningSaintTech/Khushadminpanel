import { Navigate } from "react-router-dom";

/** @deprecated Use /order-agent/order-process */
export default function OrderProcessing() {
  return <Navigate to="/order-agent/order-process" replace />;
}
