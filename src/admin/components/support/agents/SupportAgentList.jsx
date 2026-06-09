import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import {
  deleteSupportAgent,
  getSupportAgents,
} from "../../../apis/SupportAgentapi";
import {
  btnPrimary,
  btnSecondary,
  formatDt,
  inputClass,
  tableShell,
  unwrapData,
} from "../supportShared";

const LIMIT = 20;

export default function SupportAgentList() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await getSupportAgents(page, LIMIT, debouncedSearch, statusFilter);
      const data = unwrapData(res);
      setAgents(data?.agents || data?.items || []);
      const pag = data?.pagination || {};
      setTotalPages(pag.totalPages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load support agents");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [page, debouncedSearch, statusFilter]);

  const handleDelete = async (agent) => {
    if (!window.confirm(`Delete agent "${agent.name}"?`)) return;
    try {
      await deleteSupportAgent(agent._id);
      toast.success("Agent deleted");
      fetchAgents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Support Agents</h1>
          <p className="text-[11px] text-stone-500">Manage chat support staff</p>
        </div>
        <button type="button" className={`${btnPrimary} flex items-center gap-1.5`} onClick={() => navigate(ap("support-agents/create"))}>
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClass} pl-8`}
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className={tableShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Badge</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tickets</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-stone-500">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-stone-500">
                  No agents found
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent._id} className="hover:bg-canvas-muted/50">
                  <td className="px-3 py-2 font-medium text-stone-900">{agent.name}</td>
                  <td className="px-3 py-2 text-stone-600">{agent.phoneNumber}</td>
                  <td className="px-3 py-2 text-stone-600">{agent.ticketNumber || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        agent.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{agent.assignedTicketsCount ?? 0}</td>
                  <td className="px-3 py-2 text-stone-500">{formatDt(agent.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-stone-500 hover:bg-canvas-muted hover:text-brand-600"
                        onClick={() => navigate(ap(`support-agents/edit/${agent._id}`))}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-stone-500 hover:bg-danger-bg hover:text-danger"
                        onClick={() => handleDelete(agent)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-stone-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button type="button" className={btnSecondary} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
