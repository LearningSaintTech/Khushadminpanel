import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Send, Trash2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../../context/AdminPanelBasePathContext";
import { getSupportAgents } from "../../../apis/SupportAgentapi";
import {
  assignSupportTicket,
  deleteSupportTicket,
  getSupportTicketById,
  getSupportTicketHistory,
  getSupportTicketMessages,
  resolveSupportTicket,
  sendSupportTicketMessage,
  updateSupportTicketStatus,
} from "../../../apis/SupportTicketapi";
import {
  PriorityBadge,
  TICKET_STATUSES,
  TicketStatusBadge,
  btnPrimary,
  btnSecondary,
  formatDt,
  inputClass,
  refId,
  unwrapData,
} from "../supportShared";

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const chatEndRef = useRef(null);
  const ticketsListPath = `${basePath}/support-tickets`.replace(/\/+/g, "/");

  const loadTicket = useCallback(async () => {
    try {
      const [ticketRes, msgRes, histRes] = await Promise.all([
        getSupportTicketById(id),
        getSupportTicketMessages(id, 1, 100),
        getSupportTicketHistory(id),
      ]);

      const ticketData = unwrapData(ticketRes);
      const t = ticketData?.ticket || ticketData;
      setTicket(t);
      setSelectedAgentId(refId(t?.assignedAgentId));

      const msgData = unwrapData(msgRes);
      setMessages(msgData?.messages || msgData?.items || []);

      const histData = unwrapData(histRes);
      setHistory(histData?.history || histData?.timeline || histData?.items || []);
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Failed to load ticket");
      navigate(ticketsListPath);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, ticketsListPath]);

  useEffect(() => {
    setLoading(true);
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSupportAgents(1, 100, "", "");
        const data = unwrapData(res);
        setAgents(data?.agents || data?.items || []);
      } catch {
        setAgents([]);
      }
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendSupportTicketMessage(id, text);
      setMessageText("");
      const msgRes = await getSupportTicketMessages(id, 1, 100);
      const msgData = unwrapData(msgRes);
      setMessages(msgData?.messages || msgData?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgentId) {
      toast.error("Select an agent");
      return;
    }
    try {
      await assignSupportTicket(id, selectedAgentId);
      toast.success("Assigned");
      loadTicket();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Assign failed");
    }
  };

  const handleStatus = async (status) => {
    try {
      await updateSupportTicketStatus(id, status);
      toast.success("Status updated");
      loadTicket();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const handleResolve = async () => {
    try {
      await resolveSupportTicket(id);
      toast.success("Ticket resolved");
      loadTicket();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Resolve failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this ticket?")) return;
    try {
      await deleteSupportTicket(id);
      toast.success("Ticket deleted");
      navigate(ap("support-tickets"));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  if (!ticket) return null;

  const user = ticket.customerId || {};
  const order = ticket.order || ticket.orderId;
  const isTerminal = ["RESOLVED", "CLOSED"].includes(String(ticket.status || "").toUpperCase());

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={`${btnSecondary} flex items-center gap-1.5`} onClick={() => navigate(ap("support-tickets"))}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <button type="button" className="rounded-lg p-1.5 text-danger hover:bg-danger-bg" onClick={handleDelete} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-3 overflow-y-auto">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] text-stone-500">{ticket.ticketNumber}</p>
            <h1 className="mt-1 text-base font-semibold text-stone-900">{ticket.subject}</h1>
            <p className="mt-2 text-[11px] text-stone-600">{ticket.description || "—"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-stone-400">Issue type</dt>
                <dd className="font-medium">{ticket.issueType?.replace(/_/g, " ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Created</dt>
                <dd>{formatDt(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Customer</dt>
                <dd>{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Phone</dt>
                <dd>{user.phoneNumber || user.phone || "—"}</dd>
              </div>
              {order && (
                <div className="col-span-2">
                  <dt className="text-stone-400">Order</dt>
                  <dd className="font-mono text-[10px]">
                    {order != null && typeof order === "object" ? order.orderId || order._id : order}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Actions</h2>
            <div className="mt-3 space-y-2">
              <select
                className={`${inputClass} w-full`}
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                disabled={isTerminal}
              >
                <option value="">Unassigned</option>
                {agents.filter((a) => a.status === "OPEN").map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button type="button" className={`${btnSecondary} w-full`} disabled={isTerminal} onClick={handleAssign}>
                Assign agent
              </button>
              <select
                className={`${inputClass} w-full`}
                value={ticket.status}
                onChange={(e) => handleStatus(e.target.value)}
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              {!isTerminal && (
                <button type="button" className={`${btnPrimary} w-full`} onClick={handleResolve}>
                  Mark resolved
                </button>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">History</h2>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-[10px] text-stone-600">
                {history.map((h, i) => (
                  <li key={h._id || i} className="border-l-2 border-brand-200 pl-2">
                    <span className="font-medium">{h.action || h.type}</span>
                    {h.note ? ` — ${h.note}` : ""}
                    <div className="text-stone-400">{formatDt(h.createdAt || h.at)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-4 py-2 text-[11px] font-semibold text-stone-700">
            Conversation
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-center text-[11px] text-stone-400">No messages yet</p>
            ) : (
              messages.map((msg) => {
                const sender = String(msg.senderType || msg.senderRole || "").toUpperCase();
                const isStaff = sender === "AGENT" || sender === "ADMIN";
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] ${
                        isStaff
                          ? "bg-brand-600 text-white"
                          : "bg-canvas-muted text-stone-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message || msg.text}</p>
                      <p className={`mt-1 text-[9px] ${isStaff ? "text-brand-100" : "text-stone-400"}`}>
                        {formatDt(msg.createdAt)} · {sender || "USER"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          {!isTerminal && (
            <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
              <input
                className={`${inputClass} min-w-0 flex-1`}
                placeholder="Reply as admin…"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
              />
              <button type="submit" className={btnPrimary} disabled={sending || !messageText.trim()}>
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
