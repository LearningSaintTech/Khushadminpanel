import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { getDesigners, toggleDesignerStatus } from "../../apis/Designerapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  alertDanger,
  btnIconEdit,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./designerShared";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const DesignerList = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedDesigner, setSelectedDesigner] = useState(null);

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);
  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const rangeStart = total === 0 ? 0 : rowIndexBase + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDesigners(page, limit, debouncedSearch);
      if (res?.success) {
        setRows(res.data?.designers || []);
        const pag = res.data?.pagination || {};
        setPagination({
          totalPages: pag.totalPages || 1,
          total: pag.total ?? res.data?.designers?.length ?? 0,
        });
      } else {
        setRows([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to fetch designers.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, limit, debouncedSearch]);

  const onToggle = async (id) => {
    if (!window.confirm("Change this designer's active status?")) return;
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
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Designers
        </h1>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Search name / email / phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button type="button" onClick={() => navigate(ap("designer/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
        <button
          type="button"
          onClick={() => navigate(ap("designer/inventory?syncCatalog=1"))}
          className={btnOutline}
          title="Import catalog items not yet on designer panel"
        >
          Sync catalog
        </button>
      </form>

      {error ? <div className={alertDanger}>{error}</div> : null}

      <div className={tableScrollShell}>
        <table className="min-w-[900px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>City</th>
              <th className={`${thClass} text-center`}>Status</th>
              <th className={`${thClass} text-center`}>Verified</th>
              <th className={`${thClass} min-w-[120px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                  No designers found.{" "}
                  <button
                    type="button"
                    onClick={() => navigate(ap("designer/create"))}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Create one
                  </button>
                </td>
              </tr>
            ) : (
              rows.map((d, idx) => (
                <tr key={d._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{d.name}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {d.countryCode} {d.phoneNumber}
                  </td>
                  <td className="px-2 py-2 text-stone-700">{d.email || "—"}</td>
                  <td className="px-2 py-2 text-stone-700">{d.city || "—"}</td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.isActive ? "bg-success-bg text-success" : "bg-canvas-muted text-stone-600"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.isNumberVerified
                          ? "bg-brand-50 text-brand-700"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {d.isNumberVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedDesigner(d)}
                      className={btnIconEdit}
                      title="View"
                      aria-label="View designer"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ap(`designer/edit/${d._id}`))}
                      className={`${btnIconEdit} ml-1.5`}
                      title="Edit"
                      aria-label="Edit designer"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ap(`designer/inventory?designerId=${d._id}`))}
                      className={`${btnIconEdit} ml-1.5`}
                      title="Inventory"
                      aria-label="Inventory"
                    >
                      <Package className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === d._id}
                      onClick={() => onToggle(d._id)}
                      className={`${btnOutline} ml-1.5 !px-2 !py-1 text-[10px]`}
                    >
                      {busyId === d._id ? "…" : d.isActive ? "Off" : "On"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 designers"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> total · Page{" "}
              <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {selectedDesigner ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setSelectedDesigner(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-900">Designer details</h2>
              <button type="button" onClick={() => setSelectedDesigner(null)} className={btnOutline}>
                Close
              </button>
            </div>
            <p className="mb-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[11px] text-brand-800">
              Open <strong>Inventory</strong> to review submissions, approve status, and list on
              catalog.
            </p>
            <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <div>
                <span className="font-medium text-stone-500">Name:</span> {selectedDesigner.name || "—"}
              </div>
              <div>
                <span className="font-medium text-stone-500">Phone:</span>{" "}
                {selectedDesigner.countryCode} {selectedDesigner.phoneNumber || "—"}
              </div>
              <div>
                <span className="font-medium text-stone-500">Email:</span>{" "}
                {selectedDesigner.email || "—"}
              </div>
              <div>
                <span className="font-medium text-stone-500">City:</span>{" "}
                {selectedDesigner.city || "—"}
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-stone-500">Address:</span>{" "}
                {selectedDesigner.address || "—"}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setSelectedDesigner(null);
                  navigate(ap(`designer/inventory?designerId=${selectedDesigner._id}`));
                }}
              >
                View inventory
              </button>
              <button
                type="button"
                className={btnOutline}
                onClick={() => {
                  setSelectedDesigner(null);
                  navigate(ap(`designer/edit/${selectedDesigner._id}`));
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DesignerList;
