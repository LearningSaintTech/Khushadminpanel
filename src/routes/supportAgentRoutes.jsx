import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import SupportAgentLogin from "../supportAgent/components/Auth/Login";
import SupportAgentOtp from "../supportAgent/components/Auth/Otp";
import SupportAgentLayout from "../supportAgent/components/common/SupportAgentLayout";
import TicketList from "../supportAgent/components/tickets/TicketList";
import TicketDetail from "../supportAgent/components/tickets/TicketDetail";

export default function SupportAgentRoutes() {
  return (
    <Routes>
      <Route path="login" element={<SupportAgentLogin />} />
      <Route path="otp" element={<SupportAgentOtp />} />
      <Route path="verify-otp" element={<Navigate to="/support-agent/otp" replace />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["AGENT"]}
            loginPath="/support-agent/login"
            wrongRolePolicy="login"
          />
        }
      >
        <Route element={<SupportAgentLayout />}>
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="dashboard" element={<Navigate to="/support-agent/tickets" replace />} />
        </Route>
      </Route>

      <Route index element={<Navigate to="/support-agent/login" replace />} />
      <Route path="*" element={<Navigate to="/support-agent/login" replace />} />
    </Routes>
  );
}
