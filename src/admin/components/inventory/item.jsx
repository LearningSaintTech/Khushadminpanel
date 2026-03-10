import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getItemsBySubcategory,
} from "../../apis/itemapi";

export default function Items() {
  const { categoryId, subcategoryId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  console.log("[Items.jsx] Component mounted / re-rendered");
  console.log("[Items.jsx] Params → categoryId:", categoryId, "subcategoryId:", subcategoryId);

  // Fetch items
  const fetchItems = async (page = 1, limit = 10) => {
    console.log(`[Items.jsx] fetchItems called — page: ${page}, limit: ${limit}, subcategoryId: ${subcategoryId}`);

    try {
      setLoading(true);
      console.log("[Items.jsx] → Calling API: getItemsBySubcategory");

      const res = await getItemsBySubcategory(subcategoryId, page, limit);

      console.log("[Items.jsx] ← API response received");
      console.log("[Items.jsx]   Status:", res.status);
      console.log("[Items.jsx]   Data keys:", Object.keys(res.data || {}));
      console.log("[Items.jsx]   Items count:", res.data?.items?.length || 0);
      console.log("[Items.jsx]   Pagination:", res.data?.pagination);

      setItems(res.data?.items || []);
      setPagination(res.data?.pagination || null);

      console.log("[Items.jsx] State updated → items:", res.data?.items?.length || 0);
    } catch (err) {
      console.error("[Items.jsx] Fetch items FAILED");
      console.error("[Items.jsx] Error:", err);
      console.error("[Items.jsx] Error response:", err.response?.data);
      console.error("[Items.jsx] Error status:", err.response?.status);
    } finally {
      setLoading(false);
      console.log("[Items.jsx] Loading finished");
    }
  };

  useEffect(() => {
    console.log("[Items.jsx] useEffect triggered — fetching items");
    if (subcategoryId) {
      fetchItems(1); // always start from page 1 on subcategory change
    } else {
      console.warn("[Items.jsx] No subcategoryId → skipping fetch");
    }
  }, [subcategoryId]);

  const filteredItems = items.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (searchTerm) {
    console.log(`[Items.jsx] Filtering active — search: "${searchTerm}" → ${filteredItems.length} results`);
  }

  // Navigation
  const openCreate = () => {
    console.log("[Items.jsx] → Navigate to CREATE product");
    navigate(`/admin/inventory/items/${categoryId}/${subcategoryId}/create`);
  };

  const openEdit = (item) => {
    console.log("[Items.jsx] → Navigate to EDIT product:", item._id || item.productId, item.name);
    navigate(
      `/admin/inventory/items/${categoryId}/${subcategoryId}/edit/${
        item._id || item.productId
      }`
    );
  };

  const goBackToSubcategory = () => {
    console.log("[Items.jsx] → Back to subcategories list");
    navigate(`/admin/inventory/subcategories/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-white text-black scroll-smooth">
      {/* Top Header */}
      <div className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
              P
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Products
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Manage all items inside this subcategory
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors"
          >
            + Add Product
          </button>
        </div>

        {/* Sticky Search / Controls Bar */}
        <div className="border-t border-black/5 bg-white">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={goBackToSubcategory}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-black/10 text-xs sm:text-sm font-medium hover:bg-black hover:text-white transition-colors"
              >
                ← Back
              </button>

              <div className="flex-1 relative">
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    console.log("[Items.jsx] Search term changed:", e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  placeholder="Search products by name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-black/80 bg-white"
                />
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">
                  🔍
                </span>
              </div>

              <button
                onClick={openCreate}
                className="sm:hidden inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border border-black/5 rounded-2xl shadow-sm max-h-[68vh] overflow-y-auto hide-scrollbar scroll-smooth">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-black text-white text-[11px] sm:text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Image</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Discounted</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 text-sm">
                    Loading products...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 text-sm">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item._id}
                    onClick={() => {
                      console.log("[Items.jsx] Row clicked → view details:", item._id, item.name);
                      navigate(`/admin/inventory/items/${item._id}`);
                    }}
                    className="border-t border-black/5 hover:bg-black/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 align-middle text-xs text-gray-500">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="h-11 w-11 rounded-lg overflow-hidden border border-black/10 bg-gray-50">
                        <img
                          src={item?.thumbnail || "https://via.placeholder.com/50"}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle font-medium text-sm">
                      {item.name}
                    </td>

                    <td className="px-4 py-3 align-middle text-xs sm:text-sm text-gray-600 max-w-xs truncate">
                      {item.shortDescription || "—"}
                    </td>

                    <td className="px-4 py-3 align-middle text-right text-sm">
                      ₹{item.price}
                    </td>

                    <td className="px-4 py-3 align-middle text-right text-sm">
                      {item.discountedPrice ? (
                        <span className="font-semibold">
                          ₹{item.discountedPrice}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-black text-white">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold border border-black/20 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-middle text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(item);
                        }}
                        className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-black/20 hover:bg-black hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="mt-6 flex justify-center items-center gap-4 text-xs sm:text-sm">
            <button
              disabled={pagination.page <= 1}
              onClick={() => {
                console.log("[Items.jsx] Previous page clicked → page:", pagination.page - 1);
                fetchItems(pagination.page - 1);
              }}
              className="px-4 py-2 rounded-full border border-black/15 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
            >
              Previous
            </button>

            <span className="text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                console.log("[Items.jsx] Next page clicked → page:", pagination.page + 1);
                fetchItems(pagination.page + 1);
              }}
              className="px-4 py-2 rounded-full border border-black/15 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}