import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAppPopup, getAppPopups, updateAppPopup } from "../../apis/appPopupApi";

const AppPopup = () => {
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const res = await getAppPopups(page, 10, statusFilter);
      const popupList = res?.data?.popups || [];
      const pagination = res?.data?.pagination || {};
      setPopups(popupList);
      setTotalPages(pagination.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch app popups:", error);
      setPopups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, [page, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this popup?")) return;
    try {
      await deleteAppPopup(id);
      await fetchPopups();
    } catch (error) {
      console.error("Delete popup error:", error);
      alert(error?.message || "Failed to delete popup");
    }
  };

  const handleToggleActive = async (popup) => {
    try {
      setTogglingId(popup._id);
      await updateAppPopup(popup._id, { isActive: !popup.isActive });
      setPopups((prev) =>
        prev.map((item) =>
          item._id === popup._id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (error) {
      console.error("Toggle popup status error:", error);
      alert(error?.message || "Failed to update popup status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="w-full bg-white text-black">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">App Popups</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button
            onClick={() => navigate("/admin/app-popup/create")}
            className="px-4 py-2 rounded-lg bg-black text-white font-medium"
          >
            + Add Popup
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center">Loading popups...</div>
      ) : popups.length === 0 ? (
        <div className="py-10 text-center text-gray-500">No popups found.</div>
      ) : (
        <div className="space-y-3">
          {popups.map((popup) => (
            <div
              key={popup._id}
              className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold truncate">{popup.title}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      popup.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {popup.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Popup ID: {popup.popupId}</p>
                <p className="text-sm text-gray-600 truncate">{popup.description || "No description"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(popup)}
                  disabled={togglingId === popup._id}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    popup.isActive ? "bg-green-500" : "bg-gray-300"
                  } disabled:opacity-50`}
                  title={popup.isActive ? "Set inactive" : "Set active"}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      popup.isActive ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="self-center text-xs text-gray-600 min-w-[68px]">
                  {togglingId === popup._id
                    ? "Updating..."
                    : popup.isActive
                    ? "Active"
                    : "Inactive"}
                </span>
                <button
                  onClick={() => navigate(`/admin/app-popup/edit/${popup._id}`)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(popup._id)}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center items-center mt-6 gap-3">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 border rounded-lg disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm">
          {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 border rounded-lg disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AppPopup;
