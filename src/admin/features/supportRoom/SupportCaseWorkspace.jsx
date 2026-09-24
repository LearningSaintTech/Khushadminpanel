import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Headphones, RefreshCw, X, Copy, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { listSupportActions } from "./api/supportRoomApi";
import {
  SUPPORT_ISSUES,
  getBackendErrorMessage,
} from "./supportRoom.constants";
import AddressAction from "./actions/AddressAction";
import CancelAction from "./actions/CancelAction";
import StatusCorrectAction from "./actions/StatusCorrectAction";
import ReturnAction from "./actions/ReturnAction";
import ExchangeAction from "./actions/ExchangeAction";
import SyncTrackingAction from "./actions/SyncTrackingAction";
import RefundAction from "./actions/RefundAction";

async function copyText(value, label = "Copied") {
  const text = value == null ? "" : String(value);
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
}

function ActionPanel({ issueId, order, onDone }) {
  switch (issueId) {
    case "address":
      return <AddressAction order={order} onDone={onDone} />;
    case "cancel":
      return <CancelAction order={order} onDone={onDone} />;
    case "status":
      return <StatusCorrectAction order={order} onDone={onDone} />;
    case "return":
      return <ReturnAction order={order} onDone={onDone} />;
    case "exchange":
      return <ExchangeAction order={order} onDone={onDone} />;
    case "sync":
      return <SyncTrackingAction order={order} onDone={onDone} />;
    case "refund":
      return <RefundAction order={order} onDone={onDone} />;
    default:
      return null;
  }
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function CopyChip({ value, label, prefix }) {
  if (!value) return null;
  const text = String(value);
  return (
    <span className="inline-flex items-center gap-0.5 max-w-full">
      {prefix ? <span className="text-stone-400">{prefix}</span> : null}
      <span className="truncate font-mono text-[10px] text-stone-600" title={text}>
        {text.length > 18 ? `…${text.slice(-12)}` : text}
      </span>
      <button
        type="button"
        onClick={() => copyText(text, label)}
        className="inline-flex shrink-0 rounded border border-stone-200 bg-white p-0.5 text-stone-400 hover:text-stone-700"
        title={label}
        aria-label={label}
      >
        <Copy size={10} />
      </button>
    </span>
  );
}

function resolveCustomer(order) {
  const user =
    order?.user && typeof order.user === "object"
      ? order.user
      : order?.userId && typeof order.userId === "object"
        ? order.userId
        : {};
  const addr = order?.address || {};
  const name =
    user.name ||
    addr.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "";
  const phone =
    user.phoneNumber ||
    user.phone ||
    addr.phone ||
    "";
  const email = user.email || "";
  return { name, phone, email, user, addr };
}

function lineAwb(it) {
  return (
    it?.shadowfax?.awb ||
    it?.delhivery?.waybill ||
    it?.delhivery?.lrn ||
    it?.shiprocket?.awb ||
    it?.shiprocket?.awb_code ||
    it?.trackingId ||
    it?.awb ||
    null
  );
}

function reverseAwbFromDoc(doc) {
  if (!doc || typeof doc !== "object") return null;
  return (
    doc?.shadowfax?.returnPickup?.awb ||
    doc?.delhivery?.returnPickup?.waybill ||
    doc?.returnPickup?.awb ||
    doc?.returnPickup?.waybill ||
    doc?.returnPickup?.manualTrackingId ||
    doc?.pickupAwb ||
    null
  );
}

function asDocList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return [value];
  return [];
}

function getItemReturns(it) {
  return asDocList(it?.returns).concat(
    asDocList(it?.return?.returns),
    it?.return && !Array.isArray(it.return) && it.return._id ? [it.return] : []
  );
}

function getItemExchanges(it) {
  return asDocList(it?.exchanges).concat(
    asDocList(it?.exchange?.exchanges),
    it?.exchange && !Array.isArray(it.exchange) && it.exchange._id
      ? [it.exchange]
      : []
  );
}

function suggestIssue(order) {
  const items = order?.items || [];
  const statuses = items.map((it) => String(it.status || "").toUpperCase());
  if (statuses.some((s) => s.includes("RETURN"))) return "return";
  if (statuses.some((s) => s.includes("EXCHANGE"))) return "exchange";
  if (!order?.address?.phone || !order?.address?.fullAddress) return "address";
  return null;
}

export default function SupportCaseWorkspace({
  order,
  onClose,
  onRefresh,
  canAct = true,
}) {
  const suggested = useMemo(() => suggestIssue(order), [order]);
  const [issueId, setIssueId] = useState(suggested);
  const [actions, setActions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    setIssueId(suggested);
  }, [order?.orderId, suggested]);

  const loadHistory = useCallback(async () => {
    if (!order?.orderId) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await listSupportActions(order.orderId, 1, 50);
      const data = res?.data?.data || res?.data || {};
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setActions(items);
    } catch (err) {
      setActions([]);
      setHistoryError(
        getBackendErrorMessage(err, "Failed to load support history")
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [order?.orderId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDone = async () => {
    await onRefresh?.();
    await loadHistory();
  };

  const { name, phone, email, addr } = resolveCustomer(order);
  const payment = order?.payment || {};
  const items = order?.items || [];
  const addressLine = [addr.fullAddress, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-stone-900">
            <Headphones size={18} className="text-brand-600 shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight truncate">
              {order.orderId}
            </h2>
            {order.orderId ? (
              <button
                type="button"
                onClick={() => copyText(order.orderId, "Order ID copied")}
                className="inline-flex shrink-0 items-center justify-center rounded border border-stone-200 bg-white p-1 text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                title="Copy order ID"
                aria-label="Copy order ID"
              >
                <Copy size={14} />
              </button>
            ) : null}
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              {order.status || "—"}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-medium">{name || "Unknown customer"}</span>
            {phone ? (
              <>
                {" · "}
                <CopyChip value={phone} label="Phone copied" />
              </>
            ) : (
              <span className="text-stone-400"> · no phone</span>
            )}
            {email ? <span className="text-stone-500"> · {email}</span> : null}
            <span className="text-stone-500">
              {" · "}
              {payment.mode || "—"} / {payment.status || "—"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-stone-500 truncate max-w-2xl" title={addressLine}>
            {addressLine || "No address on file"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRefresh?.()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <X size={14} />
            Close case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
        <div className="xl:col-span-3 space-y-3">
          <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
              Issue picker
            </h3>
            <ul className="space-y-1">
              {SUPPORT_ISSUES.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => setIssueId(issue.id)}
                    className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${
                      issueId === issue.id
                        ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
                        : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {issue.label}
                      {suggested === issue.id ? (
                        <span className="ml-1 text-[10px] font-normal text-brand-600">
                          (suggested)
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">
                      {issue.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm max-h-80 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
              Lines ({items.length})
            </h3>
            <ul className="space-y-2">
              {items.map((it) => {
                const awb = lineAwb(it);
                const returns = getItemReturns(it);
                const exchanges = getItemExchanges(it);
                return (
                  <li
                    key={String(it._id || it.itemId)}
                    className="text-xs border-b border-stone-100 pb-2 last:border-0"
                  >
                    <div className="font-medium text-stone-800">
                      {it.sku || it.variant?.sku || "Item"}
                    </div>
                    <div className="text-stone-500">
                      {[it.variant?.color, it.variant?.size].filter(Boolean).join(" / ") ||
                        "—"}{" "}
                      · {it.status}
                    </div>
                    {awb ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <CopyChip value={awb} label="AWB copied" prefix="AWB" />
                      </div>
                    ) : null}
                    {returns.length === 0 && exchanges.length === 0 ? (
                      <div className="mt-0.5 text-stone-400">No return/exchange docs</div>
                    ) : null}
                    {returns.map((r, idx) => {
                      const rid = r._id || r.id || r.returnId;
                      const rAwb = reverseAwbFromDoc(r);
                      return (
                        <div
                          key={String(rid || idx)}
                          className="mt-1 space-y-0.5 rounded-lg bg-amber-50/80 px-2 py-1.5 text-amber-950"
                        >
                          <div className="font-semibold text-[10px] uppercase tracking-wide text-amber-800">
                            Return · {r.status || "—"}
                          </div>
                          <CopyChip value={rid} label="Return ID copied" prefix="ID" />
                          {rAwb ? (
                            <CopyChip value={rAwb} label="AWB copied" prefix="RVP" />
                          ) : null}
                          {r.reason ? (
                            <div className="text-[10px] text-stone-600 truncate" title={r.reason}>
                              {r.reason}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {exchanges.map((ex, idx) => {
                      const eid = ex._id || ex.id || ex.exchangeId;
                      const rAwb = reverseAwbFromDoc(ex);
                      const replOrder =
                        ex.replacementForward?.orderId || ex.replacementOrderId;
                      const replAwb = ex.replacementForward?.awb;
                      return (
                        <div
                          key={String(eid || idx)}
                          className="mt-1 space-y-0.5 rounded-lg bg-sky-50/80 px-2 py-1.5 text-sky-950"
                        >
                          <div className="font-semibold text-[10px] uppercase tracking-wide text-sky-800">
                            Exchange · {ex.status || "—"}
                          </div>
                          <CopyChip value={eid} label="Exchange ID copied" prefix="ID" />
                          {rAwb ? (
                            <CopyChip value={rAwb} label="AWB copied" prefix="RVP" />
                          ) : null}
                          {replOrder ? (
                            <CopyChip value={replOrder} label="Order ID copied" prefix="Repl" />
                          ) : null}
                          {replAwb ? (
                            <CopyChip value={replAwb} label="AWB copied" prefix="Fwd" />
                          ) : null}
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="xl:col-span-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm min-h-[280px]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">
              Action
            </h3>
            {issueId ? (
              canAct ? (
                <ActionPanel issueId={issueId} order={order} onDone={handleDone} />
              ) : (
                <p className="text-sm text-stone-500">
                  View-only access — you cannot submit support actions. Ask admin
                  for full <strong>Support Room</strong> module access.
                </p>
              )
            ) : (
              <p className="text-sm text-stone-500">
                Pick an issue on the left to open the corresponding action form.
              </p>
            )}
          </section>
        </div>

        <div className="xl:col-span-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm max-h-[560px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Support history
              </h3>
              <button
                type="button"
                onClick={loadHistory}
                className="text-[11px] text-brand-700 hover:underline"
              >
                {historyLoading ? "Loading…" : "Reload"}
              </button>
            </div>
            {historyError ? (
              <div className="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Could not load history</p>
                  <p className="mt-0.5 break-words text-amber-800">{historyError}</p>
                  <button
                    type="button"
                    onClick={loadHistory}
                    className="mt-1 font-semibold text-brand-700 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
            {!historyError && actions.length === 0 ? (
              <p className="text-sm text-stone-500 py-4">
                {historyLoading ? "Loading…" : "No support actions yet."}
              </p>
            ) : null}
            {actions.length > 0 ? (
              <ol className="space-y-3">
                {actions.map((a) => (
                  <li
                    key={a._id}
                    className="rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-800">
                        {a.actionType}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatWhen(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-600">{a.reason}</p>
                    <p className="mt-0.5 text-[10px] text-stone-400">
                      {a.actorRole}
                      {a.itemId ? ` · item ${a.itemId}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
