import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import OrderAgentLogin from "../orderAgent/components/Auth/Login";
import OrderAgentOtp from "../orderAgent/components/Auth/Otp";
import OrderAgentLayout from "../orderAgent/components/common/OrderAgentLayout";
import OrderAgentWorkspaceGate from "../orderAgent/components/OrderAgentWorkspaceGate";
import OrderAgentListPage from "../orderAgent/list/OrderAgentListPage";
import StaleOrdersPage from "../orderAgent/components/stale/StaleOrdersPage";
import AnalyticsPage from "../orderAgent/components/analytics/AnalyticsPage";
import OrderProcessPage from "../orderAgent/components/processing/OrderProcessPage";

export default function OrderAgentRoutes() {
  return (
    <Routes>
      <Route path="login" element={<OrderAgentLogin />} />
      <Route path="otp" element={<OrderAgentOtp />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["ORDER_AGENT"]}
            loginPath="/order-agent/login"
            wrongRolePolicy="login"
          />
        }
      >
        <Route
          element={
            <OrderAgentWorkspaceGate>
              <OrderAgentLayout />
            </OrderAgentWorkspaceGate>
          }
        >
          <Route
            path="orders"
            element={<OrderAgentListPage section="orders" showProviderFilter />}
          />
          <Route
            path="exchange"
            element={<OrderAgentListPage section="exchange" exchangeOnly />}
          />
          <Route
            path="returns"
            element={<OrderAgentListPage section="returns" returnOnly />}
          />
          <Route path="order-process" element={<OrderProcessPage />} />
          <Route path="stale-orders" element={<StaleOrdersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="dashboard" element={<Navigate to="/order-agent/orders" replace />} />
          <Route path="processing" element={<Navigate to="/order-agent/order-process" replace />} />
        </Route>
      </Route>

      <Route index element={<Navigate to="/order-agent/login" replace />} />
      <Route path="*" element={<Navigate to="/order-agent/login" replace />} />
    </Routes>
  );
}
