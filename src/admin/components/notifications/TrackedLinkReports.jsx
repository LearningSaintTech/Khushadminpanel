import { useCallback, useEffect, useState } from "react";
import { BarChart3, Copy, Download, Link2, Loader2, X } from "lucide-react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Alert, Field, FormSection, btnPrimary, fieldClass } from "./notificationsShared";

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadPeopleCsv(people, fileName) {
  const header = [
    "Name", "Phone", "Clicks", "First click", "Last click", "Product views",
    "Added to cart", "Checkout", "Orders", "Revenue", "Pages visited",
  ];
  const rows = people.map((p) => [
    p.name, p.phone, p.clicks, formatWhen(p.firstClickedAt), formatWhen(p.lastClickedAt),
    p.steps?.productViews || 0, p.steps?.addToCart || 0, p.steps?.checkout || 0,
    p.orders || 0, Math.round(p.revenue || 0), (p.pagesVisited || []).join(" | "),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-border bg-white p-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="text-sm font-semibold text-stone-900">{value}</p>
      {sub ? <p className="text-[10px] text-stone-500">{sub}</p> : null}
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-4xl rounded-xl bg-canvas p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-stone-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-canvas-muted"
            aria-label="Close report"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Funnel + per-person activity for one broadcast's tracked links. */
export function BroadcastLinkReportModal({ campaign, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminNotificationApi
      .getBroadcastLinkReport(campaign._id)
      .then((res) => !cancelled && setReport(res))
      .catch((err) => !cancelled && setError(err?.response?.data?.message || err?.message || "Could not load report"));
    return () => {
      cancelled = true;
    };
  }, [campaign._id]);

  const funnel = report?.funnel;
  const wa = report?.whatsappStats || {};
  const people = report?.people || [];

  return (
    <ModalShell title={`Link report — ${campaign.title}`} onClose={onClose}>
      {error ? <Alert>{error}</Alert> : null}
      {!report && !error ? (
        <p className="flex items-center gap-2 text-[11px] text-stone-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading…
        </p>
      ) : null}
      {report && !report.trackingEnabled ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          This broadcast was sent without an offer link, so clicks can't be traced to people. Add an
          offer link next time (and use a template whose button points to khushpehno.com/r/&#123;&#123;1&#125;&#125;).
        </p>
      ) : null}
      {report && report.trackingEnabled ? (
        <>
          <p className="mb-2 truncate text-[10px] text-stone-500">Offer link: {report.destinationUrl}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="WhatsApp sent" value={wa.sent ?? 0} sub={`${wa.delivered ?? 0} delivered · ${wa.read ?? 0} read`} />
            <Stat
              label="Clicked the link"
              value={funnel.clickedPeople}
              sub={`${funnel.clickRate ?? 0}% of ${funnel.recipients} · ${funnel.totalClicks} clicks`}
            />
            <Stat label="Orders" value={funnel.orders} />
            <Stat label="Revenue" value={inr(funnel.revenue)} />
          </div>

          <div className="mt-3 rounded-lg border border-border bg-white p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">Funnel (people)</p>
            {[{ key: "clicked", label: "Clicked the link", people: funnel.clickedPeople }, ...funnel.steps].map((step) => {
              const pct = funnel.recipients ? Math.round((step.people / funnel.recipients) * 1000) / 10 : 0;
              return (
                <div key={step.key} className="mb-1 flex items-center gap-2">
                  <span className="w-32 shrink-0 text-[10px] text-stone-700">{step.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-stone-100">
                    <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[10px] text-stone-600">
                    {step.people} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-stone-800">People who clicked ({people.length})</p>
            {people.length ? (
              <button
                type="button"
                className={btnPrimary}
                onClick={() => downloadPeopleCsv(people, `broadcast-${campaign._id}-clicks.csv`)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden /> CSV
              </button>
            ) : null}
          </div>
          {people.length === 0 ? (
            <p className="mt-1 text-[11px] text-stone-500">Nobody has opened the link yet.</p>
          ) : (
            <div className="mt-1 max-h-[50vh] overflow-auto rounded-lg border border-border bg-white">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-canvas-muted text-stone-600">
                  <tr>
                    <th className="p-1.5">Customer</th>
                    <th className="p-1.5">Clicks</th>
                    <th className="p-1.5">Last click</th>
                    <th className="p-1.5">Products</th>
                    <th className="p-1.5">Cart</th>
                    <th className="p-1.5">Checkout</th>
                    <th className="p-1.5">Orders</th>
                    <th className="p-1.5">Revenue</th>
                    <th className="p-1.5">Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {people.map((p) => (
                    <tr key={p.code}>
                      <td className="p-1.5">
                        <p className="font-medium text-stone-900">{p.name || "—"}</p>
                        <p className="text-stone-500">{p.phone}</p>
                      </td>
                      <td className="p-1.5">{p.clicks}</td>
                      <td className="p-1.5 whitespace-nowrap">{formatWhen(p.lastClickedAt)}</td>
                      <td className="p-1.5">{p.steps?.productViews || 0}</td>
                      <td className="p-1.5">{p.steps?.addToCart || 0}</td>
                      <td className="p-1.5">{p.steps?.checkout || 0}</td>
                      <td className="p-1.5">{p.orders || 0}</td>
                      <td className="p-1.5">{p.revenue ? inr(p.revenue) : "—"}</td>
                      <td className="max-w-[220px] p-1.5">
                        <p className="line-clamp-2 break-all text-stone-500">{(p.pagesVisited || []).join(", ") || "—"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </ModalShell>
  );
}

function GenericLinkReportModal({ link, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminNotificationApi
      .getTrackedLinkReport(link._id)
      .then((res) => !cancelled && setReport(res))
      .catch((err) => !cancelled && setError(err?.response?.data?.message || err?.message || "Could not load report"));
    return () => {
      cancelled = true;
    };
  }, [link._id]);

  const steps = report?.eventsFromLink || {};
  return (
    <ModalShell title={`Link report — ${link.name}`} onClose={onClose}>
      {error ? <Alert>{error}</Alert> : null}
      {!report && !error ? <p className="text-[11px] text-stone-500">Loading…</p> : null}
      {report ? (
        <>
          <p className="mb-2 break-all text-[10px] text-stone-500">
            {report.link.shortUrl} → {report.link.destinationUrl}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Clicks" value={report.totalClicks} sub={`${report.uniqueDevices} devices`} />
            <Stat label="Logged-in visitors" value={report.loggedInVisitors} />
            <Stat label="Orders" value={report.orders} />
            <Stat label="Revenue" value={inr(report.revenue)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Page views" value={steps.visited || 0} />
            <Stat label="Product views" value={steps.productViews || 0} />
            <Stat label="Add to cart" value={steps.addToCart || 0} />
            <Stat label="Checkouts" value={steps.checkout || 0} />
          </div>
          <p className="mt-2 text-[10px] text-stone-500">
            Shared links aren't personal, so activity is counted per visit rather than per customer.
            Use a broadcast offer link to see who exactly clicked.
          </p>
        </>
      ) : null}
    </ModalShell>
  );
}

/** Create short tracked links for any offer URL (to paste in WhatsApp, Instagram, etc.). */
export function TrackedLinksSection() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [utmSource, setUtmSource] = useState("whatsapp");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [reportFor, setReportFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminNotificationApi.listTrackedLinks({ limit: 50 });
      setList(Array.isArray(res?.list) ? res.list : []);
    } catch {
      // keep list
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await adminNotificationApi.createTrackedLink({ name, destinationUrl, utmSource });
      setName("");
      setDestinationUrl("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not create link");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <FormSection
      title="Tracked links"
      hint="Make a short link for any offer page. Every click, visit, add-to-cart and order from it is counted."
    >
      <form onSubmit={create} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_0.6fr_auto] sm:items-end">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dussehra sale banner" className={fieldClass} />
        </Field>
        <Field label="Offer URL">
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://khushpehno.com/section/… or /sale"
            className={fieldClass}
          />
        </Field>
        <Field label="Shared on">
          <input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="whatsapp" className={fieldClass} />
        </Field>
        <button type="submit" disabled={creating} className={btnPrimary}>
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
          Create
        </button>
      </form>
      {error ? <div className="mt-2"><Alert>{error}</Alert></div> : null}
      {list.length ? (
        <ul className="mt-2 divide-y divide-border">
          {list.map((link) => (
            <li key={link._id} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-stone-900">{link.name}</p>
                <p className="truncate text-[10px] text-stone-500">
                  {link.shortUrl} → {link.destinationUrl}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-stone-600">{link.clickCount} clicks</span>
              <button type="button" onClick={() => copy(link.shortUrl)} className="shrink-0 rounded p-1 hover:bg-canvas-muted" title="Copy link">
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
              {copied === link.shortUrl ? <span className="text-[10px] text-emerald-700">Copied</span> : null}
              <button type="button" onClick={() => setReportFor(link)} className="shrink-0 rounded p-1 hover:bg-canvas-muted" title="Report">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-stone-500">No tracked links yet.</p>
      )}
      {reportFor ? <GenericLinkReportModal link={reportFor} onClose={() => setReportFor(null)} /> : null}
    </FormSection>
  );
}
