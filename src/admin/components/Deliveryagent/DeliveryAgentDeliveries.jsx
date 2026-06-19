import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Package,
} from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getDeliveryAgentDeliveryHistory } from "../../apis/Driverapi";
import {
  btnOutline,
  formPageWrap,
  formToolbar,
  tableHeadClass,
  tableScrollShell,
  thClass,
  unwrapData,
} from "./deliveryAgentShared";

const LIMIT = 20;

function formatDt(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "—";
  const parts = [
    address.fullAddress,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.pincode || address.pinCode,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

function itemSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const names = items
    .map((it) => it?.productName || it?.name || it?.sku)
    .filter(Boolean);
  if (names.length === 0) return `${items.length} item(s)`;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

export default function DeliveryAgentDeliveries() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("driver"));
  };

  const [agent, setAgent] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const rowIndexBase = useMemo(() => (page - 1) * LIMIT, [page]);
  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const rangeStart = total === 0 ? 0 : rowIndexBase + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * LIMIT, total);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeliveryAgentDeliveryHistory(id, page, LIMIT)
      .then((res) => {
        if (cancelled) return;
        const data = unwrapData(res);
        setAgent(data?.agent || null);
        setDeliveries(Array.isArray(data?.list) ? data.list : []);
        setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.message || "Failed to load delivery history");
        setDeliveries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, page]);

  const agentLabel = agent
    ? `${agent.name || "Driver"}${agent.phoneNumber ? ` · ${agent.countryCode || ""}${agent.phoneNumber}` : ""}`
    : "Driver";

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <div className="mr-auto min-w-0">
          <h1 className="text-base font-bold tracking-tight sm:text-lg">Delivered orders</h1>
          <p className="truncate text-[11px] text-stone-500">{agentLabel}</p>
        </div>
      </div>

      <div className={tableScrollShell}>
        <table className="min-w-[800px] w-full text-[11px]">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Order ID</th>
              <th className={thClass}>Items</th>
              <th className={thClass}>Address</th>
              <th className={thClass}>Payment</th>
              <th className={thClass}>Amount</th>
              <th className={thClass}>Delivered at</th>
              <th className={`${thClass} text-right`}>Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                  <Package className="mx-auto mb-2 h-8 w-8 text-stone-300" aria-hidden />
                  No delivered orders yet for this driver.
                </td>
              </tr>
            ) : (
              deliveries.map((row, idx) => {
                const amount = Number(
                  row.order?.pricing?.finalPayable ?? row.amountToCollect ?? 0
                );
                const paymentLabel = row.paymentMode || row.order?.payment?.mode || "—";
                return (
                  <tr key={row._id} className="hover:bg-canvas-muted/50">
                    <td className="px-2 py-2 text-center text-[10px] font-semibold text-stone-500">
                      {rowIndexBase + idx + 1}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-stone-900">
                      {row.orderId || "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-2 py-2 text-stone-700" title={itemSummary(row.items)}>
                      {itemSummary(row.items)}
                      {Array.isArray(row.items) && row.items.length > 0 ? (
                        <span className="ml-1 text-stone-400">({row.items.length})</span>
                      ) : null}
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-2 text-stone-600" title={formatAddress(row.order?.address)}>
                      {formatAddress(row.order?.address)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-700">{paymentLabel}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-stone-900">
                      ₹{amount.toLocaleString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-500">
                      {formatDt(row.deliveredAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {row.orderId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-brand-600 hover:bg-brand-50"
                          onClick={() =>
                            navigate(`${ap("orders")}?open=${encodeURIComponent(row.orderId)}`)
                          }
                          title="Open order in admin"
                        >
                          View
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          {loading ? (
            "Loading…"
          ) : total === 0 ? (
            "0 deliveries"
          ) : (
            <>
              Showing <span className="font-medium text-stone-700">{rangeStart}</span>–
              <span className="font-medium text-stone-700">{rangeEnd}</span> of{" "}
              <span className="font-medium text-stone-700">{total}</span> delivered · Page{" "}
              <span className="font-medium text-stone-700">{page}</span> of{" "}
              <span className="font-medium text-stone-700">{totalPages}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={btnOutline}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className={btnOutline}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
