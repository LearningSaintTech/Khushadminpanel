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
  extractCommunityList,
  communityRowId,
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
      console.log("[Earnings] payouts params", params);
      const res = await getEarningsPayouts(params);
      const data = res?.data ?? res;
      const list = extractCommunityList(res, ["payouts"]);
      console.log("[Earnings] parsed payouts", { count: list.length, data, list });
      setItems(list);
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
    if (!modal?.id) {
      toast.error("Missing payoutId");
      return;
    }
    setActingId(modal.id);
    try {
      console.log("[Earnings] mark payout paid / reject", {
        payoutId: modal.id,
        action: modal.action,
        notes,
      });
      if (modal.action === "pay") {
        const body = notes.trim() ? { notes: notes.trim() } : {};
        await payEarningsPayout(modal.id, body);
        toast.success("Payout marked paid");
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
        subtitle="GET /admin/earnings/payouts · PATCH …/payouts/:payoutId/pay"
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
                const id = communityRowId(row);
                const st = String(row.status || "").toLowerCase();
                const pending = st === "pending" || st === "requested";
                return (
                  <tr
                    key={id}
                    className="border-t border-border/80 hover:bg-brand-50/30"
                  >
                    <td className="px-2 py-2 font-mono text-[10px]">
                      {shortId(row.userId?._id || row.userId)}
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
                            className="inline-flex items-center gap-1 rounded-lg border border-success/30 bg-success-bg px-2 py-1 text-[10px] font-semibold text-success hover:opacity-90"
                            title="PATCH /admin/earnings/payouts/:payoutId/pay"
                            onClick={() =>
                              setModal({ id, action: "pay", amount: row.amount })
                            }
                          >
                            <Check size={13} />
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger"
                            title="Reject"
                            onClick={() =>
                              setModal({ id, action: "reject" })
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
            <p className="mb-2 font-mono text-[10px] text-stone-500">
              payoutId: {modal.id}
            </p>
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
                {modal.action === "pay" ? "Mark paid" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EarningsPayouts;
