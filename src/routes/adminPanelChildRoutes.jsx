import { Route } from "react-router-dom";
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
import ModuleAccessPage from "../admin/components/create subadmin/ModuleAccessPage";
import SubadminUserModuleAccessPage from "../admin/components/create subadmin/SubadminUserModuleAccessPage";
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
import CouponAnalyticsDetail from "../admin/components/coupon/CouponAnalyticsDetail";
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
import AdminNotificationsPage from "../admin/components/notifications/AdminNotificationsPage";
import AdminNotificationHistoryPage from "../admin/components/notifications/AdminNotificationHistoryPage";
import AdminNotificationTemplatesPage from "../admin/components/notifications/AdminNotificationTemplatesPage";
import AdminEmailTemplatesPage from "../admin/components/notifications/AdminEmailTemplatesPage";
import AdminBroadcastPage from "../admin/components/notifications/AdminBroadcastPage";
import AdminNotificationTestPage from "../admin/components/notifications/AdminNotificationTestPage";
import ContactUs from "../admin/components/ContactUs/ContactUs";
import AuditLogsPage from "../admin/components/audit/AuditLogsPage";
import InventoryCodesPage from "../admin/components/inventory/InventoryCodesPage";
import InventoryCodeForm from "../admin/components/inventory/InventoryCodeForm";
import SkuFormulaListPage from "../admin/components/inventory/SkuFormulaListPage";
import SkuFormulaFormPage from "../admin/components/inventory/SkuFormulaFormPage";

/** Shared routes for /admin/* and /subadmin/* (same components). */
export const adminPanelChildRoutes = [
  <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
  <Route key="inv-cat" path="inventory/categories" element={<Categories />} />,
  <Route key="inv-cat-cr" path="inventory/categories/create" element={<CategoryForm />} />,
  <Route key="inv-cat-ed" path="inventory/categories/edit/:id" element={<CategoryForm />} />,
  <Route key="subcats" path="subcategoriess" element={<Showsubcategory />} />,
  <Route key="items" path="items" element={<ShowItems />} />,
  <Route key="inv-sc" path="inventory/subcategories/:categoryId" element={<Subcategories />} />,
  <Route key="inv-sc-cr" path="inventory/subcategories/:categoryId/create" element={<SubcategoryForm />} />,
  <Route key="inv-sc-ed" path="inventory/subcategories/:categoryId/edit/:id" element={<SubcategoryForm />} />,
  <Route key="inv-sc-standalone" path="inventory/subcategories/edit/:id" element={<SubcategoryEditStandalone />} />,
  <Route key="inv-it" path="inventory/items/:categoryId/:subcategoryId" element={<Items />} />,
  <Route key="inv-it-cr" path="inventory/items/:categoryId/:subcategoryId/create" element={<ItemForm />} />,
  <Route key="inv-it-ed" path="inventory/items/:categoryId/:subcategoryId/edit/:id" element={<ItemForm />} />,
  <Route key="inv-it-detail" path="inventory/items/:itemId" element={<ItemDetails />} />,
  <Route key="inv-stock" path="inventory/stock-management" element={<Stockmanagement />} />,
  <Route key="inv-central" path="inventory/central" element={<Central />} />,
  <Route key="inv-ic" path="inventory-codes" element={<InventoryCodesPage />} />,
  <Route key="inv-ic-sku" path="inventory-codes/sku-formula" element={<SkuFormulaListPage />} />,
  <Route key="inv-ic-sku-new" path="inventory-codes/sku-formula/new" element={<SkuFormulaFormPage />} />,
  <Route key="inv-ic-sku-ed" path="inventory-codes/sku-formula/edit/:id" element={<SkuFormulaFormPage />} />,
  <Route key="inv-ic-cr" path="inventory-codes/create" element={<InventoryCodeForm />} />,
  <Route key="inv-ic-ed" path="inventory-codes/edit/:id" element={<InventoryCodeForm />} />,
  <Route key="banners" path="banners" element={<Banner />} />,
  <Route key="banners-cr" path="banners/create" element={<BannerForm />} />,
  <Route key="banners-ed" path="banners/edit/:id" element={<BannerForm />} />,
  <Route key="brands" path="brands" element={<Brand />} />,
  <Route key="brands-cr" path="brands/create" element={<BrandForm />} />,
  <Route key="brands-ed" path="brands/edit/:id" element={<BrandForm />} />,
  <Route key="sections" path="sections" element={<Section />} />,
  <Route key="sections-cr" path="sections/create" element={<SectionForm />} />,
  <Route key="sections-ed" path="sections/edit/:id" element={<SectionForm />} />,
  <Route key="features" path="features" element={<Feature />} />,
  <Route key="features-cr" path="features/create" element={<FeatureForm />} />,
  <Route key="features-ed" path="features/edit/:id" element={<FeatureForm />} />,
  <Route key="filters" path="filters" element={<Filter />} />,
  <Route key="filters-cr" path="filters/create" element={<FilterForm />} />,
  <Route key="filters-ed" path="filters/edit/:id" element={<FilterForm />} />,
  <Route key="coupons" path="coupons" element={<CouponPage />} />,
  <Route key="coupons-cr" path="coupons/create" element={<CouponForm />} />,
  <Route key="coupons-ed" path="coupons/edit/:id" element={<CouponForm />} />,
  <Route key="coupon-an" path="coupon-analytics" element={<CouponAnalytics />} />,
  <Route key="coupon-an-d" path="coupon-analytics/:id" element={<CouponAnalyticsDetail />} />,
  <Route key="cart" path="cart-charges" element={<CartChargesPage />} />,
  <Route key="cart-cr" path="cart-charges/create" element={<CartChargeForm />} />,
  <Route key="cart-ed" path="cart-charges/edit/:id" element={<CartChargeForm />} />,
  <Route key="pin" path="pincode" element={<PincodePage />} />,
  <Route key="pin-cr" path="pincode/create" element={<PincodeForm />} />,
  <Route key="pin-ed" path="pincode/edit/:pincode" element={<PincodeForm />} />,
  <Route key="splash" path="splash" element={<SplashPage />} />,
  <Route key="splash-f" path="banner-form" element={<SplashForm />} />,
  <Route key="splash-f-id" path="banner-form/:id" element={<SplashForm />} />,
  <Route key="delivery" path="delivery" element={<Delivery />} />,
  <Route key="orders" path="orders" element={<Orders />} />,
  <Route key="subadm" path="subadmin" element={<SubAdmin />} />,
  <Route key="subadm-cr" path="subadmin/create" element={<SubAdminForm />} />,
  <Route key="subadm-ed" path="subadmin/edit/:id" element={<SubAdminForm />} />,
  <Route key="subadm-ma" path="subadmin/module-access" element={<ModuleAccessPage />} />,
  <Route key="subadm-uma" path="subadmin/:id/module-access" element={<SubadminUserModuleAccessPage />} />,
  <Route key="status" path="status" element={<Status />} />,
  <Route key="status-cr" path="status/create" element={<StatusPage />} />,
  <Route key="status-ed" path="status/edit/:id" element={<StatusPage />} />,
  <Route key="inf" path="influencer" element={<Influencer />} />,
  <Route key="inf-cr" path="influencer/create" element={<InfluencerForm />} />,
  <Route key="inf-ed" path="influencer/edit/:id" element={<InfluencerForm />} />,
  <Route key="drv" path="driver" element={<Deliveryagent />} />,
  <Route key="drv-cr" path="driver/create" element={<DeliveryAgentForm />} />,
  <Route key="drv-ed" path="driver/edit/:id" element={<DeliveryAgentForm />} />,
  <Route key="ex" path="exchange" element={<Exchanges />} />,
  <Route key="ex-cr" path="exchange/create" element={<ExchangeForm />} />,
  <Route key="ex-ed" path="exchange/edit/:id" element={<ExchangeForm />} />,
  <Route key="can" path="cancellation" element={<Cancellation />} />,
  <Route key="can-cr" path="cancellation/create" element={<CancellationForm />} />,
  <Route key="can-ed" path="cancellation/edit/:id" element={<CancellationForm />} />,
  <Route key="wh" path="warehouse" element={<Warehouse />} />,
  <Route key="wh-cr" path="warehouse/create" element={<WarehouseForm />} />,
  <Route key="wh-ed" path="warehouse/edit/:id" element={<WarehouseForm />} />,
  <Route key="stocks" path="stocks" element={<Stockmanagement />} />,
  <Route key="inf-cp" path="influencer/coupons" element={<InfluencerCoupons />} />,
  <Route key="inf-cp-cr" path="influencer/coupons/create" element={<InfluencerCouponsForm />} />,
  <Route key="inf-cp-ed" path="influencer/coupons/edit/:id" element={<InfluencerCouponsForm />} />,
  <Route key="inf-cp-m" path="influencer/:id/coupons" element={<InfluencerCouponManage />} />,
  <Route key="rev" path="reviews" element={<Reviews />} />,
  <Route key="prof" path="profile" element={<Profile />} />,
  <Route key="contact" path="contact-us" element={<ContactUs />} />,
  <Route key="notif" path="notifications" element={<AdminNotificationsPage />} />,
  <Route key="notif-sent" path="notifications/sent" element={<AdminNotificationHistoryPage />} />,
  <Route key="notif-hist" path="notifications/history" element={<AdminNotificationHistoryPage />} />,
  <Route key="notif-tpl" path="notifications/templates" element={<AdminNotificationTemplatesPage />} />,
  <Route key="notif-email" path="notifications/email-templates" element={<AdminEmailTemplatesPage />} />,
  <Route key="notif-bc" path="notifications/broadcast" element={<AdminBroadcastPage />} />,
  <Route key="notif-test" path="notifications/test" element={<AdminNotificationTestPage />} />,
  <Route key="audit" path="audit-logs" element={<AuditLogsPage />} />,
];
