import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AdminRoutes from "./routes/adminroutes";
import InfluencerRoutes from "./routes/influencerroutes";
import DriverRoutes from "./routes/driverroutes";
import SupportAgentRoutes from "./routes/supportAgentRoutes";
import SubAdminRoutes from "./routes/subadminroutes";
import DesignerRoutes from "./routes/designerroutes";
import { NotificationProvider } from "./context/NotificationContext";
import { NotificationSocketConnector } from "./context/NotificationSocketConnector";
import SubadminPreferredPathRedirect from "./components/SubadminPreferredPathRedirect";
import RootRoleRedirect from "./components/RootRoleRedirect";

function App() {
  return (
    <NotificationProvider>
      <SubadminPreferredPathRedirect />
      <NotificationSocketConnector />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "14px" },
        }}
      />
      <Routes>
      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminRoutes />} />
      
      {/* Influencer Routes */}
      <Route path="/influencer/*" element={<InfluencerRoutes />} />
      
      {/* Driver Routes */}
       <Route path="/driver/*" element={<DriverRoutes />} />

      {/* Support Agent Routes */}
      <Route path="/support-agent/*" element={<SupportAgentRoutes />} />
      
      {/* SubAdmin Routes */}
      <Route path="/subadmin/*" element={<SubAdminRoutes />} />

      {/* Designer Routes */}
      <Route path="/designer/*" element={<DesignerRoutes />} />
      
      <Route path="/" element={<RootRoleRedirect />} />

      {/* Unknown paths: role-aware home/login, not always admin */}
      <Route path="*" element={<RootRoleRedirect />} />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
