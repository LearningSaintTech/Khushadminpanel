import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Search, UserPlus, Zap } from "lucide-react";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import { getSupportAgents } from "../../../apis/SupportAgentapi";
import {
  assignNextSupportTicket,
  assignSupportTicket,
  getSupportTicketQueue,
  getSupportTickets,
} from "../../../apis/SupportTicketapi";
import {
  PriorityBadge,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketStatusBadge,
  btnPrimary,
  btnSecondary,
  formatDt,
  inputClass,
  tableShell,
  refId,
  unwrapData,
} from "../supportShared";

const LIMIT = 20;

export default function SupportTicketList() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [tab, setTab] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [agents, setAgents] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSupportAgents(1, 100, "", "OPEN");
        const data = unwrapData(res);
        setAgents(data?.agents || data?.items || []);
      } catch {
        setAgents([]);
      }
    })();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res =
        tab === "queue"
          ? await getSupportTicketQueue(page, LIMIT)
          : await getSupportTickets({
              page,
              limit: LIMIT,
              search: debouncedSearch || undefined,
              status: statusFilter || undefined,
              priority: priorityFilter || undefined,
            });
      const data = unwrapData(res);
      setTickets(data?.tickets || data?.items || []);
      const pag = data?.pagination || {};
      setTotalPages(pag.totalPages || 1);
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [tab, page, debouncedSearch, statusFilter, priorityFilter]);

  const openAssign = (ticket) => {
    setAssignModal(ticket);
    setSelectedAgentId(refId(ticket?.assignedAgentId));
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedAgentId) {
      toast.error("Select an agent");
      return;
    }
    setAssigning(true);
    try {
      await assignSupportTicket(assignModal._id, selectedAgentId);
      toast.success("Ticket assigned");
      setAssignModal(null);
      fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignNext = async () => {
    if (!selectedAgentId) {
      toast.error("Select an agent first");
      return;
    }
    setAssigning(true);
    try {
      const res = await assignNextSupportTicket(selectedAgentId);
      const data = unwrapData(res);
      const ticket = data?.ticket;
      if (ticket?._id) {
        toast.success("Next ticket assigned");
        navigate(ap(`support-tickets/${ticket._id}`));
      } else {
        toast.success(data?.message || "No tickets in queue");
        fetchTickets();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Assign next failed");
    } finally {
      setAssigning(false);
    }
  };

  const agentLabel = (ticket) => {
    const a = ticket.assignedAgentId;
    if (!a) return "Unassigned";
    if (typeof a === "object") return a.name || a.ticketNumber || "Agent";
    return "Assigned";
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Support Tickets</h1>
          <p className="text-[11px] text-stone-500">Customer chat support queue</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={inputClass}
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            <option value="">Select agent…</option>
            {agents.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.assignedTicketsCount ?? 0} active)
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${btnPrimary} flex items-center gap-1.5`}
            disabled={assigning || !selectedAgentId}
            onClick={handleAssignNext}
          >
            <Zap size={14} />
            Assign next
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {["all", "queue"].map((t) => (
          <button
            key={t}
            type="button"
            className={`border-b-2 px-3 py-2 text-[11px] font-semibold capitalize transition ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "queue" ? "Open queue" : "All tickets"}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClass} pl-8`}
              placeholder="Search ticket #, subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select className={inputClass} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={tableShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center">
                  <Loader2 className="mx-auto animate-spin text-stone-400" size={20} />
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket._id}
                  className="cursor-pointer hover:bg-canvas-muted/50"
                  onClick={() => navigate(ap(`support-tickets/${ticket._id}`))}
                >
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-600">
                    {ticket.ticketNumber || ticket._id?.slice(-6)}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-medium text-stone-900">
                    {ticket.subject || "—"}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {ticket.customerId?.name || ticket.customerId?.phoneNumber || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-3 py-2">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-3 py-2 text-stone-600">{agentLabel(ticket)}</td>
                  <td className="px-3 py-2 text-stone-500">{formatDt(ticket.updatedAt)}</td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-canvas-muted hover:text-brand-600"
                      title="Assign agent"
                      onClick={() => openAssign(ticket)}
                    >
                      <UserPlus size={14} />
                    </button>
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

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-stone-900">Assign ticket</h2>
            <p className="mt-1 text-[11px] text-stone-500">
              {assignModal.ticketNumber || assignModal.subject}
            </p>
            <select
              className={`${inputClass} mt-3 w-full`}
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <option value="">Select agent…</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setAssignModal(null)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} disabled={assigning} onClick={handleAssign}>
                {assigning ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
