import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getInfluencers,
  toggleInfluencerStatus,
} from "../../apis/Influencer";
import {
  Plus,
  Search,
  Edit,
  Power,
  User,
  Mail,
  MapPin,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Influencer = () => {
  const navigate = useNavigate();

  const [influencers, setInfluencers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, isActive]);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const res = await getInfluencers(page, limit, debouncedSearch, isActive);
      if (res?.success) {
        setInfluencers(res.data.influencers || []);
        setPagination(res.data.pagination || {});
      }
    } catch (err) {
      console.error("Fetch Influencers Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, [page, debouncedSearch, isActive]);

  const handleToggle = async (id) => {
    try {
      await toggleInfluencerStatus(id);
      fetchInfluencers();
    } catch (err) {
      console.error("Toggle Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Influencer Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your influencers and their profiles
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/influencer/create")}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Influencer
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-sm p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value === "true")}
              className="px-5 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm min-w-[180px]"
            >
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Table / Content */}
        <div className="bg-white rounded-2xl shadow border border-gray-200/80 overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
              <p>Loading influencers...</p>
            </div>
          ) : influencers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No influencers found
              </h3>
              <p className="text-gray-600">
                {debouncedSearch || !isActive
                  ? "Try adjusting your filters or search term"
                  : "Get started by creating your first influencer"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Followers
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {influencers.map((item) => {
                      const totalFollowers =
                        item.digitalSources?.reduce(
                          (sum, src) => sum + (src.followers || 0),
                          0
                        ) || 0;

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-indigo-50/30 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                {item.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <span className="ml-3 font-medium text-gray-900">
                                {item.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              {item.email || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              {item.city || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              {totalFollowers.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                item.isActive
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() =>
                                navigate(`/admin/influencer/edit/${item._id}`)
                              }
                              className="text-indigo-600 hover:text-indigo-800 mr-5 transition-colors"
                              title="Edit influencer"
                            >
                              <Edit className="w-5 h-5 inline" />
                            </button>

                            <button
                              onClick={() => handleToggle(item._id)}
                              className={`transition-colors ${
                                item.isActive
                                  ? "text-amber-600 hover:text-amber-800"
                                  : "text-emerald-600 hover:text-emerald-800"
                              }`}
                              title={item.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="w-5 h-5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {influencers.map((item) => {
                  const totalFollowers =
                    item.digitalSources?.reduce(
                      (sum, src) => sum + (src.followers || 0),
                      0
                    ) || 0;

                  return (
                    <div
                      key={item._id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                            {item.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="ml-3">
                            <h3 className="font-medium text-gray-900">
                              {item.name || "—"}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {item.email || "—"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {item.city || "—"}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          {totalFollowers.toLocaleString()} followers
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() =>
                            navigate(`/admin/influencer/edit/${item._id}`)
                          }
                          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(item._id)}
                          className={`flex items-center gap-2 text-sm font-medium ${
                            item.isActive
                              ? "text-amber-600 hover:text-amber-800"
                              : "text-emerald-600 hover:text-emerald-800"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                          {item.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50/50">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1.5" />
                    Previous
                  </button>

                  <span className="text-sm text-gray-700 font-medium">
                    Page <span className="font-bold">{page}</span> of{" "}
                    <span className="font-bold">
                      {pagination.totalPages || 1}
                    </span>
                  </span>

                  <button
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-1.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Influencer;
