import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getItemsCount, 
  getCategoryCount, 
  getSubcategoryCount, 
  getCouponAnalytics 
} from "../../apis/Dashboardapi";
import { FiZoomIn, FiX } from "react-icons/fi";     // cleaner zoom icons
import { 
  FiPackage, 
  FiLayers, 
  FiTag, 
  FiGift 
} from "react-icons/fi";   // subtle icons for cards

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [
          itemsRes,
          categoriesRes,
          subcategoriesRes,
          couponsRes
        ] = await Promise.all([
          getItemsCount(),
          getCategoryCount(),
          getSubcategoryCount(),
          getCouponAnalytics()
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
          }
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCounts();
  }, []);

  const StatCard = ({ title, data }) => (
    <div
      onClick={() => navigate(data.path)}
      className={`
        group bg-white border border-gray-200 rounded-xl p-6 
        shadow-sm hover:shadow-md hover:border-gray-300 
        transition-all duration-200 cursor-pointer
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
          {title}
        </h3>
        {data.icon}
      </div>

      <div className="text-4xl font-bold text-gray-900 mb-1">
        {data.total.toLocaleString()}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
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
    <div className="min-h-screen bg-gray-50/50 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1.5 text-gray-600">Overview of your store's key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Object.entries(counts).map(([key, value]) => (
            <StatCard key={key} title={key} data={value} />
          ))}
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
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