import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import { STAFF_PANEL_ROLES } from "../utils/authRole";
import Layout from "../admin/components/common components/Layout";
import SubadminLogin from "../subadmin/components/Auth/Login";
import SubadminOtp from "../subadmin/components/Auth/Otp";
import { adminPanelChildRoutes } from "./adminPanelChildRoutes";

const SubAdminRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<SubadminLogin />} />
      <Route path="verify-otp" element={<SubadminOtp />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={STAFF_PANEL_ROLES}
            loginPath="/subadmin/login"
            wrongRolePolicy="home"
          >
            <Layout basePath="/subadmin" filterSidebar />
          </ProtectedRoute>
        }
      >
        {adminPanelChildRoutes}
      </Route>

      <Route index element={<Navigate to="/subadmin/login" replace />} />
      <Route path="*" element={<Navigate to="/subadmin/login" replace />} />
    </Routes>
  );
};

export default SubAdminRoutes;
