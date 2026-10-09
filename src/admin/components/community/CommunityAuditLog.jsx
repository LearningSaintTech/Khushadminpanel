import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, ScrollText } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { listCommunityModerationLogs } from "../../apis/Communityapi";
import {
  CommunityBackLink,
  PageHeader,
  Pagination,
  apiMessage,
  btnOutline,
  communityPageMeta,
  fmtDate,
  inputClass,
  pageToolbar,
  shortId,
  tableHeadClass,
  tableScrollShell,
  thClass,
} from "./communityShared";

const ACTIONS = ["", "content.remove", "content.restore", "comment.delete", "source.create", "source.update", "source.disable"];
const TARGETS = ["", "content", "comment", "user", "source"];

const CommunityAuditLog = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) => `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [params, setParams] = useSearchParams();
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const action = params.get("action") || "";
  const targetType = params.get("targetType") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 30 };
      if (action) query.action = action;
      if (targetType) query.targetType = targetType;
      if (from) query.from = from;
      if (to) query.to = to;
      const res = await listCommunityModerationLogs(query);
      const pageMeta = communityPageMeta(res);
      setItems(pageMeta.items);
      setMeta(pageMeta);
    } catch (err) {
      toast.error(apiMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, action, targetType, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const targetLink = (row) => {
    if (row.targetType === "content" && row.targetId) return ap(`community/content?id=${row.targetId}`);
    if (row.targetType === "user" && row.targetId) return ap(`community/users?userId=${row.targetId}`);
    if (row.targetAuthorId) return ap(`community/users?userId=${row.targetAuthorId}`);
    return "";
  };

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        subtitle="Removes, restores, comment deletes, and source changes."
        onRefresh={load}
        loading={loading}
        backLink={<CommunityBackLink to={ap("community")} />}
      />

      <div className={pageToolbar}>
        <select className={inputClass} value={action} onChange={(e) => setFilter("action", e.target.value)}>
          {ACTIONS.map((a) => <option key={a || "all"} value={a}>{a || "All actions"}</option>)}
        </select>
        <select className={inputClass} value={targetType} onChange={(e) => setFilter("targetType", e.target.value)}>
          {TARGETS.map((t) => <option key={t || "all"} value={t}>{t || "All targets"}</option>)}
        </select>
        <input className={inputClass} type="date" value={from} onChange={(e) => setFilter("from", e.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(e) => setFilter("to", e.target.value)} />
        <button type="button" className={btnOutline} onClick={() => setParams(new URLSearchParams())}>Clear</button>
      </div>

      <div className={tableScrollShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>When</th>
              <th className={thClass}>Action</th>
              <th className={thClass}>Target</th>
              <th className={thClass}>Reason</th>
              <th className={thClass}>Admin</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-600" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">No log entries</td>
              </tr>
            ) : (
              items.map((row) => {
                const href = targetLink(row);
                return (
                  <tr key={row.id || row._id} className="border-b border-border/70">
                    <td className="px-3 py-2 text-stone-600">{fmtDate(row.createdAt)}</td>
                    <td className="px-3 py-2 font-medium text-stone-800">{row.action}</td>
                    <td className="px-3 py-2">
                      <p className="capitalize text-stone-600">{row.targetType}</p>
                      {href ? (
                        <Link className="font-mono text-[10px] text-brand-700 hover:underline" to={href}>
                          {shortId(row.targetId)}
                        </Link>
                      ) : (
                        <p className="font-mono text-[10px] text-stone-500">{shortId(row.targetId)}</p>
                      )}
                    </td>
                    <td className="max-w-[16rem] px-3 py-2 text-stone-600">{row.reason || "—"}</td>
                    <td className="px-3 py-2 text-stone-500">
                      {shortId(row.adminId)}
                      {row.adminRole ? ` · ${row.adminRole}` : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={meta.totalPages || 1} disabled={loading} onPage={(n) => setFilter("page", String(n))} />
      </div>
    </div>
  );
};

export default CommunityAuditLog;
