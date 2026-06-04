import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPincodes, deletePincode } from "../../apis/Pincodeapi";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const inputClass =
  "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const tableScrollShell =
  "max-h-[calc(100vh-14rem)] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]";

const PincodePage = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchPincodes();
  }, [currentPage, debouncedSearchTerm, limit]);

  const fetchPincodes = async () => {
    try {
      setLoading(true);
      const res = await getPincodes(currentPage, limit, debouncedSearchTerm);
      const pincodeArray = res?.data?.data || [];
      const pagination = res?.data?.pagination || {};
      setPincodes(pincodeArray);
      setTotalPages(pagination.totalPages || 1);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load pincodes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pincode) => {
    if (!window.confirm("Are you sure you want to delete this pincode?")) return;
    try {
      await deletePincode(pincode);
      fetchPincodes();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete pincode");
    }
  };

  const rowIndexBase = (currentPage - 1) * limit;

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 text-base font-bold tracking-tight sm:text-lg">
          Serviceable pincodes
        </h1>
        <input
          type="text"
          placeholder="Search pincodes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${inputClass} w-full min-w-[140px] max-w-[220px]`}
        />
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => {
            setCurrentPage(1);
            setLimit(Number(e.target.value) || 20);
          }}
          title="Rows per page"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("pincode/create"))}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-12 text-[11px] text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
      ) : pincodes.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-4 py-10 text-center">
          <p className="text-[11px] font-medium text-stone-700">No pincodes yet</p>
          <button
            type="button"
            onClick={() => navigate(ap("pincode/create"))}
            className="mt-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Add your first pincode →
          </button>
        </div>
      ) : (
        <div className={tableScrollShell}>
          <table className="w-full min-w-[400px] text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
              <tr>
                <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  #
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Pincode
                </th>
                <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pincodes.map((item, idx) => (
                <tr key={item._id} className="border-t border-border/80 hover:bg-brand-50/30">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{item.pinCode}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(ap(`pincode/edit/${item.pinCode}`))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.pinCode)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition hover:bg-danger/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pincodes.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
          >
            Prev
          </button>
          <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition hover:bg-brand-600 hover:text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PincodePage;
