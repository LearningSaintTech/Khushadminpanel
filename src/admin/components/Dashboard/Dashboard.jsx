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
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
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
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) => {
    const t = String(suffix || "").replace(/^\/+/, "");
    return `${basePath}/${t}`.replace(/\/+/g, "/");
  };

  const [counts, setCounts] = useState({});
  const [analyticsKpis, setAnalyticsKpis] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const navigate = useNavigate();

  const toNumber = (value) => Number(value || 0);
  const sumLastDays = (rows = [], days = 7) =>
    rows.slice(-days).reduce((sum, row) => sum + toNumber(row?.value), 0);

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
            ...getCardData(itemsRes, "items"),
            path: ap("items"),
            icon: <FiPackage className="h-4 w-4 text-brand-500" />,
          },
          Categories: {
            ...getCardData(categoriesRes, "categories"),
            path: ap("inventory/categories"),
            icon: <FiLayers className="h-4 w-4 text-brand-500" />,
          },
          Subcategories: {
            ...getCardData(subcategoriesRes, "subcategories"),
            path: ap("subcategoriess"),
            icon: <FiTag className="h-4 w-4 text-brand-500" />,
          },
          Coupons: {
            ...getCardData(couponsRes, "summary"),
            path: ap("coupons"),
            icon: <FiGift className="h-4 w-4 text-gold-500" />,
          },
          Orders: {
            ...getCardData(ordersRes, "orders"),
            path: ap("orders"),
            icon: <FiShoppingCart className="h-4 w-4 text-brand-500" />,
          },
          ActiveUsers: {
            total: activeUsersRes?.data?.totalUsers ?? 0,
            active: activeUsersRes?.data?.totalActiveUsers ?? 0,
            inactive:
              (activeUsersRes?.data?.totalUsers ?? 0) -
              (activeUsersRes?.data?.totalActiveUsers ?? 0),
            path: ap("users/real"),
            icon: <FiUsers className="h-4 w-4 text-brand-500" />,
          },
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCounts();
  }, [basePath]);

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
      className="group h-full cursor-pointer rounded-xl border border-border bg-white p-3 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50/30"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-stone-700 group-hover:text-stone-900">
          {title}
        </h3>
        {data.icon}
      </div>

      <div className="mb-2 text-xl font-semibold text-stone-900">
        {data.total.toLocaleString()}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-stone-500">Active</span>
          <p className="font-medium text-success">{data.active.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-stone-500">Inactive</span>
          <p className="font-medium text-danger">{data.inactive.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Object.entries(counts).map(([key, value]) => (
          <StatCard key={key} title={key} data={value} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <FiActivity className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-stone-900">Important Analytics Numbers</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(ap("analytics/events"))}
            className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            View Full Analytics →
          </button>
        </div>

        <div className="p-3">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-14 animate-pulse rounded-lg bg-canvas-muted" />
              ))}
            </div>
          ) : analyticsKpis.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Unable to load analytics at the moment.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
              {analyticsKpis.map((kpi, index) => (
                <div key={index} className="rounded-lg border border-border p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-stone-900">{kpi.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
