import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  deleteOrderAgent,
  getOrderAgents,
} from "../../apis/OrderAgentapi";

const LIMIT = 20;
const btnPrimary =
  "rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800";
const inputClass =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800";

function unwrapData(res) {
  return res?.data?.data ?? res?.data ?? res;
}

export default function OrderAgentList() {
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
      const res = await getOrderAgents(page, LIMIT, debouncedSearch, statusFilter);
      const data = unwrapData(res);
      setAgents(data?.items || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load order agents");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [page, debouncedSearch, statusFilter]);

  const handleDelete = async (agent) => {
    if (!window.confirm(`Delete order agent "${agent.name}"?`)) return;
    try {
      await deleteOrderAgent(agent._id);
      toast.success("Order agent deleted");
      fetchAgents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Order Agents</h1>
          <p className="text-[11px] text-stone-500">
            Fulfilment staff — login at /order-agent
          </p>
        </div>
        <button
          type="button"
          className={`${btnPrimary} flex items-center gap-1.5`}
          onClick={() => navigate(ap("order-agents/create"))}
        >
          <Plus size={14} />
          Add agent
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClass} pl-8`}
            placeholder="Search name, phone, code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-stone-400" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agents.map((agent) => (
                <tr key={agent._id}>
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{agent.agentCode}</td>
                  <td className="px-4 py-3">{agent.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        agent.status === "OPEN"
                          ? "bg-green-100 text-green-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-2 inline-flex text-stone-600 hover:text-stone-900"
                      onClick={() => navigate(ap(`order-agents/edit/${agent._id}`))}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(agent)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!agents.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                    No order agents yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-stone-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
