import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { getAllCategories } from "../../apis/categoryapi";
import { getAllSubcategories } from "../../apis/subcategoryapis";
import { searchItems } from "../../apis/itemapi";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const unwrapList = (res, keys) => {
  const root = res?.data ?? res ?? {};
  const nested = root?.data && typeof root.data === "object" ? root.data : root;
  for (const key of keys) {
    if (Array.isArray(nested?.[key])) return nested[key];
  }
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(nested?.data)) return nested.data;
  return [];
};

const idOf = (row) => String(row?._id || row?.id || "");
const labelOf = (row) => row?.name || row?.title || row?.categoryName || row?.subcategoryName || idOf(row);

function CheckList({ title, rows, selected, onToggle, loading }) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rows.filter((r) => labelOf(r).toLowerCase().includes(q)) : rows;
  }, [rows, filter]);

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {title} <span className="font-normal normal-case text-stone-400">({selected.length} selected)</span>
      </p>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`Filter ${title.toLowerCase()}…`}
        className={`${fieldClass} mb-1.5`}
      />
      <div className="max-h-44 overflow-auto rounded-lg border border-border bg-white p-1.5">
        {loading ? (
          <p className="flex items-center gap-1.5 p-2 text-[11px] text-stone-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        ) : visible.length === 0 ? (
          <p className="p-2 text-[11px] text-stone-500">Nothing found</p>
        ) : (
          visible.map((row) => {
            const id = idOf(row);
            return (
              <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11px] hover:bg-canvas-muted">
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  onChange={() => onToggle(id)}
                  className="h-3.5 w-3.5 rounded border-border text-brand-600"
                />
                <span className="truncate text-stone-800">{labelOf(row)}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function ItemPicker({ selectedItems, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const keywords = query.trim();
    if (!keywords) return undefined;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchItems({ limit: 20, keywords });
        setResults(unwrapList(res, ["items"]));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selectedIds = selectedItems.map((i) => i._id);
  const add = (row) => {
    const id = idOf(row);
    if (!id || selectedIds.includes(id)) return;
    onChange([...selectedItems, { _id: id, name: labelOf(row) }]);
  };
  const remove = (id) => onChange(selectedItems.filter((i) => i._id !== id));

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        Products <span className="font-normal normal-case text-stone-400">({selectedItems.length} selected)</span>
      </p>
      {selectedItems.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <span key={item._id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">
              <span className="truncate">{item.name}</span>
              <button type="button" onClick={() => remove(item._id)} aria-label={`Remove ${item.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name…"
          className={`${fieldClass} pl-7`}
        />
      </div>
      {query.trim() ? (
        <div className="mt-1.5 max-h-44 overflow-auto rounded-lg border border-border bg-white p-1.5">
          {searching ? (
            <p className="flex items-center gap-1.5 p-2 text-[11px] text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="p-2 text-[11px] text-stone-500">No products found</p>
          ) : (
            results.map((row) => {
              const id = idOf(row);
              const picked = selectedIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={picked}
                  onClick={() => add(row)}
                  className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[11px] hover:bg-canvas-muted disabled:opacity-50"
                >
                  <span className="truncate text-stone-800">{labelOf(row)}</span>
                  <span className="shrink-0 text-[10px] text-brand-600">{picked ? "Added" : "Add"}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Picks the categories / subcategories / products a coupon is restricted to.
 * value: { categories: string[], subcategories: string[], items: {_id, name}[] }
 */
export default function CouponTargetsPicker({ applicableOn, value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const loading = applicableOn === "CATEGORY" && !loaded;

  useEffect(() => {
    if (applicableOn !== "CATEGORY" || loaded) return undefined;
    let cancelled = false;
    Promise.all([getAllCategories(1, 500), getAllSubcategories(1, 1000)])
      .then(([catRes, subRes]) => {
        if (cancelled) return;
        setCategories(unwrapList(catRes, ["categories"]));
        setSubcategories(unwrapList(subRes, ["subcategories", "subCategories"]));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [applicableOn, loaded]);

  const toggle = (key) => (id) => {
    const current = value[key] || [];
    onChange({
      ...value,
      [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  if (applicableOn === "CATEGORY") {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <CheckList title="Categories" rows={categories} selected={value.categories || []} onToggle={toggle("categories")} loading={loading} />
        <CheckList title="Subcategories" rows={subcategories} selected={value.subcategories || []} onToggle={toggle("subcategories")} loading={loading} />
        <p className="text-[10px] text-stone-500 sm:col-span-2">
          The discount applies only to cart items in a selected category or subcategory.
        </p>
      </div>
    );
  }

  if (applicableOn === "PRODUCT") {
    return (
      <div>
        <ItemPicker selectedItems={value.items || []} onChange={(items) => onChange({ ...value, items })} />
        <p className="mt-1 text-[10px] text-stone-500">The discount applies only to the selected products.</p>
      </div>
    );
  }

  return null;
}

