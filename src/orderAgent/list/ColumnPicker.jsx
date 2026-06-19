import { useEffect } from "react";
import { ChevronDown, Columns3 } from "lucide-react";

export default function ColumnPicker({
  columns,
  visibleKeys,
  onToggle,
  onReset,
  onSelectAll,
  open,
  onOpenChange,
}) {
  const activeCount = columns.filter((c) => visibleKeys.includes(c.key)).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!e.target.closest("[data-order-agent-column-picker]")) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  return (
    <div className="relative shrink-0" data-order-agent-column-picker>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
        aria-expanded={open}
      >
        <Columns3 size={14} />
        Columns
        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900">
          {activeCount}
        </span>
        <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 flex max-h-64 w-56 flex-col rounded-xl border border-border bg-white p-2 shadow-lg">
          <p className="mb-1 px-1 text-[10px] font-semibold text-stone-600">Visible columns</p>
          <div className="flex-1 overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11px] hover:bg-canvas-muted"
              >
                <input
                  type="checkbox"
                  checked={visibleKeys.includes(col.key)}
                  disabled={col.alwaysVisible}
                  onChange={() => onToggle(col.key)}
                />
                <span className={col.alwaysVisible ? "text-stone-400" : ""}>{col.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-1 border-t border-border pt-2">
            <button type="button" onClick={onReset} className="flex-1 rounded py-1 text-[10px] text-stone-600 hover:bg-canvas-muted">
              Reset
            </button>
            <button type="button" onClick={onSelectAll} className="flex-1 rounded py-1 text-[10px] text-stone-600 hover:bg-canvas-muted">
              All
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
