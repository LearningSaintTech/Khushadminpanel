import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { getMySupportTickets } from "../../apis/supportAgentApi";
import {
  PriorityBadge,
  TicketStatusBadge,
  btnSecondary,
  formatDt,
  tableShell,
  unwrapData,
} from "../../../admin/components/support/supportShared";

const LIMIT = 20;
const TABS = [
  { key: "active", label: "Active", statuses: ["ASSIGNED", "IN_PROGRESS"] },
  { key: "open", label: "Assigned", status: "ASSIGNED" },
  { key: "progress", label: "In progress", status: "IN_PROGRESS" },
  { key: "resolved", label: "Resolved", status: "RESOLVED" },
  { key: "all", label: "All", status: "" },
];

export default function TicketList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("active");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const currentTab = TABS.find((t) => t.key === tab) || TABS[0];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      if (currentTab.statuses) {
        const results = await Promise.all(
          currentTab.statuses.map((status) =>
            getMySupportTickets({ page, limit: LIMIT, status }),
          ),
        );
        const merged = results.flatMap((res) => {
          const data = unwrapData(res);
          return data?.tickets || [];
        });
        merged.sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.updatedAt || 0) -
            new Date(a.lastMessageAt || a.updatedAt || 0),
        );
        setTickets(merged);
        setTotalPages(1);
      } else {
        const res = await getMySupportTickets({
          page,
          limit: LIMIT,
          status: currentTab.status || undefined,
        });
        const data = unwrapData(res);
        setTickets(data?.tickets || []);
        setTotalPages(data?.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    fetchTickets();
  }, [tab, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">My tickets</h1>
        <p className="text-[11px] text-stone-500">Tickets assigned to you by admin</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "bg-white text-stone-600 ring-1 ring-border hover:bg-canvas-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tableShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <Loader2 className="mx-auto animate-spin text-stone-400" size={22} />
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500">
                  No tickets in this view
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket._id}
                  className="cursor-pointer hover:bg-canvas-muted/60"
                  onClick={() => navigate(`/support-agent/tickets/${ticket._id}`)}
                >
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-600">
                    {ticket.ticketNumber || ticket._id?.slice(-6)}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 font-medium text-stone-900">
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
                  <td className="px-3 py-2 text-stone-500">
                    {formatDt(ticket.lastMessageAt || ticket.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!currentTab.statuses && (
        <div className="flex items-center justify-between text-[11px] text-stone-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
