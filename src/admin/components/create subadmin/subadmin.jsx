// src/components/SubAdmin.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSubAdmins, toggleSubAdminStatus } from "../../apis/subadminapi";
import {
  Plus,
  Edit,
  Power,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";

const SubAdmin = () => {
  const navigate = useNavigate();

  const [subAdmins, setSubAdmins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchSubAdmins = async () => {
    setLoading(true);
    try {
      const isActive =
        statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

      const res = await getSubAdmins(page, limit, debouncedSearch, isActive);

      if (res?.success) {
        setSubAdmins(res.data.subadmins || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load sub-admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, [page, debouncedSearch, statusFilter]);

  const handleCreate = () => navigate("/admin/subadmin/create");
  const handleEdit = (id) => navigate(`/admin/subadmin/edit/${id}`);

  const handleToggle = async (id, currentStatus) => {
    if (!window.confirm(`Really ${currentStatus ? "deactivate" : "activate"} this sub-admin?`)) return;

    try {
      await toggleSubAdminStatus(id);
      fetchSubAdmins();
    } catch (err) {
      alert("Failed to change status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Header + Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Sub-Admin Management
            </h1>
            <p className="mt-2 text-gray-600">Manage your team of sub-admins</p>
          </div>

          <button
            onClick={handleCreate}
            className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Sub-Admin
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-sm p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm min-w-[180px]"
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow border border-gray-200/80 overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
              <p>Loading sub-admins...</p>
            </div>
          ) : subAdmins.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sub-admins found</h3>
              <p className="text-gray-600">
                {debouncedSearch || statusFilter !== "active"
                  ? "Try adjusting your filters or search term"
                  : "Get started by creating your first sub-admin"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50/80 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-normal text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                      <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {subAdmins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                        <td className="px-4 py-4 whitespace-normal break-words">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium flex-shrink-0">
                              {admin.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="ml-3 font-medium text-gray-900 break-words">{admin.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 break-words text-gray-700">
                          <div className="flex items-center min-w-0">
                            <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="truncate">{admin.email || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                          <div className="flex items-center min-w-0">
                            <Phone className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="truncate">{admin.countryCode} {admin.phoneNumber || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                          <div className="flex items-center min-w-0">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="truncate">{admin.city || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggle(admin._id, admin.isActive)}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                              admin.isActive
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                                : "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200"
                            }`}
                          >
                            {admin.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(admin._id)}
                            className="text-indigo-600 hover:text-indigo-800 mr-5 transition-colors"
                            title="Edit sub-admin"
                          >
                            <Edit className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {subAdmins.map((admin) => (
                  <div key={admin._id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* ... mobile card content remains the same ... */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium flex-shrink-0">
                          {admin.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{admin.name || "—"}</h3>
                          <p className="text-sm text-gray-500 flex items-center mt-1 truncate">
                            <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                            {admin.email || "—"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                          admin.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-3 text-sm">
                      <div className="flex items-center text-gray-600 min-w-0">
                        <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{admin.countryCode} {admin.phoneNumber || "—"}</span>
                      </div>
                      <div className="flex items-center text-gray-600 min-w-0">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{admin.city || "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(admin._id)}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(admin._id, admin.isActive)}
                        className={`flex items-center gap-2 text-sm font-medium ${
                          admin.isActive ? "text-amber-600 hover:text-amber-800" : "text-emerald-600 hover:text-emerald-800"
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        {admin.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination – always shown when > 1 page */}
              {(
                <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 bg-gray-50/70">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium border min-w-[130px] justify-center transition-colors ${
                      page <= 1
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Previous
                  </button>

                  <span className="text-sm font-medium text-gray-700">
                    Page <span className="font-bold text-gray-900">{page}</span> of{" "}
                    <span className="font-bold text-gray-900">{pagination.totalPages}</span>
                  </span>

                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className={`inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium border min-w-[130px] justify-center transition-colors ${
                      page >= pagination.totalPages
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
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

export default SubAdmin;