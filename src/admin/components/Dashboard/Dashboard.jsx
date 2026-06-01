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
import { FiActivity } from "react-icons/fi";     
import { 
  FiPackage, 
  FiLayers, 
  FiTag, 
  FiGift,
  FiShoppingCart,
  FiUsers,
} from "react-icons/fi";   

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [analyticsKpis, setAnalyticsKpis] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const navigate = useNavigate();

  const toNumber = (value) => Number(value || 0);
  const sumLastDays = (rows = [], days = 7) =>
    rows.slice(-days).reduce((sum, row) => sum + toNumber(row?.value), 0);

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
          Items: { ...getCardData(itemsRes, "items"), path: "/admin/items", icon: <FiPackage className="w-4 h-4 text-gray-500" /> },
          Categories: { ...getCardData(categoriesRes, "categories"), path: "/admin/inventory/categories", icon: <FiLayers className="w-4 h-4 text-gray-500" /> },
          Subcategories: { ...getCardData(subcategoriesRes, "subcategories"), path: "/admin/subcategoriess", icon: <FiTag className="w-4 h-4 text-gray-500" /> },
          Coupons: { ...getCardData(couponsRes, "summary"), path: "/admin/coupons", icon: <FiGift className="w-4 h-4 text-gray-500" /> },
          Orders: { ...getCardData(ordersRes, "orders"), path: "/admin/orders", icon: <FiShoppingCart className="w-4 h-4 text-gray-500" /> },
          ActiveUsers: { 
            total: activeUsersRes?.data?.totalUsers ?? 0,
            active: activeUsersRes?.data?.totalActiveUsers ?? 0,
            inactive: (activeUsersRes?.data?.totalUsers ?? 0) - (activeUsersRes?.data?.totalActiveUsers ?? 0),
            path: "/admin/users/real",
            icon: <FiUsers className="w-4 h-4 text-gray-500" />
          },
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCounts();
  }, []);

  // Helper to reduce repetition
 const getCardData = (res, key) => {
  const data = res?.data?.[key] || {};

  return {
    total:
      data.total ??
      data.totalItems ??
      data.totalCategories ??
      data.totalSubCategories ??
      res?.data?.summary?.totalCoupons ??
      0,

    active:
      data.active ??
      data.activeItems ??
      data.activeCategories ??
      data.activeSubCategories ??
      res?.data?.summary?.activeCoupons ??
      0,

    inactive:
      data.inactive ??
      data.inactiveItems ??
      data.inactiveCategories ??
      data.inactiveSubCategories ??
      res?.data?.summary?.inactiveCoupons ??
      0,
  };
};

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
          { label: "App Installs (7d)", value: totalInstalls7d },
          { label: "Android Installs (7d)", value: androidInstalls7d },
          { label: "iPhone Installs (7d)", value: iphoneInstalls7d },
          { label: "Checkout Starts (7d)", value: checkout7d },
          { label: "Delivered Orders (7d)", value: delivered7d },
          { label: "Repeat Order Users", value: repeatOrderUsers },
          { label: "Ordered Value (7d)", value: `Rs ${orderedValue7d.toLocaleString()}` },
        ]);
      } catch (error) {
        console.error("Analytics fetch error:", error);
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
      className="group bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-all cursor-pointer h-full shadow-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
          {title}
        </h3>
        {data.icon}
      </div>

      <div className="text-2xl font-semibold text-gray-900 mb-3">
        {data.total.toLocaleString()}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
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
    <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          {Object.entries(counts).map(([key, value]) => (
            <StatCard key={key} title={key} data={value} />
          ))}
        </div>

        {/* Important Analytics */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiActivity className="w-4 h-4 text-gray-700" />
              <h2 className="text-sm font-medium text-gray-900">Important Analytics Numbers</h2>
            </div>
            <button
              onClick={() => navigate("/admin/analytics/events")}
              className="text-xs text-gray-700 hover:text-black font-medium transition-colors"
            >
              View Full Analytics →
            </button>
          </div>

          <div className="p-4">
            {analyticsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div key={idx} className="h-16 bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : analyticsKpis.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Unable to load analytics at the moment.
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 rounded-xl">
                {analyticsKpis.map((kpi, index) => (
                  <div key={index} className="border border-gray-200 p-3 rounded-xl">
                    <p className="text-xs uppercase tracking-widest text-gray-500 font-medium">
                      {kpi.label}
                    </p>
                    <p className="mt-1.5 text-lg font-semibold text-gray-900">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}