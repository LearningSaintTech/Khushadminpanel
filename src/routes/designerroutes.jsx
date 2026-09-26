import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import DesignerLogin from "../designer/components/Auth/Login";
import DesignerOtp from "../designer/components/Auth/Otp";
import DesignerSelectPanel from "../designer/components/Auth/SelectPanel";
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
      <Route path="select-panel" element={<DesignerSelectPanel />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["DESIGNER"]}
            loginPath="/designer/login"
            wrongRolePolicy="home"
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
            allowedRoles={["DESIGNER", "DESIGNER_OPS"]}
            loginPath="/designer/login"
          />
        }
      />
      <Route path="*" element={<Navigate to="/designer/login" replace />} />
    </Routes>
  );
};

export default DesignerRoutes;
