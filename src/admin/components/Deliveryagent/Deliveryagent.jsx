import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Pencil,
  Power,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getDeliveryAgents,
  toggleDeliveryAgentStatus,
} from "../../apis/Driverapi";
import {
  btnIconEdit,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapData,
} from "./deliveryAgentShared";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const DeliveryAgents = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [agents, setAgents] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const rowIndexBase = useMemo(() => (page - 1) * limit, [page, limit]);
  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const rangeStart = total === 0 ? 0 : rowIndexBase + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, limit]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const isActive =
        statusFilter === "" ? undefined : statusFilter === "true";
      const res = await getDeliveryAgents(page, limit, debouncedSearch, isActive);
      const data = unwrapData(res);
      setAgents(data?.deliveryAgents || []);
      setPagination(data?.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Fetch delivery agents error:", err);
      toast.error(err?.message || "Failed to load delivery agents");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [page, limit, debouncedSearch, statusFilter]);

  const handleToggleStatus = async (id) => {
    try {
      await toggleDeliveryAgentStatus(id);
      toast.success("Status updated");
      fetchAgents();
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  return (
    <div className="text-stone-900">
      <form
        className={`${pageToolbar} flex-nowrap items-center overflow-x-auto`}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Delivery Agents
        </h1>
        <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name / phone / vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[120px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Status"
          aria-label="Status"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          className="w-[108px] shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          title="Rows per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("driver/create"))}
          className={btnPrimary}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create
        </button>
      </form>

      <div className={tableScrollShell}>
        <table className="min-w-[720px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Vehicle</th>
              <th className={thClass}>City</th>
              <th className={`${thClass} text-center`}>Status</th>
              <th className={`${thClass} min-w-[100px] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                  No delivery agents found.{" "}
                  <button
                    type="button"
                    onClick={() => navigate(ap("driver/create"))}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Create one
                  </button>
                </td>
              </tr>
            ) : (
              agents.map((agent, idx) => (
                <tr key={agent._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-stone-900">
                    {agent.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {agent.countryCode ? `${agent.countryCode} ` : ""}
                    {agent.phoneNumber || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {agent.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {agent.bikeNumber || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-stone-700">
                    {agent.city || "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        agent.isActive
                          ? "bg-success-bg text-success"
                          : "bg-danger-bg text-danger"
                      }`}
                    >
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(ap(`driver/${agent._id}/deliveries`))}
                      className={`${btnIconEdit} mr-1.5`}
                      title="Delivered orders"
                      aria-label="Delivered orders"
                    >
                      <Package className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ap(`driver/edit/${agent._id}`))}
                      className={btnIconEdit}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(agent._id)}
                      className={`ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border transition ${
                        agent.isActive
                          ? "text-warning hover:bg-warning/10"
                          : "text-success hover:bg-success-bg"
                      }`}
                      title={agent.isActive ? "Deactivate" : "Activate"}
                      aria-label={agent.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
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
            "0 delivery agents"
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

export default DeliveryAgents;
