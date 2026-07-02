import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import {
  deleteSupportAgent,
  getSupportAgents,
  updateSupportAgent,
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
  const [autoAssignmentFilter, setAutoAssignmentFilter] = useState("");
  const [togglingAgentId, setTogglingAgentId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, autoAssignmentFilter]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await getSupportAgents(
        page,
        LIMIT,
        debouncedSearch,
        statusFilter,
        autoAssignmentFilter
      );
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
  }, [page, debouncedSearch, statusFilter, autoAssignmentFilter]);

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

  const handleAutoAssignToggle = async (agent) => {
    setTogglingAgentId(agent._id);
    try {
      await updateSupportAgent(agent._id, {
        autoAssignmentEnabled: !agent.autoAssignmentEnabled,
      });
      toast.success(
        `Auto assignment ${agent.autoAssignmentEnabled ? "disabled" : "enabled"}`
      );
      fetchAgents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update auto assignment");
    } finally {
      setTogglingAgentId("");
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
        <select
          className={inputClass}
          value={autoAssignmentFilter}
          onChange={(e) => setAutoAssignmentFilter(e.target.value)}
        >
          <option value="">All assignment modes</option>
          <option value="true">Auto assignment enabled</option>
          <option value="false">Auto assignment disabled</option>
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
              <th className="px-3 py-2">Auto Assign</th>
              <th className="px-3 py-2">Tickets</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
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
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={agent.autoAssignmentEnabled}
                      disabled={togglingAgentId === agent._id}
                      onClick={() => handleAutoAssignToggle(agent)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full border transition ${
                        agent.autoAssignmentEnabled
                          ? "border-brand-600 bg-brand-600"
                          : "border-stone-300 bg-stone-300"
                      } ${togglingAgentId === agent._id ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <span className="sr-only">
                        Toggle auto assignment for {agent.name}
                      </span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          agent.autoAssignmentEnabled ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        agent.autoAssignmentEnabled
                          ? "bg-blue-100 text-blue-700"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {agent.autoAssignmentEnabled ? "Enabled" : "Disabled"}
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
