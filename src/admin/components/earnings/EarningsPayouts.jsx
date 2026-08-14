import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Banknote, Check, X, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getEarningsPayouts,
  payEarningsPayout,
  rejectEarningsPayout,
} from "../../apis/Earningsapi";
import {
  PageHeader,
  Pagination,
  inputClass,
  fieldClass,
  labelClass,
  tableScrollShell,
  btnOutline,
  btnPrimary,
  pageToolbar,
  tableHeadClass,
  thClass,
  fmtInr,
  shortId,
  statusPill,
} from "./earningsShared";

const EarningsPayouts = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("pending");
  const [userId, setUserId] = useState("");
  const [actingId, setActingId] = useState(null);
  const [notes, setNotes] = useState("");
  const [modal, setModal] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (status) params.status = status;
      if (userId.trim()) params.userId = userId.trim();
      const res = await getEarningsPayouts(params);
      const data = res?.data ?? res;
      const list =
        data?.items || data?.payouts || (Array.isArray(data) ? data : []);
      setItems(Array.isArray(list) ? list : []);
      setTotalPages(
        data?.pagination?.pages ||
          data?.pagination?.totalPages ||
          data?.totalPages ||
          1,
      );
    } catch (err) {
      toast.error(err?.message || "Failed to load payouts");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, userId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const runAction = async () => {
    if (!modal) return;
    setActingId(modal.id);
    try {
      if (modal.action === "pay") {
        await payEarningsPayout(modal.id, {
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        toast.success("Marked paid");
      } else {
        await rejectEarningsPayout(modal.id, {
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        toast.success("Payout rejected — balance restored");
      }
      setModal(null);
      setNotes("");
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActingId(null);
    }
  };

  const methodLabel = (row) => {
    const m = row.method || row.payoutMethod || {};
    if (m.type === "upi" || row.type === "upi") {
      return `UPI ${m.upiId || ""}`.trim();
    }
    if (m.type === "bank" || row.type === "bank") {
      return `Bank ${m.bankName || ""} …${String(m.accountNumber || "").slice(-4)}`.trim();
    }
    return m.type || row.type || "—";
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={Banknote}
        title="Earnings payouts"
        subtitle="Pay or reject after manual NEFT/UPI"
        onRefresh={fetchList}
        loading={loading}
        backLink={
          <Link
            to={ap("earnings")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Earnings
          </Link>
        }
      />

      <div className={pageToolbar}>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="rejected">rejected</option>
        </select>
        <input
          className={inputClass}
          placeholder="Filter userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button
          type="button"
          className={btnOutline}
          onClick={() => {
            setPage(1);
            fetchList();
          }}
        >
          Apply
        </button>
      </div>

      <div className={tableScrollShell}>
        <table className="w-full min-w-[800px] text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Amount</th>
              <th className={thClass}>Method</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Requested</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-stone-500">
                  No payouts
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const pending =
                  String(row.status || "").toLowerCase() === "pending";
                return (
                  <tr
                    key={row._id}
                    className="border-t border-border/80 hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2 font-mono text-[10px]">
                      {shortId(row.userId)}
                    </td>
                    <td className="px-2 py-2 font-semibold">
                      {fmtInr(row.amount)}
                    </td>
                    <td className="px-2 py-2 text-stone-700">
                      {methodLabel(row)}
                    </td>
                    <td className="px-2 py-2">
                      <span className={statusPill(row.status)}>
                        {row.status || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-stone-500">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      {pending ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-success/30 bg-success-bg text-success"
                            title="Mark paid"
                            onClick={() =>
                              setModal({ id: row._id, action: "pay" })
                            }
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger"
                            title="Reject"
                            onClick={() =>
                              setModal({ id: row._id, action: "reject" })
                            }
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        disabled={loading}
      />

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-sm font-semibold text-stone-900">
              {modal.action === "pay" ? "Mark payout paid" : "Reject payout"}
            </h3>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              className={`${fieldClass} mb-3 min-h-[64px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="NEFT ref / reason…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnOutline}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(actingId)}
                className={btnPrimary}
                onClick={runAction}
              >
                {actingId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EarningsPayouts;
