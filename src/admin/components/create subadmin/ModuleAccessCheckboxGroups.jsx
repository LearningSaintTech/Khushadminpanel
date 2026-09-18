import { ACCESS_LEVEL_FULL, ACCESS_LEVEL_VIEW, normalizeAccessLevel } from "../../../utils/moduleAccessLevels";

export function ModuleAccessCheckboxGroups({
  panelGroups,
  availableModules,
  selectedModules,
  moduleLevels = {},
  onToggle,
  onLevelChange,
}) {
  const availableSet = new Set(availableModules || []);
  const groups = panelGroups && Object.keys(panelGroups).length > 0
    ? panelGroups
    : null;

  const renderItem = (moduleKey, label) => (
    <ModuleAccessRow
      key={moduleKey}
      moduleKey={moduleKey}
      label={label}
      checked={selectedModules.includes(moduleKey)}
      accessLevel={normalizeAccessLevel(moduleLevels[moduleKey])}
      onToggle={onToggle}
      onLevelChange={onLevelChange}
    />
  );

  if (!groups) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(availableModules || []).map((moduleKey) => renderItem(moduleKey, moduleKey))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, panels]) => {
        const visiblePanels = (panels || []).filter((p) => availableSet.has(p.key));
        if (visiblePanels.length === 0) return null;

        return (
          <div key={groupName}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              {groupName}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePanels.map((panel) => renderItem(panel.key, panel.name || panel.key))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModuleAccessRow({ moduleKey, label, checked, accessLevel, onToggle, onLevelChange }) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 transition ${
        checked ? "border-brand-200 bg-white" : "border-border bg-canvas-muted/30 hover:bg-white"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(moduleKey)}
          className="h-3.5 w-3.5 rounded border-border accent-brand-600"
        />
        <span className="text-[11px] font-medium text-stone-800">{label}</span>
      </label>
      {checked ? (
        <div className="mt-1.5 flex gap-1 pl-5" role="group" aria-label={`${label} access level`}>
          <LevelChip
            active={accessLevel === ACCESS_LEVEL_VIEW}
            onClick={() => onLevelChange(moduleKey, ACCESS_LEVEL_VIEW)}
          >
            View only
          </LevelChip>
          <LevelChip
            active={accessLevel === ACCESS_LEVEL_FULL}
            onClick={() => onLevelChange(moduleKey, ACCESS_LEVEL_FULL)}
          >
            Full
          </LevelChip>
        </div>
      ) : null}
    </div>
  );
}

function LevelChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
        active
          ? "bg-brand-600 text-white"
          : "bg-canvas-muted text-stone-500 hover:bg-stone-200"
      }`}
    >
      {children}
    </button>
  );
}
