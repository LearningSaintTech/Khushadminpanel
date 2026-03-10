// InfluencerRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../influencer/influencercomponents/Auth/Login";
import VerifyOtpPage from "../influencer/influencercomponents/Auth/otp";
import Layout from "../influencer/influencercomponents/common/sidebar";
import ProtectedRoute from "../utils/ProtectedRoute";
import Dashboard from "../influencer/influencercomponents/dashboard/Dashboard";
import InfluencerAnalytics from "../influencer/influencercomponents/InfluencerCoupon/InfluencerCouponAnaylitics";
import InfluencerCoupons from "../influencer/influencercomponents/InfluencerCoupon/influencercoupon";
const InfluencerRoutes = () => {
  return (
    <Routes>
      {/* Public routes - no protection needed */}
      <Route path="login" element={<Login />} />
      <Route path="verify-otp" element={<VerifyOtpPage />} />

      {/* Protected routes - only logged-in users can access */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="coupon" element={<InfluencerCoupons />} />
           <Route path="analytics" element={<InfluencerAnalytics />} /> */}
          {/* Add more protected routes here later */}
          {/* <Route path="coupons" element={<CouponsPage />} /> */}
          {/* <Route path="analytics" element={<AnalyticsPage />} /> */}
          {/* <Route path="profile" element={<ProfilePage />} /> */}
        </Route>
      </Route>

      {/* Root / index → redirect to login */}
      <Route index element={<Navigate to="/influencer/login" replace />} />

      {/* Catch-all for unknown paths inside /influencer/* */}
      <Route path="*" element={<Navigate to="/influencer/login" replace />} />
    </Routes>
  );
};

export default InfluencerRoutes;
