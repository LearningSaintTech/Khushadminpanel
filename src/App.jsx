import { Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "./routes/adminroutes";
import InfluencerRoutes from "./routes/influencerroutes";
import DriverRoutes from "./routes/driverroutes";
import { NotificationProvider } from "./context/NotificationContext";
import { NotificationSocketConnector } from "./context/NotificationSocketConnector";
// import SubAdminRoutes from "./routes/subadminroutes";

function App() {
  return (
    <NotificationProvider>
      <NotificationSocketConnector />
      <Routes>
      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminRoutes />} />
      
      {/* Influencer Routes */}
      <Route path="/influencer/*" element={<InfluencerRoutes />} />
      
      {/* Driver Routes */}
       <Route path="/driver/*" element={<DriverRoutes />} /> 
      
      {/* SubAdmin Routes */}
      {/* <Route path="/subadmin/*" element={<SubAdminRoutes />} /> */}
      
      {/* Root redirect - default to admin login */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      
      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
