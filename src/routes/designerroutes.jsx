import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import DesignerLogin from "../designer/components/Auth/Login";
import DesignerOtp from "../designer/components/Auth/Otp";
import DesignerLayout from "../designer/components/common/DesignerLayout";
import DesignerDashboard from "../designer/components/dashboard/Dashboard";
import DesignerInventoryList from "../designer/components/inventory/DesignerInventoryList";
import DesignerInventoryForm from "../designer/components/inventory/DesignerInventoryForm";
import DesignerProfile from "../designer/components/profile/DesignerProfile";
import DesignerSizeChartManager from "../designer/components/sizechart/DesignerSizeChartManager";
import DesignerListingTemplateManager from "../designer/components/listingTemplate/DesignerListingTemplateManager";
import PanelEntryRedirect from "../components/PanelEntryRedirect";

const DesignerRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<DesignerLogin />} />
      <Route path="verify-otp" element={<DesignerOtp />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["DESIGNER"]}
            loginPath="/designer/login"
            wrongRolePolicy="login"
          >
            <DesignerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DesignerDashboard />} />
        <Route path="inventory" element={<DesignerInventoryList />} />
        <Route path="inventory/create" element={<DesignerInventoryForm />} />
        <Route path="inventory/edit/:id" element={<DesignerInventoryForm />} />
        <Route path="size-chart" element={<DesignerSizeChartManager />} />
        <Route path="listing-template" element={<DesignerListingTemplateManager />} />
        <Route path="profile" element={<DesignerProfile />} />
      </Route>

      <Route
        index
        element={
          <PanelEntryRedirect
            allowedRoles={["DESIGNER"]}
            loginPath="/designer/login"
            homePath="/designer/dashboard"
          />
        }
      />
      <Route path="*" element={<Navigate to="/designer/login" replace />} />
    </Routes>
  );
};

export default DesignerRoutes;

