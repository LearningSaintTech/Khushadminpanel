import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";

import DriverLogin from "../driver/drivercomponent/Auth/Login";
import DriverOTP from "../driver/drivercomponent/Auth/Otp";
import DriverDashboard from "../driver/drivercomponent/dashboard/home.jsx";
import Exchangeorder from "../driver/drivercomponent/dashboard/Exchangeorder.jsx";
import DriverAppLayout from "../driver/drivercomponent/common/DriverAppLayout";
import BottomNavLayout from "../driver/drivercomponent/common/bottomlayout";
import AssignmentDetails from "../driver/drivercomponent/Home/AssignmentDetails.jsx";
import OrderHistory from "../driver/drivercomponent/order/orderHistory.jsx";
import ExchangeOrderHistory from "../driver/drivercomponent/order/exchangeorderhistory.jsx";
import Profile from "../driver/drivercomponent/Profile/Profile.jsx";

const DriverRoutes = () => {
  return (
    <Routes>
      {/* Auth – no protection */}
      <Route path="login" element={<DriverLogin />} />
      <Route path="verify-otp" element={<DriverOTP />} />

      {/* Protected driver routes – header + bottom nav via layout */}
      <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
        <Route element={<DriverAppLayout />}>
          <Route element={<BottomNavLayout />}>
            <Route path="dashboard" element={<DriverDashboard />} />
            <Route path="assignment/:assignmentId" element={<AssignmentDetails />} />
            <Route path="exchange-orders" element={<Exchangeorder />} />
            <Route path="order-history" element={<OrderHistory />} />
            <Route path="exchange-order-history" element={<ExchangeOrderHistory />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      <Route index element={<Navigate to="/driver/login" replace />} />
      <Route path="*" element={<Navigate to="/driver/login" replace />} />
    </Routes>
  );
};

export default DriverRoutes;
