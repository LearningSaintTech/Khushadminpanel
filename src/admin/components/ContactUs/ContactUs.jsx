import { useEffect, useState } from "react";
import { apiConnector } from "../../services/Apiconnector";

const ContactUs = () => {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [isResolved, setIsResolved] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fetchRequests = async (pageToLoad = 1, filters = {}) => {
    try {
      setLoading(true);

      const res = await apiConnector(
        "GET",
        "/contact-us/getAll",
        null,
        {},
        {
          page: pageToLoad,
          limit,
          name: filters.name ?? search,
          isResolved: filters.isResolved ?? isResolved,
          startDate: filters.startDate ?? startDate,
          endDate: filters.endDate ?? endDate,
        }
      );

      const data = res?.data || res;
      setRequests(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, []);

  const applyFilters = () => fetchRequests(1);

  const resetFilters = () => {
    setSearch("");
    setIsResolved("");
    setStartDate("");
    setEndDate("");
    fetchRequests(1, { name: "", isResolved: "", startDate: "", endDate: "" });
  };

  const toggleResolve = async (id, currentStatus) => {
    try {
      await apiConnector(
        "PATCH",
        `/contact-us/${id}/resolve`,
        { resolved: !currentStatus }
      );
      fetchRequests(page);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Contact Requests</h1>
            <p className="text-gray-600 mt-1">Manage and track all incoming inquiries</p>
          </div>
          <div className="text-sm text-gray-500">
            Total: <span className="font-medium text-gray-700">{requests.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select
                value={isResolved}
                onChange={(e) => setIsResolved(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Status</option>
                <option value="true">Resolved</option>
                <option value="false">Pending</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={applyFilters}
                className="flex-1 bg-gray-900 hover:bg-black text-white  px-4 rounded-xl font-medium transition-all active:scale-95"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="flex-1 border border-gray-300 hover:bg-gray-50 py-3 px-6 rounded-xl font-medium transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">NAME</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">EMAIL</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">SUBJECT</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">MESSAGE</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">STATUS</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">DATE</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-500">
                      <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full mx-auto mb-3"></div>
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-500">
                      No contact requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-5 text-gray-600">{item.email}</td>
                      <td className="px-6 py-5 text-gray-600">
                        {item.subject || <span className="text-gray-400">—</span>}
                      </td>

                      {/* Message */}
                      <td className="px-6 py-5 max-w-xs">
                        <div className="flex items-start gap-3">
                          <div className="line-clamp-2 text-gray-700 flex-1">
                            {item.message}
                          </div>
                          {item.message?.length > 85 && (
                            <button
                              onClick={() => setSelectedMessage(item)}
                              className="text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all text-xl"
                            >
                              ↗
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              item.isResolved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.isResolved ? "Resolved" : "Pending"}
                          </span>

                          <button
                            onClick={() => toggleResolve(item._id, item.isResolved)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 underline decoration-dotted hover:decoration-solid transition-all"
                          >
                            {item.isResolved ? "Mark Pending" : "Mark Resolved"}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{page}</span> of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => fetchRequests(page - 1)}
                disabled={page <= 1}
                className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => fetchRequests(page + 1)}
                disabled={page >= totalPages}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-8 pt-8 pb-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Contact Details</h2>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-3xl text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">NAME</p>
                  <p className="font-medium">{selectedMessage.name}</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-1">EMAIL</p>
                  <p className="font-medium text-blue-600">{selectedMessage.email}</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-1">PHONE</p>
                  <p className="font-medium">{selectedMessage.phone || "—"}</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-1">SUBJECT</p>
                  <p className="font-medium">{selectedMessage.subject || "—"}</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-1">DATE</p>
                  <p className="font-medium">{formatDate(selectedMessage.createdAt)}</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-2">MESSAGE</p>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-8 py-4 flex justify-end border-t">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUs;