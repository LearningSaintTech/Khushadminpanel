import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBrands,
  deleteBrand,
} from "../../apis/BrandApi";

const Brand = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // ================= FETCH BRANDS =================
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await getBrands(currentPage, limit);
      const data = res?.data?.data || res?.data || {};
      const brandList = data.brands || data.items || data || [];
      const totalCount = data.total || brandList.length || 0;
      
      setBrands(Array.isArray(brandList) ? brandList : []);
      setTotalPages(data.totalPages || data.pages || Math.ceil(totalCount / limit) || 1);
    } catch (err) {
      console.error("❌ Fetch brands error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [currentPage]);


  // ================= DELETE BRAND =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;

    try {
      await deleteBrand(id);
      // If deleting last item on page, go to previous page
      if (brands.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchBrands();
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("Failed to delete brand");
    }
  };

  // ================= EDIT HANDLER =================
  const handleEdit = (brand) => {
    navigate(`/admin/brands/edit/${brand._id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Brand Management
          </h1>
          <button
            onClick={() => navigate("/admin/brands/create")}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            + Add Brand
          </button>
        </div>

        {/* BRANDS TABLE */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">All Brands</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : brands.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No brands found. Add your first brand above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-6 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Logo
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-6 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="relative whitespace-nowrap px-6 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {brands.map((brand, idx) => (
                    <tr
                      key={brand._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        {brand.icon?.imageUrl ? (
                          <img
                            src={brand.icon.imageUrl}
                            alt={brand.name}
                            className="h-10 w-10 rounded-md object-contain ring-1 ring-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            No logo
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {brand.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(brand)}
                          className="mr-3 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(brand._id)}
                          className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
            <div className="text-sm text-gray-700 font-medium">
              Showing <span className="font-bold">{brands.length}</span> of{" "}
              <span className="font-bold">{totalPages * limit}</span> brands
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                Previous
              </button>

              <span className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 min-w-[140px] text-center">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-5 py-2.5 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Brand;