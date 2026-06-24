export function ModuleAccessCheckboxGroups({
  panelGroups,
  availableModules,
  selectedModules,
  onToggle,
}) {
  const availableSet = new Set(availableModules || []);
  const groups = panelGroups && Object.keys(panelGroups).length > 0
    ? panelGroups
    : null;

  if (!groups) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(availableModules || []).map((moduleKey) => (
          <ModuleCheckbox
            key={moduleKey}
            moduleKey={moduleKey}
            label={moduleKey}
            checked={selectedModules.includes(moduleKey)}
            onToggle={onToggle}
          />
        ))}
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
              {visiblePanels.map((panel) => (
                <ModuleCheckbox
                  key={panel.key}
                  moduleKey={panel.key}
                  label={panel.name || panel.key}
                  checked={selectedModules.includes(panel.key)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModuleCheckbox({ moduleKey, label, checked, onToggle }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-canvas-muted/30 px-2.5 py-2 transition hover:bg-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(moduleKey)}
        className="h-3.5 w-3.5 rounded border-border accent-brand-600"
      />
      <span className="text-[11px] font-medium text-stone-800">{label}</span>
    </label>
  );
}
