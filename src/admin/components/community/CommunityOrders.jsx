import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, ShoppingBag } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getCommunityOrder, getCommunityOrderSummary, listCommunityOrders } from "../../apis/CommunityOrdersapi";
import {
  CommunityBackLink,
  DetailDrawer,
  DetailSection,
  PageHeader,
  Pagination,
  StatCard,
  apiMessage,
  authorLabel,
  btnOutline,
  communityPageMeta,
  fmtDate,
  fmtInr,
  inputClass,
  pageToolbar,
  shortId,
  statusPill,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapCommunityData,
} from "./communityShared";

function orderFilters(params) {
  const keys = ["contentType", "contentAuthorId", "contentId", "itemStatus", "paymentStatus", "paymentMode", "from", "to", "search"];
  const query = {};
  keys.forEach((key) => {
    const value = params.get(key);
    if (value) query[key] = value;
  });
  return query;
}

const CommunityOrders = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) => `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");
  const [params, setParams] = useSearchParams();
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const orderId = params.get("orderId") || "";
  const filters = orderFilters(params);

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page" && key !== "orderId") next.delete("page");
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        getCommunityOrderSummary({ ...filters, top: 8 }),
        listCommunityOrders({ ...filters, page, limit: 20 }),
      ]);
      setSummary(unwrapCommunityData(sumRes));
      const pageMeta = communityPageMeta(listRes);
      setItems(pageMeta.items);
      setMeta(pageMeta);
    } catch (err) {
      toast.error(apiMessage(err));
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [page, params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!orderId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    getCommunityOrder(orderId)
      .then((res) => {
        if (!cancelled) setDetail(unwrapCommunityData(res));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(apiMessage(err));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const totals = summary?.totals;

  return (
    <div className="text-stone-900">
      <PageHeader
        icon={ShoppingBag}
        title="Community orders"
        subtitle="Orders whose items were added from a post or reel. This list is read-only."
        onRefresh={load}
        loading={loading}
        backLink={<CommunityBackLink to={ap("community")} />}
      />

      <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Gross" value={totals ? fmtInr(totals.grossRevenue) : "—"} sub="Every attributed line" accent="brand" />
        <StatCard label="Net" value={totals ? fmtInr(totals.netRevenue) : "—"} sub="Excludes cancelled, refunded, returned" accent="violet" />
        <StatCard label="Delivered" value={totals ? fmtInr(totals.deliveredRevenue) : "—"} sub="Delivered and completed exchanges" accent="success" />
        <StatCard label="Units" value={totals?.units ?? "—"} sub={`${totals?.orders ?? "—"} orders`} />
      </div>

      <div className={pageToolbar}>
        <select className={inputClass} value={params.get("contentType") || ""} onChange={(e) => setFilter("contentType", e.target.value)}>
          <option value="">Posts and reels</option>
          <option value="post">Posts</option>
          <option value="reel">Reels</option>
        </select>
        <input className={inputClass} placeholder="Line status" value={params.get("itemStatus") || ""} onChange={(e) => setFilter("itemStatus", e.target.value.trim())} />
        <input className={inputClass} placeholder="Payment status" value={params.get("paymentStatus") || ""} onChange={(e) => setFilter("paymentStatus", e.target.value.trim())} />
        <input className={inputClass} type="date" value={params.get("from") || ""} onChange={(e) => setFilter("from", e.target.value)} />
        <input className={inputClass} type="date" value={params.get("to") || ""} onChange={(e) => setFilter("to", e.target.value)} />
        <form
          className="flex min-w-[12rem] flex-1 gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("search", search.trim());
          }}
        >
          <input className={`${inputClass} min-w-0 flex-1`} value={search} placeholder="Order id, phone, or name" onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className={btnOutline}>Search</button>
        </form>
      </div>

      {(params.get("contentId") || params.get("contentAuthorId")) ? (
        <p className="mb-2 text-[11px] text-stone-600">
          Filtered from a post or creator.{" "}
          <button
            type="button"
            className="font-medium text-brand-700 hover:underline"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete("contentId");
              next.delete("contentAuthorId");
              next.delete("page");
              setParams(next);
            }}
          >
            Clear
          </button>
        </p>
      ) : null}

      <div className={tableScrollShell}>
        <table className="min-w-full text-left text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Buyer</th>
              <th className={thClass}>Payment</th>
              <th className={thClass}>Attributed</th>
              <th className={thClass}>Placed</th>
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
                <td colSpan={5} className="px-3 py-10 text-center text-stone-500">No community orders match</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row._id || row.orderId}
                  className="cursor-pointer border-b border-border/70 hover:bg-canvas-muted/30"
                  onClick={() => setFilter("orderId", row.orderId || row._id)}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-800">{row.orderId}</p>
                    <span className={statusPill(row.status)}>{row.status || "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <p>{authorLabel(row.buyer, row.buyer?.userId)}</p>
                    <p className="text-[10px] text-stone-500">{row.address?.city || row.address?.name || "—"}</p>
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.payment?.mode || "—"} · {row.payment?.status || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.attributedItems || 0} lines · {row.attributedUnits || 0} units
                    <br />
                    {fmtInr(row.attributedRevenue)}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{fmtDate(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={meta.totalPages || 1} disabled={loading} onPage={(n) => setFilter("page", String(n))} />
      </div>

      {summary?.byType?.length ? (
        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-2.5 text-[11px] shadow-sm">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">By type</p>
            {summary.byType.map((row) => (
              <p key={row.contentType} className="flex justify-between py-0.5">
                <span className="capitalize">{row.contentType}</span>
                <span>{fmtInr(row.netRevenue)} net · {row.orders} orders</span>
              </p>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-white p-2.5 text-[11px] shadow-sm">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">Top content</p>
            {(summary.byContent || []).map((row) => (
              <p key={row.contentId} className="flex justify-between gap-2 py-0.5">
                <Link className="truncate text-brand-700 hover:underline" to={ap(`community/content?id=${row.contentId}`)}>
                  {row.contentType} {shortId(row.contentId)}
                </Link>
                <span className="shrink-0">{fmtInr(row.netRevenue)}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {orderId ? (
        <DetailDrawer
          title={detail?.orderId || "Order"}
          subtitle={orderId}
          onClose={() => setFilter("orderId", "")}
        >
          {detailLoading && !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : detail ? (
            <>
              <DetailSection title="Order">
                <p>{authorLabel(detail.buyer, detail.buyer?.userId)} · {detail.address?.name || "—"} · {detail.address?.phone || "—"}</p>
                <p className="mt-1 text-stone-500">
                  {detail.address?.city || ""} {detail.address?.state || ""} · {detail.payment?.mode || "—"} · {detail.payment?.status || "—"}
                </p>
                <p className="mt-1">Order total {detail.orderTotal != null ? fmtInr(detail.orderTotal) : "—"}</p>
              </DetailSection>
              <DetailSection title="From the community">
                {(detail.lines || []).length === 0 ? <p className="text-stone-500">No matching lines</p> : (
                  <ul className="space-y-2">
                    {detail.lines.map((line, i) => (
                      <li key={`${line.itemId}-${i}`} className="rounded-md border border-border bg-white p-2">
                        <p className="font-medium">{line.name || line.sku || "Item"} · qty {line.quantity}</p>
                        <p className="text-stone-500">{fmtInr(line.revenue)} · <span className={statusPill(line.status)}>{line.status}</span></p>
                        <p className="mt-1">
                          <Link className="text-brand-700 hover:underline" to={ap(`community/content?id=${line.contentId}`)}>
                            Open {line.contentType}
                          </Link>
                          {" · "}
                          <Link className="text-brand-700 hover:underline" to={ap(`community/users?userId=${line.contentAuthorId}`)}>
                            Creator
                          </Link>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
              <DetailSection title="Every line on the order">
                <ul className="space-y-1">
                  {(detail.allItems || []).map((line, i) => (
                    <li key={`${line.sku || line.itemId}-${i}`} className="flex justify-between gap-2">
                      <span>{line.name || "Item"} × {line.quantity}</span>
                      <span className={line.fromCommunity ? statusPill("published") : statusPill("draft")}>
                        {line.fromCommunity ? "community" : "shop"}
                      </span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            </>
          ) : null}
        </DetailDrawer>
      ) : null}
    </div>
  );
};

export default CommunityOrders;
