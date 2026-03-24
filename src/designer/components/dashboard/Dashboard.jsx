import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  User,
  Sparkles,
  Loader2,
  BarChart3,
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
  Archive,
  Layers,
  Factory,
} from "lucide-react";
import { listDesignerItems } from "../../apis/designerApi";

const STATUSES = [
  { key: "draft", label: "Drafts", icon: FileEdit, bar: "bg-amber-400", card: "border-amber-200 from-amber-50/90 to-white text-amber-950" },
  { key: "submitted", label: "Submitted", icon: Send, bar: "bg-blue-500", card: "border-blue-200 from-blue-50/90 to-white text-blue-950" },
  { key: "approved", label: "Approved", icon: CheckCircle2, bar: "bg-emerald-500", card: "border-emerald-200 from-emerald-50/90 to-white text-emerald-950" },
  { key: "rejected", label: "Rejected", icon: XCircle, bar: "bg-rose-500", card: "border-rose-200 from-rose-50/90 to-white text-rose-950" },
  { key: "archived", label: "Archived", icon: Archive, bar: "bg-slate-400", card: "border-slate-200 from-slate-50/90 to-white text-slate-900" },
];

const getStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-800";
  if (s === "submitted") return "bg-blue-100 text-blue-800";
  if (s === "rejected") return "bg-rose-100 text-rose-800";
  if (s === "archived") return "bg-slate-100 text-slate-800";
  return "bg-amber-100 text-amber-900";
};

const DesignerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({});
  const [recent, setRecent] = useState([]);
  const [productionSample, setProductionSample] = useState({ sum: 0, capped: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const countResults = await Promise.all(
          STATUSES.map(({ key }) =>
            listDesignerItems({ page: 1, limit: 1, status: key }).then((res) => ({
              key,
              total: res?.success ? Number(res.data?.pagination?.total ?? 0) : 0,
            }))
          )
        );
        if (cancelled) return;
        const nextCounts = {};
        let totalItems = 0;
        countResults.forEach(({ key, total }) => {
          nextCounts[key] = total;
          totalItems += total;
        });
        setCounts(nextCounts);

        const bulkLimit = 300;
        const bulkRes = await listDesignerItems({ page: 1, limit: bulkLimit });
        if (cancelled) return;
        const items = bulkRes?.success ? bulkRes.data?.items || [] : [];
        const totalFromApi = Number(bulkRes?.data?.pagination?.total ?? totalItems);
        const sumProd = items.reduce((acc, it) => acc + (Number(it.totalProductionQty) || 0), 0);
        setProductionSample({
          sum: sumProd,
          capped: totalFromApi > items.length,
        });
        setRecent(items.slice(0, 6));
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalDesigns = useMemo(
    () => STATUSES.reduce((acc, { key }) => acc + (Number(counts[key]) || 0), 0),
    [counts]
  );

  const pipelineSegments = useMemo(() => {
    if (totalDesigns <= 0) return [];
    return STATUSES.map(({ key, bar }) => ({
      key,
      bar,
      pct: ((Number(counts[key]) || 0) / totalDesigns) * 100,
      count: Number(counts[key]) || 0,
    })).filter((s) => s.count > 0);
  }, [counts, totalDesigns]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Designer dashboard</h1>
        <p className="text-xs text-gray-500">Overview of your inventory and quick links.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/designer/inventory"
          className="group rounded-xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/50 p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <Package className="mb-2 h-8 w-8 text-indigo-600" />
          <h2 className="font-semibold text-indigo-950">Inventory</h2>
          <p className="text-xs text-gray-600">Create and manage styles</p>
        </Link>
        <Link
          to="/designer/profile"
          className="group rounded-xl border border-violet-100 bg-linear-to-br from-white to-violet-50/50 p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
        >
          <User className="mb-2 h-8 w-8 text-violet-600" />
          <h2 className="font-semibold text-violet-950">Profile</h2>
          <p className="text-xs text-gray-600">Update your details</p>
        </Link>
        <div className="rounded-xl border border-amber-100 bg-linear-to-br from-amber-50/80 to-white p-4 shadow-sm">
          <Sparkles className="mb-2 h-8 w-8 text-amber-600" />
          <h2 className="font-semibold text-amber-950">Tips</h2>
          <p className="text-xs text-gray-600">Submit drafts when you are ready for review</p>
        </div>
      </div>

      {/* Analytics */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Inventory analytics</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-indigo-800">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading stats…
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
              <div className="col-span-2 rounded-lg border border-indigo-200 bg-linear-to-br from-indigo-600 to-violet-700 p-3 text-white shadow-md lg:col-span-1">
                <div className="flex items-center gap-2 text-indigo-100">
                  <Layers className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">Total designs</span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{totalDesigns}</p>
              </div>
              {STATUSES.map(({ key, label, icon: Icon, card }) => (
                <div
                  key={key}
                  className={`rounded-lg border bg-linear-to-br p-3 shadow-sm ${card}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">{counts[key] ?? 0}</p>
                </div>
              ))}
            </div>

            {totalDesigns > 0 ? (
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium text-gray-600">Status mix</p>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                  {pipelineSegments.map(({ key, bar, pct }) => (
                    <div
                      key={key}
                      title={`${key}: ${pct.toFixed(0)}%`}
                      className={`${bar} h-full min-w-0 transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600">
                  {pipelineSegments.map(({ key, count }) => (
                    <span key={key} className="inline-flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${STATUSES.find((s) => s.key === key)?.bar || "bg-gray-400"}`} />
                      {key} ({count})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Factory className="h-4 w-4" />
                  <span className="text-xs font-semibold">Production qty (recent batch)</span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-950">{productionSample.sum}</p>
                <p className="text-[10px] text-emerald-800/80">
                  Summed from up to 300 latest items
                  {productionSample.capped ? " — totals may be higher if you have more designs." : "."}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <p className="text-xs font-semibold text-gray-700">In pipeline</p>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold text-blue-800">{counts.submitted ?? 0}</span> awaiting review ·{" "}
                  <span className="font-semibold text-amber-800">{counts.draft ?? 0}</span> in progress
                </p>
              </div>
            </div>

            {recent.length > 0 ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Recent designs</p>
                  <Link to="/designer/inventory" className="text-xs font-medium text-indigo-600 hover:underline">
                    View all
                  </Link>
                </div>
                <ul className="space-y-1.5">
                  {recent.map((row) => (
                    <li key={row._id}>
                      <Link
                        to={`/designer/inventory/edit/${row._id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-2 text-xs transition hover:border-indigo-200 hover:bg-indigo-50/40"
                      >
                        <span className="font-medium text-gray-900">{row.StyleNumber}</span>
                        <span className="text-gray-500">
                          {row.productType} / {row.fitType}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
};

export default DesignerDashboard;
