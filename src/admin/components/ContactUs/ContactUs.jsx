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

  // ✅ Fetch API (FIXED)
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

    fetchRequests(1, {
      name: "",
      isResolved: "",
      startDate: "",
      endDate: "",
    });
  };

  // 🔥 Toggle Resolve (refetch based)
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
    return d.toLocaleString("en-IN");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4 text-black">
        Contact Requests
      </h1>

      {/* 🔍 Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Search name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <select
          value={isResolved}
          onChange={(e) => setIsResolved(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Status</option>
          <option value="true">Resolved</option>
          <option value="false">Pending</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Apply
          </button>
          <button
            onClick={resetFilters}
            className="border px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 📋 Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full text-sm text-black">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  No Data Found
                </td>
              </tr>
            ) : (
              requests.map((item) => (
                <tr key={item._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.subject || "-"}</td>

                  {/* MESSAGE + INFO BUTTON */}
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-start gap-2">
                      <div className="line-clamp-2 flex-1">
                        {item.message}
                      </div>

                      {item.message?.length > 80 && (
                        <button
                          onClick={() => setSelectedMessage(item)}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-200"
                        >
                          ℹ️
                        </button>
                      )}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          item.isResolved
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.isResolved ? "Resolved" : "Pending"}
                      </span>

                      <button
                        onClick={() =>
                          toggleResolve(item._id, item.isResolved)
                        }
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                      >
                        {item.isResolved ? "Undo" : "Resolve"}
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center p-3 border-t text-sm">
          <span>
            Page {page} of {totalPages}
          </span>

          <div className="space-x-2">
            <button
              onClick={() => fetchRequests(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>

            <button
              onClick={() => fetchRequests(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 MODAL */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <button
              onClick={() => setSelectedMessage(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-3">
              Contact Details
            </h2>

            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Name:</strong> {selectedMessage.name}</p>
              <p><strong>Email:</strong> {selectedMessage.email}</p>
              <p><strong>Phone:</strong> {selectedMessage.phone || "-"}</p>
              <p><strong>Subject:</strong> {selectedMessage.subject || "-"}</p>
              <p><strong>Date:</strong> {formatDate(selectedMessage.createdAt)}</p>

              <div className="mt-3">
                <strong>Message:</strong>
                <div className="mt-1 whitespace-pre-wrap border p-2 rounded bg-gray-50">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUs;