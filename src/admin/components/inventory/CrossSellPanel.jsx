import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Search, X } from "lucide-react";
import {
  getSingleItem,
  searchItems,
  updateCrossSellItems,
} from "../../apis/itemapi";

function unwrapItem(res) {
  const root = res?.data ?? res ?? {};
  return (
    root?.item ||
    root?.data?.item ||
    (root?._id || root?.productId ? root : null) ||
    root?.data ||
    null
  );
}

function unwrapList(res) {
  const root = res?.data ?? res ?? {};
  const nested = root?.data && typeof root.data === "object" ? root.data : root;
  const list =
    nested?.items ||
    nested?.crossSellItems ||
    nested?.data ||
    (Array.isArray(nested) ? nested : null) ||
    (Array.isArray(root) ? root : null) ||
    [];
  return Array.isArray(list) ? list : [];
}

function idsFromPayload(res, fallbackIds = []) {
  const root = res?.data ?? res ?? {};
  const item = unwrapItem(res);
  const fromItem = item?.crossSellItemIds;
  const fromRoot =
    root?.crossSellItemIds ||
    root?.data?.crossSellItemIds ||
    root?.itemIds;
  const raw = Array.isArray(fromItem)
    ? fromItem
    : Array.isArray(fromRoot)
      ? fromRoot
      : fallbackIds;
  return [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
}

function thumbOf(item) {
  return (
    item?.thumbnail ||
    item?.images?.[0]?.url ||
    item?.images?.[0] ||
    item?.variants?.[0]?.images?.[0]?.url ||
    ""
  );
}

function ItemCard({ item, selected, onToggle, disabled }) {
  const id = String(item?._id || item?.id || "");
  return (
    <button
      type="button"
      disabled={disabled || !id}
      onClick={() => onToggle(item)}
      className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition ${
        selected
          ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-200"
          : "border-border bg-white hover:bg-canvas-muted/40"
      } disabled:opacity-50`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-canvas-muted">
        {thumbOf(item) ? (
          <img src={thumbOf(item)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-stone-400">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-stone-900">
          {item?.name || "Untitled"}
        </p>
        <p className="truncate font-mono text-[10px] text-stone-500">
          {item?.productId || id}
        </p>
      </div>
      {selected ? (
        <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          Selected
        </span>
      ) : (
        <Plus className="h-4 w-4 shrink-0 text-stone-400" />
      )}
    </button>
  );
}

/**
 * Pair this product with other catalog items (e.g. top + jeans).
 * Load from item.crossSellItemIds (GET /items/single).
 * Save via PATCH/PUT /items/cross-sell/:itemId with { crossSellItemIds }.
 */
export default function CrossSellPanel({ itemId, initialIds = [], onSaved }) {
  const selfId = String(itemId || "").trim();
  const [selectedIds, setSelectedIds] = useState(() =>
    (initialIds || []).map(String).filter(Boolean),
  );
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const hydrateSelected = useCallback(async (ids) => {
    const unique = [...new Set((ids || []).map(String).filter(Boolean))];
    if (!unique.length) {
      setSelectedItems([]);
      return;
    }
    const rows = await Promise.all(
      unique.map(async (id) => {
        try {
          const res = await getSingleItem(id);
          return unwrapItem(res) || { _id: id, name: "Unknown item", productId: id };
        } catch {
          return { _id: id, name: "Unknown item", productId: id };
        }
      }),
    );
    setSelectedItems(rows.filter(Boolean));
  }, []);

  const initialKey = useMemo(
    () =>
      (initialIds || [])
        .map(String)
        .filter(Boolean)
        .sort()
        .join(","),
    [initialIds],
  );

  const load = useCallback(async () => {
    if (!selfId) return;
    setLoading(true);
    try {
      let ids = initialKey ? initialKey.split(",") : [];
      // Prefer fresh ids from single item (no GET /cross-sell route exists).
      try {
        const res = await getSingleItem(selfId);
        const fromSingle = idsFromPayload(res, ids);
        if (fromSingle.length || !ids.length) ids = fromSingle;
      } catch (err) {
        console.warn("[CrossSell] single-item refresh failed, using initialIds", err);
      }
      setSelectedIds(ids);
      await hydrateSelected(ids);
      console.log("[CrossSell] loaded ids from single item", ids);
    } finally {
      setLoading(false);
    }
  }, [selfId, initialKey, hydrateSelected]);

  useEffect(() => {
    load();
  }, [load]);

  const runSearch = useCallback(async () => {
    const keywords = appliedQ.trim();
    setSearching(true);
    try {
      const res = await searchItems({
        limit: 24,
        ...(keywords ? { keywords } : {}),
      });
      const list = unwrapList(res).filter(
        (row) => String(row?._id || row?.id || "") !== selfId,
      );
      console.log("[CrossSell] search results", { keywords, count: list.length, list });
      setResults(list);
    } catch (err) {
      toast.error(err?.message || "Failed to search items");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [appliedQ, selfId]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const toggle = (row) => {
    const id = String(row?._id || row?.id || "");
    if (!id || id === selfId) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setSelectedItems((prev) => {
      const exists = prev.some((p) => String(p?._id || p?.id) === id);
      if (exists) return prev.filter((p) => String(p?._id || p?.id) !== id);
      return [...prev, row];
    });
  };

  const removeId = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => prev.filter((x) => x !== sid));
    setSelectedItems((prev) => prev.filter((p) => String(p?._id || p?.id) !== sid));
  };

  const handleSave = async () => {
    if (!selfId) return;
    setSaving(true);
    try {
      const payload = selectedIds.filter((id) => id && id !== selfId);
      console.log("[CrossSell] save payload", { itemId: selfId, crossSellItemIds: payload });
      const res = await updateCrossSellItems(selfId, payload);
      const nextIds = idsFromPayload(res, payload);
      setSelectedIds(nextIds);
      await hydrateSelected(nextIds);
      toast.success("Cross-sell items updated");
      onSaved?.(nextIds, res);
    } catch (err) {
      console.error("[CrossSell] save failed", err);
      toast.error(err?.message || "Failed to update cross-sell");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-stone-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-600" />
        Loading cross-sell…
      </div>
    );
  }

  return (
    <div className="space-y-4 text-stone-800">
      <div className="rounded-xl border border-border bg-canvas-muted/40 p-3">
        <p className="text-[11px] text-stone-600">
          Pair this product with others (e.g. top + jeans). Saves{" "}
          <code className="rounded bg-white px-1">crossSellItemIds</code> via{" "}
          <code className="rounded bg-white px-1">PATCH /items/cross-sell/:itemId</code>.
        </p>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900">
            Selected ({selectedIds.length})
          </h3>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save cross-sell
          </button>
        </div>

        {selectedIds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-white px-3 py-6 text-center text-[11px] text-stone-500">
            No pairings yet — search and select items below.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {selectedItems.map((row) => {
              const id = String(row?._id || row?.id || "");
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-2"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                    {thumbOf(row) ? (
                      <img src={thumbOf(row)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{row?.name || "—"}</p>
                    <p className="truncate font-mono text-[10px] text-stone-500">
                      {row?.productId || id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeId(id)}
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-white hover:text-danger"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-stone-900">Find items to pair</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setAppliedQ(q.trim());
                }
              }}
              placeholder="Search name / product ID…"
              className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-2.5 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedQ(q.trim())}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            Search
          </button>
        </div>

        {searching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-stone-500">No items found</p>
        ) : (
          <div className="grid max-h-[28rem] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {results.map((row) => {
              const id = String(row?._id || row?.id || "");
              return (
                <ItemCard
                  key={id}
                  item={row}
                  selected={selectedSet.has(id)}
                  onToggle={toggle}
                  disabled={saving}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
