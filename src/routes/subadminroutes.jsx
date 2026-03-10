import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
// Import subadmin auth components when available
// import SubAdminLogin from "../subadmin/components/Auth/Login";
// import SubAdminOTP from "../subadmin/components/Auth/Otp";
// import SubAdminDashboard from "../subadmin/components/Dashboard";

const SubAdminRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes - Subadmin can use admin login or have separate login */}
      {/* If using admin login, they'll be redirected based on role */}
      
      {/* Protected Routes - Add your subadmin dashboard and other pages here */}
      {/* Example:
      <Route 
        path="/subadmin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['SUBADMIN']}>
            <SubAdminDashboard />
          </ProtectedRoute>
        } 
      />
      */}
      
      {/* Redirect root */}
      <Route path="/subadmin" element={<Navigate to="/admin" replace />} />
      
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default SubAdminRoutes;
