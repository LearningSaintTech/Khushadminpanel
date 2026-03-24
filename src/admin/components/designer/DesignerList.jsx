import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil } from "lucide-react";
import { getDesigners, toggleDesignerStatus } from "../../apis/Designerapi";

const DesignerList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedDesigner, setSelectedDesigner] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDesigners(page, limit, search);
      if (res?.success) {
        setRows(res.data?.designers || []);
        setPagination(res.data?.pagination || { totalPages: 1 });
      }
    } catch (err) {
      setError(err?.message || "Failed to fetch designers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, search]);

  const onToggle = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await toggleDesignerStatus(id);
      await fetchRows();
    } catch (err) {
      setError(err?.message || "Failed to update designer status.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Designers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage designer accounts and inventory access.</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition-colors" onClick={() => navigate("/admin/designer/create")}>
          Create Designer
        </button>
      </div>

      <div className="mb-4 sm:mb-5">
        <input
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5"
          placeholder="Search by name/email/phone"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="text-left p-3.5 font-semibold text-gray-700">Name</th>
              <th className="text-left p-3.5 font-semibold text-gray-700">Phone</th>
              <th className="text-left p-3.5 font-semibold text-gray-700">Email</th>
              <th className="text-left p-3.5 font-semibold text-gray-700">City</th>
              <th className="text-left p-3.5 font-semibold text-gray-700">Status</th>
              <th className="text-left p-3.5 font-semibold text-gray-700">Verified</th>
              <th className="text-right p-3.5 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-500" colSpan={7}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-gray-500" colSpan={7}>No designers found.</td></tr>
            ) : (
              rows.map((d) => (
                <tr key={d._id} className="border-t border-black/5">
                  <td className="p-3.5 font-medium text-gray-900">{d.name}</td>
                  <td className="p-3.5 text-gray-700">{d.countryCode} {d.phoneNumber}</td>
                  <td className="p-3.5 text-gray-700">{d.email || "-"}</td>
                  <td className="p-3.5 text-gray-700">{d.city || "-"}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${d.isNumberVerified ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {d.isNumberVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      onClick={() => setSelectedDesigner(d)}
                      title="View designer"
                      aria-label="View designer"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      onClick={() => navigate(`/admin/designer/edit/${d._id}`)}
                      title="Edit designer"
                      aria-label="Edit designer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={busyId === d._id} onClick={() => onToggle(d._id)}>
                      {busyId === d._id ? "Updating..." : d.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors" onClick={() => navigate(`/admin/designer/inventory?designerId=${d._id}`)}>
                      Inventory
                    </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm text-gray-700 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-700">Page {page} / {pagination.totalPages || 1}</span>
        <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm text-gray-700 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {selectedDesigner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Designer Details</h2>
              <button className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-black hover:text-white transition-colors" onClick={() => setSelectedDesigner(null)}>Close</button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><span className="font-medium">Name:</span> {selectedDesigner.name || "-"}</div>
              <div><span className="font-medium">Phone:</span> {(selectedDesigner.countryCode || "")} {selectedDesigner.phoneNumber || "-"}</div>
              <div><span className="font-medium">Email:</span> {selectedDesigner.email || "-"}</div>
              <div><span className="font-medium">City:</span> {selectedDesigner.city || "-"}</div>
              <div><span className="font-medium">Address:</span> {selectedDesigner.address || "-"}</div>
              <div><span className="font-medium">Pin Code:</span> {selectedDesigner.pinCode || "-"}</div>
              <div><span className="font-medium">Active:</span> {selectedDesigner.isActive ? "Yes" : "No"}</div>
              <div><span className="font-medium">Verified:</span> {selectedDesigner.isNumberVerified ? "Yes" : "No"}</div>
              <div className="sm:col-span-2"><span className="font-medium">Profile Image:</span> {selectedDesigner.profileImage || "-"}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DesignerList;

