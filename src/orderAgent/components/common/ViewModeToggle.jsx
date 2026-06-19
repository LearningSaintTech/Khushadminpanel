import { VIEW_ITEM, VIEW_ORDER, useViewMode } from "../../context/ViewModeContext";

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  const btnClass = (active) =>
    `rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
      active ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
    }`;

  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-border bg-canvas-muted p-0.5"
      role="group"
      aria-label="List view mode"
    >
      <button
        type="button"
        onClick={() => setViewMode(VIEW_ORDER)}
        className={btnClass(viewMode === VIEW_ORDER)}
        aria-pressed={viewMode === VIEW_ORDER}
      >
        By order
      </button>
      <button
        type="button"
        onClick={() => setViewMode(VIEW_ITEM)}
        className={btnClass(viewMode === VIEW_ITEM)}
        aria-pressed={viewMode === VIEW_ITEM}
      >
        By item
      </button>
    </div>
  );
}
