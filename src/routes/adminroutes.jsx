import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../utils/ProtectedRoute";
import Login from "../admin/components/Auth/Login";
import OTP from "../admin/components/Auth/Otp";
import Layout from "../admin/components/common components/Layout";
import Dashboard from "../admin/components/Dashboard/Dashboard";
import Categories from "../admin/components/inventory/category";
import Subcategories from "../admin/components/inventory/Subcategory";
import Items from "../admin/components/inventory/item";
import Stockmanagement from "../admin/components/inventory/Stockmanagement";
import ItemDetails from "../admin/components/inventory/Itemdetails";
import Banner from "../admin/components/Banner/Banner";
import Brand from "../admin/components/Brands/Brands";
import Section from "../admin/components/Section/Section";
import Feature from "../admin/components/Features/Feature";
import FeatureForm from "../admin/components/Features/FeatureForm";
import Filter from "../admin/components/Filter/Filter";
import FilterForm from "../admin/components/Filter/FilterForm";
import CategoryForm from "../admin/components/inventory/CategoryForm";
import SubcategoryForm from "../admin/components/inventory/SubcategoryForm";
import SubcategoryEditStandalone from "../admin/components/inventory/SubcategoryEditStandalone";
import ItemForm from "../admin/components/inventory/ItemForm";
import BrandForm from "../admin/components/Brands/BrandForm";
import SectionForm from "../admin/components/Section/SectionForm";
import BannerForm from "../admin/components/Banner/BannerForm";
import CouponForm from "../admin/components/coupon/couponform";
import CouponPage from "../admin/components/coupon/coupon";
import CartChargeForm from "../admin/components/cart/cartform";
import CartChargesPage from "../admin/components/cart/cart";
import PincodeForm from "../admin/components/Pincode/pincodefor";
import PincodePage from "../admin/components/Pincode/pincode";
import SplashForm from "../admin/components/splash/splashform";
import SplashPage from "../admin/components/splash/splash";
import Delivery from "../admin/components/Delivery/Delivery";
import SubAdmin from "../admin/components/create subadmin/subadmin";
import SubAdminForm from "../admin/components/create subadmin/subadminform";
import Influencer from "../admin/components/influencer/influencer";
import InfluencerForm from "../admin/components/influencer/influuencerform";
import Deliveryagent from "../admin/components/Deliveryagent/Deliveryagent";
import DeliveryAgentForm from "../admin/components/Deliveryagent/Deliveryagentform";
import Warehouse from "../admin/components/Warehouse/Warehouse";
import WarehouseForm from "../admin/components/Warehouse/WarehouseForm";
import Showsubcategory from "../admin/components/inventory/showsubcategory";
import ShowItems from "../admin/components/inventory/ShowItems";
import InfluencerCoupons from "../admin/components/influencer/influencercoupon";
import InfluencerCouponsForm from "../admin/components/influencer/influencercouponform";
import CouponAnalytics from "../admin/components/coupon/CouponAnayltics";
import InfluencerCouponManage from "../admin/components/influencer/influencercouponmanagement";
import ExchangeForm from "../admin/components/Policy/exchnagePolicyform";
import Exchanges from "../admin/components/Policy/exchangePolicy";
import Status from "../admin/components/Status/Status";
import StatusPage from "../admin/components/Status/Statusform";
import Orders from "../admin/components/orders/order";
import Reviews from "../admin/components/Review/Reviews";
import Cancellation from "../admin/components/Policy/cancellationPolicy";
import CancellationForm from "../admin/components/Policy/cancellationform";
import Profile from "../admin/components/Profile/Profile";
import Central from "../admin/components/inventory/centralstock";
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
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory/categories" element={<Categories />} />
        <Route path="inventory/categories/create" element={<CategoryForm />} />
        <Route
          path="inventory/categories/edit/:id"
          element={<CategoryForm />}
        />
        <Route path="subcategoriess" element={<Showsubcategory />} />
        <Route path="items" element={<ShowItems />} />
        <Route
          path="inventory/subcategories/:categoryId"
          element={<Subcategories />}
        />
        <Route
          path="inventory/subcategories/:categoryId/create"
          element={<SubcategoryForm />}
        />
        <Route
          path="inventory/subcategories/:categoryId/edit/:id"
          element={<SubcategoryForm />}
        />
        <Route
          path="inventory/subcategories/edit/:id"
          element={<SubcategoryEditStandalone />}
        />
        <Route
          path="inventory/items/:categoryId/:subcategoryId"
          element={<Items />}
        />
        <Route
          path="inventory/items/:categoryId/:subcategoryId/create"
          element={<ItemForm />}
        />
        <Route
          path="inventory/items/:categoryId/:subcategoryId/edit/:id"
          element={<ItemForm />}
        />
        <Route path="inventory/items/:itemId" element={<ItemDetails />} />
        <Route
          path="inventory/stock-management"
          element={<Stockmanagement />}
        />
        <Route path="inventory/central" element={<Central />} />
        <Route path="banners" element={<Banner />} />
        <Route path="banners/create" element={<BannerForm />} />
        <Route path="banners/edit/:id" element={<BannerForm />} />
        <Route path="brands" element={<Brand />} />
        <Route path="brands/create" element={<BrandForm />} />
        <Route path="brands/edit/:id" element={<BrandForm />} />
        <Route path="sections" element={<Section />} />
        <Route path="sections/create" element={<SectionForm />} />
        <Route path="sections/edit/:id" element={<SectionForm />} />
        <Route path="features" element={<Feature />} />
        <Route path="features/create" element={<FeatureForm />} />
        <Route path="features/edit/:id" element={<FeatureForm />} />
        <Route path="filters" element={<Filter />} />
        <Route path="filters/create" element={<FilterForm />} />
        <Route path="filters/edit/:id" element={<FilterForm />} />
        <Route path="coupons" element={<CouponPage />} />
        <Route path="coupons/create" element={<CouponForm />} />
        <Route path="coupons/edit/:id" element={<CouponForm />} />
        <Route path="coupon-analytics" element={<CouponAnalytics />} />
        <Route path="cart-charges" element={<CartChargesPage />} />
        <Route path="cart-charges/create" element={<CartChargeForm />} />
        <Route path="cart-charges/edit/:id" element={<CartChargeForm />} />
        <Route path="pincode" element={<PincodePage />} />
        <Route path="pincode/create" element={<PincodeForm />} />
        <Route path="pincode/edit/:pincode" element={<PincodeForm />} />
        <Route path="splash" element={<SplashPage />} />
        <Route path="banner-form" element={<SplashForm />} />
        <Route path="banner-form/:id" element={<SplashForm />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="orders" element={<Orders />} />
        <Route path="subadmin" element={<SubAdmin />} />
        <Route path="subadmin/create" element={<SubAdminForm />} />
        <Route path="subadmin/edit/:id" element={<SubAdminForm />} />
        <Route path="status" element={<Status />} />
        <Route path="status/create" element={<StatusPage />} />
        <Route path="status/edit/:id" element={<StatusPage />} />
        <Route path="influencer" element={<Influencer />} />
        <Route path="influencer/create" element={<InfluencerForm />} />
        <Route path="influencer/edit/:id" element={<InfluencerForm />} />
        <Route path="driver" element={<Deliveryagent />} />
        <Route path="driver/create" element={<DeliveryAgentForm />} />
        <Route path="driver/edit/:id" element={<DeliveryAgentForm />} />
        <Route path="exchange" element={<Exchanges />} />
        <Route path="exchange/create" element={<ExchangeForm />} />
        <Route path="exchange/edit/:id" element={<ExchangeForm />} />
        <Route path="cancellation" element={<Cancellation />} />
        <Route path="cancellation/create" element={<CancellationForm />} />
        <Route path="cancellation/edit/:id" element={<CancellationForm />} />
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="warehouse/create" element={<WarehouseForm />} />
        <Route path="warehouse/edit/:id" element={<WarehouseForm />} />
        <Route path="stocks" element={<Stockmanagement />} />
        <Route path="influencer/coupons" element={<InfluencerCoupons />} />
        <Route
          path="influencer/coupons/create"
          element={<InfluencerCouponsForm />}
        />
        <Route
          path="influencer/coupons/edit/:id"
          element={<InfluencerCouponsForm />}
        />
        <Route
          path="influencer/:id/coupons"
          element={<InfluencerCouponManage />}
        />
        <Route path="reviews" element={<Reviews />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
};

export default AdminRoutes;
