import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFeatures,
  deleteFeature,
} from "../../apis/Featureapi";

const Feature = () => {
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await getFeatures(page, 6);

      const featuresArray = res?.data?.features || [];
      const paginationData = res?.data?.pagination;

      setFeatures(featuresArray);
      setTotalPages(paginationData?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching features:", err);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [page]);


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this feature?")) return;
    try {
      setLoading(true);
      await deleteFeature(id);
      fetchFeatures();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-950 text-black dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">✨ Features</h1>
        <button
          onClick={() => navigate("/admin/features/create")}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition w-full sm:w-auto text-sm sm:text-base"
        >
          + Add Feature
        </button>
      </div>

      {/* Feature Grid */}
      {loading ? (
        <div className="text-center py-12 text-base sm:text-lg">Loading features...</div>
      ) : features.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          No features found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {features.map((item) => (
            <div
              key={item._id}
              className="group border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-900"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3">
                {item.icon?.imageUrl ? (
                  <img
                    src={item.icon.imageUrl}
                    alt={item.featureName}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                )}
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition line-clamp-1 flex-1 min-w-0">
                  {item.featureName}
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {item.description || "No description"}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => navigate(`/admin/features/edit/${item._id}`)}
                  className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm lg:text-base rounded-lg border border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full sm:w-auto"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm lg:text-base rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition w-full sm:w-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap justify-center items-center mt-6 sm:mt-8 gap-2 sm:gap-3 lg:gap-4">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage(page - 1)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          Prev
        </button>

        <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
          {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages || loading}
          onClick={() => setPage(page + 1)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          Next
        </button>
      </div>

    </div>
  );
};

export default Feature;