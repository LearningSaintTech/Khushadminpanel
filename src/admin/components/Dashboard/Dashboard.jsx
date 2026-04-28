import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getItemsCount, 
  getCategoryCount, 
  getSubcategoryCount, 
  getCouponAnalytics,
  getOrdersCount,
  getActiveUsers,
} from "../../apis/Dashboardapi";
import { getAnalyticsSummary } from "../../apis/analyticsApi";
import { FiZoomIn, FiX } from "react-icons/fi";     // cleaner zoom icons
import { 
  FiPackage, 
  FiLayers, 
  FiTag, 
  FiGift,
  FiShoppingCart,
  FiUsers,
  FiActivity,
} from "react-icons/fi";   // subtle icons for cards

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const [analyticsKpis, setAnalyticsKpis] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const navigate = useNavigate();

  const toNumber = (value) => Number(value || 0);
  const sumLastDays = (rows = [], days = 7) =>
    rows
      .slice(-days)
      .reduce((sum, row) => sum + toNumber(row?.value), 0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [
          itemsRes,
          categoriesRes,
          subcategoriesRes,
          couponsRes,
          ordersRes,
          activeUsersRes,
        ] = await Promise.all([
          getItemsCount(),
          getCategoryCount(),
          getSubcategoryCount(),
          getCouponAnalytics(),
          getOrdersCount(),
          getActiveUsers({ page: 1, limit: 20 }),
        ]);

        setCounts({
          Items: {
            total: itemsRes?.data?.items?.totalItems ?? 0,
            active: itemsRes?.data?.items?.activeItems ?? 0,
            inactive: itemsRes?.data?.items?.inactiveItems ?? 0,
            path: "/admin/items",
            icon: <FiPackage className="w-6 h-6 text-gray-500" />
          },
          Categories: {
            total: categoriesRes?.data?.categories?.totalCategories ?? 0,
            active: categoriesRes?.data?.categories?.activeCategories ?? 0,
            inactive: categoriesRes?.data?.categories?.inactiveCategories ?? 0,
            path: "/admin/inventory/categories",
            icon: <FiLayers className="w-6 h-6 text-gray-500" />
          },
          Subcategories: {
            total: subcategoriesRes?.data?.subcategories?.totalSubCategories ?? 0,
            active: subcategoriesRes?.data?.subcategories?.activeSubCategories ?? 0,
            inactive: subcategoriesRes?.data?.subcategories?.inactiveSubCategories ?? 0,
            path: "/admin/subcategoriess",
            icon: <FiTag className="w-6 h-6 text-gray-500" />
          },
          Coupons: {
            total: couponsRes?.data?.summary?.totalCoupons ?? 0,
            active: couponsRes?.data?.summary?.activeCoupons ?? 0,
            inactive: couponsRes?.data?.summary?.inactiveCoupons ?? 0,
            path: "/admin/coupons",
            icon: <FiGift className="w-6 h-6 text-gray-500" />
          },
          Orders: {
            total: ordersRes?.data?.orders?.total ?? 0,
            active: ordersRes?.data?.orders?.active ?? 0,
            inactive: ordersRes?.data?.orders?.inactive ?? 0,
            path: "/admin/orders",
            icon: <FiShoppingCart className="w-6 h-6 text-gray-500" />
          },
          ActiveUsers: {
            total: activeUsersRes?.data?.totalUsers ?? 0,
            active: activeUsersRes?.data?.totalActiveUsers ?? 0,
            inactive:
              (activeUsersRes?.data?.totalUsers ?? 0) -
              (activeUsersRes?.data?.totalActiveUsers ?? 0),
            path: "/admin/active-users",
            icon: <FiUsers className="w-6 h-6 text-gray-500" />,
          },
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCounts();
  }, []);

  useEffect(() => {
    const fetchImportantAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await getAnalyticsSummary({ channel: "all", module: "all" });
        const metrics = res?.data?.metrics || {};
        const repeatOrderUsers = toNumber(metrics?.repeatOrderUsersCount);
        const checkout7d = sumLastDays(metrics?.checkoutTimeline || [], 7);
        const delivered7d = sumLastDays(metrics?.deliveredTimeline || [], 7);
        const orderedValue7d = sumLastDays(metrics?.orderedValueTimeline || [], 7);
        const androidInstalls7d = sumLastDays(metrics?.androidInstallTimeline || [], 7);
        const iphoneInstalls7d = sumLastDays(metrics?.iphoneInstallTimeline || [], 7);
        const totalInstalls7d = androidInstalls7d + iphoneInstalls7d;

        setAnalyticsKpis([
          { label: "App Installs (7d)", value: totalInstalls7d, accent: "text-indigo-700" },
          { label: "Android Installs (7d)", value: androidInstalls7d, accent: "text-emerald-700" },
          { label: "iPhone Installs (7d)", value: iphoneInstalls7d, accent: "text-violet-700" },
          { label: "Checkout Starts (7d)", value: checkout7d, accent: "text-amber-700" },
          { label: "Delivered Orders (7d)", value: delivered7d, accent: "text-sky-700" },
          { label: "Repeat Order Users", value: repeatOrderUsers, accent: "text-rose-700" },
          { label: "Ordered Value (7d)", value: `Rs ${orderedValue7d.toLocaleString()}`, accent: "text-gray-900" },
        ]);
      } catch (error) {
        console.error("Important analytics fetch error:", error);
        setAnalyticsKpis([]);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchImportantAnalytics();
  }, []);

  const StatCard = ({ title, data }) => (
    <div
      onClick={() => navigate(data.path)}
      className={`
        group bg-white border border-gray-200 rounded-lg p-3
        shadow-sm hover:shadow-md hover:border-gray-300 
        transition-all duration-200 cursor-pointer
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
          {title}
        </h3>
        <span className="scale-90">{data.icon}</span>
      </div>

      <div className="text-2xl font-bold text-gray-900 leading-tight">
        {data.total.toLocaleString()}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div>
          <span className="text-gray-500">Active</span>
          <p className="font-medium text-emerald-700">{data.active.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Inactive</span>
          <p className="font-medium text-rose-700">{data.inactive.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 py-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-600">Overview of your store's key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          {Object.entries(counts).map(([key, value]) => (
            <StatCard key={key} title={key} data={value} />
          ))}
        </div>

        {/* Important Analytics Numbers */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">Important Analytics Numbers</h2>
            </div>
            <button
              onClick={() => navigate("/admin/analytics/events")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open Analytics →
            </button>
          </div>
          {analyticsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : analyticsKpis.length === 0 ? (
            <p className="text-sm text-gray-500">Unable to load analytics numbers right now.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
              {analyticsKpis.map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-gray-200 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 leading-tight">{kpi.label}</p>
                  <p className={`mt-1 text-lg font-bold ${kpi.accent}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uncomment and improve banners section later if needed */}
        {/* <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Featured Banners</h2>
            <button
              onClick={() => navigate("/admin/banners")}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          {/* ... banner table content ... */}
        {/* </div> */}

        {/* Zoom Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden">
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 z-10 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-all"
              >
                <FiX size={24} />
              </button>

              {/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(zoomedImage.url) ||
              zoomedImage.url?.includes('video') ||
              zoomedImage.key?.includes('video') ? (
                <video
                  src={zoomedImage.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[90vh] object-contain rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={zoomedImage.url}
                  alt={zoomedImage.heading || "banner"}
                  className="max-w-full max-h-[90vh] object-contain rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {(zoomedImage.heading || zoomedImage.subHeading) && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-6 text-white">
                  {zoomedImage.heading && (
                    <p className="font-semibold text-lg">{zoomedImage.heading}</p>
                  )}
                  {zoomedImage.subHeading && (
                    <p className="text-sm text-gray-200 mt-1">{zoomedImage.subHeading}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}