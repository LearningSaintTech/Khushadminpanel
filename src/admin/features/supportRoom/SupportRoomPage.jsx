import React, { useCallback, useEffect, useState } from "react";
import { Search, Headphones, Clock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getOrders, getSingleOrder } from "../orders/api/orderApi";
import SupportCaseWorkspace from "./SupportCaseWorkspace";
import {
  loadRecentCases,
  pushRecentCase,
  getBackendErrorMessage,
} from "./supportRoom.constants";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import {
  PageToolbar,
  Alert,
  fieldClass,
  labelClass,
  btnPrimary,
  btnOutline,
  tableScrollShell,
} from "../../components/notifications/notificationsShared";

export default function SupportRoomPage() {
  const { canUse, canMutate } = useModuleAccess();
  const canLookupOrders = canUse(["order"]);
  const canAct = canMutate(["support-room"]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [order, setOrder] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [recent, setRecent] = useState(() => loadRecentCases());

  const openCase = useCallback(async (orderId) => {
    if (!orderId) return;
    setCaseLoading(true);
    try {
      const res = await getSingleOrder(orderId, 1, 100);
      const body =
        res?.data !== undefined && res?.success !== undefined ? res : res?.data || res;
      const payload = body?.data ?? body;
      const loaded = payload?.order || payload;
      if (!loaded?.orderId) {
        throw new Error("Order not found");
      }
      if (!loaded.user && loaded.userId && typeof loaded.userId === "object") {
        loaded.user = {
          _id: loaded.userId._id,
          name: loaded.userId.name,
          phoneNumber: loaded.userId.phoneNumber || loaded.userId.phone,
          email: loaded.userId.email,
        };
      }
      setOrder(loaded);
      setRecent(
        pushRecentCase({
          orderId: loaded.orderId,
          name: loaded.user?.name || loaded.address?.name || "",
          phone:
            loaded.user?.phoneNumber ||
            loaded.user?.phone ||
            loaded.address?.phone ||
            "",
          openedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to open case"));
    } finally {
      setCaseLoading(false);
    }
  }, []);

  const refreshCase = useCallback(async () => {
    if (!order?.orderId) return;
    await openCase(order.orderId);
  }, [order?.orderId, openCase]);

  const runSearch = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const q = query.trim();
      if (!q) {
        toast.error("Enter an order ID, phone, or name");
        return;
      }
      setSearching(true);
      setResults([]);
      try {
        const looksLikeOrderId = /^[A-Za-z0-9_-]{6,}$/.test(q) && !/\s/.test(q);
        const res = await getOrders(
          1,
          20,
          q,
          "",
          "",
          "",
          "createdAt",
          "desc",
          "",
          "",
          "",
          "",
          "",
          false,
          false,
          looksLikeOrderId,
          ""
        );
        const data = res?.data?.data || res?.data || {};
        const list = data.orders || data.items || data || [];
        const rows = Array.isArray(list) ? list : [];
        setResults(rows);

        if (rows.length === 1) {
          const oid = rows[0].orderId || rows[0].id;
          if (oid) await openCase(oid);
        } else if (rows.length === 0 && looksLikeOrderId) {
          await openCase(q);
        }
      } catch (err) {
        toast.error(getBackendErrorMessage(err, "Search failed"));
      } finally {
        setSearching(false);
      }
    },
    [query, openCase]
  );

  useEffect(() => {
    setRecent(loadRecentCases());
  }, []);

  if (order) {
    return (
      <div className="text-stone-900">
        {caseLoading ? (
          <p className="mb-2 text-[11px] text-stone-500">Refreshing case…</p>
        ) : null}
        <SupportCaseWorkspace
          order={order}
          onClose={() => setOrder(null)}
          onRefresh={refreshCase}
          canAct={canAct}
        />
      </div>
    );
  }

  return (
    <div className="text-stone-900">
      <PageToolbar
        icon={Headphones}
        title="Support Room"
        subtitle="Search by order ID, phone, or name — then resolve with a full action audit trail."
      />

      {!canLookupOrders ? (
        <Alert variant="danger">
          Order lookup needs the <strong>Orders</strong> module (view is enough). Support actions
          use the <strong>Support Room</strong> module.
        </Alert>
      ) : null}
      {!canAct ? (
        <div className="mb-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-stone-800">
          View-only Support Room — you can open cases but cannot submit actions.
        </div>
      ) : null}

      <form
        onSubmit={runSearch}
        className="mb-2 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm"
      >
        <div className="min-w-[16rem] flex-1">
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order ID, phone, or customer name"
              className={`${fieldClass} pl-8`}
              autoFocus
              disabled={!canLookupOrders}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={searching || !canLookupOrders}
          className={btnPrimary}
        >
          {searching ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" /> Search
            </>
          )}
        </button>
      </form>

      {results.length > 1 ? (
        <div className={`${tableScrollShell} mb-2 max-h-80`}>
          <div className="border-b border-border bg-canvas-muted px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            {results.length} matches
          </div>
          <ul className="divide-y divide-border">
            {results.map((row) => {
              const oid = row.orderId || row.id;
              return (
                <li key={oid}>
                  <button
                    type="button"
                    onClick={() => openCase(oid)}
                    className="w-full px-2 py-1.5 text-left transition-colors hover:bg-brand-50/30"
                  >
                    <span className="font-mono text-[11px] font-medium text-stone-900">{oid}</span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">
                      {row.user?.name || row.address?.name || "—"} ·{" "}
                      {row.user?.phoneNumber || row.address?.phone || "—"} ·{" "}
                      {row.status || "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <Clock size={12} />
            Recent cases
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => (
              <li key={c.orderId}>
                <button
                  type="button"
                  onClick={() => openCase(c.orderId)}
                  className={`${btnOutline} w-full justify-start !px-2.5 !py-1.5`}
                >
                  <span className="min-w-0 text-left">
                    <span className="block font-mono text-[11px] font-medium text-stone-900">
                      {c.orderId}
                    </span>
                    <span className="block truncate text-[10px] text-stone-500">
                      {[c.name, c.phone].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {caseLoading ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> Opening case…
        </p>
      ) : null}
    </div>
  );
}
