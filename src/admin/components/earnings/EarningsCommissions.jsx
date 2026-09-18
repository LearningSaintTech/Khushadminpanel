import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ScrollText, Loader2, Play } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  getEarningsCommissions,
  settleEarnings,
} from "../../apis/Earningsapi";
import {
  PageHeader,
  Pagination,
  inputClass,
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

const EarningsCommissions = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    role: "",
    userId: "",
    orderId: "",
    contentId: "",
    itemId: "",
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.entries(filters).forEach(([k, v]) => {
        if (v?.trim()) params[k] = v.trim();
      });
      const qs = new URLSearchParams(params).toString();
      console.log("[Commission ledger] API", {
        method: "GET",
        path: "/admin/earnings/commissions",
        url: `/api/admin/earnings/commissions?${qs}`,
        payload: params,
        filters,
      });
      const res = await getEarningsCommissions(params);
      const data = res?.data ?? res;
      const list = extractCommunityList(res, ["commissions"]);
      const pagination = data?.pagination || {};
      console.log("[Commission ledger] response", {
        success: res?.success,
        message: res?.message,
        raw: res,
        data,
        items: list,
        count: list.length,
        pagination,
        firstRow: list[0] || null,
      });
      setItems(list);
      setTotalPages(
        pagination.pages ||
          pagination.totalPages ||
          data?.totalPages ||
          1,
      );
      setTotal(pagination.total ?? data?.total ?? list.length);
    } catch (err) {
      console.error("[Commission ledger] error", {
        message: err?.message,
        status: err?.status,
        err,
      });
      toast.error(err?.message || "Failed to load commissions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSettle = async () => {
    if (!window.confirm("Run manual earnings settle tick?")) return;
    setSettling(true);
    try {
      console.log("[Commission ledger] settle payload", {});
      const settleRes = await settleEarnings();
      console.log("[Commission ledger] settle response", settleRes);
      toast.success("Settle requested");
      fetchList();
    } catch (err) {
      console.error("[Commission ledger] settle error", err);
      toast.error(err?.message || "Settle failed");
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={ScrollText}
        title="Commissions ledger"
        subtitle="GET /admin/earnings/commissions?role=designer|creator&status=pending_return_window|available"
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
          value={filters.status}
          onChange={(e) => {
            setPage(1);
            setFilters((p) => ({ ...p, status: e.target.value }));
          }}
        >
          <option value="">All statuses</option>
          <option value="pending_return_window">pending_return_window</option>
          <option value="available">available</option>
          <option value="paid_out">paid_out</option>
          <option value="cancelled">cancelled</option>
        </select>
        <select
          className={inputClass}
          value={filters.role}
          onChange={(e) => {
            setPage(1);
            setFilters((p) => ({ ...p, role: e.target.value }));
          }}
        >
          <option value="">All roles</option>
          <option value="designer">designer (designedById)</option>
          <option value="creator">creator (content / shop CTA)</option>
        </select>
        <input
          className={inputClass}
          placeholder="userId"
          value={filters.userId}
          onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="orderId"
          value={filters.orderId}
          onChange={(e) =>
            setFilters((p) => ({ ...p, orderId: e.target.value }))
          }
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
        <button
          type="button"
          disabled={settling}
          className={btnPrimary}
          onClick={handleSettle}
          title="POST /admin/earnings/settle"
        >
          {settling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Settle now
        </button>
        <span className="ml-auto text-[10px] text-stone-500">
          {total} records
        </span>
      </div>
      <p className="mb-2 text-[10px] leading-relaxed text-stone-500">
        Designer ledger:{" "}
        <code className="rounded bg-canvas-muted px-1">
          GET /admin/earnings/commissions?role=designer&amp;page=1&amp;limit=50
        </code>
        {" "}(leave status empty for pending + available). Pending only:{" "}
        <code className="rounded bg-canvas-muted px-1">status=pending_return_window</code>
        . Available (approved):{" "}
        <code className="rounded bg-canvas-muted px-1">status=available</code>
        . One designer: add{" "}
        <code className="rounded bg-canvas-muted px-1">userId=&lt;designedById&gt;</code>
        .
      </p>

      <div className={tableScrollShell}>
        <table className="w-full min-w-[900px] text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Amount</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Order</th>
              <th className={thClass}>Content</th>
              <th className={thClass}>Item</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-stone-500">
                  No commissions
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={communityRowId(row)}
                  className="border-t border-border/80 hover:bg-brand-50/30"
                >
                  <td className="px-2 py-2 font-mono text-[10px] text-stone-700">
                    {shortId(row.userId?._id || row.userId)}
                  </td>
                  <td className="px-2 py-2">{row.role || "—"}</td>
                  <td className="px-2 py-2 font-semibold text-stone-900">
                    {fmtInr(row.amount ?? row.commissionAmount)}
                  </td>
                  <td className="px-2 py-2">
                    <span className={statusPill(row.status)}>
                      {row.status || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px]">
                    {shortId(row.orderId)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px]">
                    {shortId(row.contentId)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px]">
                    {shortId(row.itemId)}
                  </td>
                </tr>
              ))
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
    </div>
  );
};

export default EarningsCommissions;
