import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import Login from "../admin/components/Auth/Login";
import OTP from "../admin/components/Auth/Otp";
import Layout from "../admin/components/common components/Layout";
import { adminPanelChildRoutes } from "./adminPanelChildRoutes";
const AdminRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes - relative to /admin/* */}
      <Route index element={<Login />} />
      <Route path="otp" element={<OTP />} />

      {/* Protected Layout Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "SUBADMIN"]}>
            <Layout basePath="/admin" filterSidebar={false} />
          </ProtectedRoute>
        }
      >
        {adminPanelChildRoutes}
      </Route>

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
};

export default AdminRoutes;
