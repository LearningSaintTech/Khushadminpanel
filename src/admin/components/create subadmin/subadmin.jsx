import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSubAdmins, toggleSubAdminStatus, updateSubAdmin } from "../../apis/subadminapi";
import {
  Plus,
  Pencil,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  btnIconEdit,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./subadminShared";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const SubAdmin = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [subAdmins, setSubAdmins] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, limit]);

  const fetchSubAdmins = async () => {
    setLoading(true);
    try {
      const isActive =
        statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

      const res = await getSubAdmins(page, limit, debouncedSearch, isActive);

      if (res?.success) {
        setSubAdmins(res.data.subadmins || []);
        const pag = res.data.pagination || {};
        setTotalPages(pag.totalPages || 1);
        setTotal(pag.total ?? res.data.subadmins?.length ?? 0);
      } else {
        setSubAdmins([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load sub-admins:", err);
      setSubAdmins([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, [page, limit, debouncedSearch, statusFilter]);

  const handleToggle = async (id, currentStatus) => {
    if (!window.confirm(`Really ${currentStatus ? "deactivate" : "activate"} this sub-admin?`))
      return;
    try {
      await toggleSubAdminStatus(id);
      fetchSubAdmins();
    } catch {
      alert("Failed to change status");
    }
  };

  const handleRoleChange = async (id, currentRole) => {
    const nextRole = currentRole === "super_subadmin" ? "subadmin" : "super_subadmin";
    if (
      !window.confirm(
        `Change role to ${nextRole === "super_subadmin" ? "Super Subadmin" : "Subadmin"}?`,
      )
    )
      return;
    try {
      await updateSubAdmin(id, { role: nextRole });
      fetchSubAdmins();
    } catch (err) {
      console.error("Failed to change role:", err);
      alert("Failed to change role");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Sub-admins
        </h1>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name / email / phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} w-[120px]`}
          title="Status"
          aria-label="Status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          className={`${inputClass} w-[108px]`}
          title="Rows per page"
          aria-label="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("subadmin/module-access"))}
          className={btnOutline}
          title="Role module access"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Modules
        </button>
        <button type="button" onClick={() => navigate(ap("subadmin/create"))} className={btnPrimary}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[980px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>City</th>
              <th className={`${thClass} text-center`}>Status</th>
              <th className={`${thClass} text-center`}>Role</th>
              <th className={`${thClass} min-w-[90px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && subAdmins.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : subAdmins.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                  No sub-admins found.{" "}
                  <button
                    type="button"
                    onClick={() => navigate(ap("subadmin/create"))}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Create one
                  </button>
                </td>
              </tr>
            ) : (
              subAdmins.map((admin, idx) => (
                <tr key={admin._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-stone-900">
                    {admin.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {admin.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {admin.countryCode} {admin.phoneNumber || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">{admin.city || "—"}</td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggle(admin._id, admin.isActive)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                        admin.isActive
                          ? "bg-success-bg text-success hover:opacity-90"
                          : "bg-danger-bg text-danger hover:opacity-90"
                      }`}
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRoleChange(admin._id, admin.role)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                        admin.role === "super_subadmin"
                          ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                          : "bg-canvas-muted text-stone-700 hover:bg-stone-100"
                      }`}
                      title="Toggle role"
                    >
                      {admin.role === "super_subadmin" ? "Super" : "Subadmin"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(ap(`subadmin/edit/${admin._id}`))}
                      className={btnIconEdit}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ap(`subadmin/${admin._id}/module-access`))}
                      className={`${btnIconEdit} ml-1.5`}
                      title="Module access"
                      aria-label="Module access"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
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
            "0 sub-admins"
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
    </div>
  );
};

export default SubAdmin;
