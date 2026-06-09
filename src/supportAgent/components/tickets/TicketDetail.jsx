import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import {
  getMySupportTicket,
  getMyTicketHistory,
  getMyTicketMessages,
  resolveMyTicket,
  sendMyTicketMessage,
} from "../../apis/supportAgentApi";
import {
  PriorityBadge,
  TicketStatusBadge,
  btnPrimary,
  btnSecondary,
  formatDt,
  inputClass,
  unwrapData,
} from "../../../admin/components/support/supportShared";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const loadTicket = useCallback(async () => {
    try {
      const [ticketRes, msgRes, histRes] = await Promise.all([
        getMySupportTicket(id),
        getMyTicketMessages(id, 1, 100),
        getMyTicketHistory(id),
      ]);
      setTicket(unwrapData(ticketRes));
      const msgData = unwrapData(msgRes);
      setMessages(msgData?.messages || msgData?.items || []);
      const histData = unwrapData(histRes);
      setHistory(histData?.timeline || histData?.history || histData?.items || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load ticket");
      navigate("/support-agent/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    setLoading(true);
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendMyTicketMessage(id, text);
      setMessageText("");
      const msgRes = await getMyTicketMessages(id, 1, 100);
      const msgData = unwrapData(msgRes);
      setMessages(msgData?.messages || msgData?.items || []);
    } catch (err) {
      toast.error(err?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm("Mark this ticket as resolved?")) return;
    try {
      await resolveMyTicket(id);
      toast.success("Ticket resolved");
      loadTicket();
    } catch (err) {
      toast.error(err?.message || "Resolve failed");
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
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className={`${btnSecondary} flex items-center gap-1.5`}
          onClick={() => navigate("/support-agent/tickets")}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
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
                    {typeof order === "object" ? order.orderId || order._id : order}
                  </dd>
                </div>
              )}
              {ticket.product?.name && (
                <div className="col-span-2">
                  <dt className="text-stone-400">Product</dt>
                  <dd>{ticket.product.name}</dd>
                </div>
              )}
            </dl>
          </div>

          {!isTerminal && (
            <button type="button" className={`${btnPrimary} w-full`} onClick={handleResolve}>
              Mark resolved
            </button>
          )}

          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                History
              </h2>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-[10px] text-stone-600">
                {history.map((h, i) => (
                  <li key={h._id || i} className="border-l-2 border-brand-200 pl-2">
                    <span className="font-medium">{h.action || h.type || h.kind}</span>
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
                  <div key={msg._id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] ${
                        isStaff ? "bg-brand-600 text-white" : "bg-canvas-muted text-stone-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message || msg.text}</p>
                      <p
                        className={`mt-1 text-[9px] ${isStaff ? "text-brand-100" : "text-stone-400"}`}
                      >
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
                placeholder="Reply to customer…"
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
