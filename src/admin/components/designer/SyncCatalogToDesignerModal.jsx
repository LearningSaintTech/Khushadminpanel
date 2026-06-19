import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCatalogUnlinkedForDesigner,
  getDesigners,
  importCatalogToDesigner,
} from "../../apis/Designerapi";
import { extractBackendMessages } from "../../utils/extractBackendMessages";
import { btnOutline, btnPrimary, inputClass } from "./designerShared";

const LIMIT_OPTIONS = [10, 20, 50];

export default function SyncCatalogToDesignerModal({
  open,
  onClose,
  presetDesignerId = "",
  onImported,
}) {
  const [designers, setDesigners] = useState([]);
  const [designerId, setDesignerId] = useState(presetDesignerId || "");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search, open]);

  useEffect(() => {
    if (!open) return;
    setDesignerId(presetDesignerId || "");
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setSelectedIds([]);
    setError("");
  }, [open, presetDesignerId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await getDesigners(1, 200, "");
        if (res?.success) {
          setDesigners(res.data?.designers || []);
        }
      } catch {
        setDesigners([]);
      }
    })();
  }, [open]);

  const fetchRows = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const res = await getCatalogUnlinkedForDesigner({
        page,
        limit,
        search: debouncedSearch,
      });
      if (res?.success) {
        const data = res.data || {};
        setRows(data.items || []);
        setPagination(data.pagination || { totalPages: 1, total: 0 });
      } else {
        setRows([]);
      }
    } catch (err) {
      setRows([]);
      setError(err?.message || "Failed to load catalog items.");
    } finally {
      setLoading(false);
    }
  }, [open, page, limit, debouncedSearch]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const toggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const importable = rows.filter((r) => r.importReady).map((r) => r.catalogItemId);
    const allSelected = importable.length > 0 && importable.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !importable.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...importable])]);
  };

  const runImport = async (catalogItemIds) => {
    if (!designerId) {
      toast.error("Select a designer to assign these items to.");
      return;
    }
    const ids = [...new Set((catalogItemIds || []).filter(Boolean))];
    if (!ids.length) return;

    setImporting(true);
    setError("");
    try {
      const res = await importCatalogToDesigner({ designerId, catalogItemIds: ids });
      const data = res?.data || {};
      const imported = data.imported ?? 0;
      const failed = data.failed ?? 0;
      if (imported > 0) {
        toast.success(`Imported ${imported} item(s) to designer inventory.`);
      }
      if (failed > 0) {
        const firstErr = (data.results || []).find((r) => !r.success)?.error;
        toast.error(
          failed === ids.length
            ? firstErr || "Import failed."
            : `${failed} item(s) failed. ${firstErr || ""}`.trim()
        );
      }
      setSelectedIds([]);
      await fetchRows();
      onImported?.(data);
    } catch (err) {
      const msgs = extractBackendMessages(err);
      const msg = msgs.length ? msgs.join("; ") : err?.message || "Import failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const total = pagination.total ?? 0;
  const totalPages = pagination.totalPages || 1;
  const importableOnPage = rows.filter((r) => r.importReady);
  const allImportableSelected =
    importableOnPage.length > 0 &&
    importableOnPage.every((r) => selectedIds.includes(r.catalogItemId));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-catalog-designer-title"
        className="relative flex max-h-[min(92vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 id="sync-catalog-designer-title" className="text-base font-bold text-stone-900">
              Sync catalog → designer
            </h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Main inventory items not yet linked on the designer panel. Import creates an approved,
              listed designer row linked to the catalog item.
            </p>
          </div>
          <button type="button" onClick={onClose} className={btnOutline} title="Close">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-canvas-muted/40 px-4 py-2.5 sm:px-5">
          <label className="flex min-w-[180px] flex-1 flex-col gap-0.5 text-[10px] font-medium text-stone-600">
            Assign to designer
            <select
              className={inputClass}
              value={designerId}
              onChange={(e) => setDesignerId(e.target.value)}
            >
              <option value="">Select designer…</option>
              {designers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                  {d.employeeId ? ` (${d.employeeId})` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="relative min-w-[160px] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <input
              type="search"
              className={`${inputClass} w-full pl-8`}
              placeholder="Search name, productId, SKU…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className={`${inputClass} w-[100px]`}
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(parseInt(e.target.value, 10) || 20);
            }}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="shrink-0 whitespace-pre-wrap border-b border-red-200 bg-red-50 px-4 py-2 text-[11px] text-red-800 sm:px-5">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[640px] w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-stone-100 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allImportableSelected}
                    onChange={toggleSelectAll}
                    title="Select importable on this page"
                  />
                </th>
                <th className="px-2 py-2">Product</th>
                <th className="px-2 py-2">Product ID</th>
                <th className="px-2 py-2">SKUs</th>
                <th className="px-2 py-2">Ready</th>
                <th className="px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading…
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                    No unlinked catalog items found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = row.catalogItemId;
                  const checked = selectedIds.includes(id);
                  return (
                    <tr key={id} className="hover:bg-canvas-muted/40">
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!row.importReady}
                          onChange={() => toggleSelect(id)}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="flex items-center gap-2">
                          {row.thumbnail ? (
                            <img
                              src={row.thumbnail}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-stone-100" />
                          )}
                          <span className="font-medium text-stone-900 line-clamp-2">
                            {row.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top font-mono text-[10px] text-stone-700">
                        {row.productId || "—"}
                      </td>
                      <td className="px-2 py-2 align-top tabular-nums text-stone-600">
                        {row.skuCount ?? "—"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {row.importReady ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            Yes
                          </span>
                        ) : (
                          <span
                            className="inline-flex max-w-[10rem] rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                            title={(row.importIssues || []).join(" · ")}
                          >
                            Needs data
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top text-right">
                        <button
                          type="button"
                          className={btnOutline}
                          disabled={!row.importReady || importing}
                          onClick={() => runImport([id])}
                        >
                          Import
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
          <p className="text-[11px] text-stone-500">
            {total === 0 ? "0 items" : `Page ${page} of ${totalPages} · ${total} unlinked`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnOutline}
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className={btnOutline}
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={importing || selectedIds.length === 0}
              onClick={() => runImport(selectedIds)}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Import selected ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
