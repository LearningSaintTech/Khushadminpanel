// PolicyManagement.jsx

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  createPolicy,
  getPolicies,
  updatePolicy,
  deletePolicy,
} from "../../apis/UspPolicy";

const initialForm = {
  text: "",
  policyType: "cancellation",
  order: "",
  isActive: true,
  icon: null,
};

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function PolicyManagement() {
  // ================= STATES =================
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPolicies, setTotalPolicies] = useState(0);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // ================= FETCH POLICIES =================
  const fetchPolicies = async (page = 1, itemsPerPage = limit) => {
    try {
      setLoading(true);
      console.log(`Fetching policies: Page ${page}, Limit ${itemsPerPage}`);

      const res = await getPolicies(page, itemsPerPage);

      if (res?.success) {
        setPolicies(res?.data?.policies || []);
        setTotalPolicies(res?.data?.pagination?.total || 0);
        setTotalPages(res?.data?.pagination?.totalPages || 1);
        setCurrentPage(res?.data?.pagination?.currentPage || page);
      }
    } catch (error) {
      console.error("Fetch Policies Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies(currentPage, limit);
  }, [currentPage, limit]);

  // ================= SEARCH (Client-side for now) =================
  const filteredPolicies = useMemo(() => {
    if (!search.trim()) return policies;

    return policies.filter((item) =>
      item?.text?.toLowerCase().includes(search.toLowerCase())
    );
  }, [policies, search]);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setForm((prev) => ({ ...prev, icon: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append("text", form.text);
      formData.append("policyType", form.policyType);
      formData.append("order", form.order);
      formData.append("isActive", form.isActive);

      if (form.icon) formData.append("icon", form.icon);

      let response;
      if (editingId) {
        response = await updatePolicy(editingId, formData);
      } else {
        response = await createPolicy(formData);
      }

      if (response?.success) {
        setForm(initialForm);
        setEditingId(null);
        fetchPolicies(1, limit); // Reset to first page after create/update
      }
    } catch (error) {
      console.error("Submit Error:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;

    try {
      const response = await deletePolicy(id);
      if (response?.success) {
        fetchPolicies(currentPage, limit);
      }
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // ================= EDIT =================
  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      text: item.text || "",
      policyType: item.policyType || "cancellation",
      order: item.order || "",
      isActive: item.isActive || false,
      icon: null,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ================= PAGINATION HANDLERS =================
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Policy Management</h1>
          <p className="text-gray-500 mt-1">Create, update and manage your policies.</p>
        </div>

        <button
          onClick={() => fetchPolicies(currentPage, limit)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-100 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* FORM */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        {/* Form content remains same */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-2xl">
            <ShieldCheck className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingId ? "Update Policy" : "Create New Policy"}
            </h2>
            <p className="text-sm text-gray-500">Fill all required details.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ... Your existing form fields ... */}
          <div className="lg:col-span-2">
            <label className="block mb-2 font-medium text-gray-700">Policy Text</label>
            <textarea
              name="text"
              value={form.text}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Enter policy..."
              className="w-full border border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Policy Type</label>
            <select
              name="policyType"
              value={form.policyType}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cancellation">Cancellation</option>
              <option value="shipping">Shipping</option>
              <option value="refund">Refund</option>
              <option value="exchange">Exchange</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Display Order</label>
            <input
              type="number"
              name="order"
              value={form.order}
              onChange={handleChange}
              placeholder="Enter order"
              className="w-full border border-gray-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Upload Icon</label>
            <input
              type="file"
              accept="image/*"
              name="icon"
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-2xl p-3 bg-white"
            />
          </div>

          <div className="flex items-center gap-3 mt-8">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="w-5 h-5"
            />
            <label className="font-medium text-gray-700">Active Policy</label>
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition"
            >
              <Plus size={18} />
              {submitLoading ? "Processing..." : editingId ? "Update Policy" : "Create Policy"}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE + PAGINATION */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">All Policies</h2>
            <p className="text-sm text-gray-500 mt-1">
              Total Policies: {totalPolicies} | Showing {filteredPolicies.length} results
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Limit Selector */}
            <select
              value={limit}
              onChange={handleLimitChange}
              className="border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} per page
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search policy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Icon</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Policy</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Order</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    Loading policies...
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    No policies found.
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((item) => (
                  <tr key={item._id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt="policy"
                          className="w-14 h-14 object-cover rounded-xl border"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 max-w-md">{item.text}</p>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {item.policyType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">#{item.order}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          item.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-xl transition"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-xl transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-xl ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}