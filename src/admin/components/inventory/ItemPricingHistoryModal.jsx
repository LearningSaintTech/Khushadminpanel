import { useCallback, useEffect, useState } from "react";
import {
  X,
  Loader2,
  History,
  ChevronLeft,
  ChevronRight,
  Layers,
  Palette,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getItemPricingHistory, getItemPricingAudit } from "../../apis/itemapi";

const SOURCE_LABELS = {
  admin_create: "Admin — create",
  admin_update: "Admin — update",
  bulk_upload: "Bulk upload",
  section_apply: "Section — discount applied",
  section_revert: "Section — discount reverted",
  designer_create: "Designer — create",
  designer_update: "Designer — update",
  designer_catalog_sync: "Designer — catalog sync",
  catalog_direct_update: "Direct catalog update",
  catalog_bulk_update: "Bulk catalog update",
  designer_direct_update: "Direct designer update",
};

function formatSource(row) {
  if (row?.sourceLabel) return row.sourceLabel;
  return SOURCE_LABELS[row?.source] || row?.source || "—";
}

function formatActor(row) {
  const type = String(row?.changedByType || "system");
  if (type === "admin") return "Admin";
  if (type === "subadmin") return "Sub-admin";
  if (type === "designer") return "Designer";
  return "System";
}

function formatDateTime(value) {
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

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN")}`;
}

function parseApiPayload(res) {
  const root = res?.data ?? res ?? {};
  return root?.data && typeof root.data === "object" ? root.data : root;
}

function catalogSnapshot(row, kind) {
  const snap = kind === "prev" ? row?.previousCatalog : row?.nextCatalog;
  if (!snap) return null;
  return snap;
}

function designerSnapshot(row, kind) {
  const snap = kind === "prev" ? row?.previousDesigner : row?.nextDesigner;
  if (!snap) return null;
  return snap;
}

function PriceChange({ before, after, emptyLabel = "—" }) {
  if (before == null && after == null) {
    return <span className="text-stone-400">{emptyLabel}</span>;
  }
  if (before == null || before === after) {
    return <span className="tabular-nums font-medium text-stone-800">{money(after)}</span>;
  }
  return (
    <span className="tabular-nums text-[11px] leading-snug">
      <span className="text-stone-500">{money(before)}</span>
      <span className="mx-1 text-stone-400">→</span>
      <span className="font-medium text-stone-900">{money(after)}</span>
    </span>
  );
}

function AuditCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-stone-200 bg-stone-50/60 p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-2">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

function PricingAuditPanel({ audit, auditError, auditLoading }) {
  if (auditLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-stone-500 text-sm border-b border-stone-100 mb-3">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        Loading pricing audit…
      </div>
    );
  }

  if (auditError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 mb-3">
        Audit summary unavailable: {auditError}
      </div>
    );
  }

  if (!audit) return null;

  const pricing = audit.currentPricing || {};
  const history = audit.history || {};
  const sections = audit.linkedSections || [];
  const flows = audit.changeFlows || [];
  const designer = audit.designerLink;

  return (
    <div className="space-y-3 mb-4 pb-4 border-b border-stone-200">
      <p className="text-xs font-semibold text-stone-800">Pricing audit</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <AuditCard title="Current price">
          <div className="space-y-1 text-[11px] text-stone-700">
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">MRP</span>
              <span className="font-semibold tabular-nums">{money(pricing.price)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Sale</span>
              <span className="font-semibold tabular-nums text-emerald-700">
                {money(pricing.discountedPrice)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Discount</span>
              <span className="font-medium tabular-nums">
                {pricing.discountPercentage != null ? `${pricing.discountPercentage}%` : "—"}
              </span>
            </div>
          </div>
        </AuditCard>

        <AuditCard title="History" icon={History}>
          <div className="space-y-1 text-[11px] text-stone-700">
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Total changes</span>
              <span className="font-semibold tabular-nums">{history.total ?? 0}</span>
            </div>
            <div className="text-stone-500">Last change</div>
            <div className="font-medium leading-snug">
              {history.lastChange?.at
                ? formatDateTime(history.lastChange.at)
                : "No records yet"}
            </div>
            {history.lastChange?.source ? (
              <div className="text-[10px] text-indigo-700">
                {SOURCE_LABELS[history.lastChange.source] || history.lastChange.source}
              </div>
            ) : null}
          </div>
        </AuditCard>

        <AuditCard title="Linked sections" icon={Layers} className="sm:col-span-1 lg:col-span-1">
          {sections.length === 0 ? (
            <p className="text-[11px] text-stone-500">Not in any homepage section</p>
          ) : (
            <ul className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {sections.map((section) => (
                <li key={section._id} className="text-[11px] leading-snug">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-stone-800 line-clamp-2">
                      {section.title}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${
                        section.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {section.isActive ? "Active" : "Off"}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {section.matchReasons?.join(" · ")}
                  </div>
                  {section.pricingActive ? (
                    <div className="text-[10px] text-amber-800 mt-0.5">
                      Pricing live
                      {section.globalDiscount ? ` · ${section.globalDiscount}` : ""}
                      {section.productDiscount ? ` · ${section.productDiscount}` : ""}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AuditCard>

        <AuditCard title="Designer link" icon={Palette}>
          {!designer ? (
            <p className="text-[11px] text-stone-500">No designer inventory linked</p>
          ) : (
            <div className="space-y-1 text-[11px] text-stone-700">
              <div className="font-medium text-stone-900">{designer.styleName || "—"}</div>
              <div className="font-mono text-[10px] text-stone-500">
                {designer.styleNumber || "—"}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Designer MRP</span>
                <span className="tabular-nums">{money(designer.mrp)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Designer sale</span>
                <span className="tabular-nums">{money(designer.discountPrice)}</span>
              </div>
              {designer.catalogUpdateStatus === "pending" ? (
                <div className="text-[10px] font-medium text-violet-700">
                  Pending catalog sync
                </div>
              ) : null}
            </div>
          )}
        </AuditCard>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-2">
          Flows that can change this item&apos;s price
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {flows.map((flow) => (
            <li
              key={flow.key}
              className="flex items-start gap-2 rounded-md border border-stone-100 px-2 py-1.5 text-[11px]"
            >
              {flow.logged ? (
                flow.applies ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-stone-400 mt-0.5" />
                )
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-stone-800">{flow.label}</div>
                <div className="text-[10px] text-stone-500">
                  {flow.logged ? "Logged in history" : "Not logged"}
                  {flow.applies ? " · Can affect this item" : " · Not active for this item"}
                </div>
                {flow.hint ? (
                  <div className="text-[10px] text-indigo-700 mt-0.5">{flow.hint}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ItemPricingHistoryModal({
  itemId,
  itemName = "",
  productId = "",
  open,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const loadAudit = useCallback(async () => {
    if (!itemId || !open) return;
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await getItemPricingAudit(itemId);
      setAudit(parseApiPayload(res));
    } catch (e) {
      setAudit(null);
      setAuditError(typeof e === "string" ? e : e?.message || "Failed to load audit");
    } finally {
      setAuditLoading(false);
    }
  }, [itemId, open]);

  const loadHistory = useCallback(async () => {
    if (!itemId || !open) return;
    setLoading(true);
    setError("");
    try {
      const res = await getItemPricingHistory(itemId, page, 20);
      const payload = parseApiPayload(res);
      setRows(Array.isArray(payload?.rows) ? payload.rows : []);
      setPagination(payload?.pagination ?? null);
    } catch (e) {
      setError(typeof e === "string" ? e : e?.message || "Failed to load pricing history");
      setRows([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [itemId, open, page]);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, itemId]);

  useEffect(() => {
    if (open) loadAudit();
  }, [open, loadAudit]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  if (!open) return null;

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-history-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2
              id="pricing-history-title"
              className="text-lg font-semibold text-stone-900 flex items-center gap-2"
            >
              <History className="h-5 w-5 text-indigo-600 shrink-0" />
              Pricing audit &amp; history
            </h2>
            <p className="text-sm text-stone-700 mt-0.5 truncate">{itemName || "Item"}</p>
            {productId ? (
              <p className="text-xs text-stone-500 font-mono mt-0.5">{productId}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3">
          <PricingAuditPanel
            audit={audit}
            auditError={auditError}
            auditLoading={auditLoading}
          />

          <p className="text-xs font-semibold text-stone-800 mb-2">Change log</p>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-stone-500 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              Loading history…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              No pricing changes recorded yet for this item.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 whitespace-nowrap">
                      Date & time
                    </th>
                    <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Source
                    </th>
                    <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 text-right">
                      MRP
                    </th>
                    <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 text-right">
                      Sale price
                    </th>
                    <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 text-right">
                      Discount %
                    </th>
                    <th className="py-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isDesigner = row.entityType === "designer_item";
                    const prevCat = catalogSnapshot(row, "prev");
                    const nextCat = catalogSnapshot(row, "next");
                    const prevDes = designerSnapshot(row, "prev");
                    const nextDes = designerSnapshot(row, "next");

                    const mrpBefore = isDesigner ? prevDes?.mrp : prevCat?.price;
                    const mrpAfter = isDesigner ? nextDes?.mrp : nextCat?.price;
                    const saleBefore = isDesigner
                      ? prevDes?.discountPrice
                      : prevCat?.discountedPrice;
                    const saleAfter = isDesigner
                      ? nextDes?.discountPrice
                      : nextCat?.discountedPrice;
                    const pctBefore = prevCat?.discountPercentage;
                    const pctAfter = nextCat?.discountPercentage;

                    return (
                      <tr
                        key={row._id}
                        className="border-b border-stone-100 last:border-0 hover:bg-stone-50/80"
                      >
                        <td className="py-2.5 pr-3 text-[11px] text-stone-600 whitespace-nowrap align-top">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3 text-[11px] text-stone-700 align-top max-w-[160px]">
                          <span className="font-medium">{formatSource(row)}</span>
                          {isDesigner ? (
                            <span className="mt-0.5 block text-[10px] text-violet-700">
                              Designer inventory
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-right align-top">
                          <PriceChange before={mrpBefore} after={mrpAfter} />
                        </td>
                        <td className="py-2.5 pr-3 text-right align-top">
                          <PriceChange before={saleBefore} after={saleAfter} />
                        </td>
                        <td className="py-2.5 pr-3 text-right align-top text-[11px] tabular-nums text-stone-700">
                          {!isDesigner && (pctBefore != null || pctAfter != null) ? (
                            pctBefore != null && pctBefore !== pctAfter ? (
                              <span>
                                {pctBefore}% → <span className="font-medium">{pctAfter}%</span>
                              </span>
                            ) : (
                              <span className="font-medium">{pctAfter ?? pctBefore}%</span>
                            )
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-[11px] text-stone-600 align-top">
                          {formatActor(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border shrink-0 text-xs text-stone-600">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} changes)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 hover:bg-stone-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 hover:bg-stone-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
